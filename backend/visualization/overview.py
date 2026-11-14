"""Global/regional monthly overview fields from NASA POWER spatial Zarr stores.

Unlike the native `/field` reader (temporal chunks, ≤ 4,000 cells), the POWER
"spatial" stores keep one whole month per object — a single bounded download
yields a genuine global monthly field. Extents beyond the native cell budget
are served at a documented coarser resolution: each output cell is the
cos(latitude)-area-weighted mean of the valid native cells inside it. Missing
cells are excluded from both numerator and denominator — never counted as zero.
"""

import hashlib
import json
import math
import os
import tempfile
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import httpx
import numpy as np

from .catalog import SOURCES, VARIABLES

from .power_zarr import (
    HOST,
    STORES,
    Field,
    FieldRejected,
    SourceFormatError,
    cache_root,
    decode,
    fetch,
    month_labels,
)

MAX_OVERVIEW_CELLS = 20000
OVERVIEW_CACHE_LIMIT = 64 * 1024 * 1024
_CACHE_LOCK = threading.Lock()

# The spatially organised stores publish the same variable, units, filters and
# valid range as the temporal stores verified in power_zarr.STORES; only the
# chunk layout differs: chunks == [1, nlat, nlon], one month per object.
SPATIAL_PATHS = {
    key: SOURCES[entry["family"]]["spatial"] for key, entry in VARIABLES.items()
}


@dataclass(frozen=True)
class SpatialContext:
    path: str
    hashes: dict[str, str]
    fetches: list[Any]
    get: Any
    root_attrs: dict[str, Any]
    field_array: dict[str, Any]
    field_attrs: dict[str, Any]
    lat_axis: Any
    lon_axis: Any
    months: list[str]


def _open_spatial(variable_id: str, *, root: Path | None, client: httpx.Client | None) -> SpatialContext:
    store = STORES[variable_id]
    path = SPATIAL_PATHS[variable_id]
    base = f"https://{HOST}/{path}"
    hashes: dict[str, str] = {}
    fetches: list[Any] = []

    def get(name: str):
        item = fetch(f"{base}/{name}", root=root, client=client)
        hashes[name] = item.sha256
        fetches.append(item)
        return item

    def meta(name: str) -> dict[str, Any]:
        return cast(dict[str, Any], json.loads(get(name).body))

    root_attrs = meta(".zattrs")
    field_array = meta(f"{store.field}/.zarray")
    field_attrs = meta(f"{store.field}/.zattrs")
    if field_attrs.get("units") != store.source_units:
        raise SourceFormatError("Source units differ from the approved binding")
    if str(root_attrs.get("time_standard", "")).split("(")[-1].rstrip(")") != store.time_standard:
        raise SourceFormatError("Source time standard differs from the approved binding")
    if field_attrs.get("_ARRAY_DIMENSIONS") != ["time", "lat", "lon"]:
        raise SourceFormatError("Unexpected source dimension order")
    shape, chunks = tuple(field_array["shape"]), tuple(field_array["chunks"])
    # Spatial store contract: exactly one chunk per month covering the whole grid.
    if chunks[0] != 1 or tuple(chunks[1:]) != tuple(shape[1:]) or field_array.get("dimension_separator", ".") != ".":
        raise SourceFormatError("Unsupported spatial chunk layout")
    coordinates: dict[str, Any] = {}
    for name in ("time", "lat", "lon"):
        descriptor = meta(f"{name}/.zarray")
        coordinates[name] = decode(get(f"{name}/0").body, descriptor, tuple(descriptor["shape"]))
    lat_axis, lon_axis = coordinates["lat"], coordinates["lon"]
    if (len(coordinates["time"]), len(lat_axis), len(lon_axis)) != shape:
        raise SourceFormatError("Coordinate lengths do not match the data array")
    for axis in (lat_axis, lon_axis):
        if len(axis) < 2 or not np.all(np.isfinite(axis)) or not np.all(np.diff(axis) > 0):
            raise SourceFormatError("Source coordinates must be finite and strictly increasing")
        if not np.allclose(np.diff(axis), axis[1] - axis[0], rtol=0, atol=1e-8):
            raise SourceFormatError("Source grid spacing changed")
    months = month_labels(coordinates["time"], meta("time/.zattrs"))
    return SpatialContext(path, hashes, fetches, get, root_attrs, field_array, field_attrs, lat_axis, lon_axis, months)


def _decimals(field_array: dict[str, Any]) -> int | None:
    scale = next(
        (f["scale"] for f in field_array.get("filters") or [] if f.get("id") == "fixedscaleoffset"),
        None,
    )
    return int(round(math.log10(scale))) if scale else None


