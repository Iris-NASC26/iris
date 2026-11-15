"""Target-specific unusual-condition indicators: versioned threshold
catalogue, permitted-history fitting, median/interval-vs-threshold
status, conservative quantile-implied bounds, and event evaluation.

Indicators, not alerts. No exact event probability is invented from
three quantiles; bounds come from the quantile ordering only.
"""
from __future__ import annotations

import math
from datetime import datetime

import numpy as np

from ..variables import VARIABLES

SCHEMA = "iris-insight-threshold.v1"

# Scoped rules: statistical-percentile rules use a seasonal monthly
# reference; physical rules are user-declared and explicitly labeled.
CATALOGUE = {
    "gldas_sm": {"rule": "low_seasonal_percentile", "percentile": 10.0,
                 "tail": "lower", "min_obs": 30,
                 "label": "unusually dry soil-moisture for this record"},
    "power_t2m": {"rule": "high_seasonal_percentile", "percentile": 90.0,
                  "tail": "upper", "min_obs": 30,
                  "label": "unusually warm daily mean for this record"},
    "merra2_t2m": {"rule": "high_seasonal_percentile", "percentile": 90.0,
                   "tail": "upper", "min_obs": 30,
                   "label": "unusually warm daily mean for this record"},
    "precip_24h": {"rule": "high_seasonal_percentile", "percentile": 95.0,
                   "tail": "upper", "min_obs": 30, "zero_heavy": True,
                   "label": "unusually wet 24h total for this record"},
}


def _stamp(v):
    d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    return d


def fit(rows, target: str, *, cutoff: datetime, context: dict,
        rule_override: dict | None = None) -> dict:
    """Fit a threshold on permitted history only: interval end AND
    availability strictly before `cutoff`. Records what was computed."""
    spec = dict(CATALOGUE.get(target) or {})
    if rule_override:
        spec.update(rule_override)
    if not spec:
        return {"schema": SCHEMA, "target": target,
                "status": "unsupported_target",
                "reason": "no scoped threshold rule for this target"}
    permitted = [r for r in rows
                 if r.get("value") is not None
                 and _stamp(r["end"]) < cutoff
                 and _stamp(r["available"]) < cutoff]
    n = len(permitted)
    art = {"schema": SCHEMA, "target": target,
           "unit": VARIABLES[target]["unit"],
           "rule": spec["rule"], "tail": spec["tail"],
           "percentile": spec.get("percentile"),
           "seasonal_method": "month-of-year",
           "context": context, "fit_cutoff": cutoff.isoformat(),
           "n_permitted": n, "min_obs": spec["min_obs"],
           "label": spec["label"],
           "kind": "statistical_percentile",
           "thresholds": {}, "status": "fitted"}
    if n < spec["min_obs"]:
        art["status"] = "insufficient_history"
        art["reason"] = f"{n} permitted observations < {spec['min_obs']}"
        return art
    by_month = {}
    for r in permitted:
        by_month.setdefault(_stamp(r["end"]).month, []).append(float(r["value"]))
    global_vals = [float(r["value"]) for r in permitted]
    for m in range(1, 13):
        vals = by_month.get(m, [])
        vals = vals if len(vals) >= 6 else global_vals
        art["thresholds"][str(m)] = float(
            np.quantile(vals, spec["percentile"] / 100.0))
    art["n_events"] = int(sum(
        (v <= art["thresholds"][str(_stamp(r["end"]).month)])
        if spec["tail"] == "lower" else
        (v >= art["thresholds"][str(_stamp(r["end"]).month)])
        for r, v in ((r, float(r["value"])) for r in permitted)))
    return art


def threshold_for(artifact: dict, when) -> float | None:
    if artifact.get("status") != "fitted":
        return None
    return artifact["thresholds"].get(str(_stamp(when).month))


def indicator(artifact: dict, raw_q, when) -> dict:
    """Median-vs-threshold + interval-vs-threshold with a conservative
    quantile-implied bound — never an exact probability."""
    t = threshold_for(artifact, when)
    if t is None:
        return {"status": "unavailable",
                "reason": artifact.get("reason", "threshold not fitted")}
    q10, q50, q90 = [float(v) for v in raw_q]
    tail = artifact["tail"]
    if tail == "upper":
        median_status = "above" if q50 >= t else "below"
        interval_status = ("entirely_above" if q10 >= t else
                           "entirely_below" if q90 < t else "crosses")
        bound = ("[0, 0.10]" if q10 >= t else
                 "(0.10, 0.50]" if q50 >= t else
                 "(0.50, 0.90]" if q90 >= t else "(0.90, 1.0)")
    else:
        median_status = "below" if q50 <= t else "above"
        interval_status = ("entirely_below" if q90 <= t else
                           "entirely_above" if q10 > t else "crosses")
        bound = ("[0, 0.10]" if q90 <= t else
                 "(0.10, 0.50]" if q50 <= t else
                 "(0.50, 0.90]" if q10 <= t else "(0.90, 1.0)")
    return {"status": "available", "threshold": t,
            "tail": tail, "label": artifact["label"],
            "median_vs_threshold": median_status,
            "interval_vs_threshold": interval_status,
            "quantile_implied_bound": bound,
            "probability": "unavailable — bound from quantile order only, "
                           "not a calibrated event probability"}


def evaluate_events(rows, artifact: dict) -> dict:
    """Observed-event evaluation of the threshold decision rule:
    hits/misses/false alarms/correct negatives with explicit denominators."""
    ev = {"hit": 0, "miss": 0, "false_alarm": 0, "correct_negative": 0}
    n = 0
    for r in rows:
        t = threshold_for(artifact, r.get("window_start") or r.get("issue"))
        q = (r.get("predictions") or {}).get("candidate")
        if t is None or q is None or r.get("actual") is None:
            continue
        n += 1
        actual_event = (r["actual"] <= t if artifact["tail"] == "lower"
                        else r["actual"] >= t)
        forecast_event = (q["q"][1] <= t if artifact["tail"] == "lower"
                          else q["q"][1] >= t)
        if actual_event and forecast_event:
            ev["hit"] += 1
        elif actual_event:
            ev["miss"] += 1
        elif forecast_event:
            ev["false_alarm"] += 1
        else:
            ev["correct_negative"] += 1
    out = {"n_scored": n, "counts": ev,
           "event_prevalence": (ev["hit"] + ev["miss"]) / n if n else None}
    if n == 0:
        out["status"] = "insufficient_cases"
        return out
    if ev["hit"] + ev["miss"] == 0:
        out["status"] = "insufficient_events"
        out["reason"] = ("no observed events in this period — rare-event "
                         "skill cannot be established")
    else:
        out["status"] = "complete"
    out["precision"] = (ev["hit"] / (ev["hit"] + ev["false_alarm"])
                        if ev["hit"] + ev["false_alarm"] else None)
    out["recall"] = (ev["hit"] / (ev["hit"] + ev["miss"])
                     if ev["hit"] + ev["miss"] else None)
    return out
