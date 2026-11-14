"""Shared wire types. Constraints describe structure, not scientific eligibility."""

from datetime import timedelta
from typing import Annotated, Literal, Self

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

Id = Annotated[str, Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")]
Sha256 = Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]
Month = Annotated[
    str,
    Field(pattern=r"^(?:[1-9][0-9]{3}|0[1-9][0-9]{2}|00[1-9][0-9]|000[1-9])-(?:0[1-9]|1[0-2])$"),
]
Year = Annotated[str, Field(pattern=r"^(?:[1-9][0-9]{3}|0[1-9][0-9]{2}|00[1-9][0-9]|000[1-9])$")]
Number = Annotated[float, Field(strict=True, allow_inf_nan=False)]
Probability = Annotated[Number, Field(ge=0, le=1)]
Confidence = Annotated[Number, Field(gt=0, lt=1)]
Alpha = Annotated[Number, Field(ge=0.01, le=0.10)]
Count = Annotated[int, Field(strict=True, ge=0)]
PositiveCount = Annotated[int, Field(strict=True, gt=0)]
VariableId = Literal[
    "V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10", "V11", "V12", "V13"
]
PhysicalUnit = Literal[
    "°C", "mm/day", "mm", "10^15 molecules/cm²", "dimensionless", "mg/m³", "W/m²"
]
Unit = (
    PhysicalUnit
    | Literal[
        "log10(mg/m³)",
        "°C/decade",
        "mm/day/decade",
        "mm/decade",
        "10^15 molecules/cm²/decade",
        "dimensionless/decade",
        "mg/m³/decade",
        "W/m²/decade",
        "log10(mg/m³)/decade",
        "%/decade",
        "sigma/decade",
        "years",
        "fractional_year",
        "km²",
    ]
)
BranchId = Literal[
    "raw_monthly",
    "monthly_anomaly",
    "log10_monthly_anomaly",
    "reference_raw_monthly",
    "reference_annual_anomaly",
    "annual_layer",
    "seasonal_month",
]
Reason = Literal[
    "missing_observation",
    "insufficient_coverage",
    "insufficient_record",
    "outside_product_domain",
    "unknown_coverage",
    "unknown_units",
    "invalid_variance",
    "zero_or_unresolved_slope",
    "zero_residual_variance",
    "interval_scale_variable",
    "index_variable",
    "near_zero_mean",
    "method_validation_required",
    "method_unvalidated_for_gaps",
    "insufficient_lag_pairs",
    "insufficient_baseline",
    "no_forecast_skill",
    "insufficient_backtest_origins",
    "nonstationary_residuals",
    "unsupported_transform",
    "snapshot_not_bundled",
    "not_implemented",
    "not_requested",
    "no_fdr_context",
    "insufficient_contiguous_blocks",
    "no_eligible_tests",
    "provider_progress_unknown",
]


class Contract(BaseModel):
    model_config = ConfigDict(
        extra="forbid", strict=True, allow_inf_nan=False, validate_default=True
    )


class Versioned(Contract):
    schema_version: Literal["1.0"]


def month_index(month: str) -> int:
    """Calendar position for structural ordering only; not a statistical time axis."""
    return int(month[:4]) * 12 + int(month[5:]) - 1


class MonthlyWindow(Contract):
    """Inclusive complete calendar months, bounded by the TDD's 600-position limit."""

    start: Month
    end: Month

    @model_validator(mode="after")
    def ordered(self) -> Self:
        size = month_index(self.end) - month_index(self.start) + 1
        if not 1 <= size <= 600:
            raise ValueError("window must contain 1 through 600 inclusive monthly positions")
        return self


class WindowBaseline(Contract):
    kind: Literal["analysis_window"]


class ExplicitBaseline(Contract):
    kind: Literal["explicit"]
    window: MonthlyWindow


Baseline = Annotated[WindowBaseline | ExplicitBaseline, Field(discriminator="kind")]


class Timestamped(Versioned):
    created_at: AwareDatetime

    @field_validator("created_at")
    @classmethod
    def utc_only(cls, value: AwareDatetime) -> AwareDatetime:
        if value.utcoffset() != timedelta(0):
            raise ValueError("timestamps must use UTC")
        return value


class ArtifactRef(Contract):
    artifact_id: Id
    sha256: Sha256
    path: Annotated[str, Field(pattern=r"^/artifacts/[A-Za-z0-9/_.-]+$")]
    media_type: Annotated[str, Field(min_length=1, max_length=100)]
    bytes: Count

    @field_validator("path")
    @classmethod
    def no_traversal(cls, value: str) -> str:
        if any(part in (".", "..", "") for part in value.removeprefix("/").split("/")):
            raise ValueError("artifact paths must be local and contain no traversal segments")
        return value
