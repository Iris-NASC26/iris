"""Scientific value contracts. No estimators, tests or FDR calculations run here."""

from typing import Annotated, Literal, Self

from pydantic import Field, RootModel, model_validator

from .common import (
    ArtifactRef,
    Baseline,
    BranchId,
    Confidence,
    Contract,
    Count,
    Id,
    MonthlyWindow,
    Number,
    PositiveCount,
    Probability,
    Reason,
    Sha256,
    Unit,
)

Quantity = Literal[
    "slope_per_decade",
    "percent_change_per_decade",
    "standardized_slope_per_decade",
    "mean",
    "residual_sd",
    "ols_standard_error",
    "detectability_horizon_years",
    "emergence_year",
]


class EstimateIdentity(Contract):
    quantity: Quantity
    units: Unit
    branch_id: BranchId
    estimator: Literal["sen", "ols", "derived"]
    estimator_version: Id
    provenance_id: Id


class AvailableEstimate(EstimateIdentity):
    status: Literal["available"]
    value: Number
    reason: None
    ci_low: Number | None
    ci_high: Number | None
    confidence_level: Confidence | None
    ci_method: Id | None
    ci_method_version: Id | None
    ci_reason: Reason | None

    @model_validator(mode="after")
    def interval(self) -> Self:
        fields = (
            self.ci_low,
            self.ci_high,
            self.confidence_level,
            self.ci_method,
            self.ci_method_version,
        )
        if all(value is None for value in fields):
            if self.ci_reason is None:
                raise ValueError("an absent CI needs an explicit ci_reason")
        elif any(value is None for value in fields) or self.ci_reason is not None:
            raise ValueError(
                "a CI needs both bounds, confidence, versioned method and no ci_reason"
            )
        elif self.ci_low is not None and self.ci_high is not None and self.ci_low > self.ci_high:
            raise ValueError("CI lower bound must not exceed upper bound")
        if self.quantity == "percent_change_per_decade" and self.units != "%/decade":
            raise ValueError("percent change requires %/decade units")
        if self.quantity == "standardized_slope_per_decade" and self.units != "sigma/decade":
            raise ValueError("standardized slope requires sigma/decade units")
        if self.quantity == "slope_per_decade" and not self.units.endswith("/decade"):
            raise ValueError("a per-decade slope needs explicit per-decade units")
        if (
            self.quantity in ("residual_sd", "ols_standard_error", "detectability_horizon_years")
            and self.value < 0
        ):
            raise ValueError("scales, standard errors and horizons cannot be negative")
        if self.quantity == "detectability_horizon_years" and self.units != "years":
            raise ValueError("detectability horizons must use years")
        if self.quantity == "emergence_year" and self.units != "fractional_year":
            raise ValueError("emergence must retain its fractional-year scale")
        return self


class UnavailableEstimate(EstimateIdentity):
    status: Literal["unavailable", "unbounded"]
    value: None
    reason: Reason
    ci_low: None
    ci_high: None
    confidence_level: None
    ci_method: None
    ci_method_version: None
    ci_reason: Reason

    @model_validator(mode="after")
    def unbounded_horizon(self) -> Self:
        if self.status == "unbounded" and (
            self.quantity != "detectability_horizon_years"
            or self.reason != "zero_or_unresolved_slope"
        ):
            raise ValueError("unbounded is reserved for the unresolved-slope detectability horizon")
        return self


class Estimate(
    RootModel[
        Annotated[
            AvailableEstimate | UnavailableEstimate,
            Field(discriminator="status"),
        ]
    ]
):
    pass


class Method(Contract):
    name: Literal[
        "hamed_rao_mk",
        "ols_ar1_effective_n",
        "reference_ols_f",
        "ordinary_mk",
        "seasonal_kendall",
    ]
    version: Id
    validation_status: Literal["pending", "validated", "failed", "synthetic_contract"]
    validation_report_id: Id | None

    @model_validator(mode="after")
    def report(self) -> Self:
        if self.validation_status == "validated" and self.validation_report_id is None:
            raise ValueError("validated methods must identify the validation report")
        if (
            self.validation_status in ("pending", "synthetic_contract")
            and self.validation_report_id
        ):
            raise ValueError("pending/synthetic methods cannot claim validation reports")
        return self


class LagParameters(Contract):
    max_lag: Count
    included_lags: list[PositiveCount]
    diagnostic_alpha: Annotated[Number, Field(ge=0.05, le=0.05)]
    spacing: Literal["calendar_months", "calendar_years"]
    gap_policy: Literal["calendar_positions"]

    @model_validator(mode="after")
    def included(self) -> Self:
        if len(set(self.included_lags)) != len(self.included_lags):
            raise ValueError("included lags must be distinct")
        if any(lag > self.max_lag for lag in self.included_lags):
            raise ValueError("included lag exceeds the recorded lag cap")
        return self


class TestIdentity(Contract):
    branch_id: BranchId
    role: Literal["primary", "secondary", "reference", "seasonal"]
    method: Method
    valid_n: Count
    provenance_id: Id


