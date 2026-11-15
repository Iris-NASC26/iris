"""Versioned candidate contract + estimator factories for Phase-5 selection.

Every candidate produces an `estimator_fn(parts, spec, columns, target)`
plugged into the corrected Phase-3 evaluator — inner train/validation
selects hyperparameters, the calibration block fits residual corrections,
the outer fold scores. Nothing here touches live model artifacts.
"""
from __future__ import annotations

import hashlib
import json
import random

import numpy as np

from ..evaluation import estimator as est
from ..variables import VARIABLES

SCHEMA = "iris-candidate.v1"
ENGINE = "iris-modelsel-v1"

# Incumbent reproduction — identical to evaluation/estimator defaults.
INCUMBENT = {"family": "hgb_incumbent", "version": "v1",
             "params": {"learning_rate": 0.1, "max_iter": 120,
                        "leaves_candidates": [3, 7],
                        "min_samples_leaf": 15,
                        "l2_regularization": 1.0},
             "interval": "native_quantile+conformal_calibration"}

# Bounded trial grid — each axis justified: learning rate and iteration
# count trade bias/variance; leaves and min_samples_leaf control tree
# capacity; l2 damps leaf weights. 6 trials total budget.
HGB_TRIAL_GRID = [
    {"learning_rate": 0.05, "max_iter": 200, "leaves": 7,
     "min_samples_leaf": 15, "l2_regularization": 1.0},
    {"learning_rate": 0.10, "max_iter": 120, "leaves": 7,
     "min_samples_leaf": 15, "l2_regularization": 1.0},
    {"learning_rate": 0.10, "max_iter": 80, "leaves": 3,
     "min_samples_leaf": 30, "l2_regularization": 1.0},
    {"learning_rate": 0.05, "max_iter": 300, "leaves": 15,
     "min_samples_leaf": 10, "l2_regularization": 5.0},
    {"learning_rate": 0.20, "max_iter": 60, "leaves": 7,
     "min_samples_leaf": 20, "l2_regularization": 0.0},
    {"learning_rate": 0.10, "max_iter": 150, "leaves": 15,
     "min_samples_leaf": 15, "l2_regularization": 1.0},
]

# Interpretable challenger — bounded regularization search, inner-selected.
LINEAR_ALPHAS = [0.0, 0.1, 1.0]


def spec_for(cand: dict, *, feature_profile: dict, columns: list,
             bindings: dict, seed: int) -> dict:
    """Complete serializable candidate contract (the artifact identity)."""
    body = {"schema": SCHEMA, "engine": ENGINE,
            "candidate_id": cand["candidate_id"],
            "family": cand["family"], "version": cand["version"],
            "params": cand["params"], "seed": seed,
            "feature_profile": feature_profile,
            "feature_columns": columns,
            "bindings": bindings,
            "capabilities": cand["capabilities"],
            "quantiles": [0.1, 0.5, 0.9],
            "horizon_strategy": "one model triple per issue-time feature row",
            "interval": cand["interval"],
            "libraries": _libraries(cand)}
    body["candidate_sha256"] = hashlib.sha256(json.dumps(
        body, sort_keys=True, default=str).encode()).hexdigest()
    return body


def _libraries(cand: dict) -> dict:
    import sklearn
    libs = {"scikit-learn": sklearn.__version__, "numpy": np.__version__}
    if cand["family"].startswith("lightgbm"):
        import lightgbm
        libs["lightgbm"] = lightgbm.__version__
    return libs


def dependency_status() -> dict:
    """Optional families report availability — startup works when absent."""
    out = {"lightgbm": {"status": "dependency_unavailable"}}
    try:
        import lightgbm  # noqa: F401
        out["lightgbm"] = {"status": "available"}
    except Exception as e:  # not installed or incompatible build
        out["lightgbm"]["detail"] = str(e)[:120]
    return out


