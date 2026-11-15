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
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from pathlib import Path

from ..store import PATH as STORE_PATH
from . import features, qa
from .datasets import ROOT as DATASETS_ROOT, load as load_dataset, manifest
from .schemas import ModelCard

MODELS_ROOT = Path(STORE_PATH).parent / "v2" / "models"
FEATURE_COLUMNS = [f"precip_lag_{d}d" for d in features.LAGS_DAYS] + [
    f"precip_lag_{d}d_missing" for d in features.LAGS_DAYS] + [
    f"precip_trail_{s}d_mean" for s in features.TRAIL_DAYS] + [
    f"precip_trail_{s}d_cover" for s in features.TRAIL_DAYS] + [
    f"precip_wetfreq_{s}d" for s in features.TRAIL_DAYS] + [
    "dry_spell", "sin_doy", "cos_doy"]

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
                 lag_hours: float) -> tuple[list[dict], list[float]]:
    """Feature rows + complete-window targets for one horizon."""
    schema_guard(FEATURE_COLUMNS)
    hist = [qa.HistoricalRecord(**{k: v for k, v in r.items()
                                   if k in qa.HistoricalRecord.__dataclass_fields__})
            for r in records]
    rows, targets = [], []
    for d in issue_dates:
        feat = features.build_features(hist, d + "T06:00:00+00:00", horizon, lag_hours)
        if feat is None:
            continue
        _, _, t = features.target_sum(hist, d + "T06:00:00+00:00", horizon)
        if t is None:
            continue
        rows.append(feat)
        targets.append(t)
    return rows, targets


