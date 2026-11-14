"""Completed scientific documents, including explicit scientific unavailability."""

import math
from typing import Annotated, Literal, Self

from pydantic import Field, model_validator

from .common import (
    BranchId,
    Contract,
    Count,
    Id,
    Month,
    MonthlyWindow,
    Number,
    PositiveCount,
    Probability,
    Reason,
    Sha256,
    Timestamped,
    Unit,
    VariableId,
    month_index,
)
from .requests import AnalysisRequest, ComparisonRequest, OutlookRequest, ScanRequest
from .scientific import (
    AvailableEstimate,
    AvailableGrade,
    AvailableTest,
    Estimate,
    FdrResult,
    Grade,
    InlineMembership,
    TestResult,
)


class ResultDocument(Timestamped):
    status: Literal["completed"]
    result_id: Id
    request_hash: Sha256
    data_release_id: Id
    mode: Literal["local", "snapshot"]
    evidence_kind: Literal["scientific", "synthetic_contract"]
    provenance_id: Id
    provenance_map: Annotated[dict[str, Id], Field(min_length=1)]
    warnings: list[Id]


class SeriesRef(Contract):
    series_id: Id
    branch_id: BranchId
    provenance_id: Id


class RegressionDiagnostics(Contract):
    r_squared: Probability | None
    reason: Reason | None
    raw_standard_error: Annotated[Number, Field(ge=0)] | None
    adjusted_standard_error: Annotated[Number, Field(ge=0)] | None
    effective_n: Annotated[Number, Field(gt=0)] | None
    provenance_id: Id

    @model_validator(mode="after")
    def missing(self) -> Self:
        if (self.r_squared is None) != (self.reason is not None):
            raise ValueError("R-squared availability requires an explicit null reason")
        return self


class AnalysisBranch(Contract):
    branch_id: BranchId
    series_id: Id
    transform: Literal["raw", "anomaly", "log10_anomaly", "annual_anomaly"]
    frequency: Literal["monthly", "annual"]
    estimates: Annotated[list[Estimate], Field(min_length=1)]
    tests: list[TestResult]
    diagnostics: RegressionDiagnostics | None
    diagnostics_reason: Reason | None

    @model_validator(mode="after")
    def identities(self) -> Self:
        if (self.diagnostics is None) != (self.diagnostics_reason is not None):
            raise ValueError("missing regression diagnostics require an explicit reason")
        identities = [(item.root.quantity, item.root.estimator) for item in self.estimates]
        if len(set(identities)) != len(identities):
            raise ValueError("estimate quantities must be unique per estimator within a branch")
        if self.branch_id in ("monthly_anomaly", "log10_monthly_anomaly") and not {
            ("slope_per_decade", "sen"),
            ("slope_per_decade", "ols"),
        }.issubset(set(identities)):
            raise ValueError(
                "regional anomaly branches must retain separate Sen and OLS slope states"
            )
        if any(item.root.branch_id != self.branch_id for item in self.estimates) or any(
            item.root.branch_id != self.branch_id for item in self.tests
        ):
            raise ValueError("estimate/test branch identity must match its containing branch")
        roles = [test.root.role for test in self.tests]
        if len(set(roles)) != len(roles):
            raise ValueError("test roles must be unique within each branch")
        if self.branch_id == "log10_monthly_anomaly":
            if self.transform != "log10_anomaly" or self.frequency != "monthly":
                raise ValueError("log branch must identify its monthly log-anomaly estimand")
            for estimate in self.estimates:
                if (
                    estimate.root.quantity == "slope_per_decade"
                    and estimate.root.units != "log10(mg/m³)/decade"
                ):
                    raise ValueError("log slope cannot be relabelled as a raw concentration slope")
        if (
            self.branch_id in ("reference_annual_anomaly", "annual_layer")
            and self.frequency != "annual"
        ):
            raise ValueError("annual branches must identify annual sampling")
        for test in self.tests:
            if test.root.role == "reference" and test.root.method.name != "reference_ols_f":
                raise ValueError("reference role must identify the reference OLS F method")
            if test.root.role == "secondary" and test.root.method.name != "ols_ar1_effective_n":
                raise ValueError("secondary role must identify effective-n OLS")
        return self


