"""NASA POWER catalog and point/regional time-series extraction."""

from __future__ import annotations

import datetime as dt
import math
import re
import statistics
import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

import httpx
import pandas as pd

from schemas import DataProduct, ExtractionRequest, VariableLayer

# Cache of the live NASA POWER parameter catalog response (TTL 6 hours)
_POWER_CATALOG_CACHE: Tuple[float, Dict[str, dict]] = (0.0, {})
CACHE_TTL = 21600
MAX_REGIONAL_SPAN_DEGREES = 20.0
MAX_REGIONAL_GRID_TIME_VALUES = 2_000_000
REGIONAL_MIN_LATITUDE_SPAN_DEGREES = 2.0
POWER_GRID_LATITUDE_SPAN_DEGREES = 0.5
POWER_GRID_LONGITUDE_SPAN_DEGREES = 0.625


async def _fetch_live_power_parameter_dict(client: httpx.AsyncClient) -> Dict[str, dict]:
    global _POWER_CATALOG_CACHE
    now = time.time()
    if _POWER_CATALOG_CACHE[1] and (now - _POWER_CATALOG_CACHE[0] < CACHE_TTL):
        return _POWER_CATALOG_CACHE[1]

    url = "https://power.larc.nasa.gov/api/system/manager/parameters"
    params = {"community": "ag", "temporal": "monthly"}
    resp = await client.get(url, params=params, timeout=25.0)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict):
        _POWER_CATALOG_CACHE = (now, data)
        return data
    return {}


async def search_nasa_power_catalog(
    keywords: List[str],
    client: httpx.AsyncClient,
    max_results: int = 6,
) -> List[DataProduct]:
    """
    Searches the live NASA POWER parameter catalog (`GET /api/system/manager/parameters`)
    and constructs DataProduct records strictly from NASA POWER's response fields.
    """
    param_dict = await _fetch_live_power_parameter_dict(client)
    if not param_dict:
        return []

    search_terms = [
        t.lower()
        for kw in keywords
        for t in re.findall(r"[a-z0-9]+", kw.lower())
        if len(t) >= 3
    ]

    scored: List[Tuple[float, str, dict]] = []
    for code, meta in param_dict.items():
        if not isinstance(meta, dict):
            continue
        # Skip diurnal hourly slot parameters like AIRMASS_00..AIRMASS_23
        if re.search(r"_\d{2}$", code):
            continue
        if meta.get("calculated") is True and "STD" in code:
            continue

        name = str(meta.get("name", code))
        definition = str(meta.get("definition", ""))
        ptype = str(meta.get("type", "METEOROLOGY"))
        units = str(meta.get("units", ""))
        text_blob = f"{code} {name} {definition} {ptype}".lower()

        score = 0.0
        for term in search_terms:
            if term == code.lower():
                score += 25.0
            elif term in name.lower():
                score += 12.0
            elif term in definition.lower():
                score += 6.0
            elif term in ptype.lower():
                score += 3.0

        # Prioritize primary physical parameters when keywords match their domain
        if score > 0:
            if code in ("T2M", "T2M_MAX", "T2M_MIN", "TS", "PRECTOTCORR", "GWETTOP", "GWETROOT", "GWETPROF", "ALLSKY_SFC_SW_DWN", "RH2M", "WS10M", "EVLAND", "T2MDEW"):
                score += 15.0
            scored.append((score, code, meta))

    scored.sort(key=lambda item: item[0], reverse=True)
    top_items = scored[:max_results]

    products: List[DataProduct] = []
    for raw_score, code, meta in top_items:
        name = str(meta.get("name", code))
        definition = str(meta.get("definition", "NASA POWER satellite/reanalysis parameter."))
        units = str(meta.get("units", ""))
        source_model = str(meta.get("source", "MERRA-2 / CERES"))
        ptype = str(meta.get("type", "METEOROLOGY")).title()

        rec_agg = "sum" if "precip" in name.lower() or "mm" in units.lower() else "mean"
        rel_score = min(99.0, round(65.0 + min(34.0, raw_score), 1))

        layer = VariableLayer(
            variable_id=code,
            variable_name=name,
            unit=units,
            description=definition,
            native_frequency="Daily",
            supported_frequencies=["Daily", "Monthly", "Seasonal", "Yearly"],
            recommended_aggregation=rec_agg,  # type: ignore[arg-type]
        )

        products.append(
            DataProduct(
                product_id=f"NASA_POWER_{code}",
                variable_id=code,
                variable_name=name,
                title=f"NASA POWER — {name} ({code})",
                category=ptype,
                source_api="NASA POWER",
                provider_agency=f"NASA Langley Research Center (LaRC) POWER Project ({source_model})",
                mission_or_instrument=f"NASA POWER / {source_model} Assimilation",
                source_url="https://power.larc.nasa.gov/docs/services/api/",
                citation_doi="https://power.larc.nasa.gov/",
                description=definition,
                what_it_measures=f"{name} ({units}) derived from {source_model} for community {meta.get('community', 'AG')}.",
                unit=units,
                native_frequency="Daily",
                supported_frequencies=["Daily", "Monthly", "Seasonal", "Yearly"],
                temporal_start="1981-01-01",
                temporal_end="2025-12-31",
                spatial_resolution="0.5° × 0.625° (MERRA-2) / 1.0° (CERES)",
                spatial_resolution_km=50.0,
                spatial_coverage="Global",
                spatial_bbox=[-180.0, -90.0, 180.0, 90.0],
                gcmd_keywords=[name.lower(), code.lower(), ptype.lower(), source_model.lower()],
                ai_match_reason=f"Live NASA POWER parameter '{code}' ({name}) matched via /api/system/manager/parameters.",
                relevance_score=rel_score,
                is_async=False,
                available_layers=[layer],
            )
        )

    return products