def train(location_id: str, dataset_id: str, horizon: int,
          *, lag_hours: float, train_years: int = 5) -> dict:
    """Full pipeline for one horizon. Returns a persisted ModelCard."""
    records = load_dataset(location_id, dataset_id)
    if records is None:
        raise ValueError(f"Unknown dataset {dataset_id} for {location_id}")
    days = sorted({r["interval_start"][:10] for r in records
                   if str(r["variable"]).startswith("precip")})
    if not days:
        raise ValueError("Dataset contains no precipitation records.")
    first, last = days[0], days[-1]
    span = (datetime.fromisoformat(last) - datetime.fromisoformat(first)).days
    # Issue dates: daily origins across the dataset, last horizons trimmed.
    issue_dates = []
    d = datetime.fromisoformat(first) + timedelta(days=92)  # warmup for lags
    end_d = datetime.fromisoformat(last) - timedelta(hours=24 * (horizon + 1))
    while d <= end_d:
        issue_dates.append(d.date().isoformat())
        d += timedelta(days=1)
    rows, targets = build_matrix(records, issue_dates, horizon, lag_hours)
    nonzero = sum(1 for t in targets if t > 0)
    gate = eligibility(len(days), span, nonzero)
    card = ModelCard(model_id=f"m-{hashlib.sha256((dataset_id + str(horizon)).encode()).hexdigest()[:14]}-h{horizon}",
                     location_id=location_id, horizon_index=horizon,
                     dataset_id=dataset_id,
                     trained_at=datetime.now(UTC).isoformat())
    if not gate["eligible"]:
        card.state, card.eligibility_reasons = "rejected", gate["reasons"]
        _persist(card, None)
        return asdict(card)

    # Chronological development folds: ~yearly boundaries, embargo built in.
    boundaries = []
    y = int(first[:4])
    while f"{y}-01-01" <= last:
        boundaries.append(f"{y}-01-01")
        y += 1
    boundaries.append(last)
    fold_specs = features.folds([r["issue_ts"][:10] for r in rows], boundaries)
    if len(fold_specs) < 2:
        card.state = "rejected"
        card.eligibility_reasons = ["insufficient chronological folds for development evaluation"]
        _persist(card, None)
        return asdict(card)

    try:
        from sklearn.ensemble import HistGradientBoostingRegressor
    except ImportError:
        card.state = "candidate"
        card.eligibility_reasons = [
            "gates passed but sklearn is not installed in this environment — "
            "candidate recorded, training deferred"]
        _persist(card, None)
        return asdict(card)

    # Evaluate ML vs strongest baseline per fold.
    hist = [qa.HistoricalRecord(**{k: v for k, v in r.items()
                                   if k in qa.HistoricalRecord.__dataclass_fields__})
            for r in records]
    fold_metrics, model_preds, clim_preds, pers_preds, acts = [], [], [], [], []
    for fs in fold_specs:
        train_idx = [i for i, r in enumerate(rows) if r["issue_ts"][:10] in set(fs["train"])]
        test_idx = [i for i, r in enumerate(rows) if r["issue_ts"][:10] in set(fs["test"])]
        if not train_idx or not test_idx:
            continue
        import numpy as np
        Xtr = np.array([[r.get(c) for c in FEATURE_COLUMNS] for r in
                        (rows[i] for i in train_idx)], dtype=float)
        ytr = np.array([targets[i] for i in train_idx])
        Xte = np.array([[r.get(c) for c in FEATURE_COLUMNS] for r in
                        (rows[i] for i in test_idx)], dtype=float)
        m = HistGradientBoostingRegressor(loss="squared_error", max_iter=200,
                                        early_stopping=False, random_state=42)
        m.fit(Xtr, ytr)
        model_preds.extend(float(v) for v in m.predict(Xte))
        acts.extend(float(targets[i]) for i in test_idx)
        tyears = sorted({int(d[:4]) for d in fs["train"]})
        for i in test_idx:
            issue = rows[i]["issue_ts"]
            clim_preds.append(features.seasonal_climatology(hist, issue, tyears, lag_hours))
            pers_preds.append(features.persistence(hist, issue, lag_hours))
    em = features.evaluate(model_preds, acts)
    ec = features.evaluate(clim_preds, acts)
    ep = features.evaluate(pers_preds, acts)
    best_baseline = min((m for m in (ec, ep) if m.get("n")), key=lambda m: m["mae"], default={"mae": None})
    skill = (1 - em["mae"] / best_baseline["mae"]) if em.get("n") and best_baseline.get("mae") else None
    card.metrics = {"model_mae": em.get("mae"), "baseline_mae": best_baseline.get("mae"),
                    "skill_vs_best_baseline": skill, "folds": len(fold_specs), "n_eval": em.get("n")}
    card.eligibility_reasons = [] if (skill is not None and skill > 0) else [
        "model did not beat the strongest baseline on development folds"]
    card.state = "eligible" if not card.eligibility_reasons else "rejected"

    if card.state == "eligible":
        import numpy as np
        X = np.array([[r.get(c) for c in FEATURE_COLUMNS] for r in rows], dtype=float)
        y = np.array(targets)
        models = {}
        for name, loss in (("median", "squared_error"),
                           ("q10", "quantile"), ("q90", "quantile")):
            kw = {"max_iter": 300, "early_stopping": False, "random_state": 42}
            if loss == "quantile":
                kw["loss"] = "quantile"
                kw["quantile"] = 0.1 if name == "q10" else 0.9
            mm = HistGradientBoostingRegressor(**kw)
            mm.fit(X, y)
            models[name] = mm
        blob = pickle.dumps({"feature_columns": FEATURE_COLUMNS, "horizon": horizon,
                             "models": models, "dataset_id": dataset_id,
                             "lag_hours": lag_hours})
        model_hash = hashlib.sha256(blob).hexdigest()
        card.dataset_hash = (manifest(location_id, dataset_id) or {}).get("content_sha256", "")
        card.metrics["model_sha256"] = model_hash
    _persist(card, blob if card.state == "eligible" else None)
    return asdict(card)


def _persist(card: ModelCard, blob: bytes | None) -> None:
    mdir = MODELS_ROOT / card.location_id / card.model_id
    mdir.mkdir(parents=True, exist_ok=True)
    if blob is not None:
        (mdir / "model.pkl").write_bytes(blob)
    (mdir / "card.json").write_text(json.dumps(asdict(card), indent=1))
    registry_p = MODELS_ROOT / card.location_id / "registry.json"
    registry = json.loads(registry_p.read_text()) if registry_p.exists() else {"models": {}}
    registry["models"][card.model_id] = {
        "sha256": card.metrics.get("model_sha256"), "state": card.state,
        "dataset_id": card.dataset_id, "horizon_index": card.horizon_index}
    registry_p.write_text(json.dumps(registry, indent=1))


def list_models(location_id: str) -> list[dict]:
    base = MODELS_ROOT / location_id
    if not base.exists():
        return []
    out = []
    for c in sorted(base.glob("*/card.json")):
        try:
            out.append(json.loads(c.read_text()))
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
    blob = (mdir / "model.pkl").read_bytes()
    if hashlib.sha256(blob).hexdigest() != entry["sha256"]:
        return None  # hash mismatch — never load untrusted artifacts
    return {"bundle": pickle.loads(blob), "entry": entry}
