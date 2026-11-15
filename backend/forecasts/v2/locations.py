"""Durable forecast-context registry for dataset forecasts.

Phase 1 replaced the six-entry static whitelist with persistent point
contexts; Phase 2 adds immutable bounding-box area contexts
(`spatial_mode: "area_mean"`). The original six identifiers are seeded
once and keep working — all existing dataset/model/run paths and links
stay valid.

Rules enforced here:
- Geometry is WGS84 longitude/latitude. Points use GeoJSON order
  [lon, lat]; areas use a canonical axis-aligned bbox [west, south,
  east, north] stored as a GeoJSON Polygon. Spatial identity is
  immutable — editing geometry means registering a new context.
- An area's stored centre is *display* metadata only; it must never
  route an area request to a point extractor.
- IDs are server-generated opaque strings (`loc-<12 hex>` points,
  `area-<12 hex>` boxes); a user name is never an identifier or path.
- Records live in the same SQLite store as durable jobs; no credentials
  or auth material is stored or returned.

Migration: `spatial_mode`/`geometry` columns are added via ALTER TABLE
when missing — existing point rows gain the defaults untouched.
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
SCHEMA_VERSION = "iris.forecast-location.v2"
ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,38}$")
NAME_PATTERN = re.compile(r"^[^\x00-\x1f/\\]{1,80}$")
TIMEZONE_PATTERN = re.compile(r"^[A-Za-z_]+(?:/[A-Za-z_+-]+){1,3}$")
MAX_LOCATIONS = 500
MAX_AREA_SPAN_DEG = 40.0  # hard registry bound; provider limits are stricter

_COLUMNS = "location_id,name,lat,lon,timezone,source,created_at,spatial_mode,geometry"


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
        existing = {row[1] for row in con.execute("PRAGMA table_info(v2_locations)")}
        # Additive Phase-2 migration — old point rows keep their defaults.
        if "spatial_mode" not in existing:
            con.execute(
                "ALTER TABLE v2_locations ADD COLUMN spatial_mode TEXT NOT NULL DEFAULT 'point'")
        if "geometry" not in existing:
            con.execute("ALTER TABLE v2_locations ADD COLUMN geometry TEXT")
        _seed(con)
        yield con
        con.commit()
    finally:
        con.close()


def _seed(con: sqlite3.Connection) -> None:
    """Insert the original six once; their ids stay stable forever."""
    for rid, r in REGIONS.items():
        con.execute(
            f"INSERT OR IGNORE INTO v2_locations ({_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?)",
            (rid, r["name"], float(r["latitude"]), float(r["longitude"]),
             r.get("timezone") or "UTC", "seed",
             "1970-01-01T00:00:00+00:00", "point", None))


def _row_to_record(row: sqlite3.Row | tuple) -> dict:
    lid, name, lat, lon, tz, source, created, mode, geometry_json = row
    record = {
        "schema_version": SCHEMA_VERSION,
        "location_id": lid,
        "id": lid,                      # region-compatible alias
        "name": name,
        "latitude": lat,                # point lat, or area centroid (display only)
        "longitude": lon,
        "timezone": tz or "UTC",
        "spatial_mode": mode or "point",
        "source": source,
        "created_at": created,
    }
    if record["spatial_mode"] == "area_mean":
        geometry = json.loads(geometry_json) if geometry_json else None
        bbox = _bbox_from_polygon(geometry) if geometry else None
        record["geometry"] = geometry
        record["bbox"] = bbox
        # Centre is display metadata — it is never an extraction coordinate.
        record["centroid"] = {"latitude": lat, "longitude": lon}
    else:
        record["geometry"] = {"type": "Point", "coordinates": [lon, lat]}
    return record


def _public(record: dict) -> dict:
    """API shape — drops the internal region-compat alias."""
    return {k: v for k, v in record.items() if k != "id"}


def list_locations(limit: int = 200, offset: int = 0) -> list[dict]:
    with _db() as con:
        rows = con.execute(
            f"SELECT {_COLUMNS} FROM v2_locations ORDER BY source != 'seed', created_at "
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
            f"SELECT {_COLUMNS} FROM v2_locations WHERE location_id=?", (identifier,)
        ).fetchone()
    if row is None:
        raise KeyError(identifier)
    return _row_to_record(row)


def _validate_name(name: str) -> str:
    if not isinstance(name, str) or not NAME_PATTERN.match(name.strip()):
        raise ValueError(
            "A location needs a name of 1-80 characters without control or path characters.")
    return name.strip()


def _validate(name: str, lat, lon) -> tuple[str, float, float]:
    name = _validate_name(name)
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


def _validate_tz(timezone: str | None) -> str:
    tz = timezone.strip() if isinstance(timezone, str) else ""
    return tz if TIMEZONE_PATTERN.match(tz) else "UTC"


def register(name: str, lat, lon, timezone: str | None = None) -> tuple[dict, bool]:
    """Validate + persist a new point context. Returns (record, created).

    Duplicate coordinates resolve to the existing record — an identical
    point is the same spatial support, so nothing is merged or duplicated.
    """
    name, flat, flon = _validate(name, lat, lon)
    tz = _validate_tz(timezone)
    with _db() as con:
        if con.execute("SELECT COUNT(*) FROM v2_locations").fetchone()[0] >= MAX_LOCATIONS:
            raise ValueError("The location registry is full; reuse an existing point.")
        row = con.execute(
            "SELECT * FROM v2_locations WHERE spatial_mode='point' "
            "AND ABS(lat-?) < 1e-5 AND ABS(lon-?) < 1e-5",
            (flat, flon)).fetchone()
        if row:
            return _public(_row_to_record(row)), False
        lid = "loc-" + uuid.uuid4().hex[:12]
        created = _now()
        con.execute(
            f"INSERT INTO v2_locations ({_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?)",
            (lid, name, flat, flon, tz, "registered", created, "point", None))
    return _public(_row_to_record((lid, name, flat, flon, tz, "registered", created, "point", None))), True


def canonical_bbox(bbox) -> tuple[float, float, float, float]:
    """[west, south, east, north] validated and rounded deterministically.

    Rejects nonfinite values, out-of-range bounds, reversed/zero-area
    boxes and antimeridian crossings (west >= east by convention).
    Polygons are not accepted in this phase.
    """
    if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
        raise ValueError("An area needs four bounds: [west, south, east, north].")
    try:
        w, s, e, n = (float(v) for v in bbox)
    except (TypeError, ValueError):
        raise ValueError("Bounding-box bounds must be numbers.") from None
    if not all(math.isfinite(v) for v in (w, s, e, n)):
        raise ValueError("Bounding-box bounds must be finite.")
    if w < -180 or e > 180:
        raise ValueError("Longitude bounds must be within [-180, 180].")
    if s < -90 or n > 90:
        raise ValueError("Latitude bounds must be within [-90, 90].")
    if w >= e:
        raise ValueError(
            "West must be less than east; antimeridian-crossing areas are not supported yet.")
    if s >= n:
        raise ValueError("South must be less than north; reversed or zero-area bounds are not supported.")
    if e - w > MAX_AREA_SPAN_DEG or n - s > MAX_AREA_SPAN_DEG:
        raise ValueError(f"Area spans are limited to {MAX_AREA_SPAN_DEG:g} degrees per side.")
    return tuple(round(v, 6) for v in (w, s, e, n))


def _polygon(bbox: tuple[float, float, float, float]) -> dict:
    w, s, e, n = bbox
    return {"type": "Polygon",
            "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]}


def _bbox_from_polygon(geometry: dict) -> list[float] | None:
    try:
        ring = geometry["coordinates"][0]
        lons = [float(p[0]) for p in ring]
        lats = [float(p[1]) for p in ring]
        return [min(lons), min(lats), max(lons), max(lats)]
    except (KeyError, IndexError, TypeError, ValueError):
        return None


def register_area(name: str, bbox, timezone: str | None = None) -> tuple[dict, bool]:
    """Validate + persist a bounding-box area context. Returns (record, created).

    The same canonical box resolves to the existing record deterministically;
    a different box — even with the same centre — is a different context, and
    a point at the centre is never merged with an area.
    """
    name = _validate_name(name)
    w, s, e, n = canonical_bbox(bbox)
    tz = _validate_tz(timezone)
    geometry = _polygon((w, s, e, n))
    geometry_json = json.dumps(geometry, sort_keys=True)
    clat, clon = round((s + n) / 2, 6), round((w + e) / 2, 6)
    with _db() as con:
        if con.execute("SELECT COUNT(*) FROM v2_locations").fetchone()[0] >= MAX_LOCATIONS:
            raise ValueError("The location registry is full; reuse an existing context.")
        row = con.execute(
            "SELECT * FROM v2_locations WHERE spatial_mode='area_mean' AND geometry=?",
            (geometry_json,)).fetchone()
        if row:
            return _public(_row_to_record(row)), False
        lid = "area-" + uuid.uuid4().hex[:12]
        created = _now()
        con.execute(
            f"INSERT INTO v2_locations ({_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?)",
            (lid, name, clat, clon, tz, "registered", created, "area_mean", geometry_json))
    return _public(_row_to_record(
        (lid, name, clat, clon, tz, "registered", created, "area_mean", geometry_json))), True


def delete_all_for_tests() -> None:  # pragma: no cover - test helper
    with _db() as con:
        con.execute("DELETE FROM v2_locations WHERE source != 'seed'")
