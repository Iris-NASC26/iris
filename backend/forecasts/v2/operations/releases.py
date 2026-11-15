"""Versioned release manifests with atomic promotion, audit and rollback.

A release is an immutable `rel-rN/` directory: manifest.json binds model
+ feature/transform + insight artifacts + source/spatial context + the
evidence that qualified it. `active.json` is the only mutable pointer and
swaps via tmp-write + rename after all referenced artifacts verify —
a torn write can never point at a half-published release.
"""
from __future__ import annotations

import hashlib
import json
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

SCHEMA = "iris-release.v1"
POLICY_VERSION = "promotion-policy.v1"


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _write_atomic(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True))
    os.replace(tmp, path)


def allocate(root, *, context_key: str) -> Path:
    base = Path(root) / "releases" / context_key
    base.mkdir(parents=True, exist_ok=True)
    n = 1 + len([d for d in base.glob("rel-r*") if d.is_dir()])
    d = base / f"rel-r{n}"
    d.mkdir()
    return d


def publish(root, *, context: dict, model_ref: dict, feature_ref: dict,
            insight_refs: dict, evidence: dict,
            quality: str = "experimental",
            created_by: str = "operator") -> dict:
    """Write an immutable release directory; does NOT activate it."""
    if quality not in ("qualified", "experimental"):
        raise ValueError("quality must be 'qualified' or 'experimental'")
    key = context.get("key") or f"{context['location_id']}-" \
        f"{context['target']}"
    d = allocate(root, context_key=key)
    man = {"schema": SCHEMA, "release_id": d.name, "context": context,
           "quality": quality, "created_at": _now(),
           "created_by": created_by,
           "policy_version": POLICY_VERSION,
           "model": model_ref, "features": feature_ref,
           "insights": insight_refs, "evidence": evidence}
    _write_atomic(d / "manifest.json", man)
    man["dir"] = str(d)
    return man


def _verify_ref(root: Path, ref: dict, problems: list, label: str) -> None:
    p = ref.get("path")
    if not p:
        problems.append(f"{label}: missing path")
        return
    fp = Path(p)
    if not fp.is_absolute():
        fp = root / fp
    if not fp.exists():
        problems.append(f"{label}: missing artifact {fp.name}")
        return
    want = ref.get("sha256")
    if want and fp.is_file() and _sha(fp) != want:
        problems.append(f"{label}: hash mismatch {fp.name}")


def validate(root, manifest: dict) -> dict:
    """Dry-run: every referenced artifact exists and hash-verifies, and
    claimed capabilities carry evidence. Does not touch the pointer."""
    root = Path(root)
    problems: list[str] = []
    for label, ref in (("model", manifest.get("model") or {}),):
        _verify_ref(root, ref, problems, label)
    for label, ref in (manifest.get("insights") or {}).items():
        _verify_ref(root, ref, problems, f"insight.{label}")
    for label, ref in (manifest.get("features") or {}).items():
        if isinstance(ref, dict) and ref.get("path"):
            _verify_ref(root, ref, problems, f"feature.{label}")
    ev = manifest.get("evidence") or {}
    if manifest.get("quality") == "qualified":
        for req in ("evaluation", "calibration"):
            if not ev.get(req):
                problems.append(f"qualified release lacks {req} evidence")
        if (ev.get("evaluation") or {}).get("holdout") == "consumed":
            problems.append("holdout-consumed evidence cannot qualify")
    if not manifest.get("context", {}).get("target"):
        problems.append("context missing target")
    return {"ok": not problems, "problems": problems,
            "release_id": manifest.get("release_id"),
            "policy_version": POLICY_VERSION}


def _ctx_dir(root, context: dict) -> Path:
    key = context.get("key") or f"{context['location_id']}-" \
        f"{context['target']}"
    return Path(root) / "releases" / key


def active(root, context: dict) -> dict | None:
    p = _ctx_dir(root, context) / "active.json"
    return json.loads(p.read_text()) if p.exists() else None


def _audit(root, context: dict, event: str, payload: dict) -> None:
    d = _ctx_dir(root, context)
    d.mkdir(parents=True, exist_ok=True)
    with open(d / "audit.jsonl", "a", encoding="utf-8") as fh:
        fh.write(json.dumps({"tx": uuid.uuid4().hex[:12],
                             "at": _now(), "event": event,
                             **payload}) + "\n")


def promote(root, manifest: dict, *, expected_active: str | None = None,
            actor: str = "operator") -> dict:
    """Validate fully, then CAS the active pointer. A concurrent
    promotion that changed the pointer first makes this call fail —
    the last valid release stays active either way."""
    v = validate(root, manifest)
    _audit(root, manifest["context"], "promote_attempt",
           {"release_id": manifest["release_id"], "actor": actor,
            "valid": v["ok"], "problems": v["problems"]})
    if not v["ok"]:
        return {**v, "status": "rejected"}
    d = _ctx_dir(root, manifest["context"])
    cur = active(root, manifest["context"])
    cur_id = (cur or {}).get("release_id")
    if expected_active is not None and cur_id != expected_active:
        _audit(root, manifest["context"], "promote_conflict",
               {"release_id": manifest["release_id"],
                "expected": expected_active, "actual": cur_id})
        return {"status": "conflict", "ok": False,
                "active": cur_id, "expected": expected_active}
    if cur:
        _write_atomic(d / "previous.json", cur)
    payload = {"release_id": manifest["release_id"],
               "dir": manifest["dir"], "quality": manifest["quality"],
               "activated_at": _now(), "actor": actor,
               "policy_version": POLICY_VERSION}
    _write_atomic(d / "active.json", payload)
    _audit(root, manifest["context"], "promoted",
           {"release_id": manifest["release_id"], "actor": actor,
            "previous": cur_id})
    return {"status": "promoted", "ok": True, "active": payload}


def rollback(root, context: dict, *, actor: str = "operator") -> dict:
    """Restore the previous coherent release — no refit, no rewrite of
    its historical evidence. Compatibility with today's inputs must be
    revalidated by the caller."""
    d = _ctx_dir(root, context)
    prev_p = d / "previous.json"
    if not prev_p.exists():
        return {"status": "no_previous", "ok": False}
    prev = json.loads(prev_p.read_text())
    cur = active(root, context)
    man_p = Path(prev.get("dir", "")) / "manifest.json"
    if not man_p.exists():
        man_p = d / prev.get("release_id", "") / "manifest.json"
    if not man_p.exists():
        _audit(root, context, "rollback_failed",
               {"release_id": prev["release_id"],
                "reason": "manifest missing"})
        return {"status": "previous_manifest_missing", "ok": False}
    _write_atomic(d / "active.json",
                  {**prev, "restored_at": _now(), "actor": actor})
    _write_atomic(d / "previous.json", cur) if cur else None
    _audit(root, context, "rolled_back",
           {"release_id": prev["release_id"], "actor": actor,
            "previous_active": (cur or {}).get("release_id")})
    return {"status": "rolled_back", "ok": True, "active": prev}


def list_releases(root, context: dict) -> list:
    d = _ctx_dir(root, context)
    out = []
    for p in sorted(d.glob("rel-r*/manifest.json")) if d.exists() else []:
        out.append(json.loads(p.read_text()))
    return out
