"""
SRS v1.0 Provider Capability Matrix & Readiness Registry
Tracks exact catalog, product-detail, and time-series extraction capabilities across all 10 live providers:
1. NASA POWER
2. NASA GES DISC
3. NASA AppEEARS
4. NASA CMR
5. NASA Harmony
6. NOAA CDO
7. NOAA OneStop
8. OPeNDAP
9. EODAG
10. Copernicus CDS
"""

from __future__ import annotations

import datetime as dt
from typing import List

from config import get_cdsapi_credentials, get_earthdata_token, get_noaa_cdo_token
from schemas import DataProduct, ProviderCapabilityRecord

CAPABILITY_MATRIX: List[ProviderCapabilityRecord] = [
    ProviderCapabilityRecord(
        provider_id="nasa_power",
        provider_name="NASA POWER",
        agency="NASA Langley Research Center (LaRC) / GMAO MERRA-2",
        catalog_state="extract_verified",
        extraction_state="extract_verified",
        supported_geometries=["point", "bbox"],
        native_cadences=["Daily", "Monthly", "Yearly"],
        requires_auth=False,
        auth_mechanism="Public REST API (No token required)",
        sync_or_async="sync",
        quota_guardrail="Regional: one parameter, at least 2 degrees latitude, up to 20 degrees per side, and a 2M grid-time value limit",
        qa_semantics="Fill value -999.0 filtered prior to resampling and statistical analysis",
        citation_url="https://power.larc.nasa.gov/docs/services/api/",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Supports point series and cosine-latitude weighted means of regional grid cells for surface meteorology and solar parameters.",
    ),
    ProviderCapabilityRecord(
        provider_id="ges_disc",
        provider_name="NASA GES DISC",
        agency="NASA Goddard Earth Sciences Data and Information Services Center (Giovanni in the Cloud)",
        catalog_state="extract_verified",
        extraction_state="extract_verified",
        supported_geometries=["point"],
        native_cadences=["Daily", "Monthly"],
        requires_auth=True,
        auth_mechanism="Earthdata Bearer Token (Server-side environment variable)",
        sync_or_async="sync",
        quota_guardrail="Verified variable/collection subset via GiC timeseries endpoint",
        qa_semantics="Upstream fill values masked; quality flags preserved in observation rows",
        citation_url="https://github.com/nasa/gesdisc-tutorials",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Direct time-series extraction via Giovanni in the Cloud with Earthdata Bearer token.",
    ),
    ProviderCapabilityRecord(
        provider_id="appeears",
        provider_name="NASA AppEEARS",
        agency="NASA LP DAAC / Earthdata Cloud",
        catalog_state="catalog_verified",
        extraction_state="credential_required",
        supported_geometries=["point", "bbox"],
        native_cadences=["8-Day", "16-Day", "Monthly"],
        requires_auth=True,
        auth_mechanism="Earthdata Login Basic Auth -> AppEEARS Session Token (`POST /api/login`)",
        sync_or_async="async",
        quota_guardrail="Async task queue submission, status polling, and bundle download",
        qa_semantics="Pixel-level MODIS/VIIRS quality bitmask layer (`_QC` / `VI Quality`) decoding",
        citation_url="https://appeears.earthdatacloud.nasa.gov/api/#authentication",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Live catalog discovery active; async task submission requires AppEEARS session credentials.",
    ),
    ProviderCapabilityRecord(
        provider_id="cmr",
        provider_name="NASA CMR",
        agency="NASA Earthdata Common Metadata Repository",
        catalog_state="catalog_verified",
        extraction_state="unsupported",
        supported_geometries=["bbox", "point"],
        native_cadences=["Daily", "8-Day", "16-Day", "Monthly", "Yearly"],
        requires_auth=False,
        auth_mechanism="Public UMM-JSON Metadata API",
        sync_or_async="catalog_only",
        quota_guardrail="Metadata & granule discovery only; not an observation time-series API",
        qa_semantics="Collection-level science quality summaries",
        citation_url="https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Authoritative metadata catalog. Extraction routes through NASA POWER, GiC, or OPeNDAP.",
    ),
    ProviderCapabilityRecord(
        provider_id="harmony",
        provider_name="NASA Harmony",
        agency="NASA Earthdata Cloud Subsetting & OGC API-Coverages",
        catalog_state="catalog_verified",
        extraction_state="credential_required",
        supported_geometries=["bbox", "point"],
        native_cadences=["Daily", "Monthly"],
        requires_auth=True,
        auth_mechanism="Earthdata Bearer Token + Async Cloud Subsetting Job",
        sync_or_async="async",
        quota_guardrail="Granule-level spatial/variable subsetting; max 200 granules per async job",
        qa_semantics="NetCDF4/Zarr CF-compliant `_FillValue` and `valid_range` attributes",
        citation_url="https://harmony.earthdata.nasa.gov/docs",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Cloud-hosted capability check active; async NetCDF subset worker gated by collection support.",
    ),
    ProviderCapabilityRecord(
        provider_id="noaa_cdo",
        provider_name="NOAA CDO",
        agency="NOAA National Centers for Environmental Information (NCEI CDO v2)",
        catalog_state="extract_verified",
        extraction_state="extract_verified",
        supported_geometries=["point", "bbox"],
        native_cadences=["Daily", "Monthly", "Yearly"],
        requires_auth=True,
        auth_mechanism="NOAA NCEI CDO Token Header (`token`)",
        sync_or_async="sync",
        quota_guardrail="5 requests/sec, 10,000 requests/day, max 1,000 records per page",
        qa_semantics="GHCN-Daily / GSOM metric station observations with quality flags",
        citation_url="https://www.ncdc.noaa.gov/cdo-web/webservices/v2",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Live station discovery (`/stations`) and metric time-series extraction (`/data`) verified.",
    ),
    ProviderCapabilityRecord(
        provider_id="noaa_onestop",
        provider_name="NOAA OneStop",
        agency="NOAA National Centers for Environmental Information (OneStop Enterprise Catalog)",
        catalog_state="extract_verified",
        extraction_state="extract_verified",
        supported_geometries=["point", "bbox"],
        native_cadences=["Daily", "Monthly", "Yearly"],
        requires_auth=False,
        auth_mechanism="Public OneStop REST Search API + NOAA NCEI Data Service",
        sync_or_async="sync",
        quota_guardrail="POST /onestop/api/search/search/collection + NCEI time-series extraction",
        qa_semantics="NOAA NCEI quality-controlled archive observations",
        citation_url="https://cedardevs.github.io/onestop/api/search-api.html",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Live OneStop collection discovery and NOAA NCEI time-series extraction verified.",
    ),
    ProviderCapabilityRecord(
        provider_id="opendap",
        provider_name="OPeNDAP",
        agency="NASA Earthdata OPeNDAP Hyrax in the Cloud",
        catalog_state="extract_verified",
        extraction_state="extract_verified",
        supported_geometries=["point"],
        native_cadences=["Monthly", "Yearly"],
        requires_auth=True,
        auth_mechanism="Earthdata Bearer Token (`Authorization: Bearer <EARTHDATA_TOKEN>`)",
        sync_or_async="sync",
        quota_guardrail="Direct HTTP constraint-expression slicing (`.ascii?var[time][lat][lon]`)",
        qa_semantics="NetCDF-4 `_FillValue` (1e15) filtered during DAP array slicing",
        citation_url="https://opendap.earthdata.nasa.gov/",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Live `.dds` inspection and `.ascii` constraint-expression slicing verified on Earthdata Cloud.",
    ),
    ProviderCapabilityRecord(
        provider_id="eodag",
        provider_name="EODAG",
        agency="CS GROUP / Federated Earth Observation Data Access Gateway (`eodag` v4.10)",
        catalog_state="extract_verified",
        extraction_state="extract_verified",
        supported_geometries=["point", "bbox"],
        native_cadences=["Daily", "Monthly", "Yearly"],
        requires_auth=False,
        auth_mechanism="Official `eodag` Python Library (`EODataAccessGateway`)",
        sync_or_async="sync",
        quota_guardrail="Federated productType discovery + live STAC / ERA5 time-series extraction",
        qa_semantics="STAC EO cloud-cover properties & ECMWF ERA5 reanalysis quality control",
        citation_url="https://eodag.readthedocs.io/en/stable/getting_started_guide/index.html",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Uses official `EODataAccessGateway` for product type discovery and STAC/ERA5 extraction.",
    ),
    ProviderCapabilityRecord(
        provider_id="copernicus_cds",
        provider_name="Copernicus CDS",
        agency="ECMWF Copernicus Climate Change Service (C3S / CADS API v1)",
        catalog_state="extract_verified",
        extraction_state="extract_verified",
        supported_geometries=["point", "bbox"],
        native_cadences=["Daily", "Monthly", "Yearly"],
        requires_auth=True,
        auth_mechanism="Copernicus CDS API Key (`PRIVATE-TOKEN` header)",
        sync_or_async="sync",
        quota_guardrail="CADS STAC Catalogue v1 + ECMWF ERA5 historical reanalysis extraction",
        qa_semantics="ERA5 reanalysis quality control & land-sea mask weighting",
        citation_url="https://cds.climate.copernicus.eu/how-to-api",
        last_verified_utc="2026-11-14T00:00:00Z",
        notes="Live CADS v1 catalog discovery (`/api/catalogue/v1/datasets`) and ERA5 extraction verified.",
    ),
]


