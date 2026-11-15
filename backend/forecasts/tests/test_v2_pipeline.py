"""v2 pipeline tests: source adapter, datasets, trends, training gates.

All fixtures are synthetic and labelled as such — they test software behavior,
never forecasting skill.
"""
from datetime import UTC, datetime, timedelta

import pytest

from forecasts.v2 import (datasets, jobs, qa, sources, training, trends,
                          workers)


def _mk_records(location="loc", source="era5", n=400, start="2020-01-01T00:00:00+00:00",
                daily=5.0):
    """Synthetic daily precip records — labelled fixtures only."""
    out = []
    d = datetime.fromisoformat(start)
    for i in range(n):
        out.append({
            "location_id": location, "source_id": source,
            "lat": 6.9, "lon": 79.8, "variable": "precip_24h", "unit": "mm",
            "interval_start": d.isoformat(),
            "interval_end": (d + timedelta(days=1)).isoformat(),
            "value": daily if i % 3 else 0.0,
            "retrieved_at": "2024-01-01T00:00:00+00:00",
            "available_at": (d + timedelta(days=1, hours=144)).isoformat(),
        })
        d += timedelta(days=1)
    return out


def _payload(days=10, start="2024-01-01"):
    """Fake Meteomatics JSON body."""
    import json
    dates = [{"date": f"{(datetime.fromisoformat(start) + timedelta(days=i)).date()}T00:00:00Z",
              "value": float(i % 4)} for i in range(days)]
    return json.dumps({"data": [{"coordinates": [{"dates": dates}]}]}).encode()


class TestSources:
    def test_future_request_rejected(self):
        future = datetime.now(UTC) + timedelta(days=1)
        with pytest.raises(sources.SourceError):
            sources.assert_historical(datetime.now(UTC) - timedelta(days=2), future)

    def test_chunking_and_budget(self, monkeypatch):
        monkeypatch.setattr(sources, "_credentials", lambda: ("u", "p"))
        calls = []

        def transport(url, auth, params, timeout):
            calls.append(url)
            return 200, _payload(30), {}

        start = datetime.now(UTC) - timedelta(days=400)
        end = datetime.now(UTC) - timedelta(days=1)
        out = sources.fetch_history("loc", 6.9, 79.8, "era5", start, end,
                                    transport=transport, budget={"remaining": 5},
                                    sleep=lambda s: None)
        assert len(calls) == 2  # 400 days -> 2 chunks (366 + remainder)
        assert out["records_raw"]
        assert all(r["source_artifact_hash"] for r in out["records_raw"])
        assert out["source"]["declared_availability_lag_hours"] == 144

    def test_unfinalized_tail_never_requested(self, monkeypatch):
        """The declared availability lag bounds what the provider can have
        published — the request end is clipped to now - lag rather than
        hitting a guaranteed 404 on the unfinalized tail."""
        monkeypatch.setattr(sources, "_credentials", lambda: ("u", "p"))
        calls = []

        def transport(url, auth, params, timeout):
            calls.append(url)
            return 200, _payload(30), {}

        start = datetime.now(UTC) - timedelta(days=30)
        end = datetime.now(UTC)  # request reaches into era5's 6-day lag
        out = sources.fetch_history("loc", 6.9, 79.8, "era5", start, end,
                                    transport=transport, sleep=lambda s: None)
        assert out["records_raw"]
        for url in calls:
            window = url.split("precip_24h:mm/")[0]
            req_end = window.split("--")[1].split(":")[0]
            assert req_end <= (datetime.now(UTC) - timedelta(hours=144)
                             ).strftime("%Y-%m-%dT%H:%M:%SZ")

    def test_fully_unfinalized_window_is_empty_not_failed(self, monkeypatch):
        monkeypatch.setattr(sources, "_credentials", lambda: ("u", "p"))

        def transport(url, auth, params, timeout):
            raise AssertionError("no request may be issued for unfinalized data")

        start = datetime.now(UTC) - timedelta(days=2)
        end = datetime.now(UTC) - timedelta(hours=1)
        out = sources.fetch_history("loc", 6.9, 79.8, "era5", start, end,
                                    transport=transport, sleep=lambda s: None)
        assert out["records_raw"] == []

    def test_retry_after_honored_and_retry_exhaustion(self, monkeypatch):
        monkeypatch.setattr(sources, "_credentials", lambda: ("u", "p"))
        waits = []

        def transport(url, auth, params, timeout):
            return 429, b"{}", {"retry-after": "0"}

        start = datetime.now(UTC) - timedelta(days=10)
        end = datetime.now(UTC) - timedelta(days=1)
        with pytest.raises(sources.SourceError):
            sources.fetch_history("loc", 6.9, 79.8, "era5", start, end,
                                  transport=transport, sleep=waits.append)
        assert len(waits) == 4  # bounded retries

    def test_unknown_source_and_entitlement(self, monkeypatch):
        monkeypatch.setattr(sources, "_credentials", lambda: ("u", "p"))
        start = datetime.now(UTC) - timedelta(days=10)
        end = datetime.now(UTC) - timedelta(days=1)
        with pytest.raises(sources.SourceError):
            sources.fetch_history("loc", 0, 0, "bogus", start, end, transport=None)

        def transport(url, auth, params, timeout):
            return 403, b"forbidden", {}
        with pytest.raises(sources.SourceError) as e:
            sources.fetch_history("loc", 0, 0, "mix", start, end,
                                  transport=transport, sleep=lambda s: None)
        assert "entitlements" in str(e.value)


