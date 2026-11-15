"""CLI:  python -m forecasts.v2.evaluation --config spec.json [--mode development|final] [--store DIR]"""
from __future__ import annotations

import argparse
import json
import sys


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="python -m forecasts.v2.evaluation",
        description="Walk-forward evaluation of Iris forecast candidates "
                    "on frozen datasets. Never activates or overwrites "
                    "live models.")
    parser.add_argument("--config", required=True,
                        help="Path to an iris-eval-spec.v1 JSON file.")
    parser.add_argument("--mode", choices=("development", "final"),
                        default="development",
                        help="'development' (default) backtests only; 'final' "
                             "assesses the frozen spec on the reserved holdout.")
    parser.add_argument("--store", default=None,
                        help="Artifact directory (default: the runtime "
                             "evaluation namespace).")
    args = parser.parse_args(argv)
    try:
        with open(args.config, encoding="utf-8") as fh:
            spec = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        parser.error(f"cannot read spec: {exc}")
    from .runner import run, run_final_assessment
    kwargs = {"store_dir": args.store} if args.store else {}
    try:
        report = (run_final_assessment if args.mode == "final" else run)(
            spec, **kwargs)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({"experiment_dir": report.get("experiment_dir"),
                      "mode": report["assessment_mode"],
                      "folds_completed": report.get("walk_forward_fold_count"),
                      "final_holdout": report.get("final_holdout", {}).get(
                          "status")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
