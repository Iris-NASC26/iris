"""Bounded, server-only Meteomatics access. Credentials never enter a URL/result."""

import hashlib
import json
import logging
import os
import threading
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
from dotenv import dotenv_values

from .catalog import case_by_id
from .rainfall import PARAMETER, iso, normalize

logger = logging.getLogger(__name__)
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
BASE = "https://api.meteomatics.com"
TTL = timedelta(minutes=15)
MAX_BYTES = 2 * 1024 * 1024
_lock = threading.Lock()
_slots = threading.BoundedSemaphore(2)
_cache: dict[tuple[str, str], tuple[datetime, dict]] = {}
_quota_day = None
_quota_count = 0


class ForecastUnavailable(RuntimeError):
    def __init__(self, message: str, status: int = 503):
        super().__init__(message)
        self.status = status


def credentials() -> tuple[str, str]:
    config = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    user = os.environ.get("METEOMATICS_USERNAME") or config.get("METEOMATICS_USERNAME")
    password = os.environ.get("METEOMATICS_PASSWORD") or config.get(
        "METEOMATICS_PASSWORD"
    )
    if not user or not password:
        raise ForecastUnavailable(
            "Meteomatics credentials are missing. Configure METEOMATICS_USERNAME and METEOMATICS_PASSWORD in backend/.env."
        )
    return user, password


def forecast(case_id: str) -> dict:
    case = case_by_id(case_id)
    auth = credentials()
    # A credential change cannot expose another account's cached response.
    identity = hashlib.sha256(json.dumps(auth).encode()).hexdigest()
    key = (case_id, identity)
    now = datetime.now(UTC)
    with _lock:
        cached = _cache.get(key)
        if cached and now < cached[0]:
            result = deepcopy(cached[1])
            result["from_cache"] = True
            return result
    if not _slots.acquire(blocking=False):
        raise ForecastUnavailable(
            "Two forecast requests are already active. Retry when one finishes.", 429
        )
    try:
        global _quota_day, _quota_count
        with _lock:
            if _quota_day != now.date():
                _quota_day, _quota_count = now.date(), 0
            if _quota_count >= 100:
                raise ForecastUnavailable(
                    "The local daily forecast query budget has been reached.", 429
                )
            _quota_count += 1
        # Every returned one-hour interval lies wholly after request time.
        start = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=2)
        end = start + timedelta(hours=71)
        url = f"{BASE}/{iso(start)}--{iso(end)}:PT1H/{PARAMETER}/{case['latitude']},{case['longitude']}/json"
        with (
            httpx.Client(auth=auth, timeout=30, follow_redirects=False) as client,
            client.stream(
                "GET",
                url,
                params={"source": "mix", "timeout": 20},
                headers={"Accept": "application/json"},
            ) as response,
        ):
            if response.status_code != 200:
                logger.warning(
                    "Rainfall provider access failed (HTTP %s)",
                    response.status_code,
                )
                if response.status_code in (401, 403):
                    raise ForecastUnavailable(
                        "Meteomatics access was refused. Check credentials and precipitation entitlements."
                    )
                if response.status_code == 429:
                    raise ForecastUnavailable(
                        "Meteomatics quota is temporarily exhausted.", 429
                    )
                raise ForecastUnavailable(
                    "The rainfall provider is unavailable for this request."
                )
            chunks, size = [], 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > MAX_BYTES:
                    raise ForecastUnavailable(
                        "Provider response exceeded the permitted size.", 502
                    )
                chunks.append(chunk)
        raw = b"".join(chunks)
        retrieved = datetime.now(UTC)
        try:
            normalized = normalize(
                json.loads(raw),
                case["latitude"],
                case["longitude"],
                start,
                72,
                retrieved,
            )
        except (ValueError, TypeError, KeyError, AttributeError) as exc:
            logger.warning(
                "Rainfall provider response failed validation (%s)", type(exc).__name__
            )
            raise ForecastUnavailable(
                "The provider response could not be validated; no forecast was displayed.",
                502,
            ) from None
        expires = retrieved + TTL
        result = {
            "schema_version": "iris.rainfall-outlook.v1",
            "case_id": case_id,
            "provider": "Meteomatics",
            "requested_source": "mix",
            "parameter": PARAMETER,
            "units": "mm",
            "interval": "preceding_one_hour",
            "time_standard": "UTC",
            "quantity": "total_precipitation_water_equivalent",
            "latitude": case["latitude"],
            "longitude": case["longitude"],
            "spatial_support": "point",
            "retrieved_at": iso(retrieved),
            "expires_at": iso(expires),
            "from_cache": False,
            "forecast_initialization_at": None,
            "source_url": url + "?source=mix",
            "source_response_sha256": hashlib.sha256(raw).hexdigest(),
            "warning_state": "not_evaluated",
            "hazard_model_validated": False,
            "caveats": [
                "Provider point rainfall outlook; not a NASA forecast, flood probability or official warning.",
                "Response generation time is not model initialization time; historical issue-time replay is not verified.",
                "Point rainfall alone cannot estimate basin flooding, landslides or cyclone tracks.",
            ],
            **normalized,
        }
        with _lock:
            # Expired entries and obsolete credentials are not retained indefinitely.
            for old_key in list(_cache):
                if old_key[0] == case_id or _cache[old_key][0] <= retrieved:
                    del _cache[old_key]
            _cache[key] = (expires, deepcopy(result))
        return result
    except httpx.HTTPError:
        logger.warning("Rainfall provider request failed")
        raise ForecastUnavailable(
            "The rainfall provider could not be reached. Retry later."
        ) from None
    finally:
        _slots.release()
