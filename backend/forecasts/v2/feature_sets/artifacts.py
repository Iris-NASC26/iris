"""Snapshot + experiment artifacts in an isolated feature-set namespace."""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from ...store import PATH as STORE_PATH

ROOT = Path(STORE_PATH).parent / "v2" / "feature_sets"


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def allocate(fp: str, kind: str, root=None) -> Path:
    root = Path(root) if root else ROOT
    n, path = 1, root / f"fs-{fp[:12]}-{kind}-r1"
    while path.exists():
        n += 1
        path = root / f"fs-{fp[:12]}-{kind}-r{n}"
    return path


def save(path: Path, name: str, payload) -> None:
    _write(path / name, json.dumps(payload, indent=2, default=str))


def snapshot_meta(spec: dict, columns: list, manifests: dict,
                  transform_state=None) -> dict:
    """Frozen input lineage: every bound immutable revision, its content
    hash and record count — reissuing from these cannot read staging."""
    return {"schema": spec["schema_version"],
            "spec_fingerprint": None,  # filled by caller
            "profile": spec["profile"],
            "location_id": spec["location_id"],
            "target": spec["target"],
            "drivers": spec["drivers"],
            "columns": columns,
            "bindings": manifests,
            "transform": transform_state}
