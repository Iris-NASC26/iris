"""Foundation checks: no dataset access and no scientific assertions."""

import socket
from collections.abc import Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from earth_trend.api.app import create_app


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app(), base_url="http://127.0.0.1") as instance:
        yield instance


def test_health_is_live_but_analysis_is_unavailable(client: TestClient) -> None:
    with patch.object(socket, "create_connection", side_effect=AssertionError("Network access")):
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.json() == {
        "schema_version": "health.v1",
        "status": "ok",
        "mode": "local",
        "analysis_ready": False,
    }


@pytest.mark.parametrize("host", ["remote.example", "127.0.0.1.remote.example"])
def test_rejects_untrusted_hosts(client: TestClient, host: str) -> None:
    assert client.get("/api/v1/health", headers={"host": host}).status_code == 400


@pytest.mark.parametrize("origin", ["https://remote.example", "null", "http://localhost:9999"])
def test_rejects_untrusted_browser_origins(client: TestClient, origin: str) -> None:
    response = client.get("/api/v1/health", headers={"origin": origin})
    assert response.status_code == 403
    assert "access-control-allow-origin" not in response.headers


def test_accepts_local_development_origin(client: TestClient) -> None:
    assert (
        client.get("/api/v1/health", headers={"origin": "http://127.0.0.1:5173"}).status_code == 200
    )


def test_unknown_route_is_not_a_scientific_result(client: TestClient) -> None:
    assert client.get("/api/v1/analyses").status_code == 404
