"""Phase-7 operations tests — isolated roots, injected clocks."""
from __future__ import annotations

import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
np = pytest.importorskip("numpy")
pytest.importorskip("sklearn")

from forecasts.v2.operations import (adapters, integrity, monitoring,  # noqa: E402
                                     releases, runner, schedules)
from forecasts.v2.model_selection import store as ms_store  # noqa: E402

T0 = datetime(2024, 6, 1, tzinfo=UTC)


# ---- schedules ---------------------------------------------------------------
def test_schedule_persist_enable_due_clock(tmp_path):
    db = str(tmp_path / "ops.sqlite3")
    s = schedules.create(db, kind="history_update",
                         binding={"location_id": "col",
                                  "target": "power_t2m"},
                         cadence_seconds=3600, next_due=T0)
    assert s["enabled"] is False
    assert schedules.due(db, now=T0 + timedelta(hours=2)) == []
    schedules.set_enabled(db, s["schedule_id"], True)
    assert [x["schedule_id"] for x in
            schedules.due(db, now=T0 - timedelta(minutes=1))] == []
    due = schedules.due(db, now=T0 + timedelta(minutes=1))
    assert [x["schedule_id"] for x in due] == [s["schedule_id"]]


def test_claim_atomicity_lease_expiry_and_no_theft(tmp_path):
    db = str(tmp_path / "ops.sqlite3")
    s = schedules.create(db, kind="monitoring", binding={},
                         cadence_seconds=60, enabled=True, next_due=T0)
    sid = s["schedule_id"]
    assert schedules.claim(db, sid, now=T0, owner="a") is True
    # second tick/process cannot steal a live lease
    assert schedules.claim(db, sid, now=T0 + timedelta(seconds=30),
                           owner="b") is False
    # after lease expiry a recovery claim succeeds
    assert schedules.claim(db, sid, now=T0 + timedelta(seconds=901),
                           owner="b") is True
    # live job is not stolen by recover before expiry
    s2 = schedules.create(db, kind="monitoring", binding={},
                          cadence_seconds=60, enabled=True, next_due=T0)
    schedules.claim(db, s2["schedule_id"], now=T0, owner="c")
    stale = schedules.recover_expired(db,
                                      now=T0 + timedelta(seconds=30))
    assert [x["schedule_id"] for x in stale] == []
    stale2 = schedules.recover_expired(
        db, now=T0 + timedelta(seconds=1000))
    # sid was re-leased at +901 (live until +1801); only s2 is stale
    assert [x["schedule_id"] for x in stale2] == [s2["schedule_id"]]


def test_missed_run_coalescing_and_no_change_success(tmp_path):
    db = str(tmp_path / "ops.sqlite3")
    s = schedules.create(db, kind="forecast_reissue", binding={},
                         cadence_seconds=3600, enabled=True, next_due=T0)
    now = T0 + timedelta(hours=25)  # 25 missed hourly slots
    schedules.claim(db, s["schedule_id"], now=now)
    out = schedules.complete(db, s["schedule_id"], ok=True, now=now,
                             produced_change=False)
    assert out["no_change"] is True
    nxt = datetime.fromisoformat(out["next_due"])
    assert nxt > now and nxt <= now + timedelta(hours=1)  # one slot, not 25


def test_plan_due_branches_and_respects_leases(tmp_path):
    db = str(tmp_path / "ops.sqlite3")
    schedules.create(db, kind="history_update", binding={"a": 1},
                     cadence_seconds=60, enabled=True, next_due=T0)
    plans = runner.plan_due(db, now=T0 + timedelta(seconds=5))
    assert [p["kind"] for p in plans] == ["history_update"]
    # a second tick sees no work — the lease holds
    assert runner.plan_due(db, now=T0 + timedelta(seconds=6)) == []


# ---- adapters + generate/reopen ---------------------------------------------
def _fitted_state():
    from sklearn.ensemble import HistGradientBoostingRegressor
    x = np.random.default_rng(0).normal(size=(60, 13))
    y = x[:, 0] * 0.5 + 290
    models = {n: HistGradientBoostingRegressor(
        loss="quantile", quantile=q, max_iter=20).fit(x, y)
        for n, q in (("q10", .1), ("median", .5), ("q90", .9))}
    return {"family": "hgb_tuned", "fitted": {"models": models,
            "columns_active": [f"c{i}" for i in range(13)]},
            "target": "power_t2m", "correction": 0.0,
            "columns": [f"c{i}" for i in range(13)]}


