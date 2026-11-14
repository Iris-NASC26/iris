"""
NOAA Climate Data Online (CDO v2) Web Services Provider (Isolated Module)
Official Docs: https://www.ncdc.noaa.gov/cdo-web/webservices/v2
Base URL:      https://www.ncei.noaa.gov/cdo-web/api/v2
Auth Header:   token: <NOAA_CDO_TOKEN>
- Catalog Discovery:
  * GET /datasets (filters for time-series datasets: GSOM, GHCND, GSOY)
  * GET /datatypes?datasetid=GSOM&limit=200
- Time-Series Extraction:
  * Step 1: GET /stations?extent={min_lat},{min_lon},{max_lat},{max_lon}&datasetid={ds}&datatypeid={dt}
  * Step 2: GET /data?datasetid={ds}&datatypeid={dt}&stationid={st}&startdate={s}&enddate={e}&units=metric&limit=1000
- Zero synthetic data: every dataset, station, and observation comes directly from NOAA NCEI servers.
"""

from __future__ import annotations

import asyncio
import re
import time
from typing import Dict, List, Optional, Tuple

import httpx
import pandas as pd

from config import get_noaa_cdo_token
from schemas import DataProduct, ExtractionRequest, VariableLayer

BASE_URL = "https://www.ncei.noaa.gov/cdo-web/api/v2"

_CDO_DATASETS_CACHE: Tuple[float, List[dict]] = (0.0, [])
_CDO_DATATYPES_CACHE: Tuple[float, List[dict]] = (0.0, [])
CACHE_TTL = 21600

# Units lookup for standard NOAA CDO metric datatypes
CDO_METRIC_UNITS: Dict[str, str] = {
    "TAVG": "°C",
    "TMAX": "°C",
    "TMIN": "°C",
    "EMXT": "°C",
    "EMNT": "°C",
    "PRCP": "mm",
    "EMXP": "mm",
    "SNOW": "mm",
    "SNWD": "mm",
    "AWND": "m/s",
    "EVAP": "mm",
    "CLDD": "°C-days",
    "HTDD": "°C-days",
}


async def _fetch_cdo_datasets_and_datatypes(
    client: httpx.AsyncClient, token: str
) -> Tuple[List[dict], List[dict]]:
    global _CDO_DATASETS_CACHE, _CDO_DATATYPES_CACHE
    now = time.time()
    headers = {"token": token}

    if not _CDO_DATASETS_CACHE[1] or (now - _CDO_DATASETS_CACHE[0] >= CACHE_TTL):
        r_ds = await client.get(f"{BASE_URL}/datasets", params={"limit": 50}, headers=headers, timeout=18.0)
        r_ds.raise_for_status()
        _CDO_DATASETS_CACHE = (now, r_ds.json().get("results") or [])

    if not _CDO_DATATYPES_CACHE[1] or (now - _CDO_DATATYPES_CACHE[0] >= CACHE_TTL):
        r_dt = await client.get(
            f"{BASE_URL}/datatypes",
            params={"datasetid": "GSOM", "limit": 250},
            headers=headers,
            timeout=18.0,
        )
        r_dt.raise_for_status()
        _CDO_DATATYPES_CACHE = (now, r_dt.json().get("results") or [])

    return _CDO_DATASETS_CACHE[1], _CDO_DATATYPES_CACHE[1]


