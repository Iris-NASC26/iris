"""Versioned model-family adapter registry.

Each family knows its verified loader, column order, fitted
preprocessing and prediction contract. Unsupported optional
dependencies return an actionable capability state — never a silent
fallback or a startup failure.
"""
from __future__ import annotations

import json
from pathlib import Path

from ..model_selection import candidates, store as ms_store
from ..model_selection.candidates import dependency_status

SCHEMA = "iris-model-adapter.v1"


def capability(family: str) -> dict:
    deps = dependency_status()
    if family in ("hgb_incumbent", "hgb_tuned", "linear_quantile"):
        return {"family": family, "status": "supported"}
    if family == "lightgbm_quantile":
        if deps.get("lightgbm"):
            return {"family": family, "status": "supported"}
        return {"family": family, "status": "dependency_unavailable",
                "action": "install lightgbm to enable this family"}
    return {"family": family, "status": "unsupported_family",
            "action": "register an adapter before use"}


def load_state(model_ref: dict) -> dict:
    """Load a frozen candidate state via the Phase-5 verified loader —
    correct family, columns, preprocessing. `path` may point at a frozen
    selection dir containing spec.json + states."""
    cap = capability(model_ref.get("family", ""))
    if cap["status"] != "supported":
        return {**cap, "state": None}
    sel_dir = Path(model_ref["path"])
    spec, states = ms_store.load_frozen(str(sel_dir))
    ds = model_ref.get("dataset_id") or next(iter(states))
    return {**cap, "spec": spec, "state": states[ds],
            "dataset_id": ds}


def predict(loaded: dict, case: dict) -> dict:
    """Replay raw quantiles through the family's own predict path —
    no refit, no provider access."""
    if loaded.get("state") is None:
        return {"status": loaded.get("status", "unsupported_family"),
                "action": loaded.get("action")}
    q = candidates.replay_predict(loaded["state"], case)
    if q is None:
        return {"status": "insufficient_inputs"}
    return {"status": "ok", "q": q,
            "family": loaded["family"],
            "explained_output": "raw_model_quantiles"}