def build_candidates(search_cfg: dict, seed: int) -> list:
    """Deterministic candidate list: incumbent + seeded trial subset +
    mandatory linear challenger (+ optional lgbm when present)."""
    cands = []
    inc = dict(INCUMBENT)
    inc["candidate_id"] = "hgb-incumbent"
    inc["capabilities"] = {"quantiles": True, "missing_features": "nan_native",
                           "deterministic": False}
    cands.append(inc)

    rng = random.Random(seed)
    grid = list(HGB_TRIAL_GRID)
    rng.shuffle(grid)
    n_trials = int(search_cfg.get("hgb_trials", 4))
    for i, t in enumerate(grid[:n_trials]):
        cands.append({"candidate_id": f"hgb-trial-{i}",
                      "family": "hgb_tuned", "version": "v1",
                      "params": {**t, "leaves_candidates": [t["leaves"]]},
                      "interval": "native_quantile+conformal_calibration",
                      "capabilities": {"quantiles": True,
                                       "missing_features": "nan_native",
                                       "deterministic": False}})

    if search_cfg.get("linear", True):
        cands.append({"candidate_id": "linear-seasonal",
                      "family": "linear_quantile", "version": "v1",
                      "params": {"alpha_candidates":
                                 list(LINEAR_ALPHAS)[:int(
                                     search_cfg.get("linear_alphas", 3))]},
                      "interval": "native_quantile+conformal_calibration",
                      "capabilities": {"quantiles": True,
                                       "missing_features":
                                       "train_median_impute+standard_scale",
                                       "deterministic": False}})

    if search_cfg.get("lightgbm"):
        if dependency_status()["lightgbm"]["status"] == "available":
            cands.append({"candidate_id": "lgbm-quantile",
                          "family": "lightgbm_quantile", "version": "v1",
                          "params": {"num_leaves": 7, "learning_rate": 0.08,
                                     "n_estimators": 120,
                                     "min_child_samples": 15},
                          "interval": "native_quantile+conformal_calibration",
                          "capabilities": {"quantiles": True,
                                           "missing_features": "nan_native",
                                           "deterministic": False}})
        else:
            cands.append({"candidate_id": "lgbm-quantile",
                          "family": "lightgbm_quantile", "version": "v1",
                          "params": {}, "skipped": "dependency_unavailable",
                          "interval": None,
                          "capabilities": {"quantiles": False,
                                           "deterministic": True}})
    return cands


def estimator_fn_for(cand: dict):
    """Factory -> estimator_fn(parts, spec, columns, target) -> fitted."""
    fam = cand["family"]

    if fam in ("hgb_incumbent", "hgb_tuned"):
        p = cand["params"]

        def fn(parts, spec, columns, target):
            cfg = {"learning_rate": p["learning_rate"],
                   "max_iter": p["max_iter"],
                   "leaves_candidates": p["leaves_candidates"],
                   "min_samples_leaf": p["min_samples_leaf"],
                   "l2_regularization": p["l2_regularization"]}
            fitted = est.select_and_fit(parts["train"], parts["validation"],
                                        cfg, spec["seed"], spec["limits"],
                                        columns=columns)
            correction = est.conformal_correction(
                fitted, parts["calibration"], target, columns=columns)

            def predict(case):
                pred = est.predict_quantiles(fitted, [case], target,
                                             columns=columns)
                return {"q": est.apply_correction(
                    pred, correction, target)[0].tolist()}
            return {"predict": predict,
                    "selected": {"family": fam,
                                 **fitted["selected"], **{
                                     k: p[k] for k in
                                     ("learning_rate", "max_iter",
                                      "min_samples_leaf",
                                      "l2_regularization")}},
                    "correction": correction,
                    "_replay": {"family": fam, "fitted": fitted,
                                "correction": correction,
                                "columns": columns, "target": target}}
        return fn

    if fam == "linear_quantile":
        alphas = cand["params"]["alpha_candidates"]

        def fn(parts, spec, columns, target):
            return _fit_linear(parts, spec, columns, target, alphas)
        return fn

    if fam == "lightgbm_quantile":
        p = cand["params"]

        def fn(parts, spec, columns, target):
            from lightgbm import LGBMRegressor
            cols = list(columns or est.COLUMNS)
            x_fit = est._matrix(parts["train"] + parts["validation"], cols)
            y_fit = est._labels(parts["train"] + parts["validation"])
            models = {}
            for name, q in (("q10", 0.1), ("median", 0.5), ("q90", 0.9)):
                m = LGBMRegressor(objective="quantile", alpha=q, verbose=-1,
                                  random_state=int(spec["seed"]), **p)
                m.fit(x_fit, y_fit)
                models[name] = m

            def predict(case):
                x = est._matrix([case], cols)
                q = np.sort([models[k].predict(x)[0]
                             for k in ("q10", "median", "q90")])
                return {"q": np.clip(q, VARIABLES[target]["min"],
                                     VARIABLES[target]["max"]).tolist()}
            return {"predict": predict,
                    "selected": {"family": fam, **p}, "correction": None,
                    "_replay": {"family": fam, "models": models,
                                "columns": cols, "target": target}}
        return fn

    raise ValueError(f"unknown candidate family '{fam}'")


