"""
Time-Series Data Extraction & Normalization Engine (100% Real Data — Zero Synthetic Fallbacks)
Routes extraction requests strictly to live NASA API provider modules:
- NASA POWER: `providers.nasa_power.extract_nasa_power_timeseries`
- NASA GES DISC (Giovanni in the Cloud): `providers.ges_disc.extract_ges_disc_timeseries`
- NASA AppEEARS / NASA CMR / NASA Harmony: live upstream verification & explicit error reporting when async credentials or granule-level subsetting is required.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import math
import time
import uuid
from typing import Dict, List, Optional, Tuple

import httpx
import numpy as np
import pandas as pd
from scipy import stats

from adapters.catalog_adapters import get_product_by_id_live
from config import get_earthdata_token
from providers.copernicus_cds import extract_copernicus_cds_timeseries
from providers.eodag_provider import extract_eodag_timeseries
from providers.ges_disc import extract_ges_disc_timeseries
from providers.harmony import get_harmony_collection_capabilities
from providers.nasa_power import extract_nasa_power_timeseries
from providers.noaa_cdo import extract_noaa_cdo_timeseries
from providers.noaa_onestop import extract_noaa_onestop_timeseries
from providers.opendap import extract_opendap_timeseries
from schemas import (
    DataProduct,
    ExtractionRequest,
    JobStatusResponse,
    JobStep,
    ObservationRow,
    PreviewResponse,
    SummaryStats,
)
from services.job_store import load_persisted_job, persist_extraction_job

# In-memory job store of real completed extractions: {job_id: {"created_at": float, "req": ExtractionRequest, "preview": PreviewResponse}}
_EXTRACTION_JOBS: Dict[str, Dict[str, object]] = {}


def _resolve_centroid(req: ExtractionRequest) -> Tuple[float, float]:
    if req.spatial_Submode == "point" and req.point_lat is not None and req.point_lon is not None:
        return round(float(req.point_lat), 4), round(float(req.point_lon), 4)
    if req.bbox and len(req.bbox) == 4:
        min_lon, min_lat, max_lon, max_lat = req.bbox
        return round((min_lat + max_lat) / 2.0, 4), round((min_lon + max_lon) / 2.0, 4)
    return 6.9355, 79.8487


def _resample_series(
    series: pd.Series,
    target_frequency: str,
    aggregation: str,
) -> pd.Series:
    """Resamples a DatetimeIndex Series to the requested target frequency while preserving NaNs."""
    s_num = pd.to_numeric(series, errors="coerce")
    if not isinstance(s_num.index, pd.DatetimeIndex):
        s_num.index = pd.to_datetime(s_num.index)
    s_num = s_num.sort_index()

    rule_map = {
        "Daily": "D",
        "8-Day": "8D",
        "16-Day": "16D",
        "Monthly": "MS",
        "Seasonal": "QS-DEC",
        "Yearly": "YS",
    }
    rule = rule_map.get(target_frequency, "MS")

    if len(s_num) >= 2:
        diffs = pd.Series(s_num.index[1:] - s_num.index[:-1])
        median_days = max(0.125, diffs.median().total_seconds() / 86400.0)
        target_days = {"D": 1.0, "8D": 8.0, "16D": 16.0, "MS": 28.0, "QS-DEC": 88.0, "YS": 360.0}.get(
            rule, 28.0
        )
        if median_days < target_days * 0.85:
            resampler = s_num.resample(rule)
            if aggregation == "sum":
                s_num = resampler.sum(min_count=1)
            elif aggregation == "min":
                s_num = resampler.min()
            elif aggregation == "max":
                s_num = resampler.max()
            else:
                s_num = resampler.mean()

    return s_num


async def _fetch_live_series_from_provider_single(
    req: ExtractionRequest,
    product: DataProduct,
    lat: float,
    lon: float,
    client: httpx.AsyncClient,
) -> Tuple[pd.Series, Dict[str, str], str]:
    """
    Dispatches the extraction request strictly to the matching real NASA provider for a single coordinate.
    Raises RuntimeError with exact upstream details if an API cannot return a point/area series.
    """
    api = req.source_api

    # 1. NASA POWER
    if api == "NASA POWER" or req.product_id.startswith("NASA_POWER_"):
        return await extract_nasa_power_timeseries(req, lat, lon, client)

    # 2. NASA GES DISC (Giovanni in the Cloud Time Series Service)
    if api == "NASA GES DISC" or req.product_id.startswith("GES_DISC_") or "GLDAS" in req.variable_id:
        return await extract_ges_disc_timeseries(req, lat, lon, client)

    # 3. NOAA CDO v2
    if api == "NOAA CDO" or req.product_id.startswith("NOAA_CDO_"):
        return await extract_noaa_cdo_timeseries(req, lat, lon, client)

    # 4. NOAA OneStop
    if api == "NOAA OneStop" or req.product_id.startswith("NOAA_ONESTOP_"):
        return await extract_noaa_onestop_timeseries(req, lat, lon, client)

    # 5. NASA Earthdata OPeNDAP in the Cloud
    if api == "OPeNDAP" or req.product_id.startswith("OPENDAP_"):
        return await extract_opendap_timeseries(req, lat, lon, client)

    # 6. EODAG (EODataAccessGateway)
    if api == "EODAG" or req.product_id.startswith("EODAG_"):
        return await extract_eodag_timeseries(req, lat, lon, client)

    # 7. Copernicus CDS (Climate Data Store)
    if api == "Copernicus CDS" or req.product_id.startswith("CDS_"):
        return await extract_copernicus_cds_timeseries(req, lat, lon, client)

    # 8. NASA AppEEARS
    if api == "NASA AppEEARS":
        token = get_earthdata_token()
        task_url = "https://appeears.earthdatacloud.nasa.gov/api/task"
        resp = await client.get(
            task_url,
            headers={"Authorization": f"Bearer {token}"} if token else {},
            timeout=15.0,
        )
        raise RuntimeError(
            f"NASA AppEEARS product '{req.product_id}' (layer '{req.variable_id}') requires an AppEEARS session token "
            f"obtained via Basic Auth (Earthdata username + password) at POST https://appeears.earthdatacloud.nasa.gov/api/login "
            f"(upstream status HTTP {resp.status_code}). To extract immediate synchronous time series, "
            f"select a NASA POWER, NASA GES DISC, NOAA CDO, NOAA OneStop, OPeNDAP, EODAG, or Copernicus CDS dataset."
        )

    # 9. NASA Harmony / NASA CMR
    if api in ("NASA Harmony", "NASA CMR"):
        caps = await get_harmony_collection_capabilities(req.product_id, client)
        cap_info = f"Harmony capabilities: {caps}" if caps else "Collection registered in NASA CMR."
        raise RuntimeError(
            f"Collection '{req.product_id}' ({product.title}) from {api} is an archival granule/swath collection "
            f"({cap_info}) and does not expose a direct synchronous point time-series endpoint. "
            f"Please select a NASA POWER, NASA GES DISC, NOAA CDO, NOAA OneStop, OPeNDAP, EODAG, or Copernicus CDS product for live point time-series extraction."
        )

    raise RuntimeError(f"Unsupported or unconfigured provider '{api}' for product '{req.product_id}'.")


async def _fetch_live_series_from_provider(
    req: ExtractionRequest,
    product: DataProduct,
    lat: float,
    lon: float,
    client: httpx.AsyncClient,
) -> Tuple[pd.Series, Dict[str, str], str]:
    """
    Dispatches the extraction request to live NASA providers.
    Supports both regional/point extraction and multi-zonal cosine-weighted global planetary averaging.
    """
    if req.spatial_level == "global":
        # Global multi-zone cosine-weighted planetary average
        # Sample representative zonal latitudes across Northern, Equatorial, and Southern latitudes
        zonal_specs = [
            (60.0, 0.0, math.cos(math.radians(60.0))),
            (30.0, 0.0, math.cos(math.radians(30.0))),
            (0.0, 0.0, math.cos(math.radians(0.0))),
            (-30.0, 0.0, math.cos(math.radians(-30.0))),
            (-60.0, 0.0, math.cos(math.radians(-60.0))),
        ]
        point_req = req.model_copy(update={"spatial_Submode": "point"})
        tasks = [
            _fetch_live_series_from_provider_single(point_req, product, z_lat, z_lon, client)
            for z_lat, z_lon, _ in zonal_specs
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid_series = []
        valid_weights = []
        for (z_lat, z_lon, w), res in zip(zonal_specs, results):
            if not isinstance(res, Exception):
                s, _, _ = res
                if len(s) > 0:
                    valid_series.append(s)
                    valid_weights.append(w)

        if not valid_series:
            first_err = next((r for r in results if isinstance(r, Exception)), None)
            raise RuntimeError(f"Global planetary extraction failed: {first_err}")

        # Compute cosine-weighted planetary average across all available zones
        df = pd.DataFrame(valid_series).T
        total_w = sum(valid_weights)
        weights_arr = np.array(valid_weights) / total_w
        global_vals = (df * weights_arr).sum(axis=1, min_count=1)
        global_series = pd.Series(global_vals, index=df.index).dropna()
        meta = {
            "spatial_coverage": f"Global average ({len(valid_series)} planetary zones, cosine-weighted)",
            "zones_sampled": str(len(valid_series)),
            "source": product.source_api,
        }
        endpoint = f"{product.source_api} [5-zone planetary cosine-weighted global average]"
        return global_series, meta, endpoint

    return await _fetch_live_series_from_provider_single(req, product, lat, lon, client)


async def run_extraction_pipeline(req: ExtractionRequest) -> PreviewResponse:
    """
    Executes 100% real time-series extraction, temporal resampling, QA flagging, and summary
    statistics calculation. Raises RuntimeError on upstream failure — never synthesizes data.
    """
    product = await get_product_by_id_live(req.product_id, req.source_api, req.variable_id)
    lat, lon = _resolve_centroid(req)

    async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
        raw_series, live_meta, endpoint_called = await _fetch_live_series_from_provider(
            req, product, lat, lon, client
        )

        # Optional secondary comparison series (each tracked with explicit job status)
        secondary_vals: Optional[np.ndarray] = None
        secondary_jobs: List[Dict[str, str]] = []
        if req.additional_products and len(req.additional_products) > 0:
            for idx_sec, sec_info in enumerate(req.additional_products):
                sec_pid = sec_info.get("product_id", "")
                sec_vid = sec_info.get("variable_id", "")
                if not sec_pid or sec_pid == req.product_id:
                    continue
                try:
                    sec_prod = await get_product_by_id_live(sec_pid, None, sec_vid)
                    sec_req = req.model_copy(
                        update={
                            "product_id": sec_prod.product_id,
                            "variable_id": sec_vid or sec_prod.variable_id,
                            "source_api": sec_prod.source_api,
                        }
                    )
                    sec_raw, _, _ = await _fetch_live_series_from_provider(
                        sec_req, sec_prod, lat, lon, client
                    )
                    if idx_sec == 0:
                        sec_resampled = _resample_series(
                            sec_raw, req.target_frequency, req.temporal_aggregation
                        )
                        processed_temp = _resample_series(
                            raw_series, req.target_frequency, req.temporal_aggregation
                        )
                        sec_aligned = sec_resampled.reindex(processed_temp.index)
                        secondary_vals = pd.to_numeric(sec_aligned, errors="coerce").to_numpy()
                    secondary_jobs.append(
                        {
                            "product_id": sec_prod.product_id,
                            "variable_id": sec_vid or sec_prod.variable_id,
                            "source_api": sec_prod.source_api,
                            "status": "completed",
                            "message": f"Retrieved {len(sec_raw)} observations from {sec_prod.source_api}",
                        }
                    )
                except Exception as sec_exc:
                    secondary_jobs.append(
                        {
                            "product_id": sec_pid,
                            "variable_id": sec_vid,
                            "source_api": "Secondary Provider",
                            "status": "failed",
                            "message": str(sec_exc)[:180],
                        }
                    )

    unit = live_meta.get("unit") or req.unit or product.unit

    # Temporal Resampling & Aggregation
    processed = _resample_series(raw_series, req.target_frequency, req.temporal_aggregation)

    # Compute Rolling Average, Z-Score Anomalies, and Summary Statistics from real observations
    s_clean = pd.to_numeric(processed, errors="coerce")
    window = 6 if req.target_frequency in ("Monthly", "16-Day", "8-Day") else 3
    rolling = s_clean.rolling(window=window, min_periods=1).mean()

    valid_series = s_clean.dropna()
    if len(valid_series) == 0:
        raise RuntimeError(
            f"Upstream API ({endpoint_called}) returned 0 valid non-null observations for the requested date window "
            f"({req.start_date} to {req.end_date}). Try expanding your date range."
        )

    if len(valid_series) >= 2:
        mean_val = float(valid_series.mean())
        median_val = float(valid_series.median())
        std_val = float(valid_series.std(ddof=1)) or 1e-6
        min_idx = valid_series.idxmin()
        max_idx = valid_series.idxmax()
        min_val = float(valid_series.loc[min_idx])
        max_val = float(valid_series.loc[max_idx])
        min_date = min_idx.strftime("%Y-%m-%d") if hasattr(min_idx, "strftime") else str(min_idx)[:10]
        max_date = max_idx.strftime("%Y-%m-%d") if hasattr(max_idx, "strftime") else str(max_idx)[:10]

        x_years = np.array(
            [(ts - valid_series.index[0]).total_seconds() / (365.25 * 86400.0) for ts in valid_series.index],
            dtype=float,
        )
        if len(x_years) >= 3 and np.ptp(x_years) > 0:
            slope_per_yr = float(stats.linregress(x_years, valid_series.values).slope)
            decadal_slope = round(slope_per_yr * 10.0, 4)
        else:
            decadal_slope = 0.0
    else:
        only_val = float(valid_series.iloc[0])
        mean_val = median_val = min_val = max_val = only_val
        std_val = decadal_slope = 0.0
        min_date = max_date = valid_series.index[0].strftime("%Y-%m-%d")

    observations: List[ObservationRow] = []
    valid_count = 0
    flagged_count = 0
    missing_count = 0

    date_fmt = "%Y-%m-%d" if req.target_frequency in ("Daily", "8-Day", "16-Day") else "%Y-%m"

    for i, (ts, val) in enumerate(s_clean.items()):
        ts_label = ts.strftime(date_fmt) if hasattr(ts, "strftime") else str(ts)
        r_val = float(rolling.iloc[i]) if not pd.isna(rolling.iloc[i]) else None
        sec_v = (
            round(float(secondary_vals[i]), 3)
            if secondary_vals is not None and i < len(secondary_vals) and not np.isnan(secondary_vals[i])
            else None
        )

        if pd.isna(val):
            missing_count += 1
            observations.append(
                ObservationRow(
                    timestamp=ts_label,
                    value=None,
                    secondary_value=sec_v,
                    rolling_avg=round(r_val, 3) if r_val is not None else None,
                    anomaly_z=None,
                    unit=unit,
                    variable_id=req.variable_id,
                    qa_flag="Missing",
                )
            )
        else:
            f_val = float(val)
            z = (f_val - mean_val) / std_val if std_val > 1e-5 else 0.0
            if abs(z) >= 2.15:
                qa_flag = "Flagged"
                flagged_count += 1
            else:
                qa_flag = "Valid"
                valid_count += 1

            observations.append(
                ObservationRow(
                    timestamp=ts_label,
                    value=round(f_val, 4),
                    secondary_value=sec_v,
                    rolling_avg=round(r_val, 4) if r_val is not None else round(f_val, 4),
                    anomaly_z=round(float(z), 2),
                    unit=unit,
                    variable_id=req.variable_id,
                    qa_flag=qa_flag,  # type: ignore[arg-type]
                )
            )

    total_count = len(observations)
    non_null = valid_count + flagged_count
    completeness_pct = round((non_null / max(1, total_count)) * 100.0, 1)
    missing_pct = round((missing_count / max(1, total_count)) * 100.0, 1)

    summary = SummaryStats(
        count=total_count,
        valid_count=valid_count,
        flagged_count=flagged_count,
        missing_count=missing_count,
        completeness_pct=completeness_pct,
        missing_pct=missing_pct,
        missing_warning=missing_pct > 15.0,
        mean=round(mean_val, 3),
        median=round(median_val, 3),
        std_dev=round(std_val, 3),
        min_val=round(min_val, 3),
        min_date=min_date,
        max_val=round(max_val, 3),
        max_date=max_date,
        decadal_slope=decadal_slope,
        unit=unit,
    )

    job_id = f"job-{uuid.uuid4().hex[:10]}"
    now_iso = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    spatial_semantics = live_meta.get("spatial_semantics") or (
        "point_exact"
        if req.spatial_Submode == "point"
        else f"centroid_representative_sample ({lat:.3f}N, {lon:.3f}E)"
    )

    preview = PreviewResponse(
        job_id=job_id,
        status="completed",
        product=product,
        extraction_config=req,
        summary_stats=summary,
        chart_series=observations,
        raw_rows=observations,
        total_rows=total_count,
        page=1,
        page_size=total_count,
        upstream_live_fetched=True,
        provenance_mode="live_upstream",
        spatial_semantics_applied=spatial_semantics,
        secondary_jobs=secondary_jobs,
        api_endpoint_called=endpoint_called,
        retrieved_at=now_iso,
    )

    created_ts = time.time()
    preview = persist_extraction_job(job_id, created_ts, req, preview)

    _EXTRACTION_JOBS[job_id] = {
        "created_at": created_ts,
        "is_async": product.is_async,
        "req": req,
        "preview": preview,
    }
    return preview


def get_job_status(job_id: str) -> JobStatusResponse:
    """Returns current extraction job status and 4-step pipeline progress."""
    record = _EXTRACTION_JOBS.get(job_id) or load_persisted_job(job_id)
    if not record:
        raise KeyError(f"Extraction job '{job_id}' was not found.")

    req: ExtractionRequest = record["req"]  # type: ignore[assignment]
    return JobStatusResponse(
        job_id=job_id,
        status="completed",
        progress_percent=100,
        status_message=f"Live {req.target_frequency} time series retrieved from {req.source_api}.",
        source_api=req.source_api,
        product_id=req.product_id,
        variable_id=req.variable_id,
        steps=[
            JobStep(step=1, label=f"Live Request Executed at {req.source_api}", status="completed"),
            JobStep(step=2, label="Fill-Value Filtering & QA Flagging", status="completed"),
            JobStep(
                step=3,
                label=f"Temporal Resampling ({req.target_frequency} · {req.temporal_aggregation})",
                status="completed",
            ),
            JobStep(step=4, label="Ready for Preview & Statistical Handoff", status="completed"),
        ],
    )


async def get_job_preview(
    job_id: str, page: int = 1, page_size: int = 100
) -> PreviewResponse:
    """Retrieves the normalized time-series preview for a given job_id, with pagination."""
    record = _EXTRACTION_JOBS.get(job_id) or load_persisted_job(job_id)
    if not record:
        raise KeyError(f"Extraction job '{job_id}' was not found.")

    preview: PreviewResponse = record["preview"]  # type: ignore[assignment]
    start_idx = max(0, (page - 1) * page_size)
    end_idx = start_idx + page_size
    paginated = preview.model_copy(
        update={
            "raw_rows": preview.chart_series[start_idx:end_idx],
            "page": page,
            "page_size": page_size,
        }
    )
    return paginated
