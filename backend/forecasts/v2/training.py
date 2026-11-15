"""Chronological training + eligibility gates + model registry.

HistGradientBoostingRegressor (median + q10/q90 quantile losses), one direct
model per 24h window. Baselines are always evaluated on the same folds — a
model is only publishable when it beats the strongest applicable baseline.

sklearn/numpy are imported lazily inside train() so the module — and every
gate — remains importable and testable in minimal environments.
"""
from __future__ import annotations

import hashlib
import json
import pickle
import uuid
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from pathlib import Path

from ..store import PATH as STORE_PATH
from . import features, qa
from .datasets import ROOT as DATASETS_ROOT, load as load_dataset, manifest
from .schemas import ModelCard
from .variables import variable as variable_spec

MODELS_ROOT = Path(STORE_PATH).parent / "v2" / "models"
def feature_columns(variable: str) -> list[str]:
    if variable == "precip_24h":
        return [f"precip_lag_{d}d" for d in features.LAGS_DAYS] + [
            f"precip_lag_{d}d_missing" for d in features.LAGS_DAYS] + [
            f"precip_trail_{s}d_mean" for s in features.TRAIL_DAYS] + [
            f"precip_trail_{s}d_cover" for s in features.TRAIL_DAYS] + [
            f"precip_wetfreq_{s}d" for s in features.TRAIL_DAYS] + [
            "dry_spell", "sin_doy", "cos_doy"]
    return [f"val_lag_{p}p" for p in features.LAGS_PERIODS] + [
        f"val_lag_{p}p_missing" for p in features.LAGS_PERIODS] + [
        f"val_trail_{s}p_mean" for s in features.TRAIL_PERIODS] + [
        f"val_trail_{s}p_cover" for s in features.TRAIL_PERIODS] + [
        "sin_doy", "cos_doy", "step_days"]

# Columns that must never appear — archived provider forecast leakage.
FORBIDDEN_FEATURE_PREFIXES = ("provider_", "ensemble_", "forecast_", "member_")


def schema_guard(columns: list[str]) -> None:
    bad = [c for c in columns if c.lower().startswith(FORBIDDEN_FEATURE_PREFIXES)]
    if bad:
        raise ValueError(f"provider-forecast feature columns are prohibited: {bad}")


def eligibility(daily_days: int, span_days: int, nonzero_targets: int,
                *, min_days: int = 730, min_nonzero: int = 40) -> dict:
    reasons = []
    if daily_days < min_days:
        reasons.append(f"insufficient history: {daily_days} complete days < {min_days}")
    if nonzero_targets < min_nonzero:
        reasons.append(f"too few wet-target days: {nonzero_targets} < {min_nonzero}")
    seasons = min(12, span_days // 30)
    if seasons < 6:
        reasons.append("fewer than ~6 months of seasonal coverage")
    return {"eligible": not reasons, "reasons": reasons}


def build_matrix(records: list[dict], issue_dates: list[str], horizon: int,
                 lag_hours: float, variable: str = "precip_24h") -> tuple[list[dict], list[float]]:
    """Feature rows + complete-window targets for one horizon and target."""
    cols = feature_columns(variable)
    schema_guard(cols)
    hist = [qa.HistoricalRecord(**{k: v for k, v in r.items()
                                   if k in qa.HistoricalRecord.__dataclass_fields__})
            for r in records]
    rows, targets = [], []
    for d in issue_dates:
        feat = features.build_features(hist, d + "T06:00:00+00:00", horizon,
                                       lag_hours, variable)
        if feat is None:
            continue
        _, _, t = features.target_value(hist, d + "T06:00:00+00:00", horizon, variable)
        if t is None:
            continue
        rows.append(feat)
        targets.append(t)
    return rows, targets


def train(location_id: str, dataset_id: str, horizon: int,
          *, lag_hours: float, train_years: int = 5,
          variable: str = "precip_24h") -> dict:
    from .fitting import fit
    return fit(location_id, dataset_id, horizon, lag_hours, variable, _persist)


def _persist(card: ModelCard, blob: bytes | None) -> None:
    mdir = MODELS_ROOT / card.location_id / card.model_id
    mdir.mkdir(parents=True, exist_ok=True)
    if blob is not None:
        (mdir / "model.pkl").write_bytes(blob)
    _atomic_json(mdir / "card.json", asdict(card))
    registry_p = MODELS_ROOT / card.location_id / "registry.json"
    registry = json.loads(registry_p.read_text()) if registry_p.exists() else {"models": {}}
    registry["models"][card.model_id] = {
        "sha256": card.metrics.get("model_sha256"), "state": card.state,
        "dataset_id": card.dataset_id, "horizon_index": card.horizon_index,
        "target": card.metrics.get("target", "precip_24h")}
    _atomic_json(registry_p, registry)


def _atomic_json(path: Path, value):
    temp = path.with_suffix("." + uuid.uuid4().hex + ".tmp")
    temp.write_text(json.dumps(value, indent=1))
    temp.replace(path)


def list_models(location_id: str) -> list[dict]:
    base = MODELS_ROOT / location_id
    if not base.exists():
        return []
    registry_p = base / "registry.json"
    registry = json.loads(registry_p.read_text()).get("models", {}) if registry_p.exists() else {}
    out = []
    for c in sorted(base.glob("*/card.json")):
        try:
            card = json.loads(c.read_text())
            if card["model_id"] in registry:
                card["state"] = registry[card["model_id"]]["state"]
            out.append(card)
        except json.JSONDecodeError:
            continue
    return out


def load_verified(location_id: str, model_id: str) -> dict | None:
    """Load a model only when its stored bytes match the registry hash."""
    registry_p = MODELS_ROOT / location_id / "registry.json"
    mdir = MODELS_ROOT / location_id / model_id
    if not registry_p.exists() or not mdir.exists():
        return None
    registry = json.loads(registry_p.read_text())
    entry = registry["models"].get(model_id)
    if not entry or entry["state"] not in ("eligible", "active"):
        return None
    if not (mdir / "model.pkl").exists():
        return None
    blob = (mdir / "model.pkl").read_bytes()
    if hashlib.sha256(blob).hexdigest() != entry["sha256"]:
        return None  # hash mismatch — never load untrusted artifacts
    return {"bundle": pickle.loads(blob), "entry": entry}


def activate(location_id: str, model_id: str) -> dict:
    if not model_id.startswith("m-") or any(c in model_id for c in ("/", "\\", ".")):
        raise ValueError("Invalid model identifier.")
    registry_p = MODELS_ROOT / location_id / "registry.json"
    if not registry_p.exists():
        raise ValueError("No model registry for this location.")
    registry = json.loads(registry_p.read_text())
    entry = registry["models"].get(model_id)
    if not entry or entry["state"] not in ("eligible", "active") or not load_verified(location_id, model_id):
        raise ValueError("Only an eligible, hash-verified model can be activated.")
    for mid, other in registry["models"].items():
        if (mid != model_id and other["state"] == "active" and
                other["horizon_index"] == entry["horizon_index"] and
                other.get("target", "precip_24h") == entry.get("target", "precip_24h")):
            other["state"] = "retired"
    entry["state"] = "active"
    tmp = registry_p.with_suffix(".tmp")
    tmp.write_text(json.dumps(registry, indent=1))
    tmp.replace(registry_p)
    return {"model_id": model_id, "state": "active"}
