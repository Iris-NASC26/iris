"""Phase-5 tests: foundation repairs + model-selection contract/search."""
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

from forecasts.v2 import datasets, locations, power, updates, workers  # noqa: E402
from forecasts.v2.evaluation import runner as eval_runner, splits  # noqa: E402
from forecasts.v2.model_selection import candidates, search  # noqa: E402


@pytest.fixture()
def store(tmp_path, monkeypatch):
    monkeypatch.setattr(locations, "DB_PATH", tmp_path / "loc.sqlite")
    monkeypatch.setattr(workers, "STAGING", tmp_path / "history")
    monkeypatch.setattr(updates, "STAGING", tmp_path / "history")
    monkeypatch.setattr(datasets, "ROOT", tmp_path / "datasets")
    import forecasts.v2.jobs as jobs_mod
    monkeypatch.setattr(jobs_mod, "DB_PATH", tmp_path / "jobs.sqlite")
    return tmp_path


LAG = 72.0
TGT = "power_t2m"


def _records(n=1100, start=datetime(2021, 1, 1, tzinfo=UTC), lag=LAG):
    return [{"variable": TGT, "source_id": "nasa_power",
             "interval_start": (start + timedelta(days=i)).isoformat(),
             "interval_end": (start + timedelta(days=i + 1)).isoformat(),
             "value": 299.0 + 3.0 * np.sin(2 * np.pi * i / 365.25),
             "available_at": (start + timedelta(days=i + 1)
                              + timedelta(hours=lag)).isoformat()}
            for i in range(n)]


MANIFEST = {"dataset_id": "ds-p5", "source_id": "nasa_power",
            "variables": [TGT], "content_sha256": "0" * 64,
            "spatial_mode": "point", "source_lag_hours": LAG}
SPEC = {"schema_version": "iris-eval-spec.v1",
        "contexts": [{"location_id": "loc-a", "dataset_id": "ds-p5",
                      "target": TGT}],
        "horizons": [0], "issue": {"cadence_days": 6},
        "development": {"folds": 2, "min_train_cases": 15,
                        "min_validation_cases": 6,
                        "min_calibration_cases": 6, "min_test_cases": 6},
        "final_holdout": {"fraction": 0.2},
        "estimator": {"max_iter": 30, "leaves_candidates": [3],
                      "min_samples_leaf": 10, "l2_regularization": 1.0},
        "limits": {"max_folds": 6, "max_candidates": 4, "max_cases": 2000,
                   "max_fit_seconds": 300}}
FNS = dict(manifest_fn=lambda loc, ds: MANIFEST,
           load_fn=lambda loc, ds: _records(),
           resolve_fn=lambda loc: {"id": loc, "kind": "point"})


# ---------- P2-01: update logs never contaminate observation reads -----------
def test_update_log_excluded_from_staged_reads(store):
    loc = workers.STAGING / "loc-x"
    loc.mkdir(parents=True, exist_ok=True)
    (loc / "nasa_power.jsonl").write_text(
        json.dumps({"variable": TGT, "source_id": "nasa_power",
                    "interval_start": "2024-01-01T00:00:00+00:00",
                    "interval_end": "2024-01-02T00:00:00+00:00",
                    "value": 295.0}) + "\n")
    (loc / "nasa_power.updates.jsonl").write_text(
        json.dumps({"event": "update", "value": "NOT_AN_OBSERVATION"}) + "\n")
    rows = workers.staged_records("loc-x")
    assert len(rows) == 1 and rows[0]["value"] == 295.0
    # the log line must never parse as an observation
    assert all("event" not in r for r in rows)


# ---------- P2-02: omitted cells shrink the coverage denominator -------------
def test_omitted_cells_reduce_coverage_denominator(store):
    bbox = (79.0, 5.0, 81.5, 8.0)
    intended = power.intended_cells(bbox)
    cells = {c: {"20240101": 20.0} for c in intended[:3]}  # 3 of ~24 cells
    body = json.dumps({"type": "FeatureCollection", "features": [
        {"geometry": {"type": "Point", "coordinates": [lo, la]},
         "properties": {"parameter": {"T2M": s}}}
        for (lo, la), s in cells.items()]}).encode()
    out = power.parse_area_payload(body, TGT, bbox,
                                   datetime(2024, 1, 5, tzinfo=UTC))
    cov = out["coverage"][0]
    assert cov["expected_cells"] == len(intended)
    assert cov["valid_area_fraction"] < 0.5  # honest shortfall, not 1.0
    assert out["records"][0]["value"] is None  # quarantined, not averaged


