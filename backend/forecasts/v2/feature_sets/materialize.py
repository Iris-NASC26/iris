"""Availability-safe feature materialization.

One shared constructor for training, evaluation and inference: frozen
dataset bindings + issue time -> the same ordered columns, values,
missing flags and provenance everywhere.

Semantics:
- Inputs must have completed their interval AND be available at issue
  (`fitting.History.inputs` already enforces this per source).
- Rolling windows anchor at the *latest usable target observation end*
  and look strictly backward over completed native intervals — no
  centred windows, no interpolation, no repeated composites.
- A missing driver value stays missing (NaN + flag), never zero.
- Interval joins use each record's own interval, not shared date
  strings; composites are joined by overlap, not manufactured.
"""
from __future__ import annotations

import math
from datetime import timedelta

from ..fitting import History, window
from ..variables import VARIABLES
from ..evaluation.splits import lag_hours

LEGACY_PROFILE = "legacy_v1"
ENHANCED = ("target_history_v1", "drivers_v1")


def columns_for(spec: dict) -> list:
    """Stable ordered column list for a validated spec."""
    from ..fitting import COLUMNS
    if spec["profile"] == LEGACY_PROFILE:
        return list(COLUMNS)
    cols = list(COLUMNS)
    for w in spec["windows_days"]:
        cols += [f"tmean_{w}d", f"tstd_{w}d", f"tmin_{w}d", f"tmax_{w}d"]
        if VARIABLES[spec["target"]["variable"]]["aggregation"] == "sum":
            cols.append(f"tsum_{w}d")
        cols += [f"tcount_{w}d", f"tcoverage_{w}d"]
    w = max(spec["windows_days"])
    cols += [f"tslope_{w}d", "days_since_obs", "sin_doy2", "cos_doy2",
             "t_anomaly", "t_anomaly_z"]
    for d in spec["drivers"]:
        p = f"drv_{d['role']}_{d['variable']}"
        for w in spec["windows_days"]:
            cols += [f"{p}_mean_{w}d", f"{p}_coverage_{w}d"]
        cols += [f"{p}_latest", f"{p}_age_days", f"{p}_missing"]
    return cols[:64]


def load_histories(spec: dict, load_fn):
    """Build one availability-aware History per frozen binding."""
    target_ds = spec["target"]["dataset_id"]
    histories = {}
    for binding in ([{"dataset_id": target_ds,
                      "variable": spec["target"]["variable"],
                      "source_id": spec.get("target_source_id"),
                      "role": "target"}]
                    + spec["drivers"]):
        records = load_fn(spec["location_id"], binding["dataset_id"]) or []
        if not records:
            histories[binding["dataset_id"]] = None
            continue
        source = binding.get("source_id") or records[0].get("source_id")
        lag = lag_hours({"source_id": source})
        histories[binding["dataset_id"]] = History(
            records, binding["variable"], source, lag)
    return histories


def _window_stats(rows, anchor, days):
    """Backward-looking stats over rows whose intervals fall in
    [anchor - days, anchor). Returns stats + completeness."""
    lo = anchor - timedelta(days=days)
    inside = [r for r in rows if lo <= r["start"] and r["end"] <= anchor]
    values = [r["value"] for r in inside]
    n = len(values)
    if not n:
        return {"mean": None, "std": None, "min": None, "max": None,
                "sum": None, "count": 0, "coverage": 0.0}
    mean = sum(values) / n
    var = sum((v - mean) ** 2 for v in values) / n
    span = sum((r["end"] - r["start"]).total_seconds() for r in inside)
    return {"mean": mean, "std": math.sqrt(var), "min": min(values),
            "max": max(values), "sum": sum(values), "count": n,
            "coverage": min(1.0, span / (days * 86400.0))}


def _slope(rows, anchor, days):
    """Backward-looking least-squares slope over completed intervals."""
    lo = anchor - timedelta(days=days)
    pts = [((r["start"] - lo).total_seconds() / 86400.0, r["value"])
           for r in rows if lo <= r["start"] and r["end"] <= anchor]
    n = len(pts)
    if n < 3:
        return None
    xs, ys = zip(*pts)
    xm, ym = sum(xs) / n, sum(ys) / n
    denom = sum((x - xm) ** 2 for x in xs)
    return (sum((x - xm) * (y - ym) for x, y in pts) / denom) if denom else 0.0


def build_row(spec: dict, histories: dict, issue, horizon,
              transform=None) -> dict | None:
    """One feature row at `issue` for `horizon` — or None with a reason
    recorded by the caller when the target-side feature is absent."""
    target_var = spec["target"]["variable"]
    hist = histories.get(spec["target"]["dataset_id"])
    if hist is None:
        return None
    base = hist.feature(issue, horizon)
    if base is None:
        return None
    if spec["profile"] == LEGACY_PROFILE:
        return {"x": base, "meta": {"input_age_days": base["input_age_days"],
                                    "driver_missing": []}}
    inputs = hist.inputs(issue)
    latest = inputs[-1] if inputs else None
    anchor = latest["end"] if latest else None
    if anchor is None:
        return None
    tstart, _ = window(issue, horizon, target_var)
    agg = VARIABLES[target_var]["aggregation"]
    x = dict(base)
    for w in spec["windows_days"]:
        st = _window_stats(inputs, anchor, w)
        for k in ("mean", "std", "min", "max"):
            x[f"t{k}_{w}d"] = st[k]
        if agg == "sum":
            x[f"tsum_{w}d"] = st["sum"]
        x[f"tcount_{w}d"] = st["count"]
        x[f"tcoverage_{w}d"] = st["coverage"]
    w = max(spec["windows_days"])
    x[f"tslope_{w}d"] = _slope(inputs, anchor, w)
    x["days_since_obs"] = (issue - anchor).total_seconds() / 86400.0
    doy = tstart.timetuple().tm_yday
    x["sin_doy2"] = math.sin(4 * math.pi * doy / 365.25)
    x["cos_doy2"] = math.cos(4 * math.pi * doy / 365.25)
    # transform-fitted anomaly: frozen reference, NaN until fitted
    if transform is not None:
        x["t_anomaly"] = transform.anomaly(latest["value"], anchor)
        x["t_anomaly_z"] = transform.anomaly_z(latest["value"], anchor)
    else:
        x["t_anomaly"] = None
        x["t_anomaly_z"] = None
    missing = []
    for d in spec["drivers"]:
        p = f"drv_{d['role']}_{d['variable']}"
        dh = histories.get(d["dataset_id"])
        din = dh.inputs(issue) if dh is not None else []
        dmiss = not din or (dh is None)
        stale = False
        if din:
            dlatest = din[-1]
            age = (issue - dlatest["end"]).total_seconds() / 86400.0
            stale = age > float(d["max_age_days"])
        else:
            dlatest, age = None, None
        if dmiss or stale:
            missing.append(d["role"])
        for w2 in spec["windows_days"]:
            st = (_window_stats(din, anchor, w2) if din
                  else {"mean": None, "coverage": 0.0})
            x[f"{p}_mean_{w2}d"] = st["mean"]
            x[f"{p}_coverage_{w2}d"] = st["coverage"]
        x[f"{p}_latest"] = None if dlatest is None else dlatest["value"]
        x[f"{p}_age_days"] = age
        x[f"{p}_missing"] = 1.0 if (dmiss or stale) else 0.0
    if (spec["missing_policy"] == "require_complete"
            and any(d["required"] and d["role"] in missing
                    for d in spec["drivers"])):
        return None
    return {"x": x, "meta": {"input_age_days": base["input_age_days"],
                             "anchor": anchor.isoformat(),
                             "driver_missing": missing}}
