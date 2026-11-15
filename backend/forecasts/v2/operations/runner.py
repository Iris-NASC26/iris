"""Operation orchestration: due-work planning, release-based generation
with saved/reopened snapshots, and schedule-driven dispatch.

`generate` is the integrated path: frozen candidate + feature binding +
calibration applied exactly once + insight references, saved atomically.
Read-back replays the saved snapshot — no refit, no provider access, no
silent recalibration.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

from ..forecast_insights import calibration, extremes
from ..model_selection import candidates
from . import adapters, releases, schedules

SCHEMA = "iris-ops-run.v1"


def _now() -> datetime:
    return datetime.now(UTC)


def plan_due(db_path, *, now: datetime | None = None,
             lease_s: int = schedules.DEFAULT_LEASE_S,
             owner: str | None = None) -> list:
    """Deterministic due-work planning: claim + return executable plans.
    Read/page visits never call this; only the ops tick does."""
    plans = []
    for s in schedules.due(db_path, now=now):
        if not schedules.claim(db_path, s["schedule_id"], now=now,
                               lease_s=lease_s, owner=owner):
            continue  # another tick/process holds the lease
        b = s["binding"]
        plans.append({"schedule_id": s["schedule_id"],
                      "kind": s["kind"], "operation": s["kind"],
                      "binding": b, "budget": s["budget"],
                      "planned_at": (now or _now()).isoformat()})
    return plans


def generate(root, manifest: dict, case: dict, *, issue: str | None = None,
             case_id: str | None = None) -> dict:
    """Produce a saved forecast through the active release's adapter.
    Raw and calibrated intervals stay distinct; the calibration
    artifact applies exactly once."""
    loaded = adapters.load_state(manifest["model"])
    if loaded.get("state") is None:
        return {"schema": SCHEMA, "status": loaded["status"],
                "action": loaded.get("action"),
                "release_id": manifest["release_id"]}
    raw_pred = candidates.replay_predict(loaded["state"], case)
    if raw_pred is None or "q" not in raw_pred:
        return {"schema": SCHEMA, "status": "insufficient_inputs",
                "release_id": manifest["release_id"]}
    raw = raw_pred["q"]
    target = manifest["context"]["target"]
    cal_ref = (manifest.get("insights") or {}).get("calibration")
    cal_out = {"status": "uncalibrated",
               "reason": "no calibration artifact bound"}
    if cal_ref:
        cal_path = Path(cal_ref["path"])
        if not cal_path.is_absolute():
            cal_path = Path(root) / cal_path
        if cal_path.exists():
            cal_art = json.loads((cal_path / "calibrator.json").read_text()
                                 if cal_path.is_dir()
                                 else cal_path.read_text())
            cal_out = calibration.apply(cal_art, raw, target)
    thr_out = None
    thr_ref = (manifest.get("insights") or {}).get("threshold")
    if thr_ref:
        tp = Path(thr_ref["path"])
        if not tp.is_absolute():
            tp = Path(root) / tp
        if tp.exists():
            tj = tp / "threshold.json" if tp.is_dir() else tp
            thr_art = json.loads(tj.read_text())
            thr_out = extremes.indicator(thr_art, raw, issue or
                                         _now().isoformat())
    run = {"schema": SCHEMA, "run_id": "run-" + uuid.uuid4().hex[:10],
           "release_id": manifest["release_id"],
           "release_quality": manifest["quality"],
           "context": manifest["context"],
           "issue": issue or _now().isoformat(),
           "case_id": case_id or case.get("issue"),
           "input_snapshot": {"case_id": case.get("case_id"),
                              "feature_columns":
                              loaded["state"].get("columns")},
           "raw_q": list(raw),
           "calibrated": cal_out,
           "extreme_indicator": thr_out,
           "insight_versions":
               {k: v.get("sha256", "")[:12]
                for k, v in (manifest.get("insights") or {}).items()},
           "saved_at": _now().isoformat()}
    d = Path(root) / "ops_runs"
    d.mkdir(parents=True, exist_ok=True)
    tmp = d / f"{run['run_id']}.tmp"
    tmp.write_text(json.dumps(run, indent=2, sort_keys=True))
    os.replace(tmp, d / f"{run['run_id']}.json")
    return run


def reopen(root, run_id: str) -> dict:
    """Read-back replays the SAVED snapshot only."""
    p = Path(root) / "ops_runs" / f"{run_id}.json"
    if not p.exists():
        return {"status": "not_found", "run_id": run_id}
    return json.loads(p.read_text())
