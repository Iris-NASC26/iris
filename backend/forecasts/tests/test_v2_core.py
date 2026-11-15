"""v2 core tests — synthetic fixtures only; no weather-skill claims."""
from datetime import datetime, timedelta, timezone

import pytest

from forecasts.v2 import features, jobs, qa
from forecasts.v2.schemas import QuantilePrediction, ForecastRun


def hourly(day: str, n: int = 24, value: float = 0.0, **kw):
    start = datetime.fromisoformat(day).replace(tzinfo=timezone.utc)
    return [{"variable": "precip_1h", "unit": "mm",
             "interval_start": (start + timedelta(hours=i)).isoformat(),
             "interval_end": (start + timedelta(hours=i + 1)).isoformat(),
             "value": value, **kw} for i in range(n)]


def test_sentinels_quarantined_and_zero_rain_survives():
    raw = hourly("2024-01-01", 24, 0.0)
    raw[3]["value"], raw[7]["value"] = -999, -888  # sentinels
    valid, quarantined = qa.normalize(raw, "colombo", "ecmwf-era5")
    assert len(valid) == 22 and len(quarantined) == 2
    assert {q["reason"] for q in quarantined} == {"sentinel:-999", "sentinel:-888"}
    assert sum(r.value for r in valid) == 0.0  # real dry day, not missing


def test_duplicates_negative_and_bad_intervals_rejected():
    raw = hourly("2024-01-01", 2, 1.0)
    raw.append(dict(raw[0], value=-2.0))          # negative precip
    raw.append(dict(raw[1], interval_end=raw[1]["interval_start"]))  # zero-length
    raw.append(dict(raw[0]))                       # duplicate
    valid, quarantined = qa.normalize(raw, "colombo", "mix-obs")
    assert len(valid) == 2 and len(quarantined) == 3


def test_incomplete_target_window_returns_none_not_scaled():
    recs, _ = qa.normalize(hourly("2024-01-01", 12, 2.0), "c", "s")  # only 12h
    assert qa.daily_sum(recs, "2024-01-01T00:00:00+00:00") is None
    recs24, _ = qa.normalize(hourly("2024-01-01", 24, 2.0), "c", "s")
    assert qa.daily_sum(recs24, "2024-01-01T00:00:00+00:00") == 48.0


def test_late_available_record_is_excluded_from_features():
    # Record observed in the past but only published AFTER the issue time.
    recs, _ = qa.normalize(hourly("2024-01-05", 24, 9.0), "c", "s")
    for r in recs: r.available_at = "2024-01-10T00:00:00+00:00"
    usable = qa.available_by(recs, "2024-01-08T00:00:00+00:00")
    assert usable == []  # leakage record excluded
    assert qa.available_by(recs, "2024-01-11T00:00:00+00:00") == recs


def test_conservative_lag_blocks_finalized_reanalysis_masquerade():
    # Final ERA5 arrives ~3 months later; an operational feature must not use
    # a record with unknown availability as if instantly available.
    recs, _ = qa.normalize(hourly("2024-01-05", 24, 4.0), "c", "s")
    assert qa.available_by(recs, "2024-01-06T00:00:00+00:00", conservative_lag_hours=24 * 90) == []
    assert len(qa.available_by(recs, "2024-05-01T00:00:00+00:00", conservative_lag_hours=24 * 90)) == 24


def test_feature_row_and_target_window():
    recs, _ = qa.normalize(hourly("2024-01-01", 24, 0.5) + hourly("2024-01-02", 24, 1.0)
                           + hourly("2024-01-03", 24, 0.0) + hourly("2024-01-04", 24, 3.0)
                           + hourly("2024-01-05", 24, 2.0) + hourly("2024-01-06", 24, 1.0)
                           + hourly("2024-01-07", 24, 0.0) + hourly("2024-01-08", 24, 5.0)
                           + hourly("2024-01-09", 24, 1.0), "colombo", "s")
    feat = features.build_features(recs, "2024-01-09T00:00:00+00:00")
    assert feat and feat["precip_lag_1d"] == 120.0 and feat["precip_lag_7d"] == 24.0
    start, end, total = features.target_sum(recs, "2024-01-09T00:00:00+00:00", 0)
    assert total == 24.0 and start < end


def test_folds_embargo_separates_origins():
    dates = [datetime(2024, 1, 1, tzinfo=timezone.utc) + timedelta(days=i) for i in range(60)]
    fs = features.folds([d.isoformat() for d in dates], [dates[30].isoformat(), dates[59].isoformat()], embargo_hours=168)
    assert fs and all(datetime.fromisoformat(d) < dates[30] - timedelta(hours=168) for d in fs[0]["train"])


def test_baselines_and_metrics():
    recs, _ = qa.normalize(hourly("2024-01-01", 24, 2.0) + hourly("2024-01-02", 24, 4.0), "c", "s")
    assert features.persistence(recs, "2024-01-03T00:00:00+00:00") == 96.0
    ev = features.evaluate([1, 2, 3], [1, 2, 9])
    assert ev["n"] == 3 and ev["mae"] == 2.0 and ev["bias"] == -2.0
    assert features.pinball([2.0], [4.0], 0.9) == pytest.approx(1.8)
    assert features.coverage([0], [5], [3]) == 1.0


def test_quantiles_ordered_and_nonnegative():
    with pytest.raises(ValueError):
        QuantilePrediction(window_start="a", window_end="b", lead_hours=0, q10=5, q50=2, q90=9)
    with pytest.raises(ValueError):
        QuantilePrediction(window_start="a", window_end="b", lead_hours=0, q10=-1, q50=2, q90=9)
    ok = QuantilePrediction(window_start="a", window_end="b", lead_hours=24, q10=0, q50=2, q90=9)
    assert ok.q90 == 9


def test_jobs_idempotent_cancel_and_crash_recovery(tmp_path, monkeypatch):
    monkeypatch.setattr(jobs, "DB_PATH", tmp_path / "v2.sqlite3")
    j1 = jobs.enqueue("ingest", "colombo", idem="k1")
    j2 = jobs.enqueue("ingest", "colombo", idem="k1")
    assert j1["job_id"] == j2["job_id"]  # duplicate enqueue returns live job
    jobs.begin(j1["job_id"])
    jobs.advance(j1["job_id"], 0.5, {"chunk": 3})
    assert jobs.get(j1["job_id"])["checkpoint"] == {"chunk": 3}
    # Simulate a restart: resetting the once-per-process recovery flag makes
    # the next connection fail the orphaned 'running' row.
    assert jobs.get(j1["job_id"])["status"] == "running"
    jobs._recovered = False
    assert jobs.get(j1["job_id"])["status"] == "failed"
    j3 = jobs.enqueue("train", "colombo", idem="k2")
    assert jobs.cancel(j3["job_id"])["status"] == "cancelled"


def test_forecast_run_contract_bounds():
    run = ForecastRun(run_id="r1", model_id="m1", model_hash="h", dataset_revision="d",
                      issued_at="2024-01-01T00:00:00Z", input_cutoff="2023-12-31T00:00:00Z",
                      valid_until="2024-01-04T00:00:00Z", uncertainty_method="quantile",
                      predictions=[QuantilePrediction(window_start="a", window_end="b", lead_hours=0, q10=0, q50=1, q90=2)])
    assert run.schema_version == "iris.ml-forecast.v2"
    with pytest.raises(Exception):
        ForecastRun(run_id="r2", model_id="m", model_hash="h", dataset_revision="d",
                    issued_at="x", input_cutoff="y", valid_until="z", uncertainty_method="q",
                    predictions=[])  # empty predictions forbidden — no fake ensemble
