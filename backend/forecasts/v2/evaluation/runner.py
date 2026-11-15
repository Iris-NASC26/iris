"""Evaluation orchestration: development backtests + isolated final assessment.

Callable interface for future job/API wiring:

    from forecasts.v2.evaluation import run, run_final_assessment
    run(spec_dict)                    # development mode; never scores the holdout
    run_final_assessment(spec_dict)   # one explicit frozen-config assessment

Neither function touches the live model registry, jobs, or the router.
"""
from __future__ import annotations

import hashlib
import json
import pickle
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from . import baselines as bl
from . import estimator as est
from . import metrics as mx
from . import spec as spec_mod
from . import splits
from . import store
from ..fitting import History
from ..variables import VARIABLES

PROTOCOL_VERSION = "iris-eval-v1"


def _stamp(value):
    d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return d.astimezone(UTC) if d.tzinfo else d.replace(tzinfo=UTC)


def _adapters(manifest_fn=None, load_fn=None, resolve_fn=None):
    from .. import datasets, locations
    return (manifest_fn or datasets.manifest,
            load_fn or datasets.load,
            resolve_fn or locations.resolve)


def _context_data(ctx, manifest_fn, load_fn, resolve_fn):
    """Resolve one spec context to its manifest + records + binding checks."""
    loc = resolve_fn(ctx["location_id"])
    manifest = manifest_fn(ctx["location_id"], ctx["dataset_id"])
    if manifest is None:
        raise ValueError(f"context {ctx['location_id']}: unknown dataset "
                         f"{ctx['dataset_id']}")
    if ctx["target"] not in manifest.get("variables", [ctx["target"]]):
        raise ValueError(f"dataset {ctx['dataset_id']} does not contain "
                         f"target {ctx['target']}")
    if ctx.get("source_id") and manifest["source_id"] != ctx["source_id"]:
        raise ValueError(f"dataset {ctx['dataset_id']} source "
                         f"{manifest['source_id']} != spec {ctx['source_id']}")
    records = load_fn(ctx["location_id"], ctx["dataset_id"]) or []
    return loc, manifest, records


def _default_fit(parts, spec, columns, target):
    """Incumbent path: bounded HGB selection + calibration correction."""
    fitted = est.select_and_fit(parts["train"], parts["validation"],
                                spec["estimator"], spec["seed"],
                                spec["limits"], columns=columns)
    correction = est.conformal_correction(fitted, parts["calibration"],
                                          target, columns=columns)

    def predict(case):
        pred = est.predict_quantiles(fitted, [case], target, columns=columns)
        return {"q": est.apply_correction(pred, correction, target)[0].tolist()}
    return {"predict": predict, "selected": fitted["selected"],
            "correction": correction}


def _age_policy(spec, history, lag, dev_cases):
    """Operational input-age limit — declared policy only, never test data."""
    step = VARIABLES[history.target]["composite_days"]
    declared = lag / 24.0 + step * 2
    if (spec.get("age_policy") or {}).get("basis") == "development_p95" \
            and dev_cases:
        ages = sorted(c["input_age_days"] for c in dev_cases)
        p95 = ages[min(len(ages) - 1, int(0.95 * len(ages)))]
        return {"max_input_age_days": max(declared, p95),
                "basis": "development_p95",
                "declared_minimum": declared}
    return {"max_input_age_days": declared, "basis": "source_declared"}


