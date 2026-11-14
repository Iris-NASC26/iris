"""Small, independent F04 calculations. Never import these into the application.

Analytic fixtures, exact arithmetic and established libraries provide complementary
evidence. Numerical agreement here does not certify a method's operating properties.
"""

import calendar
import math
import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from fractions import Fraction
from itertools import combinations
from statistics import fmean, median
from typing import Any

import numpy as np
import pymannkendall as mk
from scipy import stats

REFERENCE_VERSION = "f04-reference-v1"


class ReferenceUnavailable(ValueError):
    """An unsupported reference method must not silently select another method."""

    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


def finite(value: float) -> float:
    if isinstance(value, bool) or not math.isfinite(value):
        raise ValueError("expected a finite numeric value, not a missing-value sentinel")
    return float(value)


def month_position(label: str) -> int:
    if not re.fullmatch(r"[0-9]{4}-(0[1-9]|1[0-2])", label):
        raise ValueError("expected a complete YYYY-MM calendar month")
    year, month = map(int, label.split("-"))
    if year < 1 or year >= 9999:
        raise ValueError("unsupported reference calendar year")
    return 12 * year + month - 1


def midpoint_offsets_days(months: Sequence[str]) -> list[float]:
    positions = [month_position(label) for label in months]
    if any(b <= a for a, b in zip(positions, positions[1:], strict=False)):
        raise ValueError("calendar positions must be strictly ordered and distinct")
    midpoints = []
    for label in months:
        year, month = map(int, label.split("-"))
        midpoints.append(
            datetime(year, month, 1) + timedelta(days=calendar.monthrange(year, month)[1] / 2)
        )
    if not midpoints:
        return []
    return [(value - midpoints[0]).total_seconds() / 86400 for value in midpoints]


def elapsed_years(months: Sequence[str], *, days_per_year: float) -> list[float]:
    """Year ruler is explicit: F04's 365.2425 fixture choice needs H3 review."""
    if finite(days_per_year) <= 0:
        raise ValueError("days_per_year must be positive")
    return [days / days_per_year for days in midpoint_offsets_days(months)]


def observed_pairs(
    x: Sequence[float], y: Sequence[float | None]
) -> tuple[list[float], list[float]]:
    if len(x) != len(y):
        raise ValueError("coordinate/value lengths differ")
    axis = [finite(value) for value in x]
    if any(b <= a for a, b in zip(axis, axis[1:], strict=False)):
        raise ValueError("time coordinates must be strictly increasing")
    points = [
        (time, finite(value)) for time, value in zip(axis, y, strict=True) if value is not None
    ]
    return [point[0] for point in points], [point[1] for point in points]


def monthly_climatology(
    months: Sequence[str],
    values: Sequence[float | None],
    *,
    baseline: tuple[str, str],
    min_count: int = 5,
) -> dict[str, Any]:
    if len(months) != len(values) or min_count < 1:
        raise ValueError("invalid climatology inputs")
    positions = [month_position(label) for label in months]
    if positions != sorted(set(positions)):
        raise ValueError("calendar positions must be ordered and unique")
    low, high = map(month_position, baseline)
    if high < low:
        raise ValueError("baseline is reversed")
    buckets: dict[int, list[float]] = {month: [] for month in range(1, 13)}
    for label, value in zip(months, values, strict=True):
        if value is not None:
            number = finite(value)
            if low <= month_position(label) <= high:
                buckets[int(label[5:])].append(number)
    climate = [fmean(buckets[m]) if len(buckets[m]) >= min_count else None for m in range(1, 13)]
    anomalies: list[float | None] = []
    for label, value in zip(months, values, strict=True):
        monthly_mean = climate[int(label[5:]) - 1]
        anomalies.append(
            None if value is None or monthly_mean is None else finite(value) - monthly_mean
        )
    return {
        "climatology": climate,
        "counts": [len(buckets[m]) for m in range(1, 13)],
        "anomalies": anomalies,
    }


def annual_means(
    months: Sequence[str], anomalies: Sequence[float | None], *, min_months: int = 10
) -> dict[str, Any]:
    if len(months) != len(anomalies) or not 1 <= min_months <= 12:
        raise ValueError("invalid annual aggregation inputs")
    positions = [month_position(label) for label in months]
    if positions != sorted(set(positions)):
        raise ValueError("duplicate or unordered months")
    buckets: dict[str, list[float]] = {label[:4]: [] for label in months}
    for label, value in zip(months, anomalies, strict=True):
        if value is not None:
            buckets[label[:4]].append(finite(value))
    return {
        year: {
            "valid_months": len(values),
            "value": fmean(values) if len(values) >= min_months else None,
        }
        for year, values in buckets.items()
    }


def sen_slope(x: Sequence[float], y: Sequence[float | None]) -> float:
    axis, values = observed_pairs(x, y)
    if len(axis) < 2:
        raise ReferenceUnavailable("insufficient_record")
    return float(
        median(
            (values[j] - values[i]) / (axis[j] - axis[i])
            for i, j in combinations(range(len(axis)), 2)
        )
    )


