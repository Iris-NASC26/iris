"""Multi-variable v2 tests: target-specific QA, Earthdata adapter, composite
availability, generic features/targets, per-target training gates, trend
aggregation. Fixtures are synthetic — they test software behavior only."""
from datetime import UTC, datetime, timedelta

import pytest

from forecasts.v2 import (datasets, earthdata, features, jobs, qa, trends,
                          workers)
from forecasts.v2.variables import VARIABLES, PRODUCTS, check_value


def _rec(var, start, days, value, available_at=None, source="SPL3SMP_E.006"):
    s = datetime.fromisoformat(start)
    return {
        "location_id": "loc", "source_id": source, "lat": 6.9, "lon": 79.8,
        "variable": var, "unit": VARIABLES[var]["unit"],
        "interval_start": s.isoformat(),
        "interval_end": (s + timedelta(days=days)).isoformat(),
        "value": value, "retrieved_at": "2024-06-01T00:00:00+00:00",
        "available_at": available_at,
    }


class TestVariableContracts:
    def test_temperature_allows_negative_soil_moisture_rejects_it(self):
        assert check_value("merra2_t2m", -5.0) is not None  # -5K is implausible
        assert check_value("merra2_t2m", 260.0) is None  # signed: cold but valid
        assert check_value("merra2_t2m", 290.0) is None
        assert check_value("modis_ndvi", -0.1) is None  # signed variable accepts <0 in range
        assert check_value("smap_surface_sm", -0.05) is not None
        assert check_value("smap_surface_sm", 0.35) is None
        assert check_value("modis_ndvi", 0.8) is None
        assert check_value("modis_ndvi", 1.5) is not None
        assert check_value("modis_et", -1.0) is not None

    def test_qa_routes_variable_constraints(self):
        recs = [
            _rec("smap_surface_sm", "2024-01-01T00:00:00+00:00", 1, 0.4),
            _rec("smap_surface_sm", "2024-01-02T00:00:00+00:00", 1, -0.2),
            _rec("modis_lst_day", "2024-01-01T00:00:00+00:00", 1, 299.5),
            _rec("modis_lst_day", "2024-01-02T00:00:00+00:00", 1, 999.0),
        ]
        valid, quar = qa.normalize(recs, "loc", "SPL3SMP_E.006")
        assert len(valid) == 2
        reasons = {q["reason"] for q in quar}
        assert "impossible_negative_smap_surface_sm" in reasons
        assert "implausible_modis_lst_day" in reasons


class TestEarthdataAdapter:
    def _cmr_body(self):
        import json
        return json.dumps({"feed": {"entry": [
            {"id": "g1", "time_start": "2024-01-01T00:00:00Z",
             "time_end": "2024-01-02T00:00:00Z",
             "links": [{"href": "https://opendap.earthdata.nasa.gov/x/g1.nc"}]},
            {"id": "g2", "time_start": "2024-01-02T00:00:00Z",
             "time_end": "2024-01-03T00:00:00Z",
             "links": [{"href": "https://opendap.earthdata.nasa.gov/x/g2.nc"}]},
        ]}}).encode()

    def test_cmr_parse_and_series_availability(self):
        calls = []

        def transport(url, params, timeout):
            calls.append(url)
            if "granules.json" in url:
                return 200, self._cmr_body(), {}
            return 200, b"netcdf-bytes", {}

        def parser(raw, var_name, lat, lon, gs, ge, composite_days):
            return [(gs, ge, 0.41)]

        out = earthdata.fetch_series(
            "smap_surface_sm", 6.9, 79.8,
            datetime(2024, 1, 1, tzinfo=UTC), datetime(2024, 1, 10, tzinfo=UTC),
            transport=transport, parser=parser, sleep=lambda s: None,
            now=datetime(2024, 6, 1, tzinfo=UTC))
        assert out["granules_discovered"] == 2
        assert len(out["records_raw"]) == 2
        r = out["records_raw"][0]
        # availability = interval_end + declared delay (3d for SPL3SMP_E)
        assert r["available_at"] == "2024-01-05T00:00:00+00:00"
        assert r["source_role"] == "delayed-near-real-time"
        assert r["variable"] == "smap_surface_sm"

    def test_composite_delay_keeps_et_retrospective(self):
        """MOD16A2GF 60-day delay: its availability is never near-real-time."""
        def transport(url, params, timeout):
            if "granules.json" in url:
                return 200, self._cmr_body(), {}
            return 200, b"nc", {}

        def parser(raw, var_name, lat, lon, gs, ge, cd):
            return [(gs, ge + timedelta(days=7), 4.0)]

        out = earthdata.fetch_series(
            "modis_et", 6.9, 79.8,
            datetime(2024, 1, 1, tzinfo=UTC), datetime(2024, 1, 10, tzinfo=UTC),
            transport=transport, parser=parser, sleep=lambda s: None,
            now=datetime(2024, 6, 1, tzinfo=UTC))
        r = out["records_raw"][0]
        avail = datetime.fromisoformat(r["available_at"])
        end = datetime.fromisoformat(r["interval_end"])
        assert (avail - end).days == PRODUCTS["MOD16A2GF.061"]["delay_days"]
        assert r["source_role"] == "retrospective"

    def test_future_granule_request_rejected(self):
        with pytest.raises(earthdata.EarthdataError):
            earthdata.fetch_series(
                "smap_surface_sm", 0, 0,
                datetime.now(UTC), datetime.now(UTC) + timedelta(days=3),
                transport=lambda u, p, t: (200, b"{}", {}))


