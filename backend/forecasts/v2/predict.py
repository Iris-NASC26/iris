"""Local Iris predictions from verified model artifacts only.

Never silently falls back to provider forecasts: when no eligible/active model
exists for a horizon, that window is reported unavailable. Quantiles are
published only when they can be made finite, nonnegative and ordered — a raw
violation marks the window unavailable instead of hiding model defects.
"""
from __future__ import annotations

import json
import re
import uuid
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from pathlib import Path

from ..store import PATH as STORE_PATH
from . import features, training
from .schemas import ForecastRun, QuantilePrediction
from .variables import variable as variable_spec

RUNS_ROOT = Path(STORE_PATH).parent / "v2" / "runs"
HORIZONS = (0, 1, 2)


def _active_model(location_id: str, horizon: int, target: str = "precip_24h") -> dict | None:
    registry_p = training.MODELS_ROOT / location_id / "registry.json"
    if not registry_p.exists():
        return None
    registry = json.loads(registry_p.read_text())
    for mid, e in registry["models"].items():
        if (e["state"] == "active" and e["horizon_index"] == horizon
                and e.get("target", "precip_24h") == target):
            loaded = training.load_verified(location_id, mid)
            if loaded:
                loaded["model_id"] = mid
                return loaded
    return None


def predict(location_id: str, records: list[dict], issue_ts: str | None = None,
            target: str = "precip_24h") -> dict:
    """Run eligible local models using the same native features as evaluation."""
    import numpy as np
    from threadpoolctl import threadpool_limits
    from .fitting import History, VERSION, stamp, window
    spec = variable_spec(target)
    issue = stamp(issue_ts) if issue_ts else datetime.now(UTC)
    windows, unavailable, latest_inputs = [], [], []
    dataset_hashes = []
    for h in HORIZONS:
        active = _active_model(location_id, h, target)
        if not active:
            unavailable.append({"horizon": h, "reason": "no active model for this horizon"})
            continue
        bundle = active["bundle"]
        if bundle.get("engine_version") != VERSION:
            unavailable.append({"horizon": h, "reason": "retrain this older model using the availability-correct native-period engine"})
            continue
        history = History(records, target, bundle["source_id"], bundle["lag_hours"])
        feat = history.feature(issue, h)
        if feat is None:
            unavailable.append({"horizon": h, "reason": "insufficient quality-controlled records at the information cutoff"})
            continue
        if feat["input_age_days"] > bundle["max_input_age_days"]:
            unavailable.append({"horizon": h, "reason": "latest input is older than the range evaluated for this model; refresh the historical records"})
            continue
        row = np.array([[feat[c] for c in bundle["feature_columns"]]], dtype=float)
        with threadpool_limits(limits=1):
            q = sorted(float(bundle["models"][name].predict(row)[0]) for name in ("q10", "median", "q90"))
        correction = bundle.get("interval_correction", 0.0)
        q = [max(spec["min"], q[0] - correction),
             min(spec["max"], max(spec["min"], q[1])), min(spec["max"], q[2] + correction)]
        start, end = window(issue, h, target)
        try:
            result = QuantilePrediction(
                window_start=start.isoformat(), window_end=end.isoformat(),
                lead_hours=(end - issue).total_seconds() / 3600,
                q10=q[0], q50=q[1], q90=q[2], unit=spec["unit"], nonnegative=spec["nonnegative"],
                model_id=active["model_id"], model_hash=active["entry"]["sha256"],
                dataset_id=bundle["dataset_id"], source_id=bundle["source_id"],
                evaluation_ref=active["model_id"])
        except ValueError:
            unavailable.append({"horizon": h, "reason": "model produced invalid prediction quantiles"})
            continue
        windows.append(result)
        latest_inputs.append(max(r["end"] for r in history.inputs(issue)))
        dataset_hashes.append(bundle["dataset_hash"])
    if not windows:
        return {"state": "unavailable", "target": target,
                "reason": "no horizon produced a verified local prediction",
                "horizons": unavailable, "schema_version": "iris.ml-forecast.v2"}
    latest = min(latest_inputs)
    run = ForecastRun(
        run_id="run-" + uuid.uuid4().hex[:16], model_id=windows[0].model_id,
        model_hash=windows[0].model_hash, dataset_revision=dataset_hashes[0],
        issued_at=issue.isoformat(), input_cutoff=latest.isoformat(),
        latest_input_at=latest.isoformat(), input_age_hours=(issue - latest).total_seconds() / 3600,
        valid_until=min(issue + timedelta(hours=6), datetime.fromisoformat(windows[0].window_start)).isoformat(),
        uncertainty_method="quantile gradient boosting with calibration-only interval adjustment; empirical holdout coverage, no universal coverage guarantee",
        evaluation_ref=windows[0].model_id, predictions=windows, target=target,
        horizons_unavailable=unavailable)
    out = {**asdict(run), "state": "available"}
    rdir = RUNS_ROOT / location_id
    rdir.mkdir(parents=True, exist_ok=True)
    (rdir / f"{run.run_id}.json").write_text(json.dumps(out, indent=1))
    pointer = rdir / f"current-{target}.json"
    tmp = pointer.with_suffix(".tmp")
    tmp.write_text(json.dumps({"run_id": run.run_id}))
    tmp.replace(pointer)
    return out


def current(location_id: str, target: str = "precip_24h") -> dict:
    pointer = RUNS_ROOT / location_id / f"current-{target}.json"
    if pointer.exists():
        run = get_run(location_id, json.loads(pointer.read_text())["run_id"])
        if run:
            run["stale"] = datetime.fromisoformat(run["valid_until"]) <= datetime.now(UTC)
            return run
    return {"state": "unavailable", "target": target, "reason": "No dataset forecast has been published for this target yet."}


def get_run(location_id: str, run_id: str) -> dict | None:
    if not re.fullmatch(r"run-[a-f0-9]{16}", run_id):
        return None
    p = RUNS_ROOT / location_id / f"{run_id}.json"
    return json.loads(p.read_text()) if p.exists() else None