def _physical_values(ctx: SpatialContext, plane: Any) -> tuple[Any, Any]:
    """Return (values, valid_mask) for one month with declared fill/range handling."""
    decimals = _decimals(ctx.field_array)
    low, high = float(ctx.field_attrs["valid_min"]), float(ctx.field_attrs["valid_max"])
    month = plane.astype(np.float64)
    fills = [
        ctx.field_array.get("fill_value"),
        ctx.field_attrs.get("_FillValue"),
        ctx.field_attrs.get("missing_value"),
    ]
    valid = np.isfinite(month)
    for fill in fills:
        if isinstance(fill, (int, float)) and math.isfinite(fill):
            valid &= month != fill
    if np.any(valid & ((month < low) | (month > high))):
        raise SourceFormatError("Decoded value outside the source's declared valid range")
    if decimals is not None:
        month = np.where(valid, np.round(month, decimals), month)
    return month, valid


def _cache_key(parts: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(parts, sort_keys=True).encode()).hexdigest()


def _response_hash(response: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(response, sort_keys=True).encode()).hexdigest()


def _load_artifact(key: str, root: Path | None) -> dict[str, Any] | None:
    folder = root or cache_root("overview")
    path = folder / f"{key}.json"
    try:
        body = path.read_bytes()
        if len(body) > OVERVIEW_CACHE_LIMIT:
            return None
        info = json.loads(body)
        response = info.get("response")
        if not isinstance(response, dict) or info.get("response_sha256") != _response_hash(response):
            return None
        return response
    except (OSError, ValueError, TypeError, AttributeError):
        return None


def _store_artifact(key: str, response: dict[str, Any], root: Path | None) -> None:
    folder = root or cache_root("overview")
    try:
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{key}.json"
        body = json.dumps({"response_sha256": _response_hash(response), "response": response}).encode()
        with _CACHE_LOCK:
            if sum(p.stat().st_size for p in folder.iterdir() if p.is_file()) + len(body) > OVERVIEW_CACHE_LIMIT:
                raise FieldRejected(
                    "Overview artifact cache reached its 64 MiB limit; clear the dedicated cache before retrying"
                )
            handle, name = tempfile.mkstemp(dir=folder)
            with os.fdopen(handle, "wb") as stream:
                stream.write(body)
            os.replace(name, path)
    except FieldRejected:
        raise
    except OSError:
        raise FieldRejected("The dedicated overview cache is unavailable. Check local disk access.")


def read_overview(
    variable_id: str,
    month: str,
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    *,
    root: Path | None = None,
    client: httpx.Client | None = None,
) -> tuple[Field, dict[str, Any]]:
    """Read one month's field for an extent, aggregating honestly when beyond the cell cap."""
    if variable_id not in SPATIAL_PATHS:
        raise FieldRejected("Choose a supported NASA POWER spatial variable")
    if not all(math.isfinite(v) for v in (lat_min, lat_max, lon_min, lon_max)) or not (
        -90 <= lat_min < lat_max <= 90 and -180 <= lon_min < lon_max <= 180
    ):
        raise FieldRejected(
            "Enter ordered finite latitude/longitude bounds; dateline wrap is unsupported"
        )
    ctx = _open_spatial(variable_id, root=root, client=client)
    if month not in ctx.months:
        raise FieldRejected(f"Month {month} is outside the source axis")
    time_index = ctx.months.index(month)
    body = ctx.get(f"{STORES[variable_id].field}/{time_index}.0.0").body
    array = decode(body, ctx.field_array, tuple(ctx.field_array["chunks"]))
    month_field, valid = _physical_values(ctx, array[0])

    lat_axis, lon_axis = ctx.lat_axis, ctx.lon_axis
    lat_mask = np.nonzero((lat_axis >= lat_min) & (lat_axis <= lat_max))[0]
    lon_mask = np.nonzero((lon_axis >= lon_min) & (lon_axis <= lon_max))[0]
    if lat_mask.size == 0 or lon_mask.size == 0:
        raise FieldRejected("The extent contains no native cells")
    values_2d = month_field[np.ix_(lat_mask, lon_mask)]
    valid_2d = valid[np.ix_(lat_mask, lon_mask)]
    lat_sel = lat_axis[lat_mask]
    lon_sel = lon_axis[lon_mask]
    n_lat, n_lon = lat_sel.size, lon_sel.size

    source_lat_step = float(abs(lat_axis[1] - lat_axis[0]))
    source_lon_step = float(abs(lon_axis[1] - lon_axis[0]))

    factor = 1
    while math.ceil(n_lat / factor) * math.ceil(n_lon / factor) > MAX_OVERVIEW_CELLS:
        factor += 1

    coverage: list[float | None] | None = None
    if factor == 1:
        cell_lats = [float(v) for v in lat_sel]
        cell_lons = [float(v) for v in lon_sel]
        flat = values_2d.ravel()
        out_values = [float(v) if ok else None for v, ok in zip(flat, valid_2d.ravel(), strict=False)]
        aggregation: dict[str, Any] = {
            "method": "none",
            "factor_lat": 1,
            "factor_lon": 1,
        }
    else:
        out_lats: list[float] = []
        out_lons: list[float] = []
        out_values = []
        coverage = []
        weights = np.cos(np.radians(lat_sel))
        lat_groups = [lat_sel[i : i + factor] for i in range(0, n_lat, factor)]
        lon_groups = [lon_sel[j : j + factor] for j in range(0, n_lon, factor)]
        for gi, lat_rows in enumerate(lat_groups):
            out_lats.append(float(np.mean(lat_rows)))
        for gj, lon_cols in enumerate(lon_groups):
            out_lons.append(float(np.mean(lon_cols)))
        cell_lats, cell_lons = out_lats, out_lons
        for gi, i in enumerate(range(0, n_lat, factor)):
            rows_ = slice(i, min(i + factor, n_lat))
            for gj, j in enumerate(range(0, n_lon, factor)):
                cols_ = slice(j, min(j + factor, n_lon))
                block = values_2d[rows_, cols_]
                block_valid = valid_2d[rows_, cols_]
                block_w = np.broadcast_to(weights[rows_][:, None], block.shape)
                total_cells = block.size
                valid_cells = int(block_valid.sum())
                coverage.append(round(valid_cells / total_cells, 4) if total_cells else None)
                if valid_cells == 0:
                    out_values.append(None)
                    continue
                w_sum = float(block_w[block_valid].sum())
                out_values.append(float(np.sum(block_w[block_valid] * block[block_valid]) / w_sum))
        aggregation = {
            "method": "area_weighted_mean",
            "factor_lat": factor,
            "factor_lon": factor,
        }

    store = STORES[variable_id]
    field = Field(
        store=store,
        month=month,
        lat_step=source_lat_step * factor,
        lon_step=source_lon_step * factor,
        cell_lats=cell_lats,
        cell_lons=cell_lons,
        values=out_values,
        store_title=str(ctx.root_attrs.get("title", store.path)),
        store_version=str(ctx.root_attrs.get("version", "unknown")),
        acknowledgement=str(ctx.root_attrs.get("acknowledgement", "")),
        artifact_hashes=ctx.hashes,
        retrieved_at=datetime.fromtimestamp(max(item.retrieved_epoch for item in ctx.fetches), UTC),
        from_cache=all(item.cached for item in ctx.fetches),
        stale_cache=any(item.stale for item in ctx.fetches),
    )
    resolution = {
        "source_lat_step": source_lat_step,
        "source_lon_step": source_lon_step,
        "aggregation": aggregation["method"],
        "factor_lat": aggregation["factor_lat"],
        "factor_lon": aggregation["factor_lon"],
        "output_cells": len(out_values),
    }
    manifest = {
        "resolution": resolution,
        "coverage": coverage,
        "extent": {"lat_min": lat_min, "lat_max": lat_max, "lon_min": lon_min, "lon_max": lon_max},
        "spatial_store_path": ctx.path,
    }
    return field, manifest


