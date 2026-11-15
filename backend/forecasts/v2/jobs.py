"""Durable v2 jobs on the existing SQLite catalogue: idempotent, resumable,
cancellable, crash-safe. A restarted process fails interrupted work honestly
instead of leaving permanent 'running' rows."""
from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone

from ..store import PATH

DB_PATH = PATH


_recovered = False


def _db() -> sqlite3.Connection:
    global _recovered
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.execute("""CREATE TABLE IF NOT EXISTS v2_jobs (
        job_id TEXT PRIMARY KEY, kind TEXT NOT NULL, location_id TEXT NOT NULL,
        status TEXT NOT NULL, progress REAL NOT NULL DEFAULT 0,
        checkpoint TEXT NOT NULL DEFAULT '{}', error TEXT,
        idem TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(kind, location_id, idem))""")
    con.commit()
    if not _recovered:
        # Crash recovery once per process start: orphaned running rows become
        # failed and resumable — never permanently 'running'.
        con.execute("UPDATE v2_jobs SET status='failed', error='interrupted by restart', updated_at=? WHERE status='running'", (_now(),))
        con.commit()
        _recovered = True
    return con


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def enqueue(kind: str, location_id: str, idem: str = "", spec: dict | None = None) -> dict:
    """Idempotent enqueue: same (kind, location, idem) returns the live job."""
    con = _db()
    if idem:
        row = con.execute("SELECT job_id FROM v2_jobs WHERE kind=? AND location_id=? AND idem=? AND status IN ('queued','running')", (kind, location_id, idem)).fetchone()
        if row:
            return get(row[0])
    job_id = f"v2-{uuid.uuid4().hex[:12]}"
    now = _now()
    try:
        con.execute("INSERT INTO v2_jobs VALUES (?,?,?,?,0,?,NULL,?,?,?)",
                    (job_id, kind, location_id, "queued",
                     json.dumps(spec or {}), idem, now, now))
        con.commit()
    except sqlite3.IntegrityError:
        # Same (kind, location, idem) already exists - return it, whatever state.
        row = con.execute("SELECT job_id FROM v2_jobs WHERE kind=? AND location_id=? AND idem=?",
                          (kind, location_id, idem)).fetchone()
        return get(row[0])
    return get(job_id)


def get(job_id: str) -> dict:
    con = _db()
    row = con.execute("SELECT * FROM v2_jobs WHERE job_id=?", (job_id,)).fetchone()
    if not row:
        raise KeyError(job_id)
    keys = ["job_id", "kind", "location_id", "status", "progress", "checkpoint", "error", "idem", "created_at", "updated_at"]
    out = dict(zip(keys, row))
    out["checkpoint"] = json.loads(out["checkpoint"])
    return out


def advance(job_id: str, progress: float, checkpoint: dict | None = None) -> None:
    con = _db()
    if checkpoint is not None:
        con.execute("UPDATE v2_jobs SET progress=?, checkpoint=?, updated_at=? WHERE job_id=? AND status='running'",
                    (progress, json.dumps(checkpoint), _now(), job_id))
    else:
        con.execute("UPDATE v2_jobs SET progress=?, updated_at=? WHERE job_id=? AND status='running'",
                    (progress, _now(), job_id))
    con.commit()


def begin(job_id: str) -> None:
    # Resume queued or failed (interrupted) work; completed/cancelled rows never restart.
    _db().execute("UPDATE v2_jobs SET status='running', updated_at=? WHERE job_id=? AND status IN ('queued','failed')",
                  (_now(), job_id)).connection.commit()


def finish(job_id: str, ok: bool, error: str | None = None) -> None:
    con = _db()
    if ok:
        con.execute("UPDATE v2_jobs SET status='complete', progress=1.0, updated_at=? WHERE job_id=?", (_now(), job_id))
    else:
        con.execute("UPDATE v2_jobs SET status='failed', error=?, updated_at=? WHERE job_id=?", (error, _now(), job_id))
    con.commit()


def cancel(job_id: str) -> dict:
    con = _db()
    con.execute("UPDATE v2_jobs SET status='cancelled', updated_at=? WHERE job_id=? AND status IN ('queued','running')", (_now(), job_id))
    con.commit()
    return get(job_id)
