"""v2 API boundary: history-only Iris ML forecasting endpoints.

Static routes are declared before /{identifier} routes so they cannot be
shadowed. Every read returns a typed honest state; mutations are bounded,
idempotent, and gated by an optional admin token for non-local deployments.
"""
from __future__ import annotations

import os
from datetime import UTC, datetime

from fastapi import APIRouter, Header, HTTPException
from hazards import meteomatics

from ..catalog import region
from . import datasets, jobs, predict, sources, training, workers

router = APIRouter(prefix="/api/v1/forecasts/v2", tags=["Iris ML forecasts v2"])
MAX_SPEC_BYTES = 4096


def _region(identifier: str):
    try:
        return region(identifier)
    except ValueError:
        raise HTTPException(422, "Choose a supported forecast location.") from None


def _credentials_state() -> dict:
    try:
        meteomatics.credentials()
        return {"configured": True}
    except Exception as e:  # names the missing configuration, never the secret
        return {"configured": False, "reason": str(e).split(":")[0]}


def _admin_guard(token: str | None) -> None:
    expected = os.environ.get("IRIS_ML_ADMIN_TOKEN")
    if expected and token != expected:
        raise HTTPException(403, "An administrator token is required for ML pipeline mutations.")


def _spec(payload: dict | None) -> dict:
    if payload is None:
        return {}
    import json
    if len(json.dumps(payload)) > MAX_SPEC_BYTES:
        raise HTTPException(413, "Job specification too large.")
    for banned in ("url", "path", "file"):
        if banned in payload:
            raise HTTPException(422, "Arbitrary URLs and filesystem paths are not accepted.")
    return payload


# ---- static routes first ----


@router.get("/capabilities")
def capabilities():
    return {
        "schema_version": "iris.ml-forecast.v2",
        "credentials": _credentials_state(),
        "policy": "history-only: Meteomatics past records only; provider future values prohibited",
        "sources": {sid: {"param": p, "declared_availability_lag_hours": lag, "role": role}
                    for sid, (p, lag, role) in sources.SOURCE_OPTIONS.items()},
        "admin_token_required": bool(os.environ.get("IRIS_ML_ADMIN_TOKEN")),
    }


@router.get("/jobs/{job_id}")
def job(job_id: str):
    if len(job_id) > 64:
        raise HTTPException(422, "Invalid job id.")
    try:
        return jobs.get(job_id)
    except KeyError:
        raise HTTPException(404, "Unknown job.") from None


@router.post("/jobs/{job_id}/cancel")
def cancel(job_id: str):
    try:
        return jobs.cancel(job_id)
    except KeyError:
        raise HTTPException(404, "Unknown job.") from None


@router.post("/jobs/{job_id}/retry")
def retry(job_id: str):
    try:
        j = jobs.get(job_id)
    except KeyError:
        raise HTTPException(404, "Unknown job.") from None
    if j["status"] not in ("failed", "cancelled"):
        raise HTTPException(409, "Only failed or cancelled jobs may be retried.")
    return jobs.enqueue(j["kind"], j["location_id"], "", spec=j["checkpoint"])


@router.get("/runs/{location_id}/{run_id}")
def run(location_id: str, run_id: str):
    if len(run_id) > 64:
        raise HTTPException(422, "Invalid run id.")
    doc = predict.get_run(location_id, run_id)
    if doc is None:
        raise HTTPException(404, "Unknown forecast run.")
    return doc


# ---- identifier routes ----


@router.get("/{identifier}/history")
def history(identifier: str, source_id: str = "era5", limit: int = 366):
    r = _region(identifier)
    if source_id not in sources.SOURCE_OPTIONS:
        raise HTTPException(422, f"Unknown source '{source_id}'.")
    records = workers.staged_records(r["id"], source_id)
    precip = [x for x in records if str(x.get("variable", "")).startswith("precip")]
    days = sorted({x["interval_start"][:10] for x in precip})
    limit = max(1, min(limit, 366 * 40))
    return {
        "schema_version": "iris.ml-forecast.v2",
        "state": "available" if records else "unavailable",
        "source_id": source_id,
        "records": precip[-limit:],
        "coverage": {"complete_days": len(days),
                     "first_day": days[0] if days else None,
                     "last_day": days[-1] if days else None},
        "note": "records are interval accumulations ending at interval_end",
    }


