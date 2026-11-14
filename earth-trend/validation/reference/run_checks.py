"""Emit/check reproducible F04 evidence, explicitly excluding scientific acceptance."""

import argparse
import hashlib
import importlib.metadata
import inspect
import json
import math
import platform
from collections.abc import Callable
from fractions import Fraction
from functools import partial
from pathlib import Path
from typing import Any

import pymannkendall
from scipy import stats

from .oracles import (
    REFERENCE_VERSION,
    ReferenceUnavailable,
    Regression,
    adjusted_ols_reference,
    annual_means,
    bh_exact,
    hamed_rao_complete_reference,
    mann_kendall,
    midpoint_offsets_days,
    monthly_climatology,
    ols_reference,
    sen_iid_interval,
    sen_slope,
    weighted_exact,
)

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports" / "f04-reference-results.json"


def load_fixtures() -> dict[str, Any]:
    return json.loads((ROOT / "fixtures" / "synthetic-v1.json").read_text(encoding="utf-8"))  # type: ignore[no-any-return]


def source_hashes() -> dict[str, str]:
    files = [ROOT / "pyproject.toml", ROOT / "uv.lock"]
    for folder in ("reference", "fixtures", "tests"):
        files.extend(path for path in (ROOT / folder).rglob("*") if path.suffix in (".py", ".json"))
    return {
        str(path.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(
            path.read_bytes().replace(b"\r\n", b"\n")
        ).hexdigest()
        for path in sorted(files)
    }


def unavailable(call: Callable[[], Any]) -> Any:
    try:
        return call()
    except ReferenceUnavailable as error:
        return {"status": "unavailable", "reason": error.reason}


def build_report() -> dict[str, Any]:
    fixture = load_fixtures()
    outputs: dict[str, Any] = {}
    checks: dict[str, bool] = {}
    for case in fixture["cases"]:
        axis = midpoint_offsets_days(case["calendar_positions"])
        values = case["input_values"]
        expected = case["expected"]
        regression = unavailable(partial(ols_reference, axis, values))
        row = {
            "sen": unavailable(partial(sen_slope, axis, values)),
            "ols": regression.document() if isinstance(regression, Regression) else regression,
            "mk": unavailable(partial(mann_kendall, values)),
        }
        if "sen_per_day" in expected:
            checks[case["id"] + ":sen"] = math.isclose(
                float(row["sen"]),
                float(Fraction(str(expected["sen_per_day"]))),
                rel_tol=1e-10,
                abs_tol=1e-12,
            )
        if "ols_slope_per_day" in expected:
            checks[case["id"] + ":ols"] = math.isclose(
                row["ols"]["slope"], expected["ols_slope_per_day"], rel_tol=1e-10, abs_tol=1e-12
            )
        if case["id"] == "ols-hand-algebra":
            for key in ("slope", "intercept", "sxx", "sse", "r_squared", "f_statistic"):
                checks["hand-ols:" + key] = math.isclose(
                    row["ols"][key], float(Fraction(expected[key])), rel_tol=1e-10, abs_tol=1e-12
                )
            comparison = stats.linregress(axis, values)
            checks["independent-ols:linregress"] = math.isclose(
                row["ols"]["slope"], comparison.slope, abs_tol=1e-12
            )
            checks["independent-ols:p-df2"] = math.isclose(
                row["ols"]["p"],
                1 - math.sqrt(float(Fraction(expected["r_squared"]))),
                abs_tol=1e-12,
            )
        if case["id"] == "ties-and-iid-rank-ci":
            row["iid_sen_ci"] = sen_iid_interval(axis, values)
            checks["iid-rank:low"] = math.isclose(
                row["iid_sen_ci"]["ci_low"], 1 / 60, abs_tol=1e-12
            )
            checks["iid-rank:high"] = math.isclose(
                row["iid_sen_ci"]["ci_high"], 3 / 61, abs_tol=1e-12
            )
        if case["id"] in ("seasonal-cycle", "season-plus-trend"):
            row["climatology"] = monthly_climatology(
                case["calendar_positions"],
                values,
                baseline=(case["calendar_positions"][0], case["calendar_positions"][-1]),
            )
            row["annual"] = annual_means(
                case["calendar_positions"], row["climatology"]["anomalies"]
            )
            checks[case["id"] + ":climate"] = (
                row["climatology"]["climatology"] == expected["climatology"]
            )
            checks[case["id"] + ":annual"] = [
                r["value"] for r in row["annual"].values()
            ] == expected["annual_means"]
        if case["id"] == "ar1-no-generating-trend":
            row["hamed_rao_library_comparator"] = hamed_rao_complete_reference(
                case["calendar_positions"], values
            )
            row["effective_df_supplied_rho_comparator"] = adjusted_ols_reference(
                axis, values, supplied_rho=0.6
            )
        outputs[case["id"]] = row
    fdr = bh_exact(fixture["fdr"]["input_values"])
    checks["bh:exact-fractions"] = fdr["q_fractions"] == fixture["fdr"]["expected"]["q_fractions"]
    weights = weighted_exact(["1", "1/2"], ["10", "20"])
    checks["weights:exact-mean"] = weights["mean_fraction"] == "40/3"
    robust = inspect.unwrap(stats.theilslopes).__globals__["_robust_slopes"]
    return {
        "kind": "synthetic_reference_evidence_not_scientific_acceptance",
        "reference_version": REFERENCE_VERSION,
        "approved_application_baseline": "634cd28",
        "source_hashes": source_hashes(),
        "versions": {
            name: importlib.metadata.version(name)
            for name in ("numpy", "scipy", "pymannkendall", "pytest")
        },
        "python": platform.python_version(),
        "external_function_hashes": {
            "scipy_robust_slopes": hashlib.sha256(inspect.getsource(robust).encode()).hexdigest(),
            "pymannkendall_hamed_rao": hashlib.sha256(
                inspect.getsource(pymannkendall.hamed_rao_modification_test).encode()
            ).hexdigest(),
        },
        "checks": checks,
        "all_reference_checks_passed": all(checks.values()),
        "outputs": outputs,
        "bh": fdr,
        "weighted_case": weights,
        "full_sm12_monte_carlo": "NOT_RUN",
        "nasa_reproduction": "NOT_RUN",
        "human_scientific_signoff": "PENDING",
        "note": (
            "A VERIFIED source/analytic convention or a passed numerical comparison does not "
            "validate production inference. See method-gates.json."
        ),
    }


def render() -> str:
    return (
        json.dumps(build_report(), sort_keys=True, indent=2, ensure_ascii=False, allow_nan=False)
        + "\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    report = build_report()
    if not report["all_reference_checks_passed"]:
        raise SystemExit("A reference invariant failed; do not publish a passing report.")
    content = (
        json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
    )
    if args.check:
        if (
            not REPORT.is_file()
            or REPORT.read_text(encoding="utf-8").replace("\r\n", "\n") != content
        ):
            raise SystemExit(
                "Reference evidence differs; inspect source/environment changes "
                "before regenerating."
            )
        print("Reference evidence is reproducible; no report written.")
    else:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(content, encoding="utf-8")
        print(f"Wrote {REPORT.name}; {len(report['checks'])} checks; scientific sign-off pending.")


if __name__ == "__main__":
    main()
