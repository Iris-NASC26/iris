"""TEST-ONLY synthetic Zarr bytes. Never imported by production routes."""

import json
from typing import Any

import httpx
import numcodecs
import numpy as np

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
