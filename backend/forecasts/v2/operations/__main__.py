"""Operations CLI — bounded, single-host, UTC. Nothing here runs on a
page visit; the scheduler ticks only when explicitly invoked or enabled
via IRIS_OPS_ENABLED=1 in a supervised process.

  python -m forecasts.v2.operations schedule list|create|enable|disable
      |pause|resume|due|tick --db PATH [args]
  python -m forecasts.v2.operations release list|validate|promote
      |rollback --root DIR --ctx JSON [--manifest FILE]
  python -m forecasts.v2.operations status --root DIR --ctx JSON
  python -m forecasts.v2.operations integrity --root DIR
  python -m forecasts.v2.operations generate --root DIR --manifest FILE
      --case FILE [--issue ISO]
  python -m forecasts.v2.operations reopen --root DIR --run-id ID
  python -m forecasts.v2.operations score --runs FILE --obs FILE
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import integrity, monitoring, releases, runner, schedules


def _json_file(p):
    return json.loads(Path(p).read_text())


def _jsonl_file(p):
    return [json.loads(l) for l in Path(p).read_text().splitlines()
            if l.strip()]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="forecasts.v2.operations")
    sub = ap.add_subparsers(dest="top", required=True)

    s = sub.add_parser("schedule")
    s.add_argument("action", choices=["list", "create", "enable",
                                      "disable", "pause", "resume",
                                      "due", "tick", "recover"])
    s.add_argument("--db", required=True)
    s.add_argument("--id")
    s.add_argument("--kind", choices=list(schedules.KINDS))
    s.add_argument("--binding", default="{}")
    s.add_argument("--cadence", type=int, default=86400)
    s.add_argument("--enabled", action="store_true")
    s.add_argument("--now")

    r = sub.add_parser("release")
    r.add_argument("action", choices=["list", "validate", "promote",
                                      "rollback", "audit"])
    r.add_argument("--root", required=True)
    r.add_argument("--ctx", required=True)
    r.add_argument("--manifest")
    r.add_argument("--expected")

    st = sub.add_parser("status")
    st.add_argument("--root", required=True)
    st.add_argument("--ctx", required=True)

    i = sub.add_parser("integrity")
    i.add_argument("--root", required=True)

    g = sub.add_parser("generate")
    g.add_argument("--root", required=True)
    g.add_argument("--manifest", required=True)
    g.add_argument("--case", required=True)
    g.add_argument("--issue")

    o = sub.add_parser("reopen")
    o.add_argument("--root", required=True)
    o.add_argument("--run-id", required=True)

    sc = sub.add_parser("score")
    sc.add_argument("--runs", required=True)
    sc.add_argument("--obs", required=True)

    args = ap.parse_args(argv)

    if args.top == "schedule":
        db = args.db
        if args.action == "create":
            out = schedules.create(db, kind=args.kind,
                                   binding=json.loads(args.binding),
                                   cadence_seconds=args.cadence,
                                   enabled=args.enabled)
        elif args.action in ("enable", "disable"):
            out = schedules.set_enabled(db, args.id,
                                        args.action == "enable")
        elif args.action == "pause":
            out = {"paused": schedules.set_paused(db, True)}
        elif args.action == "resume":
            out = {"resumed": schedules.set_paused(db, False)}
        elif args.action == "due":
            out = schedules.due(db)
        elif args.action == "tick":
            out = runner.plan_due(db)
        elif args.action == "recover":
            out = schedules.recover_expired(db)
        else:
            out = schedules.list_all(db)
    elif args.top == "release":
        ctx = json.loads(args.ctx)
        if args.action == "validate":
            out = releases.validate(args.root, _json_file(args.manifest))
        elif args.action == "promote":
            out = releases.promote(args.root, _json_file(args.manifest),
                                   expected_active=args.expected)
        elif args.action == "rollback":
            out = releases.rollback(args.root, ctx)
        elif args.action == "audit":
            p = releases._ctx_dir(args.root, ctx) / "audit.jsonl"
            out = _jsonl_file(p) if p.exists() else []
        else:
            out = releases.list_releases(args.root, ctx)
    elif args.top == "status":
        out = monitoring.status(args.root, json.loads(args.ctx))
    elif args.top == "integrity":
        out = integrity.check(args.root)
    elif args.top == "generate":
        out = runner.generate(args.root, _json_file(args.manifest),
                              _json_file(args.case), issue=args.issue)
    elif args.top == "reopen":
        out = runner.reopen(args.root, args.run_id)
    else:
        out = monitoring.mature_scores(_jsonl_file(args.runs),
                                       _jsonl_file(args.obs))
    print(json.dumps(out, indent=2, default=str)[:6000])
    return 0


if __name__ == "__main__":
    sys.exit(main())