def _selection_dir(tmp_path, state):
    d = tmp_path / "sel-r1"
    d.mkdir()
    (d / "spec.json").write_text(json.dumps({"candidate_sha256": "x"}))
    (d / "states.json").write_text(json.dumps({"ds-1": {"placeholder": True}}))
    return d


def test_adapter_capability_states():
    assert adapters.capability("hgb_tuned")["status"] == "supported"
    assert adapters.capability("nonexistent")["status"] == \
        "unsupported_family"
    lg = adapters.capability("lightgbm_quantile")
    assert lg["status"] in ("supported", "dependency_unavailable")


def test_generate_save_reopen_and_calibration_once(tmp_path):
    state = _fitted_state()
    sel = _selection_dir(tmp_path, state)
    import joblib
    joblib.dump(state, sel / "state-ds-1.joblib")

    # frozen load path used by Phase 5/6
    states = {"ds-1": state}
    import unittest.mock as mock
    cal_art = {"schema": "iris-insight-calibration.v1",
               "status": "calibrated", "correction": 2.0,
               "level": 0.8, "policy": "expand_only",
               "context": {"target": "power_t2m"}}
    cal_dir = tmp_path / "cal"
    cal_dir.mkdir()
    (cal_dir / "calibrator.json").write_text(json.dumps(cal_art))
    man = {"schema": "iris-release.v1", "release_id": "rel-r1",
           "quality": "experimental",
           "context": {"location_id": "col", "target": "power_t2m"},
           "model": {"family": "hgb_tuned", "path": str(sel),
                     "dataset_id": "ds-1"},
           "insights": {"calibration": {"path": str(cal_dir)}},
           "features": {}, "evidence": {}}
    case = {"issue": "2024-06-02T00:00:00+00:00",
            "feature": {f"c{i}": 1.0 for i in range(13)}}
    with mock.patch.object(ms_store, "load_frozen",
                           return_value=({}, states)):
        run = runner.generate(str(tmp_path), man, case)
    assert run["status" if "status" in run else "release_id"] == "rel-r1"
    assert run["calibrated"]["status"] == "calibrated"
    raw = run["raw_q"]
    adj = run["calibrated"]["interval"]
    assert adj[0] == pytest.approx(raw[0] - 2.0)
    assert adj[1] == pytest.approx(raw[2] + 2.0)
    # reopen replays the saved snapshot — identical, no refit
    back = runner.reopen(str(tmp_path), run["run_id"])
    assert back["raw_q"] == raw and back["saved_at"] == run["saved_at"]


# ---- releases ----------------------------------------------------------------
def _manifest(tmp_path, root, rid_ok=True):
    art = tmp_path / "model.bin"
    art.write_bytes(b"weights")
    import hashlib
    sha = hashlib.sha256(b"weights").hexdigest()
    return {"schema": "iris-release.v1", "release_id": "rel-r9",
            "quality": "qualified",
            "context": {"location_id": "col", "target": "power_t2m"},
            "model": {"family": "hgb_quantile", "path": str(art),
                      "sha256": sha if rid_ok else "bad"},
            "features": {}, "insights": {},
            "evidence": {"evaluation": {"mae": 0.5, "n": 100},
                         "calibration": {"coverage": 0.84}},
            "dir": str(tmp_path / "rel-r9")}


def test_promote_validate_conflict_rollback(tmp_path):
    root = tmp_path / "opsroot"
    man = _manifest(tmp_path, root)
    ctx = man["context"]
    man = releases.publish(root, context=ctx,
                           model_ref=man["model"], feature_ref={},
                           insight_refs={}, evidence=man["evidence"],
                           quality="qualified")
    v = releases.validate(root, man)
    assert v["ok"], v["problems"]
    p1 = releases.promote(root, man, expected_active=None, actor="t")
    assert p1["status"] == "promoted"
    # hash mismatch → rejected, active unchanged
    bad = _manifest(tmp_path, root, rid_ok=False)
    p2 = releases.promote(root, bad)
    assert p2["status"] == "rejected" and not p2["ok"]
    assert releases.active(root, ctx)["release_id"] == "rel-r1"
    # stale expected pointer → conflict
    man2 = releases.publish(root, context=ctx,
                            model_ref=man["model"], feature_ref={},
                            insight_refs={}, evidence=man["evidence"],
                            quality="qualified")
    p3 = releases.promote(root, man2, expected_active="rel-r9")
    assert p3["status"] == "conflict"
    # promote second with correct expectation, then rollback
    p4 = releases.promote(root, man2, expected_active="rel-r1")
    assert p4["status"] == "promoted"
    rb = releases.rollback(root, ctx)
    assert rb["status"] == "rolled_back"
    assert releases.active(root, ctx)["release_id"] == "rel-r1"
    # audit trail records every transition
    audit = (root / "releases" / "col-power_t2m" / "audit.jsonl")
    evs = [json.loads(l)["event"] for l in audit.read_text().splitlines()]
    assert "promoted" in evs and "promote_conflict" in evs \
        and "rolled_back" in evs


