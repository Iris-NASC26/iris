"""Bounded Open-Meteo geocoding lookup for place names.

Ported from the iris geocoder with the POWER reader's discipline: one fixed
HTTPS host, no redirects, a size cap, and a SHA-256-verified local cache that can
serve a stale copy (disclosed) when the provider is unreachable. Suggestions are
provider output, not verified geography — the UI must let the user confirm.
Unlike the iris version, no bounding box is fabricated from the feature type;
only fields the provider actually returns are used.
"""

import json
import math
import urllib.parse
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from .power_zarr import Fetched, SourceFormatError, fetch

HOST = "geocoding-api.open-meteo.com"
MAX_RESULTS = 5
MAX_NAME_LENGTH = 100


@dataclass(frozen=True)
class Candidate:
    name: str
    country: str | None
    admin1: str | None
    lat: float
    lon: float


@dataclass(frozen=True)
class Lookup:
    query: str
    candidates: list[Candidate]
    artifact_hashes: dict[str, str]
    retrieved_at: datetime
    from_cache: bool
    stale_cache: bool


def _text(value: Any) -> str | None:
    return value if isinstance(value, str) and value.strip() else None


def _number(value: Any) -> float | None:
    return float(value) if isinstance(value, (int, float)) and math.isfinite(value) else None


def geocode(
    name: str,
    *,
    root: Path | None = None,
    client: httpx.Client | None = None,
) -> Lookup:
    """Return up to five provider-suggested places for a name. An empty list means no match."""
    clean = name.strip()
    if not clean or len(clean) > MAX_NAME_LENGTH:
        raise SourceFormatError("Place name is empty or too long")
    query = urllib.parse.urlencode(
        {"name": clean, "count": MAX_RESULTS, "language": "en", "format": "json"}
    )
    url = f"https://{HOST}/v1/search?{query}"
    item: Fetched = fetch(url, host=HOST, cache="geocode", root=root, client=client)
    try:
        payload: Any = json.loads(item.body)
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise SourceFormatError("Geocoder returned unreadable JSON") from error
    if not isinstance(payload, dict) or "results" not in payload:
        raise SourceFormatError("Geocoder response lacks the expected shape")
    results = payload["results"] or []
    if not isinstance(results, list):
        raise SourceFormatError("Geocoder results are not a list")
    candidates: list[Candidate] = []
    for entry in results[:MAX_RESULTS]:
        if not isinstance(entry, dict):
            raise SourceFormatError("Geocoder entry is not an object")
        name_text = _text(entry.get("name"))
        lat, lon = _number(entry.get("latitude")), _number(entry.get("longitude"))
        if name_text is None or lat is None or lon is None:
            raise SourceFormatError("Geocoder entry lacks a name or coordinates")
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            raise SourceFormatError("Geocoder coordinates are out of range")
        candidates.append(
            Candidate(
                name=name_text,
                country=_text(entry.get("country")),
                admin1=_text(entry.get("admin1")),
                lat=lat,
                lon=lon,
            )
        )
    return Lookup(
        query=clean,
        candidates=candidates,
        artifact_hashes={"/v1/search": item.sha256},
        retrieved_at=datetime.now(UTC),
        from_cache=item.cached,
        stale_cache=item.stale,
    )
