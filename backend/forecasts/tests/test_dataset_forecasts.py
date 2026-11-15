"""Dataset-to-forecast regressions. All scientific values here are test-only."""
import csv
import io
import json
import math
import pickle
from datetime import UTC, datetime, timedelta

import pytest

from forecasts.v2 import appeears, datasets, fitting, jobs, predict, qa, training, workers
from forecasts.v2.schemas import ModelCard
from forecasts.v2 import gic, router as api


def test_appeears_resumes_same_remote_task_and_never_double_scales():
    science, flag = appeears.LAYERS["modis_ndvi"]
    raw = f"Date,MOD13Q1_061_{science},MOD13Q1_061_{flag}\n2024001,0.52,0\n2024017,0.99,3\n".encode()
    calls = []
    done = False

    def api(method, path, payload=None, binary=False):
        calls.append((method, path))
        if path.startswith("/product/"):
            return {science: {}, flag: {}}
        if path == "/task":
            return {"task_id": "remote-id"}
        if path == "/task/remote-id":
            return {"status": "done" if done else "pending"}
        if path == "/bundle/remote-id":
            return {"files": [{"file_id": "csv", "file_name": "test-results.csv", "file_type": "csv"}]}
        return raw

    start, end = datetime(2024, 1, 1, tzinfo=UTC), datetime(2024, 2, 10, tzinfo=UTC)
    pending = appeears.extract("modis_ndvi", 6.9, 79.8, start, end, api=api)
    assert pending["pending"]
    done = True
    result = appeears.extract("modis_ndvi", 6.9, 79.8, start, end, checkpoint=pending["next_checkpoint"], api=api)
    assert calls.count(("POST", "/task")) == 1
    assert result["records_raw"][0]["value"] == .52
    assert result["records_raw"][1]["value"] is None  # QA failure never becomes rainfall zero.


def test_jobs_claim_once_preserve_request_and_allow_distinct_unkeyed_jobs(tmp_path, monkeypatch):
    monkeypatch.setattr(jobs, "DB_PATH", tmp_path / "jobs.sqlite")
    first = jobs.enqueue("pipeline", "colombo", spec={"variable": "modis_ndvi"})
    second = jobs.enqueue("pipeline", "colombo", spec={"variable": "smap_surface_sm"})
    assert first["job_id"] != second["job_id"]
    assert jobs.begin(first["job_id"])
    assert not jobs.begin(first["job_id"])
    jobs.defer(first["job_id"], {"ingest_checkpoint": {"task_id": "remote"}})
    checkpoint = jobs.get(first["job_id"])["checkpoint"]
    assert checkpoint["variable"] == "modis_ndvi"
    assert checkpoint["ingest_checkpoint"]["task_id"] == "remote"
    assert jobs.cancel(first["job_id"])["status"] == "cancelled"
    assert not jobs.begin(first["job_id"])


def test_native_features_isolate_source_and_availability():
    start = datetime(2024, 1, 1, tzinfo=UTC)
    records = [{"source_id": "source", "variable": "smap_surface_sm", "value": .1 + i / 100,
                "interval_start": (start + timedelta(days=i)).isoformat(),
                "interval_end": (start + timedelta(days=i + 1)).isoformat(),
                "available_at": (start + timedelta(days=i + 4)).isoformat()}
               for i in range(15)]
    records += [{**records[-1], "source_id": "other", "value": .65}]
    h = fitting.History(records, "smap_surface_sm", "source", 72)
    feat = h.feature(start + timedelta(days=10), 0)
    assert feat["recent_1"] == pytest.approx(.16)
    assert feat["input_age_days"] == 3
    assert all(r["available"] <= start + timedelta(days=10) for r in h.inputs(start + timedelta(days=10)))


def test_nasa_point_series_checks_source_units_and_complete_days():
    header = ("prod_name,M2T1NXSLV.5.12.4\nparam_short_name,T2M\nunit,K\nundef,1e+15\n"
              "lat,7.0\nlon,80.0\nlat_resolution,0.5\nlon_resolution,0.625\n\nTimestamp (UTC),Data\n")
    values = "".join(f"2020-01-01 {hour:02d}:30,300\n" for hour in range(24))
    rows = gic.parse((header + values).encode(), "merra2_t2m", 6.9355, 79.8487)
    assert len(rows) == 1 and rows[0]["value"] == 300
    assert rows[0]["interval_start"] == "2020-01-01T00:00:00+00:00"
    assert rows[0]["available_at"] >= "2020-02-26"
    partial = gic.parse((header + values.replace("2020-01-01 05:30,300\n", "")).encode(), "merra2_t2m", 6.9355, 79.8487)
    assert partial[0]["value"] is None
    with pytest.raises(ValueError, match="units"):
        gic.parse((header.replace("unit,K", "unit,C") + values).encode(), "merra2_t2m", 6.9355, 79.8487)


