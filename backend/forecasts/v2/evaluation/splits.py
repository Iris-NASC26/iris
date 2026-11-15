"""Chronological case construction, walk-forward folds, and holdout policy.

All boundaries are calendar timestamps, never record indexes: native
periods may be short year-end composites and records are not assumed
equally spaced.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from ..variables import VARIABLES
from ..fitting import window


def _stamp(value):
    d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return d.astimezone(UTC) if d.tzinfo else d.replace(tzinfo=UTC)


def lag_hours(manifest: dict) -> float:
    """Declared source availability delay — the same resolution the live
    router uses: manifest override, NASA POWER constant, Meteomatics
    source options, then Earthdata product delay."""
    if manifest.get("source_lag_hours") is not None:
        return float(manifest["source_lag_hours"])
    source_id = manifest.get("source_id", "")
    from .. import power, sources
    from ..variables import PRODUCTS
    if source_id == power.SOURCE_ID:
        return float(power.DELAY_HOURS)
    if source_id in sources.SOURCE_OPTIONS:
        return float(sources.SOURCE_OPTIONS[source_id][1])
    return 24.0 * float(PRODUCTS.get(source_id, {}).get("delay_days", 30))


def evidence(row: dict, declared_lag_hours: float) -> str:
    """Availability-evidence level of one source row.

    An explicit verified source vintage timestamp wins; an explicit
    `available_at` or the declared delay gives estimated availability;
    otherwise the level is honestly unknown.
    """
    if row.get("vintage_at") or row.get("published_at"):
        return "verified_vintage"
    if row.get("available_at") or declared_lag_hours > 0:
        return "estimated_availability"
    return "unknown"


def make_history(records, target, source, lag):
    """Read-only reuse of the shared availability-aware History."""
    from ..fitting import History
    return History(records, target, source, lag)


def cases(history, manifest, horizons, issue_cfg, dev_end) -> list:
    """Scored case rows: one per issue × horizon through `dev_end`.

    A case is scored only when the dataset genuinely holds its native
    target window; missing windows become recorded exclusions.
    """
    rows = [r for r in history.rows if r["start"] < dev_end]
    cases, excluded = [], {"missing_target_window": 0, "insufficient_inputs": 0}
    cadence = timedelta(days=int(issue_cfg["cadence_days"]))
    target = history.target
    for i, r in enumerate(rows):
        if i % max(1, round(cadence.days / VARIABLES[target]["composite_days"])) != 0:
            continue
        issue = r["start"]
        for h in horizons:
            start, end = window(issue, h, target)
            label = history.by_start.get(start)
            base = {"issue": issue.isoformat(), "horizon": h,
                    "window_start": start.isoformat(), "window_end": end.isoformat()}
            if label is None or label["end"] != end:
                excluded["missing_target_window"] += 1
                continue
            x = history.feature(issue, h)
            if x is None:
                excluded["insufficient_inputs"] += 1
                continue
            cases.append({**base, "feature": x,
                          "actual": label["value"],
                          "label_available": label["available"].isoformat(),
                          "input_age_days": x["input_age_days"],
                          "evidence": evidence(label, float(lag_hours(manifest)))})
    return cases, excluded


def holdout_boundary(issues, holdout_cfg) -> datetime:
    """Contiguous final assessment period: explicit start or tail fraction."""
    if not issues:
        return datetime(1970, 1, 1, tzinfo=UTC)
    if holdout_cfg.get("start"):
        return _stamp(holdout_cfg["start"])
    keep = int(len(issues) * (1 - float(holdout_cfg.get("fraction", 0.15))))
    return issues[max(0, min(keep, len(issues) - 1))]


def fold_plan(issues, n_folds) -> list:
    """Expanding-window plan: contiguous outer test blocks inside development.

    issues: sorted unique development issue times. Returns plans whose
    each test block is a contiguous slice of the issue timeline; fold i's
    development data is everything strictly before its test block.
    """
    n = len(issues)
    if n < n_folds + 1:
        return []
    block = n // (n_folds + 1)
    plans = []
    for i in range(n_folds):
        lo = n - block * (n_folds - i)
        hi = n if i == n_folds - 1 else n - block * (n_folds - i - 1)
        plans.append({"fold": i, "test_start": issues[lo],
                      "test_end": issues[hi - 1], "train_end": issues[lo]})
    return plans


def inner_split(train_cases, dev_cfg):
    """Chronological train/validation/calibration partitions of one fold's
    development cases, purged by label availability at each boundary."""
    ordered = sorted(train_cases, key=lambda c: _stamp(c["issue"]))
    n = len(ordered)
    train_f = float(dev_cfg.get("inner_train_fraction", 0.55))
    val_f = float(dev_cfg.get("inner_validation_fraction", 0.15))
    a = _stamp(ordered[int(n * train_f)]["issue"])
    b = _stamp(ordered[int(n * (train_f + val_f))]["issue"])
    embargo = timedelta(days=float(dev_cfg.get("embargo_days", 0) or 0))

    def avail(c):
        return _stamp(c["label_available"])

    def window_end(c):
        return _stamp(c["window_end"])

    train = [c for c in ordered if _stamp(c["issue"]) < a and avail(c) < a
             and window_end(c) + embargo <= a]
    val = [c for c in ordered if a <= _stamp(c["issue"]) < b and avail(c) < b]
    cal = [c for c in ordered if _stamp(c["issue"]) >= b]
    return {"train": train, "validation": val, "calibration": cal,
            "boundaries": {"train_end": a.isoformat(),
                           "validation_end": b.isoformat()}}
