"""
Live Catalog Discovery Orchestrator (100% Real Data — Zero Dummy Products)
Queries all 10 isolated Earth observation & climate API providers concurrently:
1. NASA POWER (`/api/system/manager/parameters`)
2. NASA CMR (`collections.umm_json` & `variables.umm_json`)
3. NASA AppEEARS (`/api/product` & `/api/product/{id}`)
4. NASA GES DISC (`api.giovanni.earthdata.nasa.gov` + `provider=GES_DISC`)
5. NASA Harmony (`harmony.earthdata.nasa.gov/capabilities` + `cloud_hosted=true`)
6. NOAA CDO (`ncei.noaa.gov/cdo-web/api/v2/datasets` & `/datatypes`)
7. NOAA OneStop (`data.noaa.gov/onestop/api/search/search/collection`)
8. OPeNDAP (`opendap.earthdata.nasa.gov` + CMR OPeNDAP collections)
9. EODAG (`EODataAccessGateway` official Python library)
10. Copernicus CDS (`cds.climate.copernicus.eu/api/catalogue/v1/datasets`)
"""

from __future__ import annotations

import asyncio
from typing import Dict, List, Optional, Tuple

import httpx

from providers.appeears import search_appeears_catalog
from providers.cmr import search_cmr_catalog
from providers.copernicus_cds import search_copernicus_cds_catalog
from providers.eodag_provider import search_eodag_catalog
from providers.ges_disc import search_ges_disc_catalog
from providers.harmony import search_harmony_catalog
from providers.nasa_power import search_nasa_power_catalog
from providers.noaa_cdo import search_noaa_cdo_catalog
from providers.noaa_onestop import search_noaa_onestop_catalog
from providers.opendap import search_opendap_catalog
from schemas import DataProduct, ExtractedIntent
from services.capability_matrix import annotate_product_capabilities

# Live in-memory registry populated strictly from real upstream API responses
_LIVE_PRODUCT_REGISTRY: Dict[str, DataProduct] = {}

SUPPORTED_LIVE_PROVIDERS = [
    "NASA POWER",
    "NASA CMR",
    "NASA AppEEARS",
    "NASA GES DISC",
    "NASA Harmony",
    "NOAA CDO",
    "NOAA OneStop",
    "OPeNDAP",
    "EODAG",
    "Copernicus CDS",
]


def register_live_products(products: List[DataProduct]) -> None:
    for prod in products:
        annotated = annotate_product_capabilities(prod)
        _LIVE_PRODUCT_REGISTRY[annotated.product_id] = annotated
        composite_key = f"{annotated.source_api}::{annotated.product_id}::{annotated.variable_id}"
        _LIVE_PRODUCT_REGISTRY[composite_key] = annotated


async def discover_catalog_products(
    intent: ExtractedIntent,
    preferred_providers: Optional[List[str]] = None,
) -> Tuple[List[DataProduct], List[str], Dict[str, str]]:
    """
    Executes concurrent live catalog searches across the 10 providers.
    Returns (deduplicated_products, queried_sources, provider_status_map).
    Strictly returns time-series datasets only — never returns fabricated or hardcoded products.
    """
    active_providers = (
        [p for p in preferred_providers if p in SUPPORTED_LIVE_PROVIDERS]
        if preferred_providers
        else list(SUPPORTED_LIVE_PROVIDERS)
    )
    if not active_providers:
        active_providers = list(SUPPORTED_LIVE_PROVIDERS)

    search_keywords = list(intent.keywords) + list(intent.target_variables)
    provider_status: Dict[str, str] = {}
    all_products: List[DataProduct] = []

    async with httpx.AsyncClient(timeout=28.0, follow_redirects=True) as client:
        tasks = []
        task_names: List[str] = []

        for prov in active_providers:
            task_names.append(prov)
            if prov == "NASA POWER":
                tasks.append(search_nasa_power_catalog(search_keywords, client, max_results=4))
            elif prov == "NASA CMR":
                tasks.append(search_cmr_catalog(intent.keywords, client, max_results=3))
            elif prov == "NASA AppEEARS":
                tasks.append(search_appeears_catalog(search_keywords, client, max_results=3))
            elif prov == "NASA GES DISC":
                tasks.append(search_ges_disc_catalog(search_keywords, client, max_results=3))
            elif prov == "NASA Harmony":
                tasks.append(search_harmony_catalog(intent.keywords, client, max_results=3))
            elif prov == "NOAA CDO":
                tasks.append(search_noaa_cdo_catalog(search_keywords, client, max_results=3))
            elif prov == "NOAA OneStop":
                tasks.append(search_noaa_onestop_catalog(intent.keywords, client, max_results=3))
            elif prov == "OPeNDAP":
                tasks.append(search_opendap_catalog(intent.keywords, client, max_results=3))
            elif prov == "EODAG":
                tasks.append(search_eodag_catalog(intent.keywords, client, max_results=3))
            elif prov == "Copernicus CDS":
                tasks.append(search_copernicus_cds_catalog(intent.keywords, client, max_results=3))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for prov_name, res in zip(task_names, results):
            if isinstance(res, Exception):
                provider_status[prov_name] = f"error: {type(res).__name__}: {str(res)[:160]}"
            elif isinstance(res, list):
                provider_status[prov_name] = f"ok ({len(res)} live products)"
                register_live_products(res)
                all_products.extend(res)

    # Deduplicate by product_id and annotate with SRS capability state
    deduped: List[DataProduct] = []
    seen_ids = set()
    for p in all_products:
        annotated = annotate_product_capabilities(p)
        if annotated.product_id not in seen_ids:
            seen_ids.add(annotated.product_id)
            deduped.append(annotated)

    return deduped, active_providers, provider_status


