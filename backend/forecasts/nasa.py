"""Real recent IMERG Early daily samples via CMR and Earthdata Cloud DAP4.

No retired Data Rods endpoint; no download of a global raster. Credentials are
sent only to the two explicitly trusted Earthdata authentication/data hosts.
"""

import hashlib
import json
import math
import netrc
import tempfile
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx
import numpy as np
import xarray as xr
from hazards.meteomatics import ForecastUnavailable
from hazards.rainfall import iso

from .catalog import ROOT, region

CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
ALLOWED = {"opendap.earthdata.nasa.gov", "urs.earthdata.nasa.gov"}
CACHE = ROOT / "artifacts/runtime/forecasts/nasa"
_slot = threading.BoundedSemaphore(1)


def authenticated_bytes(client: httpx.Client, url: str) -> bytes:
    try:
        entry = netrc.netrc(str(Path.home() / ".netrc")).authenticators(
            "urs.earthdata.nasa.gov"
        )
    except (OSError, netrc.NetrcParseError):
        raise ForecastUnavailable(
            "Earthdata credentials are unavailable in the local .netrc file."
        ) from None
    if not entry:
        raise ForecastUnavailable("Add the Earthdata login entry to local .netrc.")
    for _ in range(8):
        parsed = urlparse(url)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in ALLOWED
            or parsed.username
            or parsed.password
        ):
            raise ForecastUnavailable(
                "NASA returned an unapproved data/authentication host.", 502
            )
        with client.stream("GET", url, auth=(entry[0], entry[2])) as response:
            if response.status_code in (301, 302, 303, 307, 308):
                url = urljoin(url, response.headers.get("location", ""))
                continue
            if response.status_code != 200:
                raise ForecastUnavailable(
                    "NASA IMERG access was refused or the subset is unavailable."
                )
            data = bytearray()
            for chunk in response.iter_bytes():
                data.extend(chunk)
                if len(data) > 2 * 1024 * 1024:
                    raise ForecastUnavailable("NASA point subset exceeded 2 MiB.", 502)
            return bytes(data)
    raise ForecastUnavailable(
        "Earthdata authorization did not complete; review application access."
    )


def read_subset(raw: bytes, point: dict, expected_date: str) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as handle:
        path = Path(handle.name)
        handle.write(raw)
    try:
        with xr.open_dataset(path, engine="netcdf4") as ds:
            if (
                "precipitation" not in ds
                or ds.precipitation.attrs.get("units") != "mm/day"
            ):
                raise ValueError("IMERG precipitation units did not match.")
            if (
                ds.precipitation.size != 1
                or ds.lat.size != 1
                or ds.lon.size != 1
                or ds.time.size != 1
            ):
                raise ValueError("IMERG subset must contain exactly one daily point.")
            lat, lon = float(ds.lat.item()), float(ds.lon.item())
            if (
                abs(lat - point["latitude"]) > 0.051
                or abs(lon - point["longitude"]) > 0.051
            ):
                raise ValueError("IMERG sample is not the nearest 0.1 degree cell.")
            stamp = np.datetime_as_string(ds.time.values[0], unit="D")
            if stamp != expected_date:
                raise ValueError("IMERG date did not match the granule.")
            value = float(ds.precipitation.values.item())
            if math.isnan(value):
                value = None
            elif not math.isfinite(value) or value < 0:
                raise ValueError("IMERG contains invalid precipitation.")
            return {
                "timestamp": stamp,
                "value": value,
                "qa": "missing" if value is None else "usable",
                "reported_latitude": lat,
                "reported_longitude": lon,
            }
    finally:
        path.unlink(missing_ok=True)


def observations(identifier: str) -> dict:
    if not _slot.acquire(blocking=False):
        raise ForecastUnavailable(
            "Another NASA context request is active. Retry shortly.", 429
        )
    try:
        return _observations(identifier)
    finally:
        _slot.release()