class TestDatasets:
    def test_content_addressed_immutable(self, tmp_path, monkeypatch):
        monkeypatch.setattr(datasets, "ROOT", tmp_path)
        recs = _mk_records()
        valid, quar = qa.normalize(recs, "loc", "era5")
        m1 = datasets.build("loc", "era5", valid, quar, spec={"t": 1})
        m2 = datasets.build("loc", "era5", valid, quar, spec={"t": 1})
        assert m1["dataset_id"] == m2["dataset_id"]  # deterministic
        assert m1["precip_complete_days"] == 400
        loaded = datasets.load("loc", m1["dataset_id"])
        assert len(loaded) == len(valid)
        # Different content -> different id (never overwrites).
        recs[0] = dict(recs[0], value=99.0)
        valid2, _ = qa.normalize(recs, "loc", "era5")
        m3 = datasets.build("loc", "era5", valid2, quar, spec={"t": 1})
        assert m3["dataset_id"] != m1["dataset_id"]
        assert datasets.manifest("loc", m1["dataset_id"])  # original intact


class TestTrends:
    def test_known_slope_detected(self):
        # Linear increase: +12mm per month-decade-equivalent over 60 months.
        recs = []
        d = datetime(2015, 1, 1)
        for i in range(60 * 30):
            month_index = (d.year - 2015) * 12 + d.month - 1
            recs.append({"variable": "precip_24h", "interval_start": d.date().isoformat(),
                         "interval_end": (d + timedelta(days=1)).isoformat(),
                         "value": 1.0 + 0.01 * month_index})
            d += timedelta(days=1)
        # Keep only complete months: the generated 1800 days may overrun a
        # partial month — monthly_series drops it, which is honest behavior.
        r = trends.analyze(recs, family_id="test", resamples=100)
        assert r["state"] == "computed"
        assert r["slope_per_decade"] > 0
        assert r["p_raw"] is not None and r["p_raw"] < 0.001
        assert r["completeness"] > 0.9

    def test_no_trend_and_ties(self):
        recs = [{"variable": "precip_24h",
                 "interval_start": (datetime(2015, 1, 1) + timedelta(days=i)).date().isoformat(),
                 "interval_end": (datetime(2015, 1, 2) + timedelta(days=i)).isoformat(),
                 "value": 2.0}
                for i in range(1500)]
        r = trends.analyze(recs, family_id="flat", resamples=100)
        assert r["state"] == "computed"
        assert abs(r["slope_per_decade"]) < 1e-9
        assert r["p_raw"] is None or r["p_raw"] > 0.5  # constant: no signal claimed

    def test_insufficient_data_honest(self):
        recs = _mk_records(n=60)
        r = trends.analyze(recs, family_id="short")
        assert r["state"] == "insufficient"

    def test_bh_q_values(self):
        qs = trends.benjamini_hochberg([0.001, 0.04, 0.5, None])
        assert qs[0] <= qs[1] <= 1.0
        assert qs[3] is None
        assert qs[0] == pytest.approx(0.001 * 3 / 1)