def _fit_linear(parts, spec, columns, target, alphas):
    """Regularized seasonal/AR linear challenger.

    Median imputation + standardization fitted on the inner train block
    ONLY; alpha picked on inner validation q50-MAE; final q10/50/90 fits on
    train+validation; calibration residual correction identical to the
    incumbent's — interval is quantile + conformal, honestly labeled."""
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import QuantileRegressor
    from sklearn.preprocessing import StandardScaler
    from threadpoolctl import threadpool_limits
    cols = list(columns or est.COLUMNS)
    x_tr = est._matrix(parts["train"], cols)
    y_tr = est._labels(parts["train"])
    with threadpool_limits(limits=1):
        imp = SimpleImputer(strategy="median").fit(x_tr)
        sc = StandardScaler().fit(imp.transform(x_tr))

        def xmat(cases):
            return sc.transform(imp.transform(est._matrix(cases, cols)))

        def _qr(q, X, y, alpha):
            m = QuantileRegressor(quantile=q, alpha=alpha,
                                  solver="highs")
            return m.fit(X, y)

        scores = []
        for a in alphas:
            m = _qr(0.5, xmat(parts["train"]), y_tr, a)
            err = float(np.mean(np.abs(
                m.predict(xmat(parts["validation"]))
                - est._labels(parts["validation"]))))
            scores.append((err, a))
        _, alpha = min(scores)
        x_fit = np.vstack([xmat(parts["train"]), xmat(parts["validation"])])
        y_fit = np.concatenate([y_tr, est._labels(parts["validation"])])
        models = {name: _qr(q, x_fit, y_fit, alpha)
                  for name, q in (("q10", 0.1), ("median", 0.5), ("q90", 0.9))}

    def raw(cases):
        x = xmat(cases)
        out = np.column_stack([models[k].predict(x)
                               for k in ("q10", "median", "q90")])
        out.sort(axis=1)
        return np.clip(out, VARIABLES[target]["min"],
                       VARIABLES[target]["max"])

    # same calibration-block conformal correction the incumbent applies
    cal_pred = raw(parts["calibration"])
    y_cal = est._labels(parts["calibration"])
    residual = np.maximum(cal_pred[:, 0] - y_cal, y_cal - cal_pred[:, 2])
    k = min(1.0, np.ceil((len(residual) + 1) * 0.8) / len(residual))
    correction = max(0.0, float(np.quantile(residual, k, method="higher")))

    def predict(case):
        p = raw([case])
        return {"q": est.apply_correction(p, correction, target)[0].tolist()}

    fitted_state = {"imputer": imp, "scaler": sc, "models": models,
                    "alpha": alpha, "columns": cols, "target": target,
                    "correction": correction, "family": "linear_quantile"}
    return {"predict": predict, "_replay": fitted_state,
            "selected": {"family": "linear_quantile", "alpha": alpha},
            "correction": correction}


def replay_predict(state: dict, case: dict) -> dict:
    """Snapshot-replay inference for a frozen candidate artifact — no
    provider access, no refit; strict column contract enforced."""
    fam = state["family"]
    cols = state["columns"]
    if fam in ("hgb_incumbent", "hgb_tuned"):
        pred = est.predict_quantiles(state["fitted"], [case],
                                     state["target"], columns=cols)
        return {"q": est.apply_correction(
            pred, state["correction"], state["target"])[0].tolist()}
    if fam == "linear_quantile":
        x = state["scaler"].transform(
            state["imputer"].transform(est._matrix([case], cols)))
        out = np.column_stack([state["models"][k].predict(x)
                               for k in ("q10", "median", "q90")])
        out.sort(axis=1)
        p = np.clip(out, VARIABLES[state["target"]]["min"],
                    VARIABLES[state["target"]]["max"])
        return {"q": est.apply_correction(
            p, state["correction"], state["target"])[0].tolist()}
    if fam == "lightgbm_quantile":
        x = est._matrix([case], cols)
        q = np.sort([state["models"][k].predict(x)[0]
                     for k in ("q10", "median", "q90")])
        return {"q": np.clip(q, VARIABLES[state["target"]]["min"],
                             VARIABLES[state["target"]]["max"]).tolist()}
    raise ValueError(f"cannot replay unknown family '{fam}'")
