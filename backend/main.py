"""
Project Iris — Decoupled FastAPI Live Data Discovery, Conversational SI, Extraction & Statistical API
100% Real Data Architecture (Zero Dummy / Synthetic Data):
- Isolated NASA API Providers (`backend/providers/`):
  1. `nasa_power.py` — NASA POWER Parameter Manager & Point Time Series API
  2. `cmr.py`        — NASA Common Metadata Repository (UMM-JSON Collections & Variables)
  3. `appeears.py`   — NASA AppEEARS Product & Layer Service
  4. `ges_disc.py`   — NASA GES DISC Giovanni in the Cloud (GiC) Time Series Service
  5. `harmony.py`    — NASA Harmony Cloud Capabilities & Subsetting Discovery
  6. `geocoder.py`   — Live Open-Meteo WGS84 Place Geocoder
- Conversational SI Chat (`POST /api/v1/si/chat`) powered by `gemini-3.5-flash-lite`
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional

import httpx
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy import stats

try:
    import pymannkendall as mk
except ImportError:
    mk = None

try:
    from statsmodels.tsa.seasonal import STL
except ImportError:
    STL = None

from adapters.catalog_adapters import (
    discover_catalog_products,
    get_cached_live_products,
    get_product_by_id_live,
)
from adapters.extraction_adapters import (
    get_job_preview,
    get_job_status,
    run_extraction_pipeline,
)
from providers.appeears import search_appeears_catalog
from providers.cmr import search_cmr_catalog
from providers.copernicus_cds import search_copernicus_cds_catalog
from providers.eodag_provider import search_eodag_catalog
from providers.geocoder import geocode_place_live
from providers.ges_disc import search_ges_disc_catalog
from providers.harmony import search_harmony_catalog
from providers.nasa_power import search_nasa_power_catalog
from providers.noaa_cdo import search_noaa_cdo_catalog
from providers.noaa_onestop import search_noaa_onestop_catalog
from providers.opendap import search_opendap_catalog
from providers.research_literature import execute_research_search
from schemas import (
    CaseFileAnalysisRequest,
    CaseFileAnalysisResponse,
    ChatTurnRequest,
    ChatTurnResponse,
    DiscoverRequest,
    DiscoveryResponse,
    ExtractionRequest,
    GlobeCubeResponse,
    JobStatusResponse,
    PreviewResponse,
    ProductDetailsResponse,
    ResearchSearchRequest,
    ResearchSearchResponse,
)
from services.capability_matrix import get_capability_matrix
from services.cube_service import (
    CUBE_LAYERS,
    CUBE_VERSION,
    SNAPSHOT_UTC,
    get_evidence_methods_registry,
    get_globe_cube_data,
)
from services.llm_router import extract_scientific_intent, rank_and_explain_products
from services.science_pipeline import execute_case_file_analysis, load_series_from_job_id
from services.si_chat import process_si_chat_turn

app = FastAPI(
    title="Project Iris — Live NASA Earth Observation Discovery, Conversational SI & Extraction API",
    version="3.0.0",
    description="100% Live NASA Data Pipeline (NASA POWER, NASA CMR, NASA AppEEARS, NASA GES DISC GiC, NASA Harmony) + Gemini 3.5 Flash-Lite",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# 1. CONVERSATIONAL SI CHAT & LIVE CATALOG DISCOVERY ENDPOINTS
# ============================================================================


@app.post("/api/v1/si/chat", response_model=ChatTurnResponse)
async def si_conversational_chat(req: ChatTurnRequest) -> ChatTurnResponse:
    """
    Streamlined multi-step conversational SI endpoint powered by `gemini-3.5-flash-lite`:
    - Step 1 (`topic_discovery`): Identifies subject domain & keywords, queries the 5 live NASA APIs,
      and returns selectable dataset options.
    - Step 2 (`parameter_definition`): Configures Date Range, Temporal Frequency, and Region/Coordinates.
    - Step 3 (`ready_to_extract`): Signals ready to extract real time-series data.
    """
    try:
        return await process_si_chat_turn(req)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SI chat processing error: {exc}") from exc


@app.post("/api/v1/si/discover", response_model=DiscoveryResponse)
async def si_discover_datasets(req: DiscoverRequest) -> DiscoveryResponse:
    """
    1. Identifies the user's scientific subject domain, keywords, target variables,
       live-geocoded spatial scope, and date bounds via `gemini-3.5-flash-lite`.
    2. Concurrently queries the 5 live NASA APIs (`NASA POWER`, `NASA CMR`, `NASA AppEEARS`,
       `NASA GES DISC`, `NASA Harmony`).
    3. Ranks candidate time-series products and explains where each dataset is from
       and what exactly it measures.
    """
    intent, cache_hit = await extract_scientific_intent(
        prompt=req.prompt,
        preferred_providers=req.preferred_providers,
        user_api_key=req.gemini_api_key,
    )
    candidates, queried_sources, provider_status = await discover_catalog_products(
        intent=intent,
        preferred_providers=req.preferred_providers,
    )
    ranked = rank_and_explain_products(candidates, intent, req.prompt)

    return DiscoveryResponse(
        query=req.prompt,
        intent=intent,
        products=ranked,
        queried_sources=queried_sources,
        provider_status=provider_status,
        cache_hit=cache_hit,
        total_candidates_evaluated=len(candidates),
    )


@app.get("/api/v1/catalog/product-details", response_model=ProductDetailsResponse)
async def get_catalog_product_details(
    product_id: str = Query(..., description="Unique dataset product ID"),
    source_api: Optional[str] = Query(default=None, description="Upstream API source name"),
    variable_id: Optional[str] = Query(default=None, description="Selected variable layer ID"),
) -> ProductDetailsResponse:
    """
    Fetches live variable/layer metadata, valid date bounds, units,
    supported frequencies, and global spatial resolution guardrail checks.
    """
    try:
        product = await get_product_by_id_live(
            product_id=product_id, source_api=source_api, variable_id=variable_id
        )
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    global_eligible = product.spatial_resolution_km >= 1.0
    warning: Optional[str] = None
    if product.spatial_resolution_km <= 5.6:
        warning = (
            f"{product.title} has fine native resolution ({product.spatial_resolution}). "
            "Use Regional / Point-Sampling mode to extract time-series observations without multi-gigabyte granule downloads."
        )

    est_seconds = 5 if product.is_async else 2
    est_mb = round(max(0.25, 10.0 / max(1.0, product.spatial_resolution_km)), 2)

    return ProductDetailsResponse(
        product=product,
        recommended_date_start=max("2015-01-01", product.temporal_start),
        recommended_date_end=product.temporal_end if product.temporal_end != "Present" else "2025-12-31",
        global_eligible=global_eligible,
        high_res_global_warning=warning,
        estimated_fetch_seconds=est_seconds,
        estimated_volume_mb=est_mb,
    )


@app.get("/api/v1/catalog/products")
async def list_all_catalog_products() -> dict:
    """Returns all live-discovered products currently cached in the registry."""
    prods = get_cached_live_products()
    return {"products": prods, "count": len(prods)}


@app.get("/api/v1/geocode")
async def geocode_location(
    q: str = Query(..., min_length=2, description="Place, city, state, or country name")
) -> dict:
    """Resolves a place name into real WGS84 coordinates and bounding box via live Open-Meteo geocoding."""
    res = await geocode_place_live(q)
    if not res:
        raise HTTPException(status_code=404, detail=f"Could not geocode location '{q}'.")
    return res


@app.get("/api/v1/providers/{provider_id}/test")
async def test_individual_provider(
    provider_id: str,
    keyword: str = Query(default="temperature", description="Search keyword for live test"),
) -> dict:
    """
    Isolated diagnostic endpoint to test each of the 10 Earth Observation & Climate API providers independently:
    `provider_id` in `['nasa_power', 'cmr', 'appeears', 'ges_disc', 'harmony', 'noaa_cdo', 'noaa_onestop', 'opendap', 'eodag', 'copernicus_cds']`.
    """
    pid = provider_id.lower().strip()
    async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
        if pid == "nasa_power":
            prods = await search_nasa_power_catalog([keyword], client, max_results=3)
        elif pid == "cmr":
            prods = await search_cmr_catalog([keyword], client, max_results=3)
        elif pid == "appeears":
            prods = await search_appeears_catalog([keyword], client, max_results=3)
        elif pid == "ges_disc":
            prods = await search_ges_disc_catalog([keyword], client, max_results=3)
        elif pid == "harmony":
            prods = await search_harmony_catalog([keyword], client, max_results=3)
        elif pid == "noaa_cdo":
            prods = await search_noaa_cdo_catalog([keyword], client, max_results=3)
        elif pid == "noaa_onestop":
            prods = await search_noaa_onestop_catalog([keyword], client, max_results=3)
        elif pid == "opendap":
            prods = await search_opendap_catalog([keyword], client, max_results=3)
        elif pid == "eodag":
            prods = await search_eodag_catalog([keyword], client, max_results=3)
        elif pid == "copernicus_cds":
            prods = await search_copernicus_cds_catalog([keyword], client, max_results=3)
        else:
            raise HTTPException(
                status_code=400,
                detail="provider_id must be one of: nasa_power, cmr, appeears, ges_disc, harmony, noaa_cdo, noaa_onestop, opendap, eodag, copernicus_cds",
            )
    return {
        "provider": provider_id,
        "status": "ok",
        "keyword": keyword,
        "products_returned": len(prods),
        "products": prods,
    }


# ============================================================================
# 2. LIVE TIME-SERIES EXTRACTION & JOB PREVIEW ENDPOINTS
# ============================================================================


@app.post("/api/v1/timeseries/extract", response_model=PreviewResponse)
async def extract_timeseries_data(req: ExtractionRequest) -> PreviewResponse:
    """
    Executes a 100% live time-series extraction against the selected NASA provider adapter.
    Never synthesizes dummy data — raises HTTP 422 if the selected collection does not
    support direct time-series extraction or if upstream returns an error.
    """
    try:
        return await run_extraction_pipeline(req)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/timeseries/jobs/{job_id}/status", response_model=JobStatusResponse)
async def poll_extraction_job_status(job_id: str) -> JobStatusResponse:
    """Polls execution status for a real extraction job."""
    try:
        return get_job_status(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/v1/timeseries/jobs/{job_id}/preview", response_model=PreviewResponse)
async def retrieve_extraction_job_preview(
    job_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=10, le=1000),
) -> PreviewResponse:
    """Retrieves the normalized real time-series data, summary statistics, and paginated table rows."""
    try:
        return await get_job_preview(job_id=job_id, page=page, page_size=page_size)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ============================================================================
# 3. STATISTICAL & MATHEMATICAL PROCESSING PIPELINE (100% REAL NASA POWER DATA)
# ============================================================================


class TimeSeriesRequest(BaseModel):
    caseId: Optional[str] = "IR–042"
    datasetId: str = "temperature"
    datasetName: str = "Near-surface air temperature"
    parameterCode: str = "T2M"
    unit: str = "°C"
    location: str = "Colombo, Sri Lanka"
    latitude: float = 6.9355
    longitude: float = 79.8487
    startYear: int = Field(default=2005, ge=1981, le=2025)
    endYear: int = Field(default=2025, ge=1982, le=2026)


class ObservationPoint(BaseModel):
    date: str
    observed: float
    trend: float
    seasonal: float
    residual: float
    deseasonalized: float
    zScore: float
    isAnomaly: bool


class TimeSeriesResponse(BaseModel):
    caseId: str
    datasetId: str
    datasetName: str
    unit: str
    location: str
    startYear: int
    endYear: int
    olsDecadalSlope: float
    olsPValue: float
    mkPValue: float
    mkZScore: float
    kendallTau: float
    sensSlopeDecadal: float
    sensCiLow: float
    sensCiHigh: float
    significanceHorizonYears: int
    observations: List[ObservationPoint]


async def fetch_nasa_power_monthly_strict(
    parameter: str, lat: float, lon: float, start_year: int, end_year: int
) -> pd.Series:
    url = (
        "https://power.larc.nasa.gov/api/temporal/monthly/point"
        f"?parameters={parameter}&community=ag&longitude={lon}&latitude={lat}"
        f"&start={start_year}&end={end_year}&format=JSON"
    )
    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"NASA POWER upstream API returned HTTP {resp.status_code} for {parameter}.",
            )
        payload = resp.json()
        param_dict = payload.get("properties", {}).get("parameter", {}).get(parameter, {})
        records: Dict[str, float] = {}
        for key, val in param_dict.items():
            if len(key) == 6 and not key.endswith("13") and float(val) != -999.0:
                date_label = f"{key[:4]}-{key[4:6]}"
                records[date_label] = float(val)
        if len(records) < 12:
            raise HTTPException(
                status_code=422,
                detail=f"NASA POWER returned fewer than 12 valid monthly observations for {parameter}.",
            )
        return pd.Series(records).sort_index()


@app.post("/api/v1/analyze/timeseries", response_model=TimeSeriesResponse)
async def analyze_timeseries(req: TimeSeriesRequest) -> TimeSeriesResponse:
    if req.endYear <= req.startYear:
        raise HTTPException(status_code=400, detail="endYear must be greater than startYear")

    series = await fetch_nasa_power_monthly_strict(
        req.parameterCode, req.latitude, req.longitude, req.startYear, req.endYear
    )

    observed = series.values.astype(float)
    if STL is not None:
        stl = STL(observed, period=12, robust=True).fit()
        trend = stl.trend
        seasonal = stl.seasonal
        residual = stl.resid
    else:
        s_pd = pd.Series(observed)
        trend = s_pd.rolling(window=12, min_periods=1, center=True).mean().to_numpy()
        detrended = observed - trend
        seasonal = np.zeros_like(observed)
        for m in range(12):
            seasonal[m::12] = np.mean(detrended[m::12])
        residual = observed - trend - seasonal

    deseasonalized = observed - seasonal

    x = np.arange(len(deseasonalized), dtype=float)
    ols_res = stats.linregress(x, deseasonalized)
    ols_decadal_slope = float(ols_res.slope * 120.0)
    ols_p_value = float(ols_res.pvalue)

    if mk is not None:
        mk_res = mk.original_test(deseasonalized)
        sens_res = mk.sens_slope(deseasonalized)
        sens_decadal = float(sens_res.slope * 120.0)
        mk_p = float(mk_res.p)
        mk_z = float(mk_res.z)
        mk_tau = float(mk_res.Tau)
    else:
        tau_res = stats.kendalltau(x, deseasonalized)
        mk_tau = float(tau_res.statistic)
        mk_p = float(tau_res.pvalue)
        mk_z = float(stats.norm.ppf(1.0 - min(0.4999, mk_p / 2.0))) * (
            1.0 if ols_decadal_slope >= 0 else -1.0
        )
        sens_decadal = float(stats.theilslopes(deseasonalized, x)[0] * 120.0)

    ci_half = 1.96 * (abs(sens_decadal) / max(1.0, abs(mk_z))) if mk_z != 0 else 0.11

    res_std = float(np.std(residual, ddof=1)) or 1.0
    res_mean = float(np.mean(residual))
    z_scores = (residual - res_mean) / res_std

    years_elapsed = max(2, req.endYear - req.startYear)
    if mk_p < 0.05:
        horizon_years = 0
    else:
        z_abs = max(0.35, abs(mk_z))
        horizon_years = max(3, math.ceil(years_elapsed * ((1.96 / z_abs) ** 2 - 1.0)))

    points = [
        ObservationPoint(
            date=str(date_key),
            observed=round(float(observed[i]), 3),
            trend=round(float(trend[i]), 3),
            seasonal=round(float(seasonal[i]), 3),
            residual=round(float(residual[i]), 3),
            deseasonalized=round(float(deseasonalized[i]), 3),
            zScore=round(float(z_scores[i]), 2),
            isAnomaly=bool(abs(float(z_scores[i])) >= 2.0),
        )
        for i, date_key in enumerate(series.index)
    ]

    return TimeSeriesResponse(
        caseId=req.caseId or "IR–042",
        datasetId=req.datasetId,
        datasetName=req.datasetName,
        unit=req.unit,
        location=req.location,
        startYear=req.startYear,
        endYear=req.endYear,
        olsDecadalSlope=round(ols_decadal_slope, 3),
        olsPValue=round(ols_p_value, 4),
        mkPValue=round(mk_p, 4),
        mkZScore=round(mk_z, 3),
        kendallTau=round(mk_tau, 3),
        sensSlopeDecadal=round(sens_decadal, 3),
        sensCiLow=round(sens_decadal - ci_half, 3),
        sensCiHigh=round(sens_decadal + ci_half, 3),
        significanceHorizonYears=horizon_years,
        observations=points,
    )


# ============================================================================
# 4. SRS v1.0 CAPABILITY MATRIX, GLOBAL TREND CUBE, CASE BOARD & CASE FILE API
# ============================================================================


@app.get("/api/v1/capabilities")
async def get_provider_capabilities() -> dict:
    """Returns the authoritative SRS v1.0 provider capability matrix and readiness states."""
    return {
        "cube_version": CUBE_VERSION,
        "providers": get_capability_matrix(),
    }


@app.get("/api/v1/cube/manifest")
async def get_global_cube_manifest() -> dict:
    """Returns the versioned Global Trend Cube manifest, layer hashes, and caveats."""
    return {
        "cube_version": CUBE_VERSION,
        "snapshot_timestamp_utc": SNAPSHOT_UTC,
        "layers": CUBE_LAYERS,
    }


@app.get("/api/v1/cube/globe", response_model=GlobeCubeResponse)
async def get_living_globe_cube(
    layer_id: str = Query(default="cube_t2m", description="Cube layer ID or variable code"),
    window: str = Query(default="1981-2025", description="Analysis temporal window"),
) -> GlobeCubeResponse:
    """Serves read-only versioned Global Trend Cube tiles, FDR channel, and dipoles for the Living Globe."""
    return get_globe_cube_data(layer_id=layer_id, window=window)


@app.post("/api/v1/analyze/case-file", response_model=CaseFileAnalysisResponse)
async def analyze_scientific_case_file(req: CaseFileAnalysisRequest) -> CaseFileAnalysisResponse:
    """
    Executes the SRS v1.0 Case File pipeline (Hamed-Rao MK, n_eff, Seasonal Fingerprint,
    Trend Triangle, Evidence Grade A-D, Caveat Registry, 3-level explanations, and Skill-Gated Outlook).
    Consumes an immutable extracted job_id/result_id when supplied, or fetches live NASA POWER observations.
    """
    if req.job_id:
        loaded = load_series_from_job_id(req.job_id)
        if loaded is None:
            raise HTTPException(
                status_code=404,
                detail=f"Extraction job '{req.job_id}' was not found or has no preview.",
            )
        series, preview = loaded
        if preview.extraction_config.target_frequency != "Monthly":
            raise HTTPException(
                status_code=422,
                detail="Plot & Visualize currently requires a monthly time series. Re-extract or resample this product to Monthly before analysis.",
            )
        s_yr = int(preview.extraction_config.start_date[:4])
        e_yr = int(preview.extraction_config.end_date[:4])
        merged_req = req.model_copy(
            update={
                "dataset_name": preview.product.variable_name,
                "parameter_code": preview.extraction_config.variable_id,
                "unit": preview.summary_stats.unit,
                "location": preview.extraction_config.region_name,
                "start_year": s_yr,
                "end_year": e_yr,
            }
        )
        try:
            return execute_case_file_analysis(
                series=series,
                req=merged_req,
                provenance_mode="live_extracted_result",
                source_agency=f"{preview.product.source_api} · {preview.product.provider_agency}",
                citation_doi=preview.product.citation_doi,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    param = req.parameter_code or "T2M"
    series = await fetch_nasa_power_monthly_strict(
        parameter=param,
        lat=req.latitude,
        lon=req.longitude,
        start_year=req.start_year,
        end_year=req.end_year,
    )
    try:
        return execute_case_file_analysis(
            series=series,
            req=req,
            provenance_mode="live_nasa_power",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/evidence/registry")
async def get_evidence_registry() -> dict:
    """Returns Evidence Grade rules, Validation Lab benchmarks, Caveat Registry, and SI disclosure."""
    return get_evidence_methods_registry()


# ============================================================================
# 5. EXISTING RESEARCH LITERATURE & DATASET CITATION DISCOVERY (OPENALEX & DATACITE)
# ============================================================================


@app.post("/api/v1/research/search", response_model=ResearchSearchResponse)
async def search_existing_research(req: ResearchSearchRequest) -> ResearchSearchResponse:
    """
    Searches live OpenAlex (`https://api.openalex.org/works`) and DataCite (`https://api.datacite.org/dois`)
    for peer-reviewed papers, abstracts, datasets, and citations either by manual query (DOI, keyword, topic)
    or by the retrieved dataset's metadata.
    """
    try:
        return await execute_research_search(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Research literature search error: {exc}"
        ) from exc