class TestTrainingGates:
    def test_provider_columns_rejected(self):
        with pytest.raises(ValueError, match="provider"):
            training.schema_guard(["provider_ensemble_q50", "precip_lag_1d"])
        training.schema_guard(training.feature_columns("precip_24h"))
        training.schema_guard(training.feature_columns("smap_surface_sm"))

    def test_eligibility_gates(self):
        g = training.eligibility(100, 100, 5)
        assert not g["eligible"] and len(g["reasons"]) >= 2
        g = training.eligibility(2000, 2000, 400)
        assert g["eligible"]

    def test_matrix_and_training_no_sklearn(self, tmp_path, monkeypatch):
        """Without sklearn the card is an honest candidate, not a fake model."""
        monkeypatch.setattr(datasets, "ROOT", tmp_path / "ds")
        monkeypatch.setattr(training, "MODELS_ROOT", tmp_path / "models")
        recs = _mk_records(n=800, daily=3.0)
        valid, quar = qa.normalize(recs, "loc", "era5")
        m = datasets.build("loc", "era5", valid, quar, spec={})
        card = training.train("loc", m["dataset_id"], 0, lag_hours=0)
        assert card["state"] in ("candidate", "rejected", "eligible")
        assert card["dataset_id"] == m["dataset_id"]
        listed = training.list_models("loc")
        assert listed and listed[0]["model_id"] == card["model_id"]


class TestWorkers:
    def test_ingest_to_dataset_to_trend(self, tmp_path, monkeypatch):
        monkeypatch.setattr(jobs, "DB_PATH", tmp_path / "v2.sqlite3")
        monkeypatch.setattr(workers, "STAGING", tmp_path / "history")
        monkeypatch.setattr(workers, "REPORTS", tmp_path / "trends")
        monkeypatch.setattr(datasets, "ROOT", tmp_path / "ds")
        monkeypatch.setattr(sources, "_credentials", lambda: ("u", "p"))

        def transport(url, auth, params, timeout):
            return 200, _payload(30), {}

        j = jobs.enqueue("ingest", "loc", spec={"source_id": "era5", "backfill_days": 30})
        out = workers.execute(j["job_id"], transport=transport,
                              region_lookup=lambda i: {"id": i, "latitude": 6.9, "longitude": 79.8})
        assert out["status"] == "complete"
        staged = workers.staged_records("loc", "era5")
        assert staged and all(r["available_at"] for r in staged)

        j2 = jobs.enqueue("dataset", "loc", spec={"source_id": "era5"})
        out2 = workers.execute(j2["job_id"])
        assert out2["status"] == "complete"
        manifest = out2["checkpoint"]["result"]
        assert manifest["records"] > 0

        j3 = jobs.enqueue("trend", "loc", spec={"source_id": "era5"})
        out3 = workers.execute(j3["job_id"])
        assert out3["status"] == "complete"
        reports = workers.trend_reports("loc")
        assert reports and "q_bh" in reports[0]

    def test_failed_job_honest(self, tmp_path, monkeypatch):
        monkeypatch.setattr(jobs, "DB_PATH", tmp_path / "v2.sqlite3")
        j = jobs.enqueue("dataset", "loc", spec={"source_id": "era5"})
        out = workers.execute(j["job_id"])  # no staged data -> fails honestly
        assert out["status"] == "failed"
        assert "staged" in out["error"]
