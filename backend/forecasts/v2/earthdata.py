"""Earthdata historical adapter — CMR discovery + bounded OPeNDAP subsets.

Same discipline as the Meteomatics adapter: injectable transport, declared
per-product availability (interval_end + publication delay — composite
products finish at composite end, never earlier), content hashes, and no
auth material in persisted records.

Production access uses AppEEARS point extractions for land products and the
authenticated Giovanni time-series service for GES DISC. The injectable CMR
path remains available for transport-level tests. No global raster download.
"""
from __future__ import annotations

import hashlib
import json
import time
import random
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

from .variables import PRODUCTS, VARIABLES, product, variable

CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
ALLOWED_HOSTS = {
    "cmr.earthdata.nasa.gov",
    "opendap.earthdata.nasa.gov",
    "urs.earthdata.nasa.gov",
}
MAX_GRANULE_BYTES = 4 * 1024 * 1024


class EarthdataError(RuntimeError):
    def __init__(self, message: str, status: int = 503):
        super().__init__(message)
        self.status = status


def _default_transport(url: str, params: dict | None, timeout: float) -> tuple[int, bytes, dict]:
    try:
        import httpx
    except ImportError:
        raise EarthdataError("httpx is not installed; live Earthdata requests unavailable.")
    host = urlparse(url).hostname
    if host not in ALLOWED_HOSTS:
        raise EarthdataError(f"Refusing unapproved Earthdata host '{host}'.", 502)
    if host == "cmr.earthdata.nasa.gov":
        r = httpx.get(url, params=params, timeout=timeout)
    else:
        from ..nasa import authenticated_bytes
        with httpx.Client(timeout=timeout, follow_redirects=False) as client:
            body = authenticated_bytes(client, url)
            if len(body) > MAX_GRANULE_BYTES:
                raise EarthdataError("Granule subset exceeded the bounded size.", 502)
            return 200, body, {}
    body = r.content
    if len(body) > MAX_GRANULE_BYTES:
        raise EarthdataError("Response exceeded the bounded size.", 502)
    return r.status_code, body, {k.lower(): v for k, v in r.headers.items()}


def _default_parser(raw: bytes, variable_name: str, lat: float, lon: float,
                    granule_start: datetime, granule_end: datetime,
                    composite_days: int) -> list[tuple[datetime, datetime, float | None]]:
    """NetCDF granule -> [(interval_start, interval_end, value)] at the nearest
    cell. Lazy xarray import — absent in minimal environments."""
    try:
        import tempfile
        from pathlib import Path
        import numpy as np
        import xarray as xr
    except ImportError:
        raise EarthdataError("xarray/netcdf4 unavailable in this environment; parsing deferred.", 503)
    with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as h:
        path = Path(h.name)
        h.write(raw)
    try:
        with xr.open_dataset(path, engine="netcdf4") as ds:
            if variable_name not in ds:
                raise EarthdataError(f"Variable '{variable_name}' absent from granule.", 502)
            var = ds[variable_name]
            lat_idx = int(abs(ds.lat - lat).argmin()) if "lat" in ds else 0
            lon_idx = int(abs(ds.lon - lon).argmin()) if "lon" in ds else 0
            scale = float(var.attrs.get("scale_factor", 1.0))
            fill = var.attrs.get("_FillValue")
            out = []
            if "time" in var.dims and var.sizes.get("time", 1) > 1:
                # hourly/3h granule -> daily means at the point
                for day in _days(granule_start, granule_end):
                    day0, day1 = day, day + timedelta(days=1)
                    sel = var.sel(time=slice(day0, day1)) if "time" in var.coords else var
                    vals = sel.isel(lat=lat_idx, lon=lon_idx).values
                    vals = np.asarray(vals, dtype=float).ravel()
                    vals = vals[np.isfinite(vals) & (vals != fill)]
                    out.append((day0, day1,
                                float(vals.mean() * scale) if vals.size else None))
            else:
                v = var.isel(lat=lat_idx, lon=lon_idx).values
                v = float(np.asarray(v, dtype=float).ravel()[0])
                val = None if (not np.isfinite(v) or (fill is not None and v == fill)) else v * scale
                out.append((granule_start, granule_end, val))
            return out
    finally:
        path.unlink(missing_ok=True)


def _days(start: datetime, end: datetime):
    d = start.replace(hour=0, minute=0, second=0, microsecond=0)
    while d < end:
        yield d
        d += timedelta(days=1)