async def search_noaa_cdo_catalog(
    keywords: List[str],
    client: httpx.AsyncClient,
    noaa_token: Optional[str] = None,
    max_results: int = 5,
) -> List[DataProduct]:
    """
    Queries live NOAA CDO `/datasets` and `/datatypes` endpoints using `token: <NOAA_CDO_TOKEN>`
    and constructs time-series DataProduct entries strictly from the live response.
    """
    token = get_noaa_cdo_token(noaa_token)
    if not token:
        raise RuntimeError("NOAA_CDO_TOKEN is not configured in backend/.env")

    datasets, datatypes = await _fetch_cdo_datasets_and_datatypes(client, token)
    ds_map = {str(d.get("id")): d for d in datasets if isinstance(d, dict)}

    terms = [
        t.lower()
        for kw in keywords
        for t in re.findall(r"[a-z0-9]+", kw.lower())
        if len(t) >= 3
    ]

    # Expand synonyms for common meteorological terms in NOAA CDO datatype names
    expanded_terms = set(terms)
    for t in terms:
        if t in ("rain", "rainfall", "monsoon", "drought", "water", "flood"):
            expanded_terms.update(["precipitation", "prcp", "wet", "dry"])
        elif t in ("temp", "warming", "heat", "thermal", "weather", "climate"):
            expanded_terms.update(["temperature", "tavg", "tmax", "tmin"])
        elif t in ("wind", "storm"):
            expanded_terms.update(["wind", "awnd"])
        elif t in ("snow", "ice", "cryosphere", "glacier"):
            expanded_terms.update(["snow", "snowfall", "depth"])

    scored_dt: List[Tuple[float, dict]] = []
    for dt_item in datatypes:
        if not isinstance(dt_item, dict):
            continue
        dt_id = str(dt_item.get("id", ""))
        dt_name = str(dt_item.get("name", ""))
        coverage = float(dt_item.get("datacoverage", 0.0) or 0.0)
        blob = f"{dt_id} {dt_name}".lower()

        score = 0.0
        for term in expanded_terms:
            if term == dt_id.lower():
                score += 25.0
            elif term in blob:
                score += 10.0

        if score > 0:
            if dt_id in ("TAVG", "TMAX", "TMIN", "PRCP", "AWND", "SNOW", "SNWD", "EMXT", "EMNT", "EVAP"):
                score += 18.0
            score += coverage * 4.0
            scored_dt.append((score, dt_item))

    # If no specific datatype matched, surface core high-coverage GSOM/GHCND datatypes from the live response
    if not scored_dt:
        for dt_item in datatypes:
            dt_id = str(dt_item.get("id", ""))
            if dt_id in ("TAVG", "PRCP", "TMAX", "TMIN", "AWND"):
                scored_dt.append((15.0, dt_item))

    scored_dt.sort(key=lambda x: x[0], reverse=True)
    top_datatypes = scored_dt[:max_results]

    gsom_meta = ds_map.get("GSOM", {"name": "Global Summary of the Month", "mindate": "1763-01-01", "maxdate": "2025-12-31"})
    ghcnd_meta = ds_map.get("GHCND", {"name": "Daily Summaries", "mindate": "1763-01-01", "maxdate": "2025-12-31"})

    products: List[DataProduct] = []
    for raw_score, dt_item in top_datatypes:
        dt_id = str(dt_item.get("id", "TAVG"))
        dt_name = str(dt_item.get("name", dt_id))
        min_date = str(dt_item.get("mindate", gsom_meta.get("mindate", "1950-01-01")))[:10]
        max_date = str(dt_item.get("maxdate", gsom_meta.get("maxdate", "2025-12-31")))[:10]
        cov = float(dt_item.get("datacoverage", 1.0) or 1.0)
        unit = CDO_METRIC_UNITS.get(dt_id, "Metric Unit")
        rec_agg = "sum" if dt_id in ("PRCP", "SNOW", "EVAP") else "mean"

        layer_gsom = VariableLayer(
            variable_id=f"GSOM:{dt_id}",
            variable_name=f"GSOM Monthly — {dt_name}",
            unit=unit,
            description=f"NOAA NCEI Global Summary of the Month ({dt_id}): {dt_name} (station coverage {cov*100:.0f}%).",
            native_frequency="Monthly",
            supported_frequencies=["Daily", "Monthly", "Seasonal", "Yearly"],
            recommended_aggregation=rec_agg,  # type: ignore[arg-type]
        )
        layer_ghcnd = VariableLayer(
            variable_id=f"GHCND:{dt_id}",
            variable_name=f"GHCND Daily — {dt_name}",
            unit=unit,
            description=f"NOAA NCEI Global Historical Climatology Network Daily ({dt_id}) from {ghcnd_meta.get('name')}.",
            native_frequency="Daily",
            supported_frequencies=["Daily", "Monthly", "Seasonal", "Yearly"],
            recommended_aggregation=rec_agg,  # type: ignore[arg-type]
        )

        products.append(
            DataProduct(
                product_id=f"NOAA_CDO_GSOM_{dt_id}",
                variable_id=dt_id,
                variable_name=f"{dt_name} ({dt_id})",
                title=f"NOAA NCEI {gsom_meta.get('name')} — {dt_name} ({dt_id})",
                category="Atmosphere & Hydrometeorology",
                source_api="NOAA CDO",
                provider_agency="NOAA National Centers for Environmental Information (NCEI CDO v2)",
                mission_or_instrument="Global Historical Climatology Network (GHCN-Daily / GSOM In-Situ Stations)",
                source_url="https://www.ncdc.noaa.gov/cdo-web/webservices/v2",
                citation_doi="https://doi.org/10.7289/V5QV3JJ5",
                description=f"Live NOAA CDO v2 time-series dataset (GSOM / GHCND) measuring {dt_name} ({dt_id}) across global meteorological stations.",
                what_it_measures=f"Quality-controlled in-situ weather station measurements of {dt_name} ({unit}); data coverage: {cov*100:.1f}%.",
                unit=unit,
                native_frequency="Monthly",
                supported_frequencies=["Daily", "Monthly", "Seasonal", "Yearly"],
                temporal_start=max("1950-01-01", min_date),
                temporal_end=min("2025-12-31", max_date),
                spatial_resolution="In-Situ Station Network (Extent BBox)",
                spatial_resolution_km=10.0,
                spatial_coverage="Global",
                spatial_bbox=[-180.0, -90.0, 180.0, 90.0],
                gcmd_keywords=[dt_id.lower(), dt_name.lower(), "noaa cdo", "weather station"],
                ai_match_reason=f"Live NOAA CDO v2 datatype '{dt_id}' ({dt_name}) matched via /cdo-web/api/v2/datatypes.",
                relevance_score=min(98.5, round(70.0 + min(28.0, raw_score), 1)),
                is_async=False,
                available_layers=[layer_gsom, layer_ghcnd],
            )
        )

    return products


