"""Offline overview checks; synthetic bytes are restricted to tests."""

import json
import math

import httpx
import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from visualization import overview, router as module
from visualization.power_zarr import FieldRejected, SourceFormatError, SourceUnavailable

from .fixtures import LAT, LON, SPATIAL_BASE, client_for, make_spatial_store

BOX = dict(lat_min=-0.25, lat_max=1.75, lon_min=5, lon_max=45)


def spatial_client(files, calls=None):
    return client_for(files, calls, base=SPATIAL_BASE)


def test_native_overview_below_cell_cap(tmp_path):
    field, manifest = overview.read_overview(
        "V01", "1981-03", *BOX.values(), root=tmp_path, client=spatial_client(make_spatial_store())
    )
    assert field.values == [12.0] * 16  # March plane is constant 12 in the fixture
    assert field.cell_lats == LAT and field.cell_lons == LON
    assert field.lat_step == 0.5 and field.lon_step == 10
    assert manifest["resolution"]["aggregation"] == "none"
    assert manifest["coverage"] is None


def test_month_outside_source_axis_rejected(tmp_path):
    with pytest.raises(FieldRejected):
        overview.read_overview(
            "V01", "2000-05", *BOX.values(), root=tmp_path, client=spatial_client(make_spatial_store())
        )


def test_aggregated_cells_are_cosine_area_weighted_means(tmp_path, monkeypatch):
    monkeypatch.setattr(overview, "MAX_OVERVIEW_CELLS", 4)
    base = np.arange(16, dtype=np.float32).reshape(4, 4) + 20
    values = np.stack([base] * 5, axis=0)
    field, manifest = overview.read_overview(
        "V01", "1981-01", *BOX.values(), root=tmp_path, client=spatial_client(make_spatial_store(values))
    )
    assert manifest["resolution"]["aggregation"] == "area_weighted_mean"
    assert manifest["resolution"]["factor_lat"] == 2 and manifest["resolution"]["factor_lon"] == 2
    w0, w1 = math.cos(math.radians(LAT[0])), math.cos(math.radians(LAT[1]))
    w2, w3 = math.cos(math.radians(LAT[2])), math.cos(math.radians(LAT[3]))
    top_left = (base[0, 0] * w0 + base[0, 1] * w0 + base[1, 0] * w1 + base[1, 1] * w1) / (2 * w0 + 2 * w1)
    bottom_right = (base[2, 2] * w2 + base[2, 3] * w2 + base[3, 2] * w3 + base[3, 3] * w3) / (2 * w2 + 2 * w3)
    assert field.values[0] == pytest.approx(top_left)
    assert field.values[3] == pytest.approx(bottom_right)
    assert len(field.values) == 4 and field.cell_lats == pytest.approx([0.25, 1.25])
    assert field.cell_lons == pytest.approx([15.0, 35.0])
    assert manifest["coverage"] == [1.0] * 4


def test_missing_cells_never_count_as_zero(tmp_path, monkeypatch):
    monkeypatch.setattr(overview, "MAX_OVERVIEW_CELLS", 4)
    base = np.full((4, 4), 20.0, dtype=np.float32)
    base[0, 0] = np.nan          # one valid hole in the top-left output cell
    base[2:4, 2:4] = np.nan      # the bottom-right output cell is entirely missing
    values = np.stack([base] * 5, axis=0)
    field, manifest = overview.read_overview(
        "V01", "1981-01", *BOX.values(), root=tmp_path, client=spatial_client(make_spatial_store(values))
    )
    assert field.values[0] == 20.0       # mean of the 3 valid cells, not (20*3+0)/4
    assert field.values[3] is None       # wholly missing block stays missing
    assert manifest["coverage"] == [0.75, 1.0, 1.0, 0.0]


def test_overview_artifact_is_cached_and_reused_without_network(tmp_path):
    calls: list[str] = []
    files = make_spatial_store()
    first = overview.overview_response(
        "V01", "1981-01", *BOX.values(), root=tmp_path, client=spatial_client(files, calls)
    )
    count = len(calls)
    again = overview.overview_response(
        "V01", "1981-01", *BOX.values(), root=tmp_path, client=spatial_client({}, calls)
    )
    assert len(calls) == count
    assert again["artifact_cache"] is True and first["artifact_cache"] is False
    assert again["values"] == first["values"]


