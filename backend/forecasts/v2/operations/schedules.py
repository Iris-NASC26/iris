"""Durable schedule registry + deterministic due-work planning.

SQLite-backed (same catalogue family as jobs). Claims are atomic
single-statement UPDATEs — safe for one writer process or coordinated
ticks on a single host; this is the stated deployment topology, not a
distributed-leader claim. Missed runs coalesce to ONE catch-up: a
restart never storms unbounded backfill.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

SCHEMA = "iris-schedule.v1"
KINDS = ("history_update", "forecast_reissue", "candidate_retrain",
         "monitoring")
DEFAULT_LEASE_S = 900


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _parse(v) -> datetime:
    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))


def _db(db_path):
    p = Path(db_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(p), timeout=15)
    con.execute("""CREATE TABLE IF NOT EXISTS v2_schedules (
        schedule_id TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 1,
        kind TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
        binding TEXT NOT NULL, cadence_seconds INTEGER NOT NULL,
        next_due TEXT, budget TEXT, missed_policy TEXT DEFAULT 'coalesce',
        last_attempt TEXT, last_success TEXT, last_error TEXT,
        active_job TEXT, lease_owner TEXT, lease_expires TEXT,
        paused INTEGER NOT NULL DEFAULT 0)""")
    con.commit()
    return con


def create(db_path, *, kind: str, binding: dict, cadence_seconds: int,
           enabled: bool = False, budget: dict | None = None,
           next_due: datetime | None = None,
           missed_policy: str = "coalesce") -> dict:
    if kind not in KINDS:
        raise ValueError(f"unknown schedule kind {kind!r}")
    sid = "sch-" + uuid.uuid4().hex[:12]
    nd = _iso(next_due or (_utcnow() + timedelta(seconds=cadence_seconds)))
    with _db(db_path) as con:
        con.execute(
            "INSERT INTO v2_schedules (schedule_id,kind,enabled,binding,"
            "cadence_seconds,next_due,budget,missed_policy) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (sid, kind, int(enabled), json.dumps(binding),
             int(cadence_seconds), nd, json.dumps(budget or {}),
             missed_policy))
    return get(db_path, sid)


def get(db_path, sid: str) -> dict | None:
    with _db(db_path) as con:
        con.row_factory = sqlite3.Row
        r = con.execute("SELECT * FROM v2_schedules WHERE schedule_id=?",
                        (sid,)).fetchone()
    if not r:
        return None
    d = dict(r)
    d["binding"] = json.loads(d["binding"])
    d["budget"] = json.loads(d["budget"])
    d["enabled"] = bool(d["enabled"])
    d["paused"] = bool(d["paused"])
    return d


def list_all(db_path) -> list:
    with _db(db_path) as con:
        con.row_factory = sqlite3.Row
        return [get(db_path, r["schedule_id"]) for r in con.execute(
            "SELECT schedule_id FROM v2_schedules ORDER BY schedule_id")]


def set_enabled(db_path, sid: str, enabled: bool) -> dict:
    with _db(db_path) as con:
        con.execute("UPDATE v2_schedules SET enabled=?, version=version+1 "
                    "WHERE schedule_id=?", (int(enabled), sid))
    return get(db_path, sid)


def set_paused(db_path, paused: bool) -> int:
    with _db(db_path) as con:
        cur = con.execute("UPDATE v2_schedules SET paused=?", (int(paused),))
        return cur.rowcount


def due(db_path, *, now: datetime | None = None) -> list:
    now = now or _utcnow()
    return [s for s in list_all(db_path)
            if s["enabled"] and not s["paused"] and s["next_due"]
            and _parse(s["next_due"]) <= now]


def claim(db_path, sid: str, *, now: datetime | None = None,
          lease_s: int = DEFAULT_LEASE_S, owner: str | None = None) -> bool:
    """Atomic claim: succeeds only if due and no live lease. Overlapping
    ticks and second processes cannot both claim."""
    now = now or _utcnow()
    owner = owner or f"proc-{uuid.uuid4().hex[:8]}"
    exp = _iso(now + timedelta(seconds=lease_s))
    with _db(db_path) as con:
        cur = con.execute(
            "UPDATE v2_schedules SET lease_owner=?, lease_expires=?,"
            "last_attempt=? WHERE schedule_id=? AND enabled=1 AND "
            "paused=0 AND next_due<=? AND (lease_expires IS NULL OR "
            "lease_expires<?)",
            (owner, exp, _iso(now), sid, _iso(now), _iso(now)))
        ok = cur.rowcount == 1
    if ok:
        with _db(db_path) as con:
            con.execute("UPDATE v2_schedules SET active_job=? "
                        "WHERE schedule_id=?", (f"plan-{sid}", sid))
    return ok


def complete(db_path, sid: str, *, ok: bool, error: str | None = None,
             now: datetime | None = None,
             produced_change: bool = True) -> dict:
    """Record outcome; next_due advances by cadence, coalescing any run of
    missed slots to a single next execution — never unbounded catch-up.
    A successful no-change check still counts as success."""
    now = now or _utcnow()
    s = get(db_path, sid)
    base = _parse(s["next_due"])
    nxt = base + timedelta(seconds=s["cadence_seconds"])
    while nxt <= now:  # skip every fully-missed slot at once
        nxt += timedelta(seconds=s["cadence_seconds"])
    with _db(db_path) as con:
        con.execute(
            "UPDATE v2_schedules SET next_due=?, lease_owner=NULL,"
            "lease_expires=NULL, active_job=NULL, last_success=?,"
            "last_error=?, version=version+1 WHERE schedule_id=?",
            (_iso(nxt), _iso(now) if ok else s["last_success"],
             None if ok else (error or "unknown"), sid))
    out = get(db_path, sid)
    out["no_change"] = ok and not produced_change
    return out


def recover_expired(db_path, *, now: datetime | None = None) -> list:
    """Schedules whose lease lapsed mid-run — lease columns cleared so a
    later tick can re-claim; the dead attempt is not credited."""
    now = now or _utcnow()
    stale = [s for s in list_all(db_path)
             if s["lease_expires"] and _parse(s["lease_expires"]) < now]
    with _db(db_path) as con:
        for s in stale:
            con.execute("UPDATE v2_schedules SET lease_owner=NULL,"
                        "lease_expires=NULL, active_job=NULL "
                        "WHERE schedule_id=?", (s["schedule_id"],))
    return stale