async def _find_cdo_stations_in_bbox(
    dataset_id: str,
    datatype_id: str,
    lat: float,
    lon: float,
    bbox: List[float],
    start_date: str,
    end_date: str,
    client: httpx.AsyncClient,
    token: str,
) -> List[dict]:
    """Finds active NOAA CDO weather stations inside the bounding box (expanding if needed)."""
    headers = {"token": token}
    min_lon, min_lat, max_lon, max_lat = bbox if len(bbox) == 4 else [lon - 1.5, lat - 1.5, lon + 1.5, lat + 1.5]

    for pad in (0.0, 2.0, 5.0):
        ext = f"{max(-90.0, min_lat - pad):.2f},{max(-180.0, min_lon - pad):.2f},{min(90.0, max_lat + pad):.2f},{min(180.0, max_lon + pad):.2f}"
        params = {
            "datasetid": dataset_id,
            "datatypeid": datatype_id,
            "extent": ext,
            "startdate": start_date[:10],
            "enddate": end_date[:10],
            "sortfield": "datacoverage",
            "sortorder": "desc",
            "limit": 8,
        }
        resp = await client.get(f"{BASE_URL}/stations", params=params, headers=headers, timeout=18.0)
        if resp.status_code == 200:
            results = resp.json().get("results") or []
            if results:
                return results
    return []


