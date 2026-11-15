"""Bounded NASA POWER historical context; never an issue-time forecast archive."""

import hashlib
import json
import math
import os
import tempfile
import threading
from copy import deepcopy
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import httpx

from .catalog import case_by_id
from .meteomatics import ForecastUnavailable
from .rainfall import iso

BASE = "https://power.larc.nasa.gov/api/temporal/daily/point"
_slots = threading.BoundedSemaphore(2)
_cache: dict[str, dict] = {}
_retention_lock = threading.Lock()
CACHE_DIRECTORY = (
    Path(__file__).resolve().parents[2] / "artifacts" / "runtime" / "hazards" / "nasa"
)


def normalize_history(payload: dict, case: dict) -> list[dict]:
    header = payload.get("header", {})
    if (
        header.get("time_standard") != "UTC"
        or payload.get("parameters", {}).get("PRECTOTCORR", {}).get("units") != "mm/day"
    ):
        raise ValueError("NASA precipitation units or time standard did not match.")
    coords = payload.get("geometry", {}).get("coordinates", [])
    if (
        len(coords) < 2
        or any(
            isinstance(v, bool)
            or not isinstance(v, (int, float))
            or not math.isfinite(v)
            for v in coords[:2]
        )
        or abs(coords[0] - case["longitude"]) > 0.001
        or abs(coords[1] - case["latitude"]) > 0.001
    ):
        raise ValueError("NASA sample coordinates did not match.")
    values = payload.get("properties", {}).get("parameter", {}).get("PRECTOTCORR")
    fill = header.get("fill_value")
    if (
        not isinstance(values, dict)
        or isinstance(fill, bool)
        or not isinstance(fill, (int, float))
        or not math.isfinite(fill)
        or fill >= 0
    ):
        raise ValueError("NASA precipitation metadata or observations are incomplete.")
    start, end = (
        date.fromisoformat(case["history_start"]),
        date.fromisoformat(case["history_end"]),
    )
    expected = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    if not set(values).issubset({d.strftime("%Y%m%d") for d in expected}):
        raise ValueError("NASA returned dates outside the requested event window.")
    rows = []
    for day in expected:
        value = values.get(day.strftime("%Y%m%d"))
        if value is None or value == fill:
            value = None
        elif (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value < 0
        ):
            raise ValueError("NASA returned invalid precipitation values.")
        rows.append(
            {
                "timestamp": day.isoformat(),
                "value": value,
                "qa": "usable" if value is not None else "missing",
            }
        )
    return rows


def retain_source(raw: bytes, digest: str) -> None:
    with _retention_lock:
        _retain_source(raw, digest)


def _retain_source(raw: bytes, digest: str) -> None:
    """Atomically retain bounded public evidence, never credentials or runtime state.

    Only two small, fixed event windows are accepted. Keep at most 10 MiB of
    source responses across restarts; older responses can be removed manually.
    Refuse a new download when full instead of deleting cited evidence.
    """
    try:
        CACHE_DIRECTORY.mkdir(parents=True, exist_ok=True)
        target = CACHE_DIRECTORY / f"{digest}.json"
        if target.exists():
            return
        if (
            sum(p.stat().st_size for p in CACHE_DIRECTORY.glob("*.json")) + len(raw)
            > 10 * 1024 * 1024
        ):
            raise ForecastUnavailable(
                "Historical evidence storage is full. Archive the saved NASA responses before retrying."
            )
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(
                dir=CACHE_DIRECTORY, suffix=".tmp", delete=False
            ) as handle:
                temporary = Path(handle.name)
                handle.write(raw)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, target)
        finally:
            if temporary and temporary.exists():
                temporary.unlink()
    except OSError:
        raise ForecastUnavailable(
            "The NASA evidence response could not be retained locally; check storage access."
        ) from None


def history(case_id: str) -> dict:
    case = case_by_id(case_id)
    if case_id in _cache:
        return {**deepcopy(_cache[case_id]), "from_cache": True}
    if not _slots.acquire(blocking=False):
        raise ForecastUnavailable(
            "Two historical-context requests are already active.", 429
        )
    try:
        params = {
            "parameters": "PRECTOTCORR",
            "community": "AG",
            "latitude": case["latitude"],
            "longitude": case["longitude"],
            "start": case["history_start"].replace("-", ""),
            "end": case["history_end"].replace("-", ""),
            "format": "JSON",
            "time-standard": "UTC",
        }
        with (
            httpx.Client(timeout=35, follow_redirects=False) as client,
            client.stream("GET", BASE, params=params) as response,
        ):
            if response.status_code != 200:
                raise ForecastUnavailable(
                    "NASA POWER historical context is unavailable."
                )
            chunks, size = [], 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > 2 * 1024 * 1024:
                    raise ForecastUnavailable(
                        "NASA context response exceeded the permitted size.", 502
                    )
                chunks.append(chunk)
            source_url = str(response.url)
        raw = b"".join(chunks)
        try:
            payload = json.loads(raw)
            rows = normalize_history(payload, case)
        except (ValueError, TypeError, KeyError, AttributeError):
            raise ForecastUnavailable(
                "NASA historical context failed validation; no observations were substituted.",
                502,
            ) from None
        digest = hashlib.sha256(raw).hexdigest()
        # Keep the original public NASA response for reproducibility, away from
        # the existing durable application store and source-controlled fixtures.
        retain_source(raw, digest)
        result = {
            "schema_version": "iris.hazard-history.v1",
            "case_id": case_id,
            "provider": "NASA POWER",
            "parameter": "PRECTOTCORR",
            "units": "mm/day",
            "time_standard": "UTC",
            "spatial_support": "point",
            "latitude": case["latitude"],
            "longitude": case["longitude"],
            "reported_coordinates": payload["geometry"]["coordinates"],
            "retrieved_at": iso(datetime.now(UTC)),
            "source_url": source_url,
            "source_response_sha256": digest,
            "source_title": payload["header"].get("title"),
            "source_datasets": payload["header"].get("sources"),
            "as_of_availability_verified": False,
            "purpose": "retrospective_context",
            "from_cache": False,
            "rows": rows,
            "caveat": "Daily coarse-grid reanalysis sampled at one point and retrieved now. This is not proof of what was available before the event and cannot resolve basin flooding or a cyclone track.",
        }
        _cache[case_id] = deepcopy(result)
        return result
    except httpx.HTTPError:
        raise ForecastUnavailable(
            "NASA POWER historical context could not be reached."
        ) from None
    finally:
        _slots.release()
