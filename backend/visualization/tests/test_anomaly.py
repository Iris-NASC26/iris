"""Offline checks for NASA POWER climatological anomaly service and endpoints."""

import json
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from visualization import router as module
from visualization.anomaly import read_anomaly, _CLIMATOLOGY_CACHE
from visualization.power_zarr import FieldRejected, SourceUnavailable
from .fixtures import client_for, make_store


def test_anomaly_cell_calculation_and_units(tmp_path):
    files = make_store()
    # In make_store(), time indices are 1981-01, 1981-02, 1981-03, 1981-04, 1981-05
    # Let's test with baseline covering 1981 and min_valid_years=1 for the fixture.
    result = read_anomaly(
        variable_id="V01",
        target_month="1981-01",
        lat_min=0.9,
        lat_max=1.6,
        lon_min=29,
        lon_max=41,
        baseline_start_year=1981,
        baseline_end_year=1981,
        min_valid_years=1,
        root=tmp_path,
        client=client_for(files),
    )
    assert result.target_month == "1981-01"
    assert result.calendar_month == 1
    assert result.calendar_month_name == "Jan"
    assert result.cell_lats == [1.0, 1.5]
    assert result.cell_lons == [30.0, 40.0]
    assert len(result.values) == 4
    # Because target is identical to baseline (only 1981 in baseline), anomaly should be 0.0
    for v in result.values:
        if v is not None:
            assert abs(v) < 1e-4


def test_anomaly_preserves_missing_data_and_min_valid_years(tmp_path):
    files = make_store()
    # When min_valid_years is higher than available years (e.g. 20), result must be None
    result = read_anomaly(
        variable_id="V01",
        target_month="1981-01",
        lat_min=0.9,
        lat_max=1.6,
        lon_min=29,
        lon_max=41,
        baseline_start_year=1981,
        baseline_end_year=1981,
        min_valid_years=20,
        root=tmp_path,
        client=client_for(files),
    )
    # All values must be None because baseline count (1) < 20
    assert all(v is None for v in result.values)
    assert result.valid_cells == 0
    assert result.missing_cells == 4


def test_anomaly_endpoint_validation():
    app = FastAPI()
    app.include_router(module.router)
    client = TestClient(app)

    # lat_min >= lat_max must reject
    res = client.get("/anomaly?lat_min=10&lat_max=5")
    assert res.status_code == 422

    # baseline_start >= baseline_end must reject
    res = client.get("/anomaly?baseline_start=2020&baseline_end=1990")
    assert res.status_code == 422
