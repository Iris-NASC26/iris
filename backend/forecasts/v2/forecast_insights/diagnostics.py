"""Coverage diagnostics on frozen evaluation case rows: raw vs adjusted
interval coverage, width, per-tail misses, MAE/bias, pinball, interval
score, group breakdowns, and paired time-block bootstrap uncertainty.

Blocks are whole ISSUES (all horizons of one issue resampled together —
target windows overlap, so per-case resampling would fake independence).
Never a binomial CI labelled dependence-corrected.
"""
from __future__ import annotations

import math

import numpy as np

from ..evaluation import metrics as mx
from ..variables import VARIABLES

MIN_BLOCKS = 5


def _q(row) -> np.ndarray | None:
    pred = (row.get("predictions") or {}).get("candidate")
    return np.asarray(pred["q"]) if pred and "q" in pred else None


def summarize(rows, *, target: str, adjusted=None, level: float = 0.8) -> dict:
    """raw + adjusted interval metrics on identical scored cases."""
    scored = [(r, _q(r)) for r in rows if _q(r) is not None
              and r.get("actual") is not None]
    out = {"n_scored": len(scored), "n_total": len(rows), "level": level}
    if not scored:
        out["status"] = "insufficient_cases"
        return out
    y = np.array([r["actual"] for r, _ in scored])
    q = np.array([qq for _, qq in scored])
    out["raw"] = {**mx.summarize_cases(q, y)}
    low_miss = float(np.mean(y < q[:, 0]))
    high_miss = float(np.mean(y > q[:, 2]))
    out["raw"]["tail_miss"] = {"lower": low_miss, "upper": high_miss}
    if adjusted is not None:
        adj = np.array([adjusted(qq) for _, qq in scored])
        cov = float(np.mean((y >= adj[:, 0]) & (y <= adj[:, 1])))
        width = float(np.mean(adj[:, 1] - adj[:, 0]))
        out["adjusted"] = {"coverage_80": cov, "mean_width": width,
                           "tail_miss": {
                               "lower": float(np.mean(y < adj[:, 0])),
                               "upper": float(np.mean(y > adj[:, 1]))}}
    out["status"] = "complete"
    return out


def breakdown(rows, *, target: str, adjusted=None,
              by=("horizon", "season")) -> dict:
    """Per-slice diagnostics; slices fixed by policy, counts disclosed."""
    out = {}
    for dim in by:
        groups = {}
        for r in rows:
            key = r.get(dim)
            groups.setdefault(key, []).append(r)
        out[dim] = {str(k): summarize(v, target=target, adjusted=adjusted)
                    for k, v in sorted(groups.items(), key=lambda kv: str(kv[0]))}
    return out


def _issue_key(row) -> str:
    return str(row.get("issue"))


def block_bootstrap(rows, stat_fn, *, n_boot: int = 300, seed: int = 0,
                    min_blocks: int = MIN_BLOCKS) -> dict:
    """Paired time-block bootstrap over whole issues.

    stat_fn(list_of_rows) -> float. Issues resampled with replacement;
    each issue carries ALL its horizon rows. An issue may repeat within a
    replicate — a documented approximation, not an exact guarantee."""
    issues = {}
    for r in rows:
        issues.setdefault(_issue_key(r), []).append(r)
    keys = sorted(issues)
    if len(keys) < min_blocks:
        return {"status": "insufficient_dependence_blocks",
                "n_blocks": len(keys),
                "reason": "too few independent issues for a block "
                          "bootstrap; point estimates only"}
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n_boot):
        pick = rng.choice(keys, size=len(keys), replace=True)
        rep = [r for k in pick for r in issues[k]]
        v = stat_fn(rep)
        if v is not None and math.isfinite(v):
            vals.append(float(v))
    vals = np.asarray(vals)
    return {"status": "approximate", "n_blocks": len(keys),
            "n_boot": int(vals.size),
            "estimate": stat_fn(rows),
            "ci95": [float(np.quantile(vals, 0.025)),
                     float(np.quantile(vals, 0.975))],
            "std": float(vals.std()),
            "method": "paired issue-block bootstrap",
            "caveat": "approximate under serial dependence and shared "
                      "window overlap; not an exact conformal guarantee"}