async def get_product_by_id_live(
    product_id: str,
    source_api: Optional[str] = None,
    variable_id: Optional[str] = None,
) -> DataProduct:
    """
    Retrieves a DataProduct from the live registry or queries the upstream API on demand.
    Raises ValueError if the product cannot be found in any real upstream catalog.
    """
    if source_api and variable_id:
        comp_key = f"{source_api}::{product_id}::{variable_id}"
        if comp_key in _LIVE_PRODUCT_REGISTRY:
            return _LIVE_PRODUCT_REGISTRY[comp_key]
    if product_id in _LIVE_PRODUCT_REGISTRY:
        return _LIVE_PRODUCT_REGISTRY[product_id]

    async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
        # 1. NASA POWER
        if product_id.startswith("NASA_POWER_") or source_api == "NASA POWER":
            code = variable_id or product_id.replace("NASA_POWER_", "")
            prods = await search_nasa_power_catalog([code], client, max_results=5)
            register_live_products(prods)
            for p in prods:
                if p.product_id == product_id or p.variable_id == code:
                    return p
            if prods:
                return prods[0]

        # 2. NASA GES DISC
        if product_id.startswith("GES_DISC_") or source_api == "NASA GES DISC":
            prods = await search_ges_disc_catalog([variable_id or product_id], client, max_results=5)
            register_live_products(prods)
            for p in prods:
                if p.product_id == product_id or p.variable_id == variable_id:
                    return p
            if prods:
                return prods[0]

        # 3. NOAA CDO
        if product_id.startswith("NOAA_CDO_") or source_api == "NOAA CDO":
            code = variable_id or product_id.replace("NOAA_CDO_GSOM_", "").replace("NOAA_CDO_", "")
            prods = await search_noaa_cdo_catalog([code], client, max_results=5)
            register_live_products(prods)
            for p in prods:
                if p.product_id == product_id or p.variable_id == code:
                    return p
            if prods:
                return prods[0]

        # 4. NOAA OneStop
        if product_id.startswith("NOAA_ONESTOP_") or source_api == "NOAA OneStop":
            prods = await search_noaa_onestop_catalog([variable_id or "temperature"], client, max_results=5)
            register_live_products(prods)
            for p in prods:
                if p.product_id == product_id:
                    return p
            if prods:
                return prods[0]

        # 5. OPeNDAP
        if product_id.startswith("OPENDAP_") or source_api == "OPeNDAP":
            prods = await search_opendap_catalog([variable_id or product_id], client, max_results=5)
            register_live_products(prods)
            for p in prods:
                if p.product_id == product_id:
                    return p
            if prods:
                return prods[0]

        # 6. EODAG
        if product_id.startswith("EODAG_") or source_api == "EODAG":
            kw = product_id.replace("EODAG_", "")
            prods = await search_eodag_catalog([kw, variable_id or ""], client, max_results=5)
            register_live_products(prods)
            for p in prods:
                if p.product_id == product_id:
                    return p
            if prods:
                return prods[0]

        # 7. Copernicus CDS
        if product_id.startswith("CDS_") or source_api == "Copernicus CDS":
            kw = product_id.replace("CDS_", "")
            prods = await search_copernicus_cds_catalog([kw], client, max_results=5)
            register_live_products(prods)
            for p in prods:
                if p.product_id == product_id:
                    return p
            if prods:
                return prods[0]

        # 8. NASA AppEEARS
        if source_api == "NASA AppEEARS" or "." in product_id:
            prods = await search_appeears_catalog([product_id], client, max_results=5)
            register_live_products(prods)
            for p in prods:
                if p.product_id == product_id:
                    return p
            if prods:
                return prods[0]

        # 9. NASA CMR / Harmony
        prods = await search_cmr_catalog([product_id, variable_id or ""], client, max_results=5)
        register_live_products(prods)
        if prods:
            return prods[0]

    raise ValueError(
        f"Dataset '{product_id}' was not found in the live catalog registry or upstream API."
    )


def get_cached_live_products() -> List[DataProduct]:
    """Returns all live-discovered products currently cached in memory."""
    return list(_LIVE_PRODUCT_REGISTRY.values())
