"""POWER reader and series endpoint checks against a tiny in-memory Zarr-style store.

The store below is a TEST-ONLY synthetic construction used to exercise decoding, caching and
error handling without the network. It is never served by the application.
"""

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import httpx
import numcodecs
import numpy as np
import pytest
from fastapi.testclient import TestClient

from earth_trend.api import series as series_module
from earth_trend.api.app import create_app
from earth_trend.api.schemas.source_series import PointSeriesResult
from earth_trend.sources import power_zarr
from earth_trend.sources.power_zarr import (
    HOST,
    STORES,
    SourceFormatError,
    SourceUnavailable,
    read_point,
)

BASE = "/merra2/temporal/power_merra2_monthly_temporal_utc.zarr/"
LAT, LON = [0.0, 0.5, 1.0, 1.5], [10.0, 20.0, 30.0, 40.0]
BLOSC = {"id": "blosc", "cname": "lz4", "clevel": 1, "shuffle": 1, "blocksize": 0}


def pack(array: Any, dtype: str) -> bytes:
    return bytes(numcodecs.get_codec(BLOSC).encode(np.asarray(array, dtype=dtype).tobytes()))


def zarray(shape: list[int], chunks: list[int], dtype: str, filters: Any = None) -> bytes:
    return json.dumps(
        {
            "shape": shape,
            "chunks": chunks,
            "dtype": dtype,
            "fill_value": "NaN",
            "order": "C",
            "filters": filters,
            "dimension_separator": ".",
            "compressor": BLOSC,
            "zarr_format": 2,
        }
    ).encode()


def make_store(units: str = "C", hole: bool = True) -> dict[str, bytes]:
    scale = {
        "id": "fixedscaleoffset",
        "scale": 100,
        "offset": 1000,
        "dtype": "<f4",
        "astype": "<f4",
    }
    values = np.arange(5 * 4 * 4, dtype=np.float32).reshape(5, 4, 4) * 0.37 + 10.0
    values[4] = np.nan  # not yet published: trailing month
    if hole:
        values[2, 3, 2] = np.nan  # a genuine interior gap at the cell used below
    chunk_values = values[:, 2:4, 2:4].astype("<f4")
    encoded = numcodecs.FixedScaleOffset(offset=1000, scale=100, dtype="<f4", astype="<f4").encode(
        chunk_values.ravel()
    )
    attrs = {
        "units": units,
        "valid_min": -125.0,
        "valid_max": 80.0,
        "_ARRAY_DIMENSIONS": ["time", "lat", "lon"],
    }
    root = {
        "title": "Test-only store",
        "version": "TEST 0",
        "acknowledgement": "Test acknowledgement",
        "time_standard": "Universal Time Coordinated (UTC)",
        "time_coverage_end": "2029-12-31",
    }
    return {
        ".zattrs": json.dumps(root).encode(),
        "T2M/.zarray": zarray([5, 4, 4], [5, 2, 2], "<f4", [scale]),
        "T2M/.zattrs": json.dumps(attrs).encode(),
        "T2M/0.1.1": bytes(numcodecs.get_codec(BLOSC).encode(np.asarray(encoded).tobytes())),
        "time/.zarray": zarray([5], [5], "<i8"),
        "time/.zattrs": json.dumps(
            {"units": "days since 1981-01-31 00:00:00", "calendar": "proleptic_gregorian"}
        ).encode(),
        "time/0": pack([0, 28, 59, 89, 120], "<i8"),
        "lat/.zarray": zarray([4], [4], "<f8"),
        "lat/0": pack(LAT, "<f8"),
        "lon/.zarray": zarray([4], [4], "<f8"),
        "lon/0": pack(LON, "<f8"),
    }


def client_for(files: dict[str, bytes], calls: list[str] | None = None) -> httpx.Client:
    def handle(request: httpx.Request) -> httpx.Response:
        if calls is not None:
            calls.append(request.url.path)
        name = request.url.path.removeprefix(BASE)
        return (
            httpx.Response(200, content=files[name])
            if request.url.path.startswith(BASE) and name in files
            else httpx.Response(404)
        )

    return httpx.Client(transport=httpx.MockTransport(handle), follow_redirects=False)


def test_decodes_the_nearest_cell_keeps_gaps_and_drops_unpublished_months(tmp_path: Path) -> None:
    point = read_point("V01", 1.4, 29.0, root=tmp_path, client=client_for(make_store()))
    assert (point.cell_lat, point.cell_lon) == (1.5, 30.0)
    assert point.months == ["1981-01", "1981-02", "1981-03", "1981-04"]
    expected = (np.arange(80, dtype=np.float32).reshape(5, 4, 4) * 0.37 + 10.0)[:, 3, 2]
    assert point.values[0] == pytest.approx(float(expected[0]), abs=0.005)
    assert point.values[2] is None
    assert point.values[3] == pytest.approx(float(expected[3]), abs=0.005)
    assert all(v is None or round(v, 2) == v for v in point.values)
    assert not point.from_cache and not point.stale_cache
    assert set(point.artifact_hashes) >= {"T2M/0.1.1", "time/0", ".zattrs"}


