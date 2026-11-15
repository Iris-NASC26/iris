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

from . import appeears, datasets, fitting, gic, jobs, locations, power, predict, sources, training, updates, workers
from .variables import VARIABLES, PRODUCTS

router = APIRouter(prefix="/api/v1/forecasts/v2", tags=["Iris ML forecasts v2"])
MAX_SPEC_BYTES = 4096


def _location(identifier: str):
    """Resolve any registered forecast context; unknown ids are real 404s."""
    try:
        return locations.resolve(identifier)
    except KeyError:
        raise HTTPException(404, "Unknown forecast location.") from None


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


def _earthdata_configured(target: str) -> bool:
    return gic.configured() if target in gic.FIELDS else appeears.configured()


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
        "earthdata_credentials": {"configured": gic.configured()},
        "policy": "history-only: Meteomatics/Earthdata past records only; provider future values prohibited",
        "sources": {sid: {"param": p, "declared_availability_lag_hours": lag, "role": role}
                    for sid, (p, lag, role) in sources.SOURCE_OPTIONS.items()},
        "earthdata_products": {k: {"delay_days": v["delay_days"], "daac": v["daac"],
                                   "cadence": v["native_cadence"], "note": v["note"]}
                               for k, v in PRODUCTS.items()},
        "targets": {k: {"label": v["label"], "unit": v["unit"],
                        "composite_days": v["composite_days"], "sources": v["sources"]}
                    for k, v in VARIABLES.items()},
        # What each source can actually serve — spatial modes, auth needs,
        # real access method and update semantics. Area means exist only
        # where a genuine multi-cell path is implemented.
        "source_capabilities": {
            power.SOURCE_ID: power.CAPABILITY,
            **{sid: {"spatial_modes": ["point"], "requires_credentials": True,
                     "access": "Meteomatics API", "delay_hours": lag, "role": role}
               for sid, (param, lag, role) in sources.SOURCE_OPTIONS.items()},
            **{pid: {"spatial_modes": ["point"], "requires_credentials": True,
                     "access": p["access"], "delay_days": p["delay_days"],
                     "daac": p["daac"], "note": p["note"]}
               for pid, p in PRODUCTS.items()},
        },
        "admin_token_required": bool(os.environ.get("IRIS_ML_ADMIN_TOKEN")),
    }


