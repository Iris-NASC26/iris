"""Bounded dry-run integrity check: broken references, incomplete or
untrusted releases, dangling active pointers. Read-only — reports, never
deletes. Retention eligibility is only for artifacts referenced by
nothing."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


def _sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def check(root) -> dict:
    root = Path(root)
    problems, referenced = [], set()
    rel_root = root / "releases"
    for man_p in sorted(rel_root.glob("*/rel-r*/manifest.json")):
        man = json.loads(man_p.read_text())
        rid = man.get("release_id", man_p.parent.name)
        refs = [("model", man.get("model"))]
        refs += [(f"insight.{k}", v)
                 for k, v in (man.get("insights") or {}).items()]
        refs += [(f"feature.{k}", v)
                 for k, v in (man.get("features") or {}).items()
                 if isinstance(v, dict) and v.get("path")]
        for label, ref in refs:
            if not ref:
                continue
            p = Path(ref.get("path", ""))
            if not p.is_absolute():
                p = root / p
            if not p.exists():
                problems.append({"release": rid, "ref": label,
                                 "problem": "missing", "path": str(p)})
                continue
            referenced.add(str(p.resolve()))
            if ref.get("sha256") and p.is_file() \
                    and _sha(p) != ref["sha256"]:
                problems.append({"release": rid, "ref": label,
                                 "problem": "hash_mismatch",
                                 "path": str(p)})
    for act_p in sorted(rel_root.glob("*/active.json")):
        act = json.loads(act_p.read_text())
        if not Path(act.get("dir", "")).exists():
            problems.append({"release": act.get("release_id"),
                             "ref": "active", "problem": "dangling"})
    return {"schema": "iris-integrity.v1", "root": str(root),
            "n_releases_scanned":
                len(list(rel_root.glob("*/rel-r*/manifest.json"))),
            "problems": problems,
            "status": "ok" if not problems else "problems_found",
            "protected_paths": sorted(referenced),
            "caveat": "read-only check; nothing was deleted or repaired"}