def cmr_granules(shortname: str, version: str, start: datetime, end: datetime,
                 *, transport=None, sleep=time.sleep, rng: random.Random | None = None
                 ) -> list[dict]:
    """Bounded CMR granule discovery for one product and temporal range."""
    transport = transport or _default_transport
    rng = rng or random.Random()
    params = {
        "short_name": shortname.split(".")[0] if "." not in shortname else shortname,
        "version": version,
        "temporal": f"{start.isoformat()},{end.isoformat()}",
        "page_size": "200",
    }
    for attempt in range(4):
        status, body, headers = transport(CMR, params, 30.0)
        if status == 200:
            break
        if status == 429:
            ra = headers.get("retry-after")
            sleep(min(float(ra) if ra and ra.replace(".", "").isdigit() else 2 ** attempt, 60.0) + rng.random())
            continue
        if status >= 500 and attempt < 3:
            sleep(min(2 ** attempt, 30) + rng.random())
            continue
        raise EarthdataError(f"CMR search failed (HTTP {status}).", status)
    else:
        raise EarthdataError("CMR retry budget exhausted.", 503)
    try:
        entries = json.loads(body)["feed"]["entry"]
    except (KeyError, json.JSONDecodeError) as e:
        raise EarthdataError(f"Unparseable CMR response: {e}", 502)
    granules = []
    for e in entries:
        data_url = None
        for link in e.get("links", []):
            href = link.get("href", "")
            if "opendap" in href and href.endswith((".nc4", ".nc", ".h5", ".he5")):
                data_url = href
                break
        granules.append({
            "id": e.get("id") or e.get("title"),
            "time_start": e.get("time_start"),
            "time_end": e.get("time_end"),
            "data_url": data_url,
            "size_mb": e.get("granule_size"),
        })
    return granules


def fetch_series(var_name: str, lat: float, lon: float,
                 start: datetime, end: datetime,
                 *, transport=None, parser=None, budget: dict | None = None,
                 checkpoint: dict | None = None, sleep=time.sleep,
                 rng: random.Random | None = None, now: datetime | None = None) -> dict:
    """CMR-discover then download each granule -> raw records for qa.normalize.

    Every record's `available_at` = its interval_end + the product's declared
    publication delay. The composite's completion time is its interval END —
    a 16-day composite is never available mid-window.
    """
    spec = variable(var_name)
    now = now or datetime.now(UTC)
    if end > now:
        raise EarthdataError(
            "History requests must end before now; future granules are prohibited.", 422)
    if transport is None and parser is None:
        from . import appeears
        if var_name in appeears.LAYERS:
            return appeears.extract(var_name, lat, lon, start, end, checkpoint=checkpoint)
        from .gic import extract
        return extract(var_name, lat, lon, start, end, checkpoint=checkpoint, budget=budget)
    shortname = spec["sources"][0]
    p = product(shortname)
    version = shortname.split(".")[-1]
    transport = transport or _default_transport
    parser = parser or _default_parser
    rng = rng or random.Random()
    granules = cmr_granules(shortname, version, start, end,
                            transport=transport, sleep=sleep, rng=rng)
    granules.sort(key=lambda g: g["time_start"] or "")
    done = int((checkpoint or {}).get("granule_index", -1))
    rows: list[dict] = []
    hashes: list[str] = []
    exhausted = False
    for i, g in enumerate(granules):
        if i <= done or not g["data_url"]:
            continue
        if budget is not None and budget["remaining"] <= 0:
            exhausted = True
            break
        gs = datetime.fromisoformat(str(g["time_start"]).replace("Z", "+00:00"))
        ge = datetime.fromisoformat(str(g["time_end"]).replace("Z", "+00:00"))
        status, body, _headers = transport(g["data_url"], None, 60.0)
        if status != 200:
            raise EarthdataError(f"Granule download failed (HTTP {status}).", status)
        if budget is not None:
            budget["remaining"] -= 1
        digest = hashlib.sha256(body).hexdigest()
        for (s, e, val) in parser(body, p["variable"], lat, lon, gs, ge,
                                  spec["composite_days"]):
            rows.append({
                "location_id": "",  # filled by caller/worker
                "source_id": shortname,
                "lat": lat, "lon": lon,
                "variable": var_name, "unit": spec["unit"],
                "interval_start": s.isoformat(), "interval_end": e.isoformat(),
                "value": val,
                "retrieved_at": now.isoformat(),
                "available_at": (e + timedelta(days=p["delay_days"])).isoformat(),
                "source_artifact_hash": digest,
                "source_role": "retrospective" if p["delay_days"] >= 30 else "delayed-near-real-time",
                "granule_id": g["id"],
            })
        hashes.append(digest)
        done = i
    return {
        "records_raw": rows,
        "next_checkpoint": {"granule_index": done},
        "exhausted": exhausted,
        "granule_hashes": hashes,
        "granules_discovered": len(granules),
        "source": {"id": shortname, "variable": p["variable"],
                   "declared_availability_delay_days": p["delay_days"],
                   "daac": p["daac"], "native_cadence": p["native_cadence"],
                   "note": p["note"]},
    }