def test_composite_targets_start_at_next_whole_native_period():
    issue = datetime(2024, 12, 29, tzinfo=UTC)
    start, end = fitting.window(issue, 0, "modis_ndvi")
    assert start == datetime(2025, 1, 1, tzinfo=UTC)
    assert end == datetime(2025, 1, 17, tzinfo=UTC)
    start, end = fitting.window(datetime(2024, 12, 25, tzinfo=UTC), 0, "modis_et")
    assert (end - start).days == 6  # leap-year terminal composite, not a fictional 16 days.


def test_activation_does_not_retire_another_target(tmp_path, monkeypatch):
    monkeypatch.setattr(training, "MODELS_ROOT", tmp_path)
    for mid, target in (("m-soil", "smap_surface_sm"), ("m-temp", "merra2_t2m")):
        blob = pickle.dumps({"variable": target})
        import hashlib
        card = ModelCard(model_id=mid, location_id="colombo", horizon_index=0, state="eligible",
                         metrics={"target": target, "model_sha256": hashlib.sha256(blob).hexdigest()})
        training._persist(card, blob)
        training.activate("colombo", mid)
    assert {m["state"] for m in training.list_models("colombo")} == {"active"}
    (tmp_path / "colombo" / "m-soil" / "model.pkl").write_bytes(b"tampered")
    assert training.load_verified("colombo", "m-soil") is None


def test_real_estimator_dataset_to_calibrated_forecast(tmp_path, monkeypatch):
    """Exercise actual sklearn fitting/inference; this establishes no weather skill."""
    monkeypatch.setattr(datasets, "ROOT", tmp_path / "datasets")
    monkeypatch.setattr(training, "MODELS_ROOT", tmp_path / "models")
    monkeypatch.setattr(predict, "RUNS_ROOT", tmp_path / "runs")
    start = datetime(2016, 1, 1, tzinfo=UTC)
    records = []
    for i in range(2400):
        day = start + timedelta(days=i)
        records.append({"variable": "smap_surface_sm", "unit": "m3/m3", "lat": 7.0, "lon": 80.0,
                        "interval_start": day.isoformat(), "interval_end": (day + timedelta(days=1)).isoformat(),
                        "available_at": (day + timedelta(days=2)).isoformat(),
                        "value": .3 + .1 * math.sin(i * .4) + .025 * math.cos(i * .11)})
    valid, rejected = qa.normalize(records, "colombo", "SPL3SMP_E.006")
    manifest = datasets.build("colombo", "SPL3SMP_E.006", valid, rejected, spec={})
    card = training.train("colombo", manifest["dataset_id"], 0, lag_hours=24, variable="smap_surface_sm")
    assert card["metrics"]["n_calibration"] > 45
    assert card["metrics"]["n_eval"] > 45
    assert card["metrics"]["model_sha256"]
    assert card["state"] == "eligible", card
    training.activate("colombo", card["model_id"])
    issue = start + timedelta(days=2400)
    run = predict.predict("colombo", [vars(r) for r in valid], issue.isoformat(), "smap_surface_sm")
    assert run["state"] == "available"
    assert run["target"] == "smap_surface_sm"
    assert run["model_hash"] == card["metrics"]["model_sha256"]
    assert run["dataset_revision"] == manifest["content_sha256"]
    assert run["input_age_hours"] >= 24
    assert run["predictions"][0]["window_start"] >= run["issued_at"]
    assert predict.get_run("colombo", run["run_id"])["predictions"] == run["predictions"]


def test_worker_yields_remote_wait_without_losing_original_spec(tmp_path, monkeypatch):
    monkeypatch.setattr(jobs, "DB_PATH", tmp_path / "jobs.sqlite")
    monkeypatch.setattr(workers.earthdata, "fetch_series", lambda *a, **kw: {
        "pending": True, "next_checkpoint": {"task_id": "retained"}, "message": "NASA is processing"})
    job = jobs.enqueue("pipeline", "colombo", spec={"variable": "modis_ndvi", "start": "2015-01-01T00:00:00+00:00"})
    result = workers.execute(job["job_id"])
    assert result["status"] == "queued"
    assert result["checkpoint"]["variable"] == "modis_ndvi"
    assert result["checkpoint"]["ingest_checkpoint"]["task_id"] == "retained"


