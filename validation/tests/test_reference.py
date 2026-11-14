"""Independent F04 arithmetic/applicability evidence; not SM-12 certification."""

import ast
import importlib.util
import inspect
import json
import math
from fractions import Fraction
from itertools import combinations, permutations

import pymannkendall as mk
import pytest
from reference.build_fixtures import TARGET
from reference.build_fixtures import render as render_fixtures
from reference.oracles import (
    ReferenceUnavailable,
    adjacent_month_pairs,
    adjusted_ols_reference,
    adjusted_sen_interval,
    annual_means,
    bh_exact,
    effective_n,
    elapsed_years,
    hamed_rao_complete_reference,
    mann_kendall,
    midpoint_offsets_days,
    monthly_climatology,
    ols_reference,
    sen_iid_interval,
    sen_slope,
    weighted_exact,
)
from reference.run_checks import ROOT, build_report, load_fixtures
from scipy import stats

FIXTURE = load_fixtures()
CASES = {case["id"]: case for case in FIXTURE["cases"]}


def values(name: str) -> tuple[list[float], list[float | None]]:
    case = CASES[name]
    return midpoint_offsets_days(case["calendar_positions"]), case["input_values"]


def test_inputs_are_disclosed_and_reproducible() -> None:
    assert TARGET.read_text(encoding="utf-8").replace("\r\n", "\n") == render_fixtures()
    assert FIXTURE["data_kind"] == "synthetic_not_nasa"
    for case in FIXTURE["cases"] + [FIXTURE["fdr"], FIXTURE["weights"]] + FIXTURE["unit_cases"]:
        for field in (
            "input_values",
            "calendar_positions",
            "units",
            "generation_method",
            "random_seed",
            "expected",
            "expected_source",
            "tolerances",
            "limitations",
        ):
            assert field in case
        assert case["synthetic"] is True
        assert case["limitations"]


def test_reference_environment_and_imports_are_independent() -> None:
    assert importlib.util.find_spec("earth_trend") is None
    for path in (ROOT / "reference").glob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            names = (
                [node.module or ""]
                if isinstance(node, ast.ImportFrom)
                else [a.name for a in node.names]
                if isinstance(node, ast.Import)
                else []
            )
            assert not any(name.startswith(("earth_trend", "backend")) for name in names)


def test_actual_calendar_ruler_and_decade_units() -> None:
    case = CASES["positive-linear"]
    days, observed = values("positive-linear")
    assert days == case["expected"]["midpoint_days"]
    years = elapsed_years(case["calendar_positions"], days_per_year=365.2425)
    assert sen_slope(years, observed) * 10 == pytest.approx(73.0485)
    assert midpoint_offsets_days(["2000-02", "2000-03"]) == [0.0, 30.0]


@pytest.mark.parametrize(
    "name",
    [
        "constant",
        "positive-linear",
        "negative-linear",
        "zero-trend-variable",
        "calendar-gaps",
        "ties-and-iid-rank-ci",
        "outlier",
    ],
)
def test_sen_against_frozen_algebra_and_scipy(name: str) -> None:
    axis, y = values(name)
    expected = float(Fraction(str(CASES[name]["expected"]["sen_per_day"])))
    assert sen_slope(axis, y) == pytest.approx(expected, rel=1e-10, abs=1e-12)
    mask = [i for i, value in enumerate(y) if value is not None]
    independent = stats.theilslopes([y[i] for i in mask], [axis[i] for i in mask])
    assert sen_slope(axis, y) == pytest.approx(independent.slope, abs=1e-12)


def test_missing_positions_are_not_compressed_or_zero_filled() -> None:
    case = CASES["calendar-gaps"]
    axis, y = values("calendar-gaps")
    assert adjacent_month_pairs(case["calendar_positions"], y) == [(2, 3)]
    wrong = sen_slope(list(range(len(y))), y)
    assert not math.isclose(wrong, sen_slope(axis, y))
    assert y[1] is None and y[4] is None
    assert weighted_exact(["1", "1"], ["0", "2"])["mean_fraction"] == "1"