class TestGenericFeaturesAndTargets:
    def test_composite_features_trail_availability(self):
        # 16-day NDVI composite: record published at end+10d must not leak.
        recs = []
        d = datetime(2024, 1, 1)
        for i in range(12):
            s = d + timedelta(days=16 * i)
            e = s + timedelta(days=16)
            recs.append({"location_id": "loc", "source_id": "MOD13Q1.061",
                         "lat": 6.9, "lon": 79.8,
                         "variable": "modis_ndvi", "unit": "1",
                         "interval_start": s.isoformat(), "interval_end": e.isoformat(),
                         "value": 0.5 + 0.01 * i,
                         "available_at": (e + timedelta(days=10)).isoformat()})
        from forecasts.v2.schemas import HistoricalRecord
        hist = [qa.HistoricalRecord(**r) for r in recs]
        issue = "2024-06-01T00:00:00+00:00"
        feat = features.build_features(hist, issue, 0, 0, "modis_ndvi")
        assert feat is not None
        assert feat["step_days"] == 16.0
        # Composite for period 05-09→05-25 publishes 06-04 — AFTER the 06-01
        # issue time — so the lag-1 slot must be missing (leakage prevented),
        # and lag-2 sees the last genuinely published composite.
        assert feat["val_lag_1p"] != feat["val_lag_1p"]  # NaN = withheld
        assert feat["val_lag_1p_missing"] == 1.0
        assert feat["val_lag_2p"] == pytest.approx(0.57)

    def test_target_value_respects_native_period(self):
        recs = []
        d = datetime(2024, 1, 1)
        for i in range(8):
            s = d + timedelta(days=8 * i)
            recs.append({"location_id": "l", "source_id": "MOD16A2GF.061",
                         "lat": 6.9, "lon": 79.8,
                         "variable": "modis_et", "unit": "kg/m^2/8day",
                         "interval_start": s.isoformat(),
                         "interval_end": (s + timedelta(days=8)).isoformat(),
                         "value": 5.0 + i, "available_at": None})
        from forecasts.v2.schemas import HistoricalRecord
        hist = [qa.HistoricalRecord(**r) for r in recs]
        ws, we, v = features.target_value(hist, "2024-01-05T00:00:00+00:00", 0, "modis_et")
        assert v is not None and (datetime.fromisoformat(we) - datetime.fromisoformat(ws)).days == 8


class TestTrendAggregation:
    def test_intensive_variable_averages_not_sums(self):
        recs = []
        d = datetime(2018, 1, 1)
        for i in range(1095):  # ~3 years daily
            recs.append({"variable": "smap_surface_sm",
                         "interval_start": d.date().isoformat(),
                         "interval_end": (d + timedelta(days=1)).isoformat(),
                         "value": 0.30 + 0.0001 * i})
            d += timedelta(days=1)
        r = trends.analyze(recs, family_id="sm", variable="smap_surface_sm",
                           resamples=100)
        assert r["state"] == "computed"
        assert r["unit"] == "m3/m3/month"
        assert r["slope_per_decade"] > 0


class TestWorkersMultivar:
    def test_earthdata_ingest_to_trend(self, tmp_path, monkeypatch):
        monkeypatch.setattr(jobs, "DB_PATH", tmp_path / "v2.sqlite3")
        monkeypatch.setattr(workers, "STAGING", tmp_path / "history")
        monkeypatch.setattr(workers, "REPORTS", tmp_path / "trends")
        monkeypatch.setattr(datasets, "ROOT", tmp_path / "ds")

        def transport(url, params, timeout):
            if "granules.json" in url:
                import json
                return 200, json.dumps({"feed": {"entry": [
                    {"id": "g1", "time_start": "2024-01-01T00:00:00Z",
                     "time_end": "2024-02-01T00:00:00Z",
                     "links": [{"href": "https://opendap.earthdata.nasa.gov/x/g1.nc"}]},
                ]}}).encode(), {}
            return 200, b"nc", {}

        def parser(raw, var_name, lat, lon, gs, ge, cd):
            out = []
            d = gs
            while d < ge:
                out.append((d, d + timedelta(days=1), 0.33))
                d += timedelta(days=1)
            return out

        j = jobs.enqueue("earthdata_ingest", "loc",
                         spec={"variable": "smap_surface_sm", "backfill_days": 45})
        out = workers.execute(j["job_id"], transport=transport, parser=parser,
                              region_lookup=lambda i: {"id": i, "latitude": 6.9, "longitude": 79.8})
        assert out["status"] == "complete", out.get("error")
        staged = workers.staged_records("loc", "SPL3SMP_E.006")
        assert staged and staged[0]["variable"] == "smap_surface_sm"
        assert all(r["available_at"] for r in staged)


class TestRainfallRegression:
    def test_precip_contract_unchanged(self):
        from forecasts.v2.training import feature_columns
        cols = feature_columns("precip_24h")
        assert "precip_lag_1d" in cols and "dry_spell" in cols
        assert "val_lag_1p" not in cols
        other = feature_columns("smap_surface_sm")
        assert "val_lag_1p" in other and "step_days" in other
        assert not set(other) & {"precip_lag_1d"}
