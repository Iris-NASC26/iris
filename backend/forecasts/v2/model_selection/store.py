"""Model-selection artifacts — isolated namespace, atomic writes,
content-addressed candidate dirs, frozen selection records."""
from __future__ import annotations

import hashlib
import json
import os
import pickle
import tempfile
from pathlib import Path

from ...store import PATH as STORE_PATH

ROOT = Path(STORE_PATH).parent / "v2" / "model_selection"


def _write(path: Path, blob: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(blob)
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


def save_json(path: Path, payload) -> None:
    _write(path, json.dumps(payload, indent=2, default=str).encode())


def artifact_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save_candidate_artifact(path: Path, spec: dict, fitted_state,
                            metrics: dict) -> dict:
    """Persist contract + fitted estimator + evidence; returns hashes."""
    path.mkdir(parents=True, exist_ok=True)
    save_json(path / "candidate.json", spec)
    save_json(path / "metrics.json", metrics)
    blob = pickle.dumps(fitted_state, protocol=4)
    _write(path / "estimator.pkl", blob)
    return {"estimator_sha256": hashlib.sha256(blob).hexdigest(),
            "artifact_dir": str(path)}


def load_frozen(selection_dir: str) -> tuple[dict, object]:
    """Load a frozen candidate contract + estimator; strict contract checks."""
    d = Path(selection_dir)
    spec = json.loads((d / "candidate.json").read_text())
    if spec.get("schema") != "iris-candidate.v1":
        raise ValueError(f"{d}/candidate.json is not an iris-candidate.v1 "
                         "artifact — refreeze under the current contract")
    blob = (d / "estimator.pkl").read_bytes()
    digest = hashlib.sha256(blob).hexdigest()
    recorded = (spec.get("frozen") or {}).get("estimator_sha256")
    if recorded and recorded != digest:
        raise ValueError("frozen estimator hash mismatch — artifact was "
                         "modified after freeze; refit instead of mixing")
    return spec, pickle.loads(blob)
