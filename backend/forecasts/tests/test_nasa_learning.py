"""Synthetic numerical fixtures below are restricted to offline software tests."""

from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
import xarray as xr
from forecasts.catalog import region
from forecasts.learning import experiment, validate_rows
from forecasts.nasa import read_subset


def subset(units="mm/day", value=0):
    data = xr.Dataset(
        {"precipitation": (("time", "lon", "lat"), np.array([[[value]]], dtype=float))},
        coords={"time": [np.datetime64("2026-11-13")], "lon": [79.85], "lat": [6.95]},
    )
    data.precipitation.attrs["units"] = units
    return data.to_netcdf()


def test_nasa_units_grid_coordinates_time_and_missing():
    assert read_subset(subset(), region("colombo"), "2026-11-13")["value"] == 0
    assert (
        read_subset(subset(value=float("nan")), region("colombo"), "2026-11-13")[
            "value"
        ]
        is None
    )
    for raw, point, date in [
        (subset(units="mm"), region("colombo"), "2026-11-13"),
        (subset(), region("kathmandu"), "2026-11-13"),
        (subset(), region("colombo"), "2026-11-12"),
    ]:
        with pytest.raises(ValueError):
            read_subset(raw, point, date)


def training_fixture():
    rows = []
    for year in range(2019, 2023):
        for day in range(110):
            target = datetime(year, 2, 1, tzinfo=UTC) + timedelta(days=day)
            issue = target - timedelta(hours=24)
            value = float(day % 11)
            rows.append(
                {
                    "retrieved_at": issue.isoformat(),
                    "target_start": target.isoformat(),
                    "target_end": (target + timedelta(days=1)).isoformat(),
                    "features_available_at": issue.isoformat(),
                    "observation_available_at": (
                        target + timedelta(days=3)
                    ).isoformat(),
                    "forecast_sha256": "a" * 64,
                    "observation_sha256": "b" * 64,
                    "raw_p10_mm": value,
                    "raw_median_mm": value,
                    "raw_p90_mm": value,
                    "antecedent_7d_mm": value * 7,
                    "lead_hours": 24,
                    "month_sin": np.sin(target.month * 2 * np.pi / 12),
                    "month_cos": np.cos(target.month * 2 * np.pi / 12),
                    "observed_mm": value,
                }
            )
    return rows


def test_ml_uses_chronological_splits_and_withholds_perfect_baseline():
    report, model = experiment(training_fixture())
    assert report["test_year"] == "2022"
    assert report["calibration_year"] == "2021"
    assert report["training_years"] == ["2019", "2020"]
    assert report["state"] == "withheld_no_demonstrated_added_skill"
    assert report["production_enabled"] is False
    assert report["human_reviewed"] is False
    assert set(model["models"]) == {"0.1", "0.5", "0.9"}


def test_ml_rejects_feature_leakage_invalid_support_duplicates_and_insufficient_years():
    rows = training_fixture()
    rows[0]["features_available_at"] = rows[0]["target_start"]
    with pytest.raises(ValueError, match="leakage"):
        validate_rows(rows)
    rows = training_fixture()
    rows[0]["lead_hours"] = 12
    with pytest.raises(ValueError, match="lead"):
        validate_rows(rows)
    rows = training_fixture()
    rows.append(rows[0])
    with pytest.raises(ValueError, match="Duplicate"):
        validate_rows(rows)
    rows = training_fixture()[:110]
    with pytest.raises(ValueError, match="four target years"):
        experiment(rows)
