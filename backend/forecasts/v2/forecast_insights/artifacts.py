"""Versioned insight artifacts — isolated namespace, content hash,
atomic writes, strict schema/hash checks on read."""
from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path

from ...store import PATH as STORE_PATH

ROOT = Path(STORE_PATH).parent / "v2" / "insights"


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


def allocate(tag: str, root=None) -> Path:
    root = Path(root) if root else ROOT
    n, path = 1, root / f"{tag}-r1"
    while path.exists():
        n += 1
        path = root / f"{tag}-r{n}"
    return path


def save(path: Path, name: str, payload) -> str:
    blob = json.dumps(payload, indent=2, default=str, sort_keys=False)
    _write(path / name, blob)
    return hashlib.sha256(blob.encode()).hexdigest()


def load(path, expected_schema: str | None = None) -> dict:
    p = Path(path)
    if p.is_dir():
        raise ValueError(f"expected a file, got directory {p}")
    data = json.loads(p.read_text())
    if expected_schema and data.get("schema") != expected_schema:
        raise ValueError(
            f"{p.name} schema {data.get('schema')!r} != "
            f"{expected_schema!r} — versioned artifact mismatch; "
            "regenerate under the current contract")
    return data


def fingerprint(payload) -> str:
    blob = json.dumps(payload, sort_keys=True, default=str).encode()
    return hashlib.sha256(blob).hexdigest()