class AvailableTest(TestIdentity):
    status: Literal["available"]
    p: Probability
    statistic: Number
    df_numerator: Annotated[Number, Field(gt=0)] | None
    df_denominator: Annotated[Number, Field(gt=0)] | None
    effective_n: Annotated[Number, Field(gt=2)] | None
    lags: LagParameters | None
    reason: None

    @model_validator(mode="after")
    def method_gate(self) -> Self:
        if self.method.validation_status not in ("validated", "synthetic_contract"):
            raise ValueError("unvalidated methods cannot publish inferential values")
        if self.valid_n < 3:
            raise ValueError("an available test needs at least three valid observations")
        if self.effective_n is not None and self.effective_n > self.valid_n:
            raise ValueError("effective_n cannot exceed the actual sample count")
        if self.method.name == "ols_ar1_effective_n" and (
            self.effective_n is None or self.df_denominator is None
        ):
            raise ValueError("adjusted OLS must report effective_n and denominator df")
        if self.method.name == "reference_ols_f" and (
            self.df_numerator != 1 or self.df_denominator is None
        ):
            raise ValueError(
                "single-predictor reference F test needs numerator df=1 and denominator df"
            )
        if self.method.name == "hamed_rao_mk" and self.lags is None:
            raise ValueError("Hamed-Rao results must disclose lag parameters")
        if self.method.name == "ols_ar1_effective_n" and self.effective_n is not None:
            if self.df_denominator != self.effective_n - 2:
                raise ValueError("adjusted OLS denominator df must match effective_n minus two")
        if self.method.name == "reference_ols_f" and self.df_denominator != self.valid_n - 2:
            raise ValueError("reference denominator df must match valid_n minus two")
        return self


class UnavailableTest(TestIdentity):
    status: Literal["unavailable"]
    p: None
    statistic: None
    df_numerator: None
    df_denominator: None
    effective_n: None
    lags: LagParameters | None
    reason: Reason


class TestResult(
    RootModel[
        Annotated[
            AvailableTest | UnavailableTest,
            Field(discriminator="status"),
        ]
    ]
):
    pass


class FdrContext(Contract):
    region_hash: Sha256
    window: MonthlyWindow
    baseline: Baseline
    data_release_id: Id
    method_profile: Literal["srs-p0-v1"]
    window_policy: Literal["shared_intersection", "per_variable_defaults"] = "shared_intersection"


class FdrMember(Contract):
    member_id: Id
    branch_id: BranchId
    p: Probability
    q: Probability
    provenance_id: Id
    actual_window: MonthlyWindow


class Exclusion(Contract):
    member_id: Id
    reason: Reason


class InlineMembership(Contract):
    kind: Literal["inline"]
    members: Annotated[list[FdrMember], Field(min_length=1, max_length=13)]
    exclusions: list[Exclusion]

    @model_validator(mode="after")
    def distinct(self) -> Self:
        included = [member.member_id for member in self.members]
        excluded = [member.member_id for member in self.exclusions]
        if len(set(included + excluded)) != len(included + excluded):
            raise ValueError("FDR included/excluded identities must be unique and disjoint")
        return self


class ArtifactMembership(Contract):
    """Complete global family membership is retained in checksummed artifacts."""

    kind: Literal["artifact"]
    members: ArtifactRef
    exclusions: ArtifactRef


class FdrResult(Contract):
    family_kind: Literal["regional_scan", "seasonal_fingerprint", "global_layer"]
    family_id: Sha256
    size: PositiveCount
    context: FdrContext
    membership: Annotated[InlineMembership | ArtifactMembership, Field(discriminator="kind")]

    @model_validator(mode="after")
    def family(self) -> Self:
        if isinstance(self.membership, InlineMembership):
            if self.size != len(self.membership.members):
                raise ValueError("FDR size must count included valid tests only")
            if self.family_kind == "global_layer":
                raise ValueError("global families require checksummed full membership artifacts")
            if self.family_kind == "seasonal_fingerprint" and self.size > 12:
                raise ValueError("seasonal FDR has at most twelve included months")
            if self.context.window_policy == "shared_intersection" and any(
                member.actual_window != self.context.window for member in self.membership.members
            ):
                raise ValueError("shared-window FDR members must preserve the family window")
        elif self.family_kind != "global_layer":
            raise ValueError("regional and seasonal families require inline membership")
        if (
            self.family_kind != "regional_scan"
            and self.context.window_policy != "shared_intersection"
        ):
            raise ValueError("seasonal/global families use one shared window")
        return self


class AvailableGrade(Contract):
    status: Literal["available"]
    value: Literal["A", "B", "C", "D"]
    reasons: Annotated[list[Id], Field(min_length=1)]
    provenance_id: Id


class UnavailableGrade(Contract):
    status: Literal["unavailable"]
    value: None
    reasons: Annotated[list[Reason], Field(min_length=1)]
    provenance_id: Id


class Grade(
    RootModel[
        Annotated[
            AvailableGrade | UnavailableGrade,
            Field(discriminator="status"),
        ]
    ]
):
    pass
