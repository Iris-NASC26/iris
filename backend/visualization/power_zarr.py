"""Bounded raw NASA POWER Zarr fields; never a trend or spatial interpolation.

Adapted narrowly from the independently tested Earth Trend raw source reader
(revision 84d941f). No application, UI, numerical inference or synthetic cube is imported.
"""

import hashlib
import json
import math
import os
import re
import tempfile
import threading
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, cast

import httpx
import numcodecs
import numpy as np

HOST = "nasa-power.s3.us-west-2.amazonaws.com"
MAX_OBJECT_BYTES = 4 * 1024 * 1024
CACHE_TTL_SECONDS = 24 * 3600
_CACHE_LOCK = threading.Lock()
_CALENDARS = ("standard", "gregorian", "proleptic_gregorian")


class SourceUnavailable(Exception):
    """The provider could not be reached and no cached copy exists."""


class SourceFormatError(Exception):
    """The provider returned something this reader must not interpret."""


class FieldRejected(Exception):
    """The requested month or box is outside the source axis or cell limit."""


@dataclass(frozen=True)
class Store:
    variable_id: str
    path: str
    field: str
    source_units: str
    units: str
    time_standard: str
    caveats: tuple[str, ...]


STORES: dict[str, Store] = {
    "V01": Store(
        "V01",
        "merra2/temporal/power_merra2_monthly_temporal_utc.zarr",
        "T2M",
        "C",
        "°C",
        "UTC",
        (
            "MERRA-2 reanalysis model output; 2 m temperature is not directly assimilated.",
            "Known MERRA-2 input changes (SST and sea ice in 1982 and 2006-04; production-stream "
            "breaks around 1991, 2001 and 2011) can create apparent steps in long series.",
        ),
    ),
    "V12": Store(
        "V12",
        "syn1deg/temporal/power_syn1deg_monthly_temporal_lst.zarr",
        "ALLSKY_SFC_SW_DWN",
        "W m-2",
        "W/m²",
        "LST",
        (
            "CERES SYN1deg-based radiation on a 1° grid, labelled in local solar time (LST).",
            "Do not combine with a UTC series or append a different solar product.",
        ),
    ),
}


@dataclass(frozen=True)
class Fetched:
    body: bytes
    sha256: str
    cached: bool
    stale: bool
    retrieved_epoch: float


@dataclass(frozen=True)
class Field:
    store: Store
    month: str
    lat_step: float
    lon_step: float
    cell_lats: list[float]
    cell_lons: list[float]
    values: list[float | None]
    store_title: str
    store_version: str
    acknowledgement: str
    artifact_hashes: dict[str, str]
    retrieved_at: datetime
    from_cache: bool
    stale_cache: bool


def cache_root(kind: str = "power") -> Path:
    configured = os.environ.get("IRIS_VISUALIZATION_DATA_DIR")
    base = Path(configured) if configured else Path(__file__).resolve().parents[2] / "artifacts"
    return base / "runtime" / kind


def _check_url(url: str, host: str) -> None:
    parts = httpx.URL(url)
    if parts.scheme != "https" or parts.host != host or parts.userinfo:
        raise SourceFormatError("Source URL is outside an approved host")


def _download(url: str, client: httpx.Client | None) -> bytes:
    session = client or httpx.Client(timeout=20.0, follow_redirects=False)
    try:
        with session.stream("GET", url, headers={"Accept": "*/*"}) as response:
            if response.status_code != 200:
                raise SourceFormatError(f"Unexpected HTTP status {response.status_code}")
            body = bytearray()
            for part in response.iter_bytes():
                body.extend(part)
                if len(body) > MAX_OBJECT_BYTES:
                    raise SourceFormatError("Source object exceeds the size limit")
            return bytes(body)
    finally:
        if client is None:
            session.close()


def _store_atomically(path: Path, data: bytes) -> None:
    handle, name = tempfile.mkstemp(dir=path.parent)
    with os.fdopen(handle, "wb") as stream:
        stream.write(data)
    os.replace(name, path)


