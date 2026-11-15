"""NASA POWER daily historical adapter — public access, point + real areas.

NASA POWER is a *distinct* source from the MERRA-2 Giovanni product used by
`merra2_t2m` models, even though POWER ingests related reanalysis. It is
never appended to another source's staged series; source identity, units and
grid are validated at parse time, and `T2M` degrees-C are converted to kelvin
explicitly for the `power_t2m` target contract (original unit preserved in
provenance).

Access needs no Earthdata token — the POWER API is public. Only past
intervals may be requested; provider future values remain prohibited.

Area path (`fetch_area`): the regional endpoint returns *native* grid-cell
series (0.5° lat x 0.625° lon). Cells count toward the requested support only
when the cell centre lies inside the requested box (documented cell-centre
inclusion, not boundary clipping); weights are cos(lat) area weights —
correct for a regular lon/lat grid as an approximation of spherical cell
areas. Boundary cells with centres outside never contribute. There is NO
centroid/point fallback: a box the provider cannot serve raises a typed
error. POWER requires >= 2° latitude span for regional requests.
"""
from __future__ import annotations

import hashlib
import json
import math
import random
import time
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

BASE = "https://power.larc.nasa.gov/api/temporal/daily"
SOURCE_ID = "nasa_power"
GRID_LAT_DEG = 0.5
GRID_LON_DEG = 0.625
MIN_REGIONAL_LAT_SPAN_DEG = 2.0   # POWER regional API requirement
MAX_REGIONAL_SPAN_DEG = 20.0
MAX_RESPONSE_BYTES = 16 * 1024 * 1024
# cells x days fetched per request session; regional responses are large.
MAX_CELL_DAYS = 600_000
CHUNK_DAYS = 366 * 2
# Documented estimate only — POWER daily publication typically runs ~2-3 days
# behind; we do not claim a verified issue-time archive.
DELAY_HOURS = 72.0
MIN_AREA_FRACTION = 0.6  # documented minimum valid-area coverage per interval
AGGREGATION_POLICY = "coslat_weighted_mean_v1"

PARAMETERS = {
    "power_t2m": {"param": "T2M", "native_unit": "C", "offset": 273.15,
                  "target_unit": "K", "aggregation": "mean"},
}

CAPABILITY = {
    "source_id": SOURCE_ID,
    "provider": "NASA POWER (LaRC)",
    "access": "public REST API — no authentication or Earthdata token",
    "requires_credentials": False,
    "spatial_modes": ["point", "area_mean"],
    "native_cadence": "daily",
    "grid": {"lat_deg": GRID_LAT_DEG, "lon_deg": GRID_LON_DEG,
             "note": "regular lon/lat cells; values are cell means"},
    "regional_limits": {"min_lat_span_deg": MIN_REGIONAL_LAT_SPAN_DEG,
                        "max_span_deg": MAX_REGIONAL_SPAN_DEG,
                        "max_cell_days": MAX_CELL_DAYS},
    "availability_basis": "estimated ~72h publication delay; not a verified archive",
    "delay_hours": DELAY_HOURS,
    "incremental_update": {"overlap_days": 14,
                           "revisions": "refetched recent values replace staged values and are logged"},
    "aggregation_policy": AGGREGATION_POLICY,
    "docs": "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
    "parameters": {k: {"param": v["param"], "native_unit": v["native_unit"],
                       "target_unit": v["target_unit"],
                       "conversion": f"{v['param']} + {v['offset']}"}
                   for k, v in PARAMETERS.items()},
}


class PowerError(RuntimeError):
    def __init__(self, message: str, status: int = 503,
                 reason: str = "retrieval_failure"):
        super().__init__(message)
        self.status = status
        self.reason = reason  # typed: unsupported|rate_limited|retrieval_failure|empty


def _default_transport(url: str, timeout: float) -> tuple[int, bytes, dict]:
    try:
        import httpx
    except ImportError:
        raise PowerError("httpx is not installed; live POWER requests unavailable.", 503)
    with httpx.Client(timeout=timeout, follow_redirects=False) as client:
        r = client.get(url)
    if len(r.content) > MAX_RESPONSE_BYTES:
        raise PowerError("NASA POWER response exceeded the bounded size.", 502)
    return r.status_code, r.content, {k.lower(): v for k, v in r.headers.items()}


