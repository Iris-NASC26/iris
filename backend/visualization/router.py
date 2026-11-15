"""Optional visualization routes. Existing backend files are not modified."""

import logging
import threading
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from .anomaly import read_anomaly
from .catalog import VARIABLE_PATTERN
from .overview import overview_response
from .power_zarr import FieldRejected, SourceFormatError, SourceUnavailable, read_field

router = APIRouter(prefix="/api/v1/visualization", tags=["Visualization fields"])
logger = logging.getLogger(__name__)
_slots = threading.BoundedSemaphore(2)


@router.get("/field")
def field(
    variable: Annotated[str, Query(pattern=VARIABLE_PATTERN)],
    month: Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")],
    lat_min: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)],
    lat_max: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)],
    lon_min: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)],
    lon_max: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)],
) -> dict:
    if lat_min >= lat_max or lon_min >= lon_max:
        raise HTTPException(422, "Bounds must be ordered; dateline wrap is unsupported.")
    if not _slots.acquire(blocking=False):
        raise HTTPException(429, "Two spatial loads are already active. Retry when one finishes.")
    try:
        result = read_field(variable, month, lat_min, lat_max, lon_min, lon_max)
        return {
            "schema_version": "visualization.field.v1",
            "variable_id": variable,
            "month": result.month,
            "field": result.store.field,
            "units": result.store.units,
            "source_units": result.store.source_units,
            "time_standard": result.store.time_standard,
            "cell_lats": result.cell_lats,
            "cell_lons": result.cell_lons,
            "lat_step": result.lat_step,
            "lon_step": result.lon_step,
            "values": result.values,
            "source": {
                "url": "https://nasa-power.s3.us-west-2.amazonaws.com/" + result.store.path,
                "title": result.store_title,
                "version": result.store_version,
                "retrieved_at": result.retrieved_at.isoformat(),
                "artifact_sha256": result.artifact_hashes,
                "from_cache": result.from_cache,
                "stale_cache": result.stale_cache,
                "acknowledgement": result.acknowledgement,
                "caveats": [
                    *result.store.caveats,
                    (
                        "Raw native grid values. No trend, significance, "
                        "spatial smoothing or validation is implied."
                    ),
                ],
                "scientifically_validated": False,
            },
        }
    except FieldRejected as exc:
        raise HTTPException(422, str(exc)) from exc
    except SourceUnavailable as exc:
        logger.warning("NASA visualization source unavailable")
        raise HTTPException(503, str(exc)) from exc
    except OSError as exc:
        logger.warning("Spatial source cache could not be read or written")
        raise HTTPException(
            503, "The dedicated spatial cache is unavailable. Check local disk access."
        ) from exc
    except (SourceFormatError, KeyError, ValueError, TypeError, OverflowError) as exc:
        logger.warning("NASA visualization source format rejected: %s", type(exc).__name__)
        raise HTTPException(
            502, "NASA returned data this reader could not safely interpret."
        ) from exc
    finally:
        _slots.release()


@router.get("/overview")
def overview(
    variable: Annotated[str, Query(pattern=VARIABLE_PATTERN)],
    month: Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")],
    lat_min: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)],
    lat_max: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)],
    lon_min: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)],
    lon_max: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)],
) -> dict:
    """Genuine monthly field for arbitrary extents, including the whole globe.

    Spatially chunked source reads keep transfer and decoded memory bounded;
    extents beyond the cell budget return a documented, area-weighted
    aggregation rather than thousands of point reads or an unbounded native read.
    """
    if lat_min >= lat_max or lon_min >= lon_max:
        raise HTTPException(422, "Bounds must be ordered; dateline wrap is unsupported.")
    if not _slots.acquire(blocking=False):
        raise HTTPException(429, "Two spatial loads are already active. Retry when one finishes.")
    try:
        return overview_response(
            variable, month, lat_min, lat_max, lon_min, lon_max
        )
    except FieldRejected as exc:
        raise HTTPException(422, str(exc)) from exc
    except SourceUnavailable as exc:
        logger.warning("NASA visualization source unavailable")
        raise HTTPException(503, str(exc)) from exc
    except OSError as exc:
        logger.warning("Spatial source cache could not be read or written")
        raise HTTPException(
            503, "The dedicated spatial cache is unavailable. Check local disk access."
        ) from exc
    except (SourceFormatError, KeyError, ValueError, TypeError, OverflowError) as exc:
        logger.warning("NASA visualization source format rejected: %s", type(exc).__name__)
        raise HTTPException(
            502, "NASA returned data this reader could not safely interpret."
        ) from exc
    finally:
        _slots.release()


