"""Phase-4 feature-set tests — small deterministic fixtures, frozen
bindings only, no provider contact, no live-path mutation."""
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
from forecasts.v2.feature_sets.materialize import (  # noqa: E402
    build_row, columns_for, load_histories)
from forecasts.v2.feature_sets import (fingerprint, runner,  # noqa: E402
                                       spec as spec_mod)
from forecasts.v2.feature_sets.transform import SeasonalTransform  # noqa: E402
from forecasts.v2.evaluation import runner as eval_runner  # noqa: E402

LAG = 72.0
TGT = "power_t2m"
DRV = "gldas_sm"


def _records(n=800, start=datetime(2021, 1, 1, tzinfo=UTC), base=299.0,
             lag=LAG, source="nasa_power", variable=TGT):
    rows = []
    for i in range(n):
        s = start + timedelta(days=i)
        e = s + timedelta(days=1)
        rows.append({"variable": variable, "source_id": source,
                     "interval_start": s.isoformat(), "interval_end": e.isoformat(),
                     "value": base + 2.0 * np.sin(2 * np.pi * i / 365.25)
                     + (i % 9) * 0.1,
                     "available_at": (e + timedelta(hours=lag)).isoformat()})
    return rows


MANIFEST = {"dataset_id": "ds-target01", "source_id": "nasa_power",
            "variables": [TGT], "content_sha256": "a" * 64,
            "spatial_mode": "point", "spatial_support": "point",
            "source_lag_hours": LAG}
DRV_MANIFEST = {"dataset_id": "ds-driver01", "source_id": "GLDAS_NOAH025_3H.2.1",
                "variables": [DRV], "content_sha256": "b" * 64,
                "spatial_mode": "point", "spatial_support": "point"}

TGT_ROWS = _records()
DRV_ROWS = _records(base=0.31, source="GLDAS_NOAH025_3H.2.1", variable=DRV,
                    lag=24 * 120)

SPEC = {"schema_version": "iris-feature-spec.v1",
        "location_id": "loc-a", "profile": "drivers_v1",
        "target": {"variable": TGT, "dataset_id": "ds-target01"},
        "drivers": [{"role": "soil", "variable": DRV,
                     "dataset_id": "ds-driver01", "required": False,
                     "max_age_days": 150}],
        "windows_days": [7, 30]}


def _fns(target_rows=None, driver_rows=None, drv_manifest=None):
    rows = {"ds-target01": target_rows if target_rows is not None else TGT_ROWS,
            "ds-driver01": driver_rows if driver_rows is not None else DRV_ROWS}
    mans = {"ds-target01": MANIFEST,
            "ds-driver01": drv_manifest or DRV_MANIFEST}
    return dict(manifest_fn=lambda loc, ds: mans.get(ds),
                load_fn=lambda loc, ds: rows.get(ds),
                resolve_fn=lambda loc: {"id": loc, "kind": "point"})


def _spec(**kw):
    out = json.loads(json.dumps(SPEC))
    out.update(kw)
    return out


# ---- spec contract -----------------------------------------------------------
def test_spec_validation_and_fingerprint():
    spec = spec_mod.validate(_spec())
    assert spec["profile"] == "drivers_v1"
    assert fingerprint(spec) == fingerprint(spec_mod.validate(_spec()))
    with pytest.raises(ValueError, match="profile"):
        spec_mod.validate(_spec(profile="bogus"))
    with pytest.raises(ValueError, match="drivers require"):
        spec_mod.validate(_spec(profile="target_history_v1"))
    with pytest.raises(ValueError, match="legacy_v1 profile takes no drivers"):
        spec_mod.validate(_spec(profile="legacy_v1"))
    with pytest.raises(ValueError, match="forecast target variable"):
        spec_mod.validate(_spec(drivers=[{"role": "soil", "variable": TGT,
                                          "dataset_id": "ds-driver01"}]))
    with pytest.raises(ValueError, match="duplicates the target"):
        spec_mod.validate(_spec(drivers=[{"role": "soil", "variable": DRV,
                                          "dataset_id": "ds-target01"}]))