def test_generate_reuses_frozen_dataset_without_remote_credentials(tmp_path, monkeypatch):
    monkeypatch.delenv("IRIS_ML_ADMIN_TOKEN", raising=False)
    monkeypatch.setattr(jobs, "DB_PATH", tmp_path / "jobs.sqlite")
    monkeypatch.setattr(predict, "predict", lambda *a, **kw: {"state": "unavailable"})
    monkeypatch.setattr(workers, "staged_records", lambda *a: [])
    monkeypatch.setattr(appeears, "configured", lambda: False)
    manifest = {"dataset_id": "ds-" + "1" * 16, "variables": ["gldas_sm"], "source_id": "GLDAS_NOAH025_3H.2.1"}
    monkeypatch.setattr(datasets, "manifests", lambda loc: [manifest])
    monkeypatch.setattr(datasets, "manifest", lambda *a: manifest)
    job = api.generate("colombo", {"variable": "gldas_sm"}, None)
    assert job["checkpoint"]["phase"] == "train"
    assert job["checkpoint"]["dataset_id"] == manifest["dataset_id"]
    # A newer non-pipeline action must not hide a pending extraction/training.
    jobs.enqueue("trend", "colombo", spec={"variable": "gldas_sm"})
    assert api.generate("colombo", {"variable": "gldas_sm"}, None)["job_id"] == job["job_id"]


def test_generate_keys_include_requested_dataset_revision(tmp_path, monkeypatch):
    monkeypatch.delenv("IRIS_ML_ADMIN_TOKEN", raising=False)
    monkeypatch.setattr(jobs, "DB_PATH", tmp_path / "jobs.sqlite")
    monkeypatch.setattr(datasets, "manifest", lambda loc, ds: {
        "source_id": "GLDAS_NOAH025_3H.2.1", "variables": ["gldas_sm"]})
    first = api.generate("colombo", {"variable": "gldas_sm", "dataset_id": "ds-" + "1" * 16}, None)
    jobs.begin(first["job_id"])
    jobs.finish(first["job_id"], True)
    second = api.generate("colombo", {"variable": "gldas_sm", "dataset_id": "ds-" + "2" * 16}, None)
    assert first["job_id"] != second["job_id"]


def test_published_forecasts_do_not_run_training_or_inference(monkeypatch):
    monkeypatch.setattr(predict, "current", lambda loc, target: {
        "state": "available" if target == "merra2_t2m" else "unavailable", "target": target})
    monkeypatch.setattr(predict, "predict", lambda *a, **kw: pytest.fail("read must not predict"))
    assert api.published_predictions("colombo")["forecasts"] == [{"state": "available", "target": "merra2_t2m"}]


def test_saved_forecast_expiry_is_computed_without_mutating_artifact(tmp_path, monkeypatch):
    monkeypatch.setattr(predict, "RUNS_ROOT", tmp_path)
    folder = tmp_path / "colombo"
    folder.mkdir()
    run_id = "run-" + "a" * 16
    path = folder / f"{run_id}.json"
    raw = json.dumps({"run_id": run_id, "valid_until": "2020-01-01T00:00:00+00:00"})
    path.write_text(raw)
    assert predict.get_run("colombo", run_id)["stale"] is True
    assert path.read_text() == raw


@pytest.fixture
def rejected_candidate(tmp_path, monkeypatch):
    """Isolated deterministic fixture, never a claim of actual forecast skill."""
    import numpy as np
    from sklearn.dummy import DummyRegressor
    monkeypatch.setattr(training, "MODELS_ROOT", tmp_path / "models")
    monkeypatch.setattr(predict, "RUNS_ROOT", tmp_path / "runs")
    metrics = {"target": "smap_surface_sm", "engine_version": fitting.VERSION,
               "model_mae": 2.7, "baseline_mae": 2.5, "n_eval": 100, "coverage_80": .7}
    models = {key: DummyRegressor(strategy="constant", constant=value).fit(np.zeros((2, 1)), np.zeros(2))
              for key, value in (("q10", .2), ("median", .3), ("q90", .4))}
    bundle = {"engine_version": fitting.VERSION, "models": models, "feature_columns": ["recent_1"],
              "source_id": "SPL3SMP_E.006", "variable": "smap_surface_sm", "lag_hours": 24,
              "max_input_age_days": 10, "dataset_id": "ds-" + "a" * 16,
              "dataset_hash": "a" * 64, "evaluation": metrics}
    blob = pickle.dumps(bundle)
    import hashlib
    card = ModelCard(model_id="m-preview-h0", location_id="colombo", horizon_index=0, state="rejected",
                     trained_at="2024-01-01T00:00:00+00:00",
                     metrics={**metrics, "model_sha256": hashlib.sha256(blob).hexdigest()},
                     eligibility_reasons=["Model did not beat the seasonal baseline."])
    training._persist(card, blob)
    start = datetime(2024, 1, 1, tzinfo=UTC)
    records = [{"source_id": "SPL3SMP_E.006", "variable": "smap_surface_sm", "value": .3,
                "interval_start": (start + timedelta(days=i)).isoformat(),
                "interval_end": (start + timedelta(days=i + 1)).isoformat(),
                "available_at": (start + timedelta(days=i + 2)).isoformat()} for i in range(30)]
    return card, records, start + timedelta(days=30)


