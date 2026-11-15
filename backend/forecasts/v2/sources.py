"""Meteomatics *historical* source adapter — bounded, chunked, resumable.

Hard rules enforced here:
- Only past intervals may be requested; any window touching the future raises.
- Daily accumulation parameter (precip_24h:mm) — never a rate converted later.
- Source identity is explicit (era5 reanalysis vs station mix vs others); the
  declared availability lag separates retrospective evidence from what an
  operational system could have known.
- Credentials stay server-side; persisted metadata never contains auth.

Transport is injectable so tests exercise the real URL/chunking/budget logic
without network. Production lazily imports httpx.
"""
from __future__ import annotations

import hashlib
import json
import os
import random
import time
from datetime import UTC, datetime, timedelta

BASE = "https://api.meteomatics.com"
PARAM_DAILY = "precip_24h:mm"


def _credentials():
    """Lazy import — hazards.meteomatics requires httpx which may be absent
    in minimal test environments."""
    from hazards import meteomatics
    return meteomatics.credentials()

SOURCE_OPTIONS = {
    # source_id -> (meteomatics source param, declared availability lag in hours,
    #               operational_role)
    "era5": ("ecmwf-era5", 24 * 6, "retrospective"),  # ERA5 finalization lag ~5d; 6d conservative
    "mix": ("mix", 3, "operational"),                  # station/model blend near-real-time
}

CHUNK_DAYS = 366
MAX_RESPONSE_BYTES = 8 * 1024 * 1024


class SourceError(RuntimeError):
    def __init__(self, message: str, status: int = 503, retry_after: float | None = None):
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after


def _default_transport(url: str, auth, params: dict, timeout: float) -> tuple[int, bytes, dict]:
    """Real HTTP via httpx — imported lazily so this module stays dependency-free."""
    try:
        import httpx
    except ImportError:
        raise SourceError("httpx is not installed in this environment; live requests unavailable.", 503)
    with httpx.Client(auth=auth, timeout=timeout, follow_redirects=False) as client:
        r = client.get(url, params=params, headers={"Accept": "application/json"})
    body = r.content
    if len(body) > MAX_RESPONSE_BYTES:
        raise SourceError("Response exceeded the bounded size limit.", 502)
    headers = {k.lower(): v for k, v in r.headers.items()}
    return r.status_code, body, headers


def _iso(dt: datetime) -> str:
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def assert_historical(start: datetime, end: datetime, now: datetime | None = None) -> None:
    """Network-level guard: refuse any request whose interval touches the future."""
    now = now or datetime.now(UTC)
    if end > now or start >= end:
        raise SourceError(
            "History requests must end strictly before now; future/forecast timestamps are prohibited.",
            422,
        )


def chunks(start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    out = []
    cur = start
    while cur < end:
        nxt = min(cur + timedelta(days=CHUNK_DAYS), end)
        out.append((cur, nxt))
        cur = nxt
    return out


def parse_daily_payload(body: bytes, source_id: str, location_id: str,
                        lat: float, lon: float) -> tuple[list[dict], str]:
    """Meteomatics JSON -> raw record dicts for qa.normalize + response hash.

    precip_24h:mm daily values are interval accumulations ending at each
    timestamp; interval_start = end - 1 day. No rate conversion anywhere.
    """
    digest = hashlib.sha256(body).hexdigest()
    try:
        data = json.loads(body)
        coords = data["data"][0]["coordinates"][0]["dates"]
    except (KeyError, IndexError, json.JSONDecodeError, TypeError) as e:
        raise SourceError(f"Unparseable history response: {e}", 502)
    rows = []
    for item in coords:
        end_s = item.get("date")
        value = item.get("value")
        try:
            end = datetime.fromisoformat(end_s.replace("Z", "+00:00"))
        except (AttributeError, ValueError):
            rows.append({"variable": "precip_24h", "interval_start": "", "interval_end": str(end_s),
                         "value": None})
            continue
        rows.append({
            "location_id": location_id, "source_id": source_id,
            "lat": lat, "lon": lon,
            "variable": "precip_24h", "unit": "mm",
            "interval_start": (end - timedelta(days=1)).isoformat(),
            "interval_end": end.isoformat(),
            "value": value,
            "retrieved_at": _iso(datetime.now(UTC)),
        })
    return rows, digest


def fetch_history(location_id: str, lat: float, lon: float, source_id: str,
                  start: datetime, end: datetime,
                  *, transport=None, budget: dict | None = None,
                  checkpoint: dict | None = None, now: datetime | None = None,
                  sleep=time.sleep, rng: random.Random | None = None) -> dict:
    """Chunked bounded retrieval. Returns {records_raw, chunks, skipped, exhausted}.

    budget: {"remaining": n} shared account budget — decremented per request;
            stops with exhausted=True when empty.
    checkpoint: {"chunk_index": i} resumes after the completed chunk index.
    """
    if source_id not in SOURCE_OPTIONS:
        raise SourceError(f"Unknown source '{source_id}'. Choose from {sorted(SOURCE_OPTIONS)}.", 422)
    assert_historical(start, end, now)
    transport = transport or _default_transport
    rng = rng or random.Random()
    param_source, lag_hours, role = SOURCE_OPTIONS[source_id]
    auth = _credentials()
    plan = chunks(start, end)
    done = int((checkpoint or {}).get("chunk_index", -1))
    rows: list[dict] = []
    hashes: list[str] = []
    exhausted = False
    for i, (c0, c1) in enumerate(plan):
        if i <= done:
            continue
        if budget is not None and budget["remaining"] <= 0:
            exhausted = True
            break
        url = (f"{BASE}/{_iso(c0)}--{_iso(c1)}:P1D/{PARAM_DAILY}/"
               f"{lat},{lon}/json")
        for attempt in range(4):
            status, body, headers = transport(url, auth, {"source": param_source}, 30.0)
            if status == 200:
                break
            if status == 429:
                ra = headers.get("retry-after")
                wait = min(float(ra) if ra and ra.replace(".", "").isdigit() else 2 ** attempt, 60.0)
                sleep(wait + rng.random())
                continue
            if status in (401, 403):
                raise SourceError(
                    f"Meteomatics refused '{source_id}' history (HTTP {status}); "
                    "check account entitlements for this source.", status)
            if status in (404, 400):
                raise SourceError(
                    f"Source '{source_id}' has no usable history for this request (HTTP {status}).", status)
            if status >= 500 and attempt < 3:
                sleep(min(2 ** attempt, 30) + rng.random())
                continue
            raise SourceError(f"History request failed (HTTP {status}).", status)
        else:
            raise SourceError("Retry budget exhausted on a history chunk.", 503)
        if budget is not None:
            budget["remaining"] -= 1
        chunk_rows, digest = parse_daily_payload(body, source_id, location_id, lat, lon)
        for r in chunk_rows:
            r["source_artifact_hash"] = digest
            r["declared_availability_lag_hours"] = lag_hours
            r["source_role"] = role
        rows.extend(chunk_rows)
        hashes.append(digest)
        done = i
    return {
        "records_raw": rows,
        "next_checkpoint": {"chunk_index": done},
        "exhausted": exhausted,
        "chunk_hashes": hashes,
        "source": {"id": source_id, "meteomatics_param": param_source,
                   "declared_availability_lag_hours": lag_hours, "role": role},
    }