def test_second_read_uses_the_verified_cache_and_a_stale_cache_survives_an_outage(
    tmp_path: Path,
) -> None:
    files = make_store()
    calls: list[str] = []
    read_point("V01", 1.4, 29.0, root=tmp_path, client=client_for(files, calls))
    first = len(calls)
    again = read_point("V01", 1.4, 29.0, root=tmp_path, client=client_for(files, calls))
    assert len(calls) == first and again.from_cache and not again.stale_cache
    for path in tmp_path.iterdir():
        if not path.name.endswith(".json"):
            path.touch()
            import os

            os.utime(path, (1, 1))
    offline = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500)))
    stale = read_point("V01", 1.4, 29.0, root=tmp_path, client=offline)
    assert stale.stale_cache and stale.values == again.values


def test_unreachable_source_without_a_cache_is_reported(tmp_path: Path) -> None:
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline")

    with pytest.raises(SourceUnavailable):
        read_point(
            "V01",
            1.4,
            29.0,
            root=tmp_path,
            client=httpx.Client(transport=httpx.MockTransport(refuse)),
        )


def test_refuses_unexpected_units_and_corrupt_cache_is_not_trusted(tmp_path: Path) -> None:
    with pytest.raises(SourceFormatError, match="units"):
        read_point("V01", 1.4, 29.0, root=tmp_path, client=client_for(make_store(units="K")))
    url = f"https://{HOST}{BASE}.zattrs"
    solo = tmp_path / "solo"
    power_zarr.fetch(url, root=solo, client=client_for(make_store()))
    body_file = next(p for p in solo.iterdir() if not p.name.endswith(".json"))
    body_file.write_bytes(b"tampered")
    fresh = power_zarr.fetch(url, root=solo, client=client_for(make_store()))
    assert not fresh.cached and fresh.body != b"tampered"


@pytest.mark.parametrize(
    "url",
    [
        "http://" + HOST + BASE + ".zattrs",
        "https://example.com" + BASE + ".zattrs",
        "https://user@" + HOST + BASE + ".zattrs",
    ],
)
def test_only_the_approved_https_host_can_be_requested(url: str, tmp_path: Path) -> None:
    with pytest.raises(SourceFormatError):
        power_zarr.fetch(url, root=tmp_path, client=client_for({}))


def test_redirects_and_oversize_objects_are_rejected(tmp_path: Path) -> None:
    url = f"https://{HOST}{BASE}.zattrs"
    redirect = httpx.Client(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(302, headers={"location": "https://x"})
        ),
        follow_redirects=False,
    )
    with pytest.raises(SourceFormatError):
        power_zarr.fetch(url, root=tmp_path, client=redirect)
    huge = httpx.Client(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(200, content=b"x" * (4 * 1024 * 1024 + 1))
        )
    )
    with pytest.raises(SourceFormatError, match="size"):
        power_zarr.fetch(url, root=tmp_path, client=huge)


@pytest.fixture
def api(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    files = make_store()
    original: Callable[..., Any] = power_zarr.read_point
    monkeypatch.setattr(
        series_module,
        "read_point",
        lambda variable, lat, lon: original(
            variable, lat, lon, root=tmp_path, client=client_for(files)
        ),
    )
    return TestClient(create_app(), base_url="http://127.0.0.1")


def test_endpoint_returns_a_contract_valid_traceable_series(api: TestClient) -> None:
    response = api.get("/api/v1/series/V01", params={"lat": 1.4, "lon": 29})
    assert response.status_code == 200
    result = PointSeriesResult.model_validate_json(response.text)
    series = result.series
    assert series.valid == [True, True, False, True]
    assert series.reason[2] == "missing_observation" and series.value[2] is None
    assert series.units == "°C" and series.transform.input_units == "C"
    assert result.source.scientifically_validated is False
    assert result.source.missing_months == 1 and result.source.last_finite_month == "1981-04"
    assert any("not an area-weighted" in caveat for caveat in result.source.caveats)


@pytest.mark.parametrize(
    ("path", "params", "status", "code"),
    [
        ("/api/v1/series/V02", {"lat": 1, "lon": 1}, 409, "MODE_UNAVAILABLE"),
        ("/api/v1/series/V99", {"lat": 1, "lon": 1}, 404, "NOT_FOUND"),
        ("/api/v1/series/V01", {"lat": 91, "lon": 1}, 422, "INVALID_PARAMETERS"),
        ("/api/v1/series/V01", {"lat": "nan", "lon": 1}, 422, "INVALID_PARAMETERS"),
        ("/api/v1/series/V01", {"lat": 1}, 422, "INVALID_PARAMETERS"),
    ],
)
def test_endpoint_problems_use_the_error_contract(
    api: TestClient, path: str, params: dict[str, Any], status: int, code: str
) -> None:
    response = api.get(path, params=params)
    assert response.status_code == status
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == code


def test_provider_failures_map_to_retryable_or_invalid_problems(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def down(*args: Any) -> None:
        raise SourceUnavailable

    def odd(*args: Any) -> None:
        raise SourceFormatError

    client = TestClient(create_app(), base_url="http://127.0.0.1")
    monkeypatch.setattr(series_module, "read_point", down)
    unavailable = client.get("/api/v1/series/V01", params={"lat": 1, "lon": 1})
    assert unavailable.status_code == 503 and unavailable.json()["retryable"] is True
    monkeypatch.setattr(series_module, "read_point", odd)
    invalid = client.get("/api/v1/series/V01", params={"lat": 1, "lon": 1})
    assert invalid.status_code == 502 and invalid.json()["retryable"] is False


def test_only_the_approved_stores_are_configured() -> None:
    assert set(STORES) == {"V01", "V12"}
