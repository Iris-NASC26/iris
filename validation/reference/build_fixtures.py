"""Rebuild explicitly synthetic inputs; expected constants never call the oracles.

Use --check for a non-mutating reproducibility check. Fixed random inputs are not
selected for significance, power, sign or agreement with a method under test.
"""

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np

TARGET = Path(__file__).resolve().parents[1] / "fixtures" / "synthetic-v1.json"


def labels(start_year: int, count: int) -> list[str]:
    return [f"{start_year + i // 12:04}-{i % 12 + 1:02}" for i in range(count)]


def case(
    name: str,
    values: Any,
    months: list[str] | None,
    units: str,
    generation: str,
    expected: dict[str, Any],
    source: str,
    limitations: str,
    seed: int | None = None,
) -> dict[str, Any]:
    return {
        "id": name,
        "synthetic": True,
        "input_values": values,
        "calendar_positions": months,
        "units": units,
        "generation_method": generation,
        "random_seed": seed,
        "expected": expected,
        "expected_source": source,
        "tolerances": {"absolute": 1e-12, "relative": 1e-10},
        "limitations": limitations,
    }


def document() -> dict[str, Any]:
    months = labels(2001, 6)
    # Hand calendar offsets from January 16 12:00 in a non-leap year.
    days = [0.0, 29.5, 59.0, 89.5, 120.0, 150.5]
    scope = "Short mathematical fixture, not a P0-eligible environmental record."
    cases = [
        case(
            "constant",
            [4.0] * 6,
            months,
            "mm",
            "Six identical synthetic observations.",
            {"sen_per_day": 0.0, "ols_slope_per_day": 0.0, "mk_s": 0, "mk_p": 1.0},
            "All pairwise differences and rank scores are exactly zero.",
            scope + " OLS variance/inference are degenerate; MK p=1 is the all-ties convention.",
        ),
        case(
            "positive-linear",
            [1.0, 1.59, 2.18, 2.79, 3.4, 4.01],
            months,
            "mm",
            "y = 1 + 0.02 * elapsed midpoint days, using the hand-tabulated calendar ruler.",
            {
                "midpoint_days": days,
                "sen_per_day": 0.02,
                "ols_slope_per_day": 0.02,
                "per_decade_at_365_2425_days_per_year": 73.0485,
            },
            "Exact affine-function identity and 0.02 * 365.2425 * 10.",
            scope + " Perfect fit does not provide a finite residual-based significance test.",
        ),
        case(
            "negative-linear",
            [10.0, 9.115, 8.23, 7.315, 6.4, 5.485],
            months,
            "mm",
            "y = 10 - 0.03 * elapsed midpoint days.",
            {"sen_per_day": -0.03, "ols_slope_per_day": -0.03},
            "Exact affine-function identity.",
            scope,
        ),
        case(
            "calendar-gaps",
            [1.0, None, 2.18, 2.79, None, 4.01],
            months,
            "mm",
            "Remove February and May from the fixed positive line; "
            "retain their calendar positions.",
            {
                "sen_per_day": 0.02,
                "ols_slope_per_day": 0.02,
                "adjacent_index_pairs": [[2, 3]],
                "hamed_rao_reason": "method_unvalidated_for_gaps",
            },
            "Affine identity on the remaining actual times; inspection of adjacent valid months.",
            scope + " Missingness is deterministic; no corrected-inference validity is assumed.",
        ),
        case(
            "zero-trend-variable",
            [1.0, -1.0, -1.0, 1.0],
            ["2001-01", "2002-01", "2003-01", "2004-01"],
            "mm",
            "Symmetric response on four January midpoints spaced exactly 365 days apart.",
            {"sen_per_day": 0.0, "ols_slope_per_day": 0.0, "mk_s": 0, "mk_p": 1.0},
            "Sum of centered time/response products is zero; middle two of six slopes cancel.",
            scope + " Sparse yearly samples are not a complete monthly series.",
        ),
        case(
            "ols-hand-algebra",
            [1.0, 2.0, 1.0, 3.0],
            months[:4],
            "mm",
            "Four literal observations on midpoint-day coordinates [0,29.5,59,89.5].",
            {
                "sum_x": "178",
                "sum_y": "7",
                "sum_x2": "24723/2",
                "sum_xy": "773/2",
                "sxx": "8881/2",
                "sxy": "75",
                "slope": "150/8881",
                "intercept": "35467/35524",
                "sse": "52691/35524",
                "r_squared": "45000/97691",
                "f_statistic": "90000/52691",
                "df": 2,
                "p_identity": "1 - sqrt(45000/97691)",
                "t_975_identity": "sqrt(2 * 0.95**2 / (1 - 0.95**2))",
            },
            "Hand normal-equation rational sums; "
            "F(1,2)/Student-t(2) closed-form tail/quantile identities.",
            scope + " iid-normal regression reference only; not autocorrelation-adjusted.",
        ),
        case(
            "ties-and-iid-rank-ci",
            [0, 1, 1, 2, 3, 5],
            months,
            "mm",
            "Six literal values with one tied pair; enumerate all 15 pairwise slopes.",
            {
                "mk_s": 14,
                "mk_variance": "82/3",
                "sen_per_day": "2/61",
                "ordered_slopes": [
                    "0",
                    "1/60",
                    "1/59",
                    "4/181",
                    "4/179",
                    "1/40",
                    "2/61",
                    "2/61",
                    "2/61",
                    "4/121",
                    "10/301",
                    "2/59",
                    "8/183",
                    "3/61",
                    "4/61",
                ],
                "iid_95_rank_one_based": [2, 14],
                "iid_95_ci": ["1/60", "3/61"],
            },
            "Exact rank/tie counts and sorted rational slopes; SciPy 1.18.1 rank convention.",
            scope + " Normal/rank interval approximation, independent errors only; "
            "not HR-adjusted coverage.",
        ),
        case(
            "outlier",
            [1.0, 1.59, 102.18, 2.79, 3.4, 4.01],
            months,
            "mm",
            "Add 100 mm to the March value of the fixed positive line; keep it valid.",
            {"sen_per_day": 0.02},
            "Ten of fifteen pairwise slopes still equal 0.02, more than half.",
            scope + " An unusual valid observation is not automatically removed.",
        ),
        case(
            "seasonal-cycle",
            list(range(1, 13)) * 6,
            labels(2000, 72),
            "mm",
            "Repeat calendar-month values 1..12 for six years.",
            {
                "climatology": list(range(1, 13)),
                "baseline_counts": [6] * 12,
                "anomalies_all_zero": True,
                "annual_means": [0.0] * 6,
            },
            "Each same-month baseline contains six identical values.",
            scope,
        ),
        case(
            "season-plus-trend",
            [month + year for year in range(5) for month in range(1, 13)],
            labels(2000, 60),
            "mm",
            "Calendar-month value plus year index 0..4.",
            {
                "climatology": list(range(3, 15)),
                "baseline_counts": [5] * 12,
                "annual_means": [-2.0, -1.0, 0.0, 1.0, 2.0],
            },
            "The mean of year indices 0..4 is 2, independently in each month.",
            scope + " Baseline removal is not independent seasonal/trend model fitting.",
        ),
        case(
            "all-missing",
            [None] * 6,
            months,
            "mm",
            "No observed values.",
            {"slope_reason": "insufficient_record"},
            "No valid observation pairs exist.",
            scope,
        ),
        case(
            "insufficient",
            [1.0, 2.0],
            months[:2],
            "mm",
            "Two observations only.",
            {"ols_reason": "insufficient_record", "mk_reason": "insufficient_record"},
            "Residual regression df is zero; normal MK reference requires at least three points.",
            scope,
        ),
    ]
    seed, phi, burn, count = 20261114, 0.6, 200, 120
    rng = np.random.Generator(np.random.PCG64(seed))
    innovations = rng.standard_normal(burn + count)
    state = 0.0
    values = []
    for index, innovation in enumerate(innovations):
        state = phi * state + float(innovation)
        if index >= burn:
            values.append(state)
    ar = case(
        "ar1-no-generating-trend",
        values,
        labels(2000, count),
        "mm",
        "NumPy 2.5.4 PCG64(seed), standard-normal innovations; x0=0; "
        "200 burn-in steps; x[t]=0.6*x[t-1]+epsilon[t].",
        {
            "generating_phi": phi,
            "innovation_sd": 1.0,
            "generating_slope": 0.0,
            "stationary_variance": "25/16",
        },
        "AR(1) stationary variance sigma_epsilon^2/(1-phi^2), not the realized sample variance.",
        "One deterministic realization, not calibration. "
        "No assertion that sample slope=0, rho=0.6, or p>=0.05.",
        seed,
    )
    ar["innovations_after_burn_in"] = innovations[burn:].tolist()
    cases.append(ar)
    manifest: dict[str, Any] = {
        "schema_version": "f04-fixtures-v1",
        "data_kind": "synthetic_not_nasa",
        "disclosure": (
            "All inputs are synthetic mathematical test fixtures, "
            "never NASA observations or environmental findings."
        ),
        "reference_days_per_year": 365.2425,
        "year_ruler_status": "PROVISIONAL_reference_choice_requires_H3_review",
        "cases": cases,
        "fdr": case(
            "bh-known-family",
            ["0.001", "0.02", "0.04", "0.20", None],
            None,
            "dimensionless",
            "Literal p-value family, last test excluded.",
            {"q_fractions": ["1/250", "1/25", "4/75", "1/5", None], "size": 4},
            "Exact Benjamini-Hochberg lower envelope, verified by rational arithmetic.",
            "Not p-values calculated from any observations; "
            "dependence assumptions remain relevant.",
        ),
        "weights": case(
            "two-latitude-cells",
            {"weights": ["1", "1/2"], "values": ["10", "20"]},
            None,
            "mm",
            "Equal-width cells at latitudes 0 and 60 degrees; full regional fractions.",
            {
                "mean_fraction": "40/3",
                "coverage_fraction": "1",
                "second_missing_mean": "10",
                "second_missing_coverage": "2/3",
            },
            "cos(0)=1, cos(60)=1/2 and the SRS weighted-sum definition.",
            "Analytic weights only; no claim about real masks, geometry or an installed cube.",
        ),
        "unit_cases": [
            {
                "input": "273.15",
                "source_units": "K",
                "operation": "subtract 273.15",
                "expected": "0",
                "units": "°C",
            },
            {
                "input": "21",
                "source_units": "C",
                "operation": "identity",
                "expected": "21",
                "units": "°C",
            },
            {
                "input": "1",
                "source_units": "kg/m²",
                "operation": "identity_water_depth",
                "expected": "1",
                "units": "mm",
            },
            {
                "input": "1",
                "source_units": "kg/m²/s",
                "operation": "multiply 86400",
                "expected": "86400",
                "units": "mm/day",
            },
            {
                "input": "1",
                "source_units": "mm/hour",
                "operation": "multiply 24",
                "expected": "24",
                "units": "mm/day",
            },
            {
                "input": "1",
                "source_units": "kg/m² per 3h accumulation",
                "operation": "multiply 8",
                "expected": "8",
                "units": "mm/day",
            },
        ],
        "unit_case_limitations": (
            "Synthetic dimensional checks only. Source units/accumulation must be "
            "confirmed in F05/D13; no generic unit decoder is implemented."
        ),
    }
    for unit_case in manifest["unit_cases"]:
        unit_case.update(
            synthetic=True,
            input_values=unit_case["input"],
            calendar_positions=None,
            random_seed=None,
            generation_method="Literal dimensional identity: " + unit_case["operation"],
            expected_source="SRS 5.4 / TDD 9.3 dimensional conversion reference, not source data",
            tolerances={"absolute": 1e-12, "relative": 1e-10},
            limitations=manifest["unit_case_limitations"],
        )
    return manifest


def render() -> str:
    return json.dumps(document(), indent=2, ensure_ascii=False, allow_nan=False) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = render()
    if args.check:
        if (
            not TARGET.is_file()
            or TARGET.read_text(encoding="utf-8").replace("\r\n", "\n") != expected
        ):
            raise SystemExit(
                "Synthetic fixture drift: regenerate explicitly and review the change."
            )
        print("Synthetic fixture generation is reproducible; no files written.")
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(expected, encoding="utf-8")
        print(f"Wrote {TARGET.name}")


if __name__ == "__main__":
    main()