async def extract_noaa_cdo_timeseries(
    req: ExtractionRequest,
    lat: float,
    lon: float,
    client: httpx.AsyncClient,
    noaa_token: Optional[str] = None,
) -> Tuple[pd.Series, Dict[str, str], str]:
    """
    Executes a live time-series extraction against `https://www.ncei.noaa.gov/cdo-web/api/v2/data`:
    1. Resolves active GHCN/GSOM stations within the requested bounding box.
    2. Queries `/data` across the date range in valid window chunks (`units=metric`).
    3. Aggregates station observations by timestamp and returns the real pandas Series.
    """
    token = get_noaa_cdo_token(noaa_token)
    if not token:
        raise RuntimeError("NOAA_CDO_TOKEN is required in backend/.env to extract NOAA CDO data.")

    raw_var = req.variable_id.replace("NOAA_CDO_", "")
    if ":" in raw_var:
        ds_id, dt_id = raw_var.split(":", 1)
    else:
        ds_id = "GHCND" if req.target_frequency == "Daily" else "GSOM"
        dt_id = raw_var.replace("GSOM_", "").replace("GHCND_", "").strip()

    stations = await _find_cdo_stations_in_bbox(
        ds_id, dt_id, lat, lon, req.bbox, req.start_date, req.end_date, client, token
    )
    if not stations:
        raise RuntimeError(
            f"NOAA CDO v2 returned 0 weather stations recording '{dt_id}' ({ds_id}) within region {req.region_name} "
            f"for {req.start_date} to {req.end_date}. Try a broader region or a satellite gridded dataset."
        )

    top_stations = [str(s["id"]) for s in stations[:5] if s.get("id")]
    station_names = ", ".join(str(s.get("name", s.get("id"))) for s in stations[:3])

    start_yr = int(req.start_date[:4])
    end_yr = min(2025, int(req.end_date[:4]))
    # NOAA CDO /data allows max 10-year span for GSOM/GSOY and max 1-year span for GHCND
    chunk_years = 1 if ds_id == "GHCND" else 9

    headers = {"token": token}
    all_rows: List[Tuple[pd.Timestamp, float]] = []
    last_url = f"{BASE_URL}/data"

    yr = start_yr
    while yr <= end_yr:
        chunk_end_yr = min(end_yr, yr + chunk_years - 1)
        s_str = req.start_date[:10] if yr == start_yr else f"{yr}-01-01"
        e_str = req.end_date[:10] if chunk_end_yr == end_yr else f"{chunk_end_yr}-12-31"

        params: List[Tuple[str, str]] = [
            ("datasetid", ds_id),
            ("datatypeid", dt_id),
            ("startdate", s_str),
            ("enddate", e_str),
            ("units", "metric"),
            ("limit", "1000"),
        ]
        for st_id in top_stations:
            params.append(("stationid", st_id))

        resp = await client.get(f"{BASE_URL}/data", params=params, headers=headers, timeout=25.0)
        last_url = str(resp.request.url)
        if resp.status_code == 200:
            items = resp.json().get("results") or []
            for item in items:
                d_str = str(item.get("date", ""))[:10]
                val = item.get("value")
                if d_str and isinstance(val, (int, float)):
                    all_rows.append((pd.Timestamp(d_str), float(val)))
        yr = chunk_end_yr + 1

    if not all_rows:
        raise RuntimeError(
            f"NOAA CDO v2 returned 0 observations for datatype '{dt_id}' across stations [{station_names}] "
            f"between {req.start_date} and {req.end_date}."
        )

    df = pd.DataFrame(all_rows, columns=["ts", "val"])
    grouped = df.groupby("ts")["val"].mean().sort_index()

    meta_out = {
        "unit": CDO_METRIC_UNITS.get(dt_id, req.unit or "Metric"),
        "stations": station_names,
        "dataset_id": ds_id,
    }
    return grouped.astype(object), meta_out, last_url