def test_svd_regression_matches_hand_algebra_and_independent_library() -> None:
    axis, y = values("ols-hand-algebra")
    fit = ols_reference(axis, y)
    assert fit.t_statistic is not None and fit.standard_error is not None
    expected = CASES["ols-hand-algebra"]["expected"]
    for key in ("slope", "intercept", "sxx", "sse", "r_squared", "f_statistic"):
        assert getattr(fit, key) == pytest.approx(
            float(Fraction(expected[key])), rel=1e-10, abs=1e-12
        )
    assert fit.f_statistic == pytest.approx(fit.t_statistic**2)
    assert fit.p == pytest.approx(1 - math.sqrt(float(Fraction(expected["r_squared"]))), abs=1e-12)
    result = stats.linregress(axis, y)
    assert fit.slope == pytest.approx(result.slope, abs=1e-12)
    assert fit.standard_error == pytest.approx(result.stderr, abs=1e-12)
    assert fit.p == pytest.approx(result.pvalue, abs=1e-12)
    critical = math.sqrt(2 * 0.95**2 / (1 - 0.95**2))
    assert fit.ci_low == pytest.approx(fit.slope - critical * fit.standard_error, rel=1e-10)
    assert fit.ci_high == pytest.approx(fit.slope + critical * fit.standard_error, rel=1e-10)


@pytest.mark.parametrize("name", ["constant", "positive-linear", "negative-linear"])
def test_degenerate_regression_does_not_publish_infinite_f(name: str) -> None:
    axis, y = values(name)
    result = ols_reference(axis, y)
    assert result.reason == "zero_residual_variance"
    assert result.f_statistic is None and result.p is None and result.ci_low is None


@pytest.mark.parametrize("name", ["constant", "zero-trend-variable", "ties-and-iid-rank-ci"])
def test_mk_pair_counts_ties_and_established_comparator(name: str) -> None:
    _, y = values(name)
    result = mann_kendall(y)
    expected = CASES[name]["expected"]
    assert result["s"] == expected["mk_s"]
    if "mk_variance" in expected:
        assert result["variance"] == float(Fraction(expected["mk_variance"]))
    other = mk.original_test(y)
    assert result["p"] == pytest.approx(other.p, abs=1e-12)
    assert result["variance"] == pytest.approx(other.var_s, abs=1e-12)


def test_normal_mk_is_not_misrepresented_as_exact_permutation_p() -> None:
    observed = [1, 2, 3, 4, 5]
    scores = [
        sum((b > a) - (b < a) for a, b in combinations(order, 2))
        for order in permutations(observed)
    ]
    exact_two_sided = sum(abs(score) >= 10 for score in scores) / math.factorial(5)
    assert exact_two_sided == pytest.approx(1 / 60)
    assert not math.isclose(mann_kendall(observed)["p"], exact_two_sided)


def test_iid_sen_rank_convention_from_exact_sorted_slopes() -> None:
    axis, y = values("ties-and-iid-rank-ci")
    expected = CASES["ties-and-iid-rank-ci"]["expected"]
    numbers = [value for value in y if value is not None]
    assert len(numbers) == 6
    slopes = sorted(
        (Fraction(str(numbers[j])) - Fraction(str(numbers[i])))
        / (Fraction(str(axis[j])) - Fraction(str(axis[i])))
        for i, j in combinations(range(6), 2)
    )
    assert [str(value) for value in slopes] == expected["ordered_slopes"]
    interval = sen_iid_interval(axis, y)
    low, high = expected["iid_95_rank_one_based"]
    assert interval["ci_low"] == pytest.approx(float(slopes[low - 1]), abs=1e-12)
    assert interval["ci_high"] == pytest.approx(float(slopes[high - 1]), abs=1e-12)
    robust = inspect.unwrap(stats.theilslopes).__globals__["_robust_slopes"]
    source = inspect.getsource(robust)
    assert "xp.round" in source and "Rl" in source and "Ru" in source


def test_complete_hr_is_a_limited_comparator_not_a_gap_correction() -> None:
    case = CASES["ar1-no-generating-trend"]
    result = hamed_rao_complete_reference(case["calendar_positions"], case["input_values"])
    assert result["status"] == "PROVISIONAL"
    assert result["diagnostic_alpha"] == 0.05 and result["lag_cap"] == 36
    assert math.isfinite(result["variance"]) and 0 <= result["p"] <= 1
    # This checks wrapper applicability only; it is not independent proof of HR validity.
    independent_score = mann_kendall(case["input_values"])["s"]
    assert result["s"] == independent_score


@pytest.mark.parametrize("name", ["calendar-gaps", "zero-trend-variable"])
def test_hr_refuses_missing_or_nonmonthly_calendar(name: str) -> None:
    case = CASES[name]
    with pytest.raises(ReferenceUnavailable, match="method_unvalidated_for_gaps"):
        hamed_rao_complete_reference(case["calendar_positions"], case["input_values"])


def test_adjusted_sen_interval_remains_blocked() -> None:
    with pytest.raises(ReferenceUnavailable, match="method_validation_required"):
        adjusted_sen_interval()