def test_rejected_model_has_explicit_preview_errors_without_activation(rejected_candidate):
    card, records, issue = rejected_candidate
    assert training.load_verified("colombo", card.model_id) is None
    with pytest.raises(ValueError, match="eligible"):
        training.activate("colombo", card.model_id)
    run = predict.predict("colombo", records, issue.isoformat(), "smap_surface_sm")
    assert run["state"] == "available"
    assert run["scope"] == run["quality_status"] == "experimental_preview"
    window = run["predictions"][0]
    assert window["error_vs_baseline_pct"] == pytest.approx(8.0)
    assert window["quality_reasons"] == card.eligibility_reasons
    assert window["evaluation"]["model_mae"] == 2.7
    assert training.list_models("colombo")[0]["state"] == "rejected"
    assert predict.get_run("colombo", run["run_id"])["quality_status"] == "experimental_preview"


def test_preview_still_rejects_corrupt_artifacts_stale_inputs_and_missing_data(rejected_candidate):
    card, records, issue = rejected_candidate
    assert predict.predict("colombo", [], issue.isoformat(), "smap_surface_sm")["state"] == "unavailable"
    stale = predict.predict("colombo", records, (issue + timedelta(days=100)).isoformat(), "smap_surface_sm")
    assert stale["state"] == "unavailable"
    (training.MODELS_ROOT / "colombo" / card.model_id / "model.pkl").write_bytes(b"corrupt")
    assert predict.predict("colombo", records, issue.isoformat(), "smap_surface_sm")["state"] == "unavailable"


def test_active_model_is_preferred_over_rejected_preview(rejected_candidate, monkeypatch):
    card, records, issue = rejected_candidate
    loaded = training.load_verified("colombo", card.model_id, allow_rejected=True)
    loaded["entry"]["state"] = "active"
    loaded["model_id"] = "m-active-h0"
    monkeypatch.setattr(predict, "_active_model", lambda loc, h, target: loaded if h == 0 else None)
    run = predict.predict("colombo", records, issue.isoformat(), "smap_surface_sm")
    assert run["quality_status"] == "passed_checks"
    assert run["predictions"][0]["model_id"] == "m-active-h0"


def test_env_token_overrides_cached_login_and_reloads_file(tmp_path, monkeypatch):
    import config
    env = tmp_path / ".env"
    monkeypatch.setattr(config, "_ENV_PATH", env)
    monkeypatch.setenv("EARTHDATA_TOKEN", "")
    monkeypatch.setattr(gic, "_token", "test-only-previous-login-token")
    monkeypatch.setattr(gic, "login_configured", lambda: False)

    class NoLogin:
        def post(self, *a, **kw):
            pytest.fail("A supplied bearer token must not call the login API")

    for value in ("test-only-env-token-a", "test-only-env-token-b"):
        env.write_text(f'EARTHDATA_TOKEN=" {value} "\n')
        assert gic.configured()
        assert gic.token(NoLogin()) == value


@pytest.mark.parametrize("status", [401, 403])
def test_rejected_env_token_reports_variable_without_exposing_secret(monkeypatch, status):
    import httpx
    monkeypatch.setattr(gic, "get_earthdata_token", lambda: "test-only-env-token")

    class Denied:
        status_code = status
        def __enter__(self): return self
        def __exit__(self, *args): pass

    class Client:
        def __init__(self, **kw): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def stream(self, method, url, headers):
            assert headers["Authorization"] == "Bearer test-only-env-token"
            return Denied()
        def post(self, *a, **kw):
            pytest.fail("Invalid configured tokens must not silently switch to another account")

    monkeypatch.setattr(httpx, "Client", Client)
    with pytest.raises(RuntimeError, match="EARTHDATA_TOKEN") as error:
        gic.extract("merra2_t2m", 7, 80, datetime(2024, 1, 1, tzinfo=UTC), datetime(2024, 1, 2, tzinfo=UTC))
    assert "test-only-env-token" not in str(error.value)


def test_token_only_credentials_are_accepted_for_giovanni_not_appeears(monkeypatch):
    monkeypatch.setattr(gic, "configured", lambda: True)
    monkeypatch.setattr(appeears, "configured", lambda: False)
    assert api._earthdata_configured("merra2_t2m")
    assert api._earthdata_configured("gldas_sm")
    assert not api._earthdata_configured("smap_surface_sm")