def test_qualified_without_evidence_rejected(tmp_path):
    root = tmp_path / "opsroot"
    man = _manifest(tmp_path, root)
    man["evidence"] = {}
    v = releases.validate(root, man)
    assert not v["ok"] and any("evidence" in p for p in v["problems"])


# ---- monitoring ----------------------------------------------------------------
def _obs(end, value, avail_lag_h=72, source="nasa_power"):
    e = datetime.fromisoformat(end)
    return {"end": end, "value": value,
            "available_at": (e + timedelta(hours=avail_lag_h)).isoformat(),
            "source_id": source}


def test_mature_scores_no_future_truth_and_revision(tmp_path):
    end = "2024-06-03T00:00:00+00:00"
    runs = [{"issue": "2024-06-01T00:00:00+00:00", "window_end": end,
             "source_id": "nasa_power",
             "predictions": {"candidate": {"q": [289.0, 291.0, 293.0]}},
             "scored_value": 292.0}]
    # truth matured (available <= now)
    obs = [_obs(end, 293.0)]
    out = monitoring.mature_scores(
        runs, obs, now=datetime(2024, 6, 10, tzinfo=UTC))
    assert out["status"] == "complete"
    assert out["mae_matured"] == pytest.approx(2.0)
    assert out["revised_events"] and \
        out["revised_events"][0]["prior_truth"] == 292.0
    # truth not yet matured → pending, not scored
    future = [_obs("2024-06-10T00:00:00+00:00", 293.0,
                   avail_lag_h=24 * 30)]
    out2 = monitoring.mature_scores(
        [{"issue": "x", "window_end": "2024-06-10T00:00:00+00:00",
          "predictions": {"candidate": {"q": [1, 2, 3]}}}],
        future, now=datetime(2024, 6, 11, tzinfo=UTC))
    assert out2["status"] == "insufficient_matured"


def test_drift_debounce_and_insufficient(tmp_path):
    ref = {"min_n": 5,
           "columns": {"c0": {"mean": 0.0, "std": 1.0}}}
    rows = [{"feature": {"c0": 10.0}} for _ in range(10)]
    out = monitoring.drift(ref, rows, debounce=3,
                           prior_state={"breaches": 2})
    assert out["status"] == "drift_warning"
    assert out["consecutive_breaches"] == 3
    small = monitoring.drift(ref, rows[:2])
    assert small["status"] == "insufficient_evidence"
    calm = monitoring.drift(ref, [{"feature": {"c0": 0.1}}
                                  for _ in range(10)])
    assert calm["status"] == "stable"


def test_status_persists_bounded_history(tmp_path):
    rep = monitoring.status(str(tmp_path),
                            {"location_id": "col", "target": "power_t2m"},
                            usable_latest="2024-06-01",
                            stored_latest="2024-06-02")
    assert rep["freshness"]["latest_usable"] == "2024-06-01"
    assert rep["matured_skill"]["status"] == "not_evaluated"


# ---- integrity ------------------------------------------------------------------
def test_integrity_finds_broken_refs_and_protects(tmp_path):
    root = tmp_path / "opsroot"
    man = _manifest(tmp_path, root)
    releases.publish(root, context=man["context"],
                     model_ref=man["model"], feature_ref={},
                     insight_refs={}, evidence=man["evidence"])
    bad = _manifest(tmp_path, root, rid_ok=False)
    releases.publish(root, context=man["context"],
                     model_ref=bad["model"], feature_ref={},
                     insight_refs={}, evidence=bad["evidence"])
    rep = integrity.check(root)
    assert rep["status"] == "problems_found"
    assert any(p["problem"] == "hash_mismatch"
               for p in rep["problems"])
    assert rep["n_releases_scanned"] == 2
    good = [p for p in rep["protected_paths"] if "model.bin" in p]
    assert good  # the valid ref is protected from retention
