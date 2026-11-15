"""Resumable Earthdata point-series extraction. Tokens stay in process memory.

An extraction is submitted once, then polled by the durable worker. Point CSV
values returned by AppEEARS are already unpacked; never apply raster scaling
again. Quality bands are requested with every science band.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import math
import netrc
import os
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

from .variables import PRODUCTS, VARIABLES

BASE = "https://appeears.earthdatacloud.nasa.gov/api"
LAYERS = {
    "smap_surface_sm": ("Soil_Moisture_Retrieval_Data_AM_soil_moisture",
                        "Soil_Moisture_Retrieval_Data_AM_retrieval_qual_flag"),
    "smap_rootzone_sm": ("Geophysical_Data_sm_rootzone",),
    "modis_lst_day": ("LST_Day_1km", "QC_Day"),
    "modis_ndvi": ("_250m_16_days_NDVI", "_250m_16_days_VI_Quality"),
    "viirs_ndvi": ("500_m_16_days_NDVI", "500_m_16_days_VI_Quality"),
    "modis_et": ("ET_500m", "ET_QC_500m"),
    "modis_snow": ("NDSI_Snow_Cover", "NDSI_Snow_Cover_Basic_QA"),
}
_token = None
_expires = datetime.min.replace(tzinfo=UTC)
_lock = threading.Lock()


def credentials():
    user, password = os.getenv("EARTHDATA_USERNAME"), os.getenv("EARTHDATA_PASSWORD")
    if user and password:
        return user, password
    paths = ([Path(os.environ["NETRC"])] if os.getenv("NETRC") else
             [Path.home() / ".netrc", Path.home() / "_netrc"])
    for path in paths:
        try:
            entry = netrc.netrc(str(path)).authenticators("urs.earthdata.nasa.gov")
            if entry:
                return entry[0], entry[2]
        except (OSError, netrc.NetrcParseError):
            continue
    raise RuntimeError("Earthdata credentials are missing; configure local .netrc or Earthdata environment credentials.")


def configured() -> bool:
    try:
        credentials()
        return True
    except RuntimeError:
        return False


def request(method: str, path: str, payload=None, *, binary=False):
    """Only the fixed AppEEARS API receives the token; redirects are refused."""
    import httpx
    global _token, _expires
    if not path.startswith("/") or ".." in path or ":" in path:
        raise ValueError("Invalid Earthdata API path.")
    with httpx.Client(timeout=60, follow_redirects=False) as client:
        for attempt in range(2):
            with _lock:
                if not _token or _expires <= datetime.now(UTC) + timedelta(minutes=2):
                    response = client.post(BASE + "/login", auth=credentials())
                    if response.status_code != 200:
                        raise RuntimeError(f"Earthdata authentication failed (HTTP {response.status_code}).")
                    auth = response.json()
                    _token = auth["token"]
                    _expires = datetime.fromisoformat(auth["expiration"].replace("Z", "+00:00"))
            with client.stream(method, BASE + path, json=payload,
                               headers={"Authorization": "Bearer " + _token}) as response:
                if response.status_code in (401, 403) and attempt == 0:
                    _token = None
                    continue
                if binary and response.status_code in (301, 302, 303, 307, 308):
                    url = response.headers.get("location", "")
                    parsed = urlparse(url)
                    host = parsed.hostname or ""
                    if (parsed.scheme != "https" or parsed.username or parsed.password or
                            not host.endswith(".amazonaws.com") or
                            not (".s3." in host or ".s3-" in host or host.endswith(".s3.amazonaws.com"))):
                        raise RuntimeError("Earthdata returned an unsupported download redirect.")
                    # Never forward the Earthdata bearer token to object storage.
                    with client.stream("GET", url) as download:
                        if download.status_code != 200:
                            raise RuntimeError("Earthdata bundle download failed.")
                        data = bytearray()
                        for chunk in download.iter_bytes():
                            data.extend(chunk)
                            if len(data) > 16 * 1024 * 1024:
                                raise RuntimeError("Earthdata point-series response exceeded 16 MiB.")
                        return bytes(data)
                if response.status_code not in (200, 201, 202):
                    raise RuntimeError(f"Earthdata extraction request failed (HTTP {response.status_code}).")
                data = bytearray()
                for chunk in response.iter_bytes():
                    data.extend(chunk)
                    if len(data) > 16 * 1024 * 1024:
                        raise RuntimeError("Earthdata point-series response exceeded 16 MiB.")
                return bytes(data) if binary else json.loads(data)
    raise RuntimeError("Earthdata authentication could not be renewed.")


def _date(value: str) -> datetime:
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%m-%d-%Y", "%Y%j", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=UTC)
        except ValueError:
            continue
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=UTC)


def parse_csv(raw: bytes, target: str, lat: float, lon: float, *, now=None) -> list[dict]:
    """Parse scaled point CSV values and raw QA bits, preserving missingness."""
    spec = VARIABLES[target]
    source = spec["sources"][0]
    science, *quality = LAYERS[target]
    now = now or datetime.now(UTC)
    digest = hashlib.sha256(raw).hexdigest()
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    names = reader.fieldnames or []

    def column(layer):
        matches = [n for n in names if n == layer or n.endswith("_" + layer)]
        if len(matches) != 1:
            raise ValueError(f"Earthdata CSV is missing an unambiguous {layer} column.")
        return matches[0]

    value_col = column(science)
    qa_col = column(quality[0]) if quality else None
    date_col = next((n for n in names if n.lower() in ("date", "datetime", "time")), None)
    if not date_col:
        raise ValueError("Earthdata CSV has no observation date.")
    rows = []
    for row in reader:
        start = _date(row[date_col])
        end = start + timedelta(days=spec["composite_days"])
        if spec["composite_days"] > 1:
            end = min(end, datetime(start.year + 1, 1, 1, tzinfo=UTC))
        if end > now:
            continue
        good = True
        try:
            value = float(row[value_col])
            good = math.isfinite(value) and spec["min"] <= value <= spec["max"]
            flag = int(float(row[qa_col])) if qa_col else None
            if target == "smap_surface_sm":
                good &= flag is not None and flag & 3 == 0
            elif target == "modis_lst_day":
                good &= flag is not None and flag & 3 == 0 and (flag >> 6) & 3 <= 1
            elif target in ("modis_ndvi", "viirs_ndvi"):
                good &= flag is not None and flag & 3 <= 1 and (flag >> 2) & 15 <= 2
            elif target == "modis_et":
                good &= flag is not None and flag & 1 == 0 and (flag >> 5) & 7 <= 1
            elif target == "modis_snow":
                good &= flag is not None and 0 <= flag <= 1
        except (TypeError, ValueError):
            value, flag, good = None, None, False
        # Preserve the documented SMAP geolocation issue as a quarantine until
        # a corrected, explicitly versioned source policy is configured.
        if target.startswith("smap_") and datetime(2026, 5, 14, tzinfo=UTC) <= start < datetime(2026, 7, 29, tzinfo=UTC):
            good = False
        available = end + timedelta(days=PRODUCTS[source]["delay_days"])
        if target == "modis_et":
            available = max(available, datetime(start.year + 1, 1, 1, tzinfo=UTC) + timedelta(days=60))
        rows.append({
            "location_id": "", "source_id": source, "lat": lat, "lon": lon,
            "variable": target, "unit": spec["unit"],
            "interval_start": start.isoformat(), "interval_end": end.isoformat(),
            "value": value if good else None, "quality": "valid" if good else "source_qa_rejected",
            "retrieved_at": now.isoformat(), "available_at": available.isoformat(),
            "source_artifact_hash": digest, "availability_basis": "declared_product_delay",
        })
    return rows


def extract(target: str, lat: float, lon: float, start: datetime, end: datetime,
            *, checkpoint=None, api=request) -> dict:
    if target not in LAYERS:
        raise ValueError("This target requires the GES DISC point-subset adapter.")
    if end > datetime.now(UTC) or start >= end:
        raise ValueError("Earthdata requests must contain past intervals only.")
    source = VARIABLES[target]["sources"][0]
    ckpt = dict(checkpoint or {})
    if not ckpt.get("task_id"):
        # Metadata validation catches retired products/layers before submission.
        metadata = api("GET", "/product/" + source)
        missing = [layer for layer in LAYERS[target] if layer not in metadata]
        if missing:
            raise ValueError("Earthdata product does not expose the configured science/quality layers.")
        payload = {"task_type": "point", "task_name": "iris-" + target,
                   "params": {"dates": [{"startDate": start.strftime("%m-%d-%Y"),
                                          "endDate": end.strftime("%m-%d-%Y")}],
                              "layers": [{"product": source, "layer": layer} for layer in LAYERS[target]],
                              "coordinates": [{"latitude": lat, "longitude": lon, "id": "iris-point"}]}}
        submitted = api("POST", "/task", payload)
        ckpt["task_id"] = submitted["task_id"]
    state = api("GET", "/task/" + ckpt["task_id"])
    if state.get("status") in ("error", "failed", "expired"):
        raise RuntimeError("Earthdata extraction failed; submit a new historical extraction.")
    if state.get("status") != "done":
        return {"pending": True, "next_checkpoint": ckpt,
                "message": "Earthdata is extracting historical point records (" + str(state.get("status", "queued")) + ")."}
    files = api("GET", "/bundle/" + ckpt["task_id"])["files"]
    selected = [f for f in files if f.get("file_type") == "csv" and f["file_name"].endswith("results.csv")]
    if not selected:
        raise RuntimeError("Earthdata returned no point-series results file.")
    rows, hashes = [], []
    for file in selected:
        raw = api("GET", "/bundle/" + ckpt["task_id"] + "/" + file["file_id"], binary=True)
        digest = hashlib.sha256(raw).hexdigest()
        if file.get("sha256") and digest != file["sha256"]:
            raise ValueError("Earthdata result checksum did not match its bundle.")
        rows.extend(parse_csv(raw, target, lat, lon))
        hashes.append(digest)
    return {"pending": False, "records_raw": rows, "next_checkpoint": ckpt,
            "exhausted": False, "granule_hashes": hashes, "granules_discovered": len(rows),
            "source": {"id": source, **PRODUCTS[source], "task_id": ckpt["task_id"]}}