def _evaluate_context(ctx, spec, manifest_fn, load_fn, resolve_fn,
                      feature_fn=None, estimator_fn=None):
    loc, manifest, records = _context_data(ctx, manifest_fn, load_fn, resolve_fn)
    lag = splits.lag_hours(manifest)
    history = History(records, ctx["target"], manifest["source_id"], lag)
    issues = sorted({r["start"] for r in history.rows})
    if not issues:
        return {"location_id": ctx["location_id"], "dataset_id": ctx["dataset_id"],
                "target": ctx["target"], "status": "failed",
                "reason": "no usable records", "groups": [], "folds": []}
    boundary = splits.holdout_boundary(issues, spec["final_holdout"])
    dev_issues = [i for i in issues if i < boundary]
    holdout_issues = [i for i in issues if i >= boundary]
    dev_cases, exclusions = splits.cases(history, manifest, spec["horizons"],
                                         spec["issue"], boundary,
                                         feature_fn=feature_fn)
    # EVAL-06b: oversized requests fail truthfully rather than truncating.
    max_cases = int(spec["limits"].get("max_cases", 400))
    if len(dev_cases) > max_cases:
        return {"location_id": ctx["location_id"],
                "dataset_id": ctx["dataset_id"], "target": ctx["target"],
                "status": "failed",
                "reason": f"development cases {len(dev_cases)} exceed "
                          f"limits.max_cases {max_cases}",
                "groups": [], "folds": []}
    spatial_mode = manifest.get("spatial_mode", "point")
    result = {"location_id": ctx["location_id"], "dataset_id": ctx["dataset_id"],
              "target": ctx["target"], "source_id": manifest["source_id"],
              "spatial_mode": spatial_mode,
              "spatial_support": manifest.get("spatial_support", "point"),
              "aggregation": manifest.get("aggregation"),
              "dataset_hash": manifest.get("content_sha256"),
              "status": "complete", "folds": [], "groups": [],
              "excluded": exclusions,
              "development_cases": len(dev_cases),
              "holdout_cases_reserved": len(holdout_issues),
              "availability_evidence": sorted({c["evidence"] for c in dev_cases}),
              "age_policy": _age_policy(spec, history, lag, dev_cases),
              "evidence_policy": _evidence_policy(spec, history),
              "spatial_holdout": {"status": "not_applicable",
                                  "reason": "candidate is location-specific; "
                                            "no cross-location transfer contract"}}
    max_age = result["age_policy"]["max_input_age_days"]
    dev_issue_times = sorted({_stamp(c["issue"]) for c in dev_cases})
    plans = splits.fold_plan(dev_issue_times,
                             int(spec["development"]["folds"]))
    all_scored = []
    for plan in plans:
        fold_rec = {"fold": plan["fold"], "test_start": plan["test_start"].isoformat(),
                    "test_end": plan["test_end"].isoformat(), "status": "complete"}
        dev_pool = [c for c in dev_cases if _stamp(c["issue"]) < plan["test_start"]]
        test = [c for c in dev_cases
                if plan["test_start"] <= _stamp(c["issue"]) <= plan["test_end"]]
        # EVAL-04: the p95 age limit is re-derived per fold from permitted
        # development cases only — never from the outer test block.
        fold_policy = _age_policy(spec, history, lag, dev_pool)
        fold_max_age = fold_policy["max_input_age_days"]
        fold_rec["age_policy"] = fold_policy
        # FS-01: fold-fitted transforms — features are rebuilt under each
        # fold's cutoff so learned transforms never see outer-test data.
        if feature_fn is not None:
            for c in dev_pool + test:
                c["feature"] = feature_fn(_stamp(c["issue"]), c["horizon"],
                                          fit_cutoff=plan["test_start"])
        parts = splits.inner_split(dev_pool, spec["development"],
                                   fit_cutoff=plan["test_start"])
        mins = spec["development"]
        if (len(parts["train"]) < int(mins["min_train_cases"])
                or len(parts["validation"]) < int(mins["min_validation_cases"])
                or len(parts["calibration"]) < int(mins["min_calibration_cases"])
                or len(test) < int(mins["min_test_cases"])):
            fold_rec["status"] = "insufficient_cases"
            fold_rec["counts"] = {p: len(parts[p]) for p in
                                  ("train", "validation", "calibration",
                                   "unused")}
            fold_rec["counts"]["test"] = len(test)
            result["folds"].append(fold_rec)
            continue
        fold_rec["inner_boundaries"] = parts["boundaries"]
        reference = [r for r in history.rows
                     if r["start"] < plan["test_start"]]
        base = bl.Baselines(history, reference)
        columns = spec.get("feature_columns")
        import time
        t0 = time.monotonic()
        fitted = (estimator_fn(parts, spec, columns, ctx["target"])
                  if estimator_fn is not None
                  else _default_fit(parts, spec, columns, ctx["target"]))
        fold_rec["fit_seconds"] = round(time.monotonic() - t0, 2)
        # EVAL-06b: per-fit deadline enforcement.
        deadline = float(spec["limits"].get("max_fit_seconds", 300))
        if fold_rec["fit_seconds"] > deadline:
            fold_rec["status"] = "timeout"
            fold_rec["deadline_seconds"] = deadline
            result["folds"].append(fold_rec)
            continue
        fold_rec["candidate"] = fitted.get("selected")
        if fitted.get("correction") is not None:
            fold_rec["calibration_correction"] = fitted["correction"]
        fold_rec["case_rows"] = []
        for case in test:
            row = {**case, "methods": list(spec["baselines"]) + ["candidate"],
                   "predictions": {}, "fold": plan["fold"],
                   "season": _season(_stamp(case["issue"])),
                   "case_id": _case_id(ctx, manifest, case)}
            if case["input_age_days"] > fold_max_age:
                row["predictions"]["candidate"] = None
                row["excluded_reason"] = "outside_operational_age_policy"
            else:
                row["predictions"]["candidate"] = fitted["predict"](case)
            for name in spec["baselines"]:
                point, qs = base.predict(name, case["issue"], case["horizon"])
                row["predictions"][name] = (
                    None if point is None and qs is None
                    else ({"q": qs.tolist()} if qs is not None
                          else {"point": point, "deterministic": True}))
            fold_rec["case_rows"].append(row)
            all_scored.append(row)
        result["folds"].append(fold_rec)
    result["groups"] = _groups(all_scored, spec["baselines"])
    result["walk_forward_folds_run"] = sum(
        1 for f in result["folds"] if f["status"] == "complete")
    return result