def fetch(
    url: str,
    *,
    host: str = HOST,
    cache: str = "power",
    root: Path | None = None,
    client: httpx.Client | None = None,
) -> Fetched:
    """Fetch one bounded object, preferring a fresh cache and falling back to a stale one."""
    _check_url(url, host)
    folder = root or cache_root(cache)
    key = hashlib.sha256(url.encode()).hexdigest()
    path, meta = folder / key, folder / (key + ".json")
    cached: bytes | None = None
    if path.exists() and meta.exists():
        try:
            if path.stat().st_size > MAX_OBJECT_BYTES:
                raise ValueError("Oversized cached object")
            body = path.read_bytes()
            info = json.loads(meta.read_text(encoding="utf-8"))
            if hashlib.sha256(body).hexdigest() == info.get("sha256"):
                cached = body
                if time.time() - path.stat().st_mtime < CACHE_TTL_SECONDS:
                    return Fetched(body, info["sha256"], True, False, path.stat().st_mtime)
        except (OSError, ValueError, TypeError, AttributeError):
            cached = None
    try:
        body = _download(url, client)
    except (httpx.HTTPError, SourceFormatError) as error:
        if cached is not None:
            return Fetched(
                cached, hashlib.sha256(cached).hexdigest(), True, True, path.stat().st_mtime
            )
        if isinstance(error, SourceFormatError):
            raise
        raise SourceUnavailable("The NASA POWER store could not be reached") from error
    digest = hashlib.sha256(body).hexdigest()
    folder.mkdir(parents=True, exist_ok=True)
    with _CACHE_LOCK:
        if (
            sum(p.stat().st_size for p in folder.iterdir() if p.is_file()) + len(body)
            > 512 * 1024 * 1024
        ):
            raise SourceUnavailable(
                "Spatial cache reached its 512 MiB limit; clear the dedicated cache before retrying"
            )
        _store_atomically(path, body)
        _store_atomically(meta, json.dumps({"url": url, "sha256": digest}).encode())
    return Fetched(body, digest, False, False, time.time())


def decode(body: bytes, descriptor: dict[str, Any], shape: tuple[int, ...]) -> Any:
    """Decode a Zarr v2 chunk with its declared compressor and filters."""
    if descriptor.get("zarr_format") != 2 or descriptor.get("order") != "C":
        raise SourceFormatError("Unsupported Zarr layout")
    if math.prod(shape) * np.dtype(descriptor["dtype"]).itemsize > 16 * 1024 * 1024:
        raise SourceFormatError("Decoded source chunk exceeds the memory limit")
    raw = numcodecs.get_codec(descriptor["compressor"]).decode(body)
    array = np.frombuffer(raw, dtype=descriptor["dtype"])
    for filter_config in reversed(descriptor.get("filters") or []):
        array = numcodecs.get_codec(filter_config).decode(array)
    if array.size != math.prod(shape):
        raise SourceFormatError("Decoded chunk does not match its declared shape")
    return array.reshape(shape)


def month_labels(days: Any, attributes: dict[str, Any]) -> list[str]:
    if attributes.get("calendar", "standard") not in _CALENDARS:
        raise SourceFormatError("Unsupported calendar")
    match = re.fullmatch(r"days since (\d{4}-\d{2}-\d{2})(?: 00:00:00)?", attributes["units"])
    if match is None:
        raise SourceFormatError("Unsupported time units")
    epoch = datetime.fromisoformat(match[1])
    labels = [(epoch + timedelta(days=int(value))).strftime("%Y-%m") for value in days]
    positions = [int(label[:4]) * 12 + int(label[5:]) for label in labels]
    if any(b != a + 1 for a, b in zip(positions, positions[1:], strict=False)):
        raise SourceFormatError("Source months are not consecutive")
    return labels


@dataclass(frozen=True)
class _Context:
    store: Store
    hashes: dict[str, str]
    fetches: list[Fetched]
    get: Any
    root_attrs: dict[str, Any]
    field_array: dict[str, Any]
    field_attrs: dict[str, Any]
    shape: tuple[int, int, int]
    chunks: tuple[int, int, int]
    lat_axis: Any
    lon_axis: Any
    months: list[str]


def _open(variable_id: str, *, root: Path | None, client: httpx.Client | None) -> _Context:
    store = STORES[variable_id]
    base = f"https://{HOST}/{store.path}"
    hashes: dict[str, str] = {}
    fetches: list[Fetched] = []

    def get(name: str) -> Fetched:
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
    if chunks[0] != shape[0] or field_array.get("dimension_separator", ".") != ".":
        raise SourceFormatError("Unsupported chunk layout")

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
    return _Context(
        store,
        hashes,
        fetches,
        get,
        root_attrs,
        field_array,
        field_attrs,
        shape,
        chunks,
        lat_axis,
        lon_axis,
        months,
    )


