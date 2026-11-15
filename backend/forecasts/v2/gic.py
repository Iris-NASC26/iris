"""Authenticated Giovanni point histories; exact source, units and grid checked.

Several years are extracted per bounded request instead of downloading global
hourly granules. Only complete UTC days enter the native forecast dataset.
"""
from __future__ import annotations

import csv
import hashlib
import io
import math
from datetime import UTC, datetime, timedelta

from config import get_earthdata_token
from .appeears import configured as login_configured, credentials
from .variables import PRODUCTS, VARIABLES

FIELDS = {
    "merra2_t2m": ("M2T1NXSLV_5_12_4_T2M", "T2M", "K", 24),
    "gldas_sm": ("GLDAS_NOAH025_3H_2_1_SoilMoi0_10cm_inst", "SoilMoi0_10cm_inst", "kg m-2", 8),
    "gldas_tair": ("GLDAS_NOAH025_3H_2_1_Tair_f_inst", "Tair_f_inst", "K", 8),
}
_token = None


def configured() -> bool:
    return bool(get_earthdata_token()) or login_configured()


def token(client):
    global _token
    # Reload backend/.env and prefer an explicitly supplied token, even when
    # an earlier login-generated token is already cached in this process.
    supplied = get_earthdata_token()
    if supplied:
        return supplied
    if _token:
        return _token
    response = client.post("https://urs.earthdata.nasa.gov/api/users/find_or_create_token", auth=credentials())
    if response.status_code != 200:
        raise RuntimeError(f"Earthdata time-series authentication failed (HTTP {response.status_code}).")
    _token = response.json()["access_token"]
    return _token


def parse(raw, target, lat, lon):
    field, parameter, unit, expected = FIELDS[target]
    lines = raw.decode("utf-8-sig").splitlines()
    position = next((i for i, line in enumerate(lines) if line.startswith("Timestamp")), None)
    if position is None:
        raise ValueError("NASA time-series response has no timestamp column.")
    metadata = dict(row for row in csv.reader(lines[:position]) if len(row) == 2)
    source = VARIABLES[target]["sources"][0]
    if metadata.get("prod_name") != source or metadata.get("param_short_name") != parameter or metadata.get("unit") != unit:
        raise ValueError("NASA time-series source, variable or units do not match the target.")
    cell_lat, cell_lon = float(metadata["lat"]), float(metadata["lon"])
    if (abs(cell_lat - lat) > float(metadata["lat_resolution"]) / 2 + .001 or
            abs(cell_lon - lon) > float(metadata["lon_resolution"]) / 2 + .001):
        raise ValueError("NASA time series is not from the requested nearest grid cell.")
    undef = float(metadata["undef"])
    daily = {}
    for row in csv.reader(lines[position + 1:]):
        if len(row) != 2:
            continue
        stamp = datetime.fromisoformat(row[0]).replace(tzinfo=UTC)
        if expected == 24:
            stamp -= timedelta(minutes=30)  # hourly means are time-centered.
        value = float(row[1])
        key = stamp.replace(hour=0, minute=0, second=0, microsecond=0)
        group = daily.setdefault(key, {})
        if stamp in group:
            raise ValueError("NASA time series contains duplicate timestamps.")
        group[stamp] = value if value != undef and math.isfinite(value) else None
    digest = hashlib.sha256(raw).hexdigest()
    result = []
    for start, group in sorted(daily.items()):
        expected_times = {start + timedelta(hours=i * (24 // expected)) for i in range(expected)}
        good = set(group) == expected_times and all(v is not None for v in group.values())
        end = start + timedelta(days=1)
        next_month = datetime(start.year + (start.month == 12), start.month % 12 + 1, 1, tzinfo=UTC)
        available = max(end + timedelta(days=PRODUCTS[source]["delay_days"]), next_month + timedelta(days=25))
        result.append({"source_id": source, "location_id": "", "variable": target,
                       "unit": VARIABLES[target]["unit"], "lat": cell_lat, "lon": cell_lon,
                       "interval_start": start.isoformat(), "interval_end": end.isoformat(),
                       "value": sum(group.values()) / expected if good else None,
                       "available_at": available.isoformat(), "retrieved_at": datetime.now(UTC).isoformat(),
                       "source_artifact_hash": digest})
    return result


def extract(target, lat, lon, start, end, *, checkpoint=None, budget=None):
    import httpx
    global _token
    cursor = datetime.fromisoformat((checkpoint or {}).get("cursor", start.isoformat()))
    stop = min(cursor + timedelta(days=366 * 4), end)
    source = VARIABLES[target]["sources"][0]
    if start >= end or end > datetime.now(UTC):
        raise ValueError("NASA historical requests must contain past intervals only.")
    if cursor >= end:
        return {"records_raw": [], "source": {"id": source}, "next_checkpoint": {"cursor": end.isoformat()},
                "exhausted": False, "granules_discovered": 0}
    data = FIELDS[target][0]
    bounds = f"{cursor:%Y-%m-%dT00:00:00}/{stop - timedelta(seconds=1):%Y-%m-%dT%H:%M:%S}"
    url = f"https://api.giovanni.earthdata.nasa.gov/timeseries?data={data}&location=[{lat},{lon}]&time={bounds}"
    with httpx.Client(timeout=90, follow_redirects=False) as client:
        for attempt in range(2):
            with client.stream("GET", url, headers={"Authorization": "Bearer " + token(client)}) as response:
                if response.status_code in (401, 403) and attempt == 0:
                    if get_earthdata_token():
                        raise RuntimeError(f"Earthdata rejected EARTHDATA_TOKEN (HTTP {response.status_code}); update it in backend/.env.")
                    _token = None
                    continue
                if response.status_code != 200:
                    raise RuntimeError(f"NASA historical point-series request failed (HTTP {response.status_code}).")
                raw = bytearray()
                for chunk in response.iter_bytes():
                    raw.extend(chunk)
                    if len(raw) > 16 * 1024 * 1024:
                        raise RuntimeError("NASA historical point series exceeded 16 MiB.")
                rows = parse(bytes(raw), target, lat, lon)
                return {"records_raw": rows, "source": {"id": source}, "granules_discovered": len(rows),
                        "exhausted": stop < end, "next_checkpoint": {"cursor": stop.isoformat()}}
    raise RuntimeError("NASA point-series authentication could not be renewed.")
