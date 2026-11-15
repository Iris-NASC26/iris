"""Materialization + candidate fit/score smoke path + bounded ablation.

`ablate` drives the SAME Phase-3 walk-forward evaluation for each
feature profile through the `feature_fn` extension point — identical
folds, contexts, seeds, baselines and holdout policy; only the feature
matrix differs. No second backtest framework lives here.
"""
from __future__ import annotations

from datetime import UTC, datetime

import numpy as np

from . import artifacts, materialize as mat
from . import spec as spec_mod
from .transform import SeasonalTransform
from ..fitting import COLUMNS
from ..evaluation import estimator as est


def _adapters(manifest_fn=None, load_fn=None, resolve_fn=None):
    from .. import datasets, locations
    return (manifest_fn or datasets.manifest,
            load_fn or datasets.load,
            resolve_fn or locations.resolve)


def _bindings(spec, manifest_fn, load_fn):
    """Load manifests + histories for the target and every driver."""
    manifests = {}
    for binding in ([{"dataset_id": spec["target"]["dataset_id"],
                      "variable": spec["target"]["variable"],
                      "role": "target"}] + spec["drivers"]):
        m = manifest_fn(spec["location_id"], binding["dataset_id"])
        if m is None:
            raise ValueError(f"unknown dataset {binding['dataset_id']} for "
                             f"{spec['location_id']}")
        if binding.get("source_id") and m["source_id"] != binding["source_id"]:
            raise ValueError(f"driver {binding['dataset_id']} source "
                             f"{m['source_id']} != spec {binding['source_id']}")
        manifests[binding["dataset_id"]] = {
            "source_id": m["source_id"], "content_sha256": m["content_sha256"],
            "spatial_mode": m.get("spatial_mode", "point"),
            "aggregation": m.get("aggregation"),
            "coverage": ("declared" if m.get("coverage_summary") else
                         "unverified")}
        # area drivers must match the target's actual support or be
        # explicitly declared compatible — never assumed
        tm = manifests[spec["target"]["dataset_id"]]
        if (m.get("spatial_mode", "point") == "area_mean"
                and tm.get("spatial_mode", "point") != "area_mean"):
            raise ValueError(f"area-mean driver {binding['dataset_id']} is "
                             "incompatible with a point target context")
    return manifests


def materialize(spec_dict, *, manifest_fn=None, load_fn=None, resolve_fn=None,
                store_dir=None, save_snapshot=True) -> dict:
    """Materialize as-of rows over the target history's issue schedule."""
    spec = spec_mod.validate(spec_dict)
    fp = spec_mod.fingerprint(spec)
    manifest_fn, load_fn, resolve_fn = _adapters(manifest_fn, load_fn, resolve_fn)
    manifests = _bindings(spec, manifest_fn, load_fn)
    histories = mat.load_histories(spec, lambda loc, ds: load_fn(loc, ds))
    target_hist = histories[spec["target"]["dataset_id"]]
    if target_hist is None:
        raise ValueError("target dataset has no usable records")
    columns = mat.columns_for(spec)
    transform = None
    if spec["profile"] != "legacy_v1":
        transform = SeasonalTransform().fit(target_hist.rows,
                                            target_hist.rows[-1]["end"], fp)
    rows, excluded = [], 0
    tvar = spec["target"]["variable"]
    for r in target_hist.rows:
        for h in (0, 1, 2):
            row = mat.build_row(spec, histories, r["start"], h, transform)
            if row is None:
                excluded += 1
                continue
            s, e = mat.window(r["start"], h, tvar)
            label = target_hist.by_start.get(s)
            rows.append({"issue": r["start"].isoformat(), "horizon": h,
                         "x": row["x"], "meta": row["meta"],
                         "window_start": s.isoformat(),
                         "window_end": e.isoformat(),
                         "actual": label["value"] if (
                             label and label["end"] == e) else None})
    out = {"spec_fingerprint": fp, "columns": columns, "n_rows": len(rows),
           "excluded": excluded, "rows": rows}
    if save_snapshot:
        snap = artifacts.snapshot_meta(spec, columns, manifests,
                                       transform.to_dict() if transform else None)
        snap["spec_fingerprint"] = fp
        path = artifacts.allocate(fp, "snapshot", store_dir)
        artifacts.save(path, "snapshot.json", snap)
        artifacts.save(path, "spec.json", spec)
        out["snapshot_dir"] = str(path)
    return out


def _feature_fn_for(spec_dict, histories, transform):
    """Closure passed to Phase-3: issue+horizon -> feature dict or None."""
    spec = spec_mod.validate(spec_dict)

    def fn(issue, horizon):
        row = mat.build_row(spec, histories, issue, horizon, transform)
        return None if row is None else row["x"]
    return fn


