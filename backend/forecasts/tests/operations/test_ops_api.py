"""Phase-7 ops API tests — real FastAPI routes, isolated stores."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
pytest.importorskip("fastapi")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from forecasts.v2 import router as v2_router  # noqa: E402
from forecasts.v2.operations import schedules  # noqa: E402


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db = tmp_path / "ops.sqlite3"
    root = tmp_path / "opsroot"
    monkeypatch.setattr(v2_router, "OPS_DB", db)
    monkeypatch.setattr(v2_router, "OPS_ROOT", root)
    monkeypatch.setenv("IRIS_ML_ADMIN_TOKEN", "adm")
    app = FastAPI()
    app.include_router(v2_router.router)
    return TestClient(app)


H = {"x-iris-admin": "adm"}


def test_schedule_crud_guard_and_reads(client):
    assert client.get("/api/v1/forecasts/v2/ops/schedules").json() == {
        "schedules": []}
    # mutations require the admin token
    assert client.post("/api/v1/forecasts/v2/ops/schedules",
                       json={"kind": "monitoring"}).status_code == 403
    r = client.post("/api/v1/forecasts/v2/ops/schedules",
                    json={"kind": "monitoring",
                          "binding": {"location_id": "c"},
                          "cadence_seconds": 60, "enabled": True},
                    headers=H)
    assert r.status_code == 200, r.text
    sid = r.json()["schedule_id"]
    bad = client.post("/api/v1/forecasts/v2/ops/schedules",
                      json={"kind": "nonsense"}, headers=H)
    assert bad.status_code == 422
    r = client.post(f"/api/v1/forecasts/v2/ops/schedules/{sid}/state",
                    json={"enabled": False}, headers=H)
    assert r.json()["enabled"] is False


def test_pause_resume_due_and_tick(client, tmp_path):
    db = tmp_path / "ops.sqlite3"
    schedules.create(db, kind="history_update", binding={}, enabled=True,
                     cadence_seconds=1)
    assert client.get("/api/v1/forecasts/v2/ops/due").json()["due"] == []
    r = client.post("/api/v1/forecasts/v2/ops/tick", headers=H)
    assert r.status_code == 200 and r.json()["plans"] == []
    r = client.post("/api/v1/forecasts/v2/ops/pause", headers=H)
    assert r.json()["paused"] is True and r.json()["affected"] >= 1
    r = client.post("/api/v1/forecasts/v2/ops/resume", headers=H)
    assert r.json()["paused"] is False


def test_release_and_status_and_integrity(client):
    ctx = {"location_id": "col", "target": "power_t2m"}
    st = client.get("/api/v1/forecasts/v2/ops/status/col/power_t2m")
    assert st.status_code == 200
    assert st.json()["matured_skill"]["status"] == "not_evaluated"
    rel = client.get("/api/v1/forecasts/v2/ops/releases/col/power_t2m")
    assert rel.json() == {"releases": [], "active": None}
    rb = client.post("/api/v1/forecasts/v2/ops/releases/rollback",
                     json={"context": ctx}, headers=H)
    assert rb.json()["status"] == "no_previous"
    it = client.get("/api/v1/forecasts/v2/ops/integrity")
    assert it.json()["status"] == "ok"


def test_run_read_back_unknown_is_404(client):
    assert client.get("/api/v1/forecasts/v2/ops/runs/run-nope") \
        .status_code == 404
