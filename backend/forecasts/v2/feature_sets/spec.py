"""Versioned feature specification: frozen bindings in, fingerprint out."""
from __future__ import annotations

import hashlib
import json

from ..variables import VARIABLES

SCHEMA = "iris-feature-spec.v1"
PROFILES = ("legacy_v1", "target_history_v1", "drivers_v1")
MISSING_POLICIES = ("flag_and_keep", "require_complete")
DRIVER_ROLES = ("rainfall", "temperature", "humidity", "radiation",
                "wind", "evapotranspiration", "vegetation", "soil",
                "snow", "terrain", "other")
MAX_COLUMNS = 64

_DEFAULTS = {
    "profile": "target_history_v1",
    "windows_days": [7, 14, 30],
    "missing_policy": "flag_and_keep",
    "seed": 42,
    "drivers": [],
}


def _fail(msg: str) -> None:
    raise ValueError(f"Invalid feature spec: {msg}")


def validate(raw: dict) -> dict:
    if not isinstance(raw, dict):
        _fail("spec must be a JSON object")
    if raw.get("schema_version", SCHEMA) != SCHEMA:
        _fail(f"schema_version must be {SCHEMA}")
    spec = {**_DEFAULTS, **{k: v for k, v in raw.items() if v is not None}}
    if spec["profile"] not in PROFILES:
        _fail(f"profile must be one of {PROFILES}")
    loc = raw.get("location_id")
    if not isinstance(loc, str) or not loc:
        _fail("location_id is required")
    target = raw.get("target")
    if not isinstance(target, dict):
        _fail("target must be an object {variable, dataset_id}")
    var, ds = target.get("variable"), target.get("dataset_id")
    if var not in VARIABLES:
        _fail(f"target.variable '{var}' is not a registered target")
    if not isinstance(ds, str) or not ds.startswith("ds-"):
        _fail("target.dataset_id must be an immutable ds-* revision")
    spec["target"] = {"variable": var, "dataset_id": ds}
    drivers = []
    for i, d in enumerate(spec.get("drivers") or []):
        if spec["profile"] == "legacy_v1":
            _fail("legacy_v1 profile takes no drivers")
        if not isinstance(d, dict):
            _fail(f"drivers[{i}] must be an object")
        role = d.get("role", "other")
        if role not in DRIVER_ROLES:
            _fail(f"drivers[{i}].role must be one of {DRIVER_ROLES}")
        dvar = d.get("variable")
        if dvar == var:
            _fail("a driver may not reuse the forecast target variable")
        dds = d.get("dataset_id")
        if not isinstance(dds, str) or not dds.startswith("ds-"):
            _fail(f"drivers[{i}].dataset_id must be an immutable ds-* revision")
        if dds == ds:
            _fail(f"drivers[{i}] duplicates the target dataset binding")
        drivers.append({"role": role, "variable": dvar,
                        "dataset_id": dds,
                        "source_id": d.get("source_id"),
                        "required": bool(d.get("required", False)),
                        "max_age_days": float(d.get("max_age_days", 45))})
    if len({(d["dataset_id"], d["variable"]) for d in drivers}) != len(drivers):
        _fail("duplicate driver bindings")
    if spec["profile"] != "drivers_v1" and drivers:
        _fail(f"drivers require the drivers_v1 profile, not {spec['profile']}")
    spec["drivers"] = drivers
    wins = spec["windows_days"]
    if (not isinstance(wins, list) or not wins
            or any(not isinstance(w, int) or w < 1 or w > 365 for w in wins)):
        _fail("windows_days must be integers 1..365")
    spec["windows_days"] = sorted(set(wins))
    if spec["missing_policy"] not in MISSING_POLICIES:
        _fail(f"missing_policy must be one of {MISSING_POLICIES}")
    spec["seed"] = int(spec["seed"])
    spec["schema_version"] = SCHEMA
    return spec


def fingerprint(spec: dict) -> str:
    from . import FEATURE_VERSION
    material = {"schema": SCHEMA, "features": FEATURE_VERSION, "spec": spec}
    blob = json.dumps(material, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(blob).hexdigest()