def _case_id(ctx, manifest, case):
    """Stable case identity — same across profiles/candidates/seeds."""
    key = "|".join(str(v) for v in (
        ctx["location_id"], manifest["source_id"], ctx["target"],
        case["issue"], case["window_start"], case["horizon"]))
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def _season(issue):
    return ("DJF" if issue.month in (12, 1, 2) else
            "MAM" if issue.month in (3, 4, 5) else
            "JJA" if issue.month in (6, 7, 8) else "SON")


def _groups(rows, baselines):
    out = []
    for by in ("horizon", "fold", "season"):
        for key, g in mx.grouped(rows, by).items():
            methods = g["methods"]
            common = g["common"]
            # relative skill on identical cases only
            for name in baselines:
                cm, cc = common.get(name), common.get("candidate")
                if cm and cc and cm.get("mae") is not None \
                        and cc.get("mae") is not None:
                    methods["candidate"]["rel_mae_vs_" + name + "_common"] = \
                        mx.relative_mae(cc["mae"], cm["mae"])
            out.append({"group_by": by, "group": key, "n": g["n"],
                        "common_n": common["n"], "methods": methods,
                        "common": common})
    return out


def _evidence_policy(spec, history):
    """EVAL-03: 'verified_vintage' is enforced — datasets lacking per-record
    vintage are downgraded in the report rather than silently assumed."""
    requested = spec.get("availability_policy", "estimated_availability")
    if requested != "verified_vintage":
        return {"requested": requested, "status": "satisfied"}
    verified = all(
        (r.get("vintage_at") or r.get("published_at")) for r in history.rows)
    return {"requested": "verified_vintage",
            "status": "satisfied" if verified
            else "downgraded_to_estimated_availability",
            "reason": None if verified else
            "dataset records lack per-record vintage/published timestamps"}


def _baseline_champion(contexts):
    """Champion picked on development folds only — frozen before assessment.
    Compared on the identical-case ('common') subsets only."""
    scores = {}
    for ctx in contexts:
        for grp in ctx.get("groups", []):
            if grp["group_by"] != "fold":
                continue
            for name, m in grp.get("common", {}).items():
                if name != "candidate" and isinstance(m, dict) \
                        and m.get("mae") is not None:
                    scores.setdefault(name, []).append(m["mae"])
    if not scores:
        return None
    return min(scores, key=lambda k: sum(scores[k]) / len(scores[k]))


