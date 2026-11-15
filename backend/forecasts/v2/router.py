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
from . import appeears, datasets, jobs, predict, sources, training, workers
from .variables import VARIABLES, PRODUCTS

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
        "earthdata_credentials": {"configured": appeears.configured()},
        "policy": "history-only: Meteomatics/Earthdata past records only; provider future values prohibited",
        "sources": {sid: {"param": p, "declared_availability_lag_hours": lag, "role": role}
                    for sid, (p, lag, role) in sources.SOURCE_OPTIONS.items()},
        "earthdata_products": {k: {"delay_days": v["delay_days"], "daac": v["daac"],
                                   "cadence": v["native_cadence"], "note": v["note"]}
                               for k, v in PRODUCTS.items()},
        "targets": {k: {"label": v["label"], "unit": v["unit"],
                        "composite_days": v["composite_days"], "sources": v["sources"]}
                    for k, v in VARIABLES.items()},
        "admin_token_required": bool(os.environ.get("IRIS_ML_ADMIN_TOKEN")),
    }


@router.get("/catalogue")
def catalogue():
    from ..catalog import REGIONS
    entries = []
    for identifier, location in REGIONS.items():
        candidates = [predict.current(identifier, target) for target in VARIABLES]
        run = next((r for r in candidates if r.get("state") == "available" and not r.get("stale")),
                   next((r for r in candidates if r.get("state") == "available"), candidates[0]))
        target = run.get("target", "precip_24h")
        available = run.get("state") == "available"
        windows = run.get("predictions", [])
        peak = max(windows, key=lambda w: w["q50"]) if windows and not run.get("stale") and target == "precip_24h" else None
        entries.append({"id": identifier, "location": location, "kind": "local_model",
                        "target": target, "target_label": VARIABLES[target]["label"], "unit": VARIABLES[target]["unit"],
                        "median": windows[0]["q50"] if windows and not run.get("stale") else None,
                        "state": ("stale" if run.get("stale") else "fresh") if available else "unavailable",
                        "artifact_id": run.get("run_id"),
                        "retrieved_at": run.get("issued_at", "").replace("+00:00", "Z") or None,
                        "expires_at": run.get("valid_until", "").replace("+00:00", "Z") or None,
                        "valid_start": windows[0]["window_start"] if windows else None,
                        "valid_end": windows[-1]["window_end"] if windows else None,
                        "peak_24h": {"start": peak["window_start"], "end": peak["window_end"],
                                     "p10": peak["q10"], "median": peak["q50"], "p90": peak["q90"],
                                     "members_available": 0} if peak else None,
                        "message": run.get("reason")})
    return {"schema_version": "iris.forecast-catalogue.v1", "forecasts": entries,
            "scope": "experimental_local_models_at_configured_points"}


@router.get("/jobs/{job_id}")
def job(job_id: str):
    if len(job_id) > 64:
        raise HTTPException(422, "Invalid job id.")
    try:
        return jobs.get(job_id)
    except KeyError:
        raise HTTPException(404, "Unknown job.") from None