async def extract_nasa_power_timeseries(
    req: ExtractionRequest,
    lat: float,
    lon: float,
    client: httpx.AsyncClient,
) -> Tuple[pd.Series, Dict[str, str], str]:
    """
    Executes a live time-series extraction request against NASA POWER's REST API.
    Eligible bounding boxes use the regional endpoint and are reduced across returned
    grid cells; smaller boxes retain the point endpoint because POWER requires at least
    a two-degree latitude span for regional requests.
    Returns (pandas Series indexed by Timestamp, live header metadata dict, exact URL called).
    Raises RuntimeError if upstream returns no valid data.
    """
    param = req.variable_id.replace("NASA_POWER_", "").strip()
    start_yr = max(1981, int(req.start_date[:4]))
    end_yr = min(2025, int(req.end_date[:4]))
    use_bbox = req.spatial_Submode == "bbox"

    if use_bbox:
        if len(req.bbox) != 4 or not all(math.isfinite(value) for value in req.bbox):
            raise RuntimeError("NASA POWER regional extraction requires four finite bounding-box coordinates.")
        min_lon, min_lat, max_lon, max_lat = req.bbox
        if (
            min_lon < -180
            or max_lon > 180
            or min_lat < -90
            or max_lat > 90
            or min_lon >= max_lon
            or min_lat >= max_lat
        ):
            raise RuntimeError("NASA POWER regional extraction received invalid bounding-box coordinates.")

        width = max_lon - min_lon
        height = max_lat - min_lat
        if width > MAX_REGIONAL_SPAN_DEGREES or height > MAX_REGIONAL_SPAN_DEGREES:
            raise RuntimeError(
                f"NASA POWER regional extraction is limited to {MAX_REGIONAL_SPAN_DEGREES:g} degrees per side."
            )

    regional_fallback_reason: Optional[str] = None
    use_regional = False
    if use_bbox:
        if height < REGIONAL_MIN_LATITUDE_SPAN_DEGREES:
            regional_fallback_reason = (
                "NASA POWER regional requests require at least a 2-degree north-south span"
            )
        elif req.spatial_reduction == "grid":
            regional_fallback_reason = (
                "the time-series preview cannot retain NASA POWER's per-grid-cell output"
            )
        else:
            use_regional = True
            estimated_cells = (
                math.ceil(width / POWER_GRID_LONGITUDE_SPAN_DEGREES) + 1
            ) * (math.ceil(height / POWER_GRID_LATITUDE_SPAN_DEGREES) + 1)
            if req.target_frequency in ("Daily", "8-Day", "16-Day"):
                start_date = dt.date.fromisoformat(req.start_date[:10])
                end_date = dt.date.fromisoformat(req.end_date[:10])
                time_steps = max(0, (end_date - start_date).days + 1)
            else:
                time_steps = max(0, (end_yr - start_yr + 1) * 12)
            estimated_values = estimated_cells * time_steps
            if estimated_values > MAX_REGIONAL_GRID_TIME_VALUES:
                raise RuntimeError(
                    "NASA POWER regional request is estimated to contain "
                    f"{estimated_values:,} grid-cell time values, above the "
                    f"{MAX_REGIONAL_GRID_TIME_VALUES:,} safety limit. Reduce the area or date range, "
                    "or choose a coarser frequency."
                )

    if req.target_frequency in ("Daily", "8-Day", "16-Day"):
        start_ymd = req.start_date.replace("-", "")[:8]
        end_ymd = req.end_date.replace("-", "")[:8]
        if use_regional:
            url = (
                "https://power.larc.nasa.gov/api/temporal/daily/regional"
                f"?parameters={param}&community=ag&longitude-min={min_lon}&longitude-max={max_lon}"
                f"&latitude-min={min_lat}&latitude-max={max_lat}"
                f"&start={start_ymd}&end={end_ymd}&format=JSON"
            )
        else:
            url = (
                "https://power.larc.nasa.gov/api/temporal/daily/point"
                f"?parameters={param}&community=ag&longitude={lon}&latitude={lat}"
                f"&start={start_ymd}&end={end_ymd}&format=JSON"
            )
    else:
        if use_regional:
            url = (
                "https://power.larc.nasa.gov/api/temporal/monthly/regional"
                f"?parameters={param}&community=ag&longitude-min={min_lon}&longitude-max={max_lon}"
                f"&latitude-min={min_lat}&latitude-max={max_lat}"
                f"&start={start_yr}&end={end_yr}&format=JSON"
            )
        else:
            url = (
                "https://power.larc.nasa.gov/api/temporal/monthly/point"
                f"?parameters={param}&community=ag&longitude={lon}&latitude={lat}"
                f"&start={start_yr}&end={end_yr}&format=JSON"
            )

    resp = await client.get(url, timeout=35.0)
    if resp.status_code != 200:
        raise RuntimeError(
            f"NASA POWER API returned HTTP {resp.status_code} for parameter '{param}': {resp.text[:300]}"
        )

    payload = resp.json()
    header = payload.get("header", {})
    fill_value = float(header.get("fill_value", -999.0))
    param_meta = payload.get("parameters", {}).get(param, {})
    if use_regional:
        records, cell_count = _reduce_regional_grid(payload, param, fill_value, req.spatial_reduction)
        if not records:
            raise RuntimeError(
                f"NASA POWER returned no valid regional grid-cell observations for '{param}'."
            )
        if req.spatial_reduction == "median":
            spatial_semantics = f"NASA POWER median of {cell_count} regional grid cells"
        else:
            spatial_semantics = (
                f"NASA POWER cosine-latitude weighted mean of {cell_count} regional grid cells"
            )
    else:
        series_dict = payload.get("properties", {}).get("parameter", {}).get(param, {})
        if not series_dict:
            raise RuntimeError(f"NASA POWER returned an empty parameter dictionary for '{param}'.")

        records = {}
        for key, val in series_dict.items():
            timestamp = _parse_power_timestamp(key)
            if timestamp is None:
                continue
            value = float(val)
            if math.isfinite(value) and value != fill_value:
                records[timestamp] = value
        if not records:
            raise RuntimeError(f"No valid timestamps parsed from NASA POWER response for '{param}'.")
        if use_bbox:
            spatial_semantics = (
                f"NASA POWER centroid point sample ({lat:.3f}, {lon:.3f}); "
                f"{regional_fallback_reason or 'regional extraction was not requested'}"
            )
        else:
            spatial_semantics = "NASA POWER point sample"

    meta_out = {
        "unit": str(param_meta.get("units", req.unit or "")),
        "longname": str(param_meta.get("longname", param)),
        "title": str(header.get("title", "NASA POWER Native Resolution API")),
        "sources": ", ".join(header.get("sources", ["MERRA-2"])),
        "api_version": str(header.get("api", {}).get("version", "v2.10.0")),
        "spatial_semantics": spatial_semantics,
    }

    return pd.Series(records, dtype=object).sort_index(), meta_out, url