def run(spec_dict, *, manifest_fn=None, load_fn=None, resolve_fn=None,
        store_dir=None, feature_fn=None, estimator_fn=None) -> dict:
    """Development-mode evaluation: walk-forward backtests, holdout reserved
    but never scored. Returns the report dict (also persisted).

    `feature_fn(issue, horizon, fit_cutoff=None)` is the Phase-4 extension
    point: when provided it supplies each case's feature dict instead of
    `History.feature`; pair it with `feature_columns` in the spec so the
    estimator matrix uses the declared schema. Learned transforms are
    re-fitted under each fold's cutoff.
    `estimator_fn(parts, spec, columns, target)` is the Phase-5 extension:
    returns {"predict": fn(case)->dict|None, "selected": ...,
             "correction": ...} for a model family; the incumbent HGB path
    is used when None."""
    spec = spec_mod.validate(spec_dict)
    fp = spec_mod.fingerprint(spec, PROTOCOL_VERSION)
    manifest_fn, load_fn, resolve_fn = _adapters(manifest_fn, load_fn, resolve_fn)
    contexts = [_evaluate_context(c, spec, manifest_fn, load_fn, resolve_fn,
                                  feature_fn=feature_fn,
                                  estimator_fn=estimator_fn)
                for c in spec["contexts"]]
    # wall-clock fit times are recorded in a sidecar so report.json stays
    # byte-deterministic across identical runs
    timings = [{"location_id": c["location_id"], "fold": f["fold"],
                "fit_seconds": f.pop("fit_seconds")}
               for c in contexts for f in c["folds"] if "fit_seconds" in f]
    planned = sum(len(c["folds"]) for c in contexts)
    done = sum(c.get("walk_forward_folds_run", 0) for c in contexts)
    status = ("failed" if done == 0 else
              "partial" if done < planned else "complete")
    report = {"protocol_version": PROTOCOL_VERSION,
              "assessment_mode": "development",
              "generated_at": datetime.now(UTC).isoformat(),
              "contexts": contexts,
              "walk_forward_folds_planned": planned,
              "walk_forward_fold_count": done,
              "final_holdout": {"status": "reserved_not_scored",
                                "exposure": "protocol_reserved"},
              "baseline_champion_development": _baseline_champion(contexts),
              "notes": [
                  "Scores are retrospective on frozen history; availability "
                  "is estimated unless per-record vintage evidence exists.",
                  "Repeated dependent predictions are grouped, not treated "
                  "as independent observations.",
                  "Legacy model-card 'folds: 4' metrics describe one "
                  "train/val/cal/test partition, not backtests; they are "
                  "not relabeled here."]}
    path = store.allocate(fp, "dev", store_dir)
    case_rows = [r for c in contexts for f in c["folds"]
                 for r in f.get("case_rows", [])]
    store.save_run(path, spec=spec, fingerprint=fp, report=report,
                   cases=case_rows, status=status,
                   extra={"timing.json": timings})
    report["experiment_dir"] = str(path)
    return report


