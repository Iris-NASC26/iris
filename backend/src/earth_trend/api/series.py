"""Native-cell monthly series endpoint for the approved anonymous POWER stores."""

import hashlib
import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from earth_trend.sources.power_zarr import (
    STORES,
    Field,
    FieldRejected,
    MonthlyPoint,
    SourceFormatError,
    SourceUnavailable,
    read_field,
    read_point,
)

from .schemas import Error, Series, Transform
from .schemas.source_series import (
    FieldBox,
    FieldResult,
    FieldSource,
    PointLocation,
    PointSeriesResult,
    SeriesSource,
)

router = APIRouter()
VARIABLE = re.compile(r"^V(?:0[1-9]|1[0-3])$")
MONTH = re.compile(r"^\d{4}-(?:0[1-9]|1[0-2])$")


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


def build_field_result(field: Field) -> FieldResult:
    store = field.store
    source = FieldSource(
        variable_id=store.variable_id,  # type: ignore[arg-type]
        store_title=field.store_title,
        store_version=field.store_version,
        field=store.field,
        source_units=store.source_units,
        units=store.units,  # type: ignore[arg-type]
        time_standard=store.time_standard,  # type: ignore[arg-type]
        data_kind="model",
        retrieved_at=field.retrieved_at,
        served_from_cache=field.from_cache,
        stale_cache=field.stale_cache,
        artifact_sha256=field.artifact_hashes,
        acknowledgement=field.acknowledgement,
        caveats=[
            *store.caveats,
            "Raw monthly native-cell values in the box; not aggregated and not a trend.",
            "Retrieved data only: no trend, significance or validation is implied.",
        ],
        scientifically_validated=False,
    )
    lat_step = (
        float(abs(field.cell_lats[1] - field.cell_lats[0])) if len(field.cell_lats) > 1 else 0.0
    )
    lon_step = (
        float(abs(field.cell_lons[1] - field.cell_lons[0])) if len(field.cell_lons) > 1 else 0.0
    )
    return FieldResult(
        schema_version="1.0",
        variable_id=store.variable_id,  # type: ignore[arg-type]
        month=field.month,
        box=FieldBox(
            lat_min=min(field.cell_lats) - lat_step / 2,
            lat_max=max(field.cell_lats) + lat_step / 2,
            lon_min=min(field.cell_lons) - lon_step / 2,
            lon_max=max(field.cell_lons) + lon_step / 2,
            cell_lat_step=lat_step,
            cell_lon_step=lon_step,
            selection="native_cells_in_box",
        ),
        cell_lats=field.cell_lats,
        cell_lons=field.cell_lons,
        values=field.values,
        source=source,
    )


@router.get("/api/v1/field/{variable_id}", response_model=FieldResult)
def monthly_field(
    variable_id: str,
    month: str,
    lat_min: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)],
    lat_max: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)],
    lon_min: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)],
    lon_max: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)],
) -> FieldResult | JSONResponse:
    if not VARIABLE.fullmatch(variable_id):
        return problem(404, "NOT_FOUND", "Unknown variable", "Variable IDs run from V01 to V13.")
    if not MONTH.fullmatch(month):
        return problem(422, "INVALID_PARAMETERS", "Invalid month", "Use YYYY-MM.")
    if lat_min >= lat_max or lon_min >= lon_max:
        return problem(
            422,
            "INVALID_PARAMETERS",
            "Invalid box",
            "lat_min must be below lat_max and lon_min below lon_max; no dateline crossing.",
        )
    if variable_id not in STORES:
        return problem(
            409,
            "MODE_UNAVAILABLE",
            "Source not connected",
            f"{variable_id} has no connected data source yet; only {', '.join(STORES)} do.",
        )
    try:
        return build_field_result(
            read_field(variable_id, month, lat_min, lat_max, lon_min, lon_max)
        )
    except FieldRejected as error:
        return problem(422, "INVALID_PARAMETERS", "Box or month rejected", str(error))
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