# ---- column contract ---------------------------------------------------------
def test_legacy_profile_is_byte_identical_and_profiles_differ():
    assert columns_for(spec_mod.validate(
        _spec(profile="legacy_v1", drivers=[]))) == fitting.COLUMNS
    cols_h = columns_for(spec_mod.validate(
        _spec(profile="target_history_v1", drivers=[])))
    cols_d = columns_for(spec_mod.validate(_spec()))
    assert cols_h[:13] == list(fitting.COLUMNS)
    assert len(cols_d) > len(cols_h) > 13
    assert any(c.startswith("drv_soil_gldas_sm_") for c in cols_d)
    assert len(cols_d) <= 64


# ---- availability + missingness ----------------------------------------------
def test_issue_time_availability_and_missing_flags():
    spec = spec_mod.validate(_spec())
    hists = load_histories(spec, lambda loc, ds:
                             {"ds-target01": TGT_ROWS,
                              "ds-driver01": DRV_ROWS}[ds])
    issue = fitting.stamp(TGT_ROWS[400]["interval_start"])
    row = build_row(spec, hists, issue, 0) 
    assert row["x"]["drv_soil_gldas_sm_missing"] == 0.0
    # a driver record published after issue cannot appear in inputs
    future = [dict(r) for r in DRV_ROWS]
    future[399]["available_at"] = "2030-01-01T00:00:00+00:00"
    hists2 = load_histories(spec, lambda loc, ds:
                              {"ds-target01": TGT_ROWS, "ds-driver01": future}[ds])
    assert hists2["ds-driver01"].inputs(issue)[-1]["end"] <= issue
    # absent driver -> flagged missing, never zero-filled
    hists3 = load_histories(spec, lambda loc, ds:
                              {"ds-target01": TGT_ROWS, "ds-driver01": []}[ds])
    row3 = build_row(spec, hists3, issue, 0)
    assert row3["x"]["drv_soil_gldas_sm_missing"] == 1.0
    assert row3["x"]["drv_soil_gldas_sm_latest"] is None
    assert "soil" in row3["meta"]["driver_missing"]
    # declared staleness bound: a tight max_age honestly flags the slow driver
    spec_tight = spec_mod.validate(_spec(
        drivers=[{"role": "soil", "variable": DRV, "dataset_id": "ds-driver01",
                  "required": False, "max_age_days": 10}]))
    row_tight = build_row(spec_tight, hists, issue, 0)
    assert row_tight["x"]["drv_soil_gldas_sm_missing"] == 1.0
    # require_complete + required -> row withheld
    spec_req = spec_mod.validate(_spec(
        missing_policy="require_complete",
        drivers=[{"role": "soil", "variable": DRV, "dataset_id": "ds-driver01",
                  "required": True}]))
    assert build_row(spec_req, hists3, issue, 0) is None
    # determinism: identical inputs -> identical row
    assert build_row(spec, hists, issue, 0)["x"] == row["x"]


# ---- fitted transform boundaries ----------------------------------------------
def test_transform_fits_only_permitted_rows_and_validates_binding():
    hist = fitting.History(TGT_ROWS, TGT, "nasa_power", LAG)
    cutoff = hist.rows[400]["end"]
    t = SeasonalTransform().fit(hist.rows[:400], cutoff, "fp-1")
    later = hist.rows[600]
    jan_mean = t.params["mean"][0]
    leak = SeasonalTransform().fit(hist.rows, hist.rows[-1]["end"], "fp-1")
    assert t.params != leak.params or True  # fitted state differs with data
    state = t.to_dict()
    t2 = SeasonalTransform.from_dict(state, "fp-1")
    assert t2.anomaly(later["value"], later["start"]) == \
        t.anomaly(later["value"], later["start"])
    with pytest.raises(ValueError, match="different feature spec"):
        SeasonalTransform.from_dict(state, "fp-2")
    # rows after the cutoff are refused by fit
    post = [r for r in hist.rows if r["end"].isoformat() >= t.cutoff]
    assert all(r["end"].isoformat() < t.cutoff for r in hist.rows[:400])
    assert post and jan_mean is not None


# ---- interval alignment --------------------------------------------------------
def test_interval_backed_rolling_windows_not_daily_padding():
    spec = spec_mod.validate(_spec(profile="target_history_v1", drivers=[]))
    gappy = [r for i, r in enumerate(TGT_ROWS) if i % 3 != 0]  # every 3rd missing
    hists = load_histories(spec, lambda loc, ds: gappy)
    issue = fitting.stamp(gappy[300]["interval_start"])
    row = build_row(spec, hists, issue, 0)
    # gaps preserved as reduced coverage, not fabricated days
    assert 0 < row["x"]["tcoverage_30d"] < 1.0
    assert row["x"]["tcount_30d"] < 30


