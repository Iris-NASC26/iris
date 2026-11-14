"""Retrieved (not analysed) native-cell series with a traceable source record.

This is a data-retrieval result. It carries no trend, significance or regional aggregate and
is not scientific provenance (PV-01): the binding is not admitted and nothing here is validated.
"""

from typing import Annotated, Literal

from pydantic import AwareDatetime, Field

from .common import Contract, Month, Number, PhysicalUnit, Sha256, VariableId, Versioned
from .data import Series


class PointLocation(Contract):
    requested_lat: Number
    requested_lon: Number
    cell_lat: Number
    cell_lon: Number
    cell_lat_step: Number
    cell_lon_step: Number
    selection: Literal["nearest_native_cell"]


class SeriesSource(Contract):
    variable_id: VariableId
    store_title: Annotated[str, Field(min_length=1, max_length=200)]
    store_version: Annotated[str, Field(min_length=1, max_length=100)]
    field: Annotated[str, Field(min_length=1, max_length=100)]
    source_units: Annotated[str, Field(min_length=1, max_length=100)]
    units: PhysicalUnit
    time_standard: Literal["UTC", "LST"]
    data_kind: Literal["model"]
    first_month: Month
    last_finite_month: Month
    declared_end: Annotated[str, Field(max_length=40)]
    missing_months: Annotated[int, Field(strict=True, ge=0)]
    retrieved_at: AwareDatetime
    served_from_cache: bool
    stale_cache: bool
    artifact_sha256: dict[str, Sha256]
    acknowledgement: Annotated[str, Field(max_length=500)]
    caveats: list[Annotated[str, Field(min_length=1, max_length=300)]]
    scientifically_validated: Literal[False]


class PointSeriesResult(Versioned):
    series: Series
    location: PointLocation
    source: SeriesSource


class FieldBox(Contract):
    lat_min: Number
    lat_max: Number
    lon_min: Number
    lon_max: Number
    cell_lat_step: Number
    cell_lon_step: Number
    selection: Literal["native_cells_in_box"]


class FieldSource(Contract):
    variable_id: VariableId
    store_title: Annotated[str, Field(min_length=1, max_length=200)]
    store_version: Annotated[str, Field(min_length=1, max_length=100)]
    field: Annotated[str, Field(min_length=1, max_length=100)]
    source_units: Annotated[str, Field(min_length=1, max_length=100)]
    units: PhysicalUnit
    time_standard: Literal["UTC", "LST"]
    data_kind: Literal["model"]
    retrieved_at: AwareDatetime
    served_from_cache: bool
    stale_cache: bool
    artifact_sha256: dict[str, Sha256]
    acknowledgement: Annotated[str, Field(max_length=500)]
    caveats: list[Annotated[str, Field(min_length=1, max_length=300)]]
    scientifically_validated: Literal[False]


class FieldResult(Versioned):
    """One month's raw native-cell field in a box. No aggregation, trend or analysis."""

    variable_id: VariableId
    month: Month
    box: FieldBox
    cell_lats: list[Number]
    cell_lons: list[Number]
    values: list[Number | None]
    source: FieldSource


class RegionBox(Contract):
    lat_min: Number
    lat_max: Number
    lon_min: Number
    lon_max: Number
    cell_lat_step: Number
    cell_lon_step: Number
    native_cells: Annotated[int, Field(strict=True, ge=1)]
    selection: Literal["area_weighted_mean_native_cells"]


class RegionalSeriesResult(Versioned):
    """Cos(latitude)-weighted monthly mean of a box's native cells. Retrieval, not analysis."""

    series: Series
    box: RegionBox
    source: SeriesSource