def _parse_power_timestamp(key: str) -> Optional[pd.Timestamp]:
    if len(key) == 6:
        if key.endswith("13"):
            return None
        return pd.Timestamp(f"{key[:4]}-{key[4:6]}-01")
    if len(key) == 8:
        return pd.Timestamp(f"{key[:4]}-{key[4:6]}-{key[6:8]}")
    return None


def _reduce_regional_grid(
    payload: dict,
    param: str,
    fill_value: float,
    spatial_reduction: str,
) -> Tuple[Dict[pd.Timestamp, float], int]:
    values_by_timestamp: Dict[pd.Timestamp, List[Tuple[float, float]]] = defaultdict(list)
    cell_count = 0

    for feature in payload.get("features", []):
        coordinates = feature.get("geometry", {}).get("coordinates", [])
        parameter_values = feature.get("properties", {}).get("parameter", {}).get(param, {})
        if not isinstance(coordinates, list) or len(coordinates) < 2 or not isinstance(parameter_values, dict):
            continue

        latitude = float(coordinates[1])
        weight = math.cos(math.radians(latitude))
        if weight <= 0 or not math.isfinite(weight):
            continue
        cell_count += 1

        for key, raw_value in parameter_values.items():
            timestamp = _parse_power_timestamp(key)
            if timestamp is None:
                continue
            value = float(raw_value)
            if math.isfinite(value) and value != fill_value:
                values_by_timestamp[timestamp].append((value, weight))

    records: Dict[pd.Timestamp, float] = {}
    for timestamp, weighted_values in values_by_timestamp.items():
        if spatial_reduction == "median":
            records[timestamp] = float(statistics.median(value for value, _ in weighted_values))
        else:
            total_weight = sum(weight for _, weight in weighted_values)
            if total_weight > 0:
                records[timestamp] = sum(
                    value * weight for value, weight in weighted_values
                ) / total_weight

    return records, cell_count
