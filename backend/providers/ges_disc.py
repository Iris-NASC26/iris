"""
NASA GES DISC — Giovanni in the Cloud (GiC) Time Series Provider (Isolated Module)
Official Docs & Tutorial:
- https://github.com/nasa/gesdisc-tutorials/blob/main/notebooks/How_to_Access_GiC_Time_Series_Service.ipynb
- Live Endpoint: GET https://api.giovanni.earthdata.nasa.gov/timeseries
- Auth Header:   Authorization: Bearer <EARTHDATA_TOKEN>
- Query Params:  data=<variable_id>, location=[<lat>,<lon>], time=<start>T00:00:00/<end>T23:59:59
- Zero synthetic data: parses the 13-row CSV metadata header and Timestamp,Data observations directly.
"""

from __future__ import annotations

import io
import re
from typing import Dict, List, Optional, Tuple

import httpx
import pandas as pd

from config import get_earthdata_token
from providers.cmr import search_cmr_catalog
from schemas import DataProduct, ExtractionRequest, VariableLayer

# Verified GiC Time Series variable identifiers supported by https://api.giovanni.earthdata.nasa.gov/timeseries
# Coupled with live CMR metadata lookup from provider=GES_DISC
GIC_VERIFIED_VARIABLES: List[Dict[str, str]] = [
    {
        "gic_data_id": "GLDAS_NOAH025_3H_2_1_SoilMoi0_10cm_inst",
        "cmr_short_name": "GLDAS_NOAH025_3H",
        "version": "2.1",
        "variable_name": "GLDAS Noah Soil Moisture (0–10 cm) Time Series",
        "unit": "kg m-2",
        "keywords": "soil moisture drought hydrology gldas water land",
    },
    {
        "gic_data_id": "GLDAS_NOAH025_3H_2_1_Tair_f_inst",
        "cmr_short_name": "GLDAS_NOAH025_3H",
        "version": "2.1",
        "variable_name": "GLDAS Noah Near-Surface Air Temperature Time Series",
        "unit": "K",
        "keywords": "temperature air thermal heat gldas climate",
    },
    {
        "gic_data_id": "GLDAS_NOAH025_3H_2_1_Rainf_f_tavg",
        "cmr_short_name": "GLDAS_NOAH025_3H",
        "version": "2.1",
        "variable_name": "GLDAS Noah Precipitation Flux Time Series",
        "unit": "kg m-2 s-1",
        "keywords": "precipitation rain rainfall monsoon flood drought gldas",
    },
    {
        "gic_data_id": "GLDAS_NOAH025_3H_2_1_Evap_tavg",
        "cmr_short_name": "GLDAS_NOAH025_3H",
        "version": "2.1",
        "variable_name": "GLDAS Noah Evapotranspiration Flux Time Series",
        "unit": "kg m-2 s-1",
        "keywords": "evapotranspiration evaporation hydrology drought gldas",
    },
]


async def search_ges_disc_catalog(
    keywords: List[str],
    client: httpx.AsyncClient,
    max_results: int = 5,
) -> List[DataProduct]:
    """
    Queries live NASA CMR for provider=GES_DISC collections and pairs them with
    Giovanni in the Cloud (GiC) time-series variable identifiers.
    """
    cmr_products = await search_cmr_catalog(
        keywords=keywords, client=client, provider="GES_DISC", max_results=max_results
    )

    terms = [
        t.lower()
        for kw in keywords
        for t in re.findall(r"[a-z0-9]+", kw.lower())
        if len(t) >= 3
    ]

    gic_products: List[DataProduct] = []
    for entry in GIC_VERIFIED_VARIABLES:
        score = sum(12.0 for t in terms if t in entry["keywords"])
        if score > 0 or not terms:
            data_id = entry["gic_data_id"]
            layer = VariableLayer(
                variable_id=data_id,
                variable_name=entry["variable_name"],
                unit=entry["unit"],
                description=f"Giovanni in the Cloud (GiC) direct time-series stream for {data_id}.",
                native_frequency="Daily",
                supported_frequencies=["Daily", "Monthly", "Seasonal", "Yearly"],
                recommended_aggregation="mean",
            )
            gic_products.append(
                DataProduct(
                    product_id=f"GES_DISC_{data_id}",
                    variable_id=data_id,
                    variable_name=entry["variable_name"],
                    title=f"NASA GES DISC (Giovanni in the Cloud) — {entry['variable_name']} ({entry['cmr_short_name']} v{entry['version']})",
                    category="Hydrology & Land Surface",
                    source_api="NASA GES DISC",
                    provider_agency="NASA Goddard Earth Sciences Data and Information Services Center (GES DISC)",
                    mission_or_instrument=f"{entry['cmr_short_name']} v{entry['version']} via api.giovanni.earthdata.nasa.gov",
                    source_url="https://disc.gsfc.nasa.gov/",
                    citation_doi="https://doi.org/10.5067/E7TYRXPJKWOQ",
                    description=f"Direct point time series retrieved from NASA's Giovanni in the Cloud service (api.giovanni.earthdata.nasa.gov/timeseries) for variable {data_id}.",
                    what_it_measures=f"3-hourly / daily / monthly {entry['variable_name']} ({entry['unit']}) at 0.25° × 0.25° resolution.",
                    unit=entry["unit"],
                    native_frequency="Daily",
                    supported_frequencies=["Daily", "Monthly", "Seasonal", "Yearly"],
                    temporal_start="2000-01-01",
                    temporal_end="2025-12-31",
                    spatial_resolution="0.25° × 0.25°",
                    spatial_resolution_km=25.0,
                    spatial_coverage="Global",
                    spatial_bbox=[-180.0, -60.0, 180.0, 90.0],
                    gcmd_keywords=entry["keywords"].split(),
                    ai_match_reason=f"Verified NASA GES DISC Giovanni in the Cloud time-series variable ({data_id}).",
                    relevance_score=min(98.0, 82.0 + score),
                    is_async=False,
                    available_layers=[layer],
                )
            )

    # Also tag live CMR GES_DISC results with source_api="NASA GES DISC"
    for cp in cmr_products:
        cp.source_api = "NASA GES DISC"
        gic_products.append(cp)

    return gic_products[:max_results]