@dataclass(frozen=True)
class Regression:
    n: int
    slope: float
    intercept: float
    sxx: float
    sse: float
    r_squared: float | None
    standard_error: float | None
    f_statistic: float | None
    t_statistic: float | None
    p: float | None
    ci_low: float | None
    ci_high: float | None
    reason: str | None

    def document(self) -> dict[str, Any]:
        return asdict(self)


def ols_reference(
    x: Sequence[float], y: Sequence[float | None], *, confidence: float = 0.95
) -> Regression:
    """SVD least squares, compared with hand algebra and SciPy's linregress."""
    axis, values = observed_pairs(x, y)
    n = len(axis)
    if n < 3:
        raise ReferenceUnavailable("insufficient_record")
    if not 0 < finite(confidence) < 1:
        raise ValueError("invalid confidence")
    a, b = np.array(axis, dtype=np.float64), np.array(values, dtype=np.float64)
    x_mean, y_mean = fmean(axis), fmean(values)
    design = np.column_stack((np.ones(n), a - x_mean))
    coefficients, _, rank, _ = np.linalg.lstsq(design, b, rcond=None)
    if rank != 2:
        raise ReferenceUnavailable("insufficient_record")
    fitted = design @ coefficients
    slope = float(coefficients[1])
    intercept = float(coefficients[0] - slope * x_mean)
    sse = float(np.dot(b - fitted, b - fitted))
    sxx = float(np.dot(a - x_mean, a - x_mean))
    sst = float(np.dot(b - y_mean, b - y_mean))
    # A declared reference-only numerical degeneracy tolerance, never a data filter.
    if sse <= 1e-24 or sst <= 1e-24:
        return Regression(
            n,
            slope,
            intercept,
            sxx,
            sse,
            None if sst <= 1e-24 else 1.0,
            None,
            None,
            None,
            None,
            None,
            None,
            "zero_residual_variance",
        )
    se = math.sqrt((sse / (n - 2)) / sxx)
    explained = float(np.dot(fitted - y_mean, fitted - y_mean))
    f_stat = explained / (sse / (n - 2))
    critical = float(stats.t.ppf((1 + confidence) / 2, n - 2))
    return Regression(
        n,
        slope,
        intercept,
        sxx,
        sse,
        1 - sse / sst,
        se,
        f_stat,
        slope / se,
        float(stats.f.sf(f_stat, 1, n - 2)),
        slope - critical * se,
        slope + critical * se,
        None,
    )


def mann_kendall(values: Sequence[float | None]) -> dict[str, Any]:
    """Pair enumeration and exact tie counts; two-sided continuity-corrected normal p."""
    y = [finite(value) for value in values if value is not None]
    n = len(y)
    if n < 3:
        raise ReferenceUnavailable("insufficient_record")
    score = sum((b > a) - (b < a) for a, b in combinations(y, 2))
    correction = sum(count * (count - 1) * (2 * count + 5) for count in Counter(y).values())
    variance = Fraction(n * (n - 1) * (2 * n + 5) - correction, 18)
    z = (score - math.copysign(1, score)) / math.sqrt(float(variance)) if score else 0.0
    return {
        "n": n,
        "s": score,
        "variance": float(variance),
        "z": z,
        "p": math.erfc(abs(z) / math.sqrt(2)),
        "all_tied": variance == 0,
        "limitation": "normal_approximation_not_exact_small_sample_test",
    }


def hamed_rao_complete_reference(
    months: Sequence[str], values: Sequence[float | None]
) -> dict[str, Any]:
    """Established-library comparator only; no local Hamed-Rao reimplementation."""
    if len(months) != len(values):
        raise ValueError("calendar/value lengths differ")
    positions = [month_position(label) for label in months]
    if any(value is None for value in values) or any(
        b - a != 1 for a, b in zip(positions, positions[1:], strict=False)
    ):
        raise ReferenceUnavailable("method_unvalidated_for_gaps")
    y = [finite(value) for value in values if value is not None]
    if len(y) < 3:
        raise ReferenceUnavailable("insufficient_record")
    if len(set(y)) < 2:
        raise ReferenceUnavailable("invalid_variance")
    # Fixed diagnostic alpha: the library couples lag selection to its alpha argument.
    cap = min(len(y) - 1, 36)
    try:
        with np.errstate(divide="raise", invalid="raise"):
            result = mk.hamed_rao_modification_test(y, alpha=0.05, lag=cap)
    except (FloatingPointError, ZeroDivisionError, ValueError) as error:
        raise ReferenceUnavailable("invalid_variance") from error
    if not math.isfinite(result.var_s) or result.var_s <= 0:
        raise ReferenceUnavailable("invalid_variance")
    return {
        "status": "PROVISIONAL",
        "library": "pymannkendall==1.4.3",
        "diagnostic_alpha": 0.05,
        "lag_cap": cap,
        "s": float(result.s),
        "variance": float(result.var_s),
        "z": float(result.z),
        "p": float(result.p),
        "scope": "complete_monthly_library_comparator_not_production_validation",
        "detrending_axis": "month_index_not_actual_elapsed_midpoint_days",
    }