class SeasonalMonth(Contract):
    month: Annotated[int, Field(strict=True, ge=1, le=12)]
    slope: Estimate
    test: TestResult


class Seasonality(Contract):
    months: Annotated[list[SeasonalMonth], Field(min_length=12, max_length=12)]
    fdr: FdrResult | None
    fdr_reason: Reason | None
    seasonal_kendall: TestResult

    @model_validator(mode="after")
    def months_and_family(self) -> Self:
        if [item.month for item in self.months] != list(range(1, 13)):
            raise ValueError("seasonal fingerprint must retain all twelve ordered calendar months")
        if any(
            item.slope.root.branch_id != "seasonal_month"
            or item.test.root.branch_id != "seasonal_month"
            for item in self.months
        ):
            raise ValueError(
                "monthly seasonal estimates/tests must retain seasonal branch identity"
            )
        if self.seasonal_kendall.root.method.name != "seasonal_kendall":
            raise ValueError("seasonal aggregate must identify Seasonal Kendall explicitly")
        if (self.fdr is None) != (self.fdr_reason is not None):
            raise ValueError("missing seasonal FDR needs a reason")
        if self.fdr is not None:
            if self.fdr.family_kind != "seasonal_fingerprint":
                raise ValueError("seasonal tests need their own FDR family")
            assert isinstance(self.fdr.membership, InlineMembership)
            expected = {
                f"month:{item.month:02}": item.test.root
                for item in self.months
                if isinstance(item.test.root, AvailableTest)
            }
            actual = {member.member_id: member for member in self.fdr.membership.members}
            if set(expected) != set(actual):
                raise ValueError("seasonal FDR membership must match available monthly tests")
            for member_id, test in expected.items():
                if actual[member_id].p != test.p or actual[member_id].branch_id != test.branch_id:
                    raise ValueError("seasonal FDR p/branch identity mismatch")
            excluded = {
                f"month:{item.month:02}": item.test.root.reason
                for item in self.months
                if not isinstance(item.test.root, AvailableTest)
            }
            if excluded != {item.member_id: item.reason for item in self.fdr.membership.exclusions}:
                raise ValueError("seasonal FDR exclusions must retain missing monthly tests")
        return self


class Emergence(Contract):
    k: Literal[1, 2]
    estimate: Estimate


class Detectability(Contract):
    horizon: Estimate
    years_still_needed: Estimate
    emergence: Annotated[list[Emergence], Field(min_length=2, max_length=2)]
    first_valid_month: Month | None
    noise_units: Unit
    significance_alpha: Annotated[Number, Field(ge=0.05, le=0.05)]
    detection_probability: Annotated[Number, Field(ge=0.9, le=0.9)]
    label: Literal["if the trend continues"]

    @model_validator(mode="after")
    def emergence_identity(self) -> Self:
        if [item.k for item in self.emergence] != [1, 2]:
            raise ValueError("emergence must identify both k=1 and k=2 in order")
        estimates = [self.horizon, self.years_still_needed] + [
            item.estimate for item in self.emergence
        ]
        if (
            any(isinstance(item.root, AvailableEstimate) for item in estimates)
            and self.first_valid_month is None
        ):
            raise ValueError("available detectability/emergence requires the first valid month")
        return self