@router.post("/jobs/{job_id}/cancel")
def cancel(job_id: str, x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    try:
        return jobs.cancel(job_id)
    except KeyError:
        raise HTTPException(404, "Unknown job.") from None


@router.post("/jobs/{job_id}/retry")
def retry(job_id: str, x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    try:
        j = jobs.get(job_id)
    except KeyError:
        raise HTTPException(404, "Unknown job.") from None
    if j["status"] not in ("failed", "cancelled"):
        raise HTTPException(409, "Only failed or cancelled jobs may be retried.")
    return jobs.enqueue(j["kind"], j["location_id"], "", spec=j["checkpoint"])


@router.get("/runs/{location_id}/{run_id}")
def run(location_id: str, run_id: str):
    _region(location_id)
    if len(run_id) > 64:
        raise HTTPException(422, "Invalid run id.")
    doc = predict.get_run(location_id, run_id)
    if doc is None:
        raise HTTPException(404, "Unknown forecast run.")
    return doc


# ---- identifier routes ----


@router.get("/{identifier}/history")
def history(identifier: str, source_id: str = "era5", limit: int = 366,
            variable: str | None = None):
    r = _region(identifier)
    if source_id not in sources.SOURCE_OPTIONS and source_id not in PRODUCTS:
        raise HTTPException(422, f"Unknown source '{source_id}'.")
    if variable is not None and variable not in VARIABLES:
        raise HTTPException(422, f"Unknown variable '{variable}'.")
    records = workers.staged_records(r["id"], source_id)
    sel = ([x for x in records if x.get("variable") == variable] if variable
           else [x for x in records if str(x.get("variable", "")).startswith("precip")])
    days = sorted({x["interval_start"][:10] for x in sel})
    limit = max(1, min(limit, 366 * 40))
    return {
        "schema_version": "iris.ml-forecast.v2",
        "state": "available" if sel else "unavailable",
        "source_id": source_id,
        "variable": variable or "precip",
        "records": sel[-limit:],
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


@router.get("/{identifier}/jobs")
def latest_job(identifier: str, target: str = "precip_24h"):
    r = _region(identifier)
    if target not in VARIABLES:
        raise HTTPException(422, "Unknown target.")
    return {"job": jobs.latest(r["id"], target)}


@router.post("/{identifier}/models/{model_id}/activate")
def activate(identifier: str, model_id: str,
             x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _region(identifier)
    try:
        return training.activate(r["id"], model_id)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from None


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
    spec = _spec(payload)
    source_id = spec.get("source_id", "era5")
    if source_id not in sources.SOURCE_OPTIONS and source_id not in PRODUCTS:
        raise HTTPException(422, f"Unknown source '{source_id}'.")
    if source_id in PRODUCTS:
        if not appeears.configured():
            raise HTTPException(503, "Earthdata credentials are not configured.")
        var_name = spec.get("variable")
        if var_name not in VARIABLES or source_id not in VARIABLES[var_name]["sources"]:
            raise HTTPException(422, "variable is required and must map to this product.")
        job = jobs.enqueue("earthdata_ingest", r["id"], spec.get("idem", ""), spec)
        return job
    if not _credentials_state()["configured"]:
        raise HTTPException(503, "Meteomatics credentials are not configured; ingestion cannot start.")
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
    var_name = spec.get("variable", "precip_24h")
    if var_name not in VARIABLES:
        raise HTTPException(422, f"Unknown target variable '{var_name}'.")
    return jobs.enqueue("train", r["id"], spec.get("idem", ""), spec)


@router.post("/{identifier}/predict")
def predict_now(identifier: str, target: str = "precip_24h"):
    r = _region(identifier)
    if target not in VARIABLES:
        raise HTTPException(422, f"Unknown target variable '{target}'.")
    records = workers.staged_records(r["id"])
    result = predict.predict(r["id"], records, target=target)
    return result


@router.get("/{identifier}/prediction")
def current_prediction(identifier: str, target: str = "precip_24h"):
    r = _region(identifier)
    if target not in VARIABLES:
        raise HTTPException(422, "Unknown target.")
    return predict.current(r["id"], target)


@router.post("/{identifier}/generate")
def generate(identifier: str, payload: dict | None = None,
             x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _region(identifier)
    spec = _spec(payload)
    target = spec.get("variable", "precip_24h")
    if target not in VARIABLES:
        raise HTTPException(422, "Unknown target.")
    source = VARIABLES[target]["sources"][0]
    if not spec.get("dataset_id"):
        existing = predict.predict(r["id"], workers.staged_records(r["id"], source), target=target)
        if existing.get("state") == "available":
            return existing
    if source in PRODUCTS and not appeears.configured():
        raise HTTPException(503, "Earthdata credentials are missing.")
    if source in sources.SOURCE_OPTIONS and not _credentials_state()["configured"]:
        raise HTTPException(503, "Meteomatics credentials are missing.")
    spec.setdefault("start", "2015-01-01T00:00:00+00:00")
    spec.update(variable=target, source_id=source)
    if spec.get("dataset_id"):
        if not datasets.manifest(r["id"], spec["dataset_id"]):
            raise HTTPException(404, "Unknown dataset for this location.")
        spec["phase"] = "train"
    return jobs.enqueue("pipeline", r["id"], spec.get("idem", f"generate-{target}-{datetime.now(UTC):%Y%m%d}"), spec)


@router.post("/{identifier}/refresh")
def refresh(identifier: str, payload: dict | None = None,
            x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _region(identifier)
    spec = _spec(payload)
    spec.setdefault("backfill_days", 14)  # refresh is incremental by default
    return jobs.enqueue("ingest", r["id"], spec.get("idem", f"refresh-{datetime.now(UTC):%Y%m%d}"), spec)
