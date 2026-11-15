"""Phase-3 evaluation tests — small deterministic fixtures, no live path."""
from __future__ import annotations

import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
np = pytest.importorskip("numpy")
pytest.importorskip("sklearn")
pytest.importorskip("threadpoolctl")

from forecasts.v2 import fitting  # noqa: E402
from forecasts.v2.evaluation import (baselines, estimator, metrics, runner,  # noqa: E402
                                     spec as spec_mod, splits, store)

LAG = 72.0
TGT = "power_t2m"


def _records(n=1100, start=datetime(2021, 1, 1, tzinfo=UTC), base=299.0,
             lag=LAG, drop=None, source="nasa_power", variable=TGT):
    drop = drop or set()
    rows = []
    for i in range(n):
        s = start + timedelta(days=i)
        if i in drop:
            continue
        e = s + timedelta(days=1)
        rows.append({"variable": variable, "source_id": source,
                     "interval_start": s.isoformat(), "interval_end": e.isoformat(),
                     "value": base + 3.0 * np.sin(2 * np.pi * i / 365.25)
                     + 0.5 * np.sin(2 * np.pi * i / 7.0),
                     "available_at": (e + timedelta(hours=lag)).isoformat()})
    return rows


MANIFEST = {"dataset_id": "ds-eval01", "source_id": "nasa_power",
            "variables": [TGT], "content_sha256": "0" * 64,
            "spatial_mode": "point", "spatial_support": "point",
            "source_lag_hours": LAG}

SPEC = {"schema_version": "iris-eval-spec.v1",
        "contexts": [{"location_id": "loc-a", "dataset_id": "ds-eval01",
                      "target": TGT}],
        "horizons": [0, 1],
        "issue": {"cadence_days": 4},
        "development": {"folds": 3, "min_train_cases": 20,
                        "min_validation_cases": 8, "min_calibration_cases": 8,
                        "min_test_cases": 8},
        "final_holdout": {"fraction": 0.15},
        "estimator": {"max_iter": 20, "leaves_candidates": [3],
                      "min_samples_leaf": 10, "l2_regularization": 1.0},
        "limits": {"max_folds": 6, "max_candidates": 4, "max_cases": 400,
                   "max_fit_seconds": 300}}


def _fns(records, manifest=None):
    manifest = manifest or MANIFEST
    return (dict(manifest_fn=lambda loc, ds: manifest,
                 load_fn=lambda loc, ds: records,
                 resolve_fn=lambda loc: {"id": loc, "kind": "point"}))


def _spec(**kw):
    out = json.loads(json.dumps(SPEC))
    for k, v in kw.items():
        out[k] = v
    return out


# ---- 1. chronology / purge / delayed records -------------------------------
def test_unavailable_labels_purged_from_training():
    hist = fitting.History(_records(n=40), TGT, "nasa_power", LAG)
    issue = hist.rows[20]["start"]
    inputs = hist.inputs(issue)
    assert all(r["available"] <= issue for r in inputs)
    cases = [{"issue": r["start"].isoformat(),
              "label_available": r["available"].isoformat(),
              "window_end": r["end"].isoformat()}
             for r in hist.rows]
    parts = splits.inner_split(cases, SPEC["development"])
    boundary = parts["boundaries"]["train_end"]
    assert all(c["label_available"] < boundary for c in parts["train"])
    # a label published after the boundary cannot enter train
    late = max(c["label_available"] for c in cases
               if c["issue"] < boundary and c["label_available"] >= boundary)
    assert all(c["label_available"] != late for c in parts["train"])


def test_issue_schedule_is_calendar_bounded_not_indexed():
    hist = fitting.History(_records(n=60, drop={10, 11}), TGT, "nasa_power", LAG)
    cases, _ = splits.cases(hist, MANIFEST, [0], {"cadence_days": 1},
                            datetime(2030, 1, 1, tzinfo=UTC))
    for c in cases:
        s, e = fitting.window(c["issue"], 0, TGT)
        assert c["window_start"] == s.isoformat() and c["window_end"] == e.isoformat()


