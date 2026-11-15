"""Durable-job executors — the only place jobs mutate world state.

Each executor reads its checkpoint, performs bounded work, and writes the
result artifact. Ingestion appends sanitized records to per-source staging
files; dataset builds are content-addressed; training goes through the
eligibility gates; trends persist declared hypothesis reports.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from ..store import PATH as STORE_PATH
from . import datasets, jobs, qa, sources, training, trends

STAGING = Path(STORE_PATH).parent / "v2" / "history"
REPORTS = Path(STORE_PATH).parent / "v2" / "trend_reports"
DEFAULT_BUDGET = {"remaining": 60}


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


def execute(job_id: str, *, transport=None, region_lookup=None) -> dict:
    """Run one queued/resumed job to completion or a checkpoint pause."""
    job = jobs.get(job_id)
    jobs.begin(job_id)
    kind, loc = job["kind"], job["location_id"]
    spec = job.get("checkpoint") or {}
    try:
        if kind == "ingest":
            result = _ingest(job_id, loc, spec, transport=transport, region_lookup=region_lookup)
        elif kind == "dataset":
            result = _dataset(loc, spec)
        elif kind == "train":
            result = _train(loc, spec)
        elif kind == "trend":
            result = _trend(loc, spec)
        else:
            raise ValueError(f"unknown job kind {kind}")
        jobs.advance(job_id, 1.0, {"result": result})
        jobs.finish(job_id, True)
        return jobs.get(job_id)
    except Exception as e:
        jobs.finish(job_id, False, str(e)[:500])
        return jobs.get(job_id)


def _ingest(job_id: str, loc: str, spec: dict, *, transport, region_lookup) -> dict:
    region = (region_lookup or (lambda i: {"id": i, "latitude": 0.0, "longitude": 0.0}))(loc)
    source_id = spec.get("source_id", "era5")
    lag_hours = sources.SOURCE_OPTIONS.get(source_id, (None, 24 * 6, ""))[1]
    end = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    start = (datetime.fromisoformat(spec["start"]) if spec.get("start")
             else end - timedelta(days=int(spec.get("backfill_days", 365))))
    ckpt = spec.get("ingest_checkpoint", {})
    out = sources.fetch_history(
        loc, float(region["latitude"]), float(region["longitude"]), source_id,
        start, end, transport=transport,
        budget={**DEFAULT_BUDGET, **(spec.get("budget") or {})},
        checkpoint=ckpt, sleep=lambda s: None)
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
    return {"new_records": len(valid), "quarantined": len(quarantined),
            "checkpoint": out["next_checkpoint"], "exhausted": out["exhausted"],
            "source": out["source"]}


def _dataset(loc: str, spec: dict) -> dict:
    source_id = spec.get("source_id", "era5")
    staged = staged_records(loc, source_id)
    if not staged:
        raise ValueError("no staged history for this source — run ingest first")
    valid, quarantined = qa.normalize(staged, loc, source_id)
    return datasets.build(loc, source_id, valid, quarantined, spec=spec)


def _train(loc: str, spec: dict) -> dict:
    dataset_id = spec["dataset_id"]
    source_id = (datasets.manifest(loc, dataset_id) or {}).get("source_id", "era5")
    lag = sources.SOURCE_OPTIONS.get(source_id, (None, 24 * 6, ""))[1]
    cards = [training.train(loc, dataset_id, h, lag_hours=lag) for h in (0, 1, 2)]
    return {"cards": cards, "states": [c["state"] for c in cards]}


def _trend(loc: str, spec: dict) -> dict:
    dataset_id = spec.get("dataset_id")
    records = (datasets.load(loc, dataset_id) if dataset_id
               else staged_records(loc, spec.get("source_id", "era5")))
    if not records:
        raise ValueError("no records available for trend analysis")
    family = spec.get("family_id", "annual_total")
    report = trends.analyze(records, family_id=family)
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