class AnalysisResult(ResultDocument):
    request: AnalysisRequest
    binding_id: Id
    physical_units: Unit
    scale_type: Literal["interval", "ratio", "index"]
    analysis_status: Literal["available", "unavailable"]
    reason: Reason | None
    series_refs: Annotated[list[SeriesRef], Field(min_length=1)]
    branches: Annotated[list[AnalysisBranch], Field(min_length=1)]
    primary_branch: BranchId
    fdr: FdrResult | None
    fdr_reason: Reason | None
    seasonality: Seasonality | None
    seasonality_reason: Reason | None
    grade: Grade
    caveat_ids: list[Id]
    detectability: Detectability

    @model_validator(mode="after")
    def coherent_result(self) -> Self:
        if self.request.data_release_id != self.data_release_id:
            raise ValueError("request and result source releases must match")
        branches = {branch.branch_id: branch for branch in self.branches}
        if len(branches) != len(self.branches) or self.primary_branch not in branches:
            raise ValueError("branches must be distinct and include the primary branch")
        refs = {(ref.series_id, ref.branch_id) for ref in self.series_refs}
        if len(refs) != len(self.series_refs) or any(
            (branch.series_id, branch.branch_id) not in refs for branch in self.branches
        ):
            raise ValueError("every branch must identify an unambiguous series reference")
        primary_tests = [
            t.root for t in branches[self.primary_branch].tests if t.root.role == "primary"
        ]
        if len(primary_tests) != 1:
            raise ValueError("primary branch must contain exactly one primary test")
        primary = primary_tests[0]
        if primary.method.name != "hamed_rao_mk":
            raise ValueError(
                "regional primary significance uses Hamed-Rao, not the reference method"
            )
        if self.analysis_status == "available":
            if self.reason is not None or not isinstance(primary, AvailableTest):
                raise ValueError(
                    "available analysis needs available primary inference and no reason"
                )
        elif self.reason is None or isinstance(self.grade.root, AvailableGrade):
            raise ValueError(
                "unavailable analysis needs a reason and cannot publish an evidence grade"
            )
        for branch in self.branches:
            for test in branch.tests:
                if (
                    self.evidence_kind == "scientific"
                    and test.root.method.validation_status == "synthetic_contract"
                ):
                    raise ValueError(
                        "synthetic method evidence cannot authenticate a scientific result"
                    )
            for estimate in branch.estimates:
                item = estimate.root
                if isinstance(item, AvailableEstimate):
                    if item.confidence_level is not None and not math.isclose(
                        item.confidence_level, 1 - self.request.alpha, abs_tol=1e-12
                    ):
                        raise ValueError("confidence level must match 1-alpha")
                    if item.quantity == "percent_change_per_decade" and self.scale_type != "ratio":
                        raise ValueError("interval/index variables cannot publish percent changes")
        if (self.fdr is None) != (self.fdr_reason is not None):
            raise ValueError("standalone cases must explain absence of an FDR context")
        if self.fdr is not None:
            family = self.fdr
            if family.family_kind != "regional_scan" or not isinstance(
                family.membership, InlineMembership
            ):
                raise ValueError("Case Board q must retain its regional-scan family identity")
            if (
                family.context.baseline != self.request.baseline
                or family.context.data_release_id != self.data_release_id
                or family.context.method_profile != self.request.method_profile
            ):
                raise ValueError("FDR context must match the analysis request")
            if (
                family.context.window_policy == "shared_intersection"
                and family.context.window != self.request.window
            ):
                raise ValueError("shared-window FDR context must match analysis dates")
            if (
                family.context.window_policy == "per_variable_defaults"
                and "different_windows" not in self.warnings
            ):
                raise ValueError("a case from a different-windows scan must preserve its warning")
            members = [
                m for m in family.membership.members if m.member_id == self.request.variable_id
            ]
            if len(members) != 1 or not isinstance(primary, AvailableTest):
                raise ValueError("scan context must include this case's valid primary test")
            if members[0].branch_id != self.primary_branch or members[0].p != primary.p:
                raise ValueError("scan FDR member must retain the exact primary branch and p-value")
            if members[0].actual_window != self.request.window:
                raise ValueError("scan FDR member must preserve this case's actual window")
        if (self.seasonality is None) != (self.seasonality_reason is not None):
            raise ValueError("absent seasonality must have a reason")
        if self.seasonality is not None and self.seasonality.fdr is not None:
            context = self.seasonality.fdr.context
            if (
                context.window != self.request.window
                or context.baseline != self.request.baseline
                or context.data_release_id != self.data_release_id
            ):
                raise ValueError("seasonal FDR context must match its parent analysis")
        return self