def run_final_assessment(spec_dict, *, manifest_fn=None, load_fn=None,
                         resolve_fn=None, store_dir=None,
                         feature_fn=None, estimator_fn=None) -> dict:
    """One explicit assessment of the frozen spec on the reserved period.

    The fold plan is a single outer block: the holdout issues. Inner
    development partitions are built from all pre-holdout cases; learned
    transforms are fitted under the holdout boundary cutoff, and exposure
    is tracked per context+period lineage, not per spec fingerprint.
    """
    spec = spec_mod.validate(spec_dict)
    fp = spec_mod.fingerprint(spec, PROTOCOL_VERSION)
    manifest_fn, load_fn, resolve_fn = _adapters(manifest_fn, load_fn, resolve_fn)
    root = Path(store_dir) if store_dir else store.ROOT
    assessments, case_rows, max_prior = [], [], 0
    for ctx in spec["contexts"]:
        loc, manifest, records = _context_data(ctx, manifest_fn, load_fn, resolve_fn)
        lag = splits.lag_hours(manifest)
        history = History(records, ctx["target"], manifest["source_id"], lag)
        issues = sorted({r["start"] for r in history.rows})
        boundary = splits.holdout_boundary(issues, spec["final_holdout"])
        dev_cases, _ = splits.cases(history, manifest, spec["horizons"],
                                    spec["issue"], boundary,
                                    feature_fn=feature_fn)
        hold_cases, hold_excl = splits.cases(
            history, manifest, spec["horizons"], spec["issue"],
            datetime(2100, 1, 1, tzinfo=UTC), feature_fn=feature_fn)
        hold_cases = [c for c in hold_cases if _stamp(c["issue"]) >= boundary]
        if feature_fn is not None:
            for c in dev_cases + hold_cases:
                c["feature"] = feature_fn(_stamp(c["issue"]), c["horizon"],
                                          fit_cutoff=boundary)
        parts = splits.inner_split(dev_cases, spec["development"],
                                   fit_cutoff=boundary)
        mins = spec["development"]
        entry = {"location_id": ctx["location_id"],
                 "dataset_id": ctx["dataset_id"], "target": ctx["target"],
                 "holdout_start": boundary.isoformat(),
                 "n_cases": len(hold_cases), "excluded": hold_excl}
        # EVAL-05: exposure keyed on context+period lineage so different
        # configs/seeds/revisions on an overlapping period are detected.
        ctx_key = _exposure_key(ctx, manifest, boundary)
        scored_range = (hold_cases[0]["window_start"],
                        hold_cases[-1]["window_end"]) if hold_cases \
            else (boundary.isoformat(), boundary.isoformat())
        prior = store.prior_exposure(root, ctx_key, *scored_range)
        max_prior = max(max_prior, prior)
        if (len(parts["train"]) < int(mins["min_train_cases"])
                or len(parts["validation"]) < int(mins["min_validation_cases"])
                or len(parts["calibration"]) < int(mins["min_calibration_cases"])
                or len(hold_cases) < int(mins["min_test_cases"])):
            entry["status"] = "insufficient_cases"
            entry["counts"] = {p: len(parts[p]) for p in
                               ("train", "validation", "calibration")}
            entry["groups"] = []
            store.record_exposure(root, ctx_key, *scored_range, spec_hash=fp)
            assessments.append(entry)
            continue
        columns = spec.get("feature_columns")
        fitted = (estimator_fn(parts, spec, columns, ctx["target"])
                  if estimator_fn is not None
                  else _default_fit(parts, spec, columns, ctx["target"]))
        reference = [r for r in history.rows if r["start"] < boundary]
        base = bl.Baselines(history, reference)
        # EVAL-04: the same frozen operational policy applies to the
        # assessment cases — no separate holdout-derived tolerance.
        max_age = _age_policy(spec, history, lag, dev_cases)[
            "max_input_age_days"]
        ctx_rows = []
        for case in hold_cases:
            row = {**case, "methods": list(spec["baselines"]) + ["candidate"],
                   "predictions": {}, "fold": "final",
                   "season": _season(_stamp(case["issue"])),
                   "case_id": _case_id(ctx, manifest, case)}
            if case["input_age_days"] > max_age:
                row["predictions"]["candidate"] = None
                row["excluded_reason"] = "outside_operational_age_policy"
            else:
                row["predictions"]["candidate"] = fitted["predict"](case)
            for name in spec["baselines"]:
                point, qs = base.predict(name, case["issue"], case["horizon"])
                row["predictions"][name] = (
                    None if point is None and qs is None
                    else ({"q": qs.tolist()} if qs is not None
                          else {"point": point, "deterministic": True}))
            ctx_rows.append(row)
            case_rows.append(row)
        entry["status"] = "assessed"
        entry["candidate"] = fitted.get("selected")
        # EVAL-06d: groups are per-context — never pooled across contexts.
        entry["groups"] = _groups(ctx_rows, spec["baselines"])
        store.record_exposure(root, ctx_key, *scored_range, spec_hash=fp)
        assessments.append(entry)
    report = {"protocol_version": PROTOCOL_VERSION,
              "assessment_mode": "final",
              "generated_at": datetime.now(UTC).isoformat(),
              "final_holdout": {
                  "status": "assessed",
                  "exposure": ("previously_evaluated" if max_prior
                               else "first_assessment"),
                  "prior_assessment_count": max_prior,
                  "exposure_scope": "context_period_lineage",
                  "note": ("This period was already scored before; treat as "
                           "benchmarking, not fresh evidence" if max_prior else
                           "Protocol-reserved period assessed once under the "
                           "frozen spec.")},
              "assessments": assessments,
              "notes": ["Retrospective assessment on frozen history; a "
                        "prospective post-freeze period is stronger evidence."]}
    path = store.allocate(fp, "final", store_dir)
    store.save_run(path, spec=spec, fingerprint=fp, report=report,
                   cases=case_rows, status="complete")
    report["experiment_dir"] = str(path)
    return report


def _exposure_key(ctx, manifest, boundary):
    """Context+period lineage for exposure tracking — deliberately excludes
    config/seed/revision so repeat assessments across those are detected."""
    key = "|".join(str(v) for v in (
        ctx["location_id"], manifest["source_id"], ctx["target"],
        manifest.get("spatial_mode", "point"), boundary.date().isoformat()))
    return hashlib.sha256(key.encode()).hexdigest()[:16]
