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

LAGS_DAYS = (1, 2, 3, 7, 14, 28)
TRAIL_DAYS = (7, 30, 90)
WET_MM = 1.0  # declared wet-day threshold


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


def build_features(records: list[HistoricalRecord], issue_ts: str, target_index: int = 0,
                   conservative_lag_hours: float = 0.0) -> dict | None:
    """Feature row for one target window, or None when history is insufficient.

    All features trail the issue time by availability, not just interval end —
    a finalized reanalysis record published later cannot leak in.
    """
    usable = available_by(records, issue_ts, conservative_lag_hours)
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
                         conservative_lag_hours: float = 0.0) -> float | None:
    """Median of the target day-of-year +-15d across declared training years."""
    usable = available_by(records, issue_ts, conservative_lag_hours)
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


def persistence(records: list[HistoricalRecord], issue_ts: str, conservative_lag_hours: float = 0.0) -> float | None:
    usable = available_by(records, issue_ts, conservative_lag_hours)
    daily = _daily_series(usable)
    issue = datetime.fromisoformat(issue_ts.replace("Z", "+00:00"))
    return daily.get((issue - timedelta(days=1)).date().isoformat())


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
