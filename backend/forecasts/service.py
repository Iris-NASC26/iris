"""Bounded publication and automatic refresh while the local backend runs."""

import logging
import os
import threading
from datetime import UTC, datetime, timedelta

from hazards.meteomatics import ForecastUnavailable
from hazards.rainfall import instant

from . import store, weather
from .catalog import REGIONS, region

logger = logging.getLogger(__name__)
_locks = {key: threading.Lock() for key in REGIONS}
_stop = threading.Event()
_worker = None


def fresh(value: dict, now: datetime | None = None) -> bool:
    return (now or datetime.now(UTC)) < instant(value["expires_at"])


def obtain(identifier: str, refresh: bool = False) -> dict:
    region(identifier)
    previous = store.get(identifier)
    now = datetime.now(UTC)
    # Explicit refresh is rate-limited to one download per location per 15 min.
    if previous and (
        fresh(previous, now)
        and not refresh
        or now - instant(previous["retrieved_at"]) < timedelta(minutes=15)
    ):
        return previous
    if not _locks[identifier].acquire(blocking=False):
        if previous and not refresh:
            return previous
        raise ForecastUnavailable(
            "This forecast is being prepared. Retry shortly.", 503
        )
    try:
        last = store.last_attempt(identifier)
        if last and last[1] and now - instant(last[0]) < timedelta(minutes=15):
            if previous and not refresh:
                return previous
            raise ForecastUnavailable(last[1])
        try:
            value = weather.retrieve(identifier)
            store.save(identifier, value)
            store.attempt(identifier)
            return value
        except ForecastUnavailable as exc:
            store.attempt(identifier, str(exc))
            if previous and not refresh:
                return previous
            raise
    finally:
        _locks[identifier].release()


def catalogue() -> dict:
    entries = []
    for identifier, point in REGIONS.items():
        value = store.get(identifier)
        last = store.last_attempt(identifier)
        entries.append(
            {
                "id": identifier,
                "location": point,
                "kind": "precipitation",
                "state": "fresh"
                if value and fresh(value)
                else "stale"
                if value
                else "unavailable",
                "retrieved_at": value["retrieved_at"] if value else None,
                "expires_at": value["expires_at"] if value else None,
                "peak_24h": value["peak_24h"] if value and fresh(value) else None,
                "valid_start": value["rows"][0]["start"] if value else None,
                "valid_end": value["rows"][-1]["end"] if value else None,
                "message": last[1] if last and last[1] else None,
                "artifact_id": value["artifact_id"] if value else None,
            }
        )
    return {
        "schema_version": "iris.forecast-catalogue.v1",
        "forecasts": entries,
        "scope": "six_configured_points_not_a_global_scan",
    }


def _refresh_loop():
    while not _stop.is_set():
        for identifier in REGIONS:
            if _stop.is_set():
                return
            try:
                obtain(identifier)
            except (ForecastUnavailable, OSError):
                logger.info("Forecast refresh unavailable for %s", identifier)
            except Exception:
                logger.exception("Forecast refresh failed for %s", identifier)
        _stop.wait(60)


def start():
    global _worker
    if (
        os.environ.get("FORECAST_REFRESH_ENABLED", "true").lower() == "false"
        or _worker
        and _worker.is_alive()
    ):
        return
    _stop.clear()
    _worker = threading.Thread(
        target=_refresh_loop, name="iris-forecast-refresh", daemon=True
    )
    _worker.start()


def stop():
    _stop.set()
