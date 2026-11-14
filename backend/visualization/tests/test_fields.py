"""Offline checks; synthetic bytes are restricted to tests."""

import hashlib
import json

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from visualization import router as module
from visualization.power_zarr import (
    FieldRejected,
    SourceFormatError,
    SourceUnavailable,
    fetch,
    read_field,
)

from .fixtures import client_for, make_store

BOX = dict(variable="V01", month="1981-03", lat_min=0.9, lat_max=1.6, lon_min=29, lon_max=41)


def test_native_cell_order_units_gaps_and_independent_values(tmp_path):
    result = read_field(
        "V01", "1981-03", 0.9, 1.6, 29, 41, root=tmp_path, client=client_for(make_store())
    )
    # Original row-major source positions at March: indices 42,43,46,47.
    assert result.values == [25.54, 25.91, None, 27.39]
    assert result.cell_lats == [1.0, 1.5] and result.cell_lons == [30.0, 40.0]
    assert result.store.source_units == "C"
    assert result.lat_step == 0.5 and result.lon_step == 10
    assert len(result.artifact_hashes) > 3


def test_cache_is_hashed_and_reused_without_network(tmp_path):
    files = make_store()
    calls = []
    first = read_field(
        "V01", "1981-01", 0.9, 1.6, 29, 41, root=tmp_path, client=client_for(files, calls)
    )
    count = len(calls)
    again = read_field(
        "V01", "1981-01", 0.9, 1.6, 29, 41, root=tmp_path, client=client_for(files, calls)
    )
    assert len(calls) == count and again.from_cache and not first.from_cache
    assert first.artifact_hashes == again.artifact_hashes


@pytest.mark.parametrize("change", ["units", "dimensions", "bad_range"])
def test_rejects_source_binding_changes(tmp_path, change):
    files = make_store()
    attrs = json.loads(files["T2M/.zattrs"])
    if change == "units":
        attrs["units"] = "K"
    elif change == "dimensions":
        attrs["_ARRAY_DIMENSIONS"] = ["lat", "lon", "time"]
    else:
        attrs["valid_max"] = 1
    files["T2M/.zattrs"] = json.dumps(attrs).encode()
    with pytest.raises(SourceFormatError):
        read_field("V01", "1981-01", 0.9, 1.6, 29, 41, root=tmp_path, client=client_for(files))


@pytest.mark.parametrize("box", [(2, 1, 20, 30), (0, 1, 40, 30), (float("nan"), 1, 20, 30)])
def test_rejects_invalid_box_before_network(tmp_path, box):
    with pytest.raises(FieldRejected):
        read_field("V01", "1981-01", *box, root=tmp_path, client=client_for({}))


def test_cache_corruption_is_not_accepted(tmp_path):
    url = "https://nasa-power.s3.us-west-2.amazonaws.com/test"
    key = hashlib.sha256(url.encode()).hexdigest()
    (tmp_path / key).write_bytes(b"bad")
    (tmp_path / (key + ".json")).write_text("not-json")
    client = httpx.Client(
        transport=httpx.MockTransport(
            lambda req: httpx.Response(200, content=b"real-transport-test-bytes")
        )
    )
    result = fetch(url, root=tmp_path, client=client)
    assert result.body == b"real-transport-test-bytes" and not result.cached


def test_rejects_redirects_and_arbitrary_hosts(tmp_path):
    with pytest.raises(SourceFormatError):
        fetch("https://attacker.test/data", root=tmp_path)
    client = httpx.Client(
        transport=httpx.MockTransport(
            lambda req: httpx.Response(302, headers={"Location": "https://attacker.test"})
        )
    )
    with pytest.raises(SourceFormatError):
        fetch("https://nasa-power.s3.us-west-2.amazonaws.com/test", root=tmp_path, client=client)


@pytest.fixture
def api(tmp_path, monkeypatch):
    original = read_field
    monkeypatch.setattr(
        module,
        "read_field",
        lambda *args: original(*args, root=tmp_path, client=client_for(make_store())),
    )
    app = FastAPI()
    app.include_router(module.router)
    return TestClient(app)


def test_route_uses_real_reader_and_marks_raw_source(api):
    result = api.get("/api/v1/visualization/field", params=BOX)
    assert result.status_code == 200
    body = result.json()
    assert body["values"] == [25.54, 25.91, None, 27.39]
    assert body["source"]["scientifically_validated"] is False
    assert body["schema_version"] == "visualization.field.v1"


@pytest.mark.parametrize(
    "overrides",
    [
        {"month": "1981-13"},
        {"variable": "FAKE"},
        {"lat_min": 5},
        {"lon_max": 200},
        {"lat_min": "NaN"},
    ],
)
def test_route_rejects_invalid_input(api, overrides):
    result = api.get("/api/v1/visualization/field", params={**BOX, **overrides})
    assert result.status_code == 422


def test_provider_outage_is_not_replaced_by_values(api, monkeypatch):
    def fail(*args):
        raise SourceUnavailable("test")

    monkeypatch.setattr(module, "read_field", fail)
    result = api.get("/api/v1/visualization/field", params=BOX)
    assert result.status_code == 503 and "values" not in result.json()


def test_cell_budget_rejects_large_windows_without_chunk_download(tmp_path, monkeypatch):
    from visualization import power_zarr

    monkeypatch.setattr(power_zarr, "MAX_FIELD_CELLS", 1)
    calls = []
    with pytest.raises(FieldRejected):
        read_field(
            "V01",
            "1981-01",
            0.9,
            1.6,
            29,
            41,
            root=tmp_path,
            client=client_for(make_store(), calls),
        )
    assert not any("T2M/0." in call for call in calls)


def test_stale_cache_is_explicit_after_transport_failure(tmp_path):
    import os
    import time

    read_field("V01", "1981-01", 0.9, 1.6, 29, 41, root=tmp_path, client=client_for(make_store()))
    for path in tmp_path.iterdir():
        if not path.name.endswith(".json"):
            os.utime(path, (time.time() - 90000, time.time() - 90000))

    def unavailable(request):
        raise httpx.ConnectError("test offline", request=request)

    result = read_field(
        "V01",
        "1981-01",
        0.9,
        1.6,
        29,
        41,
        root=tmp_path,
        client=httpx.Client(transport=httpx.MockTransport(unavailable)),
    )
    assert result.stale_cache and result.from_cache
    assert result.retrieved_at.timestamp() < time.time() - 89000


def test_source_fill_value_is_missing_not_a_physical_observation(tmp_path):
    files = make_store()
    attrs = json.loads(files["T2M/.zattrs"])
    attrs["_FillValue"] = 13.7
    files["T2M/.zattrs"] = json.dumps(attrs).encode()
    result = read_field("V01", "1981-01", 0.9, 1.6, 29, 41, root=tmp_path, client=client_for(files))
    assert result.values[0] is None
    assert result.values[1] is not None
