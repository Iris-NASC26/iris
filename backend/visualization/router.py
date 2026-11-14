"""Optional visualization routes. Existing backend files are not modified."""

import logging
import threading
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query

from .overview import overview_response
from .power_zarr import FieldRejected, SourceFormatError, SourceUnavailable, read_field

router = APIRouter(prefix="/api/v1/visualization", tags=["Visualization fields"])
logger = logging.getLogger(__name__)
_slots = threading.BoundedSemaphore(2)


@router.get("/field")
def field(
    variable: Literal["V01", "V12"],
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
    variable: Literal["V01", "V12"],
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
