"""CLI:
  python -m forecasts.v2.feature_sets materialize --config spec.json [--store dir]
  python -m forecasts.v2.feature_sets fit-smoke  --config spec.json [--store dir]
  python -m forecasts.v2.feature_sets ablate     --config ablation.json [--store dir]

ablation.json shape: {"eval": <iris-eval-spec.v1>,
                      "profiles": {"legacy": <feature-spec>,
                                   "history": <feature-spec>,
                                   "drivers": <feature-spec>}}
"""
from __future__ import annotations

import argparse
import json
import sys


def _load(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"cannot read {path}: {exc}")


def main(argv=None):
    parser = argparse.ArgumentParser(prog="python -m forecasts.v2.feature_sets")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("materialize", "fit-smoke", "ablate"):
        p = sub.add_parser(name)
        p.add_argument("--config", required=True)
        p.add_argument("--store", default=None)
    args = parser.parse_args(argv)
    from .runner import materialize, fit_and_score, ablate
    kwargs = {"store_dir": args.store} if args.store else {}
    try:
        if args.command == "materialize":
            out = materialize(_load(args.config), **kwargs)
            out = {k: out[k] for k in
                   ("spec_fingerprint", "columns", "n_rows", "excluded",
                    "snapshot_dir") if k in out}
        elif args.command == "fit-smoke":
            out = fit_and_score(_load(args.config), **kwargs)
        else:
            cfg = _load(args.config)
            out = ablate(cfg["eval"], cfg["profiles"], **kwargs)
            out = {"artifact_dir": out["artifact_dir"],
                   "comparison": out["comparison"]}
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(out, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
