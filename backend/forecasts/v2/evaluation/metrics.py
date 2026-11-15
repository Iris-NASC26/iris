"""Independently testable metric functions; error units stay explicit."""
from __future__ import annotations

import numpy as np

QUANTILES = np.array([0.1, 0.5, 0.9])


def mae(pred, y) -> float:
    return float(np.mean(np.abs(np.asarray(pred, dtype=float) - np.asarray(y))))


def rmse(pred, y) -> float:
    return float(np.sqrt(np.mean((np.asarray(pred, dtype=float) - np.asarray(y)) ** 2)))


def bias(pred, y) -> float:
    return float(np.mean(np.asarray(pred, dtype=float) - np.asarray(y)))


def pinball(pred_quantiles, y) -> float:
    """Mean pinball loss over q10/q50/q90."""
    p = np.asarray(pred_quantiles, dtype=float)
    y = np.asarray(y, dtype=float)
    error = y[:, None] - p
    return float(np.mean(np.maximum(QUANTILES * error, (QUANTILES - 1) * error)))


def coverage(pred_quantiles, y) -> float:
    """Empirical q10–q90 interval coverage (observed, not asserted)."""
    p = np.asarray(pred_quantiles, dtype=float)
    y = np.asarray(y, dtype=float)
    return float(np.mean((p[:, 0] <= y) & (y <= p[:, 2])))


def mean_width(pred_quantiles) -> float:
    p = np.asarray(pred_quantiles, dtype=float)
    return float(np.mean(p[:, 2] - p[:, 0]))


def interval_score(pred_quantiles, y, alpha=0.2) -> float:
    """Winkler interval score: width + 2/alpha penalty outside (lower is better)."""
    p = np.asarray(pred_quantiles, dtype=float)
    y = np.asarray(y, dtype=float)
    lo, hi = p[:, 0], p[:, 2]
    score = (hi - lo) + (2.0 / alpha) * np.maximum(lo - y, 0) \
        + (2.0 / alpha) * np.maximum(y - hi, 0)
    return float(np.mean(score))


def relative_mae(model_mae, baseline_mae):
    """MAE skill vs a baseline on identical cases; None when undefined."""
    if baseline_mae is None or baseline_mae <= 0:
        return None
    return 1.0 - model_mae / baseline_mae


def summarize_cases(pred_quantiles, y) -> dict:
    p, y = np.asarray(pred_quantiles, dtype=float), np.asarray(y, dtype=float)
    return {"n": int(len(y)), "mae": mae(p[:, 1], y), "rmse": rmse(p[:, 1], y),
            "bias": bias(p[:, 1], y), "pinball": pinball(p, y),
            "coverage_80": coverage(p, y), "mean_width": mean_width(p),
            "interval_score_80": interval_score(p, y)}


def grouped(rows, by):
    """Aggregate case metrics per group (horizon / fold / season / context).

    rows: case dicts with "predictions": {name: {"q":[..]}}, "actual",
    and the `by` field. Returns per-group metric summaries; macro and
    case-weighted aggregates are computed by the caller.
    """
    out = {}
    groups = {}
    for c in rows:
        groups.setdefault(c[by], []).append(c)
    for key, cases in sorted(groups.items(), key=lambda kv: str(kv[0])):
        y = np.array([c["actual"] for c in cases])
        methods = cases[0].get("methods", ())
        entry = {"n": len(cases), "methods": {}, "common": {}}
        # cases scored by every method — the only fair comparison subset
        common = [c for c in cases
                  if all(c["predictions"].get(m) is not None for m in methods)]
        entry["common"]["n"] = len(common)
        for name in methods:
            preds = [c["predictions"].get(name) for c in cases]
            scored = [(p, c["actual"]) for p, c in zip(preds, cases)
                      if p is not None]
            deterministic = scored and all(
                p.get("deterministic") for p, _ in scored)
            if scored:
                yy = np.array([a for _, a in scored])
                if deterministic:
                    # EVAL-06e: a point estimate is not an estimated
                    # distribution — interval metrics stay unavailable.
                    pts = np.array([p["point"] for p, _ in scored])
                    entry["methods"][name] = {
                        "n": len(scored),
                        "excluded": len(cases) - len(scored),
                        "mae": mae(pts, yy), "rmse": rmse(pts, yy),
                        "bias": bias(pts, yy), "pinball": None,
                        "coverage_80": None, "mean_width": None,
                        "interval_score_80": None,
                        "interval_metrics": "unavailable_deterministic"}
                else:
                    q = np.array([p["q"] for p, _ in scored])
                    entry["methods"][name] = {**summarize_cases(q, yy),
                                              "excluded": len(cases) - len(scored)}
            else:
                entry["methods"][name] = {"n": 0, "excluded": len(cases),
                                          "mae": None}
            if common:
                yc = np.array([c["actual"] for c in common])
                pc = [c["predictions"][name] for c in common]
                if all(p.get("deterministic") for p in pc):
                    pts = np.array([p["point"] for p in pc])
                    entry["common"][name] = {
                        "n": len(common), "mae": mae(pts, yc),
                        "rmse": rmse(pts, yc), "bias": bias(pts, yc),
                        "pinball": None, "coverage_80": None,
                        "mean_width": None, "interval_score_80": None,
                        "interval_metrics": "unavailable_deterministic"}
                else:
                    qc = np.array([p["q"] for p in pc])
                    entry["common"][name] = summarize_cases(qc, yc)
        out[key] = entry
    return out