def _decimals(ctx: _Context) -> int | None:
    scale = next(
        (
            f["scale"]
            for f in ctx.field_array.get("filters") or []
            if f.get("id") == "fixedscaleoffset"
        ),
        None,
    )
    return int(round(math.log10(scale))) if scale else None


MAX_FIELD_CELLS = 4000


def read_field(
    variable_id: str,
    month: str,
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    *,
    root: Path | None = None,
    client: httpx.Client | None = None,
) -> Field:
    """Read one month's native cells inside a latitude/longitude box (no dateline wrap)."""
    if variable_id not in STORES:
        raise FieldRejected("Only V01 temperature and V12 sunlight grids are supported")
    if not all(math.isfinite(v) for v in (lat_min, lat_max, lon_min, lon_max)) or not (
        -90 <= lat_min < lat_max <= 90 and -180 <= lon_min < lon_max <= 180
    ):
        raise FieldRejected(
            "Enter ordered finite latitude/longitude bounds; dateline wrap is unsupported"
        )
    ctx = _open(variable_id, root=root, client=client)
    if month not in ctx.months:
        raise FieldRejected(f"Month {month} is outside the source axis")
    time_index = ctx.months.index(month)
    lat_axis, lon_axis, chunks = ctx.lat_axis, ctx.lon_axis, ctx.chunks
    lat_mask = np.nonzero((lat_axis >= lat_min) & (lat_axis <= lat_max))[0]
    lon_mask = np.nonzero((lon_axis >= lon_min) & (lon_axis <= lon_max))[0]
    if lat_mask.size == 0 or lon_mask.size == 0:
        raise FieldRejected("The box contains no native cells")
    if lat_mask.size * lon_mask.size > MAX_FIELD_CELLS:
        raise FieldRejected("The box exceeds the field cell limit")
    needed = {(int(la) // chunks[1], int(lo) // chunks[2]) for la in lat_mask for lo in lon_mask}
    if (
        len(needed) * math.prod(ctx.chunks) * np.dtype(ctx.field_array["dtype"]).itemsize
        > 64 * 1024 * 1024
    ):
        raise FieldRejected("Requested chunks exceed the 64 MiB decode budget")
    if len(needed) > 32:
        raise FieldRejected("The box crosses too many source chunks; choose a smaller region")
    decoded: dict[tuple[int, int], Any] = {}
    for block in needed:
        body = ctx.get(f"{ctx.store.field}/0.{block[0]}.{block[1]}")
        decoded[block] = decode(body.body, ctx.field_array, ctx.chunks)
    decimals = _decimals(ctx)
    low, high = float(ctx.field_attrs["valid_min"]), float(ctx.field_attrs["valid_max"])
    values: list[float | None] = []
    for la in lat_mask:
        for lo in lon_mask:
            value = float(
                decoded[(int(la) // chunks[1], int(lo) // chunks[2])][
                    time_index, int(la) % chunks[1], int(lo) % chunks[2]
                ]
            )
            fills = [
                ctx.field_array.get("fill_value"),
                ctx.field_attrs.get("_FillValue"),
                ctx.field_attrs.get("missing_value"),
            ]
            physical = (
                round(value, decimals) if decimals is not None and math.isfinite(value) else value
            )
            if any(isinstance(fill, (int, float)) and physical == fill for fill in fills):
                values.append(None)
                continue
            if math.isfinite(value) and (value < low or value > high):
                raise SourceFormatError("Decoded value outside the source's declared valid range")
            if not math.isfinite(value):
                values.append(None)
            else:
                values.append(round(value, decimals) if decimals is not None else value)
    return Field(
        store=ctx.store,
        month=month,
        lat_step=float(abs(lat_axis[1] - lat_axis[0])),
        lon_step=float(abs(lon_axis[1] - lon_axis[0])),
        cell_lats=[float(lat_axis[i]) for i in lat_mask],
        cell_lons=[float(lon_axis[i]) for i in lon_mask],
        values=values,
        store_title=str(ctx.root_attrs.get("title", ctx.store.path)),
        store_version=str(ctx.root_attrs.get("version", "unknown")),
        acknowledgement=str(ctx.root_attrs.get("acknowledgement", "")),
        artifact_hashes=ctx.hashes,
        retrieved_at=datetime.fromtimestamp(max(item.retrieved_epoch for item in ctx.fetches), UTC),
        from_cache=all(item.cached for item in ctx.fetches),
        stale_cache=any(item.stale for item in ctx.fetches),
    )
