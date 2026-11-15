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
from . import datasets, earthdata, jobs, qa, sources, training, trends
from .variables import variable as variable_spec

STAGING = Path(STORE_PATH).parent / "v2" / "history"
REPORTS = Path(STORE_PATH).parent / "v2" / "trend_reports"
DEFAULT_BUDGET = {"remaining": 60}
_stop = threading.Event()
_thread = None


def staging_path(location_id: str, source_id: str) -> Path:
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
    from ..catalog import region as lookup
    region = (region_lookup or lookup)(loc)
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
    from ..catalog import region as lookup
    region = (region_lookup or lookup)(loc)
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
    return datasets.build(loc, source_id, valid, quarantined, spec=spec)


def _train(loc: str, spec: dict) -> dict:
    dataset_id = spec["dataset_id"]
    var_name = spec.get("variable", "precip_24h")
    source_id = (datasets.manifest(loc, dataset_id) or {}).get("source_id", "era5")
    lag = sources.SOURCE_OPTIONS.get(source_id, (None, 24 * 6, ""))[1]
    # Earthdata products carry availability delay in days, not the
    # Meteomatics hourly lag convention.
    if source_id not in sources.SOURCE_OPTIONS:
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
    forecast = predict.predict(loc, staged_records(loc, source), target=target)
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
    from ..catalog import REGIONS
    from . import predict
    for loc in REGIONS:
        targets = {m.get("metrics", {}).get("target", "precip_24h")
                   for m in training.list_models(loc) if m["state"] == "active"}
        from .variables import VARIABLES
        targets.update(target for target in VARIABLES
                       if predict.current(loc, target).get("quality_status") == "experimental_preview")
        for target in targets:
            current = predict.current(loc, target)
            if current.get("state") == "available" and not current.get("stale"):
                continue
            predict.predict(loc, staged_records(loc), target=target)


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
