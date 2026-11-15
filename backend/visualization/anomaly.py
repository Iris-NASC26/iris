"""NASA POWER monthly climatological baseline and anomaly service.

Calculates cell-by-cell temperature anomalies relative to the 1991–2020 baseline
from authentic NASA POWER MERRA-2 Zarr observations.
"""

from __future__ import annotations

import hashlib
import math
import threading
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import numpy as np

from .catalog import STORES, VARIABLES
from .power_zarr import (
    MAX_FIELD_CELLS,
    FieldRejected,
    SourceFormatError,
    SourceUnavailable,
    Store,
    _decimals,
    _open,
    decode,
)

MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

DEFAULT_BASELINE_START = 1991
DEFAULT_BASELINE_END = 2020
DEFAULT_MIN_VALID_YEARS = 20

# Thread-safe in-memory cache for computed climatological baselines:
# key -> (baseline_means_dict, baseline_counts_dict, cached_at)
_CLIMATOLOGY_LOCK = threading.Lock()
_CLIMATOLOGY_CACHE: dict[str, tuple[dict[tuple[int, int], float | None], dict[tuple[int, int], int], float]] = {}
MAX_CLIMATOLOGY_CACHE_ENTRIES = 256


@dataclass(frozen=True)
class AnomalyField:
    store: Store
    target_month: str
    baseline_start_year: int
    baseline_end_year: int
    calendar_month: int
    calendar_month_name: str
    min_valid_years: int
    lat_step: float
    lon_step: float
    cell_lats: list[float]
    cell_lons: list[float]
    values: list[float | None]
    target_values: list[float | None]
    baseline_means: list[float | None]
    baseline_counts: list[int]
    valid_cells: int
    missing_cells: int
    anomaly_min: float | None
    anomaly_max: float | None
    store_title: str
    store_version: str
    acknowledgement: str
    artifact_hashes: dict[str, str]
    retrieved_at: datetime
    from_cache: bool
    stale_cache: bool


def clear_climatology_cache() -> None:
    """Clear in-memory climatology cache (used in testing)."""
    with _CLIMATOLOGY_LOCK:
        _CLIMATOLOGY_CACHE.clear()