# ---- 2. perturbing the future cannot change the past ------------------------
def test_future_perturbation_does_not_change_features_or_predictions():
    recs_a = _records(n=400)
    hist_a = fitting.History(recs_a, TGT, "nasa_power", LAG)
    issue = hist_a.rows[200]["start"]
    x_a = hist_a.feature(issue, 0)
    recs_b = recs_a + [{"variable": TGT, "source_id": "nasa_power",
                        "interval_start": "2031-01-01T00:00:00+00:00",
                        "interval_end": "2031-01-02T00:00:00+00:00",
                        "value": 999.0,
                        "available_at": "2031-01-05T00:00:00+00:00"}]
    hist_b = fitting.History(recs_b, TGT, "nasa_power", LAG)
    assert hist_b.feature(issue, 0) == x_a
    # a revised value inside the issue's input window changes the feature;
    # revisions outside it cannot
    cutoff = issue - timedelta(days=10)
    tampered = [dict(r, value=-50.0) if cutoff <= fitting.stamp(
                    r["interval_start"]) < issue else r for r in recs_a]
    hist_t = fitting.History(tampered, TGT, "nasa_power", LAG)
    assert hist_t.feature(issue, 0) != x_a  # change is visible, not hidden
    # age policy derives from declared constants: identical under perturbation
    dev = [{"input_age_days": 5.0}]
    assert (runner._age_policy(_spec(), hist_a, LAG, dev)
            == runner._age_policy(_spec(), hist_t, LAG, dev))


# ---- 3. partition purity ----------------------------------------------------
def test_validation_and_calibration_never_train_the_estimator():
    recs = _records(n=700)
    hist = fitting.History(recs, TGT, "nasa_power", LAG)
    cases, _ = splits.cases(hist, MANIFEST, [0], {"cadence_days": 2},
                            datetime(2023, 1, 1, tzinfo=UTC))
    parts = splits.inner_split(cases, SPEC["development"])
    fitted = estimator.select_and_fit(parts["train"], parts["validation"],
                                      SPEC["estimator"], 42, SPEC["limits"])
    assert fitted["n_fitting"] == len(parts["train"]) + len(parts["validation"])
    cal_issues = {c["issue"] for c in parts["calibration"]}
    fit_issues = {c["issue"] for c in parts["train"] + parts["validation"]}
    assert not cal_issues & fit_issues


# ---- 4. holdout isolation + exposure status ---------------------------------
def test_development_run_never_scores_holdout_and_final_records_exposure(tmp_path):
    rep = runner.run(_spec(), store_dir=str(tmp_path), **_fns(_records()))
    assert rep["assessment_mode"] == "development"
    assert rep["final_holdout"]["status"] == "reserved_not_scored"
    assert rep["final_holdout"]["exposure"] == "protocol_reserved"
    dev_issues = [datetime.fromisoformat(r["issue"]) for c in rep["contexts"]
                  for f in c["folds"] for r in f.get("case_rows", [])]
    ctx = rep["contexts"][0]
    assert ctx["holdout_cases_reserved"] > 0
    final = runner.run_final_assessment(_spec(), store_dir=str(tmp_path),
                                        **_fns(_records()))
    assert final["final_holdout"]["status"] == "assessed"
    assert final["final_holdout"]["exposure"] == "first_assessment"
    final2 = runner.run_final_assessment(_spec(), store_dir=str(tmp_path),
                                         **_fns(_records()))
    assert final2["final_holdout"]["exposure"] == "previously_evaluated"
    assert final2["final_holdout"]["prior_assessment_count"] == 1
    # every scored development issue strictly precedes the holdout boundary
    if dev_issues:
        assert max(dev_issues) < datetime.fromisoformat(
            final["assessments"][0]["holdout_start"])


# ---- 5. native windows / boundaries / missing periods -----------------------
def test_native_windows_leap_and_missing(tmp_path):
    # 16-day composite: a Dec-10 issue targets the short year-end window
    start, end = fitting.window("2023-12-10T12:00:00Z", 0, "modis_ndvi")
    assert end == datetime(2024, 1, 1, tzinfo=UTC) and (end - start).days == 13
    # leap day sits inside a normal 16-day window, not a fabricated one
    start, end = fitting.window("2024-02-15T12:00:00Z", 0, "modis_ndvi")
    assert (end - start).days == 16 \
        and start <= datetime(2024, 2, 29, tzinfo=UTC) < end
    # dropped target windows are recorded exclusions, not fabricated values
    hist = fitting.History(_records(n=90, drop={30, 31}), TGT, "nasa_power", LAG)
    cases, excluded = splits.cases(hist, MANIFEST, [0], {"cadence_days": 1},
                                 datetime(2030, 1, 1, tzinfo=UTC))
    assert excluded["missing_target_window"] >= 2
    # tiny data -> insufficient_cases folds, not silent favorable shrink
    rep = runner.run(_spec(), store_dir=str(tmp_path),
                     **_fns(_records(n=120)))
    assert rep["walk_forward_fold_count"] < rep["walk_forward_folds_planned"]
    assert rep["contexts"][0]["folds"] and any(
        f["status"] == "insufficient_cases" for f in rep["contexts"][0]["folds"])


