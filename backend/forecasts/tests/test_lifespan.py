"""The additive entry must preserve the application's original lifecycle."""

import importlib.util
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_composed_lifespan_preserves_state_and_stops_worker(monkeypatch):
    events = []

    @asynccontextmanager
    async def original(_):
        events.append("original-start")
        yield {"original_state": True}
        events.append("original-stop")

    app = FastAPI(lifespan=original)
    monkeypatch.setitem(sys.modules, "main", SimpleNamespace(app=app))
    spec = importlib.util.spec_from_file_location(
        "_test_visualization_entry",
        Path(__file__).resolve().parents[2] / "visualization_app.py",
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(
        module, "start_forecasts", lambda: events.append("forecast-start")
    )
    monkeypatch.setattr(
        module, "stop_forecasts", lambda: events.append("forecast-stop")
    )
    with TestClient(module.app):
        assert events == ["original-start", "forecast-start"]
    assert events == [
        "original-start",
        "forecast-start",
        "forecast-stop",
        "original-stop",
    ]