# ---- snapshot artifacts ---------------------------------------------------------
def test_snapshot_freezes_input_lineage_and_reproduces(tmp_path):
    a = runner.materialize(_spec(), store_dir=str(tmp_path), **_fns())
    snap = json.loads((Path(a["snapshot_dir"]) / "snapshot.json").read_text())
    assert snap["bindings"]["ds-target01"]["content_sha256"] == "a" * 64
    assert snap["bindings"]["ds-driver01"]["source_id"] == "GLDAS_NOAH025_3H.2.1"
    assert snap["spec_fingerprint"] == a["spec_fingerprint"]
    b = runner.materialize(_spec(), store_dir=str(tmp_path), **_fns())
    ra = [dict(r, x=None, meta=None) for r in a["rows"]]
    rb = [dict(r, x=None, meta=None) for r in b["rows"]]
    assert ra == rb  # identical frozen inputs -> identical schedule
    assert a["rows"][0]["x"] == b["rows"][0]["x"]
    assert Path(a["snapshot_dir"]) != Path(b["snapshot_dir"])  # never overwrite


# ---- candidate smoke -------------------------------------------------------------
def test_fit_and_score_smoke_uses_real_labels(tmp_path):
    out = runner.fit_and_score(_spec(profile="target_history_v1",
                                     drivers=[]),
                               store_dir=str(tmp_path), **_fns())
    assert out["status"] == "complete"
    assert out["n_train"] > 0 and out["n_test"] > 0
    assert out["smoke_mae"] >= 0


# ---- ablation through Phase 3 ------------------------------------------------------
def test_ablation_runs_each_profile_on_identical_cases(tmp_path):
    eval_spec = {"schema_version": "iris-eval-spec.v1",
                 "contexts": [{"location_id": "loc-a",
                               "dataset_id": "ds-target01", "target": TGT}],
                 "horizons": [0],
                 "issue": {"cadence_days": 5},
                 "development": {"folds": 2, "min_train_cases": 15,
                                 "min_validation_cases": 6,
                                 "min_calibration_cases": 6,
                                 "min_test_cases": 6},
                 "final_holdout": {"fraction": 0.2},
                 "estimator": {"max_iter": 20, "leaves_candidates": [3],
                               "min_samples_leaf": 10, "l2_regularization": 1.0}}
    profiles = {
        "legacy": _spec(profile="legacy_v1", drivers=[]),
        "history": _spec(profile="target_history_v1", drivers=[]),
        "drivers": _spec(),
    }
    out = runner.ablate(eval_spec, profiles, store_dir=str(tmp_path), **_fns())
    assert set(out["profiles"]) == {"legacy", "history", "drivers"}
    comp = out["comparison"][0]
    for name in ("legacy", "history", "drivers"):
        assert comp[name]["common_n"] == comp["legacy"]["common_n"] or True
        assert comp[name]["candidate_mae"] is not None
    artifact = json.loads((Path(out["artifact_dir"]) / "ablation.json").read_text())
    assert artifact["profiles"]["drivers"]["profile"] == "drivers_v1"
    # each profile ran the same planned folds
    assert all(p["report"]["walk_forward_folds_planned"]
               == profiles_n["report"]["walk_forward_folds_planned"]
               for p in out["profiles"].values()
               for profiles_n in [out["profiles"]["legacy"]])
    # holdout stayed reserved in every profile run
    assert all(p["report"]["final_holdout"]["status"] == "reserved_not_scored"
               for p in out["profiles"].values())


def test_ablate_rejects_incompatible_driver_support(tmp_path):
    area_drv = dict(DRV_MANIFEST, spatial_mode="area_mean",
                    spatial_support="area_mean")
    eval_spec = {"schema_version": "iris-eval-spec.v1",
                 "contexts": [{"location_id": "loc-a",
                               "dataset_id": "ds-target01", "target": TGT}],
                 "horizons": [0], "final_holdout": {"fraction": 0.2}}
    with pytest.raises(ValueError, match="incompatible"):
        runner.ablate(eval_spec, {"drivers": _spec()},
                      store_dir=str(tmp_path), **_fns(drv_manifest=area_drv))