def _observations(identifier: str) -> dict:
    point = region(identifier)
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / f"{identifier}.json"
    if cached.exists():
        result = json.loads(cached.read_text(encoding="utf-8"))
        if datetime.now(UTC) - datetime.fromisoformat(
            result["retrieved_at"]
        ) < timedelta(hours=6):
            return result
    now = datetime.now(UTC)
    params = {
        "short_name": "GPM_3IMERGDE",
        "version": "07",
        "temporal": iso(now - timedelta(days=9)) + "," + iso(now),
        "page_size": 7,
        "sort_key": "-start_date",
    }
    try:
        with httpx.Client(timeout=25, follow_redirects=False) as client:
            response = client.get(CMR, params=params)
            if response.status_code != 200 or len(response.content) > 2 * 1024 * 1024:
                raise ForecastUnavailable("NASA catalogue lookup failed.")
            granules = response.json().get("feed", {}).get("entry", [])
            if not granules:
                raise ForecastUnavailable(
                    "No recent daily IMERG granules are available."
                )
            rows, sources = [], []
            for granule in granules:
                base = next(
                    (
                        v["href"]
                        for v in granule.get("links", [])
                        if v.get("href", "").startswith(
                            "https://opendap.earthdata.nasa.gov/collections/"
                        )
                        and not v.get("inherited")
                    ),
                    None,
                )
                if not base:
                    raise ForecastUnavailable(
                        "NASA catalogue did not expose a supported Cloud OPeNDAP subset."
                    )
                lat_index = math.floor((point["latitude"] + 90) / 0.1)
                lon_index = math.floor((point["longitude"] + 180) / 0.1)
                expression = f"/lat[{lat_index}];/lon[{lon_index}];/time[0];/precipitation[0][{lon_index}][{lat_index}]"
                url = str(httpx.URL(base + ".dap.nc4", params={"dap4.ce": expression}))
                raw = authenticated_bytes(client, url)
                digest = hashlib.sha256(raw).hexdigest()
                date = granule["time_start"][:10]
                rows.append(read_subset(raw, point, date))
                # Store only tiny public data subsets, never auth redirects/cookies.
                target = CACHE / f"{digest}.nc"
                if not target.exists():
                    if (
                        sum(p.stat().st_size for p in CACHE.glob("*.nc")) + len(raw)
                        > 20 * 1024 * 1024
                    ):
                        raise ForecastUnavailable(
                            "NASA context storage is full; archive the retained subsets before retrying."
                        )
                    temp_source = target.with_suffix(".tmp")
                    temp_source.write_bytes(raw)
                    temp_source.replace(target)
                sources.append(
                    {
                        "granule": granule["title"],
                        "url": url,
                        "sha256": digest,
                        "retrieved_at": iso(datetime.now(UTC)),
                    }
                )
        result = {
            "schema_version": "iris.forecast-context.v1",
            "id": identifier,
            "provider": "NASA GPM IMERG Early",
            "product": "GPM_3IMERGDE.07",
            "parameter": "precipitation",
            "units": "mm/day",
            "time_standard": "UTC",
            "spatial_support": "nearest_0.1_degree_grid_cell",
            "location": point,
            "retrieved_at": iso(datetime.now(UTC)),
            "source_url": str(httpx.URL(CMR, params=params)),
            "sources": sources,
            "rows": sorted(rows, key=lambda r: r["timestamp"]),
            "as_of_availability_verified": False,
            "caveat": "Recent IMERG Early daily satellite estimates at a nearby 0.1 degree cell, retrieved now. These are observations, not forecasts or proof of pre-event availability; missing values remain missing.",
        }
        temp = cached.with_suffix(".tmp")
        temp.write_text(json.dumps(result, allow_nan=False), encoding="utf-8")
        temp.replace(cached)
        return result
    except httpx.HTTPError:
        raise ForecastUnavailable("NASA IMERG could not be reached.") from None
    except (ValueError, KeyError, TypeError, AttributeError):
        raise ForecastUnavailable(
            "NASA IMERG context failed validation; no observations were substituted.",
            502,
        ) from None
