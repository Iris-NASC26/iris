"""Versioned, content-addressed historical datasets.

A dataset = sanitized JSONL of valid HistoricalRecords + quarantine report +
manifest. The dataset id is derived from content — identical inputs reproduce
the identical id, and existing datasets are never overwritten (archived models
keep resolvable inputs).
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

from ..store import PATH as STORE_PATH

ROOT = Path(STORE_PATH).parent / "v2"

SANITIZED_FIELDS = (
    "location_id", "source_id", "station_id", "lat", "lon", "variable", "unit",
    "interval_start", "interval_end", "value", "quality", "retrieved_at",
    "available_at", "source_artifact_hash",
)


def _canonical(rec) -> dict:
    d = rec if isinstance(rec, dict) else asdict(rec)
    return {k: d.get(k) for k in SANITIZED_FIELDS}


def build(location_id: str, source_id: str, valid_records: list,
          quarantined: list[dict], *, spec: dict, location: dict | None = None) -> dict:
    """Persist a new dataset revision (or return the existing identical one)."""
    canon = [_canonical(r) for r in valid_records]
    canon.sort(key=lambda r: (r["variable"], r["interval_start"]))
    jsonl = b"\n".join(
        json.dumps(r, sort_keys=True, separators=(",", ":")).encode() for r in canon
    )
    payload = json.dumps(canon, sort_keys=True, separators=(",", ":")).encode()
    content_hash = hashlib.sha256(payload).hexdigest()
    dataset_id = f"ds-{content_hash[:16]}"
    days = sorted({r["interval_start"][:10] for r in canon})
    resolved = _resolved_cell(canon)
    manifest = {
        "schema_version": "iris.ml-forecast.v2",
        "dataset_id": dataset_id,
        "location_id": location_id,
        "source_id": source_id,
        "created_at": datetime.now(UTC).isoformat(),
        "records": len(canon),
        "variables": sorted({r["variable"] for r in canon}),
        "availability_basis": "Source publication delays are estimated; not a verified issue-time archive.",
        "precip_complete_days": len(days),
        "coverage": {"first_day": days[0] if days else None,
                     "last_day": days[-1] if days else None},
        "quarantine": {"count": len(quarantined),
                       "reasons": sorted({q["reason"] for q in quarantined})},
        "content_sha256": content_hash,
        # Phase-1 spatial contract: every dataset is a single point/grid-cell
        # series. True area aggregation is Phase 2 and must never be implied
        # by these fields.
        "spatial_mode": "point",
        "spatial_support": "point",
        "requested_geometry": (location or {}).get("geometry"),
        "resolved_coordinates": resolved,
        "spatial_extent": {"known": resolved is not None,
                           "kind": "point",
                           "note": "single source grid cell; not an area average"},
        "spec": spec,
        "immutable": True,
    }
    ddir = ROOT / "datasets" / location_id / dataset_id
    ddir.mkdir(parents=True, exist_ok=True)
    mpath = ddir / "manifest.json"
    if mpath.exists():
        return json.loads(mpath.read_text())
    (ddir / "records.jsonl").write_bytes(jsonl + (b"\n" if jsonl else b""))
    (ddir / "quarantine.json").write_text(json.dumps(quarantined, indent=1))
    mpath.write_text(json.dumps(manifest, indent=1))
    return manifest


def _resolved_cell(canon: list[dict]) -> dict | None:
    """Modal (lat, lon) across records — the actual source cell, if known."""
    cells = [(r.get("lat"), r.get("lon")) for r in canon
             if isinstance(r.get("lat"), (int, float)) and isinstance(r.get("lon"), (int, float))]
    if not cells:
        return None
    lat, lon = max(set(cells), key=cells.count)
    return {"latitude": lat, "longitude": lon}


def _adapt(manifest: dict) -> dict:
    """Read-time defaults for pre-Phase-1 manifests. Old manifests are never
    rewritten; unknown spatial support is honestly marked unknown."""
    m = dict(manifest)
    m.setdefault("spatial_mode", "point")
    m.setdefault("spatial_support", "unknown")
    m.setdefault("requested_geometry", None)
    m.setdefault("resolved_coordinates", None)
    m.setdefault("spatial_extent", {"known": False, "kind": "point",
                                  "note": "legacy manifest; spatial support not recorded"})
    return m


def load(location_id: str, dataset_id: str) -> list[dict] | None:
    if not re.fullmatch(r"ds-[a-f0-9]{16}", dataset_id):
        return None
    p = ROOT / "datasets" / location_id / dataset_id / "records.jsonl"
    if not p.exists():
        return None
    return [json.loads(line) for line in p.read_text().splitlines() if line.strip()]


def manifests(location_id: str) -> list[dict]:
    base = ROOT / "datasets" / location_id
    if not base.exists():
        return []
    out = []
    for m in sorted(base.glob("*/manifest.json")):
        try:
            out.append(_adapt(json.loads(m.read_text())))
        except json.JSONDecodeError:
            continue
    return sorted(out, key=lambda item: item.get("created_at", ""))


def manifest(location_id: str, dataset_id: str) -> dict | None:
    if not re.fullmatch(r"ds-[a-f0-9]{16}", dataset_id):
        return None
    p = ROOT / "datasets" / location_id / dataset_id / "manifest.json"
    return _adapt(json.loads(p.read_text())) if p.exists() else None


def find(dataset_id: str) -> dict | None:
    """Locate a manifest across all registered contexts. A dataset id is only
    meaningful with its bound location — this lookup returns the bound copy,
    never relabels it for another point."""
    if not re.fullmatch(r"ds-[a-f0-9]{16}", dataset_id):
        return None
    for p in sorted(ROOT.glob(f"datasets/*/{dataset_id}/manifest.json")):
        try:
            return _adapt(json.loads(p.read_text()))
        except json.JSONDecodeError:
            continue
    return None


def inventory(limit: int = 50, offset: int = 0) -> dict:
    """Populated revisions across all contexts, newest first, bounded."""
    out = []
    for m in sorted(ROOT.glob("datasets/*/ds-*/manifest.json")):
        try:
            out.append(_adapt(json.loads(m.read_text())))
        except json.JSONDecodeError:
            continue
    out.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    total = len(out)
    limit = max(1, min(int(limit), 200))
    offset = max(0, int(offset))
    return {"datasets": out[offset:offset + limit], "total": total,
            "limit": limit, "offset": offset}
