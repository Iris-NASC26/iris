"""Phase-5 model-selection CLI.

  python -m forecasts.v2.model_selection compare --config compare.json
      [--feature-spec fs.json] [--store DIR]
  python -m forecasts.v2.model_selection report --comparison DIR
  python -m forecasts.v2.model_selection freeze --comparison DIR
      --winner CID --eval-spec spec.json [--feature-spec fs.json] [--store DIR]
  python -m forecasts.v2.model_selection predict --selection DIR
      --dataset ds-* --snapshot snapshot_dir

All runs are development-mode: the protected final holdout is never
scored here; `freeze` refits only on permitted development partitions.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import search


def _load(path: str) -> dict:
    return json.loads(Path(path).read_text())


def _feature_hook(feature_spec_path: str | None):
    """Return (feature_fn, columns, profile_meta) for a Phase-4 spec."""
    if not feature_spec_path:
        return None, None, {"profile": "legacy_v1"}
    from ..feature_sets import runner as fr, spec as fspec, materialize as mat
    fsd = _load(feature_spec_path)
    fs = fspec.validate(fsd)
    histories = mat.load_histories(fs)
    return (fr._feature_fn_for(fsd, histories), mat.columns_for(fs),
            {"profile": fs["profile"],
             "fingerprint": fspec.fingerprint(fs)})


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="forecasts.v2.model_selection")
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("compare", help="bounded development comparison")
    c.add_argument("--config", required=True)
    c.add_argument("--feature-spec")
    c.add_argument("--store")
    r = sub.add_parser("report", help="print a comparison summary")
    r.add_argument("--comparison", required=True)
    f = sub.add_parser("freeze", help="freeze the selected candidate")
    f.add_argument("--comparison", required=True)
    f.add_argument("--winner", required=True)
    f.add_argument("--eval-spec", required=True)
    f.add_argument("--feature-spec")
    f.add_argument("--store")
    pr = sub.add_parser("predict", help="replay inference from a snapshot")
    pr.add_argument("--selection", required=True)
    pr.add_argument("--dataset", required=True)
    pr.add_argument("--snapshot", required=True,
                    help="feature-set snapshot/materialization dir or json")
    args = p.parse_args(argv)

    if args.cmd == "compare":
        cfg = _load(args.config)
        fn, cols, meta = _feature_hook(args.feature_spec)
        out = search.compare(cfg, feature_fn=fn, feature_columns=cols,
                             feature_profile=meta, store_dir=args.store)
        print(json.dumps({"comparison_dir": out["comparison_dir"],
                          "selection": out["selection"],
                          "shared_metrics": out["shared_metrics"]},
                         indent=2))
        return 0

    if args.cmd == "report":
        comp = _load(Path(args.comparison) / "comparison.json")
        print(json.dumps({"seed": comp["seed"], "budget": comp["budget"],
                          "trials_declared": comp["trials_declared"],
                          "dependencies": comp["dependencies"],
                          "baseline_champion":
                          comp["baseline_champion_development"],
                          "shared_metrics": comp["shared_metrics"],
                          "selection": comp["selection"]}, indent=2))
        return 0

    if args.cmd == "freeze":
        fn, cols, _ = _feature_hook(args.feature_spec)
        out = search.freeze(args.comparison, args.winner,
                            eval_spec=_load(args.eval_spec),
                            feature_fn=fn, feature_columns=cols,
                            store_dir=args.store)
        print(json.dumps(out, indent=2))
        return 0

    if args.cmd == "predict":
        snap = Path(args.snapshot)
        rows_path = snap / "rows.json" if snap.is_dir() else snap
        if not rows_path.exists():
            rows_path = snap / "snapshot.json"
        payload = _load(str(rows_path))
        rows = payload.get("rows", payload if isinstance(payload, list) else [])
        cases = [{"feature": r["x"]} for r in rows if r.get("x")]
        preds = search.replay(args.selection, args.dataset, cases)
        print(json.dumps({"n": len(preds), "predictions": preds}, indent=2))
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