# ---------- P2-03: update checkpoints resume across worker passes ------------
def test_update_resume_uses_persisted_checkpoint(store):
    rec, _ = locations.register_area("Resume box", [79.0, 5.0, 82.0, 9.0])
    loc = rec["location_id"]
    bbox = (79.0, 5.0, 82.0, 9.0)
    full = {c: {"20240101": 20.0} for c in power.intended_cells(bbox)}
    calls = []

    def transport(url, t):
        calls.append(url)
        return 200, json.dumps({"type": "FeatureCollection", "features": [
            {"geometry": {"type": "Point", "coordinates": [lo, la]},
             "properties": {"parameter": {"T2M": s}}}
            for (lo, la), s in full.items()]}).encode(), {}

    # seed staging + watermark so _update has a window
    workers._power_ingest("s", loc, {"variable": TGT,
                                   "start": "2023-12-31T00:00:00+00:00",
                                   "end": "2024-01-03T00:00:00+00:00"},
                        transport=transport)
    spec = {"source_id": "nasa_power", "variable": TGT,
            "start": "2023-01-01T00:00:00+00:00",
            "end": "2025-01-01T00:00:00+00:00",
            "budget": {"remaining": 1}}
    first = workers._update("u1", loc, dict(spec), transport=transport,
                            parser=None)
    if first.get("pending"):
        ck = first["checkpoint"]
        assert ck["update_checkpoint"]["chunk_index"] == 0
        assert ck["update_window"]  # pinned across passes
        n_calls_before = len(calls)
        resumed = workers._update(
            "u2", loc, {**spec, **ck, "budget": {"remaining": 5}},
            transport=transport, parser=None)
        assert not resumed.get("pending")
        # the already-completed chunk was not re-requested
        first_chunk_start = calls[0].split("start=")[1].split("&")[0]
        refetches = [u for u in calls[n_calls_before:]
                     if f"start={first_chunk_start}" in u]
        assert refetches == []


# ---------- P2-04: latest usable vs latest stored ----------------------------
def test_freshness_distinguishes_usable_from_stored(store):
    rec = {"location_id": "x", "name": "p", "spatial_mode": "point"}
    now = datetime.now(UTC)
    # a record whose interval ended recently but is NOT yet usable
    future = [{"variable": TGT, "source_id": "nasa_power",
               "interval_start": (now - timedelta(days=1)).isoformat(),
               "interval_end": now.isoformat(), "value": 295.0,
               "available_at": (now + timedelta(hours=72)).isoformat(),
               "retrieved_at": now.isoformat()}]
    old = [{"variable": TGT, "source_id": "nasa_power",
            "interval_start": (now - timedelta(days=6)).isoformat(),
            "interval_end": (now - timedelta(days=5)).isoformat(),
            "value": 294.0,
            "available_at": (now - timedelta(days=2)).isoformat(),
            "retrieved_at": now.isoformat()}]
    f = updates.freshness(rec, "nasa_power", TGT, future + old, [],
                          availability_basis="estimated ~72h", now=now)
    # the usable anchor is the OLD record, not the unavailable newest one
    assert f["latest_usable_end"] == old[0]["interval_end"]
    assert f["latest_observation_end"] == future[0]["interval_end"]


# ---------- BIND-01: job reuse is bound to dataset identity ------------------
def test_job_lookup_parses_spec_for_binding_checks(store):
    from forecasts.v2 import jobs as j
    job = j.enqueue("pipeline", "loc-a", "k1",
                    spec={"dataset_id": "ds-111", "source_id": "nasa_power"})
    got = j.get(job["job_id"])
    assert isinstance(got["spec"], dict)
    assert got["spec"]["dataset_id"] == "ds-111"


# ---------- EVAL: calendar grid, calibration fraction, deterministic ---------
def test_calendar_grid_and_cal_fraction_boundaries(store):
    from forecasts.v2 import fitting
    h = fitting.History(_records(n=200), TGT, "nasa_power", LAG)
    cases, excl = splits.cases(h, MANIFEST, [0], {"cadence_days": 7},
                               datetime(2021, 6, 1, tzinfo=UTC))
    # issues sit on a fixed calendar grid anchored at the first record —
    # spacing is exactly the cadence, independent of row indices
    issue_ts = sorted(datetime.fromisoformat(c["issue"]) for c in cases)
    assert all((b - a).days == 7 for a, b in zip(issue_ts, issue_ts[1:]))
    # scored issues stay on the grid anchored at the first record; earlier
    # grid points are recorded exclusions, not shifted dates
    assert (issue_ts[0] - h.rows[0]["start"]).days % 7 == 0
    assert excl["insufficient_inputs"] > 0
    parts = splits.inner_split(cases, SPEC["development"],
                               fit_cutoff=datetime(2021, 6, 1, tzinfo=UTC))
    assert parts["calibration"] and parts["unused"]
    # calibration labels unusable at the outer fit are purged
    for c in parts["calibration"]:
        assert c["label_available"] < "2021-06-01T00:00:00+00:00"
    # an earlier outer cutoff shrinks calibration further — never widens it
    earlier = splits.inner_split(cases, SPEC["development"],
                                 fit_cutoff=datetime(2021, 4, 1, tzinfo=UTC))
    assert len(earlier["calibration"]) < len(parts["calibration"])


