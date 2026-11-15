"""Bounded development comparison across candidate families.

Every candidate is scored through the SAME corrected Phase-3 evaluator —
identical folds, contexts, seed, baselines and reserved holdout. Candidates
are compared on the intersection of stably-identified scored cases
(shared case_ids), never on different subsets. The final holdout stays
reserved; `freeze` refits the selected spec on the permitted development
partition only.
"""
from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime

import numpy as np

from . import candidates as cand_mod
from . import store as ms_store
from ..evaluation import runner as eval_runner
from ..evaluation import splits

ENGINE = "iris-modelsel-v1"


def _shared_case_metrics(reports: dict) -> dict:
    """Per-candidate MAE/coverage on the intersection of scored case_ids."""
    scored = {}  # cid -> {case_id: (q_or_None, actual, horizon)}
    for cid, rep in reports.items():
        m = {}
        for ctx in rep.get("contexts", []):
            for f in ctx.get("folds", []):
                for r in f.get("case_rows", []):
                    pred = r.get("predictions", {}).get("candidate")
                    if r.get("actual") is None:
                        continue
                    m[r["case_id"]] = (pred, r["actual"], r["horizon"])
        scored[cid] = m
    shared = set.intersection(*[set(m) for m in scored.values()]) \
        if scored else set()
    out = {}
    for cid, m in scored.items():
        qs, ys = [], []
        for case_id in shared:
            pred, actual, _ = m[case_id]
            if pred is None:
                continue
            q50 = pred["q"][1] if "q" in pred else pred["point"]
            qs.append(q50)
            ys.append(actual)
        cov = None
        if qs:
            inside = [1 for case_id in shared
                      if m[case_id][0] is not None
                      and "q" in m[case_id][0]
                      and m[case_id][0]["q"][0] <= m[case_id][1]
                      <= m[case_id][0]["q"][2]]
            qn = sum(1 for case_id in shared
                     if m[case_id][0] is not None and "q" in m[case_id][0])
            cov = len(inside) / qn if qn else None
        out[cid] = {"scored_n": len(m), "shared_n": len(qs),
                    "mae": float(np.mean(np.abs(np.array(qs)
                                              - np.array(ys))))
                    if qs else None,
                    "coverage_80": cov}
    return out


def compare(config: dict, *, manifest_fn=None, load_fn=None, resolve_fn=None,
            feature_fn=None, feature_columns=None, feature_profile=None,
            store_dir=None) -> dict:
    """Run every declared candidate through one dev-mode evaluation each.

    config: {"eval_spec": {...}, "seed": 42, "budget": {"hgb_trials": 4,
             "linear": true, "linear_alphas": 3, "lightgbm": false}}
    """
    eval_spec = dict(config["eval_spec"])
    if feature_columns:
        eval_spec["feature_columns"] = feature_columns
    seed = int(config.get("seed", 42))
    budget = config.get("budget") or {}
    cands = cand_mod.build_candidates(budget, seed)
    reports, results = {}, {}
    bindings = {c["dataset_id"]: c["target"]
                for c in eval_spec["contexts"]}
    for cand in cands:
        if cand.get("skipped"):
            results[cand["candidate_id"]] = {
                "family": cand["family"], "status": cand["skipped"]}
            continue
        rep = eval_runner.run(
            eval_spec, manifest_fn=manifest_fn, load_fn=load_fn,
            resolve_fn=resolve_fn, store_dir=store_dir,
            feature_fn=feature_fn,
            estimator_fn=cand_mod.estimator_fn_for(cand))
        reports[cand["candidate_id"]] = rep
        spec = cand_mod.spec_for(
            cand, feature_profile=feature_profile or {"profile": "legacy_v1"},
            columns=feature_columns or ["<legacy>"],
            bindings=bindings, seed=seed)
        results[cand["candidate_id"]] = {
            "family": cand["family"], "status": "evaluated",
            "spec": spec, "report": rep}
    metrics = _shared_case_metrics(
        {k: v["report"] for k, v in results.items()
         if v["status"] == "evaluated"})
    for cid, m in metrics.items():
        results[cid]["shared_metrics"] = m
    # ranking: lowest shared-case q50 MAE; coverage breaks ties
    ranked = sorted((cid for cid, m in metrics.items()
                     if m["mae"] is not None),
                    key=lambda c: (metrics[c]["mae"],
                                   abs((metrics[c]["coverage_80"] or 0)
                                       - 0.8)))
    champion = None
    for rep in reports.values():
        c = rep.get("baseline_champion_development")
        if c:
            champion = c
    winner = ranked[0] if ranked else None
    outcome = ("no_evaluated_candidates" if not ranked else
               "candidate_selected")
    out = {"engine": ENGINE, "mode": "development",
           "generated_at": datetime.now(UTC).isoformat(),
           "seed": seed, "budget": budget,
           "n_candidates": len(cands),
           "trials_declared": {"hgb_incumbent": 1,
                               "hgb_tuned": sum(1 for c in cands
                                                if c["family"] == "hgb_tuned"),
                               "linear_quantile": sum(
                                   1 for c in cands
                                   if c["family"] == "linear_quantile"),
                               "lightgbm_quantile": sum(
                                   1 for c in cands
                                   if c["family"] == "lightgbm_quantile")},
           "dependencies": cand_mod.dependency_status(),
           "results": {cid: {k: v for k, v in r.items() if k != "report"}
                       for cid, r in results.items()},
           "shared_metrics": metrics,
           "baseline_champion_development": champion,
           "selection": {"outcome": outcome,
                         "candidate_id": winner,
                         "note": "Selection is a development recommendation; "
                                 "the protected holdout remains unassessed "
                                 "until a separate frozen final run."},
           "experiments": {cid: r["report"].get("experiment_dir")
                           for cid, r in results.items()
                           if r["status"] == "evaluated"}}
    path = ms_store.allocate("comparison", store_dir)
    ms_store.save_json(path / "comparison.json", out)
    out["comparison_dir"] = str(path)
    return out