def get_capability_matrix() -> List[ProviderCapabilityRecord]:
    has_edl = bool(get_earthdata_token())
    has_noaa = bool(get_noaa_cdo_token())
    _, cds_key = get_cdsapi_credentials()
    has_cds = bool(cds_key)

    records: List[ProviderCapabilityRecord] = []
    for rec in CAPABILITY_MATRIX:
        if rec.provider_id in ("ges_disc", "opendap") and not has_edl:
            records.append(rec.model_copy(update={"extraction_state": "credential_required"}))
        elif rec.provider_id == "noaa_cdo" and not has_noaa:
            records.append(rec.model_copy(update={"extraction_state": "credential_required"}))
        elif rec.provider_id == "copernicus_cds" and not has_cds:
            records.append(rec.model_copy(update={"extraction_state": "credential_required"}))
        else:
            records.append(rec)
    return records


def annotate_product_capabilities(product: DataProduct) -> DataProduct:
    """
    Stamps accurate SRS v1.0 capability_state, supported_spatial_modes, and freshness
    onto a discovered DataProduct so the frontend never misstates extraction readiness.
    """
    now_iso = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    api = product.source_api
    has_edl = bool(get_earthdata_token())
    has_noaa = bool(get_noaa_cdo_token())
    _, cds_key = get_cdsapi_credentials()
    has_cds = bool(cds_key)

    if api in ("NASA POWER", "EODAG"):
        return product.model_copy(
            update={
                "capability_state": "extract_verified",
                "supported_spatial_modes": ["point", "bbox"],
                "requires_credentials": False,
                "catalog_freshness_utc": now_iso,
            }
        )
    if api in ("NASA GES DISC", "OPeNDAP"):
        return product.model_copy(
            update={
                "capability_state": "extract_verified" if has_edl else "credential_required",
                "supported_spatial_modes": ["point"],
                "requires_credentials": True,
                "catalog_freshness_utc": now_iso,
            }
        )
    if api in ("NOAA CDO", "NOAA OneStop"):
        return product.model_copy(
            update={
                "capability_state": "extract_verified" if has_noaa else "credential_required",
                "supported_spatial_modes": ["point", "bbox"],
                "requires_credentials": True,
                "catalog_freshness_utc": now_iso,
            }
        )
    if api == "Copernicus CDS":
        return product.model_copy(
            update={
                "capability_state": "extract_verified" if has_cds else "credential_required",
                "supported_spatial_modes": ["point", "bbox"],
                "requires_credentials": True,
                "catalog_freshness_utc": now_iso,
            }
        )
    if api == "NASA AppEEARS":
        return product.model_copy(
            update={
                "capability_state": "credential_required",
                "supported_spatial_modes": ["point", "bbox"],
                "requires_credentials": True,
                "catalog_freshness_utc": now_iso,
            }
        )
    if api == "NASA Harmony":
        return product.model_copy(
            update={
                "capability_state": "credential_required",
                "supported_spatial_modes": ["bbox", "point"],
                "requires_credentials": True,
                "catalog_freshness_utc": now_iso,
            }
        )
    return product.model_copy(
        update={
            "capability_state": "catalog_verified",
            "supported_spatial_modes": ["bbox", "point"],
            "requires_credentials": False,
            "catalog_freshness_utc": now_iso,
        }
    )
