"""Historical trend analysis — pure stdlib, dependence-aware.

Per hypothesis: Theil–Sen slope (units/decade), Mann–Kendall raw p-value with
tie correction, block-bootstrap CI (circular blocks, length ~ seasonal period,
handles lag-1 autocorrelation), completeness. BH q-values across a declared
hypothesis family. Retrospective analysis only — never a forecast feature.
"""
from __future__ import annotations

import math
import random
from datetime import UTC, datetime

from .qa import _ts


def monthly_series(records: list[dict], variable_prefix: str = "precip") -> dict[str, float]:
    """Complete-calendar-month sums from daily accumulation records.

    A month is complete only when every day has a record — incomplete months
    are dropped, never scaled.
    """
    days: dict[str, float] = {}
    for r in records:
        if not str(r.get("variable", "")).startswith(variable_prefix):
            continue
        days[r["interval_start"][:10]] = days.get(r["interval_start"][:10], 0.0) + float(r["value"])
    months: dict[str, list[str]] = {}
    for d in days:
        months.setdefault(d[:7], []).append(d)
    out: dict[str, float] = {}
    for m, ds in sorted(months.items()):
        y, mo = int(m[:4]), int(m[5:7])
        ndays = _days_in_month(y, mo)
        if len(ds) == ndays:
            out[m] = sum(days[d] for d in ds)
    return out


def _days_in_month(y: int, m: int) -> int:
    if m == 12:
        nxt = datetime(y + 1, 1, 1)
    else:
        nxt = datetime(y, m + 1, 1)
    return (nxt - datetime(y, m, 1)).days


