"""Validated, serializable evaluation specification + stable fingerprint."""
from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime

from ..variables import VARIABLES

SCHEMA = "iris-eval-spec.v1"
BASELINE_CHOICES = ("persistence", "seasonal_climatology", "seasonal_naive")
EVIDENCE_LEVELS = ("verified_vintage", "estimated_availability", "unknown")

_DEFAULTS = {
    "seed": 42,
    "horizons": [0, 1, 2],
    "issue": {"cadence_days": 7, "max_cases_per_fold": 60},
    "development": {
        "folds": 3,
        "inner_train_fraction": 0.55,
        "inner_validation_fraction": 0.15,
        "inner_calibration_fraction": 0.15,
        "min_train_cases": 30,
        "min_validation_cases": 12,
        "min_calibration_cases": 12,
        "min_test_cases": 12,
        "embargo_days": 0,
    },
    "final_holdout": {"fraction": 0.15},
    "age_policy": {"basis": "source_declared"},
    "baselines": list(BASELINE_CHOICES),
    "estimator": {
        "max_iter": 120,
        "leaves_candidates": [3, 7],
        "min_samples_leaf": 15,
        "l2_regularization": 1.0,
    },
    "limits": {"max_folds": 6, "max_candidates": 4, "max_cases": 400,
               "max_fit_seconds": 300},
}


def _fail(msg: str) -> None:
    raise ValueError(f"Invalid evaluation spec: {msg}")


def _ts(value, field):
    try:
        d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        _fail(f"{field} must be an ISO-8601 timestamp")
    return d.astimezone(UTC) if d.tzinfo else d.replace(tzinfo=UTC)


def validate(raw: dict) -> dict:
    """Return a normalized spec or raise an actionable ValueError."""
    if not isinstance(raw, dict):
        _fail("spec must be a JSON object")
    if raw.get("schema_version", SCHEMA) != SCHEMA:
        _fail(f"schema_version must be {SCHEMA}")
    spec = {**_DEFAULTS, **{k: v for k, v in raw.items() if v is not None}}
    for section in ("issue", "development", "final_holdout", "age_policy",
                    "estimator", "limits"):
        merged = {**_DEFAULTS[section], **(raw.get(section) or {})}
        if not isinstance(merged, dict):
            _fail(f"{section} must be an object")
        spec[section] = merged
    contexts = raw.get("contexts")
    if not isinstance(contexts, list) or not contexts:
        _fail("contexts must list at least one dataset binding")
    out = []
    for i, ctx in enumerate(contexts):
        if not isinstance(ctx, dict):
            _fail(f"contexts[{i}] must be an object")
        loc, ds, target = ctx.get("location_id"), ctx.get("dataset_id"), ctx.get("target")
        if not isinstance(loc, str) or not loc:
            _fail(f"contexts[{i}].location_id is required")
        if not isinstance(ds, str) or not ds.startswith("ds-"):
            _fail(f"contexts[{i}].dataset_id must be an immutable ds-* revision")
        if target not in VARIABLES:
            _fail(f"contexts[{i}].target '{target}' is not a registered target")
        out.append({"location_id": loc, "dataset_id": ds, "target": target,
                    "source_id": ctx.get("source_id")})
    if len({c["dataset_id"] for c in out}) != len(out):
        _fail("duplicate dataset revisions in one spec")
    spec["contexts"] = out
    spec["seed"] = int(spec["seed"])
    horizons = spec["horizons"]
    if (not isinstance(horizons, list) or not horizons
            or any(not isinstance(h, int) or h < 0 or h > 5 for h in horizons)):
        _fail("horizons must be a non-empty list of native-period indexes 0..5")
    dev, issue, limits = spec["development"], spec["issue"], spec["limits"]
    folds = int(dev["folds"])
    if not 1 <= folds <= int(limits["max_folds"]):
        _fail(f"development.folds must be 1..{limits['max_folds']}")
    fracs = [float(dev[k]) for k in ("inner_train_fraction",
                                     "inner_validation_fraction",
                                     "inner_calibration_fraction")]
    if any(f <= 0 for f in fracs) or sum(fracs) >= 0.95:
        _fail("inner partition fractions must be positive and leave a test block")
    if int(issue["cadence_days"]) < 1:
        _fail("issue.cadence_days must be >= 1")
    for k in ("min_train_cases", "min_validation_cases",
              "min_calibration_cases", "min_test_cases"):
        if int(dev[k]) < 1:
            _fail(f"development.{k} must be >= 1")
    hold = spec["final_holdout"]
    if "start" in hold:
        _ts(hold["start"], "final_holdout.start")
    else:
        frac = float(hold.get("fraction", 0.15))
        if not 0 < frac < 0.5:
            _fail("final_holdout.fraction must be within (0, 0.5)")
    if spec["age_policy"].get("basis") not in ("source_declared", "development_p95"):
        _fail("age_policy.basis must be 'source_declared' or 'development_p95'")
    unknown_baselines = [b for b in spec["baselines"] if b not in BASELINE_CHOICES]
    if unknown_baselines or not spec["baselines"]:
        _fail(f"baselines must be chosen from {BASELINE_CHOICES}")
    if spec.get("availability_policy", "estimated_availability") not in EVIDENCE_LEVELS:
        _fail(f"availability_policy must be one of {EVIDENCE_LEVELS}")
    leaves = spec["estimator"]["leaves_candidates"]
    if (not isinstance(leaves, list) or not leaves
            or len(leaves) > int(limits["max_candidates"])):
        _fail(f"estimator.leaves_candidates must hold 1..{limits['max_candidates']} values")
    spec["schema_version"] = SCHEMA
    return spec


def fingerprint(spec: dict, code_version: str) -> str:
    """Content hash binding spec + engine version; excludes volatile fields."""
    material = {"schema": SCHEMA, "protocol": code_version, "spec": spec}
    blob = json.dumps(material, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(blob).hexdigest()
