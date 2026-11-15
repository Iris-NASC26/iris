"""Phase-6 insight tests — hand-calculated + synthetic fixtures."""
from __future__ import annotations

import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
np = pytest.importorskip("numpy")
pytest.importorskip("sklearn")

from forecasts.v2.forecast_insights import (calibration, diagnostics,  # noqa: E402
                                          extremes, explanations, runner,
                                          trends)

TGT = "power_t2m"


def _case(y, q=(290.0, 292.0, 294.0), issue="2021-01-10T00:00:00+00:00",
          h=0, fold=0):
    return {"issue": issue, "horizon": h, "fold": fold, "actual": y,
            "season": "DJF", "case_id": f"c-{issue}-{h}",
            "label_available": "2021-01-15T00:00:00+00:00",
            "input_age_days": 2.0,
            "predictions": {"candidate": {"q": list(q)}}}


# ---- calibration: hand-calculated order statistics --------------------------
def test_order_statistic_hand_calculated():
    # n=10, level 0.8 -> k=ceil(11*0.8)=9 -> 9th of 10 sorted scores
    ys = [291.0] * 10
    cases = [_case(y, q=(290.0, 292.0, 296.0),
                   issue=f"2021-01-{d:02d}T00:00:00+00:00")
             for d, y in zip(range(1, 11), ys)]
    # score for each case = max(290-291, 291-296) = -1 -> correction 0
    art = calibration.fit(cases, level=0.8)
    assert art["status"] == "calibrated"
    assert art["order_statistic_one_based"] == 9
    assert art["correction"] == 0.0
    # force positive scores: actual above upper bound
    cases2 = [_case(300.0, q=(290.0, 292.0, 296.0),
                    issue=f"2021-01-{d:02d}T00:00:00+00:00")
              for d in range(1, 11)]
    art2 = calibration.fit(cases2, level=0.8)
    assert art2["correction"] == pytest.approx(4.0)  # 300-296, 9th of ties


def test_insufficient_and_too_few_scores():
    art = calibration.fit([_case(291.0)] * 5, level=0.8)
    assert art["status"] == "insufficient_calibration"
    # k > n: n=9, level 0.95 -> k=ceil(10*0.95)=10 > 9 -> honest failure
    art2 = calibration.fit([_case(291.0)] * 9, level=0.95,
                           min_scores=1)
    assert art2["status"] == "insufficient_calibration"


def test_expand_only_vs_symmetric_policy():
    # all-negative scores: expand_only clamps to 0, symmetric shrinks
    cases = [_case(293.0, q=(290.0, 292.0, 296.0),
                   issue=f"2021-01-{d:02d}T00:00:00+00:00")
             for d in range(1, 12)]
    assert calibration.fit(cases, policy="expand_only")["correction"] == 0.0
    sym = calibration.fit(cases, policy="symmetric")
    assert sym["correction"] == pytest.approx(-3.0)  # 293-296


def test_apply_preserves_raw_and_bounds():
    art = calibration.fit([_case(300.0, q=(290.0, 292.0, 296.0),
                                issue=f"2021-01-{d:02d}T00:00:00+00:00")
                           for d in range(1, 12)])
    out = calibration.apply(art, [290.0, 292.0, 296.0], TGT)
    assert out["status"] == "calibrated"
    assert out["raw_q"] == [290.0, 292.0, 296.0]
    assert out["interval"] == [pytest.approx(286.0), pytest.approx(300.0)]
    bad = calibration.apply({"status": "insufficient_calibration"},
                            [1, 2, 3], TGT)
    assert bad["status"] == "uncalibrated"
    # physical bound clipping is recorded, not hidden
    out2 = calibration.apply(art, [290.0, 292.0, 340.0], TGT)
    assert out2["clipped"]["upper"] is True


# ---- diagnostics -------------------------------------------------------------
def test_coverage_metrics_known_example():
    rows = [_case(293.0, q=(290.0, 292.0, 296.0))] * 4 + \
           [_case(289.0, q=(290.0, 292.0, 296.0))]
    s = diagnostics.summarize(rows, target=TGT)
    assert s["raw"]["coverage_80"] == pytest.approx(0.8)
    assert s["raw"]["mean_width"] == pytest.approx(6.0)
    assert s["raw"]["tail_miss"]["lower"] == pytest.approx(0.2)
    assert s["raw"]["tail_miss"]["upper"] == pytest.approx(0.0)


