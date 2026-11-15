"""Small durable forecast catalogue and atomic UTC-day request budget."""

import hashlib
import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime

from .catalog import ROOT

PATH = ROOT / "artifacts/runtime/forecasts/catalogue.sqlite3"


@contextmanager
def database():
    PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(PATH, timeout=10)
    try:
        connection.executescript("""
          CREATE TABLE IF NOT EXISTS forecasts (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, at TEXT NOT NULL, error TEXT);
          CREATE TABLE IF NOT EXISTS budget (day TEXT PRIMARY KEY, used INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS runs (sha TEXT PRIMARY KEY, id TEXT NOT NULL, retrieved TEXT NOT NULL, payload TEXT NOT NULL);
        """)
        yield connection
        connection.commit()
    finally:
        connection.close()


def get(identifier: str) -> dict | None:
    with database() as db:
        row = db.execute(
            "SELECT payload FROM forecasts WHERE id=?", (identifier,)
        ).fetchone()
    value = json.loads(row[0]) if row else None
    if value and "artifact_id" not in value:
        value["artifact_id"] = hashlib.sha256(
            json.dumps(value, sort_keys=True, allow_nan=False).encode()
        ).hexdigest()
        save(identifier, value)
    return value


def save(identifier: str, payload: dict) -> None:
    with database() as db:
        db.execute(
            "INSERT OR REPLACE INTO forecasts VALUES (?,?)",
            (identifier, json.dumps(payload, allow_nan=False)),
        )
        db.execute(
            "INSERT OR IGNORE INTO runs VALUES (?,?,?,?)",
            (
                payload["artifact_id"],
                identifier,
                payload["retrieved_at"],
                json.dumps(payload, allow_nan=False),
            ),
        )
        # Retain bounded real runs for reproducibility and future evaluation.
        db.execute(
            "DELETE FROM runs WHERE sha NOT IN (SELECT sha FROM runs ORDER BY retrieved DESC LIMIT 1500)"
        )


def archived(identifier: str) -> list[dict]:
    with database() as db:
        rows = db.execute(
            "SELECT payload FROM runs WHERE id=? ORDER BY retrieved", (identifier,)
        ).fetchall()
    return [json.loads(row[0]) for row in rows]


def run(identifier: str, digest: str) -> dict | None:
    with database() as db:
        row = db.execute(
            "SELECT payload FROM runs WHERE id=? AND sha=?", (identifier, digest)
        ).fetchone()
    return json.loads(row[0]) if row else None


def attempt(identifier: str, error: str | None = None) -> None:
    with database() as db:
        db.execute(
            "INSERT OR REPLACE INTO attempts VALUES (?,?,?)",
            (identifier, datetime.now(UTC).isoformat(), error),
        )


def last_attempt(identifier: str) -> tuple[str, str | None] | None:
    with database() as db:
        return db.execute(
            "SELECT at,error FROM attempts WHERE id=?", (identifier,)
        ).fetchone()


def reserve() -> bool:
    day = datetime.now(UTC).date().isoformat()
    with database() as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("INSERT OR IGNORE INTO budget VALUES (?,0)", (day,))
        used = db.execute("SELECT used FROM budget WHERE day=?", (day,)).fetchone()[0]
        if used >= 100:
            return False
        db.execute("UPDATE budget SET used=used+1 WHERE day=?", (day,))
        db.execute("DELETE FROM budget WHERE day<?", (day,))
    return True