def fit_and_score(spec_dict, *, manifest_fn=None, load_fn=None,
                  resolve_fn=None, train_fraction=0.7, seed=42,
                  store_dir=None) -> dict:
    """Independent smoke path: materialize rows, chronological split, fit
    the same HGB family on the profile columns, score the tail.
    Synthetic-scale check of mechanics — not a performance claim."""
    spec = spec_mod.validate(spec_dict)
    data = materialize(spec_dict, manifest_fn=manifest_fn, load_fn=load_fn,
                       resolve_fn=resolve_fn, store_dir=store_dir)
    rows = data["rows"]
    if len(rows) < 20:
        return {"status": "insufficient_rows", "n_rows": len(rows),
                "spec_fingerprint": data["spec_fingerprint"]}
    ordered = sorted((r for r in rows if r["actual"] is not None),
                     key=lambda r: r["issue"])
    if len(ordered) < 20:
        return {"status": "insufficient_rows", "n_rows": len(ordered),
                "spec_fingerprint": data["spec_fingerprint"]}
    cut = ordered[int(len(ordered) * train_fraction)]["issue"]
    train = [{"feature": r["x"], "actual": r["actual"]}
             for r in ordered if r["issue"] < cut]
    test = [{"feature": r["x"], "actual": r["actual"]}
            for r in ordered if r["issue"] >= cut]
    cfg = {"max_iter": 60, "leaves_candidates": [3],
           "min_samples_leaf": 10, "l2_regularization": 1.0}
    fitted = est.select_and_fit(train[:len(train) * 2 // 3],
                                train[len(train) * 2 // 3:], cfg, seed,
                                columns=data["columns"])
    pred = est.predict_quantiles(fitted, test,
                                 spec["target"]["variable"],
                                 columns=data["columns"])
    y = np.array([t["actual"] for t in test])
    return {"status": "complete", "spec_fingerprint": data["spec_fingerprint"],
            "columns": data["columns"], "n_train": len(train),
            "n_test": len(test), "smoke_mae": float(np.mean(
                np.abs(pred[:, 1] - y))),
            "snapshot_dir": data.get("snapshot_dir"),
            "note": "mechanics smoke on a single split — not an evaluation"}


def ablate(eval_spec: dict, feature_specs: dict, *, manifest_fn=None,
           load_fn=None, resolve_fn=None, store_dir=None) -> dict:
    """Run one Phase-3 development evaluation per feature profile on the
    identical case plan. `feature_specs`: {name: feature-spec dict}.
    Returns the ablation report (also persisted)."""
    from ..evaluation import runner as eval_runner
    profiles = {}
    for name, fspec_dict in feature_specs.items():
        fspec = spec_mod.validate(fspec_dict)
        fp = spec_mod.fingerprint(fspec)
        manifest_fn2, load_fn2, _ = _adapters(manifest_fn, load_fn, resolve_fn)
        _bindings(fspec, manifest_fn2, load_fn2)
        histories = mat.load_histories(fspec, load_fn2)
        thist = histories[fspec["target"]["dataset_id"]]
        transform = (None if fspec["profile"] == "legacy_v1"
                     else SeasonalTransform().fit(
                         thist.rows, thist.rows[-1]["end"], fp))
        es = dict(eval_spec)
        es["feature_columns"] = mat.columns_for(fspec)
        rep = eval_runner.run(es, manifest_fn=manifest_fn2, load_fn=load_fn2,
                              resolve_fn=resolve_fn, store_dir=store_dir,
                              feature_fn=_feature_fn_for(
                                  fspec_dict, histories, transform))
        profiles[name] = {"feature_fingerprint": fp,
                          "profile": fspec["profile"],
                          "columns": len(es["feature_columns"]),
                          "report": rep}
    out = {"generated_at": datetime.now(UTC).isoformat(),
           "mode": "development", "profiles": profiles,
           "comparison": _compare(profiles),
           "notes": ["Same folds/contexts/seed/baselines per profile; "
                     "comparisons are on common scored cases.",
                     "An unpromising driver group is a valid result — "
                     "no improvement is claimed without common-case evidence."]}
    path = artifacts.allocate("ablation-" +
                              spec_mod.fingerprint(
                                  {"eval": eval_spec,
                                   "feature_specs": feature_specs})[:12],
                              "ablate", store_dir)
    artifacts.save(path, "ablation.json", out)
    out["artifact_dir"] = str(path)
    return out


def _compare(profiles: dict) -> dict:
    """Common-case candidate MAE per profile/horizon — no claims beyond."""
    comp = {}
    for name, p in profiles.items():
        for ctx in p["report"].get("contexts", []):
            for g in ctx.get("groups", []):
                if g["group_by"] != "horizon":
                    continue
                cand = (g.get("common") or {}).get("candidate") or {}
                comp.setdefault(g["group"], {})[name] = {
                    "common_n": g.get("common_n"),
                    "candidate_mae": cand.get("mae"),
                    "candidate_coverage": cand.get("coverage_80")}
    return comp
