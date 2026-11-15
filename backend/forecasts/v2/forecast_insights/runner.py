"""Insight orchestration — all commands are development/retrospective;
nothing here reads the final holdout, retrains, or calls providers."""
from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from . import artifacts, calibration, diagnostics, extremes, explanations
from . import trends as trends_mod
from ..model_selection import store as ms_store
from ..variables import VARIABLES

ENGINE = "iris-insights-v1"


def load_cases(path) -> list:
    p = Path(path)
    if p.is_dir():
        p = p / "predictions.jsonl"
    rows = []
    for line in p.read_text().splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def calibrate(cases_path, *, level=0.8, policy="expand_only",
              cutoff: str, context: dict, store_dir=None) -> dict:
    """Fit a calibration artifact on permitted cases only."""
    rows = load_cases(cases_path)
    permitted = [r for r in rows
                 if str(r.get("label_available", "9999")) < cutoff]
    art = calibration.fit(permitted, level=level, policy=policy,
                          cutoff=cutoff, context=context)
    art["engine"] = ENGINE
    out = artifacts.allocate("calibrator", store_dir)
    artifacts.save(out, "calibrator.json", art)
    art["artifact_dir"] = str(out)
    return art


def diagnose(cases_path, *, target: str, calibrator=None, store_dir=None,
             boot_seed: int = 0) -> dict:
    """Coverage diagnostics on a frozen dev evaluation's case rows."""
    rows = load_cases(cases_path)
    adj_fn = None
    if calibrator is not None:
        if calibrator.get("status") != "calibrated":
            return {"engine": ENGINE, "status": "uncalibrated",
                    "reason": calibrator.get("reason")}
        c = float(calibrator["correction"])
        b = VARIABLES[target]

        def adj_fn(q):
            return np.array([max(b["min"], q[0] - c),
                             min(b["max"], q[2] + c)])
    rep = {"engine": ENGINE, "target": target,
           "generated_at": datetime.now(UTC).isoformat(),
           "calibration": ({"applied": True, "policy": calibrator["policy"],
                            "correction": calibrator["correction"]}
                           if calibrator else {"applied": False}),
           "overall": diagnostics.summarize(rows, target=target,
                                            adjusted=adj_fn),
           "breakdowns": diagnostics.breakdown(rows, target=target,
                                               adjusted=adj_fn),
           "bootstrap": {
               "coverage_80": diagnostics.block_bootstrap(
                   rows, lambda rs: diagnostics.summarize(
                       rs, target=target)["raw"].get("coverage_80"),
                   seed=boot_seed),
               "mae": diagnostics.block_bootstrap(
                   rows, lambda rs: diagnostics.summarize(
                       rs, target=target)["raw"].get("mae"),
                   seed=boot_seed + 1)},
           "caveats": ["Retrospective development metrics; the protected "
                       "holdout was not consulted.",
                       "Intervals are prediction intervals, not "
                       "confidence intervals for any fitted parameter."]}
    out = artifacts.allocate("diagnose", store_dir)
    artifacts.save(out, "diagnostics.json", rep)
    rep["artifact_dir"] = str(out)
    return rep


def extreme(rows_or_dataset, target: str, *, cutoff: str,
            context: dict, store_dir=None, rule_override=None) -> dict:
    """Fit a threshold artifact on permitted history."""
    cutoff_dt = datetime.fromisoformat(cutoff.replace("Z", "+00:00"))
    rows = (load_cases(rows_or_dataset)
            if str(rows_or_dataset).endswith("jsonl")
            else rows_or_dataset)
    norm = [{"end": r.get("interval_end", r.get("window_end", r["end"])),
             "available": r.get("available_at",
                                r.get("label_available", "1970")),
             "value": r.get("value")} for r in rows]
    art = extremes.fit(norm, target, cutoff=cutoff_dt, context=context,
                       rule_override=rule_override)
    out = artifacts.allocate("threshold", store_dir)
    artifacts.save(out, "threshold.json", art)
    art["artifact_dir"] = str(out)
    return art


def extreme_evaluate(threshold_art: dict, cases_path) -> dict:
    rows = load_cases(cases_path)
    return extremes.evaluate_events(rows, threshold_art)


def explain_global(selection_dir: str, dataset_id: str, cases_path,
                   columns, **kw) -> dict:
    spec, states = ms_store.load_frozen(selection_dir)
    state = states[dataset_id]
    rows = load_cases(cases_path)
    cols = columns or state["columns"]
    out = explanations.global_importance(state, rows, cols, **kw)
    out["candidate"] = {"family": state["family"],
                        "candidate_sha256": spec.get("candidate_sha256")}
    return out


def explain_local(selection_dir: str, dataset_id: str, cases_path,
                  *, case_index: int = -1, columns=None) -> dict:
    spec, states = ms_store.load_frozen(selection_dir)
    state = states[dataset_id]
    rows = load_cases(cases_path)
    cols = columns or state["columns"]
    case = rows[case_index]
    out = explanations.local(state, case, rows, cols)
    out["statement"] = explanations.statement(out)
    return out


def trend(records, target: str, *, context: dict, store_dir=None) -> dict:
    rep = trends_mod.analyze(records, target, context=context)
    rep["engine"] = ENGINE
    out = artifacts.allocate("trend", store_dir)
    artifacts.save(out, "trend.json", rep)
    rep["artifact_dir"] = str(out)
    return rep


def family(test_reports: list, family_id: str, store_dir=None) -> dict:
    rep = trends_mod.apply_family(test_reports, family_id)
    out = artifacts.allocate("family", store_dir)
    artifacts.save(out, "family.json", rep)
    rep["artifact_dir"] = str(out)
    return rep


def apply_insight(calibrator_art: dict, raw_q, target: str,
                  threshold_art=None, when=None) -> dict:
    """Apply saved calibration (+ optional threshold) to a frozen
    prediction — pure contract replay, no refit."""
    out = {"calibrated_interval": calibration.apply(
        calibrator_art, raw_q, target)}
    if threshold_art is not None and when is not None:
        out["extreme_indicator"] = extremes.indicator(
            threshold_art, out["calibrated_interval"].get("raw_q", raw_q),
            when)
    return out


def view(report_dir: str) -> dict:
    d = Path(report_dir)
    out = {}
    for f in sorted(d.glob("*.json")):
        out[f.name] = artifacts.load(f)
    return out
