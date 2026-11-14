"""Geocoder checks against mocked Open-Meteo responses — no network in tests."""

import json
import time
from pathlib import Path
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from earth_trend.api import geocode as geocode_module
from earth_trend.api.app import create_app
from earth_trend.api.schemas.geocoding import GeocodeResult
from earth_trend.sources import power_zarr
from earth_trend.sources.geocoder import HOST, geocode
from earth_trend.sources.power_zarr import SourceFormatError, SourceUnavailable

PAYLOAD = {
    "results": [
        {
            "name": "Colombo",
            "latitude": 6.93,
            "longitude": 79.85,
            "country": "Sri Lanka",
            "admin1": "Western Province",
        },
        {"name": "Colombo", "latitude": -34.0, "longitude": -58.4, "country": "Brazil"},
    ]
}


def client_for(payload: Any, calls: list[str] | None = None) -> httpx.Client:
    def handle(request: httpx.Request) -> httpx.Response:
        if calls is not None:
            calls.append(request.url.path + "?" + request.url.query.decode())
        if request.url.host != HOST:
            return httpx.Response(404)
        return httpx.Response(200, content=json.dumps(payload).encode())

    return httpx.Client(transport=httpx.MockTransport(handle), follow_redirects=False)


def test_geocode_returns_candidates_and_records_the_hash(tmp_path: Path) -> None:
    lookup = geocode("colombo", root=tmp_path, client=client_for(PAYLOAD))
    assert lookup.query == "colombo"
    assert len(lookup.candidates) == 2
    assert lookup.candidates[0].lat == pytest.approx(6.93)
    assert lookup.candidates[1].admin1 is None
    assert "/v1/search" in lookup.artifact_hashes
    assert not lookup.from_cache and not lookup.stale_cache


def test_no_match_is_an_empty_list_not_an_error(tmp_path: Path) -> None:
    lookup = geocode("zzzz", root=tmp_path, client=client_for({"results": None}))
    assert lookup.candidates == []
    missing = geocode("zzzz", root=tmp_path, client=client_for({"results": []}))
    assert missing.candidates == []


def test_geocode_caches_and_stale_cache_survives_an_outage(tmp_path: Path) -> None:
    calls: list[str] = []
    geocode("colombo", root=tmp_path, client=client_for(PAYLOAD, calls))
    assert len(calls) == 1
    again = geocode("colombo", root=tmp_path, client=client_for(PAYLOAD, calls))
    assert len(calls) == 1 and again.from_cache
    for path in tmp_path.iterdir():
        if not path.name.endswith(".json"):
            import os

            os.utime(path, (time.time() - 90000, time.time() - 90000))
    offline = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500)))
    stale = geocode("colombo", root=tmp_path, client=offline)
    assert stale.stale_cache and stale.candidates == again.candidates


def test_unreachable_without_cache_reports_unavailable(tmp_path: Path) -> None:
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline")

    client = httpx.Client(transport=httpx.MockTransport(refuse))
    with pytest.raises(SourceUnavailable):
        geocode("colombo", root=tmp_path, client=client)


@pytest.mark.parametrize(
    "payload",
    [
        {"unexpected": True},  # missing "results" key
        {"results": "not-a-list"},
        {"results": [{"latitude": 1.0, "longitude": 2.0}]},  # no name
        {"results": [{"name": "X", "latitude": 91.0, "longitude": 2.0}]},  # out of range
        {"results": [{"name": "X", "latitude": "NaN"}]},
    ],
)
def test_unexpected_payloads_are_rejected(payload: Any, tmp_path: Path) -> None:
    with pytest.raises(SourceFormatError):
        geocode("q", root=tmp_path, client=client_for(payload))


def test_blank_and_oversized_names_are_rejected(tmp_path: Path) -> None:
    for name in ("", "   ", "x" * 101):
        with pytest.raises(SourceFormatError):
            geocode(name, root=tmp_path, client=client_for(PAYLOAD))


def test_only_the_approved_geocoder_host_can_be_requested(tmp_path: Path) -> None:
    for url in (
        f"http://{HOST}/v1/search?name=x",
        "https://example.com/v1/search?name=x",
        f"https://user@{HOST}/v1/search?name=x",
    ):
        with pytest.raises(SourceFormatError):
            power_zarr.fetch(url, host=HOST, root=tmp_path, client=client_for({}))


@pytest.fixture
def api(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(
        geocode_module,
        "geocode",
        lambda name: geocode(name, root=tmp_path, client=client_for(PAYLOAD)),
    )
    return TestClient(create_app(), base_url="http://127.0.0.1")


def test_endpoint_returns_a_contract_valid_result(api: TestClient) -> None:
    response = api.get("/api/v1/geocode", params={"name": "colombo"})
    assert response.status_code == 200
    result = GeocodeResult.model_validate_json(response.text)
    assert result.query == "colombo" and len(result.candidates) == 2
    assert result.source.provider == "open-meteo-geocoding"
    assert result.source.scientifically_validated is False
    assert any("confirm the intended place" in c for c in result.source.caveats)


def test_endpoint_rejects_blank_and_maps_failures(api: TestClient) -> None:
    assert api.get("/api/v1/geocode").status_code == 422
    long_name = api.get("/api/v1/geocode", params={"name": "x" * 101})
    assert long_name.status_code == 422