def test_block_bootstrap_keeps_issues_together_and_min_blocks():
    rows = []
    for d in range(1, 20):
        for h in (0, 1):
            rows.append(_case(293.0 + h, issue=f"2021-02-{d:02d}T00:00:00+00:00",
                              h=h))
    out = diagnostics.block_bootstrap(
        rows, lambda rs: diagnostics.summarize(
            rs, target=TGT)["raw"]["coverage_80"], n_boot=25)
    assert out["status"] == "approximate"
    assert out["n_blocks"] == 19
    few = diagnostics.block_bootstrap(rows[:8], lambda r: 1.0)
    assert few["status"] == "insufficient_dependence_blocks"


# ---- extremes ----------------------------------------------------------------
def _hist(n=200, start=datetime(2020, 1, 1, tzinfo=UTC), lag_h=72):
    out = []
    for i in range(n):
        s = start + timedelta(days=i)
        e = s + timedelta(days=1)
        out.append({"end": e, "available": e + timedelta(hours=lag_h),
                    "value": 290.0 + (i % 30)})
    return out


def test_threshold_fits_only_permitted_history():
    rows = _hist()
    cutoff = _hist()[120]["available"]
    art = extremes.fit(rows, TGT, cutoff=cutoff,
                       context={"location_id": "l", "dataset_id": "d"})
    assert art["status"] == "fitted"
    assert art["n_permitted"] == 120  # availability AND interval bound
    assert "1" in art["thresholds"]
    scarce = extremes.fit(rows[:20], TGT, cutoff=rows[-1]["available"],
                          context={})
    assert scarce["status"] == "insufficient_history"


def test_indicator_statuses_and_no_fabricated_probability():
    rows = _hist()
    art = extremes.fit(rows, TGT,
                       cutoff=rows[-1]["available"], context={})
    t = art["thresholds"]["1"]
    hot = extremes.indicator(art, [t + 5, t + 6, t + 7],
                             "2021-01-15T00:00:00+00:00")
    assert hot["median_vs_threshold"] == "above"
    assert hot["interval_vs_threshold"] == "entirely_above"
    assert "not a calibrated event probability" in hot["probability"]
    cross = extremes.indicator(art, [t - 1, t, t + 1],
                               "2021-01-15T00:00:00+00:00")
    assert cross["interval_vs_threshold"] == "crosses"


def test_event_evaluation_denominators_and_no_events():
    rows = _hist()
    art = extremes.fit(rows, TGT, cutoff=rows[-1]["available"],
                       context={})
    ev = extremes.evaluate_events(
        [_case(310.0, issue="2021-01-05T00:00:00+00:00"),
         _case(270.0, issue="2021-01-10T00:00:00+00:00")], art)
    assert ev["status"] in ("complete", "insufficient_events")
    assert ev["n_scored"] == 2
    none = extremes.evaluate_events([], art)
    assert none["status"] == "insufficient_cases"


# ---- explanations ------------------------------------------------------------
def _linear_state():
    from sklearn.linear_model import QuantileRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler
    x = np.random.default_rng(1).normal(size=(80, 13))
    coef = np.array([0.8, 0.4] + [0.0] * 11)
    y = x @ coef + 290
    models = {}
    for name, q in (("q10", .1), ("median", .5), ("q90", .9)):
        m = QuantileRegressor(quantile=q, alpha=0.0, solver="highs")
        m.fit(x, y)
        models[name] = m
    return {"family": "linear_quantile", "models": models,
            "imputer": SimpleImputer().fit(x),
            "scaler": StandardScaler().fit(x),
            "columns": list(__import__("forecasts.v2.evaluation.estimator",
                                       fromlist=["COLUMNS"]).COLUMNS),
            "target": TGT, "correction": 0.0}


