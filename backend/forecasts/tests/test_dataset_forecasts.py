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
from forecasts.v2 import gic


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