def parse_gic_timeseries_csv(csv_text: str) -> Tuple[Dict[str, str], pd.Series]:
    """
    Parses the 13-row metadata header and CSV body returned by
    `https://api.giovanni.earthdata.nasa.gov/timeseries` as documented in
    `How_to_Access_GiC_Time_Series_Service.ipynb`.
    """
    headers: Dict[str, str] = {}
    lines = csv_text.strip().splitlines()
    data_start_idx = 0

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("Timestamp"):
            data_start_idx = idx + 1
            break
        if "," in stripped:
            k, v = stripped.split(",", 1)
            headers[k.strip()] = v.strip()

    if data_start_idx == 0 or data_start_idx >= len(lines):
        raise RuntimeError(
            f"Unexpected CSV structure from NASA GES DISC GiC service: {csv_text[:300]}"
        )

    undef_val = float(headers.get("undef", "-9999"))
    records: Dict[pd.Timestamp, Optional[float]] = {}

    for line in lines[data_start_idx:]:
        if "," not in line:
            continue
        ts_str, val_str = line.split(",", 1)
        try:
            ts = pd.Timestamp(ts_str.strip())
            fval = float(val_str.strip())
            records[ts] = None if fval == undef_val else fval
        except ValueError:
            continue

    if not records:
        raise RuntimeError("No valid timestamp-value rows parsed from NASA GES DISC GiC response.")

    return headers, pd.Series(records, dtype=object).sort_index()


async def extract_ges_disc_timeseries(
    req: ExtractionRequest,
    lat: float,
    lon: float,
    client: httpx.AsyncClient,
    earthdata_token: Optional[str] = None,
) -> Tuple[pd.Series, Dict[str, str], str]:
    """
    Executes a live GET request against `https://api.giovanni.earthdata.nasa.gov/timeseries`
    using the user's NASA Earthdata Login Bearer token.
    """
    token = get_earthdata_token(earthdata_token)
    if not token:
        raise RuntimeError(
            "NASA EARTHDATA_TOKEN is required in backend/.env to query api.giovanni.earthdata.nasa.gov/timeseries."
        )

    data_param = req.variable_id.replace("GES_DISC_", "").strip()
    start_iso = f"{req.start_date[:10]}T03:00:00"
    end_iso = f"{req.end_date[:10]}T21:00:00"

    url = "https://api.giovanni.earthdata.nasa.gov/timeseries"
    # Giovanni in the Cloud requires literal [lat,lon] and literal / in time=start/end (not percent-encoded)
    full_url = f"{url}?data={data_param}&location=[{lat},{lon}]&time={start_iso}/{end_iso}"

    last_err = ""
    for attempt in range(3):
        try:
            resp = await client.get(
                full_url,
                headers={"Authorization": f"Bearer {token}"},
                timeout=45.0,
            )
            if resp.status_code == 200:
                headers, series = parse_gic_timeseries_csv(resp.text)
                return series, headers, full_url
            last_err = f"HTTP {resp.status_code}: {resp.text[:300]}"
            if resp.status_code not in (500, 502, 503, 504):
                break
        except httpx.TimeoutException as exc:
            last_err = f"Timeout: {exc}"

    raise RuntimeError(
        f"NASA GES DISC GiC API failed for '{data_param}' after retries: {last_err}"
    )