def overview_response(
    variable_id: str,
    month: str,
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    *,
    root: Path | None = None,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """Contract for /api/v1/visualization/overview. Immutable monthly artifacts are
    cached under the dedicated ignored runtime directory and declared in `source`."""
    key = _cache_key(
        {
            "schema": "visualization.overview.v1",
            "variable": variable_id,
            "month": month,
            "box": [lat_min, lat_max, lon_min, lon_max],
        }
    )
    cached = _load_artifact(key, root)
    if cached is not None:
        cached["artifact_cache"] = True
        return cached
    result, manifest = read_overview(
        variable_id, month, lat_min, lat_max, lon_min, lon_max, root=root, client=client
    )
    store = result.store
    response: dict[str, Any] = {
        "schema_version": "visualization.overview.v1",
        "variable_id": variable_id,
        "month": result.month,
        "field": store.field,
        "units": store.units,
        "source_units": store.source_units,
        "time_standard": store.time_standard,
        "cell_lats": result.cell_lats,
        "cell_lons": result.cell_lons,
        "lat_step": result.lat_step,
        "lon_step": result.lon_step,
        "values": result.values,
        "extent": manifest["extent"],
        "resolution": manifest["resolution"],
        "coverage": manifest["coverage"],
        "artifact_cache": False,
        "source": {
            "url": "https://nasa-power.s3.us-west-2.amazonaws.com/" + manifest["spatial_store_path"],
            "title": result.store_title,
            "version": result.store_version,
            "retrieved_at": result.retrieved_at.isoformat(),
            "artifact_sha256": result.artifact_hashes,
            "from_cache": result.from_cache,
            "stale_cache": result.stale_cache,
            "acknowledgement": result.acknowledgement,
            "caveats": [
                *store.caveats,
                "Raw monthly model data. No trend, significance, forecast or scientific validation is implied.",
                (
                    "Native cells within the selected extent are aggregated to the declared output "
                    "resolution by cos(latitude)-area-weighted mean over valid cells only; missing "
                    "cells never count as zero. `coverage` is the valid-cell fraction per output cell."
                    if manifest["resolution"]["aggregation"] != "none"
                    else "Native source cells; no spatial aggregation was applied."
                ),
            ],
            "scientifically_validated": False,
        },
    }
    if manifest["coverage"] is None:
        response.pop("coverage")
    _store_artifact(key, response, root)
    return response
