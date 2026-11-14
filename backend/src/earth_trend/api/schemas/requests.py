"""Versioned canonical request shapes, without executing any operation."""

from typing import Annotated, Literal, Self

from pydantic import Field, model_validator

from .common import Alpha, Baseline, Id, MonthlyWindow, VariableId, Versioned
from .regions import RegionSpec


class AnalysisParameters(Versioned):
    window: MonthlyWindow
    baseline: Baseline
    alpha: Alpha
    method_profile: Literal["srs-p0-v1"]
    data_release_id: Id


class AnalysisRequest(AnalysisParameters):
    variable_id: VariableId
    region: RegionSpec


class ScanRequest(AnalysisParameters):
    variable_ids: Annotated[list[VariableId], Field(min_length=1, max_length=13)]
    region: RegionSpec
    window_policy: Literal["shared_intersection", "per_variable_defaults"] = "shared_intersection"

    @model_validator(mode="after")
    def distinct_variables(self) -> Self:
        if len(set(self.variable_ids)) != len(self.variable_ids):
            raise ValueError("scan variable IDs must be unique")
        return self


class ComparisonRequest(AnalysisParameters):
    variable_id: VariableId
    regions: tuple[RegionSpec, RegionSpec]


class OutlookRequest(Versioned):
    analysis_result_id: Id
    projection_horizon_years: Annotated[float, Field(strict=True, gt=0, le=20, allow_inf_nan=False)]
    forecast_horizon_months: Literal[12, 24]

    # The half-record-length cap needs the actual series and is checked in S11/A04.