class VariableCoverage(Contract):
    variable_id: VariableId
    coverage: Probability | None
    reason: Reason | None

    @model_validator(mode="after")
    def known(self) -> Self:
        if (self.coverage is None) != (self.reason is not None):
            raise ValueError("unknown coverage requires an explicit reason")
        return self


class RegionSummary(Contract):
    region_hash: Sha256
    area_km2: Annotated[Number, Field(gt=0)]
    cell_count: Count
    land_fraction: Probability | None
    ocean_fraction: Probability | None
    fractions_reason: Reason | None
    coverage: list[VariableCoverage]
    opposite_trends_warning: bool
    provenance_id: Id

    @model_validator(mode="after")
    def fractions(self) -> Self:
        if self.land_fraction is None or self.ocean_fraction is None:
            if (
                self.land_fraction is not None
                or self.ocean_fraction is not None
                or self.fractions_reason is None
            ):
                raise ValueError("unknown land/ocean fractions must both be null with a reason")
        elif self.fractions_reason is not None or not math.isclose(
            self.land_fraction + self.ocean_fraction, 1, abs_tol=1e-9
        ):
            raise ValueError("known land/ocean fractions must sum to one and have no reason")
        return self


class AnalysedRow(Contract):
    status: Literal["analysed"]
    variable_id: VariableId
    result_id: Id
    actual_window: MonthlyWindow
    primary_test: AvailableTest
    standardized_slope: Estimate
    grade: Grade


class ExcludedRow(Contract):
    status: Literal["excluded"]
    variable_id: VariableId
    actual_window: MonthlyWindow | None
    result_id: None
    reason: Reason


class ScanResult(ResultDocument):
    request: ScanRequest
    region_summary: RegionSummary
    rows: list[Annotated[AnalysedRow | ExcludedRow, Field(discriminator="status")]]
    fdr: FdrResult | None
    fdr_reason: Reason | None
    sorting_policy: Literal["absolute_standardized_slope_desc"]

    @model_validator(mode="after")
    def rows_and_family(self) -> Self:
        ids = [row.variable_id for row in self.rows]
        if len(set(ids)) != len(ids) or set(ids) != set(self.request.variable_ids):
            raise ValueError("scan must retain exactly one row for every requested variable")
        if self.data_release_id != self.request.data_release_id:
            raise ValueError("scan release must match request")
        if self.request.window_policy == "shared_intersection":
            if any(
                row.actual_window != self.request.window
                for row in self.rows
                if isinstance(row, AnalysedRow)
            ):
                raise ValueError("shared-window rows must not silently use different dates")
        elif "different_windows" not in self.warnings:
            raise ValueError("per-variable default windows require a different_windows warning")
        available = {row.variable_id: row for row in self.rows if isinstance(row, AnalysedRow)}
        if self.evidence_kind == "scientific" and any(
            row.primary_test.method.validation_status != "validated" for row in available.values()
        ):
            raise ValueError("scientific scans cannot authenticate synthetic method evidence")
        if not available:
            if self.fdr is not None or self.fdr_reason is None:
                raise ValueError("all-excluded scans must explain absence of an FDR family")
        else:
            if self.fdr is None or self.fdr_reason is not None:
                raise ValueError("analysed rows require their complete FDR family")
            family = self.fdr
            if family.family_kind != "regional_scan" or not isinstance(
                family.membership, InlineMembership
            ):
                raise ValueError("scan q-values require a regional_scan family")
            if (
                family.context.region_hash != self.region_summary.region_hash
                or family.context.window != self.request.window
                or family.context.baseline != self.request.baseline
                or family.context.data_release_id != self.data_release_id
                or family.context.method_profile != self.request.method_profile
                or family.context.window_policy != self.request.window_policy
            ):
                raise ValueError("scan FDR context must match request and region")
            members = {member.member_id: member for member in family.membership.members}
            if set(members) != set(available):
                raise ValueError(
                    "FDR family must include every analysed row, independent of sorting"
                )
            for member_id, row in available.items():
                if members[member_id].actual_window != row.actual_window:
                    raise ValueError("FDR member must retain its row's actual window")
                if (
                    members[member_id].p != row.primary_test.p
                    or members[member_id].branch_id != row.primary_test.branch_id
                ):
                    raise ValueError("scan member p/branch must match the row's primary test")
            excluded = {
                row.variable_id: row.reason for row in self.rows if isinstance(row, ExcludedRow)
            }
            family_excluded = {item.member_id: item.reason for item in family.membership.exclusions}
            if excluded != family_excluded:
                raise ValueError(
                    "scan FDR exclusions must retain every excluded row and its reason"
                )
        return self