@pytest.mark.parametrize(
    "observed,reason", [([1.0, 2.0], "insufficient_record"), ([1.0, 1.0, 1.0], "invalid_variance")]
)
def test_hr_unsupported_sample_or_rank_variance_is_explicit(
    observed: list[float], reason: str
) -> None:
    months = [f"2001-{i + 1:02}" for i in range(len(observed))]
    with pytest.raises(ReferenceUnavailable, match=reason):
        hamed_rao_complete_reference(months, observed)


def test_effective_n_uses_supplied_rho_with_conservative_negative_cap() -> None:
    assert effective_n(120, 0.6) == {"n_eff_raw": 30.0, "n_eff": 30.0, "df": 28.0}
    assert effective_n(120, -0.6)["n_eff"] == 120
    axis, y = values("ols-hand-algebra")
    raw = ols_reference(axis, y)
    assert raw.standard_error is not None
    adjusted = adjusted_ols_reference(axis, y, supplied_rho=0.1)
    expected_n = 4 * 0.9 / 1.1
    expected_se = math.sqrt(raw.sse / (expected_n - 2) / raw.sxx)
    assert adjusted["n_eff"] == pytest.approx(expected_n)
    assert adjusted["standard_error"] == pytest.approx(expected_se)
    assert adjusted["standard_error"] > raw.standard_error
    assert adjusted["status"] == "PROVISIONAL"


@pytest.mark.parametrize("rho", [-1.0, 1.0, 2.0, float("nan"), float("inf")])
def test_invalid_dependence_parameters(rho: float) -> None:
    with pytest.raises((ReferenceUnavailable, ValueError)):
        effective_n(120, rho)


def test_effective_df_too_small_is_unavailable() -> None:
    with pytest.raises(ReferenceUnavailable):
        effective_n(120, 0.99)


@pytest.mark.parametrize("name", ["seasonal-cycle", "season-plus-trend"])
def test_monthly_climatology_and_annual_anomalies_against_fixed_values(name: str) -> None:
    case = CASES[name]
    months = case["calendar_positions"]
    result = monthly_climatology(months, case["input_values"], baseline=(months[0], months[-1]))
    assert result["climatology"] == case["expected"]["climatology"]
    assert result["counts"] == case["expected"]["baseline_counts"]
    annual = annual_means(months, result["anomalies"])
    assert [row["value"] for row in annual.values()] == case["expected"]["annual_means"]


def test_baseline_count_and_annual_month_boundaries() -> None:
    case = CASES["season-plus-trend"]
    months, original = case["calendar_positions"], case["input_values"]
    missing = list(original)
    missing[0] = None
    result = monthly_climatology(months, missing, baseline=(months[0], months[-1]))
    assert result["counts"][0] == 4 and result["climatology"][0] is None
    assert all(value is None for value in result["anomalies"][::12])
    assert annual_means(months[:12], [1.0] * 9 + [None] * 3)["2000"]["value"] is None
    assert annual_means(months[:12], [1.0] * 10 + [None] * 2)["2000"]["value"] == 1.0
    # An explicit baseline subset must not use excluded years to fill climatology.
    result = monthly_climatology(months, original, baseline=("2001-01", "2004-12"), min_count=4)
    assert result["climatology"][0] == 3.5


def test_bh_exact_family_exclusions_ties_and_order() -> None:
    family = FIXTURE["fdr"]
    result = bh_exact(family["input_values"])
    assert result["size"] == 4 and result["excluded_indices"] == [4]
    assert result["q_fractions"] == family["expected"]["q_fractions"]
    numeric = [float(Fraction(p)) for p in family["input_values"] if p is not None]
    assert [float(Fraction(q)) for q in result["q_fractions"] if q is not None] == pytest.approx(
        stats.false_discovery_control(numeric)
    )
    assert bh_exact(["0.05", "0.05", None])["q_fractions"] == ["1/20", "1/20", None]
    assert bh_exact([None, None])["size"] == 0
    reversed_family = list(reversed(family["input_values"]))
    assert bh_exact(reversed_family)["q_fractions"] == list(reversed(result["q_fractions"]))


def test_area_weighted_exact_support_and_thresholds() -> None:
    assert weighted_exact(["1", "1/2"], ["10", "20"])["mean_fraction"] == "40/3"
    result = weighted_exact(["1", "1/2"], ["10", None])
    assert result["mean_fraction"] == "10" and result["coverage_fraction"] == "2/3"
    assert Fraction(result["coverage_fraction"]) >= Fraction("0.5")
    assert Fraction(result["coverage_fraction"]) < Fraction("0.7")
    assert weighted_exact(["1", "1/2"], [None, None]) == {
        "mean_fraction": None,
        "coverage_fraction": "0",
        "reason": "insufficient_coverage",
    }
    assert weighted_exact(["1/4", "3/4"], ["7", "7"])["mean_fraction"] == "7"