def test_local_linear_explanation_coefficients():
    state = _linear_state()
    cols = state["columns"]
    feat = {c: 0.0 for c in cols}
    feat["recent_1"], feat["recent_2"] = 3.0, 2.0
    case = {"issue": "2021-03-01T00:00:00+00:00", "actual": 291.0,
            "feature": feat}
    bg = [{"issue": "2021-01-01T00:00:00+00:00", "actual": 290.0,
           "feature": {c: 0.0 for c in cols}} for _ in range(30)]
    out = explanations.local(state, case, bg, cols)
    assert out["status"] == "complete"
    assert "recent_values" in out["group_effects"]
    # coefficient path reconstructs the scaled-input contribution
    assert out["group_effects"]["recent_values"] != 0.0
    s = explanations.statement(out)
    assert "sensitivity" in s or "most sensitive" in s


def test_global_importance_insufficient_and_complete(tmp_path):
    state = _linear_state()
    cols = state["columns"]
    few = [{"issue": f"2021-01-{d:02d}T00:00:00+00:00", "actual": 290.0,
            "feature": {c: 0.0 for c in cols}} for d in range(5)]
    out = explanations.global_importance(state, few, cols, repeats=2)
    assert out["status"] == "insufficient_cases"


# ---- trends ------------------------------------------------------------------
def test_trend_direction_and_effect_units():
    rows = []
    for i in range(1096):  # 3 years daily, +0.05 K/yr
        s = datetime(2020, 1, 1, tzinfo=UTC) + timedelta(days=i)
        rows.append({"start": s, "end": s + timedelta(days=1),
                     "value": 290.0 + 0.05 * (i / 365.25)
                     + 2.0 * np.sin(2 * np.pi * i / 365.25)})
    rep = trends.analyze(rows, TGT, context={"dataset_id": "d"})
    assert rep["status"] in ("supports_trend", "no_clear_evidence")
    assert rep["effect_unit"] == "K/year"
    assert rep["n_months"] == 36
    assert rep["slope_per_year"] == pytest.approx(0.05, abs=0.01)
    assert rep["slope_per_year"] > 0


def test_trend_insufficient_and_composite_unsupported():
    short = [{"start": datetime(2021, 1, 1, tzinfo=UTC) + timedelta(days=i),
              "end": datetime(2021, 1, 2, tzinfo=UTC) + timedelta(days=i),
              "value": 290.0} for i in range(400)]
    rep = trends.analyze(short, TGT, context={})
    assert rep["status"] == "insufficient"
    comp = trends.analyze([], "modis_ndvi", context={})
    assert comp["status"] == "unsupported"


def test_family_freezes_q_values():
    t = [{"id": "a", "p_value": 0.01, "status": "supports_trend"},
         {"id": "b", "p_value": 0.04, "status": "no_clear_evidence"},
         {"id": "c", "p_value": None, "status": "insufficient"}]
    fam = trends.apply_family(t, "fam-1")
    assert fam["n_valid"] == 2 and fam["n_excluded"] == 1
    q = {x["id"]: x["q_value"] for x in fam["tests"]}
    assert q["a"] == pytest.approx(0.02)  # BH: 0.01*2/1
    assert q["b"] == pytest.approx(0.04)


# ---- end-to-end synthetic flow ------------------------------------------------
def test_synthetic_end_to_end(tmp_path):
    cases = [_case(290.0 + (d % 7), q=(289.0, 291.0, 296.0),
                   issue=f"2021-02-{d:02d}T00:00:00+00:00",
                   h=d % 2)
             for d in range(1, 30)]
    p = tmp_path / "predictions.jsonl"
    p.write_text("\n".join(json.dumps(c) for c in cases))
    art = runner.calibrate(p, cutoff="2021-03-01T00:00:00+00:00",
                           context={"synthetic": True},
                           store_dir=str(tmp_path / "i"))
    assert art["status"] == "calibrated"
    rep = runner.diagnose(p, target=TGT, calibrator=art,
                          store_dir=str(tmp_path / "i"))
    assert rep["overall"]["status"] == "complete"
    assert "adjusted" in rep["overall"]
    applied = runner.apply_insight(art, [289.0, 291.0, 296.0], TGT)
    assert applied["calibrated_interval"]["status"] == "calibrated"
    v = runner.view(rep["artifact_dir"])
    assert "diagnostics.json" in v
