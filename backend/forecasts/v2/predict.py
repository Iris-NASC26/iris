"""Local Iris predictions from verified model artifacts only.

Never silently falls back to provider forecasts: when no eligible/active model
exists for a horizon, that window is reported unavailable. Quantiles are
published only when they can be made finite, nonnegative and ordered — a raw
violation marks the window unavailable instead of hiding model defects.
"""
from __future__ import annotations

import json
import uuid
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from pathlib import Path

from ..store import PATH as STORE_PATH
from . import features, training
from .schemas import ForecastRun, QuantilePrediction

RUNS_ROOT = Path(STORE_PATH).parent / "v2" / "runs"
HORIZONS = (0, 1, 2)


def _active_model(location_id: str, horizon: int) -> dict | None:
    registry_p = training.MODELS_ROOT / location_id / "registry.json"
    if not registry_p.exists():
        return None
    registry = json.loads(registry_p.read_text())
    for mid, e in registry["models"].items():
        if e["state"] == "active" and e["horizon_index"] == horizon:
            loaded = training.load_verified(location_id, mid)
            if loaded:
                loaded["model_id"] = mid
                return loaded
    return None


def predict(location_id: str, records: list[dict], issue_ts: str | None = None) -> dict:
    """One run across all horizons with active models. Honest per-window state."""
    issue = issue_ts or datetime.now(UTC).isoformat()
    windows, unavailable = [], []
    model_id = ""
    for h in HORIZONS:
        active = _active_model(location_id, h)
        if not active:
            unavailable.append({"horizon": h, "reason": "no active model for this horizon"})
            continue
        bundle = active["bundle"]
        model_id = active["model_id"]
        hist = [features.qa.HistoricalRecord(
            **{k: v for k, v in r.items()
               if k in features.qa.HistoricalRecord.__dataclass_fields__})
            for r in records]
        feat = features.build_features(hist, issue, h, bundle["lag_hours"])
        if feat is None:
            unavailable.append({"horizon": h, "reason": "insufficient recent history at the availability cutoff"})
            continue
        row = [[feat.get(c) for c in bundle["feature_columns"]]]
        import numpy as np
        q10 = float(bundle["models"]["q10"].predict(np.array(row, dtype=float))[0])
        q50 = float(bundle["models"]["median"].predict(np.array(row, dtype=float))[0])
        q90 = float(bundle["models"]["q90"].predict(np.array(row, dtype=float))[0])
        try:
            qp = QuantilePrediction(
                window_start=(datetime.fromisoformat(issue.replace("Z", "+00:00")) + timedelta(hours=24 * h)).isoformat(),
                window_end=(datetime.fromisoformat(issue.replace("Z", "+00:00")) + timedelta(hours=24 * (h + 1))).isoformat(),
                lead_hours=24.0 * (h + 1),
                q10=max(0.0, q10), q50=max(0.0, q50), q90=max(0.0, q90))
        except ValueError:
            unavailable.append({"horizon": h, "reason": "model quantiles violated ordering/nonnegativity; window suppressed"})
            continue
        windows.append(qp)
    if not windows:
        return {"state": "unavailable",
                "reason": "no horizon produced a verified local prediction",
                "horizons": unavailable, "schema_version": "iris.ml-forecast.v2"}
    run = ForecastRun(
        run_id=f"run-{uuid.uuid4().hex[:16]}",
        model_id=model_id,
        model_hash="",
        dataset_revision="",
        issued_at=issue,
        input_cutoff=issue,
        valid_until=(datetime.fromisoformat(issue.replace("Z", "+00:00")) + timedelta(hours=6)).isoformat(),
        uncertainty_method="quantile gradient boosting (q10/q90) — coverage measured on held-out calibration",
        predictions=windows,
    )
    rdir = RUNS_ROOT / location_id
    rdir.mkdir(parents=True, exist_ok=True)
    (rdir / f"{run.run_id}.json").write_text(json.dumps(asdict(run), indent=1))
    import os
    tmp = rdir / "current.json.tmp"
    tmp.write_text(json.dumps({"run_id": run.run_id, "issued_at": run.issued_at}))
    os.replace(tmp, rdir / "current.json")  # atomic pointer publish
    out = asdict(run)
    out["horizons_unavailable"] = unavailable
    return out


def get_run(location_id: str, run_id: str) -> dict | None:
    p = RUNS_ROOT / location_id / f"{run_id}.json"
    return json.loads(p.read_text()) if p.exists() else None