def freeze(comparison_dir: str, winner_id: str, *, eval_spec: dict,
           manifest_fn=None, load_fn=None, resolve_fn=None,
           feature_fn=None, feature_columns=None, store_dir=None) -> dict:
    """Freeze the selected candidate: refit on the permitted development
    partition (pre-holdout boundary) and persist a deterministic,
    hash-checked artifact. Never fits on the reserved holdout."""
    comp = json.loads(
        __import__("pathlib").Path(comparison_dir)
        .joinpath("comparison.json").read_text())
    cand_spec = comp["results"].get(winner_id, {}).get("spec")
    if cand_spec is None:
        raise ValueError(f"candidate '{winner_id}' was not evaluated in "
                         f"{comparison_dir}")
    cand = {"candidate_id": winner_id, "family": cand_spec["family"],
            "version": cand_spec["version"], "params": cand_spec["params"]}
    eval_spec = dict(eval_spec)
    if feature_columns:
        eval_spec["feature_columns"] = feature_columns
    from ..evaluation.runner import _stamp
    from ..fitting import History
    spec_v = eval_runner.spec_mod.validate(eval_spec)
    fitted_states = {}
    for ctx in eval_spec["contexts"]:
        loc, manifest, records = eval_runner._context_data(
            ctx, *eval_runner._adapters(manifest_fn, load_fn, resolve_fn))
        lag = splits.lag_hours(manifest)
        history = History(records, ctx["target"], manifest["source_id"], lag)
        issues = sorted({r["start"] for r in history.rows})
        boundary = splits.holdout_boundary(issues, eval_spec["final_holdout"])
        dev_cases, _ = splits.cases(history, manifest, eval_spec["horizons"],
                                    eval_spec["issue"], boundary,
                                    feature_fn=feature_fn)
        if feature_fn is not None:
            for c in dev_cases:
                c["feature"] = feature_fn(_stamp(c["issue"]), c["horizon"],
                                          fit_cutoff=boundary)
        parts = splits.inner_split(dev_cases, eval_spec["development"],
                                   fit_cutoff=boundary)
        fn = cand_mod.estimator_fn_for(cand)
        fitted = fn(parts, spec_v, feature_columns, ctx["target"])
        fitted_states[ctx["dataset_id"]] = fitted["_replay"]
    dest = ms_store.allocate(f"frozen-{winner_id}", store_dir)
    cand_spec["frozen"] = {
        "frozen_at": datetime.now(UTC).isoformat(),
        "protocol": "development partitions only; holdout boundary enforced",
        "comparison_dir": str(comparison_dir)}
    hashes = ms_store.save_candidate_artifact(
        dest, cand_spec, fitted_states, comp["shared_metrics"][winner_id])
    cand_spec["frozen"]["estimator_sha256"] = hashes["estimator_sha256"]
    ms_store.save_json(dest / "candidate.json", cand_spec)
    ms_store.save_json(dest / "selection.json", {
        "candidate_id": winner_id, "spec": cand_spec,
        "evidence": comp["shared_metrics"][winner_id],
        "holdout": "reserved — run final assessment separately"})
    return {"selection_dir": str(dest), "candidate": cand_spec,
            "evidence": comp["shared_metrics"][winner_id]}


def replay(selection_dir: str, dataset_id: str, cases: list) -> list:
    """Snapshot-replay inference: a frozen estimator predicts case feature
    dicts without provider access or mutable staging."""
    spec, states = ms_store.load_frozen(selection_dir)
    if dataset_id not in states:
        raise ValueError(f"frozen candidate has no estimator bound to "
                         f"{dataset_id}; known: {sorted(states)}")
    state = states[dataset_id]
    return [cand_mod.replay_predict(state, c) for c in cases]
