"""Retrospective historical-trend significance — kept strictly separate
from forecast skill and feature importance.

Defensible path implemented: calendar-time OLS on a regular monthly
aggregated series with seasonal controls and Newey–West HAC covariance
(statsmodels). Serial dependence lives in the covariance, not in a
Mann–Kendall normal approximation relabeled as corrected. Multiple tests
are adjusted inside a FROZEN hypothesis family — saved q-values never
recompute when new reports arrive.
"""
from __future__ import annotations

import math
from datetime import UTC, datetime

import numpy as np

from ..variables import VARIABLES

SCHEMA = "iris-insight-trend.v1"
SCHEMA_FAMILY = "iris-insight-trend-family.v1"
MIN_MONTHS = 36
MIN_COMPLETENESS = 0.8
MIN_SPAN_YEARS = 2.0


def _stamp(v):
    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))


def _monthly(rows, target: str) -> dict:
    """Aggregate daily native records to calendar-month means.

    Only genuinely daily targets are supported — a 16-day composite is
    not a daily series and is returned unsupported, not silently
    resampled."""
    if VARIABLES[target].get("composite_days", 1) != 1:
        return {"status": "unsupported_cadence",
                "reason": "native composite periods are not daily; a "
                          "justified native-period method is not "
                          "implemented for this target"}
    months = {}
    for r in sorted(rows, key=lambda r: r["start"]):
        if r.get("value") is None:
            continue
        s = _stamp(r["start"])
        e = _stamp(r["end"])
        if (e - s).days != 1:
            continue  # non-daily interval inside a daily product: skip
        months.setdefault((s.year, s.month), []).append(float(r["value"]))
    return {"status": "ok", "months": months}


def analyze(rows, target: str, *, context: dict,
            hypothesis: str = "nonzero_linear_trend") -> dict:
    """Monthly-mean OLS with seasonal controls + HAC covariance.

    Statuses: `supports_trend` / `no_clear_evidence` / `insufficient` /
    `unsupported` — cautious labels, never proof of no-trend."""
    agg = _monthly(rows, target)
    base = {"schema": SCHEMA, "target": target, "context": context,
            "hypothesis": hypothesis,
            "method": "monthly-mean OLS + seasonal dummies + "
                      "Newey-West HAC covariance",
            "unit": VARIABLES[target]["unit"],
            "effect_unit": f"{VARIABLES[target]['unit']}/year"}
    if agg["status"] != "ok":
        return {**base, "status": "unsupported", "reason": agg["reason"]}
    months = sorted(agg["months"])
    n_m = len(months)
    (y0, m0), (y1, m1) = months[0], months[-1]
    span = (y1 - y0) + (m1 - m0 + 1) / 12.0
    completeness = n_m / max(1, round((y1 - y0) * 12 + (m1 - m0) + 1))
    base["span_years"] = round(span, 2)
    base["n_months"] = n_m
    base["completeness"] = round(completeness, 3)
    if n_m < MIN_MONTHS or span < MIN_SPAN_YEARS \
            or completeness < MIN_COMPLETENESS:
        return {**base, "status": "insufficient",
                "reason": "history too short or too sparse for the "
                          "declared method; not evidence for or against "
                          "a trend"}
    t = np.array([(y - y0) + (m - m0) / 12.0 for y, m in months])
    y = np.array([float(np.mean(agg["months"][k])) for k in months])
    import statsmodels.api as sm
    X = np.column_stack([np.ones(n_m), t] +
                        [np.array([1.0 if mm == mo else 0.0
                                   for _, mm in months])
                         for mo in range(2, 13)])
    ols = sm.OLS(y, X).fit()
    lags = int(round(4 * (n_m / 100.0) ** (2.0 / 9.0)))  # NW rule of thumb
    rob = ols.get_robustcov_results(cov_type="HAC", maxlags=max(1, lags))
    slope, se = float(rob.params[1]), float(rob.bse[1])
    lo, hi = float(rob.conf_int()[1][0]), float(rob.conf_int()[1][1])
    z = slope / se if se > 0 else float("inf")
    from scipy import stats as _st
    p = float(2 * (1 - _st.norm.cdf(abs(z))))
    base.update({"slope_per_year": slope,
                 "ci95": [lo, hi], "p_value": p,
                 "se_hac": se, "hac_lags": max(1, lags),
                 "seasonal_controls": "11 month dummies",
                 "status": "supports_trend" if p < 0.05
                 else "no_clear_evidence",
                 "caveats": [
                     "Monthly means of daily values; units stay "
                     "per-unit-time of the source, not a monthly rate.",
                     "HAC handles serial dependence approximately; "
                     "significance is model-based and descriptive, not "
                     "evidence of a climate-scale trend or of forecast "
                     "skill.",
                     "Nonsignificance does not prove no trend."]})
    return base


def apply_family(tests: list, family_id: str, *, method: str = "bh") -> dict:
    """Frozen multiple-testing family: Benjamini–Hochberg q-values over
    the DECLARED set. Invalid tests are excluded and listed — BH cannot
    repair an invalid p-value."""
    if method != "bh":
        raise ValueError("only 'bh' is implemented")
    valid = [t for t in tests
             if t.get("p_value") is not None
             and math.isfinite(t["p_value"])
             and t.get("status") in ("supports_trend", "no_clear_evidence")]
    excluded = [{"id": t.get("id"),
                 "reason": t.get("status", "invalid_p_value")}
                for t in tests if t not in valid]
    m = len(valid)
    order = np.argsort([t["p_value"] for t in valid])
    q = np.empty(m)
    prev = 1.0
    for rank_idx in range(m - 1, -1, -1):
        i = order[rank_idx]
        q[i] = min(prev, valid[i]["p_value"] * m / (rank_idx + 1))
        prev = q[i]
    out_tests = []
    for i, t in enumerate(valid):
        out_tests.append({**t, "q_value": float(q[i]),
                          "adjusted_state":
                          "supports_trend" if q[i] < 0.05
                          else "no_clear_evidence"})
    return {"schema": SCHEMA_FAMILY, "family_id": family_id,
            "method": "benjamini-hochberg",
            "n_valid": m, "n_excluded": len(excluded),
            "excluded": excluded,
            "assumptions": "BH controls FDR under independence or "
                           "positive dependence (PRDS); treated as "
                           "approximate for correlated series",
            "tests": out_tests}
