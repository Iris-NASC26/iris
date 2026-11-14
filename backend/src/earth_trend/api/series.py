"""Native-cell monthly series endpoint for the approved anonymous POWER stores."""

import hashlib
import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from earth_trend.sources.power_zarr import (
    STORES,
    MonthlyPoint,
    SourceFormatError,
    SourceUnavailable,
    read_point,
)

from .schemas import Error, Series, Transform
from .schemas.source_series import PointLocation, PointSeriesResult, SeriesSource

router = APIRouter()
VARIABLE = re.compile(r"^V(?:0[1-9]|1[0-3])$")


def problem(
    status: int, code: str, title: str, detail: str, *, retryable: bool = False
) -> JSONResponse:
    body = Error.model_validate(
        {
            "schema_version": "1.0",
            "type": "urn:earth-trend:problem:" + code.lower().replace("_", "-"),
            "title": title,
            "status": status,
            "detail": detail,
            "code": code,
            "request_id": "req-" + uuid.uuid4().hex[:16],
            "retryable": retryable,
            "retry_after_seconds": None,
            "field_errors": [],
        }
    )
    return JSONResponse(
        body.model_dump(mode="json"), status_code=status, media_type="application/problem+json"
    )


def build_result(point: MonthlyPoint) -> PointSeriesResult:
    store = point.store
    digest = hashlib.sha256(
        "|".join(f"{k}={v}" for k, v in sorted(point.artifact_hashes.items())).encode()
    ).hexdigest()
    valid = [value is not None for value in point.values]
    series = Series.model_validate(
        {
            "schema_version": "1.0",
            "series_id": f"retrieved:{store.variable_id}:{point.cell_lat}:{point.cell_lon}",
            "variable_id": store.variable_id,
            "binding_id": f"unadmitted-power-{store.field}",
            "branch_id": "raw_monthly",
            "frequency": "monthly",
            "time": point.months,
            "value": point.values,
            "coverage": [1.0 if ok else None for ok in valid],
            "valid": valid,
            "reason": [None if ok else "missing_observation" for ok in valid],
            "units": store.units,
            "transform": Transform.model_validate(
                {
                    "transform_id": "identity-power",
                    "version": "1",
                    "kind": "identity",
                    "input_units": store.source_units,
                    "output_units": store.units,
                    "scale": 1.0,
                    "offset": 0.0,
                    "order": ["decode_fill"],
                }
            ),
            "grid_id": f"power-native-{point.lat_step}x{point.lon_step}",
            "provenance_id": f"retrieval:{digest[:32]}",
        }
    )
    source = SeriesSource(
        variable_id=store.variable_id,  # type: ignore[arg-type]
        store_title=point.store_title,
        store_version=point.store_version,
        field=store.field,
        source_units=store.source_units,
        units=store.units,  # type: ignore[arg-type]
        time_standard=store.time_standard,  # type: ignore[arg-type]
        data_kind="model",
        first_month=point.months[0],
        last_finite_month=point.months[-1],
        declared_end=point.declared_end,
        missing_months=valid.count(False),
        retrieved_at=point.retrieved_at,
        served_from_cache=point.from_cache,
        stale_cache=point.stale_cache,
        artifact_sha256=point.artifact_hashes,
        acknowledgement=point.acknowledgement,
        caveats=[
            *store.caveats,
            "Value of the nearest native grid cell, not an area-weighted regional mean.",
            "Retrieved data only: no trend, significance or validation is implied.",
        ],
        scientifically_validated=False,
    )
    location = PointLocation(
        requested_lat=point.requested_lat,
        requested_lon=point.requested_lon,
        cell_lat=point.cell_lat,
        cell_lon=point.cell_lon,
        cell_lat_step=point.lat_step,
        cell_lon_step=point.lon_step,
        selection="nearest_native_cell",
    )
    return PointSeriesResult(schema_version="1.0", series=series, location=location, source=source)


@router.get("/api/v1/series/{variable_id}", response_model=PointSeriesResult)
def point_series(
    variable_id: str,
    lat: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)],
    lon: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)],
) -> PointSeriesResult | JSONResponse:
    if not VARIABLE.fullmatch(variable_id):
        return problem(404, "NOT_FOUND", "Unknown variable", "Variable IDs run from V01 to V13.")
    if variable_id not in STORES:
        return problem(
            409,
            "MODE_UNAVAILABLE",
            "Source not connected",
            f"{variable_id} has no connected data source yet; only {', '.join(STORES)} do.",
        )
    try:
        return build_result(read_point(variable_id, lat, lon))
    except SourceUnavailable:
        return problem(
            503,
            "PROVIDER_UNAVAILABLE",
            "NASA POWER unreachable",
            "The store could not be reached and no cached copy exists.",
            retryable=True,
        )
    except SourceFormatError:
        return problem(
            502,
            "PROVIDER_RESPONSE_INVALID",
            "Unexpected source content",
            "The NASA POWER store returned content this reader cannot safely interpret.",
        )