def _day(key: str) -> datetime | None:
    if len(key) != 8 or not key.isdigit():
        return None
    try:
        return datetime(int(key[:4]), int(key[4:6]), int(key[6:8]), tzinfo=UTC)
    except ValueError:
        return None


def _chunks(start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    out, cur = [], start
    while cur < end:
        nxt = min(cur + timedelta(days=CHUNK_DAYS), end)
        out.append((cur, nxt))
        cur = nxt
    return out


def estimate_area(bbox: tuple[float, float, float, float],
                  start: datetime, end: datetime) -> dict:
    """Pre-retrieval budget: native cells, days, total cell-day values."""
    w, s, e, n = bbox
    cells_lon = math.ceil((e - w) / GRID_LON_DEG)
    cells_lat = math.ceil((n - s) / GRID_LAT_DEG)
    days = max(0, (end - start).days)
    cell_days = cells_lon * cells_lat * days
    reasons = []
    if n - s < MIN_REGIONAL_LAT_SPAN_DEG:
        reasons.append(
            f"NASA POWER regional requests need at least {MIN_REGIONAL_LAT_SPAN_DEG:g}° "
            "of latitude span; this box cannot be served as an area (never a centroid).")
    if e - w > MAX_REGIONAL_SPAN_DEG or n - s > MAX_REGIONAL_SPAN_DEG:
        reasons.append(f"Regional span is limited to {MAX_REGIONAL_SPAN_DEG:g}° per side.")
    if cell_days > MAX_CELL_DAYS:
        reasons.append(
            f"Estimated {cell_days:,} cell-days exceed the {MAX_CELL_DAYS:,} budget; "
            "choose a smaller area or shorter span.")
    return {"cells_lon": cells_lon, "cells_lat": cells_lat,
            "estimated_cells": cells_lon * cells_lat, "days": days,
            "cell_days": cell_days, "within_budget": not reasons,
            "reasons": reasons}


def _record(target: str, start: datetime, value: float | None,
            *, lat: float, lon: float, digest: str, retrieved: datetime,
            extra: dict | None = None) -> dict:
    p = PARAMETERS[target]
    return {"location_id": "", "source_id": SOURCE_ID,
            "lat": lat, "lon": lon,
            "variable": target, "unit": p["target_unit"],
            "interval_start": start.isoformat(),
            "interval_end": (start + timedelta(days=1)).isoformat(),
            "value": value,
            "retrieved_at": retrieved.isoformat(),
            "available_at": (start + timedelta(days=1) + timedelta(hours=DELAY_HOURS)).isoformat(),
            "source_artifact_hash": digest,
            "source_role": "delayed-near-real-time",
            "provenance": {"native_unit": p["native_unit"],
                           "conversion": f"value + {p['offset']}",
                           "provider": "NASA POWER"},
            **(extra or {})}


def parse_point_payload(body: bytes, target: str, lat: float, lon: float,
                        retrieved: datetime) -> list[dict]:
    p = PARAMETERS[target]
    try:
        payload = json.loads(body)
        series = payload["properties"]["parameter"][p["param"]]
    except (KeyError, json.JSONDecodeError, TypeError) as e:
        raise PowerError(f"Unparseable NASA POWER point response: {e}", 502)
    fill = float(payload.get("header", {}).get("fill_value", -999.0))
    digest = hashlib.sha256(body).hexdigest()
    rows = []
    for key, raw in series.items():
        day = _day(key)
        if day is None:
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(value) or value == fill:
            continue
        rows.append(_record(target, day, value + p["offset"],
                            lat=lat, lon=lon, digest=digest, retrieved=retrieved))
    return rows


def reduce_area(features: list[dict], target: str,
                bbox: tuple[float, float, float, float],
                digest: str, retrieved: datetime,
                fill: float = -999.0) -> dict:
    """Cos-latitude weighted daily mean over cells whose centre is in the box.

    Returns {records, coverage} — one record per day meeting the valid-area
    policy; coverage lists every interval's support accounting for sidecars.
    """
    p = PARAMETERS[target]
    w, s, e, n = bbox
    cells = []
    for feat in features:
        coords = (feat.get("geometry") or {}).get("coordinates") or []
        series = (feat.get("properties") or {}).get("parameter", {}).get(p["param"])
        if len(coords) < 2 or not isinstance(series, dict):
            continue
        clon, clat = float(coords[0]), float(coords[1])
        eligible = w <= clon <= e and s <= clat <= n
        cells.append({"lat": clat, "lon": clon, "series": series,
                      "eligible": eligible,
                      "weight": math.cos(math.radians(clat)) if eligible else 0.0})
    eligible = [c for c in cells if c["eligible"]]
    # Expected support comes from the grid contract, not the response —
    # a cell missing entirely from the payload must not shrink the basis.
    expected = (math.ceil((e - w) / GRID_LON_DEG)
                * math.ceil((n - s) / GRID_LAT_DEG))
    total_weight = sum(c["weight"] for c in eligible)
    days = sorted({k for c in eligible for k in c["series"] if _day(k)})
    records, coverage = [], []
    for key in days:
        day = _day(key)
        valid = []
        for c in eligible:
            raw = c["series"].get(key)
            try:
                v = float(raw)
            except (TypeError, ValueError):
                continue
            if math.isfinite(v) and v != fill:
                valid.append((v, c["weight"]))
        valid_weight = sum(wt for _, wt in valid)
        fraction = valid_weight / total_weight if total_weight > 0 else 0.0
        coverage.append({"interval_start": day.isoformat(),
                         "interval_end": (day + timedelta(days=1)).isoformat(),
                         "expected_cells": expected,
                         "eligible_cells": len(eligible),
                         "valid_cells": len(valid),
                         "valid_area_fraction": round(fraction, 4),
                         "support": "cell-centre inclusion; cos(lat) weights"})
        if fraction < MIN_AREA_FRACTION:
            # Missing, not zero-filled — coverage.json explains the shortfall.
            records.append(_record(
                target, day, None,
                lat=(s + n) / 2, lon=(w + e) / 2, digest=digest, retrieved=retrieved,
                extra={"quarantine_hint": f"insufficient_area_coverage:{fraction:.2f}"}))
            continue
        mean = sum(v * wt for v, wt in valid) / valid_weight
        records.append(_record(
            target, day, mean + p["offset"],
            lat=(s + n) / 2, lon=(w + e) / 2, digest=digest, retrieved=retrieved,
            extra={"area_cells": len(eligible), "area_valid_cells": len(valid),
                   "area_valid_fraction": round(fraction, 4),
                   "spatial_support": "area_mean"}))
    return {"records": records, "coverage": coverage,
            "eligible_cells": len(eligible), "queried_cells": len(cells),
            "expected_cells": expected}


def parse_area_payload(body: bytes, target: str,
                       bbox: tuple[float, float, float, float],
                       retrieved: datetime) -> dict:
    try:
        payload = json.loads(body)
        features = payload.get("features", [])
    except json.JSONDecodeError as e:
        raise PowerError(f"Unparseable NASA POWER regional response: {e}", 502)
    fill = float(payload.get("header", {}).get("fill_value", -999.0))
    digest = hashlib.sha256(body).hexdigest()
    return reduce_area(features, target, bbox, digest, retrieved, fill)


def _get(url: str, *, transport, sleep=time.sleep, rng=None, timeout: float = 60.0):
    rng = rng or random.Random()
    for attempt in range(4):
        status, body, headers = transport(url, timeout)
        if status == 200:
            return body
        if status == 429:
            ra = headers.get("retry-after")
            sleep(min(float(ra) if ra and ra.replace(".", "").isdigit()
                      else 2 ** attempt, 60.0) + rng.random())
            continue
        if status >= 500 and attempt < 3:
            sleep(min(2 ** attempt, 30) + rng.random())
            continue
        reason = "rate_limited" if status == 429 else "retrieval_failure"
        raise PowerError(f"NASA POWER request failed (HTTP {status}).", status,
                         reason=reason)
    raise PowerError("NASA POWER retry budget exhausted.", 503, reason="rate_limited")


def fetch_point(target: str, lat: float, lon: float,
                start: datetime, end: datetime, *,
                transport=None, budget: dict | None = None,
                checkpoint: dict | None = None,
                sleep=time.sleep, rng=None, now: datetime | None = None) -> dict:
    """Bounded daily point history -> raw records (kelvin)."""
    if target not in PARAMETERS:
        raise PowerError(f"NASA POWER does not serve target '{target}' here.", 422,
                         reason="unsupported")
    now = now or datetime.now(UTC)
    if start >= end or end > now:
        raise PowerError("History requests must contain past intervals only.", 422,
                         reason="unsupported")
    transport = transport or _default_transport
    p = PARAMETERS[target]
    plan = _chunks(start, end)
    done = int((checkpoint or {}).get("chunk_index", -1))
    rows, hashes, exhausted = [], [], False
    for i, (c0, c1) in enumerate(plan):
        if i <= done:
            continue
        if budget is not None and budget["remaining"] <= 0:
            exhausted = True
            break
        url = (f"{BASE}/point?" + urlencode({
            "parameters": p["param"], "community": "ag",
            "longitude": f"{lon:.4f}", "latitude": f"{lat:.4f}",
            "start": c0.strftime("%Y%m%d"), "end": (c1 - timedelta(days=1)).strftime("%Y%m%d"),
            "format": "JSON"}))
        body = _get(url, transport=transport, sleep=sleep, rng=rng)
        if budget is not None:
            budget["remaining"] -= 1
        chunk = parse_point_payload(body, target, lat, lon, now)
        rows.extend(chunk)
        hashes.append(hashlib.sha256(body).hexdigest())
        done = i
    return {"records_raw": rows, "next_checkpoint": {"chunk_index": done},
            "exhausted": exhausted, "chunk_hashes": hashes,
            "coverage": None,
            "source": {"id": SOURCE_ID, "mode": "point",
                       "declared_availability_delay_hours": DELAY_HOURS,
                       "note": "nearest NASA POWER grid cell"}}


def fetch_area(target: str, bbox: tuple[float, float, float, float],
               start: datetime, end: datetime, *,
               transport=None, budget: dict | None = None,
               checkpoint: dict | None = None,
               sleep=time.sleep, rng=None, now: datetime | None = None) -> dict:
    """Bounded regional history -> aggregated area-mean records + coverage.

    Requested geometry stays the user bbox; the provider's enclosing query
    window may return extra cells, which are subset away — never widened
    support. No centroid fallback exists here: unservable boxes raise.
    """
    if target not in PARAMETERS:
        raise PowerError(f"NASA POWER does not serve target '{target}' here.", 422,
                         reason="unsupported")
    now = now or datetime.now(UTC)
    if start >= end or end > now:
        raise PowerError("History requests must contain past intervals only.", 422,
                         reason="unsupported")
    est = estimate_area(bbox, start, end)
    if not est["within_budget"]:
        raise PowerError(" ".join(est["reasons"]), 422, reason="unsupported")
    transport = transport or _default_transport
    p = PARAMETERS[target]
    w, s, e, n = bbox
    plan = _chunks(start, end)
    done = int((checkpoint or {}).get("chunk_index", -1))
    rows, hashes, exhausted, coverage = [], [], False, []
    for i, (c0, c1) in enumerate(plan):
        if i <= done:
            continue
        if budget is not None and budget["remaining"] <= 0:
            exhausted = True
            break
        url = (f"{BASE}/regional?" + urlencode({
            "parameters": p["param"], "community": "ag",
            "longitude-min": f"{w:.4f}", "longitude-max": f"{e:.4f}",
            "latitude-min": f"{s:.4f}", "latitude-max": f"{n:.4f}",
            "start": c0.strftime("%Y%m%d"), "end": (c1 - timedelta(days=1)).strftime("%Y%m%d"),
            "format": "JSON"}))
        body = _get(url, transport=transport, sleep=sleep, rng=rng, timeout=120.0)
        if budget is not None:
            budget["remaining"] -= 1
        out = parse_area_payload(body, target, bbox, now)
        rows.extend(out["records"])
        coverage.extend(out["coverage"])
        hashes.append(hashlib.sha256(body).hexdigest())
        done = i
    return {"records_raw": rows, "next_checkpoint": {"chunk_index": done},
            "exhausted": exhausted, "chunk_hashes": hashes,
            "coverage": coverage,
            "source": {"id": SOURCE_ID, "mode": "area_mean",
                       "declared_availability_delay_hours": DELAY_HOURS,
                       "aggregation_policy": AGGREGATION_POLICY,
                       "grid": CAPABILITY["grid"],
                       "note": "cos(lat)-weighted mean over in-box cell centres"}}
