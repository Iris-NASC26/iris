"""Candidate estimator adapter — the existing boosted-quantile model family.

Mirrors fitting.py's fixed configuration (leaves selected on inner
validation only, q10/median/q90 fits, calibration-block interval
correction) but never calls the live _persist path: fitted bundles stay
inside evaluation artifacts.
"""
from __future__ import annotations

import numpy as np

from ..fitting import COLUMNS
from ..variables import VARIABLES


def _matrix(cases):
    return np.array([[c["feature"][k] for k in COLUMNS] for c in cases],
                    dtype=float)


def _labels(cases):
    return np.array([c["actual"] for c in cases], dtype=float)


def _hgb(q, leaves, cfg, seed):
    from sklearn.ensemble import HistGradientBoostingRegressor
    return HistGradientBoostingRegressor(
        loss="quantile", quantile=q,
        max_iter=int(cfg["max_iter"]),
        max_leaf_nodes=int(leaves),
        min_samples_leaf=int(cfg["min_samples_leaf"]),
        l2_regularization=float(cfg["l2_regularization"]),
        early_stopping=False, random_state=int(seed))


def select_and_fit(train, validation, cfg, seed, limits=None):
    """Pick `leaves` on validation q50-MAE, then fit all quantiles on
    train+validation. Returns fitted models + chosen settings."""
    from threadpoolctl import threadpool_limits
    with threadpool_limits(limits=1):
        candidates = []
        for leaves in cfg["leaves_candidates"][:int(
                (limits or {}).get("max_candidates", 4))]:
            m = _hgb(0.5, leaves, cfg, seed).fit(_matrix(train), _labels(train))
            err = float(np.mean(np.abs(m.predict(_matrix(validation))
                                       - _labels(validation))))
            candidates.append((err, int(leaves)))
        _, leaves = min(candidates)
        fitting = train + validation
        models = {name: _hgb(q, leaves, cfg, seed).fit(_matrix(fitting),
                                                     _labels(fitting))
                  for name, q in (("q10", 0.1), ("median", 0.5), ("q90", 0.9))}
    return {"models": models, "selected": {"max_leaf_nodes": leaves},
            "n_fitting": len(fitting)}


def predict_quantiles(fitted, cases, target):
    p = np.column_stack([fitted["models"][name].predict(_matrix(cases))
                         for name in ("q10", "median", "q90")])
    p.sort(axis=1)
    return np.clip(p, VARIABLES[target]["min"], VARIABLES[target]["max"])


def conformal_correction(fitted, calibration_cases, target):
    """One-sided residual correction fitted ONLY on the fold's calibration
    block — the same adjustment the live engine applies."""
    cal = predict_quantiles(fitted, calibration_cases, target)
    y = _labels(calibration_cases)
    residual = np.maximum(cal[:, 0] - y, y - cal[:, 2])
    k = min(1.0, np.ceil((len(residual) + 1) * 0.8) / len(residual))
    return max(0.0, float(np.quantile(residual, k, method="higher")))


def apply_correction(pred, correction, target):
    out = pred.copy()
    out[:, 0] = np.maximum(VARIABLES[target]["min"], out[:, 0] - correction)
    out[:, 2] = np.minimum(VARIABLES[target]["max"], out[:, 2] + correction)
    return out