def theil_sen(xs: list[float], ys: list[float]) -> float | None:
    slopes = []
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if xs[j] != xs[i]:
                slopes.append((ys[j] - ys[i]) / (xs[j] - xs[i]))
    if not slopes:
        return None
    slopes.sort()
    n = len(slopes)
    return slopes[n // 2] if n % 2 else (slopes[n // 2 - 1] + slopes[n // 2]) / 2


def _norm_sf(z: float) -> float:
    return 0.5 * math.erfc(z / math.sqrt(2))


def mann_kendall(xs: list[float], ys: list[float]) -> dict:
    """S statistic, tie-corrected variance, two-sided normal-approx p-value."""
    n = len(xs)
    s = 0
    ties: dict[float, int] = {}
    for v in ys:
        ties[v] = ties.get(v, 0) + 1
    for i in range(n):
        for j in range(i + 1, n):
            d = ys[j] - ys[i]
            s += (d > 0) - (d < 0)
    var = n * (n - 1) * (2 * n + 5) / 18.0
    for t in ties.values():
        if t > 1:
            var -= t * (t - 1) * (2 * t + 5) / 18.0
    if var <= 0:
        return {"s": s, "p": None, "note": "degenerate variance"}
    z = (s - 1 if s > 0 else s + 1 if s < 0 else 0) / math.sqrt(var)
    return {"s": s, "p": 2 * _norm_sf(abs(z))}


def lag1_autocorr(ys: list[float]) -> float | None:
    if len(ys) < 3:
        return None
    mean = sum(ys) / len(ys)
    num = sum((ys[i] - mean) * (ys[i - 1] - mean) for i in range(1, len(ys)))
    den = sum((v - mean) ** 2 for v in ys)
    return num / den if den else None


def block_bootstrap_ci(xs: list[float], ys: list[float], *, block: int = 12,
                       resamples: int = 500, level: float = 0.90,
                       seed: int = 20240501) -> tuple[float, float] | None:
    """Circular block bootstrap for the Theil–Sen slope — preserves short-range
    serial dependence that an iid resample would destroy."""
    n = len(ys)
    if n < block * 3:
        return None
    rng = random.Random(seed)
    slopes = []
    for _ in range(resamples):
        idx: list[int] = []
        while len(idx) < n:
            start = rng.randrange(n)
            idx.extend((start + k) % n for k in range(block))
        idx = idx[:n]
        slope = theil_sen([xs[i] for i in sorted(idx)], [ys[i] for i in sorted(idx)])
        if slope is not None:
            slopes.append(slope)
    if len(slopes) < resamples * 0.8:
        return None
    slopes.sort()
    lo = slopes[int((1 - level) / 2 * len(slopes))]
    hi = slopes[int((1 + level) / 2 * len(slopes)) - 1]
    return lo, hi


def benjamini_hochberg(p_values: list[float | None]) -> list[float | None]:
    """BH-adjusted q-values; None (invalid p) stays None, excluded from m."""
    valid = [(i, p) for i, p in enumerate(p_values) if p is not None]
    m = len(valid)
    out: list[float | None] = [None] * len(p_values)
    if not m:
        return out
    valid.sort(key=lambda t: t[1])
    prev = 1.0
    for rank in range(m, 0, -1):
        i, p = valid[rank - 1]
        q = min(prev, p * m / rank)
        prev = q
        out[i] = q
    return out


def analyze(records: list[dict], *, family_id: str, variable_prefix: str = "precip",
            deseasonalize: bool = True, resamples: int = 500,
            seed: int = 20240501) -> dict:
    """One trend hypothesis over a monthly total series.

    Returns effect size (mm/decade), bootstrap CI, raw p, completeness,
    autocorrelation diagnostic — retrospective, clearly labelled.
    """
    months = monthly_series(records, variable_prefix)
    keys = sorted(months)
    n_months = len(keys)
    ys = [months[k] for k in keys]
    xs = [(_ts(k + "-15T00:00:00+00:00")) / (86400 * 365.25 * 10) for k in keys]  # decades
    # Span-based completeness: expected months between first and last key.
    expected = _expected_months(keys[0], keys[-1]) if keys else 0
    completeness = n_months / expected if expected else 0.0
    result: dict = {
        "schema_version": "iris.ml-forecast.v2",
        "family_id": family_id,
        "variable": variable_prefix,
        "unit": "mm/month",
        "effect_unit": "mm/month per decade",
        "n_complete_months": n_months,
        "expected_months_in_span": expected,
        "completeness": completeness,
        "span": {"first": keys[0] if keys else None, "last": keys[-1] if keys else None},
        "method": "theil-sen + mann-kendall + circular-block bootstrap",
        "scope": "retrospective_historical_only",
        "generated_at": datetime.now(UTC).isoformat(),
    }
    if n_months < 36 or completeness < 0.6:
        result.update({"state": "insufficient",
                       "reason": "need >=36 complete months and >=60% span coverage"})
        return result
    if deseasonalize:
        # Full-analysis-window climatology (legitimate for retrospective trend;
        # explicitly NOT a forecasting feature).
        clim: dict[int, list[float]] = {}
        for k, v in months.items():
            clim.setdefault(int(k[5:7]), []).append(v)
        means = {m: sum(vs) / len(vs) for m, vs in clim.items()}
        ys = [v - means[int(k[5:7])] for k, v in zip(keys, ys)]
        result["seasonality"] = "monthly climatology removed (full analysis window)"
    else:
        result["seasonality"] = "raw monthly totals"
    slope = theil_sen(xs, ys)
    mk = mann_kendall(xs, ys)
    ci = block_bootstrap_ci(xs, ys, resamples=resamples, seed=seed)
    r1 = lag1_autocorr(ys)
    result.update({
        "state": "computed",
        "slope_per_decade": slope,
        "ci_90": list(ci) if ci else None,
        "ci_method": "circular block bootstrap (block=12mo)" if ci else "insufficient length",
        "p_raw": mk["p"],
        "lag1_autocorrelation": r1,
        "autocorrelation_note": ("bootstrap CI accounts for short-range dependence; "
                                 "p-value is the tie-corrected normal approximation"),
    })
    return result


def _expected_months(first: str, last: str) -> int:
    y0, m0 = int(first[:4]), int(first[5:7])
    y1, m1 = int(last[:4]), int(last[5:7])
    return (y1 - y0) * 12 + (m1 - m0) + 1