class Quantiles(Contract):
    time: Month
    lower95: Number
    lower80: Number
    median: Number
    upper80: Number
    upper95: Number

    @model_validator(mode="after")
    def nested(self) -> Self:
        if not self.lower95 <= self.lower80 <= self.median <= self.upper80 <= self.upper95:
            raise ValueError("pointwise 80%/95% quantiles must be ordered and nested")
        return self


class SkillMetrics(Contract):
    decision: Literal["passed", "failed", "unavailable"]
    reason: Reason | None
    candidate_mae: Annotated[Number, Field(ge=0)] | None
    seasonal_naive_mae: Annotated[Number, Field(ge=0)] | None
    climatology_mae: Annotated[Number, Field(ge=0)] | None
    mase: Annotated[Number, Field(ge=0)] | None
    coverage80: Probability | None
    coverage95: Probability | None
    origins: Count
    targets: Count
    window: MonthlyWindow
    provenance_id: Id

    @model_validator(mode="after")
    def decision_values(self) -> Self:
        values = (
            self.candidate_mae,
            self.seasonal_naive_mae,
            self.climatology_mae,
            self.mase,
            self.coverage80,
            self.coverage95,
        )
        if self.decision == "unavailable":
            if self.reason is None or any(value is not None for value in values):
                raise ValueError("unavailable skill requires a reason and null metrics")
        elif any(value is None for value in values) or (
            self.decision == "passed" and self.reason is not None
        ):
            raise ValueError(
                "evaluated skill requires complete metrics; passed has no failure reason"
            )
        elif self.decision == "failed" and self.reason is None:
            raise ValueError("failed skill requires a reason")
        return self


class AvailableProjection(Contract):
    status: Literal["available"]
    reason: None
    label: Literal["Not a prediction"]
    model: Literal["trend_seasonality_ar1"]
    model_version: Id
    validation_report_id: Id
    branch_id: BranchId
    seed: Count
    simulation_paths: Literal[2000]
    horizon_months: Annotated[int, Field(strict=True, ge=1, le=240)]
    units: Unit
    quantiles: Annotated[list[Quantiles], Field(min_length=1, max_length=240)]
    provenance_id: Id


class UnavailableProjection(Contract):
    status: Literal["unavailable"]
    reason: Reason
    label: Literal["Not a prediction"]
    quantiles: None
    provenance_id: Id


class AvailableForecast(Contract):
    status: Literal["available"]
    reason: None
    label: Literal["Statistical forecast"]
    model: Literal["trend_seasonality_ar1"]
    model_version: Id
    validation_report_id: Id
    branch_id: BranchId
    seed: Count
    horizon_months: Literal[12, 24]
    units: Unit
    quantiles: Annotated[list[Quantiles], Field(min_length=12, max_length=24)]
    skill: SkillMetrics
    provenance_id: Id

    @model_validator(mode="after")
    def skill_passed(self) -> Self:
        if self.skill.decision != "passed":
            raise ValueError("available forecast requires a passed skill decision")
        return self


class UnavailableForecast(Contract):
    status: Literal["unavailable"]
    reason: Reason
    label: Literal["Statistical forecast"]
    quantiles: None
    skill: SkillMetrics
    provenance_id: Id


