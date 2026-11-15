"""Operational + matured-outcome monitoring.

Skill is measured ONLY against observations that have matured and become
usable — never from issue timestamps, self-predictions or future labels.
Truth revisions produce an explicit revised audit record; the original
scored record is never silently rewritten.
"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

SCHEMA = "iris-monitor.v1"


def _parse(v) -> datetime:
    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))


def mature_scores(run_rows: list, observations: list, *,
                  now: datetime | None = None) -> dict:
    """Match saved-run predictions to matured usable truth by EXACT
    target window/context/source/support. Rows without usable truth are
    pending, not scored. A revision of an already-scored truth emits a
    `revised_score` audit event — never a silent overwrite."""
    now = now or _utcnow()
    obs = {}
    for o in observations:
        if o.get("value") is None:
            continue
        avail = _parse(o.get("available_at", o.get("end", "1970")))
        if avail <= now:
            key = (str(o.get("end")), o.get("source_id"))
            obs[key] = o
    scored, pending, audits = [], 0, []
    for r in run_rows:
        q = ((r.get("predictions") or {}).get("candidate") or {}).get("q")
        key = (str(r.get("window_end")), r.get("source_id",
                                              r.get("source")))
        truth = obs.get(key)
        if q is None or truth is None:
            pending += 1
            continue
        ae = abs(float(truth["value"]) - float(q[1]))
        prev = r.get("scored_value")
        if prev is not None and float(prev) != float(truth["value"]):
            audits.append({"tx": uuid.uuid4().hex[:10],
                           "event": "revised_score",
                           "case": r.get("issue"),
                           "prior_truth": prev,
                           "revised_truth": float(truth["value"]),
                           "prior_abs_error": abs(float(prev)
                                                  - float(q[1])),
                           "revised_abs_error": ae})
        scored.append({"issue": r.get("issue"),
                       "window_end": key[0],
                       "abs_error": ae, "q": list(q),
                       "truth": float(truth["value"]),
                       "truth_revision": truth.get("revision", 0)})
    out = {"schema": SCHEMA, "scored_at": now.isoformat(),
           "n_scored": len(scored), "n_pending": pending,
           "revised_events": audits,
           "cases": scored}
    if not scored:
        out["status"] = "insufficient_matured"
        out["reason"] = ("no matched matured observations — skill is not "
                         "established, not failed")
        return out
    out["status"] = "complete"
    out["mae_matured"] = float(np.mean([s["abs_error"] for s in scored]))
    cov = [s for s in scored if s["q"][0] <= s["truth"] <= s["q"][2]]
    out["coverage_80_matured"] = len(cov) / len(scored)
    return out


def drift(reference: dict, recent_rows: list, *, debounce: int = 3,
          prior_state: dict | None = None) -> dict:
    """Input-distribution drift vs a FROZEN permitted reference, with
    consecutive-breach debounce — one odd batch cannot trigger a
    retrain storm. Drift ≠ forecast failure; it is a warning state."""
    prior_state = prior_state or {}
    n = len(recent_rows)
    out = {"schema": SCHEMA, "n_recent": n, "debounce_required": debounce,
           "consecutive_breaches": prior_state.get("breaches", 0)}
    min_n = int(reference.get("min_n", 30))
    if n < min_n:
        out["status"] = "insufficient_evidence"
        return out
    shifts = {}
    for col, ref in (reference.get("columns") or {}).items():
        vals = [r["feature"].get(col) for r in recent_rows
                if r.get("feature") and r["feature"].get(col) is not None]
        if len(vals) < min_n:
            continue
        mu, sd = float(ref["mean"]), float(ref.get("std") or 1.0)
        shifts[col] = abs(float(np.mean(vals)) - mu) / max(sd, 1e-9)
    breached = sorted((c for c, z in shifts.items() if z > 3.0))
    out["max_shift_sigma"] = max(shifts.values()) if shifts else 0.0
    out["shifted_columns"] = breached
    if breached:
        out["consecutive_breaches"] = prior_state.get("breaches", 0) + 1
    else:
        out["consecutive_breaches"] = 0
    out["status"] = ("drift_warning" if out["consecutive_breaches"]
                     >= debounce else "stable")
    out["caveat"] = "distribution shift is not proof of forecast " \
                    "degradation or of causality"
    return out


def status(root, context: dict, *, jobs_latest: dict | None = None,
           usable_latest: str | None = None,
           stored_latest: str | None = None,
           skill: dict | None = None,
           release: dict | None = None) -> dict:
    """Compact per-context operational status — sanitized, bounded."""
    rep = {"schema": SCHEMA, "context": context,
           "at": datetime.now(UTC).isoformat(),
           "freshness": {"latest_stored": stored_latest,
                         "latest_usable": usable_latest},
           "release": ({"release_id": release.get("release_id"),
                        "quality": release.get("quality"),
                        "activated_at": release.get("activated_at")}
                       if release else None),
           "queue": ({"kind": jobs_latest.get("kind"),
                      "status": jobs_latest.get("status"),
                      "progress": jobs_latest.get("progress")}
                     if jobs_latest else None),
           "matured_skill": ({"status": skill.get("status"),
                              "n_scored": skill.get("n_scored"),
                              "mae": skill.get("mae_matured"),
                              "coverage_80":
                              skill.get("coverage_80_matured")}
                             if skill else
                             {"status": "not_evaluated"})}
    p = Path(root) / "monitoring"
    p.mkdir(parents=True, exist_ok=True)
    key = context.get("key") or f"{context.get('location_id')}-" \
        f"{context.get('target')}"
    hist = p / f"{key}.jsonl"
    with open(hist, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(rep) + "\n")
    lines = hist.read_text().splitlines()[-50:]
    rep["history_tail"] = len(lines)
    return rep
