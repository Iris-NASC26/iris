"""Source-binding and transport tests. Synthetic arrays are TEST-ONLY."""

import json

import numcodecs
import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from visualization import router as routes
from visualization.catalog import SOURCES, VARIABLES
from visualization.overview import SPATIAL_PATHS, read_overview
from visualization.power_zarr import STORES, SourceFormatError, read_field

from .fixtures import client_for, make_spatial_store, make_store

# Independently transcribed from NASA POWER temporal/spatial .zmetadata,
# inspected 2026-11-15. Bounds are source validity limits, not display ranges.
CASES = {
    "V01": ("T2M", "C", 10, -125, 80),
    "TS": ("TS", "C", 10, -125, 80),
    "T2MDEW": ("T2MDEW", "C", 10, -125, 80),
    "PRECTOTCORR": ("PRECTOTCORR", "mm/day", 2, 0, 12000),
    "SNODP": ("SNODP", "cm", 10, 0, 500),
    "GWETTOP": ("GWETTOP", "1", 0.5, 0, 1),
    "GWETROOT": ("GWETROOT", "1", 0.5, 0, 1),
    "RH2M": ("RH2M", "%", 50, 0, 100),
    "WS10M": ("WS10M", "m/s", 3, 0, 50),
    "PS": ("PS", "hPa", 1000, 500, 1100),
    "V12": ("ALLSKY_SFC_SW_DWN", "W m-2", 100, 0, 1500),
}


def bound_store(variable, spatial=False):
    field, units, sample, low, high = CASES[variable]
    files = make_spatial_store(np.full((5, 4, 4), sample, dtype=np.float32)) if spatial else make_store()
    if not spatial:
        values = np.full((5, 2, 2), sample, dtype="<f4")
        values[0, 0, 0] = np.nan
        descriptor = json.loads(files["T2M/.zarray"])
        encoded = numcodecs.get_codec(descriptor["filters"][0]).encode(values.ravel())
        files["T2M/0.1.1"] = bytes(numcodecs.get_codec(descriptor["compressor"]).encode(encoded.tobytes()))
    attrs = json.loads(files["T2M/.zattrs"])
    attrs.update(units=units, valid_min=low, valid_max=high)
    files["T2M/.zattrs"] = json.dumps(attrs).encode()
    root = json.loads(files[".zattrs"])
    root["time_standard"] = STORES[variable].time_standard
    files[".zattrs"] = json.dumps(root).encode()
    return {key.replace("T2M/", field + "/"): value for key, value in files.items()}


@pytest.mark.parametrize("variable", CASES)
def test_native_and_overview_preserve_variable_units_and_numeric_values(variable, tmp_path):
    field, units, sample, _, _ = CASES[variable]
    assert STORES[variable].field == field and STORES[variable].source_units == units
    assert SPATIAL_PATHS[variable] == SOURCES[VARIABLES[variable]["family"]]["spatial"]
    native = read_field(variable, "1981-01", 0.9, 1.6, 29, 41, root=tmp_path / "native",
                        client=client_for(bound_store(variable), base=f"/{STORES[variable].path}/"))
    assert native.values == [None, sample, sample, sample]
    overview, _ = read_overview(variable, "1981-01", 0, 2, 10, 40, root=tmp_path / "overview",
                               client=client_for(bound_store(variable, True), base=f"/{SPATIAL_PATHS[variable]}/"))
    assert overview.values == [sample] * 16
    assert native.store.units == overview.store.units == VARIABLES[variable]["units"]


@pytest.mark.parametrize("variable", CASES)
def test_routes_accept_each_verified_variable(variable, tmp_path, monkeypatch):
    original = routes.read_field
    monkeypatch.setattr(routes, "read_field", lambda *args: original(
        *args, root=tmp_path, client=client_for(bound_store(variable), base=f"/{STORES[variable].path}/")))
    app = FastAPI()
    app.include_router(routes.router)
    response = TestClient(app).get("/api/v1/visualization/field", params={
        "variable": variable, "month": "1981-01", "lat_min": 0.9, "lat_max": 1.6, "lon_min": 29, "lon_max": 41})
    assert response.status_code == 200
    assert response.json()["field"] == CASES[variable][0]
    assert response.json()["source"]["scientifically_validated"] is False


def test_new_variable_rejects_source_unit_drift(tmp_path):
    files = bound_store("SNODP")
    attrs = json.loads(files["SNODP/.zattrs"])
    attrs["units"] = "m"
    files["SNODP/.zattrs"] = json.dumps(attrs).encode()
    with pytest.raises(SourceFormatError, match="units"):
        read_field("SNODP", "1981-01", 0.9, 1.6, 29, 41, root=tmp_path,
                   client=client_for(files, base=f"/{STORES['SNODP'].path}/"))