def test_corrupt_artifact_is_not_accepted(tmp_path):
    files = make_spatial_store()
    overview.overview_response(
        "V01", "1981-01", *BOX.values(), root=tmp_path, client=spatial_client(files)
    )
    for path in tmp_path.iterdir():
        if path.suffix == ".json":
            path.write_text('{"response_sha256":"deadbeef","response":{"fake":1}}')
    calls: list[str] = []
    again = overview.overview_response(
        "V01", "1981-01", *BOX.values(), root=tmp_path, client=spatial_client(files, calls)
    )
    assert again["artifact_cache"] is False and len(calls) > 0


def test_overview_response_manifest_is_complete(tmp_path):
    body = overview.overview_response(
        "V01", "1981-01", *BOX.values(), root=tmp_path, client=spatial_client(make_spatial_store())
    )
    assert body["schema_version"] == "visualization.overview.v1"
    assert body["resolution"]["source_lat_step"] == 0.5
    assert body["extent"] == {"lat_min": -0.25, "lat_max": 1.75, "lon_min": 5, "lon_max": 45}
    assert body["source"]["scientifically_validated"] is False
    assert "power_merra2_monthly_spatial_utc.zarr" in body["source"]["url"]
    assert all(len(h) == 64 for h in body["source"]["artifact_sha256"].values())


def test_spatial_layout_change_is_rejected(tmp_path):
    files = make_spatial_store()
    meta = json.loads(files["T2M/.zarray"])
    meta["chunks"] = [5, 4, 4]  # temporal-style chunking must not be read as spatial
    files["T2M/.zarray"] = json.dumps(meta).encode()
    with pytest.raises(SourceFormatError):
        overview.read_overview(
            "V01", "1981-01", *BOX.values(), root=tmp_path, client=spatial_client(files)
        )


def test_units_change_is_rejected(tmp_path):
    files = make_spatial_store()
    attrs = json.loads(files["T2M/.zattrs"])
    attrs["units"] = "K"
    files["T2M/.zattrs"] = json.dumps(attrs).encode()
    with pytest.raises(SourceFormatError):
        overview.read_overview(
            "V01", "1981-01", *BOX.values(), root=tmp_path, client=spatial_client(files)
        )


def test_out_of_range_decoded_value_is_rejected(tmp_path):
    values = np.stack([np.full((4, 4), 200.0, dtype=np.float32)] * 5, axis=0)
    with pytest.raises(SourceFormatError):
        overview.read_overview(
            "V01", "1981-01", *BOX.values(),
            root=tmp_path, client=spatial_client(make_spatial_store(values)),
        )


@pytest.fixture
def api(tmp_path, monkeypatch):
    original = overview.overview_response
    monkeypatch.setattr(
        module,
        "overview_response",
        lambda *args: original(*args, root=tmp_path, client=spatial_client(make_spatial_store())),
    )
    app = FastAPI()
    app.include_router(module.router)
    return TestClient(app)


def test_overview_route_serves_real_contract(api):
    result = api.get("/api/v1/visualization/overview", params={**BOX, "variable": "V01", "month": "1981-01"})
    assert result.status_code == 200
    body = result.json()
    assert body["schema_version"] == "visualization.overview.v1"
    assert body["values"] == [10.0] * 16


@pytest.mark.parametrize("bad", [{"month": "1981-13"}, {"variable": "XX"}, {"lon_max": 400}, {"lat_min": "NaN"}])
def test_overview_route_rejects_invalid_input(api, bad):
    result = api.get("/api/v1/visualization/overview", params={**BOX, "variable": "V01", "month": "1981-01", **bad})
    assert result.status_code == 422


def test_overview_route_reports_provider_outage(api, monkeypatch):
    monkeypatch.setattr(module, "overview_response", lambda *a, **k: (_ for _ in ()).throw(SourceUnavailable("test")))
    result = api.get("/api/v1/visualization/overview", params={**BOX, "variable": "V01", "month": "1981-01"})
    assert result.status_code == 503 and "values" not in result.json()
