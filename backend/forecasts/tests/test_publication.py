import json
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from forecasts import service, store, weather
from forecasts.router import router
from hazards.meteomatics import ForecastUnavailable
from hazards.rainfall import instant, iso

CLIENT = httpx.Client


@pytest.fixture(autouse=True)
def isolated(monkeypatch, tmp_path):
    monkeypatch.setattr(store, "PATH", tmp_path / "forecast.sqlite3")
    monkeypatch.setattr(
        weather, "credentials", lambda: ("TEST-ONLY-USER", "TEST-ONLY-SECRET")
    )


def test_provider_shape_budget_cache_and_private_fields(monkeypatch):
    calls = []

    def respond(request):
        calls.append(request)
        assert request.headers["authorization"].startswith("Basic ")
        assert "TEST-ONLY" not in str(request.url)
        assert request.url.params["source"] == "ecmwf-ens"
        start = instant(request.url.path.split("/")[1].split("--")[0])
        data = [
            {
                "parameter": "precip_3h:mm" + (f"-m{m}" if m else ""),
                "coordinates": [
                    {
                        "lat": 6.9355,
                        "lon": 79.8487,
                        "dates": [
                            {"date": iso(start + timedelta(hours=3 * i)), "value": 1}
                            for i in range(24)
                        ],
                    }
                ],
            }
            for m in range(51)
        ]
        return httpx.Response(
            200,
            json={
                "status": "OK",
                "user": "TEST-PRIVATE",
                "dateGenerated": iso(datetime.now(UTC)),
                "data": data,
            },
        )

    monkeypatch.setattr(
        weather.httpx,
        "Client",
        lambda **kw: CLIENT(transport=httpx.MockTransport(respond), **kw),
    )
    first = service.obtain("colombo")
    second = service.obtain("colombo", refresh=True)
    assert first == second
    assert len(calls) == 1
    assert "TEST-PRIVATE" not in json.dumps(first)
    assert store.run("colombo", first["artifact_id"]) == first
    assert len(store.archived("colombo")) == 1
    catalogue = service.catalogue()
    assert catalogue["forecasts"][0]["state"] == "fresh"
    assert catalogue["forecasts"][0]["peak_24h"]["median"] == 8
    assert catalogue["forecasts"][0]["artifact_id"] == first["artifact_id"]
    assert catalogue["forecasts"][1]["state"] == "unavailable"


def test_persistent_daily_budget_is_atomic():
    assert all(store.reserve() for _ in range(100))
    assert store.reserve() is False


@pytest.mark.parametrize("status", [401, 403, 429, 500, 302])
def test_errors_do_not_leak_response_and_cool_down(monkeypatch, status):
    calls = []

    def respond(request):
        calls.append(request)
        return httpx.Response(status, text="PRIVATE-ACCOUNT-DETAIL")

    monkeypatch.setattr(
        weather.httpx,
        "Client",
        lambda **kw: CLIENT(transport=httpx.MockTransport(respond), **kw),
    )
    with pytest.raises(ForecastUnavailable) as e:
        service.obtain("colombo")
    assert "PRIVATE" not in str(e.value)
    with pytest.raises(ForecastUnavailable):
        service.obtain("colombo")
    assert len(calls) == 1


def test_catalogue_never_calls_provider_and_unknown_ids_are_rejected(monkeypatch):
    monkeypatch.setattr(
        weather,
        "retrieve",
        lambda _: pytest.fail("Catalogue may not spend a provider request"),
    )
    assert len(service.catalogue()["forecasts"]) == 6
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    assert client.get("/api/v1/forecasts/catalogue").status_code == 200
    assert client.get("/api/v1/forecasts/unknown").status_code == 422
    assert client.get("/api/v1/forecasts/colombo?artifact_id=bad").status_code == 422
    assert (
        client.get("/api/v1/forecasts/colombo?artifact_id=" + "a" * 64).status_code
        == 410
    )


def test_stale_peak_not_published_as_a_current_headline(monkeypatch):
    old = iso(datetime.now(UTC) - timedelta(hours=5))
    store.save(
        "colombo",
        {
            "artifact_id": "a" * 64,
            "source_response_sha256": "b" * 64,
            "retrieved_at": old,
            "expires_at": old,
            "rows": [{"start": old, "end": old}],
            "peak_24h": {"median": 100},
        },
    )
    card = service.catalogue()["forecasts"][0]
    assert card["state"] == "stale"
    assert card["peak_24h"] is None


def test_failed_explicit_refresh_reports_failure_and_preserves_real_snapshot(
    monkeypatch,
):
    now = datetime.now(UTC)
    value = {
        "artifact_id": "a" * 64,
        "source_response_sha256": "b" * 64,
        "retrieved_at": iso(now - timedelta(hours=2)),
        "expires_at": iso(now + timedelta(hours=1)),
        "rows": [{"start": iso(now), "end": iso(now + timedelta(hours=3))}],
        "peak_24h": None,
    }
    store.save("colombo", value)

    def fail(_):
        raise ForecastUnavailable("Provider temporarily unavailable.")

    monkeypatch.setattr(weather, "retrieve", fail)
    with pytest.raises(ForecastUnavailable, match="temporarily unavailable"):
        service.obtain("colombo", refresh=True)
    assert store.get("colombo") == value
    assert service.obtain("colombo") == value