def sen_iid_interval(
    x: Sequence[float], y: Sequence[float | None], *, confidence: float = 0.95
) -> dict[str, Any]:
    axis, values = observed_pairs(x, y)
    if len(axis) < 3:
        raise ReferenceUnavailable("insufficient_record")
    if not 0.5 < finite(confidence) < 1:
        raise ValueError("reference confidence must be between 0.5 and 1")
    result = stats.theilslopes(values, axis, alpha=confidence, method="separate")
    return {
        "slope": float(result.slope),
        "ci_low": float(result.low_slope),
        "ci_high": float(result.high_slope),
        "confidence": confidence,
        "scope": "independent_errors_only_not_autocorrelation_adjusted",
    }


def adjusted_sen_interval() -> None:
    raise ReferenceUnavailable("method_validation_required")


def effective_n(n: int, rho: float) -> dict[str, float]:
    if not isinstance(n, int) or isinstance(n, bool) or n < 3:
        raise ReferenceUnavailable("insufficient_record")
    if not -1 < finite(rho) < 1:
        raise ReferenceUnavailable("invalid_variance")
    raw = n * (1 - rho) / (1 + rho)
    adjusted = min(float(n), raw)
    if adjusted <= 2:
        raise ReferenceUnavailable("invalid_variance")
    return {"n_eff_raw": raw, "n_eff": adjusted, "df": adjusted - 2}


def adjusted_ols_reference(
    x: Sequence[float], y: Sequence[float | None], *, supplied_rho: float, confidence: float = 0.95
) -> dict[str, Any]:
    """Algebraic TDD/Santer comparator; rho is supplied, not estimated or validated."""
    fit = ols_reference(x, y, confidence=confidence)
    adjustment = effective_n(fit.n, supplied_rho)
    if fit.reason is not None:
        raise ReferenceUnavailable(fit.reason)
    se = math.sqrt((fit.sse / adjustment["df"]) / fit.sxx)
    statistic = fit.slope / se
    critical = float(stats.t.ppf((1 + confidence) / 2, adjustment["df"]))
    return {
        "status": "PROVISIONAL",
        "rho_source": "supplied_fixture_parameter_not_residual_estimate",
        **adjustment,
        "slope": fit.slope,
        "standard_error": se,
        "t": statistic,
        "p": float(2 * stats.t.sf(abs(statistic), adjustment["df"])),
        "ci_low": fit.slope - critical * se,
        "ci_high": fit.slope + critical * se,
    }


def adjacent_month_pairs(
    months: Sequence[str], values: Sequence[float | None]
) -> list[tuple[int, int]]:
    if len(months) != len(values):
        raise ValueError("calendar/value lengths differ")
    positions = [month_position(label) for label in months]
    if positions != sorted(set(positions)):
        raise ValueError("unordered/duplicate calendar")
    for value in values:
        if value is not None:
            finite(value)
    return [
        (i, i + 1)
        for i in range(len(months) - 1)
        if positions[i + 1] - positions[i] == 1
        and values[i] is not None
        and values[i + 1] is not None
    ]


def bh_exact(p_values: Sequence[str | None]) -> dict[str, Any]:
    """Exact rational lower envelope, checked against frozen fractions and SciPy."""
    valid = [(i, Fraction(value)) for i, value in enumerate(p_values) if value is not None]
    if any(not 0 <= value <= 1 for _, value in valid):
        raise ValueError("p must lie in [0,1]")
    ordered = sorted(valid, key=lambda item: item[1])
    size = len(ordered)
    adjusted: list[str | None] = [None] * len(p_values)
    for rank, (index, _) in enumerate(ordered, start=1):
        adjusted[index] = str(
            min(
                [Fraction(1)]
                + [size * value / j for j, (_, value) in enumerate(ordered, start=1) if j >= rank]
            )
        )
    return {
        "size": size,
        "q_fractions": adjusted,
        "excluded_indices": [i for i, value in enumerate(p_values) if value is None],
    }


def weighted_exact(weights: Sequence[str], values: Sequence[str | None]) -> dict[str, Any]:
    if len(weights) != len(values):
        raise ValueError("weight/value lengths differ")
    w = [Fraction(value) for value in weights]
    if any(value < 0 for value in w) or sum(w) <= 0:
        raise ValueError("weights must be nonnegative with positive eligible support")
    support = sum(
        (weight for weight, value in zip(w, values, strict=True) if value is not None), Fraction()
    )
    numerator = sum(
        (
            weight * Fraction(value)
            for weight, value in zip(w, values, strict=True)
            if value is not None
        ),
        Fraction(),
    )
    return {
        "mean_fraction": str(numerator / support) if support else None,
        "coverage_fraction": str(support / sum(w)),
        "reason": None if support else "insufficient_coverage",
    }