def read_anomaly(
    variable_id: str,
    target_month: str,
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    *,
    baseline_start_year: int = DEFAULT_BASELINE_START,
    baseline_end_year: int = DEFAULT_BASELINE_END,
    min_valid_years: int = DEFAULT_MIN_VALID_YEARS,
    root: Path | None = None,
    client: httpx.Client | None = None,
) -> AnomalyField:
    """Read one month's native cells and compute climatological anomaly relative to baseline."""
    if variable_id not in STORES:
        raise FieldRejected("Choose a supported NASA POWER spatial variable")
    if variable_id != "V01":
        raise FieldRejected("The historical anomaly service currently supports V01 (T2M) only")
    if not all(math.isfinite(v) for v in (lat_min, lat_max, lon_min, lon_max)) or not (
        -90 <= lat_min < lat_max <= 90 and -180 <= lon_min < lon_max <= 180
    ):
        raise FieldRejected(
            "Enter ordered finite latitude/longitude bounds; dateline wrap is unsupported"
        )
    if baseline_start_year >= baseline_end_year:
        raise FieldRejected("Baseline start year must precede end year")
    if min_valid_years < 1 or min_valid_years > (baseline_end_year - baseline_start_year + 1):
        raise FieldRejected("min_valid_years exceeds baseline span or is non-positive")

    ctx = _open(variable_id, root=root, client=client)
    if target_month not in ctx.months:
        raise FieldRejected(f"Target month {target_month} is outside the source axis")

    target_idx = ctx.months.index(target_month)
    cal_month = int(target_month.split("-")[1])
    cal_name = MONTH_NAMES[cal_month - 1]

    # Identify all baseline indices for matching calendar month
    baseline_indices = [
        i
        for i, m in enumerate(ctx.months)
        if baseline_start_year <= int(m[:4]) <= baseline_end_year and int(m[5:7]) == cal_month
    ]

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

    decimals = _decimals(ctx)
    low, high = float(ctx.field_attrs["valid_min"]), float(ctx.field_attrs["valid_max"])
    fills = [
        ctx.field_array.get("fill_value"),
        ctx.field_attrs.get("_FillValue"),
        ctx.field_attrs.get("missing_value"),
    ]

    # Check climatology cache key
    cache_key_raw = (
        f"{variable_id}:{cal_month}:{baseline_start_year}:{baseline_end_year}:{min_valid_years}:"
        f"{','.join(str(la) for la in lat_mask)}:{','.join(str(lo) for lo in lon_mask)}:"
        f"{ctx.root_attrs.get('version', '')}"
    )
    cache_key = hashlib.sha256(cache_key_raw.encode()).hexdigest()

    cached_means: dict[tuple[int, int], float | None] | None = None
    cached_counts: dict[tuple[int, int], int] | None = None
    with _CLIMATOLOGY_LOCK:
        if cache_key in _CLIMATOLOGY_CACHE:
            cached_means, cached_counts, _ = _CLIMATOLOGY_CACHE[cache_key]

    # Decode needed chunks
    decoded: dict[tuple[int, int], Any] = {}
    for block in needed:
        body = ctx.get(f"{ctx.store.field}/0.{block[0]}.{block[1]}")
        decoded[block] = decode(body.body, ctx.field_array, ctx.chunks)

    # Compute or retrieve baseline climatology
    if cached_means is None or cached_counts is None:
        computed_means: dict[tuple[int, int], float | None] = {}
        computed_counts: dict[tuple[int, int], int] = {}
        for la in lat_mask:
            for lo in lon_mask:
                block_key = (int(la) // chunks[1], int(lo) // chunks[2])
                la_sub = int(la) % chunks[1]
                lo_sub = int(lo) % chunks[2]
                chunk_data = decoded[block_key]
                valid_b_vals: list[float] = []
                for b_idx in baseline_indices:
                    val = float(chunk_data[b_idx, la_sub, lo_sub])
                    if not math.isfinite(val) or val < low or val > high:
                        continue
                    if any(isinstance(fill, (int, float)) and val == fill for fill in fills):
                        continue
                    valid_b_vals.append(val)
                count = len(valid_b_vals)
                computed_counts[(la, lo)] = count
                if count >= min_valid_years:
                    mean_val = float(np.mean(valid_b_vals))
                    computed_means[(la, lo)] = round(mean_val, decimals) if decimals is not None else mean_val
                else:
                    computed_means[(la, lo)] = None

        with _CLIMATOLOGY_LOCK:
            if len(_CLIMATOLOGY_CACHE) >= MAX_CLIMATOLOGY_CACHE_ENTRIES:
                oldest_key = min(_CLIMATOLOGY_CACHE, key=lambda k: _CLIMATOLOGY_CACHE[k][2])
                _CLIMATOLOGY_CACHE.pop(oldest_key, None)
            _CLIMATOLOGY_CACHE[cache_key] = (computed_means, computed_counts, time.time())
        cached_means, cached_counts = computed_means, computed_counts

    # Evaluate target month and subtract baseline mean
    anomalies: list[float | None] = []
    target_values: list[float | None] = []
    baseline_means_list: list[float | None] = []
    baseline_counts_list: list[int] = []

    for la in lat_mask:
        for lo in lon_mask:
            block_key = (int(la) // chunks[1], int(lo) // chunks[2])
            la_sub = int(la) % chunks[1]
            lo_sub = int(lo) % chunks[2]
            raw_target = float(decoded[block_key][target_idx, la_sub, lo_sub])

            # Validate target observation
            target_is_fill = any(isinstance(fill, (int, float)) and raw_target == fill for fill in fills)
            if not math.isfinite(raw_target) or raw_target < low or raw_target > high or target_is_fill:
                target_val = None
            else:
                target_val = round(raw_target, decimals) if decimals is not None else raw_target

            b_mean = cached_means.get((la, lo))
            b_count = cached_counts.get((la, lo), 0)

            target_values.append(target_val)
            baseline_means_list.append(b_mean)
            baseline_counts_list.append(b_count)

            if target_val is not None and b_mean is not None:
                anom = target_val - b_mean
                anomalies.append(round(anom, decimals) if decimals is not None else anom)
            else:
                anomalies.append(None)

    valid_anoms = [a for a in anomalies if a is not None]
    valid_count = len(valid_anoms)
    missing_count = len(anomalies) - valid_count
    anom_min = min(valid_anoms) if valid_anoms else None
    anom_max = max(valid_anoms) if valid_anoms else None

    return AnomalyField(
        store=ctx.store,
        target_month=target_month,
        baseline_start_year=baseline_start_year,
        baseline_end_year=baseline_end_year,
        calendar_month=cal_month,
        calendar_month_name=cal_name,
        min_valid_years=min_valid_years,
        lat_step=float(abs(lat_axis[1] - lat_axis[0])),
        lon_step=float(abs(lon_axis[1] - lon_axis[0])),
        cell_lats=[float(lat_axis[i]) for i in lat_mask],
        cell_lons=[float(lon_axis[i]) for i in lon_mask],
        values=anomalies,
        target_values=target_values,
        baseline_means=baseline_means_list,
        baseline_counts=baseline_counts_list,
        valid_cells=valid_count,
        missing_cells=missing_count,
        anomaly_min=anom_min,
        anomaly_max=anom_max,
        store_title=str(ctx.root_attrs.get("title", ctx.store.path)),
        store_version=str(ctx.root_attrs.get("version", "unknown")),
        acknowledgement=str(ctx.root_attrs.get("acknowledgement", "")),
        artifact_hashes=ctx.hashes,
        retrieved_at=datetime.fromtimestamp(max(item.retrieved_epoch for item in ctx.fetches), UTC),
        from_cache=all(item.cached for item in ctx.fetches),
        stale_cache=any(item.stale for item in ctx.fetches),
    )
