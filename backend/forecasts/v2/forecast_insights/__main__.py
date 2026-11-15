"""Phase-6 insight CLI — development and retrospective only.

  python -m forecasts.v2.forecast_insights calibrate --cases DIR --cutoff ISO
      [--level 0.8] [--policy expand_only] [--store DIR]
  python -m forecasts.v2.forecast_insights diagnose --cases DIR --target T
      [--calibrator DIR] [--store DIR]
  python -m forecasts.v2.forecast_insights threshold --dataset LOC:DS --target T
      --cutoff ISO [--store DIR]
  python -m forecasts.v2.forecast_insights extreme-eval --threshold DIR
      --cases DIR
  python -m forecasts.v2.forecast_insights explain --selection DIR
      --dataset DS --cases DIR [--local] [--case-index N]
  python -m forecasts.v2.forecast_insights trend --dataset LOC:DS --target T
      [--store DIR]
  python -m forecasts.v2.forecast_insights family --id ID --reports J1 J2 ...
  python -m forecasts.v2.forecast_insights view --report DIR
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import runner, artifacts


def _cases_arg(v):
    return v


def _load_json(path):
    p = Path(path)
    if p.is_dir():
        for name in ("calibrator.json", "threshold.json", "trend.json",
                     "diagnostics.json", "family.json"):
            if (p / name).exists():
                return artifacts.load(p / name)
        raise ValueError(f"no insight artifact json in {p}")
    return artifacts.load(p)


def _dataset_rows(spec: str):
    loc, ds = spec.split(":", 1)
    from .. import datasets
    return datasets.load(loc, ds) or []


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="forecasts.v2.forecast_insights")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("calibrate")
    c.add_argument("--cases", required=True, type=_cases_arg)
    c.add_argument("--cutoff", required=True)
    c.add_argument("--level", type=float, default=0.8)
    c.add_argument("--policy", default="expand_only",
                   choices=["expand_only", "symmetric"])
    c.add_argument("--context", default="{}")
    c.add_argument("--store")
    d = sub.add_parser("diagnose")
    d.add_argument("--cases", required=True, type=_cases_arg)
    d.add_argument("--target", required=True)
    d.add_argument("--calibrator")
    d.add_argument("--store")
    t = sub.add_parser("threshold")
    t.add_argument("--dataset", required=True, help="location:dataset")
    t.add_argument("--target", required=True)
    t.add_argument("--cutoff", required=True)
    t.add_argument("--context", default="{}")
    t.add_argument("--store")
    e = sub.add_parser("extreme-eval")
    e.add_argument("--threshold", required=True)
    e.add_argument("--cases", required=True, type=_cases_arg)
    x = sub.add_parser("explain")
    x.add_argument("--selection", required=True)
    x.add_argument("--dataset", required=True)
    x.add_argument("--cases", required=True, type=_cases_arg)
    x.add_argument("--local", action="store_true")
    x.add_argument("--case-index", type=int, default=-1)
    tr = sub.add_parser("trend")
    tr.add_argument("--dataset", required=True, help="location:dataset")
    tr.add_argument("--target", required=True)
    tr.add_argument("--context", default="{}")
    tr.add_argument("--store")
    f = sub.add_parser("family")
    f.add_argument("--id", required=True)
    f.add_argument("--reports", nargs="+", required=True)
    f.add_argument("--store")
    v = sub.add_parser("view")
    v.add_argument("--report", required=True)
    args = ap.parse_args(argv)

    if args.cmd == "calibrate":
        out = runner.calibrate(args.cases, level=args.level,
                               policy=args.policy, cutoff=args.cutoff,
                               context=json.loads(args.context),
                               store_dir=args.store)
    elif args.cmd == "diagnose":
        cal = _load_json(args.calibrator) if args.calibrator else None
        out = runner.diagnose(args.cases, target=args.target,
                              calibrator=cal, store_dir=args.store)
    elif args.cmd == "threshold":
        out = runner.extreme(_dataset_rows(args.dataset), args.target,
                             cutoff=args.cutoff,
                             context=json.loads(args.context),
                             store_dir=args.store)
    elif args.cmd == "extreme-eval":
        out = runner.extreme_evaluate(_load_json(args.threshold),
                                      args.cases)
    elif args.cmd == "explain":
        out = (runner.explain_local(args.selection, args.dataset,
                                    args.cases,
                                    case_index=args.case_index)
               if args.local else
               runner.explain_global(args.selection, args.dataset,
                                     args.cases, columns=None))
    elif args.cmd == "trend":
        out = runner.trend(_dataset_rows(args.dataset), args.target,
                           context=json.loads(args.context),
                           store_dir=args.store)
    elif args.cmd == "family":
        tests = [artifacts.load(p) for p in args.reports]
        out = runner.family(tests, args.id, store_dir=args.store)
    else:
        out = runner.view(args.report)
    print(json.dumps(out, indent=2, default=str)[:6000])
    return 0


if __name__ == "__main__":
    sys.exit(main())
