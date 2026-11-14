"""
Streamlined Conversational SI Chat Service (`POST /api/v1/si/chat`)
Uses `gemini-3.5-flash-lite` (configured in `backend/.env`) + live catalog discovery across all 10 APIs:
`NASA POWER`, `NASA CMR`, `NASA AppEEARS`, `NASA GES DISC`, `NASA Harmony`,
`NOAA CDO`, `NOAA OneStop`, `OPeNDAP`, `EODAG`, and `Copernicus CDS`.

Strict Two-Phase Keyword Confirmation Gate:
- Step 1 (`topic_discovery` -> returns `next_stage="keyword_confirmation"`):
  Analyses the user's research topic, identifies the subject domain & proposed search keywords,
  and waits for the user to confirm/edit the keywords. **Zero external database catalog requests**
  are sent until the user confirms the keywords.
- Step 2 (`keyword_confirmation` -> queries the 10 live databases):
  Once the user confirms the keywords, concurrently queries the 10 live APIs strictly for
  **time-series data products** and presents the ranked dataset options.
- Step 3 (`parameter_definition`):
  Configures Date Range, Temporal Frequency, and Region/Coordinates for the selected dataset.
- Step 4 (`ready_to_extract`):
  Triggers live upstream time-series extraction and routes to Data Preview.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

import httpx

from adapters.catalog_adapters import discover_catalog_products, get_product_by_id_live
from config import GEMINI_MODEL, get_gemini_api_key
from providers.geocoder import geocode_place_live
from schemas import (
    ChatTurnRequest,
    ChatTurnResponse,
    DataProduct,
    ExtractionRequest,
)
from services.llm_router import (
    _extract_candidate_place_string,
    extract_scientific_intent,
    rank_and_explain_products,
)


async def _call_gemini_conversational(
    system_prompt: str,
    user_message: str,
    history: List[Dict[str, str]],
) -> Tuple[Optional[str], str]:
    """
    Calls `models/gemini-3.5-flash-lite:generateContent` with the API key in `backend/.env`.
    Returns (reply_text_or_None, live_status_string).
    """
    api_key = get_gemini_api_key()
    if not api_key:
        return None, "missing_api_key"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    contents = []
    for h in history[-6:]:
        role = "model" if h.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser message: {user_message}"}]})

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                json={"contents": contents, "generationConfig": {"temperature": 0.25}},
            )
            if resp.status_code == 200:
                data = resp.json()
                text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                if text:
                    return text.strip(), f"ok ({GEMINI_MODEL})"
            return None, f"http_{resp.status_code}"
    except Exception as exc:
        return None, f"error: {type(exc).__name__}"


def _build_default_extraction_config(
    product: DataProduct,
    region_name: str,
    spatial_level: str,
    bbox: List[float],
    center: List[float],
    start_date: str,
    end_date: str,
    frequency: str,
) -> ExtractionRequest:
    rec_agg = (
        product.available_layers[0].recommended_aggregation
        if product.available_layers
        else ("sum" if "precip" in product.variable_name.lower() else "mean")
    )
    eff_start = max(product.temporal_start, start_date)
    return ExtractionRequest(
        product_id=product.product_id,
        variable_id=product.variable_id,
        variable_name=product.variable_name,
        source_api=product.source_api,
        unit=product.unit,
        start_date=eff_start,
        end_date=end_date,
        target_frequency=frequency if frequency in product.supported_frequencies else "Monthly",  # type: ignore[arg-type]
        temporal_aggregation=rec_agg,
        spatial_level="global" if spatial_level == "global" else "regional",
        spatial_Submode="point"
        if product.source_api in ("NASA POWER", "NASA GES DISC", "OPeNDAP", "Copernicus CDS", "EODAG")
        else "bbox",
        region_name=region_name,
        bbox=bbox,
        point_lat=center[0],
        point_lon=center[1],
        spatial_reduction="mean",
    )


async def process_si_chat_turn(req: ChatTurnRequest) -> ChatTurnResponse:
    """
    Processes a conversational turn in the SI Assistant with strict API gating:
    1. `topic_discovery` (when `confirmed_keywords` is None):
       Identifies subject domain & proposed keywords ONLY. Does NOT query external databases yet.
       Returns `next_stage="keyword_confirmation"` so the user can review/edit and confirm keywords.
    2. `keyword_confirmation` (or when `confirmed_keywords` is provided):
       Executes live time-series catalog queries across the 10 databases using the confirmed keywords
       and returns the ranked time-series datasets.
    3. `parameter_definition`:
       Configures Date Range, Temporal Frequency, and Region/Coordinates for a selected dataset.
    4. `ready_to_extract`:
       Signals ready to extract real time-series data.
    """
    msg_lower = req.message.strip().lower()

    # -------------------------------------------------------------------------
    # Stage 4: Check if the user is confirming extraction during parameter_definition
    # -------------------------------------------------------------------------
    confirm_extract_phrases = [
        "extract", "fetch", "get data", "retrieve", "run", "preview", "confirm", "proceed", "yes", "go ahead"
    ]
    if (
        req.conversation_stage in ("parameter_definition", "ready_to_extract")
        and req.current_config is not None
        and any(p in msg_lower for p in confirm_extract_phrases)
        and len(msg_lower.split()) <= 8
    ):
        prod = await get_product_by_id_live(
            req.current_config.product_id,
            req.current_config.source_api,
            req.current_config.variable_id,
        )
        cfg = req.current_config
        reply = (
            f"Initiating live time-series extraction for **{prod.variable_name}** (`{cfg.variable_id}`) "
            f"from **{prod.source_api}** covering **{cfg.region_name}** (`{cfg.point_lat}°, {cfg.point_lon}°`) "
            f"from **{cfg.start_date}** to **{cfg.end_date}** at **{cfg.target_frequency}** resolution."
        )
        return ChatTurnResponse(
            assistant_reply=reply,
            next_stage="ready_to_extract",
            llm_model_used=GEMINI_MODEL,
            llm_live_status="ready",
            selected_product=prod,
            proposed_config=cfg,
            trigger_extraction=True,
        )

    # -------------------------------------------------------------------------
    # Stage 3: User selected a dataset or is refining Date Range / Frequency / Region
    # -------------------------------------------------------------------------
    if req.selected_product_id and req.conversation_stage == "parameter_definition":
        prod = await get_product_by_id_live(
            req.selected_product_id, req.selected_source_api, req.selected_variable_id
        )
        base_cfg = req.current_config or _build_default_extraction_config(
            prod,
            "Colombo, Western Province, Sri Lanka",
            "regional",
            [78.849, 5.935, 80.849, 7.935],
            [6.9355, 79.8487],
            "2018-01-01",
            "2024-12-31",
            "Monthly",
        )
        base_cfg.product_id = prod.product_id
        base_cfg.variable_id = req.selected_variable_id or prod.variable_id
        base_cfg.variable_name = prod.variable_name
        base_cfg.source_api = prod.source_api
        base_cfg.unit = prod.unit

        years = [int(y) for y in re.findall(r"\b(19[89]\d|20[0-2]\d)\b", req.message)]
        if len(years) >= 2:
            base_cfg.start_date = f"{max(1981, min(years))}-01-01"
            base_cfg.end_date = f"{min(2025, max(years))}-12-31"
        elif len(years) == 1:
            base_cfg.start_date = f"{max(1981, years[0])}-01-01"

        if "daily" in msg_lower:
            base_cfg.target_frequency = "Daily"
        elif "monthly" in msg_lower:
            base_cfg.target_frequency = "Monthly"
        elif "yearly" in msg_lower or "annual" in msg_lower:
            base_cfg.target_frequency = "Yearly"
        elif "seasonal" in msg_lower:
            base_cfg.target_frequency = "Seasonal"

        place_cand = _extract_candidate_place_string(req.message)
        if place_cand and place_cand.lower() not in ("colombo, sri lanka",):
            geo = await geocode_place_live(place_cand)
            if geo:
                base_cfg.region_name = str(geo["name"])
                base_cfg.spatial_level = str(geo["spatial_level"])  # type: ignore[assignment]
                base_cfg.bbox = list(geo["bbox"])  # type: ignore[arg-type]
                base_cfg.point_lat = float(geo["lat"])  # type: ignore[arg-type]
                base_cfg.point_lon = float(geo["lon"])  # type: ignore[arg-type]

        sys_prompt = (
            f"You are Project Iris SI Assistant powered by {GEMINI_MODEL}. "
            f"The user selected dataset '{prod.title}' ({prod.variable_id}) from {prod.source_api}. "
            f"Current scope: Region={base_cfg.region_name} ({base_cfg.point_lat}, {base_cfg.point_lon}), "
            f"Date Range={base_cfg.start_date} to {base_cfg.end_date}, Frequency={base_cfg.target_frequency}. "
            "Respond concisely (2-3 sentences) confirming these parameters and telling the user they can click "
            "'Extract Live Time-Series & Preview' or reply to adjust the dates, frequency, or region."
        )
        llm_reply, llm_status = await _call_gemini_conversational(sys_prompt, req.message, req.history)
        if not llm_reply:
            llm_reply = (
                f"Great choice — **{prod.variable_name}** (`{prod.variable_id}`) from **{prod.source_api}** "
                f"({prod.provider_agency}).\n\n"
                f"I have configured your extraction parameters:\n"
                f"- **Time Scope**: `{base_cfg.start_date}` to `{base_cfg.end_date}`\n"
                f"- **Temporal Frequency**: `{base_cfg.target_frequency}` ({base_cfg.temporal_aggregation})\n"
                f"- **Geographic Region**: **{base_cfg.region_name}** (`{base_cfg.point_lat}°N, {base_cfg.point_lon}°E`)\n\n"
                f"You can adjust any parameter below (or reply with new dates/region), then click **Retrieve Live Time-Series Data** to fetch the real observations."
            )

        return ChatTurnResponse(
            assistant_reply=llm_reply,
            next_stage="parameter_definition",
            llm_model_used=GEMINI_MODEL,
            llm_live_status=llm_status,
            selected_product=prod,
            proposed_config=base_cfg,
            trigger_extraction=False,
        )

    # -------------------------------------------------------------------------
    # Stage 2: User Confirmed Keywords -> Query the 10 Live Time-Series Databases
    # -------------------------------------------------------------------------
    if req.conversation_stage == "keyword_confirmation" or (req.confirmed_keywords and len(req.confirmed_keywords) > 0):
        if req.cached_intent is not None:
            intent = req.cached_intent
        else:
            # Re-derive intent from history or message
            last_user_topic = req.message
            for h in reversed(req.history):
                if h.get("role") == "user" and len(h.get("content", "")) > 8:
                    last_user_topic = h["content"]
                    break
            intent, _ = await extract_scientific_intent(
                prompt=last_user_topic,
                preferred_providers=req.preferred_providers,
            )

        if req.confirmed_keywords and len(req.confirmed_keywords) > 0:
            intent.keywords = [k.strip() for k in req.confirmed_keywords if k.strip()]
        elif not any(w in msg_lower for w in ("confirm", "search", "yes", "proceed", "ok", "go")):
            # User typed custom keywords or refinements in chat during keyword_confirmation
            extra_kw = [w.strip() for w in re.split(r"[,;]+", req.message) if len(w.strip()) >= 2]
            if extra_kw:
                intent.keywords = extra_kw[:8]

        candidates, queried_sources, provider_status = await discover_catalog_products(
            intent=intent,
            preferred_providers=req.preferred_providers,
        )
        ranked = rank_and_explain_products(candidates, intent, " ".join(intent.keywords))

        primary = ranked[0] if ranked else None
        proposed_cfg = (
            _build_default_extraction_config(
                primary,
                intent.inferred_region_name,
                intent.inferred_spatial_level,
                intent.inferred_bbox,
                intent.inferred_Center,
                intent.inferred_start_date,
                intent.inferred_end_date,
                intent.inferred_frequency,
            )
            if primary
            else None
        )

        product_summary_lines = [
            f"- **{p.variable_name}** (`{p.variable_id}`) from **{p.source_api}** ({p.provider_agency})"
            for p in ranked[:6]
        ]
        sys_prompt = (
            f"You are Project Iris SI Assistant powered by {GEMINI_MODEL}. "
            f"The user confirmed keywords {intent.keywords} for domain '{intent.subject_domain}'. "
            f"We queried {len(queried_sources)} live databases ({', '.join(queried_sources)}) and discovered {len(ranked)} real time-series datasets:\n"
            + "\n".join(product_summary_lines)
            + "\nWrite a concise response (2-3 sentences) summarizing the live database search results and inviting the user to select a dataset below to configure the date range, frequency, and region."
        )
        llm_reply, llm_status = await _call_gemini_conversational(sys_prompt, req.message, req.history)

        if not llm_reply:
            llm_reply = (
                f"Keywords confirmed (`{', '.join(intent.keywords)}`). I queried **{len(queried_sources)} live time-series databases** "
                f"(**{', '.join(queried_sources)}**) and discovered **{len(ranked)} verified time-series datasets**.\n\n"
                f"Select any dataset card below to proceed to **Step 3: Defining your Time Scope ({intent.inferred_start_date[:4]}–{intent.inferred_end_date[:4]}), "
                f"Frequency ({intent.inferred_frequency}), and Region ({intent.inferred_region_name})**."
            )

        return ChatTurnResponse(
            assistant_reply=llm_reply,
            next_stage="topic_discovery",
            llm_model_used=GEMINI_MODEL,
            llm_live_status=llm_status,
            intent=intent,
            products=ranked,
            selected_product=primary,
            proposed_config=proposed_cfg,
            provider_status=provider_status,
            trigger_extraction=False,
        )

    # -------------------------------------------------------------------------
    # Stage 1: Initial Topic Analysis -> Propose Keywords ONLY (Zero Catalog API Calls)
    # -------------------------------------------------------------------------
    intent, _ = await extract_scientific_intent(
        prompt=req.message,
        preferred_providers=req.preferred_providers,
    )

    sys_prompt = (
        f"You are Project Iris SI Assistant powered by {GEMINI_MODEL}. "
        f"The user asked: '{req.message}'. "
        f"We identified subject domain '{intent.subject_domain}' ({intent.scientific_category}), "
        f"proposed time-series search keywords {intent.keywords}, inferred region '{intent.inferred_region_name}', "
        f"and target databases {intent.target_apis}. "
        "Do NOT search the databases yet. Write a concise response (2-3 sentences) presenting the identified "
        "subject domain and proposed keywords, and ask the user to review/edit and confirm the keywords below "
        "to launch the live time-series search across NASA, NOAA, OPeNDAP, EODAG, and Copernicus CDS."
    )
    llm_reply, llm_status = await _call_gemini_conversational(sys_prompt, req.message, req.history)

    if not llm_reply:
        llm_reply = (
            f"I analyzed your research topic under **{intent.subject_domain}** ({intent.scientific_category} Sphere) "
            f"for **{intent.inferred_region_name}** (`{intent.inferred_start_date[:4]}–{intent.inferred_end_date[:4]}`).\n\n"
            f"Before querying the external databases, please review or customize the identified **time-series search keywords** below:\n"
            f"- **Proposed Keywords**: `{', '.join(intent.keywords)}`\n"
            f"- **Target Databases ({len(intent.target_apis)})**: {', '.join(intent.target_apis)}\n\n"
            f"Click **Confirm Keywords & Search Live Databases** below (or reply to refine the keywords) to query the live catalogs."
        )

    return ChatTurnResponse(
        assistant_reply=llm_reply,
        next_stage="keyword_confirmation",
        llm_model_used=GEMINI_MODEL,
        llm_live_status=llm_status,
        intent=intent,
        products=[],
        selected_product=None,
        proposed_config=None,
        provider_status={},
        trigger_extraction=False,
    )