class OutlookResult(ResultDocument):
    request: OutlookRequest
    historical_window: MonthlyWindow
    record_length_years: Annotated[Number, Field(gt=0)]
    projection: Annotated[
        AvailableProjection | UnavailableProjection, Field(discriminator="status")
    ]
    forecast: Annotated[AvailableForecast | UnavailableForecast, Field(discriminator="status")]

    @model_validator(mode="after")
    def horizons(self) -> Self:
        for part in (self.projection, self.forecast):
            if isinstance(part, (AvailableProjection, AvailableForecast)):
                if len(part.quantiles) != part.horizon_months:
                    raise ValueError("quantile count must match the horizon")
                positions = [month_index(row.time) for row in part.quantiles]
                expected = list(
                    range(
                        month_index(self.historical_window.end) + 1,
                        month_index(self.historical_window.end) + 1 + part.horizon_months,
                    )
                )
                if positions != expected:
                    raise ValueError(
                        "Outlook dates must follow history in complete calendar months"
                    )
        if isinstance(self.projection, AvailableProjection):
            cap = min(20, self.record_length_years / 2, self.request.projection_horizon_years)
            if self.projection.horizon_months > cap * 12:
                raise ValueError("projection exceeds requested or half-record-length horizon cap")
        if isinstance(self.forecast, AvailableForecast):
            if self.forecast.horizon_months != self.request.forecast_horizon_months:
                raise ValueError("forecast horizon must match the requested horizon")
        return self


class ComparedResult(Contract):
    result_id: Id
    binding_id: Id
    variable_id: VariableId
    branch_id: BranchId
    window: MonthlyWindow
    slope: Estimate


class PairedBootstrap(Contract):
    method: Literal["paired_moving_block_residual_bootstrap"]
    method_version: Id
    draws: PositiveCount
    block_months: PositiveCount
    seed: Count
    validation_report_id: Id | None


class ComparisonResult(ResultDocument):
    request: ComparisonRequest
    left: ComparedResult
    right: ComparedResult
    common_window: MonthlyWindow
    common_support: Annotated[list[Month], Field(max_length=600)]
    difference: Estimate
    bootstrap: PairedBootstrap

    @model_validator(mode="after")
    def common_estimand(self) -> Self:
        if self.data_release_id != self.request.data_release_id:
            raise ValueError("comparison release must match request")
        if self.common_window != self.request.window:
            raise ValueError("comparison must retain the requested common window")
        for side in (self.left, self.right):
            if side.variable_id != self.request.variable_id or side.window != self.common_window:
                raise ValueError("comparison needs one variable and one common window")
            if side.branch_id != side.slope.root.branch_id:
                raise ValueError("individual slope branch must match its result reference")
            if side.slope.root.quantity != "slope_per_decade":
                raise ValueError("comparison inputs must identify per-decade slopes")
        if (
            self.left.binding_id != self.right.binding_id
            or self.left.branch_id != self.right.branch_id
        ):
            raise ValueError("paired comparison must use the same product binding and branch")
        if len(set(self.common_support)) != len(
            self.common_support
        ) or self.common_support != sorted(self.common_support):
            raise ValueError("common valid calendar support must be unique and ordered")
        if any(
            time < self.common_window.start or time > self.common_window.end
            for time in self.common_support
        ):
            raise ValueError("common support lies outside the common window")
        if (
            len(
                {
                    self.left.slope.root.units,
                    self.right.slope.root.units,
                    self.difference.root.units,
                }
            )
            != 1
        ):
            raise ValueError("individual and difference slope units must match")
        if self.difference.root.branch_id != self.left.branch_id:
            raise ValueError("difference must preserve branch identity")
        if (
            self.difference.root.quantity != "slope_per_decade"
            or self.difference.root.estimator != "derived"
        ):
            raise ValueError("difference must identify a derived per-decade slope difference")
        if (
            self.left.slope.root.estimator != self.right.slope.root.estimator
            or self.left.slope.root.estimator_version != self.right.slope.root.estimator_version
        ):
            raise ValueError("comparison must use the same versioned slope estimator on both sides")
        if (
            isinstance(self.difference.root, AvailableEstimate)
            and self.difference.root.ci_low is not None
        ):
            if self.bootstrap.validation_report_id is None:
                raise ValueError("published paired CI needs its method-validation reference")
            if not math.isclose(self.difference.root.confidence_level or 0, 1 - self.request.alpha):
                raise ValueError("paired CI confidence must match 1-alpha")
        return self
