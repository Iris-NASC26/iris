"""
Gemini 3.5 Flash-Lite Intent Extraction, Live Geocoding & API Routing Service
- Calls `models/gemini-3.5-flash-lite:generateContent` with the configured `GEMINI_API_KEY`.
- Resolves geographic locations via live Open-Meteo geocoding (`providers.geocoder.geocode_place_live`).
- Routes catalog lookups across the 5 NASA providers:
  `["NASA POWER", "NASA CMR", "NASA AppEEARS", "NASA GES DISC", "NASA Harmony"]`.
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from typing import Dict, List, Optional, Tuple

import httpx

from config import GEMINI_MODEL, get_gemini_api_key
from providers.geocoder import geocode_place_live
from schemas import DataProduct, ExtractedIntent

_INTENT_CACHE: Dict[str, Tuple[float, ExtractedIntent]] = {}
CACHE_TTL_SECONDS = 3600

NASA_LIVE_APIS = [
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

DOMAIN_ONTOLOGY = [
    {
        "triggers": ["drought", "soil", "soil moisture", "aridity", "water", "water stress", "groundwater", "evapotranspiration", "runoff", "hydrology", "gldas", "smap", "grace", "gwettop", "water quality", "landslide", "erosion"],
        "subject_domain": "Terrestrial Hydrology & Agricultural Drought",
        "scientific_category": "Land",
        "keywords": ["soil moisture", "evapotranspiration", "drought", "precipitation", "GLDAS", "wetness"],
        "target_variables": ["GWETTOP", "GWETROOT", "GLDAS_NOAH025_3H_2_1_SoilMoi0_10cm_inst", "PRECTOTCORR"],
    },
    {
        "triggers": ["vegetation", "ndvi", "forest", "greenness", "agriculture", "crop", "deforestation", "canopy", "lai", "biomass", "evi", "modis", "landsat", "sentinel", "biodiversity", "ecosystem", "land cover", "land use"],
        "subject_domain": "Terrestrial Biosphere & Vegetation Dynamics",
        "scientific_category": "Biosphere",
        "keywords": ["NDVI", "vegetation", "EVI", "leaf area", "MODIS", "photosynthesis"],
        "target_variables": ["NDVI", "EVI", "PRECTOTCORR", "T2M"],
    },
    {
        "triggers": ["snow", "ice", "glacier", "glacial", "cryosphere", "permafrost", "albedo", "freeze", "himalaya", "arctic", "sea ice"],
        "subject_domain": "Cryospheric Science & Snow/Ice Retreat",
        "scientific_category": "Cryosphere",
        "keywords": ["snow cover", "NDSI", "cryosphere", "albedo", "glacier", "temperature"],
        "target_variables": ["NDSI_Snow_Cover", "T2M", "TS"],
    },
    {
        "triggers": ["rain", "rainfall", "precipitation", "monsoon", "flood", "storm", "extreme weather", "river", "discharge", "water level", "imerg", "gpm"],
        "subject_domain": "Hydrometeorology & Precipitation Extremes",
        "scientific_category": "Water",
        "keywords": ["precipitation", "rainfall", "monsoon", "IMERG", "flood", "humidity"],
        "target_variables": ["PRECTOTCORR", "GLDAS_NOAH025_3H_2_1_Rainf_f_tavg", "RH2M"],
    },
    {
        "triggers": ["air quality", "aerosol", "pollution", "pm2.5", "carbon", "carbon cycle", "emissions", "co2", "methane", "no2", "ozone", "smoke", "wildfire", "era5", "merra-2"],
        "subject_domain": "Atmospheric Composition & Aerosols",
        "scientific_category": "Atmosphere",
        "keywords": ["aerosol", "optical depth", "air quality", "smoke", "dust", "wind"],
        "target_variables": ["AOD", "WS10M", "T2M"],
    },
    {
        "triggers": ["solar", "radiation", "irradiance", "wind", "renewable", "energy", "humidity"],
        "subject_domain": "Surface Energy Balance & Solar Irradiance",
        "scientific_category": "Atmosphere",
        "keywords": ["solar irradiance", "shortwave radiation", "wind speed", "humidity", "CERES"],
        "target_variables": ["ALLSKY_SFC_SW_DWN", "RH2M", "WS10M", "T2M"],
    },
    {
        "triggers": ["temperature", "heat", "warming", "urban", "climate", "thermal", "lst", "weather"],
        "subject_domain": "Atmospheric Thermodynamics & Surface Temperature Trends",
        "scientific_category": "Atmosphere",
        "keywords": ["temperature", "land surface temperature", "thermal", "MERRA-2", "heat"],
        "target_variables": ["T2M", "T2M_MAX", "T2M_MIN", "GLDAS_NOAH025_3H_2_1_Tair_f_inst"],
    },
    {
        "triggers": ["ocean", "marine", "salinity", "sea level", "sea surface temperature", "coral", "coastal", "ocean current", "acidification"],
        "subject_domain": "Ocean & Coastal Systems",
        "scientific_category": "Oceans",
        "keywords": ["sea surface temperature", "ocean salinity", "sea level", "ocean color", "marine heatwave", "coral reef"],
        "target_variables": ["SST", "SSS", "CHL", "sea surface temperature"],
    },
    {
        "triggers": ["earth science", "earth observation", "environment", "environmental"],
        "subject_domain": "Earth Systems & Environmental Change",
        "scientific_category": "Land",
        "keywords": ["Earth observation", "environmental change", "land cover", "precipitation", "surface temperature"],
        "target_variables": ["T2M", "PRECTOTCORR", "NDVI"],
    },
]


def has_research_domain(prompt: str) -> bool:
    normalized_prompt = re.sub(r"[^a-z0-9]+", " ", prompt.lower()).strip()
    padded_prompt = f" {normalized_prompt} "
    terms = tuple(trigger for entry in DOMAIN_ONTOLOGY for trigger in entry["triggers"])
    return any(
        f" {re.sub(r'[^a-z0-9]+', ' ', term.lower()).strip()} " in padded_prompt
        for term in terms
    )


def is_explanatory_inquiry(prompt: str) -> bool:
    normalized = prompt.strip().lower()
    normalized = re.sub(r"^(?:(?:hi|hello|hey)[\s,!.]*)+", "", normalized)
    if re.search(
        r"\b(?:what is|what are|tell me about|explain|define|describe|how does|how do|why is|why are|why does|who is)\b",
        normalized,
    ):
        return True
    return bool(
        re.match(r"^(?:(?:can|could) you|please)\s+(?:explain|describe|define|tell me about)\b", normalized)
    )


def _normalize_cache_key(prompt: str, preferred_providers: Optional[List[str]]) -> str:
    clean = re.sub(r"\s+", " ", prompt.strip().lower())
    prov = ",".join(sorted(preferred_providers or []))
    return hashlib.sha256(f"{clean}||{prov}||intent-v2".encode("utf-8")).hexdigest()


def _extract_dates_and_frequency(prompt: str) -> Tuple[str, str, str]:
    lower = prompt.lower()
    years = [int(y) for y in re.findall(r"\b(19[89]\d|20[0-2]\d)\b", prompt)]
    current_year = 2025

    if len(years) >= 2:
        start_yr = max(1981, min(years))
        end_yr = min(current_year, max(years))
        if end_yr <= start_yr:
            end_yr = min(current_year, start_yr + 5)
    elif len(years) == 1:
        start_yr = max(1981, years[0])
        end_yr = current_year
    else:
        past_match = re.search(r"past\s+(\d+)\s+years?", lower)
        if past_match:
            span = min(40, max(2, int(past_match.group(1))))
            start_yr = current_year - span
            end_yr = current_year
        else:
            start_yr = 2015
            end_yr = 2025

    if "daily" in lower or "day-by-day" in lower:
        freq = "Daily"
    elif "16-day" in lower or "16 day" in lower:
        freq = "16-Day"
    elif "8-day" in lower or "8 day" in lower:
        freq = "8-Day"
    elif "annual" in lower or "yearly" in lower:
        freq = "Yearly"
    elif "season" in lower:
        freq = "Seasonal"
    else:
        freq = "Monthly"

    return f"{start_yr}-01-01", f"{end_yr}-12-31", freq


def _extract_candidate_place_string(prompt: str) -> str:
    lower = prompt.lower()
    if "global" in lower or "worldwide" in lower:
        return "global"
    # Match "in <Place>" or "across <Place>" or "over <Place>" or "for <Place>"
    m = re.search(
        r"\b(?:in|across|over|near|around)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})",
        prompt,
    )
    if m:
        candidate = m.group(1).strip()
        stop_words = {"The", "Past", "Last", "Monthly", "Daily", "Yearly", "Annual", "Global"}
        if candidate not in stop_words:
            return candidate

    # Fallback check for common geographic terms in lowercase prompts
    common_places = [
        "sri lanka", "colombo", "california", "los angeles", "nepal", "kathmandu",
        "india", "brazil", "amazon", "australia", "canada", "kenya", "egypt", "spain",
        "japan", "tokyo", "london", "texas", "florida", "bangladesh", "pakistan",
    ]
    for place in common_places:
        if place in lower:
            return place
    return "Colombo, Sri Lanka"


async def _resolve_live_region(prompt: str, client: httpx.AsyncClient) -> Tuple[str, str, List[float], List[float]]:
    place_candidate = _extract_candidate_place_string(prompt)
    geo = await geocode_place_live(place_candidate, client)
    if geo:
        return (
            str(geo["name"]),
            str(geo["spatial_level"]),
            list(geo["bbox"]),  # type: ignore[arg-type]
            [float(geo["lat"]), float(geo["lon"])],  # type: ignore[arg-type]
        )
    return "Colombo, Western Province, Sri Lanka", "regional", [78.849, 5.935, 80.849, 7.935], [6.9355, 79.8487]


async def extract_scientific_intent(
    prompt: str,
    preferred_providers: Optional[List[str]] = None,
    user_api_key: Optional[str] = None,
) -> Tuple[Optional[ExtractedIntent], bool]:
    """
    Extracts scientific intent using `gemini-3.5-flash-lite` (when project billing/quota is active)
    and live Open-Meteo geocoding, routing to the 5 NASA providers.
    """
    if not has_research_domain(prompt) or is_explanatory_inquiry(prompt):
        return None, False

    cache_key = _normalize_cache_key(prompt, preferred_providers)
    now = time.time()
    if cache_key in _INTENT_CACHE:
        ts, cached_intent = _INTENT_CACHE[cache_key]
        if now - ts < CACHE_TTL_SECONDS:
            return cached_intent, True

    api_key = get_gemini_api_key(user_api_key)
    active_apis = (
        [p for p in preferred_providers if p in NASA_LIVE_APIS]
        if preferred_providers
        else list(NASA_LIVE_APIS)
    )

    async with httpx.AsyncClient(timeout=15.0) as client:
        region_name, spatial_level, bbox, center = await _resolve_live_region(prompt, client)
        start_date, end_date, freq = _extract_dates_and_frequency(prompt)

        # Try live Gemini 3.5 Flash-Lite structured JSON call first
        if api_key:
            system_instruction = (
                "You are an expert NASA Earth Observation & Climate Science catalog router. "
                "First classify the user's latest message. A greeting, help or role question, unrelated request, "
                "or a question asking for a general explanation of a science topic is NOT a dataset-discovery request. "
                "For those messages, return exactly {\"is_dataset_search_request\": false}; do not infer a domain, "
                "location, keywords, or variables. A clear research/data topic by itself is a dataset-discovery request, "
                "as is an explicit request to find or analyze datasets. For those messages, return a strict JSON object "
                "with is_dataset_search_request set to true and keys: "
                "subject_domain (string), scientific_category (one of Atmosphere, Water, Land, Biosphere, Cryosphere, Oceans), "
                "keywords (array of 4-7 concise Earth science search terms for NASA CMR/POWER/AppEEARS), "
                "target_variables (array of 2-4 variable codes such as T2M, PRECTOTCORR, GWETTOP, NDVI, GLDAS_NOAH025_3H_2_1_SoilMoi0_10cm_inst), "
                "inferred_region_name (string), inferred_spatial_level ('global' or 'regional'), "
                f"inferred_bbox (default {bbox}), inferred_Center (default {center}), "
                f"inferred_start_date ('{start_date}'), inferred_end_date ('{end_date}'), "
                f"inferred_frequency ('{freq}'), "
                f"target_apis ({json.dumps(active_apis)}), "
                "interpretation_summary (concise 2-sentence explanation of the domain and data lookup plan)."
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": f"{system_instruction}\n\nUser Query: {prompt}"}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
            }
            try:
                resp = await client.post(url, json=payload, timeout=8.0)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                    )
                    if raw_text:
                        parsed = json.loads(raw_text)
                        if parsed.get("is_dataset_search_request") is not True:
                            return None, False
                        parsed.pop("is_dataset_search_request", None)
                        parsed["target_apis"] = active_apis
                        parsed["llm_model_used"] = f"{GEMINI_MODEL} (Live Gemini API)"
                        intent = ExtractedIntent(**parsed)
                        _INTENT_CACHE[cache_key] = (now, intent)
                        return intent, False
            except Exception:
                pass

        # Deterministic keyword & live-geocoded intent extraction when Gemini returns HTTP 403
        lower = prompt.lower()
        best_domain = DOMAIN_ONTOLOGY[-1]
        best_score = 0
        for entry in DOMAIN_ONTOLOGY:
            score = sum(2 if trig in lower else 0 for trig in entry["triggers"])
            if score > best_score:
                best_score = score
                best_domain = entry

        keywords = list(best_domain["keywords"])
        target_vars = list(best_domain["target_variables"])
        for entry in DOMAIN_ONTOLOGY:
            if entry is not best_domain and any(trig in lower for trig in entry["triggers"]):
                for kw in entry["keywords"][:2]:
                    if kw not in keywords:
                        keywords.append(kw)
                for tv in entry["target_variables"][:2]:
                    if tv not in target_vars:
                        target_vars.append(tv)

        interpretation = (
            f"Identified subject domain '{best_domain['subject_domain']}' ({best_domain['scientific_category']}). "
            f"Querying live NASA catalogs ({', '.join(active_apis)}) for keywords [{', '.join(keywords[:5])}] "
            f"across {region_name} ({start_date[:4]}–{end_date[:4]}, {freq} frequency)."
        )

        intent = ExtractedIntent(
            subject_domain=str(best_domain["subject_domain"]),
            scientific_category=str(best_domain["scientific_category"]),
            keywords=keywords[:7],
            target_variables=target_vars[:5],
            inferred_region_name=region_name,
            inferred_spatial_level=spatial_level,  # type: ignore[arg-type]
            inferred_bbox=bbox,
            inferred_Center=center,
            inferred_start_date=start_date,
            inferred_end_date=end_date,
            inferred_frequency=freq,  # type: ignore[arg-type]
            target_apis=active_apis,
            interpretation_summary=interpretation,
            llm_model_used=GEMINI_MODEL,
        )
        _INTENT_CACHE[cache_key] = (now, intent)
        return intent, False


def rank_and_explain_products(
    products: List[DataProduct], intent: ExtractedIntent, prompt: str
) -> List[DataProduct]:
    """Ranks live-discovered products by keyword/variable relevance and enriches match explanations."""
    query_terms = set(
        re.findall(
            r"[a-z0-9]+",
            (prompt + " " + " ".join(intent.keywords) + " " + " ".join(intent.target_variables)).lower(),
        )
    )

    ranked: List[DataProduct] = []
    for prod in products:
        searchable = (
            f"{prod.title} {prod.variable_name} {prod.variable_id} {prod.description} "
            f"{prod.what_it_measures} {prod.category} {' '.join(prod.gcmd_keywords)}"
        ).lower()

        kw_hits = sum(1 for kw in intent.keywords if any(w in searchable for w in kw.lower().split()))
        var_hits = sum(1 for tv in intent.target_variables if tv.lower() in searchable)
        term_hits = sum(1 for t in query_terms if len(t) >= 3 and t in searchable)

        # Boost directly extractable synchronous time-series endpoints across NASA, NOAA, OPeNDAP, EODAG & Copernicus CDS
        sync_bonus = (
            6.0
            if prod.source_api
            in (
                "NASA POWER",
                "NASA GES DISC",
                "NOAA CDO",
                "NOAA OneStop",
                "OPeNDAP",
                "EODAG",
                "Copernicus CDS",
            )
            else 0.0
        )

        computed_score = min(
            99.5,
            max(
                65.0,
                prod.relevance_score * 0.55
                + kw_hits * 6.5
                + var_hits * 8.0
                + min(16.0, term_hits * 2.5)
                + sync_bonus,
            ),
        )
        prod.relevance_score = round(computed_score, 1)
        ranked.append(prod)

    ranked.sort(key=lambda p: p.relevance_score, reverse=True)
    return ranked