@router.get("/{identifier}/datasets")
def list_datasets(identifier: str):
    r = _region(identifier)
    m = datasets.manifests(r["id"])
    return {"state": "available" if m else "unavailable",
            "reason": None if m else "no dataset has been built from staged history",
            "datasets": m}


@router.post("/{identifier}/datasets")
def build_dataset(identifier: str, payload: dict | None = None,
                  x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _region(identifier)
    spec = _spec(payload)
    return jobs.enqueue("dataset", r["id"], spec.get("idem", ""), spec)


@router.get("/{identifier}/models")
def models(identifier: str):
    r = _region(identifier)
    cards = training.list_models(r["id"])
    return {"state": "available" if cards else "unavailable",
            "reason": None if cards else "no model has been trained on a frozen dataset",
            "models": cards}


@router.post("/{identifier}/models/{model_id}/activate")
def activate(identifier: str, model_id: str,
             x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _region(identifier)
    registry_p = training.MODELS_ROOT / r["id"] / "registry.json"
    if not registry_p.exists():
        raise HTTPException(404, "No model registry for this location.")
    import json
    registry = json.loads(registry_p.read_text())
    entry = registry["models"].get(model_id)
    if not entry:
        raise HTTPException(404, "Unknown model id.")
    if entry["state"] != "eligible":
        raise HTTPException(409, f"Model is '{entry['state']}'; only eligible models may activate.")
    for e in registry["models"].values():
        if e["horizon_index"] == entry["horizon_index"] and e["state"] == "active":
            e["state"] = "retired"
    entry["state"] = "active"
    registry_p.write_text(__import__("json").dumps(registry, indent=1))
    return {"model_id": model_id, "state": "active"}


@router.get("/{identifier}/trends")
def trends_list(identifier: str):
    r = _region(identifier)
    reports = workers.trend_reports(r["id"])
    return {"state": "available" if reports else "unavailable",
            "reason": None if reports else "no trend report exists for an explicit dataset and hypothesis family",
            "reports": reports}


@router.post("/{identifier}/trends")
def trends_compute(identifier: str, payload: dict | None = None,
                   x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _region(identifier)
    spec = _spec(payload)
    return jobs.enqueue("trend", r["id"], spec.get("idem", ""), spec)


@router.post("/{identifier}/ingest")
def ingest(identifier: str, payload: dict | None = None,
           x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _region(identifier)
    if not _credentials_state()["configured"]:
        raise HTTPException(503, "Meteomatics credentials are not configured; ingestion cannot start.")
    spec = _spec(payload)
    source_id = spec.get("source_id", "era5")
    if source_id not in sources.SOURCE_OPTIONS:
        raise HTTPException(422, f"Unknown source '{source_id}'.")
    if spec.get("start"):
        try:
            start = datetime.fromisoformat(str(spec["start"]).replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(422, "Invalid start date.") from None
        sources.assert_historical(start, datetime.now(UTC))  # future bounds rejected
        if start < datetime(1990, 1, 1, tzinfo=UTC):
            raise HTTPException(422, "Start predates the 1991 record floor.")
    return jobs.enqueue("ingest", r["id"], spec.get("idem", ""), spec)


@router.post("/{identifier}/train")
def train(identifier: str, payload: dict | None = None,
          x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _region(identifier)
    spec = _spec(payload)
    if not spec.get("dataset_id"):
        raise HTTPException(422, "dataset_id is required — training is bound to a frozen dataset.")
    if not datasets.manifest(r["id"], spec["dataset_id"]):
        raise HTTPException(404, "Unknown dataset_id for this location.")
    return jobs.enqueue("train", r["id"], spec.get("idem", ""), spec)


@router.post("/{identifier}/predict")
def predict_now(identifier: str):
    r = _region(identifier)
    records = workers.staged_records(r["id"])
    result = predict.predict(r["id"], records)
    return result


@router.post("/{identifier}/refresh")
def refresh(identifier: str, payload: dict | None = None,
            x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _region(identifier)
    spec = _spec(payload)
    spec.setdefault("backfill_days", 14)  # refresh is incremental by default
    return jobs.enqueue("ingest", r["id"], spec.get("idem", f"refresh-{datetime.now(UTC):%Y%m%d}"), spec)