@router.get("/anomaly")
def anomaly(
    variable: Annotated[str, Query(pattern=VARIABLE_PATTERN)] = "V01",
    month: Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")] = "2024-07",
    lat_min: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)] = 5.0,
    lat_max: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)] = 10.0,
    lon_min: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)] = 79.0,
    lon_max: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)] = 82.0,
    baseline_start: Annotated[int, Query(ge=1980, le=2025)] = 1991,
    baseline_end: Annotated[int, Query(ge=1980, le=2025)] = 2020,
    min_valid_years: Annotated[int, Query(ge=1, le=40)] = 20,
) -> dict:
    """Historical monthly climatological anomaly relative to baseline mean.

    Calculates cell-by-cell temperature differences (observed - baseline mean)
    for the matching calendar month using authentic NASA POWER reanalysis data.
    """
    if lat_min >= lat_max or lon_min >= lon_max:
        raise HTTPException(422, "Bounds must be ordered; dateline wrap is unsupported.")
    if baseline_start >= baseline_end:
        raise HTTPException(422, "Baseline start year must be earlier than end year.")
    if not _slots.acquire(blocking=False):
        raise HTTPException(429, "Two spatial loads are already active. Retry when one finishes.")
    try:
        result = read_anomaly(
            variable_id=variable,
            target_month=month,
            lat_min=lat_min,
            lat_max=lat_max,
            lon_min=lon_min,
            lon_max=lon_max,
            baseline_start_year=baseline_start,
            baseline_end_year=baseline_end,
            min_valid_years=min_valid_years,
        )
        return {
            "schema_version": "visualization.anomaly.v1",
            "variable_id": variable,
            "month": result.target_month,
            "target_month": result.target_month,
            "field": result.store.field,
            "units": result.store.units,
            "source_units": result.store.source_units,
            "time_standard": result.store.time_standard,
            "baseline_period": {
                "start_year": result.baseline_start_year,
                "end_year": result.baseline_end_year,
                "calendar_month": result.calendar_month,
                "calendar_month_name": result.calendar_month_name,
                "min_valid_years": result.min_valid_years,
            },
            "cell_lats": result.cell_lats,
            "cell_lons": result.cell_lons,
            "lat_step": result.lat_step,
            "lon_step": result.lon_step,
            "values": result.values,
            "target_values": result.target_values,
            "baseline_means": result.baseline_means,
            "baseline_counts": result.baseline_counts,
            "valid_cells": result.valid_cells,
            "missing_cells": result.missing_cells,
            "anomaly_min": result.anomaly_min,
            "anomaly_max": result.anomaly_max,
            "source": {
                "url": "https://nasa-power.s3.us-west-2.amazonaws.com/" + result.store.path,
                "title": result.store_title,
                "version": result.store_version,
                "retrieved_at": result.retrieved_at.isoformat(),
                "artifact_sha256": result.artifact_hashes,
                "from_cache": result.from_cache,
                "stale_cache": result.stale_cache,
                "acknowledgement": result.acknowledgement,
                "caveats": [
                    *result.store.caveats,
                    (
                        f"Climatological anomaly relative to {result.baseline_start_year}–{result.baseline_end_year} "
                        f"baseline mean for calendar month {result.calendar_month_name}."
                    ),
                    (
                        f"Requires at least {result.min_valid_years} valid baseline years per cell. "
                        "Missing observations are retained as null, not zero."
                    ),
                    "Raw reanalysis difference field. No trend slope, significance, or prediction is implied.",
                ],
                "scientifically_validated": False,
            },
            "scientific_processing": {
                "method": "climatological_difference",
                "formula": f"T2M_anomaly(cell, Y, M) = T2M_observed(cell, Y, M) - mean(T2M_baseline(cell, {result.baseline_start_year}..{result.baseline_end_year}, M))",
                "baseline_years": f"{result.baseline_start_year}–{result.baseline_end_year}",
                "calendar_month": result.calendar_month,
                "min_valid_years": result.min_valid_years,
            },
        }
    except FieldRejected as exc:
        raise HTTPException(422, str(exc)) from exc
    except SourceUnavailable as exc:
        logger.warning("NASA anomaly source unavailable")
        raise HTTPException(503, str(exc)) from exc
    except OSError as exc:
        logger.warning("Spatial source cache could not be read or written")
        raise HTTPException(
            503, "The dedicated spatial cache is unavailable. Check local disk access."
        ) from exc
    except (SourceFormatError, KeyError, ValueError, TypeError, OverflowError) as exc:
        logger.warning("NASA anomaly source format rejected: %s", type(exc).__name__)
        raise HTTPException(
            502, "NASA returned data this reader could not safely interpret."
        ) from exc
    finally:
        _slots.release()


