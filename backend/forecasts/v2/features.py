"""Availability-aware feature builder and chronological folds.

Every predictor for a simulated issue time `s` uses only records whose
availability precedes `s`; targets are complete future windows only. Shared by
training and inference (online/offline parity).
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta

from .qa import available_by, daily_sum, _ts
from .schemas import HistoricalRecord
from .variables import variable as variable_spec

LAGS_DAYS = (1, 2, 3, 7, 14, 28)
TRAIL_DAYS = (7, 30, 90)
WET_MM = 1.0  # declared wet-day threshold
# Multi-variable path: lags/trails are in the target's native periods
LAGS_PERIODS = (1, 2, 3, 6)
TRAIL_PERIODS = (3, 6)


def _daily_series(records: list[HistoricalRecord]) -> dict[str, float]:
    """Day -> complete daily total. Buckets by interval_start's UTC day
    (valid for aligned hourly/daily accumulations); a day is included only
    when its intervals cover >= 24h — partial days are absent, not scaled."""
    acc: dict[str, list[float]] = {}
    for r in records:
        day = r.interval_start[:10]
        covered = (_ts(r.interval_end) - _ts(r.interval_start)) / 3600
        a = acc.setdefault(day, [0.0, 0.0])
        a[0] += r.value
        a[1] += covered
    return {d: v for d, (v, c) in acc.items() if c >= 24 - 1e-6}


def _step_series(records: list[HistoricalRecord], var_name: str) -> dict[str, float]:
    """Generic period->value series for non-rainfall targets.

    Daily/mean variables bucket by interval_start day (mean of in-day values);
    composite variables keep their own period keyed by interval_start. Records
    never straddle periods for these products, so no summing of partial
    intervals and no coverage scaling.
    """
    spec = variable_spec(var_name)
    acc: dict[str, list[float]] = {}
    for r in records:
        if r.variable != var_name:
            continue
        key = r.interval_start[:10]
        acc.setdefault(key, []).append(r.value)
    if spec["aggregation"] == "sum":
        return {k: sum(vs) for k, vs in acc.items()}
    return {k: sum(vs) / len(vs) for k, vs in acc.items()}


def build_features_generic(records: list[HistoricalRecord], issue_ts: str,
                           var_name: str, target_index: int = 0,
                           conservative_lag_hours: float = 0.0) -> dict | None:
    """Period-based feature row for non-rainfall targets. Availability rules
    are identical to the rainfall path — composites only appear once their
    interval ended AND the publication delay passed."""
    usable = available_by(records, issue_ts, conservative_lag_hours)
    series = _step_series(usable, var_name)
    spec = variable_spec(var_name)
    step_days = spec["composite_days"]
    issue = datetime.fromisoformat(issue_ts.replace("Z", "+00:00"))
    feat: dict[str, float | str] = {"issue_ts": issue_ts, "target_index": target_index}
    ok = True
    for lag in LAGS_PERIODS:
        key = (issue - timedelta(days=lag * step_days)).date().isoformat()
        # For composites the record sits at the period start — find the
        # period whose start is <= key < start+step.
        v = _period_value(series, key, step_days)
        feat[f"val_lag_{lag}p"] = v if v is not None else math.nan
        feat[f"val_lag_{lag}p_missing"] = 0.0 if v is not None else 1.0
    for span in TRAIL_PERIODS:
        vals = []
        for i in range(1, span + 1):
            key = (issue - timedelta(days=i * step_days)).date().isoformat()
            v = _period_value(series, key, step_days)
            if v is not None:
                vals.append(v)
        feat[f"val_trail_{span}p_mean"] = sum(vals) / len(vals) if vals else math.nan
        feat[f"val_trail_{span}p_cover"] = len(vals) / span
        if span == TRAIL_PERIODS[0] and len(vals) < 2:
            ok = False  # minimum history gate
    doy = issue.timetuple().tm_yday
    feat["sin_doy"] = math.sin(2 * math.pi * doy / 365.25)
    feat["cos_doy"] = math.cos(2 * math.pi * doy / 365.25)
    feat["step_days"] = float(step_days)
    return feat if ok else None


def _period_value(series: dict[str, float], key: str, step_days: int) -> float | None:
    """Value for the native period containing `key`."""
    if key in series:
        return series[key]
    kd = datetime.fromisoformat(key).date()
    for start, v in series.items():
        sd = datetime.fromisoformat(start).date()
        if sd <= kd < sd + timedelta(days=step_days):
            return v
    return None


def build_features(records: list[HistoricalRecord], issue_ts: str, target_index: int = 0,
                   conservative_lag_hours: float = 0.0, variable: str = "precip_24h") -> dict | None:
    """Feature row for one target window, or None when history is insufficient.

    All features trail the issue time by availability, not just interval end —
    a finalized reanalysis record published later cannot leak in. Rainfall
    keeps its established columns; other targets use the period-based path.
    """
    if variable != "precip_24h":
        return build_features_generic(records, issue_ts, variable, target_index,
                                      conservative_lag_hours)
    usable = [r for r in available_by(records, issue_ts, conservative_lag_hours)
              if r.variable.startswith("precip")]
    daily = _daily_series(usable)
    issue = datetime.fromisoformat(issue_ts.replace("Z", "+00:00"))
    feat: dict[str, float | str] = {"issue_ts": issue_ts, "target_index": target_index}
    ok = True
    for lag in LAGS_DAYS:
        day = (issue - timedelta(days=lag)).date().isoformat()
        feat[f"precip_lag_{lag}d"] = daily.get(day, math.nan)
        feat[f"precip_lag_{lag}d_missing"] = 1.0 if day not in daily else 0.0
    for span in TRAIL_DAYS:
        vals = [daily.get((issue - timedelta(days=i)).date().isoformat(), math.nan) for i in range(1, span + 1)]
        have = [v for v in vals if v == v]
        feat[f"precip_trail_{span}d_mean"] = sum(have) / len(have) if have else math.nan
        feat[f"precip_trail_{span}d_cover"] = len(have) / span
        feat[f"precip_wetfreq_{span}d"] = sum(1 for v in have if v >= WET_MM) / len(have) if have else math.nan
        if span == 7 and len(have) < 5:
            ok = False  # minimum history gate
    doy = issue.timetuple().tm_yday
    feat["sin_doy"] = math.sin(2 * math.pi * doy / 365.25)
    feat["cos_doy"] = math.cos(2 * math.pi * doy / 365.25)
    feat["dry_spell"] = float(_dry_spell(daily, issue))
    return feat if ok else None


def _dry_spell(daily: dict[str, float], issue: datetime) -> int:
    n = 0
    for i in range(1, 91):
        v = daily.get((issue - timedelta(days=i)).date().isoformat())
        if v is None:
            break
        if v >= WET_MM:
            break
        n += 1
    return n


def target_sum(records: list[HistoricalRecord], issue_ts: str, target_index: int) -> tuple[str, str, float | None]:
    """Complete-window target [s+24i, s+24(i+1)) in UTC; None if incomplete."""
    start = datetime.fromisoformat(issue_ts.replace("Z", "+00:00")) + timedelta(hours=24 * target_index)
    end = start + timedelta(hours=24)
    return start.isoformat(), end.isoformat(), daily_sum(records, start.isoformat())


def target_value(records: list[HistoricalRecord], issue_ts: str, target_index: int,
                 var_name: str) -> tuple[str, str, float | None]:
    """Future target for any variable. Rainfall keeps the 24h complete-sum
    window; other targets step forward by their native period (daily or
    composite) and take that period's observed value — composites only when
    the whole composite interval lies ahead of the issue time."""
    if var_name == "precip_24h":
        return target_sum(records, issue_ts, target_index)
    spec = variable_spec(var_name)
    step = timedelta(days=spec["composite_days"] * (target_index + 1))
    issue = datetime.fromisoformat(issue_ts.replace("Z", "+00:00"))
    w_start = issue + timedelta(days=spec["composite_days"] * target_index)
    w_end = w_start + timedelta(days=spec["composite_days"])
    series = _step_series(records, var_name)
    val = _period_value(series, w_start.date().isoformat(), spec["composite_days"])
    return w_start.isoformat(), w_end.isoformat(), val


def folds(dates: list[str], boundaries: list[str], embargo_hours: float = 168.0) -> list[dict]:
    """Chronological train/test folds with an embargo >= max target span +
    label delay. Samples whose target window crosses the next origin are cut."""
    out = []
    for i in range(1, len(boundaries)):
        train_end = _ts(boundaries[i - 1]) - embargo_hours * 3600
        test_end = _ts(boundaries[i]) if i < len(boundaries) else float("inf")
        out.append({
            "train": [d for d in dates if _ts(d) < train_end],
            "test": [d for d in dates if train_end <= _ts(d) < test_end],
        })
    return [f for f in out if f["train"] and f["test"]]


# ---- baselines (same availability rules) ----

def seasonal_climatology(records: list[HistoricalRecord], issue_ts: str, train_years: list[int],
                         conservative_lag_hours: float = 0.0, variable: str = "precip_24h") -> float | None:
    """Median of the target day-of-year +-15d across declared training years."""
    usable = [r for r in available_by(records, issue_ts, conservative_lag_hours)
              if r.variable.startswith("precip")]
    issue = datetime.fromisoformat(issue_ts.replace("Z", "+00:00"))
    daily = _daily_series(usable)
    vals = []
    for y in train_years:
        for off in range(-15, 16):
            try:
                d = datetime(y, 1, 1) + timedelta(days=issue.timetuple().tm_yday - 1 + off)
            except ValueError:
                continue
            v = daily.get(d.date().isoformat())
            if v is not None:
                vals.append(v)
    if not vals:
        return None
    vals.sort()
    return vals[len(vals) // 2]


def persistence(records: list[HistoricalRecord], issue_ts: str, conservative_lag_hours: float = 0.0,
                variable: str = "precip_24h") -> float | None:
    usable = [r for r in available_by(records, issue_ts, conservative_lag_hours)
              if r.variable == variable or (variable == "precip_24h" and r.variable.startswith("precip"))]
    daily = _daily_series(usable)
    issue = datetime.fromisoformat(issue_ts.replace("Z", "+00:00"))
    return daily.get((issue - timedelta(days=1)).date().isoformat())


def persistence_generic(records: list[HistoricalRecord], issue_ts: str, var_name: str,
                        conservative_lag_hours: float = 0.0) -> float | None:
    """Last fully available native period before issue time."""
    usable = [r for r in available_by(records, issue_ts, conservative_lag_hours)
              if r.variable == var_name]
    series = _step_series(usable, var_name)
    if not series:
        return None
    issue = datetime.fromisoformat(issue_ts.replace("Z", "+00:00")).date()
    past = [k for k in series if datetime.fromisoformat(k).date() < issue]
    return series[max(past)] if past else None


def climatology_generic(records: list[HistoricalRecord], issue_ts: str, var_name: str,
                        train_years: list[int], conservative_lag_hours: float = 0.0) -> float | None:
    """Median of the target day-of-year +-15d across declared training years
    on the native period series (composites align by period start)."""
    usable = [r for r in available_by(records, issue_ts, conservative_lag_hours)
              if r.variable == var_name]
    series = _step_series(usable, var_name)
    issue = datetime.fromisoformat(issue_ts.replace("Z", "+00:00"))
    vals = []
    for y in train_years:
        for off in range(-15, 16):
            try:
                d = datetime(y, 1, 1) + timedelta(days=issue.timetuple().tm_yday - 1 + off)
            except ValueError:
                continue
            v = _period_value(series, d.date().isoformat(), variable_spec(var_name)["composite_days"])
            if v is not None:
                vals.append(v)
    if not vals:
        return None
    vals.sort()
    return vals[len(vals) // 2]


def evaluate(preds: list[float | None], actuals: list[float | None]) -> dict:
    pairs = [(p, a) for p, a in zip(preds, actuals) if p is not None and a is not None]
    if not pairs:
        return {"n": 0}
    errors = [p - a for p, a in pairs]
    n = len(pairs)
    mae = sum(abs(e) for e in errors) / n
    rmse = math.sqrt(sum(e * e for e in errors) / n)
    return {"n": n, "mae": mae, "rmse": rmse, "bias": sum(errors) / n}


def pinball(pred_q: list[float | None], actuals: list[float | None], q: float) -> float | None:
    pairs = [(p, a) for p, a in zip(pred_q, actuals) if p is not None and a is not None]
    if not pairs:
        return None
    return sum(max(q * (a - p), (q - 1) * (a - p)) for p, a in pairs) / len(pairs)


def coverage(q10: list[float | None], q90: list[float | None], actuals: list[float | None]) -> float | None:
    pairs = [(l, h, a) for l, h, a in zip(q10, q90, actuals) if l is not None and h is not None and a is not None]
    if not pairs:
        return None
    return sum(1 for l, h, a in pairs if l <= a <= h) / len(pairs)
