"""Layer layout and artifact identity; array decoding/statistics are later tasks."""

from typing import Annotated, Literal, Self

from pydantic import Field, model_validator

from .common import (
    ArtifactRef,
    Baseline,
    BranchId,
    Contract,
    Id,
    MonthlyWindow,
    Number,
    PositiveCount,
    Timestamped,
    Unit,
    VariableId,
    Year,
)
from .scientific import FdrResult


class LayerGrid(Contract):
    grid_id: Id
    n_lat: PositiveCount
    n_lon: PositiveCount
    latitude_order: Literal["north_to_south", "south_to_north"]
    longitude_origin: Annotated[Number, Field(ge=-180, lt=180)]
    longitude_wrap: Literal[True]
    cell_order: Literal["row_major"]
    cell_id_formula: Literal["row * n_lon + column"]


class LayerArray(Contract):
    artifact: ArtifactRef
    dtype: Literal["float32", "int16", "uint16", "uint8"]
    byte_order: Literal["little"]
    count: PositiveCount
    units: Unit
    scale: Number
    offset: Number
    missing_mask: ArtifactRef
    missing_mask_encoding: Literal["uint8_0_valid_1_missing"]
    branch_id: BranchId
    value_transform: Literal["raw", "anomaly", "log10_anomaly"]


class AnnualFrame(Contract):
    year: Year
    anomaly: LayerArray


class LayerManifest(Timestamped):
    layer_id: Id
    data_release_id: Id
    variable_id: VariableId
    binding_ids: Annotated[list[Id], Field(min_length=1)]
    dataset_identifiers: Annotated[list[Id], Field(min_length=1)]
    grid: LayerGrid
    window: MonthlyWindow
    baseline: Baseline
    method_profile: Literal["srs-p0-v1"]
    method_versions: Annotated[dict[Id, Id], Field(min_length=1)]
    slope: LayerArray
    standardized_slope: LayerArray
    p: LayerArray
    q: LayerArray
    valid_counts: LayerArray
    method_flags: LayerArray
    flag_meanings: Annotated[dict[Id, Id], Field(min_length=1)]
    fdr: FdrResult
    alpha_independent_p_q: Literal[True]
    frames: list[AnnualFrame]
    attribution: Annotated[list[str], Field(min_length=1)]
    caveat_ids: list[Id]
    provenance_id: Id

    @model_validator(mode="after")
    def layout(self) -> Self:
        arrays = [
            self.slope,
            self.standardized_slope,
            self.p,
            self.q,
            self.valid_counts,
            self.method_flags,
        ]
        arrays += [frame.anomaly for frame in self.frames]
        if any(array.count != self.grid.n_lat * self.grid.n_lon for array in arrays):
            raise ValueError(
                "every layer/frame array must use the declared cell ordering and count"
            )
        if self.p.units != "dimensionless" or self.q.units != "dimensionless":
            raise ValueError("p/q arrays must have dimensionless units")
        if any(
            array.dtype != "float32" or array.scale != 1 or array.offset != 0
            for array in (self.p, self.q)
        ):
            raise ValueError("p/q arrays use unscaled float32 probabilities")
        if self.p.value_transform != self.q.value_transform:
            raise ValueError("p/q arrays must describe the same transformed estimand")
        if self.variable_id == "V11" and (
            self.slope.units != "mg/m³/decade"
            or self.slope.value_transform == "log10_anomaly"
            or self.p.value_transform != "log10_anomaly"
            or self.standardized_slope.value_transform != "log10_anomaly"
        ):
            raise ValueError(
                "chlorophyll layer must distinguish raw slope from log inference/relief"
            )
        if self.p.branch_id != self.q.branch_id or self.p.branch_id != "annual_layer":
            raise ValueError("global p/q arrays must retain their annual-layer branch identity")
        if self.standardized_slope.units != "sigma/decade" or not self.slope.units.endswith(
            "/decade"
        ):
            raise ValueError("layer slope scales must disclose their per-decade units")
        if self.fdr.family_kind != "global_layer":
            raise ValueError("layer q-values require a whole-layer FDR family")
        context = self.fdr.context
        if (
            context.window != self.window
            or context.baseline != self.baseline
            or context.data_release_id != self.data_release_id
            or context.method_profile != self.method_profile
        ):
            raise ValueError("layer FDR identity must match release/window/baseline/method")
        if self.fdr.size > self.grid.n_lat * self.grid.n_lon:
            raise ValueError("FDR family cannot contain more valid cells than the grid")
        years = [frame.year for frame in self.frames]
        if years != sorted(set(years)):
            raise ValueError("annual frames must be unique and chronologically ordered")
        return self