def test_seeded_ar1_has_documented_generation_not_a_promised_realized_trend() -> None:
    case = CASES["ar1-no-generating-trend"]
    y, innovations = case["input_values"], case["innovations_after_burn_in"]
    assert case["random_seed"] == 20261114
    assert case["expected"]["stationary_variance"] == "25/16"
    for i in range(1, len(y)):
        assert y[i] == 0.6 * y[i - 1] + innovations[i]


@pytest.mark.parametrize(
    "source_units,expected",
    [
        ("K", "0"),
        ("C", "21"),
        ("kg/m²", "1"),
        ("kg/m²/s", "86400"),
        ("mm/hour", "24"),
        ("kg/m² per 3h accumulation", "8"),
    ],
)
def test_fixed_dimensional_unit_references(source_units: str, expected: str) -> None:
    case = next(row for row in FIXTURE["unit_cases"] if row["source_units"] == source_units)
    assert Fraction(case["expected"]) == Fraction(expected)
    assert case["synthetic"] is True and case["calendar_positions"] is None


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), float("-inf"), True])
def test_nonfinite_and_boolean_values_are_not_observations(bad: float) -> None:
    with pytest.raises(ValueError):
        sen_slope([0, 1, 2], [1, bad, 2])
    with pytest.raises(ValueError):
        mann_kendall([1, bad, 2])


@pytest.mark.parametrize(
    "x,y", [([], []), ([0], [1]), ([0, 1], [1, 2]), ([0, 1, 2], [None, None, None])]
)
def test_insufficient_regression_is_explicit(x: list[float], y: list[float | None]) -> None:
    with pytest.raises(ReferenceUnavailable, match="insufficient_record"):
        ols_reference(x, y)


@pytest.mark.parametrize("x,y", [([0, 1], [1]), ([0, 0, 1], [1, 2, 3]), ([2, 1, 0], [1, 2, 3])])
def test_invalid_coordinate_layout_is_rejected(x: list[float], y: list[float]) -> None:
    with pytest.raises(ValueError):
        sen_slope(x, y)


@pytest.mark.parametrize(
    "months", [["2000-13"], ["0000-01"], ["2000-1"], ["2000-02", "2000-01"], ["2000-01", "2000-01"]]
)
def test_invalid_month_axis_is_rejected(months: list[str]) -> None:
    with pytest.raises(ValueError):
        midpoint_offsets_days(months)


@pytest.mark.parametrize("family", [["-0.1"], ["1.01"], ["NaN"], ["Infinity"]])
def test_invalid_fdr_inputs_fail(family: list[str]) -> None:
    with pytest.raises(ValueError):
        bh_exact(family)


@pytest.mark.parametrize(
    "weights,observed",
    [(["-1", "2"], ["1", "2"]), (["0"], ["1"]), (["1"], ["1", "2"]), (["NaN"], ["1"])],
)
def test_invalid_spatial_support_fails(weights: list[str], observed: list[str]) -> None:
    with pytest.raises(ValueError):
        weighted_exact(weights, observed)


def test_paper_transcription_and_gates_do_not_claim_reproduction() -> None:
    facts = json.loads((ROOT / "fixtures/acker-source-facts.json").read_text(encoding="utf-8"))
    assert facts["kind"] == "literature_transcription_not_observations"
    assert len(facts["rows"]) == 10
    for row in facts["rows"]:
        west, south, east, north = row["bbox"]
        assert east - west == pytest.approx(0.5) and north - south == pytest.approx(0.5)
    pearl = next(row for row in facts["rows"] if row["river"] == "Pearl")
    assert pearl["published_slope_sign"] == 1 and pearl["published_monthly_p"] == 0.068
    gates = json.loads((ROOT / "fixtures/method-gates.json").read_text(encoding="utf-8"))
    status = {gate["id"]: gate["status"] for gate in gates["gates"]}
    for method in (
        "HR-GAPS",
        "SEN-ADJUSTED-CI",
        "WEATHERHEAD",
        "ACKER-REPRODUCTION",
        "FULL-CALIBRATION",
    ):
        assert status[method] == "BLOCKED"


def test_report_is_deterministic_honest_and_finite() -> None:
    first, second = build_report(), build_report()
    assert first == second
    json.dumps(first, allow_nan=False)
    assert first["all_reference_checks_passed"] is True
    assert first["full_sm12_monte_carlo"] == "NOT_RUN"
    assert first["nasa_reproduction"] == "NOT_RUN"
    assert first["human_scientific_signoff"] == "PENDING"