@router.get("/catalogue")
def catalogue():
    entries = []
    for location in locations.list_locations(locations.MAX_LOCATIONS):
        identifier = location["location_id"]
        candidates = [predict.current(identifier, target) for target in VARIABLES]
        candidates.sort(key=lambda r: (r.get("quality_status") == "experimental_preview", bool(r.get("stale"))))
        run = next((r for r in candidates if r.get("state") == "available" and not r.get("stale")),
                   next((r for r in candidates if r.get("state") == "available"), candidates[0]))
        target = run.get("target", "precip_24h")
        available = run.get("state") == "available"
        windows = run.get("predictions", [])
        peak = max(windows, key=lambda w: w["q50"]) if windows and not run.get("stale") and target == "precip_24h" else None
        entries.append({"id": identifier, "location": location, "kind": "local_model",
                        "quality_status": run.get("quality_status", "passed_checks"),
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
            "scope": "experimental_local_models_at_registered_points"}


@router.get("/locations")
def location_list(limit: int = 200, offset: int = 0):
    return {"schema_version": "iris.forecast-location.v1",
            "locations": locations.list_locations(limit, offset),
            "total": locations.count()}


@router.post("/locations")
def location_register(payload: dict | None = None,
                      x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    spec = _spec(payload)
    try:
        if spec.get("geometry") is not None:
            raise HTTPException(
                422, "Only numeric bounds [west, south, east, north] are accepted "
                     "for areas — arbitrary polygon geometry is not supported yet.")
        if spec.get("bbox") is not None:
            record, created = locations.register_area(
                spec.get("name"), spec["bbox"], spec.get("timezone"))
        else:
            record, created = locations.register(
                spec.get("name"), spec.get("latitude"), spec.get("longitude"),
                spec.get("timezone"))
    except (ValueError, TypeError) as exc:
        raise HTTPException(422, str(exc)) from None
    return {"schema_version": "iris.forecast-location.v1",
            "location": record, "created": created}


@router.get("/locations/{location_id}")
def location_get(location_id: str):
    if len(location_id) > 40:
        raise HTTPException(422, "Invalid location identifier.")
    record = _location(location_id)
    return {"schema_version": "iris.forecast-location.v1",
            "location": locations._public(record)}


@router.get("/datasets")
def dataset_inventory(limit: int = 50, offset: int = 0):
    """Populated immutable revisions across all registered contexts."""
    try:
        return {"schema_version": "iris.ml-forecast.v2",
                **datasets.inventory(limit, offset)}
    except (TypeError, ValueError):
        raise HTTPException(422, "Invalid inventory bounds.") from None


def _compat(state: str, reasons: list[str], message: str, *, loc: dict,
            target: str, dataset: dict | None = None,
            suggested_dataset_id: str | None = None,
            sufficiency: dict | None = None) -> dict:
    out = {"schema_version": "iris.ml-forecast.v2", "state": state,
           "reasons": reasons, "message": message,
           "location_id": loc["location_id"], "location_name": loc["name"],
           "target": target, "suggested_dataset_id": suggested_dataset_id}
    if dataset is not None:
        out["dataset"] = {k: dataset.get(k) for k in (
            "dataset_id", "location_id", "source_id", "variables", "records",
            "spatial_mode", "spatial_support", "requested_geometry",
            "resolved_coordinates", "spatial_extent", "coverage",
            "precip_complete_days", "content_sha256", "created_at")}
    if sufficiency is not None:
        out["sufficiency"] = sufficiency
    return out


def _lag_hours(source_id: str) -> float:
    if source_id == power.SOURCE_ID:
        return power.DELAY_HOURS
    if source_id in sources.SOURCE_OPTIONS:
        return sources.SOURCE_OPTIONS[source_id][1]
    return 24 * PRODUCTS.get(source_id, {}).get("delay_days", 30)


@router.get("/compatibility")
def compatibility(location_id: str, target: str = "precip_24h",
                  dataset_id: str | None = None):
    """Typed readiness for a location × target × optional dataset selection.

    A dataset is bound to the exact context that produced it; no point's data
    is ever borrowed for another by changing a label.
    """
    loc = _location(location_id)
    if target not in VARIABLES:
        raise HTTPException(422, "Unknown target.")
    eligible_sources = VARIABLES[target]["sources"]
    if dataset_id:
        m = datasets.find(dataset_id)
        if m is None:
            raise HTTPException(404, "Unknown dataset_id.")
        if m["location_id"] != loc["location_id"]:
            try:
                other = locations.resolve(m["location_id"])["name"]
            except KeyError:
                other = m["location_id"]
            return _compat("outside_spatial_support",
                           ["dataset_bound_to_other_location"],
                           f"This dataset was built for {other}; it cannot forecast {loc['name']}.",
                           loc=loc, target=target, dataset=m)
        if m.get("spatial_mode", "point") != loc.get("spatial_mode", "point"):
            return _compat("outside_spatial_support",
                           ["spatial_mode_mismatch"],
                           (f"This dataset is a {m.get('spatial_mode', 'point')} series but "
                            f"{loc['name']} is a {loc.get('spatial_mode', 'point')} context — "
                            "datasets are bound to their exact spatial scope."),
                           loc=loc, target=target, dataset=m)
        if target not in m.get("variables", []):
            return _compat("unsupported_target",
                           ["target_absent_from_dataset"],
                           "This dataset does not contain the selected target variable.",
                           loc=loc, target=target, dataset=m)
        if m["source_id"] not in eligible_sources:
            return _compat("unsupported_target",
                           ["source_not_eligible_for_target"],
                           f"Source {m['source_id']} is not an eligible input for this target.",
                           loc=loc, target=target, dataset=m)
        records = datasets.load(loc["location_id"], dataset_id) or []
        suf = fitting.sufficiency(records, target, m["source_id"], _lag_hours(m["source_id"]))
        if not suf["sufficient"]:
            return _compat("insufficient_history",
                           suf["reasons"],
                           f"The dataset holds {suf['native_periods']} usable native periods over {suf['span_days']} days; training needs at least 60 periods across ~2 years.",
                           loc=loc, target=target, dataset=m, sufficiency=suf)
        return _compat("ready", [],
                       f"This {m.get('spatial_mode', 'point')} dataset can train and forecast the selected target.",
                       loc=loc, target=target, dataset=m, sufficiency=suf)
    candidates = [m for m in datasets.manifests(loc["location_id"])
                  if m["source_id"] in eligible_sources
                  and target in m.get("variables", [])
                  and m.get("spatial_mode", "point") == loc.get("spatial_mode", "point")]
    if candidates:
        latest = candidates[-1]
        return _compat("ready", [],
                       "A frozen dataset for this target and spatial scope already exists.",
                       loc=loc, target=target, dataset=latest,
                       suggested_dataset_id=latest["dataset_id"])
    staged = [r for r in workers.staged_records(loc["location_id"])
              if r.get("variable") == target
              and r.get("source_id") in eligible_sources]
    if not staged:
        return _compat("needs_history", ["no_staged_history"],
                       "No quality-controlled historical records exist for this point and target yet — prepare history with the button below.",
                       loc=loc, target=target)
    suf = fitting.sufficiency(staged, target, eligible_sources[0],
                              _lag_hours(eligible_sources[0]))
    if not suf["sufficient"]:
        return _compat("insufficient_history", suf["reasons"],
                       f"{suf['native_periods']} usable native periods over {suf['span_days']} days are staged; at least 60 periods across ~2 years are required.",
                       loc=loc, target=target, sufficiency=suf)
    return _compat("needs_history", ["no_frozen_dataset_for_target"],
                   "Staged history exists; build a dataset revision (Generate does this automatically).",
                   loc=loc, target=target, sufficiency=suf)


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
    _location(location_id)
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
    r = _location(identifier)
    if (source_id not in sources.SOURCE_OPTIONS and source_id not in PRODUCTS
            and source_id != power.SOURCE_ID):
        raise HTTPException(422, f"Unknown source '{source_id}'.")
    if variable is not None and variable not in VARIABLES:
        raise HTTPException(422, f"Unknown variable '{variable}'.")
    records = workers.staged_records(r["location_id"], source_id)
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
    r = _location(identifier)
    m = datasets.manifests(r["location_id"])
    return {"state": "available" if m else "unavailable",
            "reason": None if m else "no dataset has been built from staged history",
            "datasets": m}


@router.post("/{identifier}/datasets")
def build_dataset(identifier: str, payload: dict | None = None,
                  x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _location(identifier)
    spec = _spec(payload)
    return jobs.enqueue("dataset", r["location_id"], spec.get("idem", ""), spec)


@router.get("/{identifier}/models")
def models(identifier: str):
    r = _location(identifier)
    cards = training.list_models(r["location_id"])
    return {"state": "available" if cards else "unavailable",
            "reason": None if cards else "no model has been trained on a frozen dataset",
            "models": cards}


@router.get("/{identifier}/jobs")
def latest_job(identifier: str, target: str = "precip_24h"):
    r = _location(identifier)
    if target not in VARIABLES:
        raise HTTPException(422, "Unknown target.")
    return {"job": jobs.latest(r["location_id"], target)}


@router.post("/{identifier}/models/{model_id}/activate")
def activate(identifier: str, model_id: str,
             x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _location(identifier)
    try:
        return training.activate(r["location_id"], model_id)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from None


@router.get("/{identifier}/trends")
def trends_list(identifier: str):
    r = _location(identifier)
    reports = workers.trend_reports(r["location_id"])
    return {"state": "available" if reports else "unavailable",
            "reason": None if reports else "no trend report exists for an explicit dataset and hypothesis family",
            "reports": reports}


@router.post("/{identifier}/trends")
def trends_compute(identifier: str, payload: dict | None = None,
                   x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _location(identifier)
    spec = _spec(payload)
    return jobs.enqueue("trend", r["location_id"], spec.get("idem", ""), spec)


@router.post("/{identifier}/ingest")
def ingest(identifier: str, payload: dict | None = None,
           x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _location(identifier)
    spec = _spec(payload)
    source_id = spec.get("source_id", "era5")
    if (source_id not in sources.SOURCE_OPTIONS and source_id not in PRODUCTS
            and source_id != power.SOURCE_ID):
        raise HTTPException(422, f"Unknown source '{source_id}'.")
    if r.get("spatial_mode") == "area_mean" and source_id != power.SOURCE_ID:
        raise HTTPException(
            422, "Genuine multi-cell area extraction is implemented for NASA POWER "
                 "only in this phase; this source serves point contexts.")
    if source_id == power.SOURCE_ID:
        var_name = spec.get("variable")
        if var_name != "power_t2m":
            raise HTTPException(422, "NASA POWER serves the power_t2m target in this phase.")
        if r.get("spatial_mode") == "area_mean":
            # Pre-retrieval coverage/budget check against the real request span.
            from datetime import timedelta as _td
            _end = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
            _start = _end - _td(days=int(spec.get("backfill_days", 366)))
            est = power.estimate_area(tuple(r["bbox"]), _start, _end)
            if not est["within_budget"]:
                raise HTTPException(422, " ".join(est["reasons"]))
        job = jobs.enqueue("power_ingest", r["location_id"], spec.get("idem", ""), spec)
        return job
    if source_id in PRODUCTS:
        var_name = spec.get("variable")
        if var_name not in VARIABLES or source_id not in VARIABLES[var_name]["sources"]:
            raise HTTPException(422, "variable is required and must map to this product.")
        if not _earthdata_configured(var_name):
            raise HTTPException(503, "Configure EARTHDATA_TOKEN for MERRA-2/GLDAS, or Earthdata login credentials for AppEEARS products.")
        job = jobs.enqueue("earthdata_ingest", r["location_id"], spec.get("idem", ""), spec)
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
    return jobs.enqueue("ingest", r["location_id"], spec.get("idem", ""), spec)


@router.post("/{identifier}/train")
def train(identifier: str, payload: dict | None = None,
          x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _location(identifier)
    spec = _spec(payload)
    if not spec.get("dataset_id"):
        raise HTTPException(422, "dataset_id is required — training is bound to a frozen dataset.")
    _m = datasets.manifest(r["location_id"], spec["dataset_id"])
    if not _m:
        raise HTTPException(404, "Unknown dataset_id for this location.")
    if _m.get("spatial_mode", "point") != r.get("spatial_mode", "point"):
        raise HTTPException(
            422, f"This dataset is a {_m.get('spatial_mode', 'point')} series; "
                 "training needs a dataset matching this context's spatial scope.")
    var_name = spec.get("variable", "precip_24h")
    if var_name not in VARIABLES:
        raise HTTPException(422, f"Unknown target variable '{var_name}'.")
    return jobs.enqueue("train", r["location_id"], spec.get("idem", ""), spec)


@router.post("/{identifier}/predict")
def predict_now(identifier: str, target: str = "precip_24h"):
    r = _location(identifier)
    if target not in VARIABLES:
        raise HTTPException(422, f"Unknown target variable '{target}'.")
    records = workers.staged_records(r["location_id"])
    result = predict.predict(r["location_id"], records, target=target, location=r)
    return result


@router.get("/{identifier}/prediction")
def current_prediction(identifier: str, target: str = "precip_24h"):
    r = _location(identifier)
    if target not in VARIABLES:
        raise HTTPException(422, "Unknown target.")
    return predict.current(r["location_id"], target)


@router.get("/{identifier}/published")
def published_predictions(identifier: str):
    r = _location(identifier)
    runs = [predict.current(r["location_id"], target) for target in VARIABLES]
    return {"forecasts": [run for run in runs if run.get("state") == "available"]}


@router.post("/{identifier}/generate")
def generate(identifier: str, payload: dict | None = None,
             x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _location(identifier)
    spec = _spec(payload)
    target = spec.get("variable", "precip_24h")
    if target not in VARIABLES:
        raise HTTPException(422, "Unknown target.")
    source = VARIABLES[target]["sources"][0]
    pending = jobs.latest(r["location_id"], target, kind="pipeline")
    # BIND-01: reuse only a job bound to the same requested dataset/source —
    # a queued job for revision A must never serve a request for B.
    if (pending and pending["status"] in ("queued", "running")
            and spec.get("dataset_id")
            and (pending.get("spec") or {}).get("dataset_id") != spec["dataset_id"]):
        raise HTTPException(
            409, f"A pipeline job is already queued for a different dataset "
                 f"revision ({(pending.get('spec') or {}).get('dataset_id')}). "
                 "Wait for it or cancel it before generating from "
                 f"{spec['dataset_id']}.")
    if pending and pending["status"] in ("queued", "running"):
        return pending
    if not spec.get("dataset_id"):
        existing = predict.predict(r["location_id"], workers.staged_records(r["location_id"], source), target=target, location=r)
        if existing.get("state") == "available":
            return existing
        # A frozen local dataset is sufficient for training. Do not submit
        # another years-long extraction just to retry an existing dataset.
        revisions = [d for d in datasets.manifests(r["location_id"])
                     if d["source_id"] == source and target in d.get("variables", [])]
        if revisions:
            spec["dataset_id"] = revisions[-1]["dataset_id"]
    if not spec.get("dataset_id") and r.get("spatial_mode") == "area_mean" and source != power.SOURCE_ID:
        raise HTTPException(422, "Area contexts currently support the NASA POWER target only.")
    if not spec.get("dataset_id") and source in PRODUCTS and not _earthdata_configured(target):
        raise HTTPException(503, "Configure EARTHDATA_TOKEN for MERRA-2/GLDAS, or Earthdata login credentials for AppEEARS products.")
    if not spec.get("dataset_id") and source in sources.SOURCE_OPTIONS and not _credentials_state()["configured"]:
        raise HTTPException(503, "Meteomatics credentials are missing.")
    spec.setdefault("start", "2015-01-01T00:00:00+00:00")
    spec.update(variable=target, source_id=source)
    if spec.get("dataset_id"):
        manifest = datasets.manifest(r["location_id"], spec["dataset_id"])
        if not manifest:
            raise HTTPException(404, "Unknown dataset for this location.")
        if manifest["source_id"] != source or target not in manifest.get("variables", []):
            raise HTTPException(422, "Choose a dataset containing this target and source.")
        if manifest.get("spatial_mode", "point") != r.get("spatial_mode", "point"):
            raise HTTPException(
                422, f"This dataset is a {manifest.get('spatial_mode', 'point')} series; "
                     "generating needs a dataset matching this context's spatial scope.")
        spec["phase"] = "train"
    return jobs.enqueue("pipeline", r["location_id"], spec.get("idem", f"generate-{target}-{spec.get('dataset_id', 'history')}-{datetime.now(UTC):%Y%m%d}"), spec)


@router.get("/{identifier}/freshness")
def freshness_state(identifier: str, target: str = "precip_24h",
                    source_id: str | None = None):
    """Typed input freshness — real watermarks, never freshness by reissue."""
    r = _location(identifier)
    if target not in VARIABLES:
        raise HTTPException(422, "Unknown target.")
    source = source_id or VARIABLES[target]["sources"][0]
    if source not in VARIABLES[target]["sources"]:
        raise HTTPException(422, "This source is not eligible for the target.")
    if source == power.SOURCE_ID:
        configured, basis = True, power.CAPABILITY["availability_basis"]
    elif source in PRODUCTS:
        configured = _earthdata_configured(target)
        basis = (f"declared publication delay ~{PRODUCTS[source]['delay_days']}d "
                 "after interval end (not observed publication)")
    else:
        configured = _credentials_state()["configured"]
        basis = f"declared availability lag ~{int(sources.SOURCE_OPTIONS[source][1])}h"
    return updates.freshness(
        r, source, target,
        workers.staged_records(r["location_id"], source),
        datasets.manifests(r["location_id"]),
        availability_basis=basis, configured=configured)


@router.post("/{identifier}/update")
def update(identifier: str, payload: dict | None = None,
           x_iris_admin: str | None = Header(default=None)):
    """Incremental history update — overlap refetch + revision-aware merge.

    Distinct from reissuing a forecast on unchanged data and from retraining:
    an update only fetches/merges newer source records and freezes a new
    dataset revision when something actually changed.
    """
    _admin_guard(x_iris_admin)
    r = _location(identifier)
    spec = _spec(payload)
    target = spec.get("variable", "precip_24h")
    if target not in VARIABLES:
        raise HTTPException(422, "Unknown target.")
    source = spec.get("source_id") or VARIABLES[target]["sources"][0]
    if source not in VARIABLES[target]["sources"]:
        raise HTTPException(422, "This source is not eligible for the target — sources are never mixed.")
    spec.update(variable=target, source_id=source)
    if r.get("spatial_mode") == "area_mean" and source != power.SOURCE_ID:
        raise HTTPException(422, "Area updates are implemented for NASA POWER only in this phase.")
    if source == power.SOURCE_ID and target != "power_t2m":
        raise HTTPException(422, "NASA POWER serves the power_t2m target in this phase.")
    if source in sources.SOURCE_OPTIONS and not _credentials_state()["configured"]:
        raise HTTPException(503, "Meteomatics credentials are missing.")
    if source in PRODUCTS and not _earthdata_configured(target):
        raise HTTPException(503, "Configure EARTHDATA_TOKEN for MERRA-2/GLDAS, or Earthdata login credentials for AppEEARS products.")
    pending = jobs.latest(r["location_id"], target, kind="update")
    if pending and pending["status"] in ("queued", "running"):
        if (pending.get("spec") or {}).get("source_id", source) != source:
            raise HTTPException(
                409, "An update job is already queued for a different source "
                     "on this context; wait or cancel it first.")
        return pending
    return jobs.enqueue("update", r["location_id"],
                        spec.get("idem", f"update-{target}-{source}"), spec)


@router.post("/{identifier}/refresh")
def refresh(identifier: str, payload: dict | None = None,
            x_iris_admin: str | None = Header(default=None)):
    _admin_guard(x_iris_admin)
    r = _location(identifier)
    spec = _spec(payload)
    spec.setdefault("backfill_days", 14)  # refresh is incremental by default
    return jobs.enqueue("ingest", r["location_id"], spec.get("idem", f"refresh-{datetime.now(UTC):%Y%m%d}"), spec)
