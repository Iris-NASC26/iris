"""Durable-job executors — the only place jobs mutate world state.

Each executor reads its checkpoint, performs bounded work, and writes the
result artifact. Ingestion appends sanitized records to per-source staging
files; dataset builds are content-addressed; training goes through the
eligibility gates; trends persist declared hypothesis reports.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

from ..store import PATH as STORE_PATH
from . import datasets, earthdata, jobs, locations, power, qa, sources, training, trends, updates
from .variables import variable as variable_spec

STAGING = Path(STORE_PATH).parent / "v2" / "history"
REPORTS = Path(STORE_PATH).parent / "v2" / "trend_reports"
DEFAULT_BUDGET = {"remaining": 60}
_stop = threading.Event()
_thread = None


def staging_path(location_id: str, source_id: str) -> Path:
    # Identifiers are opaque registry ids — never a user name or path input.
    if not locations.ID_PATTERN.match(location_id or ""):
        raise ValueError("Invalid location identifier.")
    p = STAGING / location_id
    p.mkdir(parents=True, exist_ok=True)
    return p / f"{source_id}.jsonl"


def staged_records(location_id: str, source_id: str | None = None) -> list[dict]:
    files = ([staging_path(location_id, source_id)] if source_id
             else sorted((STAGING / location_id).glob("*.jsonl")))
    out: list[dict] = []
    for f in files:
        if f.exists():
            out.extend(json.loads(l) for l in f.read_text().splitlines() if l.strip())
    return out


def _save_quarantine(path: Path, records: list[dict]):
    report = path.with_suffix(".qa.json")
    previous = json.loads(report.read_text()) if report.exists() else []
    merged = {(r.get("variable"), r.get("interval_start")): r for r in previous + records}
    tmp = report.with_suffix(".tmp")
    tmp.write_text(json.dumps(list(merged.values())))
    tmp.replace(report)


def _save_coverage(path: Path, coverage: list[dict] | None):
    """Bounded per-interval support accounting for area extractions."""
    if not coverage:
        return
    report = path.with_suffix(".coverage.json")
    previous = json.loads(report.read_text()) if report.exists() else []
    merged = {c["interval_start"]: c for c in previous + coverage}
    tmp = report.with_suffix(".tmp")
    tmp.write_text(json.dumps(list(merged.values()), indent=1))
    tmp.replace(report)


def _staged_dicts(valid, lag_hours: float) -> list[dict]:
    out = []
    for r in valid:
        d = {k: getattr(r, k) for k in r.__dataclass_fields__}
        if not d.get("available_at"):
            d["available_at"] = (
                datetime.fromisoformat(r.interval_end.replace("Z", "+00:00"))
                + timedelta(hours=lag_hours)).isoformat()
        out.append(d)
    return out


def _write_staging(path: Path, merged_records: list[dict]):
    lines = [json.dumps(v, sort_keys=True)
             for v in sorted(merged_records, key=lambda r: (str(r.get("variable")), str(r.get("interval_start"))))]
    tmp = path.with_suffix(".tmp")
    tmp.write_text("\n".join(lines) + ("\n" if lines else ""))
    tmp.replace(path)


def _power_ingest(job_id: str, loc: str, spec: dict, *, transport) -> dict:
    """NASA POWER history — point cell or genuine cell-weighted area mean."""
    var_name = spec["variable"]
    variable_spec(var_name)
    region = locations.resolve(loc)
    end = (datetime.fromisoformat(spec["end"]) if spec.get("end") else
           datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0))
    start = (datetime.fromisoformat(spec["start"]) if spec.get("start")
             else end - timedelta(days=int(spec.get("backfill_days", 366))))
    budget = {**DEFAULT_BUDGET, **(spec.get("budget") or {})}
    if region.get("spatial_mode") == "area_mean":
        out = power.fetch_area(var_name, tuple(region["bbox"]), start, end,
                               transport=transport, budget=budget,
                               checkpoint=spec.get("ingest_checkpoint", {}))
    else:
        out = power.fetch_point(var_name, float(region["latitude"]), float(region["longitude"]),
                                start, end, transport=transport, budget=budget,
                                checkpoint=spec.get("ingest_checkpoint", {}))
    for r in out["records_raw"]:
        r["location_id"] = loc
    valid, quarantined = qa.normalize(out["records_raw"], loc, power.SOURCE_ID)
    staged = _staged_dicts(valid, power.DELAY_HOURS)
    path = staging_path(loc, power.SOURCE_ID)
    existing = staged_records(loc, power.SOURCE_ID)
    merged = {(x["variable"], x["interval_start"]): x for x in existing}
    for d in staged:
        merged[(d["variable"], d["interval_start"])] = d
    _write_staging(path, list(merged.values()))
    _save_quarantine(path, quarantined)
    _save_coverage(path, out.get("coverage"))
    if out.get("exhausted"):
        return {"pending": True, "checkpoint": {"ingest_checkpoint": out["next_checkpoint"]},
                "message": f"Historical backfill continues; {len(merged)} records retained so far."}
    return {"new_records": len(valid), "quarantined": len(quarantined),
            "checkpoint": out["next_checkpoint"], "exhausted": out["exhausted"],
            "source": out["source"]}


def _update(job_id: str, loc: str, spec: dict, *, transport, parser) -> dict:
    """Incremental update — overlap refetch, immutable revision-aware merge.

    New or revised observations produce a new content-addressed dataset
    revision; a no-change check leaves staged data, the watermark, and all
    pinned dataset selections untouched. Failures preserve prior data and
    are logged as retrieval states — never as freshness.
    """
    var_name = spec["variable"]
    variable_spec(var_name)
    source_id = spec["source_id"]
    region = locations.resolve(loc)
    checked_at = datetime.now(UTC).isoformat()
    path = staging_path(loc, source_id)
    existing = staged_records(loc, source_id)
    before = updates.watermark(existing, var_name)
    start, end = updates.update_window(
        existing, var_name,
        overlap_days=int(spec.get("overlap_days", updates.DEFAULT_OVERLAP_DAYS)),
        backfill_days=int(spec.get("backfill_days", 366)))
    budget = {**DEFAULT_BUDGET, **(spec.get("budget") or {})}
    try:
        if source_id == power.SOURCE_ID:
            if region.get("spatial_mode") == "area_mean":
                out = power.fetch_area(var_name, tuple(region["bbox"]), start, end,
                                       transport=transport, budget=budget)
            else:
                out = power.fetch_point(var_name, float(region["latitude"]),
                                        float(region["longitude"]), start, end,
                                        transport=transport, budget=budget)
            lag_hours = power.DELAY_HOURS
        elif source_id in sources.SOURCE_OPTIONS:
            out = sources.fetch_history(
                loc, float(region["latitude"]), float(region["longitude"]), source_id,
                start, end, transport=transport, budget=budget, checkpoint=None)
            lag_hours = sources.SOURCE_OPTIONS.get(source_id, (None, 24 * 6, ""))[1]
        else:
            from .variables import PRODUCTS
            out = earthdata.fetch_series(
                var_name, float(region["latitude"]), float(region["longitude"]),
                start, end, transport=transport, parser=parser, budget=budget,
                checkpoint=None)
            lag_hours = 24 * PRODUCTS.get(source_id, {}).get("delay_days", 30)
    except Exception as e:
        updates.append_log(loc, source_id, {
            "checked_at": checked_at, "location_id": loc, "source_id": source_id,
            "variable": var_name, "status": getattr(e, "reason", "retrieval_failure"),
            "changed": False, "watermark": before,
            "message": str(e)[:300]})
        raise
    if out.get("exhausted") or out.get("pending"):
        return {"pending": True,
                "checkpoint": {"update_checkpoint": out.get("next_checkpoint", {})},
                "message": "Update continues on the next worker pass."}
    fetched_raw = out["records_raw"]
    for r in fetched_raw:
        r["location_id"] = loc
    valid, quarantined = qa.normalize(fetched_raw, loc, source_id)
    fetched = _staged_dicts(valid, lag_hours)
    diff = updates.merge(existing, fetched, variable=var_name)
    entry = {"checked_at": checked_at, "location_id": loc, "source_id": source_id,
             "variable": var_name, "status": "ok",
             "watermark_before": before,
             "watermark_after": updates.watermark(diff["records"], var_name),
             "appended": len(diff["appended"]), "revised": len(diff["revised"]),
             "unchanged": diff["unchanged"], "missing": len(diff["missing"]),
             "quarantined": len(quarantined), "changed": diff["changed"],
             "window": {"start": start.isoformat(), "end": end.isoformat()}}
    if not diff["changed"]:
        entry["status"] = "no_new_data"
        updates.append_log(loc, source_id, entry)
        return {"state": "no_new_data", "appended": 0, "revised": 0,
                "unchanged": diff["unchanged"], "watermark": before,
                "checked_at": checked_at}
    _write_staging(path, diff["records"])
    _save_quarantine(path, quarantined)
    _save_coverage(path, out.get("coverage"))
    manifest = _dataset(loc, {"source_id": source_id, "variable": var_name})
    entry["status"] = "new_revision"
    entry["dataset_id"] = manifest["dataset_id"]
    updates.append_log(loc, source_id, entry)
    return {"state": "new_revision", "dataset_id": manifest["dataset_id"],
            "appended": len(diff["appended"]), "revised": len(diff["revised"]),
            "unchanged": diff["unchanged"], "missing": diff["missing"],
            "watermark_before": before, "watermark_after": entry["watermark_after"],
            "checked_at": checked_at}


def execute(job_id: str, *, transport=None, region_lookup=None, parser=None) -> dict:
    """Run one queued/resumed job to completion or a checkpoint pause."""
    job = jobs.get(job_id)
    if not jobs.begin(job_id):
        return jobs.get(job_id)
    kind, loc = job["kind"], job["location_id"]
    spec = job.get("checkpoint") or {}
    try:
        if kind == "ingest":
            result = _ingest(job_id, loc, spec, transport=transport, region_lookup=region_lookup)
        elif kind == "earthdata_ingest":
            result = _earthdata_ingest(job_id, loc, spec, transport=transport,
                                       parser=parser, region_lookup=region_lookup)
        elif kind == "power_ingest":
            result = _power_ingest(job_id, loc, spec, transport=transport)
        elif kind == "update":
            result = _update(job_id, loc, spec, transport=transport, parser=parser)
        elif kind == "dataset":
            result = _dataset(loc, spec)
        elif kind == "train":
            result = _train(loc, spec)
        elif kind == "trend":
            result = _trend(loc, spec)
        elif kind == "pipeline":
            result = _pipeline(job_id, loc, spec)
        else:
            raise ValueError(f"unknown job kind {kind}")
        if result.get("pending"):
            jobs.defer(job_id, {**result.get("checkpoint", {}),
                               "message": result.get("message", "Waiting for historical records"),
                               "next_poll_at": (datetime.now(UTC) + timedelta(seconds=20)).isoformat()},
                       result.get("progress", .15))
            return jobs.get(job_id)
        jobs.advance(job_id, 1.0, {"result": result})
        jobs.finish(job_id, True)
        return jobs.get(job_id)
    except Exception as e:
        jobs.finish(job_id, False, str(e)[:500])
        return jobs.get(job_id)


def _ingest(job_id: str, loc: str, spec: dict, *, transport, region_lookup) -> dict:
    region = (region_lookup or locations.resolve)(loc)
    source_id = spec.get("source_id", "era5")
    lag_hours = sources.SOURCE_OPTIONS.get(source_id, (None, 24 * 6, ""))[1]
    end = (datetime.fromisoformat(spec["end"]) if spec.get("end") else
           datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0))
    start = (datetime.fromisoformat(spec["start"]) if spec.get("start")
             else end - timedelta(days=int(spec.get("backfill_days", 365))))
    ckpt = spec.get("ingest_checkpoint", {})
    out = sources.fetch_history(
        loc, float(region["latitude"]), float(region["longitude"]), source_id,
        start, end, transport=transport,
        budget={**DEFAULT_BUDGET, **(spec.get("budget") or {})},
        checkpoint=ckpt)
    valid, quarantined = qa.normalize(out["records_raw"], loc, source_id)
    # Availability metadata is declared per source, not implied by retrieval.
    staged = []
    for r in valid:
        d = {k: getattr(r, k) for k in r.__dataclass_fields__}
        d["available_at"] = (
            datetime.fromisoformat(r.interval_end.replace("Z", "+00:00"))
            + timedelta(hours=lag_hours)).isoformat()
        staged.append(d)
    path = staging_path(loc, source_id)
    existing = staged_records(loc, source_id)
    merged = {(x["variable"], x["interval_start"]): x for x in existing}
    for d in staged:
        merged[(d["variable"], d["interval_start"])] = d
    lines = [json.dumps(v, sort_keys=True) for _, v in sorted(merged.items(), key=lambda kv: kv[0][1])]
    tmp = path.with_suffix(".tmp")
    tmp.write_text("\n".join(lines) + ("\n" if lines else ""))
    tmp.replace(path)
    _save_quarantine(path, quarantined)
    if out.get("exhausted"):
        return {"pending": True, "checkpoint": {"ingest_checkpoint": out["next_checkpoint"]},
                "message": f"Historical backfill continues; {len(merged)} records retained so far."}
    return {"new_records": len(valid), "quarantined": len(quarantined),
            "checkpoint": out["next_checkpoint"], "exhausted": out["exhausted"],
            "source": out["source"]}


def _earthdata_ingest(job_id: str, loc: str, spec: dict, *, transport, parser,
                      region_lookup) -> dict:
    var_name = spec["variable"]
    variable_spec(var_name)  # unknown targets rejected
    region = (region_lookup or locations.resolve)(loc)
    end = (datetime.fromisoformat(spec["end"]) if spec.get("end") else
           datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0))
    start = (datetime.fromisoformat(spec["start"]) if spec.get("start")
             else end - timedelta(days=int(spec.get("backfill_days", 366))))
    out = earthdata.fetch_series(
        var_name, float(region["latitude"]), float(region["longitude"]),
        start, end, transport=transport, parser=parser,
        budget={**DEFAULT_BUDGET, **(spec.get("budget") or {})},
        checkpoint=spec.get("ingest_checkpoint", {}))
    if out.get("pending"):
        return {"pending": True, "checkpoint": {"ingest_checkpoint": out["next_checkpoint"]},
                "message": out.get("message", "Earthdata extraction is pending")}
    for r in out["records_raw"]:
        r["location_id"] = loc
    source_id = out["source"]["id"]
    valid, quarantined = qa.normalize(out["records_raw"], loc, source_id)
    staged = [{k: getattr(r, k) for k in r.__dataclass_fields__} for r in valid]
    path = staging_path(loc, source_id)
    existing = staged_records(loc, source_id)
    merged = {(x["variable"], x["interval_start"]): x for x in existing}
    for d in staged:
        merged[(d["variable"], d["interval_start"])] = d
    lines = [json.dumps(v, sort_keys=True) for _, v in sorted(merged.items(), key=lambda kv: kv[0][1])]
    tmp = path.with_suffix(".tmp")
    tmp.write_text("\n".join(lines) + ("\n" if lines else ""))
    tmp.replace(path)
    _save_quarantine(path, quarantined)
    if out.get("exhausted"):
        return {"pending": True, "checkpoint": {"ingest_checkpoint": out["next_checkpoint"]},
                "message": f"Historical backfill continues; {len(merged)} records retained so far."}
    return {"new_records": len(valid), "quarantined": len(quarantined),
            "checkpoint": out["next_checkpoint"], "exhausted": out["exhausted"],
            "source": out["source"], "granules": out["granules_discovered"]}


def _dataset(loc: str, spec: dict) -> dict:
    source_id = spec.get("source_id", "era5")
    staged = staged_records(loc, source_id)
    if spec.get("variable"):
        staged = [r for r in staged if r["variable"] == spec["variable"]]
    if not staged:
        raise ValueError("no staged history for this source — run ingest first")
    valid, quarantined = qa.normalize(staged, loc, source_id)
    report = staging_path(loc, source_id).with_suffix(".qa.json")
    if report.exists():
        quarantined.extend(r for r in json.loads(report.read_text())
                           if not spec.get("variable") or r.get("variable") == spec["variable"])
    try:
        location = locations.resolve(loc)
    except KeyError:
        location = None
    if (location or {}).get("spatial_mode") == "area_mean":
        # The dataset carries its real aggregation contract — never implied.
        spec = {**spec, "aggregation": {
            "policy": power.AGGREGATION_POLICY,
            "weights": "cos(latitude) of each contributing cell centre",
            "boundary": "cell-centre inclusion; no boundary clipping",
            "min_valid_area_fraction": power.MIN_AREA_FRACTION,
            "note": "area mean of native grid cells — not a centroid value"}}
    coverage_file = staging_path(loc, source_id).with_suffix(".coverage.json")
    coverage = (json.loads(coverage_file.read_text())
                if coverage_file.exists() else None)
    return datasets.build(loc, source_id, valid, quarantined, spec=spec,
                          location=location, coverage=coverage)


def _train(loc: str, spec: dict) -> dict:
    dataset_id = spec["dataset_id"]
    var_name = spec.get("variable", "precip_24h")
    source_id = (datasets.manifest(loc, dataset_id) or {}).get("source_id", "era5")
    lag = sources.SOURCE_OPTIONS.get(source_id, (None, 24 * 6, ""))[1]
    # Earthdata products carry availability delay in days, not the
    # Meteomatics hourly lag convention; NASA POWER carries an hourly one.
    if source_id == power.SOURCE_ID:
        lag = power.DELAY_HOURS
    elif source_id not in sources.SOURCE_OPTIONS:
        from .variables import PRODUCTS
        lag = 24 * PRODUCTS.get(source_id, {}).get("delay_days", 30)
    cards = [training.train(loc, dataset_id, h, lag_hours=lag, variable=var_name)
             for h in (0, 1, 2)]
    return {"cards": cards, "states": [c["state"] for c in cards], "variable": var_name}


def _trend(loc: str, spec: dict) -> dict:
    dataset_id = spec.get("dataset_id")
    var_name = spec.get("variable", "precip_24h")
    records = (datasets.load(loc, dataset_id) if dataset_id
               else staged_records(loc, spec.get("source_id", "era5")))
    if not records:
        raise ValueError("no records available for trend analysis")
    family = spec.get("family_id", "annual_total")
    report = trends.analyze(records, family_id=family, variable=var_name)
    report["q_values"] = None
    rdir = REPORTS / loc
    rdir.mkdir(parents=True, exist_ok=True)
    rid = f"tr-{family}-{report.get('span', {}).get('last', 'na')}"
    (rdir / f"{rid}.json").write_text(json.dumps(report, indent=1))
    return {"report_id": rid, "state": report["state"],
            "slope_per_decade": report.get("slope_per_decade"),
            "p_raw": report.get("p_raw")}


def trend_reports(loc: str) -> list[dict]:
    base = REPORTS / loc
    if not base.exists():
        return []
    reports = []
    for f in sorted(base.glob("*.json")):
        try:
            reports.append(json.loads(f.read_text()))
        except json.JSONDecodeError:
            continue
    # BH adjustment across the stored family.
    qs = trends.benjamini_hochberg([r.get("p_raw") for r in reports])
    for r, q in zip(reports, qs):
        r["q_bh"] = q
    return reports


def _pipeline(job_id: str, loc: str, spec: dict) -> dict:
    from . import predict
    from .variables import PRODUCTS
    target = spec.get("variable", "precip_24h")
    source = variable_spec(target)["sources"][0]
    spec = {**spec, "source_id": source, "variable": target}
    if not spec.get("end"):
        spec["end"] = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        jobs.advance(job_id, jobs.get(job_id)["progress"], {"end": spec["end"]})
    phase = spec.get("phase", "ingest")
    if phase == "ingest":
        result = (_earthdata_ingest(job_id, loc, spec, transport=None, parser=None, region_lookup=None)
                  if source in PRODUCTS else
                  _power_ingest(job_id, loc, spec, transport=None)
                  if source == power.SOURCE_ID else
                  _ingest(job_id, loc, spec, transport=None, region_lookup=None))
        if result.get("pending"):
            return result
        spec.update(phase="dataset")
        jobs.advance(job_id, .35, {"phase": "dataset", "message": "Building a frozen historical dataset"})
    if spec["phase"] == "dataset":
        ds = _dataset(loc, spec)
        spec.update(phase="train", dataset_id=ds["dataset_id"])
        jobs.advance(job_id, .45, {"phase": "train", "dataset_id": ds["dataset_id"],
                                "message": "Training and evaluating local models against baselines"})
    if jobs.get(job_id)["status"] == "cancelled":
        return {"state": "cancelled"}
    result = _train(loc, spec)
    if jobs.get(job_id)["status"] == "cancelled":
        return {"state": "cancelled"}
    jobs.advance(job_id, .9, {"message": "Checking model eligibility and producing forecasts"})
    for card in result["cards"]:
        if card["state"] == "eligible":
            training.activate(loc, card["model_id"])
    try:
        location = locations.resolve(loc)
    except KeyError:
        location = None
    forecast = predict.predict(loc, staged_records(loc, source), target=target,
                               location=location)
    return {"target": target, "dataset_id": spec["dataset_id"], "models": result["cards"],
            "forecast": forecast, "state": forecast.get("state", "available")}


def _loop():
    refreshed_at = 0.0
    while not _stop.is_set():
        try:
            job_id = jobs.next_queued()
            if job_id:
                execute(job_id)
                continue
            if time.monotonic() - refreshed_at >= 300:
                refresh_predictions()
                refreshed_at = time.monotonic()
        except Exception:
            logging.getLogger(__name__).exception("Historical forecast worker failed")
        _stop.wait(2)


def refresh_predictions():
    """Renew expired local forecasts only; never download or retrain on a visit."""
    from . import predict
    for record in locations.list_locations(locations.MAX_LOCATIONS):
        loc = record["location_id"]
        targets = {m.get("metrics", {}).get("target", "precip_24h")
                   for m in training.list_models(loc) if m["state"] == "active"}
        from .variables import VARIABLES
        targets.update(target for target in VARIABLES
                       if predict.current(loc, target).get("quality_status") == "experimental_preview")
        for target in targets:
            current = predict.current(loc, target)
            if current.get("state") == "available" and not current.get("stale"):
                continue
            predict.predict(loc, staged_records(loc), target=target, location=record)


def start():
    global _thread
    if _thread and _thread.is_alive():
        return
    jobs.recover()
    _stop.clear()
    _thread = threading.Thread(target=_loop, name="iris-dataset-forecasts", daemon=True)
    _thread.start()


def stop():
    _stop.set()
    if _thread:
        _thread.join(timeout=2)