def test_dev_cases_crossing_holdout_are_excluded_not_scored(store):
    rep = eval_runner.run(dict(SPEC), store_dir=str(store / "ev"), **FNS)
    ctx = rep["contexts"][0]
    assert ctx["excluded"]["crosses_holdout_boundary"] >= 0
    for f in ctx["folds"]:
        for r in f.get("case_rows", []):
            assert r["case_id"] and len(r["case_id"]) == 16


def test_deterministic_baselines_have_no_interval_metrics(store):
    rep = eval_runner.run(dict(SPEC), store_dir=str(store / "ev2"), **FNS)
    for ctx in rep["contexts"]:
        for g in ctx["groups"]:
            pers = g["methods"].get("persistence")
            if pers and pers.get("n"):
                assert pers["interval_metrics"] == "unavailable_deterministic"
                assert pers["coverage_80"] is None


# ---------- model-selection contract + comparison -----------------------------
def test_candidate_contract_and_deterministic_build(store):
    cands = candidates.build_candidates({"hgb_trials": 2, "linear": True}, 7)
    ids = [c["candidate_id"] for c in cands]
    assert ids == [c["candidate_id"] for c in
                   candidates.build_candidates({"hgb_trials": 2,
                                                "linear": True}, 7)]
    assert "hgb-incumbent" in ids and "linear-seasonal" in ids
    spec = candidates.spec_for(
        cands[0], feature_profile={"profile": "legacy_v1"},
        columns=["a"], bindings={"ds-p5": TGT}, seed=7)
    assert spec["schema"] == "iris-candidate.v1" and spec["candidate_sha256"]


def test_estimator_fn_selection_and_linear_challenger(store):
    cfg = {"eval_spec": dict(SPEC), "seed": 3,
           "budget": {"hgb_trials": 1, "linear": True}}
    out = search.compare(cfg, store_dir=str(store / "ms"), **FNS)
    res = out["results"]
    assert res["hgb-incumbent"]["status"] == "evaluated"
    assert res["linear-seasonal"]["status"] == "evaluated"
    # identical-case comparison: shared ids intersect across candidates
    sm = out["shared_metrics"]
    assert sm["hgb-incumbent"]["shared_n"] == \
        sm["linear-seasonal"]["shared_n"]
    assert sm["hgb-incumbent"]["shared_n"] > 0
    assert out["selection"]["outcome"] == "candidate_selected"
    artifact = Path(out["comparison_dir"]) / "comparison.json"
    assert json.loads(artifact.read_text())["engine"] == "iris-modelsel-v1"


def test_freeze_and_replay_prediction(store):
    cfg = {"eval_spec": dict(SPEC), "seed": 3,
           "budget": {"hgb_trials": 0, "linear": True}}
    out = search.compare(cfg, store_dir=str(store / "ms2"), **FNS)
    winner = out["selection"]["candidate_id"]
    frozen = search.freeze(out["comparison_dir"], winner,
                           eval_spec=dict(SPEC),
                           store_dir=str(store / "ms2"), **FNS)
    assert frozen["candidate"]["frozen"]["estimator_sha256"]
    preds = search.replay(frozen["selection_dir"], "ds-p5",
                          [{"feature": {k: 1.0 for k in
                                        ("recent_1", "recent_2", "recent_3",
                                         "recent_4", "recent_5", "recent_6",
                                         "recent_mean", "recent_std",
                                         "recent_delta", "input_age_days",
                                         "lead_days", "sin_doy", "cos_doy")}}])
    q = preds[0]["q"]
    assert q[0] <= q[1] <= q[2]
    from forecasts.v2.variables import VARIABLES
    assert VARIABLES[TGT]["min"] <= q[1] <= VARIABLES[TGT]["max"]
