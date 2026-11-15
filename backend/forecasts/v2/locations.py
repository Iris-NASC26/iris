"""Durable point-location registry for dataset forecasts.

Replaces the six-entry static whitelist with persistent, dataset-bound
contexts. The original six identifiers are seeded once and keep working —
all existing dataset/model/run paths and links stay valid.

Rules enforced here:
- Geometry is WGS84 longitude/latitude (GeoJSON order: [lon, lat]); only
  "point" spatial mode exists in Phase 1. Spatial identity is immutable —
  editing coordinates means registering a new context.
- IDs are server-generated opaque strings (`loc-<12 hex>`); a user name is
  never used as an identifier or filesystem path.
- Records live in the same SQLite store as durable jobs; no credentials or
  auth material is stored or returned.
"""
from __future__ import annotations

import json
import math
import re
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

from ..catalog import REGIONS
from ..store import PATH

DB_PATH = PATH
SCHEMA_VERSION = "iris.forecast-location.v1"
ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,38}$")
NAME_PATTERN = re.compile(r"^[^\x00-\x1f/\\]{1,80}$")
TIMEZONE_PATTERN = re.compile(r"^[A-Za-z_]+(?:/[A-Za-z_+-]+){1,3}$")
MAX_LOCATIONS = 500


def _now() -> str:
    return datetime.now(UTC).isoformat()


@contextmanager
def _db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=15)
    try:
        con.execute("""CREATE TABLE IF NOT EXISTS v2_locations (
            location_id TEXT PRIMARY KEY, name TEXT NOT NULL,
            lat REAL NOT NULL, lon REAL NOT NULL, timezone TEXT NOT NULL,
            source TEXT NOT NULL, created_at TEXT NOT NULL)""")
        _seed(con)
        yield con
        con.commit()
    finally:
        con.close()


def _seed(con: sqlite3.Connection) -> None:
    """Insert the original six once; their ids stay stable forever."""
    for rid, r in REGIONS.items():
        con.execute(
            "INSERT OR IGNORE INTO v2_locations VALUES (?,?,?,?,?,?,?)",
            (rid, r["name"], float(r["latitude"]), float(r["longitude"]),
             r.get("timezone") or "UTC", "seed",
             "1970-01-01T00:00:00+00:00"))


def _row_to_record(row: sqlite3.Row | tuple) -> dict:
    lid, name, lat, lon, tz, source, created = row
    return {
        "schema_version": SCHEMA_VERSION,
        "location_id": lid,
        "id": lid,                      # region-compatible alias
        "name": name,
        "latitude": lat,
        "longitude": lon,
        "timezone": tz or "UTC",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "spatial_mode": "point",
        "source": source,
        "created_at": created,
    }


def _public(record: dict) -> dict:
    """API shape — drops the internal region-compat alias."""
    return {k: v for k, v in record.items() if k != "id"}


def list_locations(limit: int = 200, offset: int = 0) -> list[dict]:
    with _db() as con:
        rows = con.execute(
            "SELECT * FROM v2_locations ORDER BY source != 'seed', created_at "
            "LIMIT ? OFFSET ?", (max(1, min(limit, MAX_LOCATIONS)), max(0, offset))
        ).fetchall()
    return [_public(_row_to_record(r)) for r in rows]


def count() -> int:
    with _db() as con:
        return con.execute("SELECT COUNT(*) FROM v2_locations").fetchone()[0]


def resolve(identifier: str) -> dict:
    """Registry record (region-compatible dict) or KeyError."""
    if not isinstance(identifier, str) or not ID_PATTERN.match(identifier):
        raise KeyError(identifier)
    with _db() as con:
        row = con.execute(
            "SELECT * FROM v2_locations WHERE location_id=?", (identifier,)
        ).fetchone()
    if row is None:
        raise KeyError(identifier)
    return _row_to_record(row)


def _validate(name: str, lat, lon) -> tuple[str, float, float]:
    if not isinstance(name, str) or not NAME_PATTERN.match(name.strip()):
        raise ValueError(
            "A location needs a name of 1-80 characters without control or path characters.")
    name = name.strip()
    try:
        flat, flon = float(lat), float(lon)
    except (TypeError, ValueError):
        raise ValueError("Latitude and longitude must be numbers.") from None
    if not (math.isfinite(flat) and math.isfinite(flon)):
        raise ValueError("Latitude and longitude must be finite.")
    if not -90.0 <= flat <= 90.0:
        raise ValueError("Latitude must be between -90 and 90 degrees.")
    if not -180.0 <= flon <= 180.0:
        raise ValueError("Longitude must be between -180 and 180 degrees.")
    return name, flat, flon


def register(name: str, lat, lon, timezone: str | None = None) -> tuple[dict, bool]:
    """Validate + persist a new point context. Returns (record, created).

    Duplicate coordinates resolve to the existing record — an identical
    point is the same spatial support, so nothing is merged or duplicated.
    """
    name, flat, flon = _validate(name, lat, lon)
    tz = timezone.strip() if isinstance(timezone, str) else ""
    if not TIMEZONE_PATTERN.match(tz):
        tz = "UTC"  # explicit fallback, documented on the record
    with _db() as con:
        if con.execute("SELECT COUNT(*) FROM v2_locations").fetchone()[0] >= MAX_LOCATIONS:
            raise ValueError("The location registry is full; reuse an existing point.")
        row = con.execute(
            "SELECT * FROM v2_locations WHERE ABS(lat-?) < 1e-5 AND ABS(lon-?) < 1e-5",
            (flat, flon)).fetchone()
        if row:
            return _public(_row_to_record(row)), False
        lid = "loc-" + uuid.uuid4().hex[:12]
        created = _now()
        con.execute(
            "INSERT INTO v2_locations VALUES (?,?,?,?,?,?,?)",
            (lid, name, flat, flon, tz, "registered", created))
    return _public(_row_to_record((lid, name, flat, flon, tz, "registered", created))), True


def delete_all_for_tests() -> None:  # pragma: no cover - test helper
    with _db() as con:
        con.execute("DELETE FROM v2_locations WHERE source != 'seed'")
