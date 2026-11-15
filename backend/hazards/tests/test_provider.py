"""Offline HTTP boundaries. All credentials and provider messages here are fake."""

import json
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from hazards import history as historical
from hazards import meteomatics as module
from hazards.rainfall import instant, iso
from hazards.router import router

CLIENT = httpx.Client
REAL_CREDENTIALS = module.credentials


@pytest.fixture(autouse=True)
def isolated(monkeypatch):
    # Never open the developer's .env during offline tests.
    monkeypatch.setattr(
        module, "credentials", lambda: ("TEST-ONLY-USER", "TEST-ONLY-PASSWORD")
    )
    monkeypatch.setattr(module, "_cache", {})
    monkeypatch.setattr(module, "_quota_day", None)
    monkeypatch.setattr(module, "_quota_count", 0)
    monkeypatch.setattr(historical, "_cache", {})


def transport(monkeypatch, handler):
    monkeypatch.setattr(
        module.httpx,
        "Client",
        lambda **kw: CLIENT(transport=httpx.MockTransport(handler), **kw),
    )


def test_real_shape_normalized_cache_isolated_and_no_account_data_returned(monkeypatch):
    calls = []

    def respond(request):
        calls.append(request)
        assert request.url.host == "api.meteomatics.com"
        assert "TEST-ONLY" not in str(request.url)
        assert request.headers["authorization"].startswith("Basic ")
        start = instant(request.url.path.split("/")[1].split("--")[0])
        return httpx.Response(
            200,
            json={
                "status": "OK",
                "user": "PRIVATE-PROVIDER-ACCOUNT",
                "dateGenerated": iso(datetime.now(UTC)),
                "data": [
                    {
                        "parameter": "precip_1h:mm",
                        "coordinates": [
                            {
                                "lat": 27.7172,
                                "lon": 85.324,
                                "dates": [
                                    {
                                        "date": iso(start + timedelta(hours=i)),
                                        "value": 1,
                                    }
                                    for i in range(72)
                                ],
                            }
                        ],
                    }
                ],
            },
        )

    transport(monkeypatch, respond)
    first = module.forecast("nepal-floods-2024")
    assert first["peak_24h_mm"] == 24
    assert first["hazard_model_validated"] is False
    assert first["warning_state"] == "not_evaluated"
    assert first["forecast_initialization_at"] is None
    assert "PRIVATE-PROVIDER-ACCOUNT" not in json.dumps(first)
    first["rows"][0]["value"] = 999
    second = module.forecast("nepal-floods-2024")
    assert second["rows"][0]["value"] == 1
    assert second["from_cache"] is True
    assert len(calls) == 1
    # A different local account cannot reuse another account's cached response.
    monkeypatch.setattr(
        module, "credentials", lambda: ("OTHER-TEST-USER", "OTHER-TEST-PASSWORD")
    )
    module.forecast("nepal-floods-2024")
    assert len(calls) == 2


@pytest.mark.parametrize(
    "status,expected", [(401, 503), (403, 503), (429, 429), (503, 503), (302, 503)]
)
def test_provider_errors_are_sanitized_and_semaphore_released(
    monkeypatch, caplog, status, expected
):
    transport(
        monkeypatch, lambda req: httpx.Response(status, text="DO-NOT-LEAK-SECRET")
    )
    for _ in range(3):
        with pytest.raises(module.ForecastUnavailable) as error:
            module.forecast("nepal-floods-2024")
        assert error.value.status == expected
        assert "DO-NOT-LEAK" not in str(error.value)
    assert "DO-NOT-LEAK" not in caplog.text
    assert "TEST-ONLY-PASSWORD" not in caplog.text


@pytest.mark.parametrize(
    "body", [b"not json", b"null", b"[]", b'{"status":"OK", "data":[null]}']
)
def test_malformed_provider_never_becomes_a_successful_forecast(monkeypatch, body):
    transport(monkeypatch, lambda req: httpx.Response(200, content=body))
    with pytest.raises(module.ForecastUnavailable) as error:
        module.forecast("nepal-floods-2024")
    assert error.value.status == 502
    assert not module._cache


def test_budget_body_limit_and_missing_credentials(monkeypatch, tmp_path):
    monkeypatch.setattr(module, "_quota_day", datetime.now(UTC).date())
    monkeypatch.setattr(module, "_quota_count", 100)
    with pytest.raises(module.ForecastUnavailable, match="budget"):
        module.forecast("nepal-floods-2024")
    monkeypatch.setattr(module, "_quota_count", 0)
    monkeypatch.setattr(module, "MAX_BYTES", 8)
    transport(monkeypatch, lambda req: httpx.Response(200, content=b"x" * 9))
    with pytest.raises(module.ForecastUnavailable, match="size"):
        module.forecast("nepal-floods-2024")
    with pytest.raises(ValueError):
        module.forecast("unknown-case")
    # Restore the real loader only against a nonexistent file and empty env.
    monkeypatch.setattr(module, "credentials", REAL_CREDENTIALS)
    monkeypatch.setattr(module, "ENV_PATH", tmp_path / "nonexistent.env")
    monkeypatch.delenv("METEOMATICS_USERNAME", raising=False)
    monkeypatch.delenv("METEOMATICS_PASSWORD", raising=False)
    with pytest.raises(module.ForecastUnavailable, match="credentials are missing"):
        module.forecast("nepal-floods-2024")


def test_route_allowlist_rejects_unknown_case_without_provider_calls():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    for path in ("rainfall", "history"):
        assert client.get(f"/api/v1/hazards/{path}?case_id=unknown").status_code == 422
        assert client.get(f"/api/v1/hazards/{path}").status_code == 422
