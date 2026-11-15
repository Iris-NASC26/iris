"""Durable, atomically claimed local jobs; remote extraction waits are resumable."""
from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import UTC, datetime

from ..store import PATH

DB_PATH = PATH
_recovered = True


def _now():
    return datetime.now(UTC).isoformat()


@contextmanager
def _db():
    global _recovered
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=15)
    try:
        con.execute("""CREATE TABLE IF NOT EXISTS v2_jobs (
            job_id TEXT PRIMARY KEY, kind TEXT NOT NULL, location_id TEXT NOT NULL,
            status TEXT NOT NULL, progress REAL NOT NULL DEFAULT 0,
            checkpoint TEXT NOT NULL DEFAULT '{}', error TEXT,
            idem TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            UNIQUE(kind, location_id, idem))""")
        if not _recovered:
            con.execute("UPDATE v2_jobs SET status='failed', error='interrupted by restart', updated_at=? WHERE status='running'", (_now(),))
            _recovered = True
        yield con
        con.commit()
    finally:
        con.close()


def recover():
    with _db() as con:
        con.execute("UPDATE v2_jobs SET status='queued', updated_at=? WHERE status='running'", (_now(),))


def enqueue(kind: str, location_id: str, idem: str = "", spec: dict | None = None) -> dict:
    job_id = "v2-" + uuid.uuid4().hex[:12]
    with _db() as con:
        existing = (con.execute("SELECT job_id FROM v2_jobs WHERE kind=? AND location_id=? AND idem=?",
                               (kind, location_id, idem)).fetchone() if idem else None)
        if existing:
            job_id = existing[0]
        else:
            # NULL permits distinct unkeyed jobs; the old empty string collided.
            con.execute("INSERT INTO v2_jobs VALUES (?,?,?,?,0,?,NULL,?,?,?)",
                        (job_id, kind, location_id, "queued", json.dumps(spec or {}), idem or None, _now(), _now()))
    return get(job_id)


def get(job_id: str) -> dict:
    with _db() as con:
        con.row_factory = sqlite3.Row
        row = con.execute("SELECT * FROM v2_jobs WHERE job_id=?", (job_id,)).fetchone()
    if row is None:
        raise KeyError(job_id)
    out = dict(row)
    out["checkpoint"] = json.loads(out["checkpoint"])
    return out


def next_queued() -> str | None:
    with _db() as con:
        rows = con.execute("SELECT job_id,checkpoint FROM v2_jobs WHERE status='queued' ORDER BY created_at").fetchall()
    for job_id, checkpoint in rows:
        retry = json.loads(checkpoint).get("next_poll_at")
        if not retry or datetime.fromisoformat(retry) <= datetime.now(UTC):
            return job_id
    return None


def latest(location_id: str, target: str) -> dict | None:
    with _db() as con:
        rows = con.execute("SELECT job_id,checkpoint FROM v2_jobs WHERE location_id=? ORDER BY created_at DESC LIMIT 100", (location_id,)).fetchall()
    for job_id, checkpoint in rows:
        if json.loads(checkpoint).get("variable", "precip_24h") == target:
            return get(job_id)
    return None


def advance(job_id: str, progress: float, checkpoint: dict | None = None):
    current = get(job_id)["checkpoint"]
    current.update(checkpoint or {})
    with _db() as con:
        con.execute("UPDATE v2_jobs SET progress=?,checkpoint=?,updated_at=? WHERE job_id=? AND status='running'",
                    (progress, json.dumps(current), _now(), job_id))


def begin(job_id: str) -> bool:
    with _db() as con:
        return con.execute("UPDATE v2_jobs SET status='running',error=NULL,updated_at=? WHERE job_id=? AND status IN ('queued','failed')",
                           (_now(), job_id)).rowcount == 1


def defer(job_id: str, checkpoint: dict, progress: float = .1):
    advance(job_id, progress, checkpoint)
    with _db() as con:
        con.execute("UPDATE v2_jobs SET status='queued',updated_at=? WHERE job_id=? AND status='running'", (_now(), job_id))


def finish(job_id: str, ok: bool, error: str | None = None):
    progress = 1.0 if ok else get(job_id)["progress"]
    with _db() as con:
        con.execute("UPDATE v2_jobs SET status=?,progress=?,error=?,updated_at=? WHERE job_id=? AND status='running'",
                    ("complete" if ok else "failed", progress, error, _now(), job_id))


def cancel(job_id: str) -> dict:
    with _db() as con:
        con.execute("UPDATE v2_jobs SET status='cancelled',updated_at=? WHERE job_id=? AND status IN ('queued','running')", (_now(), job_id))
    return get(job_id)
