"""Conformalized-quantile interval calibration for fitted q10/q50/q90
models (Romano–Patterson–Candès CQR family, 80% level only here).

Lifecycle contract: scores come ONLY from permitted calibration cases
(raw frozen predictions + observed labels available at the calibration
cutoff). The finite-sample order statistic is `ceil((n+1)*(1-alpha))` in
ONE-BASED order — never interpolated, never capped to claim the level
with too few cases. `expand_only` is the documented default policy:
negative scores cannot shrink intervals; `symmetric` is available and
explicitly versioned, never auto-selected from test outcomes.
"""
from __future__ import annotations

import math

import numpy as np

from ..variables import VARIABLES

SCHEMA = "iris-insight-calibration.v1"
MIN_SCORES = 10  # below this the order statistic cannot support the level


def scores(cases) -> np.ndarray:
    """Nonconformity scores max(q10 - y, y - q90) from raw predictions."""
    out = []
    for c in cases:
        pred = (c.get("predictions") or {}).get("candidate") or {}
        q = pred.get("q")
        y = c.get("actual")
        if q is None or y is None:
            continue
        s = max(q[0] - y, y - q[2])
        if math.isfinite(s):
            out.append(float(s))
    return np.asarray(out)


def fit(cases, *, level: float = 0.8, policy: str = "expand_only",
        cutoff: str | None = None, context: dict | None = None,
        min_scores: int = MIN_SCORES) -> dict:
    """Fit one calibrator on permitted cases -> versioned artifact dict."""
    if policy not in ("expand_only", "symmetric"):
        raise ValueError(f"unknown calibration policy '{policy}'")
    if not (0.5 <= level < 1.0):
        raise ValueError("level must be within [0.5, 1)")
    sc = scores(cases)
    n = int(sc.size)
    alpha = 1.0 - level
    k = math.ceil((n + 1) * (1 - alpha))  # one-based order statistic
    art = {"schema": SCHEMA, "method": "split_conformal_quantile",
           "level": level, "policy": policy, "n_scores": n,
           "cutoff": cutoff, "context": context or {},
           "status": "insufficient_calibration" if (
               n < min_scores or k > n) else "calibrated",
           "order_statistic_one_based": k,
           "correction": None, "min_scores": min_scores}
    if art["status"] == "insufficient_calibration":
        art["reason"] = (f"n={n} cannot support the {level:.0%} level "
                         f"(need >= {min_scores} and k={k} <= n)")
        return art
    ordered = np.sort(sc)
    raw_k = float(ordered[k - 1])
    art["correction"] = (max(0.0, raw_k) if policy == "expand_only"
                         else raw_k)
    art["score_summary"] = {"mean": float(sc.mean()),
                            "p50": float(np.median(sc)),
                            "max": float(sc.max())}
    return art


def apply(artifact: dict, raw_q, target: str) -> dict:
    """Apply a fitted calibrator to a raw [q10,q50,q90] triple.

    Raw fitted quantiles stay distinct from adjusted interval endpoints;
    adjusted endpoints are NOT new CDF quantiles. Returns an explicit
    invalid state rather than hiding a calibration failure."""
    if artifact.get("status") != "calibrated":
        return {"status": "uncalibrated",
                "reason": artifact.get("reason", "no valid calibrator"),
                "interval": None, "raw_q": list(raw_q)}
    q = np.asarray(raw_q, dtype=float)
    if q.shape != (3,) or not np.all(np.isfinite(q)):
        return {"status": "invalid_input", "raw_q": list(raw_q),
                "reason": "raw_q must be finite [q10,q50,q90]"}
    c = float(artifact["correction"])
    bounds = VARIABLES[target]
    lo, med, hi = q[0] - c, q[1], q[2] + c
    clipped_lo = lo < bounds["min"]
    clipped_hi = hi > bounds["max"]
    lo = max(bounds["min"], lo)
    hi = min(bounds["max"], hi)
    if not lo <= med <= hi:
        return {"status": "invalid_calibration",
                "reason": "adjusted interval violates ordered bounds",
                "raw_q": list(raw_q)}
    return {"status": "calibrated", "raw_q": q.tolist(),
            "interval": [float(lo), float(hi)],
            "median": float(med), "correction": c,
            "clipped": {"lower": bool(clipped_lo), "upper": bool(clipped_hi)},
            "policy": artifact["policy"],
            "note": "endpoints are calibrated interval bounds, not new "
                    "quantile levels"}