# ---- 6. metric identities on known examples ---------------------------------
def test_metrics_on_known_examples():
    y = np.array([1.0, 2.0, 3.0, 4.0])
    p = np.array([1.5, 1.5, 3.5, 3.5])
    assert metrics.mae(p, y) == pytest.approx(0.5)
    assert metrics.rmse(p, y) == pytest.approx(np.sqrt(0.25))
    assert metrics.bias(p, y) == pytest.approx(0.0)
    q = np.column_stack([p - 1.0, p, p + 1.0])
    assert metrics.coverage(q, y) == pytest.approx(1.0)
    assert metrics.mean_width(q) == pytest.approx(2.0)
    assert metrics.interval_score(q, y, alpha=0.2) == pytest.approx(2.0)
    pin = metrics.pinball(q, y)
    manual = np.mean(np.maximum(metrics.QUANTILES * (y[:, None] - q),
                                (metrics.QUANTILES - 1) * (y[:, None] - q)))
    assert pin == pytest.approx(float(manual))
    # outside the band pays 2/alpha per unit
    q_far = np.column_stack([p + 5, p + 6, p + 7])
    assert metrics.coverage(q_far, y) == 0.0
    assert metrics.interval_score(q_far, y, 0.2) > metrics.interval_score(q, y, 0.2)


# ---- 7. baseline alignment / edge cases --------------------------------------
def test_baselines_and_relative_metrics():
    hist = fitting.History(_records(n=800), TGT, "nasa_power", LAG)
    ref = [r for r in hist.rows[:400]]
    base = baselines.Baselines(hist, ref)
    issue = hist.rows[500]["start"]
    point, _ = base.predict("persistence", issue, 0)
    assert point == pytest.approx(max(
        (r for r in hist.rows if r["available"] <= issue),
        key=lambda r: r["end"])["value"])
    _, qs = base.predict("seasonal_climatology", issue, 0)
    assert qs[0] <= qs[1] <= qs[2]
    point_n, _ = base.predict("seasonal_naive", issue, 0)
    assert point_n is not None
    # no seasonal match -> honest None
    sparse = fitting.History(_records(n=120), TGT, "nasa_power", LAG)
    base_s = baselines.Baselines(sparse, sparse.rows[:60])
    start_i = sparse.rows[-1]["start"]
    assert base_s.predict("seasonal_naive", start_i, 0) == (None, None)
    # zero-error baseline -> undefined relative, never inf
    assert metrics.relative_mae(0.0, 0.0) is None
    assert metrics.relative_mae(2.0, 4.0) == pytest.approx(0.5)
    # identical-case alignment: exclusions keep case counts honest
    rows = [{"horizon": 0, "fold": 0, "season": "DJF", "actual": 1.0,
             "methods": ["persistence"],
             "predictions": {"persistence": {"point": 1.0, "q": [1, 1, 1]}}},
            {"horizon": 0, "fold": 0, "season": "DJF", "actual": 2.0,
             "methods": ["persistence"], "predictions": {"persistence": None}}]
    g = metrics.grouped(rows, "horizon")[0]
    assert g["methods"]["persistence"]["n"] == 1
    assert g["methods"]["persistence"]["excluded"] == 1


# ---- 8. binding + evidence ---------------------------------------------------
def test_binding_and_evidence(tmp_path):
    with pytest.raises(ValueError, match="does not contain"):
        runner.run(_spec(contexts=[{"location_id": "loc-a",
                                    "dataset_id": "ds-eval01",
                                    "target": "merra2_t2m"}]),
                   store_dir=str(tmp_path), **_fns(_records()))
    with pytest.raises(ValueError, match="source"):
        runner.run(_spec(contexts=[{"location_id": "loc-a",
                                    "dataset_id": "ds-eval01",
                                    "target": TGT, "source_id": "merra2"}]),
                   store_dir=str(tmp_path), **_fns(_records()))
    area = dict(MANIFEST, spatial_mode="area_mean",
                spatial_support="area_mean",
                aggregation={"policy": "coslat_weighted_mean_v1"})
    rep = runner.run(_spec(), store_dir=str(tmp_path),
                     **_fns(_records(n=150), manifest=area))
    assert rep["contexts"][0]["spatial_mode"] == "area_mean"
    assert rep["contexts"][0]["aggregation"]["policy"] == "coslat_weighted_mean_v1"
    hist = fitting.History(_records(n=30), TGT, "nasa_power", LAG)
    assert splits.evidence(hist.rows[0], LAG) == "estimated_availability"
    v = dict(hist.rows[0], vintage_at="2021-01-03T00:00:00+00:00")
    assert splits.evidence(v, LAG) == "verified_vintage"
    bare = {k: v2 for k, v2 in hist.rows[0].items() if k != "available_at"}
    assert splits.evidence(bare, 0) == "unknown"
    rep_c = rep["contexts"][0]
    assert "estimated_availability" in rep_c["availability_evidence"]


