"""Model explanations grounded in the fitted candidate: grouped
permutation sensitivity on permitted development cases, plus a faithful
local explanation per supported family.

Permutation results are a sensitivity diagnostic, not causal
contributions or significance tests. Correlated groups can substitute —
rankings are reported jointly, not as independent effects.
"""
from __future__ import annotations

import numpy as np

from ..evaluation import estimator as est
from ..model_selection import candidates as cand_mod

SCHEMA = "iris-insight-explanation.v1"
LEGACY_GROUPS = {
    "recent_values": ["recent_1", "recent_2", "recent_3", "recent_4",
                      "recent_5", "recent_6"],
    "recent_stats": ["recent_mean", "recent_std", "recent_delta"],
    "recency": ["input_age_days"],
    "horizon": ["lead_days"],
    "seasonality": ["sin_doy", "cos_doy"],
}


def groups_for(columns) -> dict:
    """Coherent group map for a column schema: lag families, driver
    prefixes and missingness flags stay together."""
    if list(columns) == list(est.COLUMNS):
        return LEGACY_GROUPS
    groups, leftovers = {}, []
    for c in columns:
        if c.startswith("recent") or "_lag" in c or c.endswith("_last"):
            groups.setdefault("target_history", []).append(c)
        elif c.endswith("_missing"):
            groups.setdefault("missingness", []).append(c)
        elif c in ("sin_doy", "cos_doy", "doy_sin", "doy_cos"):
            groups.setdefault("seasonality", []).append(c)
        elif c in ("lead_days", "input_age_days"):
            groups.setdefault("timing", []).append(c)
        else:
            leftovers.append(c)
    if leftovers:
        groups["drivers"] = leftovers
    return groups


def global_importance(state: dict, cases: list, columns, *,
                      groups=None, repeats: int = 8, seed: int = 0,
                      max_cases: int = 400) -> dict:
    """Grouped permutation sensitivity of the fitted q50 on permitted
    cases. All horizons from one issue permute together."""
    cols = list(columns)
    groups = groups or groups_for(cols)
    scored = [c for c in cases if c.get("actual") is not None
              and c.get("feature")][:max_cases]
    if len(scored) < 20:
        return {"schema": SCHEMA, "status": "insufficient_cases",
                "n_cases": len(scored)}
    rng = np.random.default_rng(seed)
    issues = sorted({c["issue"] for c in scored})
    x = est._matrix(scored, cols)
    y = np.array([c["actual"] for c in scored])
    base_pred = _predict_q50(state, x)
    base_mae = float(np.mean(np.abs(base_pred - y)))
    issue_idx = {i: [j for j, c in enumerate(scored) if c["issue"] == i]
                 for i in issues}
    results = {}
    for gname, gcols in groups.items():
        gi = [cols.index(c) for c in gcols if c in cols]
        if not gi:
            continue
        deltas = []
        for _ in range(repeats):
            xp = x.copy()
            perm_issues = rng.permutation(issues)
            for src, dst in zip(issues, perm_issues):
                xp[issue_idx[dst], gi] = x[issue_idx[src], gi]
            deltas.append(float(np.mean(np.abs(_predict_q50(state, xp) - y))
                                - base_mae))
        results[gname] = {"columns": gcols,
                          "mae_increase_mean": float(np.mean(deltas)),
                          "mae_increase_std": float(np.std(deltas)),
                          "repeats": repeats}
    ranked = sorted(results.items(),
                    key=lambda kv: -kv[1]["mae_increase_mean"])
    return {"schema": SCHEMA, "status": "complete", "kind": "global",
            "method": "grouped_issue-block permutation (q50 MAE)",
            "n_cases": len(scored), "n_issues": len(issues),
            "base_mae": base_mae,
            "groups": dict(ranked),
            "limits": "sensitivity diagnostic — not causal contribution "
                      "or significance; correlated groups substitute"}


def _predict_q50(state: dict, x: np.ndarray) -> np.ndarray:
    """Raw fitted median under the replay contract."""
    fam = state["family"]
    if fam in ("hgb_incumbent", "hgb_tuned"):
        return state["fitted"]["models"]["median"].predict(x)
    if fam == "linear_quantile":
        xs = state["scaler"].transform(state["imputer"].transform(x))
        return state["models"]["median"].predict(xs)
    if fam == "lightgbm_quantile":
        return state["models"]["median"].predict(x)
    raise ValueError(f"unsupported family '{fam}' for explanation")


def local(state: dict, case: dict, background_cases: list, columns,
          *, groups=None, top: int = 5) -> dict:
    """One faithful local explanation for a saved forecast.

    linear_quantile -> coefficient contributions of the scaled inputs
    around the background mean (verified decomposable output).
    HGB/LGBM -> grouped reference-replacement sensitivity on the raw
    median regressor (labelled sensitivity, not additive attribution).
    """
    cols = list(columns)
    groups = groups or groups_for(cols)
    x0 = est._matrix([case], cols)
    bg = [c for c in background_cases if c.get("feature")][:200]
    if not bg:
        return {"schema": SCHEMA, "status": "insufficient_background"}
    xb = est._matrix(bg, cols)
    pred0 = float(_predict_q50(state, x0)[0])
    ref = float(np.median(_predict_q50(state, xb)))
    fam = state["family"]
    if fam == "linear_quantile":
        coefs = state["models"]["median"].coef_
        xs0 = state["scaler"].transform(state["imputer"].transform(x0))[0]
        xsb = state["scaler"].transform(state["imputer"].transform(xb))
        contrib = coefs * (xs0 - xsb.mean(axis=0))
        recon = float(state["models"]["median"].intercept_
                      + np.dot(coefs, xs0 - xsb.mean(axis=0)))
        method = "linear coefficient contributions vs background mean"
        scale = {"reference_prediction": recon,
                 "reconstruction_error": abs(recon - pred0)}
    else:
        contrib = np.zeros(len(cols))
        for gname, gcols in groups.items():
            gi = [cols.index(c) for c in gcols if c in cols]
            xp = x0.copy()
            xp[:, gi] = xb[:, gi].mean(axis=0)[gi]
            d = pred0 - float(_predict_q50(state, xp)[0])
            for i in gi:
                contrib[i] = d
        method = ("grouped reference-replacement sensitivity on raw "
                  "median — not additive attribution")
        scale = {}
    by_group = {}
    for gname, gcols in groups.items():
        gi = [cols.index(c) for c in gcols if c in cols]
        if gi:
            by_group[gname] = float(np.sum([contrib[i] for i in gi]))
    top_groups = sorted(by_group.items(), key=lambda kv: -abs(kv[1]))[:top]
    return {"schema": SCHEMA, "status": "complete", "kind": "local",
            "family": fam, "method": method,
            "explained_output": "raw fitted median regressor (pre-sort/"
                                "clip/calibration)",
            "prediction": pred0, "background_median": ref,
            "n_background": len(bg),
            "group_effects": dict(top_groups), **scale,
            "limits": "explains the fitted model's sensitivity, not "
                      "causation or forecast accuracy"}


def statement(local_out: dict) -> str:
    """One deterministic sentence from real evidence."""
    if local_out.get("status") != "complete":
        return "Explanation unavailable for this forecast."
    g = list(local_out["group_effects"].items())[:2]
    parts = " and ".join(f"{n} ({v:+.3g})" for n, v in g)
    return (f"The fitted estimate is most sensitive to {parts} under "
            f"{local_out['method'].split('—')[0].strip()}; this is model "
            "sensitivity, not a causal effect.")