# ---- 9. fold counts / determinism / artifacts --------------------------------
def test_determinism_fingerprint_and_artifacts(tmp_path):
    rep1 = runner.run(_spec(), store_dir=str(tmp_path), **_fns(_records()))
    rep2 = runner.run(_spec(), store_dir=str(tmp_path), **_fns(_records()))
    fp = spec_mod.fingerprint(spec_mod.validate(_spec()), runner.PROTOCOL_VERSION)
    r1 = json.loads((tmp_path / f"eval-{fp[:12]}-dev-r1" / "report.json").read_text())
    r2 = json.loads((tmp_path / f"eval-{fp[:12]}-dev-r2" / "report.json").read_text())
    # deterministic apart from the timestamp
    assert {k: v for k, v in r1.items() if k != "generated_at"} == \
           {k: v for k, v in r2.items() if k != "generated_at"}
    assert rep1["walk_forward_fold_count"] == 3
    # old artifacts stay immutable: a third run must not touch r1
    before = (tmp_path / f"eval-{fp[:12]}-dev-r1" / "report.json").read_text()
    runner.run(_spec(), store_dir=str(tmp_path), **_fns(_records()))
    assert (tmp_path / f"eval-{fp[:12]}-dev-r1" / "report.json").read_text() == before
    spec_path = tmp_path / f"eval-{fp[:12]}-dev-r1" / "spec.json"
    assert spec_path.exists()
    preds = tmp_path / f"eval-{fp[:12]}-dev-r1" / "predictions.jsonl"
    assert preds.exists() and preds.read_text().strip()


def test_spec_validation_rejects_impossible_configs():
    with pytest.raises(ValueError, match="folds"):
        spec_mod.validate(_spec(development={"folds": 9}))
    with pytest.raises(ValueError, match="fraction"):
        spec_mod.validate(_spec(final_holdout={"fraction": 0.9}))
    with pytest.raises(ValueError, match="ds-"):
        spec_mod.validate(_spec(contexts=[{"location_id": "l",
                                           "dataset_id": "nope",
                                           "target": TGT}]))
    with pytest.raises(ValueError, match="registered target"):
        spec_mod.validate(_spec(contexts=[{"location_id": "l",
                                           "dataset_id": "ds-x",
                                           "target": "bogus"}]))


# ---- 10. bounded end-to-end CLI ----------------------------------------------
def test_cli_end_to_end(tmp_path):
    from forecasts.v2.evaluation import __main__ as cli
    spec_path = tmp_path / "spec.json"
    spec_path.write_text(json.dumps(_spec()))
    import forecasts.v2.datasets as dsets
    import forecasts.v2.locations as locs
    orig_m, orig_l, orig_r = dsets.manifest, dsets.load, locs.resolve
    dsets.manifest = lambda loc, ds: MANIFEST
    dsets.load = lambda loc, ds: _records()
    locs.resolve = lambda loc: {"id": loc, "kind": "point"}
    try:
        rc = cli.main(["--config", str(spec_path), "--store", str(tmp_path)])
    finally:
        dsets.manifest, dsets.load, locs.resolve = orig_m, orig_l, orig_r
    assert rc == 0
    reports = list(tmp_path.glob("eval-*-dev-r1/report.json"))
    assert reports, "no report artifact written"
    rep = json.loads(reports[0].read_text())
    assert rep["state"] in ("complete", "partial")
    assert rep["walk_forward_fold_count"] >= 1
    assert rep["final_holdout"]["status"] == "reserved_not_scored"
    # the live model registry is untouched
    from forecasts.v2 import training
    assert not any(training.MODELS_ROOT.glob("*eval*")) if training.MODELS_ROOT.exists() else True
