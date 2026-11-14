"""
Live Literature & Dataset Citation Provider — OpenAlex & DataCite REST APIs
- OpenAlex API: https://api.openalex.org/works (Docs: https://help.openalex.org/api/)
- DataCite API: https://api.datacite.org/dois (Docs: https://support.datacite.org/docs/api)
100% live upstream data — zero synthetic or hardcoded fallback papers.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional, Tuple

import httpx

from schemas import (
    ResearchDatasetContext,
    ResearchSearchRequest,
    ResearchSearchResponse,
    ResearchWorkItem,
)

OPENALEX_WORKS_URL = "https://api.openalex.org/works"
DATACITE_DOIS_URL = "https://api.datacite.org/dois"

DOI_REGEX = re.compile(r"(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)", re.IGNORECASE)


def extract_clean_doi(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    match = DOI_REGEX.search(raw.strip())
    if not match:
        return None
    return match.group(1).rstrip(".,;)")


def reconstruct_openalex_abstract(inverted_index: Optional[Dict[str, List[int]]]) -> str:
    if not inverted_index or not isinstance(inverted_index, dict):
        return ""
    positions: List[Tuple[int, str]] = []
    for word, idxs in inverted_index.items():
        if not isinstance(idxs, list):
            continue
        for idx in idxs:
            if isinstance(idx, int):
                positions.append((idx, word))
    if not positions:
        return ""
    positions.sort(key=lambda item: item[0])
    text = " ".join(word for _, word in positions)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > 420:
        return text[:417].rstrip() + "…"
    return text


def clean_html_tags(text: str) -> str:
    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def build_dataset_search_query(ctx: ResearchDatasetContext, extra_query: Optional[str] = None) -> str:
    parts: List[str] = []
    var_name = (ctx.variable_name or "").strip()
    if var_name:
        parts.append(var_name)

    mission = (ctx.mission_or_instrument or "").strip()
    source_api = (ctx.source_api or "").strip()
    if mission and mission.lower() not in var_name.lower():
        # Extract concise mission token (e.g. MERRA-2, MODIS, GPM, ERA5)
        mission_tokens = [
            tok.strip()
            for tok in re.split(r"[/·,()]+", mission)
            if tok.strip() and len(tok.strip()) <= 28
        ]
        if mission_tokens:
            parts.append(mission_tokens[0])
    elif source_api and source_api.lower() not in var_name.lower():
        parts.append(source_api)

    if ctx.variable_id and len(ctx.variable_id) >= 3:
        vid = ctx.variable_id.strip()
        if vid.lower() not in " ".join(parts).lower() and not vid.startswith("NASA_"):
            parts.append(vid)

    if extra_query and extra_query.strip():
        parts.append(extra_query.strip())

    query = " ".join(parts).strip()
    return query or ctx.title or ctx.product_id or "Earth observation climate time series"


def parse_openalex_work(
    work: Dict[str, Any],
    match_context: Optional[str] = None,
) -> Optional[ResearchWorkItem]:
    title = (work.get("display_name") or work.get("title") or "").strip()
    if not title:
        return None

    work_id = str(work.get("id") or "")
    short_id = work_id.rsplit("/", 1)[-1] if "/" in work_id else work_id
    record_url = work_id if work_id.startswith("http") else f"https://openalex.org/{short_id}"

    raw_doi = work.get("doi")
    clean_doi = extract_clean_doi(raw_doi)
    doi_url = f"https://doi.org/{clean_doi}" if clean_doi else None

    authorships = work.get("authorships") or []
    author_names: List[str] = []
    for auth in authorships[:4]:
        author_obj = (auth or {}).get("author") or {}
        name = author_obj.get("display_name")
        if name:
            author_names.append(str(name))
    if len(authorships) > 4:
        author_names.append("et al.")
    authors_str = ", ".join(author_names) if author_names else "Authors listed in source"

    year = work.get("publication_year")
    if isinstance(year, int):
        pub_year: Optional[int] = year
    else:
        pub_year = None

    primary_loc = work.get("primary_location") or {}
    source_obj = primary_loc.get("source") or {}
    publication = (
        source_obj.get("display_name")
        or primary_loc.get("raw_source_name")
        or "Scholarly Publication (OpenAlex)"
    )

    landing_url = primary_loc.get("landing_page_url")
    pdf_url = primary_loc.get("pdf_url")
    oa_obj = work.get("open_access") or {}
    oa_url = oa_obj.get("oa_url")
    is_oa = bool(oa_obj.get("is_oa"))

    raw_type = str(work.get("type") or "article").replace("-", " ").title()
    topics = work.get("topics") or []
    concepts = work.get("concepts") or []
    topic_label = "Earth & Environmental Sciences"
    if topics and isinstance(topics[0], dict) and topics[0].get("display_name"):
        topic_label = str(topics[0]["display_name"])
    elif concepts and isinstance(concepts[0], dict) and concepts[0].get("display_name"):
        topic_label = str(concepts[0]["display_name"])

    abstract_snippet = reconstruct_openalex_abstract(work.get("abstract_inverted_index"))
    if not abstract_snippet:
        abstract_snippet = (
            f"Indexed peer-reviewed {raw_type.lower()} in {publication} covering {topic_label}."
        )

    paper_url = pdf_url or oa_url or landing_url or doi_url or record_url
    abstract_url = landing_url or record_url or doi_url
    dataset_url = doi_url if "dataset" in raw_type.lower() else None
    primary_url = landing_url or doi_url or oa_url or record_url

    cited_by = work.get("cited_by_count")
    cited_by_count = int(cited_by) if isinstance(cited_by, (int, float)) else 0

    return ResearchWorkItem(
        id=f"openalex-{short_id or abs(hash(title))}",
        source_provider="OpenAlex",
        title=title,
        authors=authors_str,
        year=pub_year,
        publication=str(publication),
        work_type=raw_type,
        topic=topic_label,
        abstract_snippet=abstract_snippet,
        doi=clean_doi,
        doi_url=doi_url,
        primary_url=primary_url,
        paper_url=paper_url,
        abstract_url=abstract_url,
        dataset_url=dataset_url,
        record_url=record_url,
        is_open_access=is_oa,
        cited_by_count=cited_by_count,
        match_context=match_context,
    )


def parse_datacite_item(
    item: Dict[str, Any],
    match_context: Optional[str] = None,
) -> Optional[ResearchWorkItem]:
    attrs = item.get("attributes") or {}
    titles = attrs.get("titles") or []
    title = ""
    for t in titles:
        if isinstance(t, dict) and t.get("title"):
            title = clean_html_tags(str(t["title"]))
            break
    if not title:
        return None

    clean_doi = extract_clean_doi(attrs.get("doi") or item.get("id"))
    doi_url = f"https://doi.org/{clean_doi}" if clean_doi else None
    registered_url = attrs.get("url")
    record_url = (
        f"https://commons.datacite.org/doi.org/{clean_doi}"
        if clean_doi
        else (registered_url or "https://commons.datacite.org")
    )

    creators = attrs.get("creators") or []
    creator_names: List[str] = []
    for c in creators[:4]:
        if not isinstance(c, dict):
            continue
        name = c.get("name") or " ".join(
            part for part in [c.get("givenName"), c.get("familyName")] if part
        )
        if name:
            creator_names.append(str(name).strip())
    if len(creators) > 4:
        creator_names.append("et al.")
    authors_str = ", ".join(creator_names) if creator_names else (attrs.get("publisher") or "DataCite Contributor")

    pub_year_raw = attrs.get("publicationYear")
    try:
        pub_year: Optional[int] = int(pub_year_raw) if pub_year_raw is not None else None
    except (ValueError, TypeError):
        pub_year = None

    publisher = str(attrs.get("publisher") or "DataCite Repository")
    types_obj = attrs.get("types") or {}
    work_type = str(
        types_obj.get("resourceTypeGeneral")
        or types_obj.get("resourceType")
        or "Dataset / Resource"
    )

    subjects = attrs.get("subjects") or []
    topic_label = "Scientific Dataset & Research"
    for s in subjects:
        if isinstance(s, dict) and s.get("subject"):
            subj = str(s["subject"]).strip()
            if subj:
                topic_label = subj[:65]
                break

    descriptions = attrs.get("descriptions") or []
    abstract_snippet = ""
    for d in descriptions:
        if isinstance(d, dict) and d.get("description"):
            desc = clean_html_tags(str(d["description"]))
            if len(desc) > 25:
                abstract_snippet = desc[:417].rstrip() + "…" if len(desc) > 420 else desc
                break
    if not abstract_snippet:
        abstract_snippet = (
            f"Registered {work_type} published by {publisher} and indexed in DataCite."
        )

    citation_count_raw = attrs.get("citationCount")
    cited_by_count = int(citation_count_raw) if isinstance(citation_count_raw, (int, float)) else 0

    is_dataset = work_type.lower() in {"dataset", "collection", "software", "dataperiodical", "model"}
    primary_url = registered_url or doi_url or record_url
    dataset_url = (registered_url or doi_url) if is_dataset else doi_url
    paper_url = (registered_url or doi_url) if not is_dataset else None
    abstract_url = record_url or doi_url or primary_url

    return ResearchWorkItem(
        id=f"datacite-{clean_doi or abs(hash(title))}",
        source_provider="DataCite",
        title=title,
        authors=authors_str,
        year=pub_year,
        publication=publisher,
        work_type=work_type,
        topic=topic_label,
        abstract_snippet=abstract_snippet,
        doi=clean_doi,
        doi_url=doi_url,
        primary_url=primary_url,
        paper_url=paper_url,
        abstract_url=abstract_url,
        dataset_url=dataset_url,
        record_url=record_url,
        is_open_access=True,
        cited_by_count=cited_by_count,
        match_context=match_context,
    )


async def fetch_openalex_works(
    client: httpx.AsyncClient,
    query: str,
    doi_target: Optional[str],
    sort: str,
    limit: int,
    match_context: Optional[str],
) -> Tuple[List[ResearchWorkItem], str]:
    items: List[ResearchWorkItem] = []
    headers = {"User-Agent": "ProjectIris/3.0 (https://help.openalex.org)"}
    select_fields = (
        "id,doi,title,display_name,publication_year,type,open_access,"
        "primary_location,authorships,cited_by_count,topics,concepts,abstract_inverted_index"
    )
    try:
        if doi_target:
            doi_resp = await client.get(
                OPENALEX_WORKS_URL,
                params={
                    "filter": f"doi:https://doi.org/{doi_target}",
                    "select": select_fields,
                    "per-page": 5,
                },
                headers=headers,
            )
            if doi_resp.status_code == 200:
                for raw in doi_resp.json().get("results") or []:
                    parsed = parse_openalex_work(raw, match_context="Exact DOI Match")
                    if parsed:
                        items.append(parsed)

        params: Dict[str, Any] = {
            "search": query,
            "select": select_fields,
            "per-page": limit,
        }
        if sort == "citations":
            params["sort"] = "cited_by_count:desc"
        elif sort == "year":
            params["sort"] = "publication_year:desc"

        resp = await client.get(OPENALEX_WORKS_URL, params=params, headers=headers)
        if resp.status_code != 200:
            return items, f"HTTP {resp.status_code}"

        payload = resp.json()
        for raw in payload.get("results") or []:
            parsed = parse_openalex_work(raw, match_context=match_context)
            if parsed:
                items.append(parsed)

        return items, f"ok ({len(items)} works)"
    except Exception as exc:
        return items, f"error: {exc}"


async def fetch_datacite_dois(
    client: httpx.AsyncClient,
    query: str,
    doi_target: Optional[str],
    sort: str,
    limit: int,
    match_context: Optional[str],
) -> Tuple[List[ResearchWorkItem], str]:
    items: List[ResearchWorkItem] = []
    headers = {"Accept": "application/vnd.api+json"}
    try:
        if doi_target:
            doi_resp = await client.get(
                f"{DATACITE_DOIS_URL}/{doi_target}",
                headers=headers,
            )
            if doi_resp.status_code == 200:
                data_obj = doi_resp.json().get("data")
                if isinstance(data_obj, dict):
                    parsed = parse_datacite_item(data_obj, match_context="Exact DOI Match")
                    if parsed:
                        items.append(parsed)

        params: Dict[str, Any] = {
            "query": query,
            "page[size]": limit,
        }
        if sort == "citations":
            params["sort"] = "-citation-count"
        elif sort == "year":
            params["sort"] = "-publicationYear"
        else:
            params["sort"] = "relevance"

        resp = await client.get(DATACITE_DOIS_URL, params=params, headers=headers)
        if resp.status_code != 200:
            return items, f"HTTP {resp.status_code}"

        payload = resp.json()
        for raw in payload.get("data") or []:
            parsed = parse_datacite_item(raw, match_context=match_context)
            if parsed:
                items.append(parsed)

        return items, f"ok ({len(items)} records)"
    except Exception as exc:
        return items, f"error: {exc}"


async def execute_research_search(req: ResearchSearchRequest) -> ResearchSearchResponse:
    dataset_ctx = req.dataset_context
    manual_q = (req.query or "").strip()

    if req.mode == "dataset":
        if not dataset_ctx:
            raise ValueError("dataset_context is required when searching by selected dataset.")
        search_query = build_dataset_search_query(dataset_ctx, extra_query=manual_q)
        doi_target = extract_clean_doi(dataset_ctx.citation_doi)
        dataset_label = f"{dataset_ctx.variable_name} ({dataset_ctx.variable_id} · {dataset_ctx.source_api})"
        match_context = f"Matched to {dataset_ctx.variable_id} · {dataset_ctx.source_api}"
    else:
        if not manual_q:
            raise ValueError("A search query (DOI, keyword, author, or topic) is required.")
        doi_target = extract_clean_doi(manual_q)
        search_query = doi_target if doi_target and len(manual_q) < 45 else manual_q
        dataset_label = (
            f"{dataset_ctx.variable_name} ({dataset_ctx.variable_id})"
            if dataset_ctx
            else None
        )
        match_context = "Direct DOI / Keyword Search" if doi_target else None

    sources = set(req.sources or ["openalex", "datacite"])
    provider_status: Dict[str, str] = {}
    openalex_items: List[ResearchWorkItem] = []
    datacite_items: List[ResearchWorkItem] = []

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        tasks = []
        if "openalex" in sources:
            tasks.append(
                fetch_openalex_works(
                    client=client,
                    query=search_query,
                    doi_target=doi_target,
                    sort=req.sort,
                    limit=req.per_source_limit,
                    match_context=match_context,
                )
            )
        if "datacite" in sources:
            tasks.append(
                fetch_datacite_dois(
                    client=client,
                    query=search_query,
                    doi_target=doi_target,
                    sort=req.sort,
                    limit=req.per_source_limit,
                    match_context=match_context,
                )
            )

        results = await asyncio.gather(*tasks)
        idx = 0
        if "openalex" in sources:
            openalex_items, oa_status = results[idx]
            provider_status["OpenAlex"] = oa_status
            idx += 1
        if "datacite" in sources:
            datacite_items, dc_status = results[idx]
            provider_status["DataCite"] = dc_status

    # Merge and deduplicate while preserving both OpenAlex and DataCite representations
    combined: List[ResearchWorkItem] = []
    seen_keys: Dict[str, ResearchWorkItem] = {}

    # Interleave OpenAlex and DataCite for balanced representation when sorting by relevance
    max_len = max(len(openalex_items), len(datacite_items))
    interleaved: List[ResearchWorkItem] = []
    for i in range(max_len):
        if i < len(openalex_items):
            interleaved.append(openalex_items[i])
        if i < len(datacite_items):
            interleaved.append(datacite_items[i])

    for item in interleaved:
        dedup_key = (item.doi or item.title).strip().lower()
        if dedup_key in seen_keys:
            existing = seen_keys[dedup_key]
            if not existing.dataset_url and item.dataset_url:
                existing.dataset_url = item.dataset_url
            if not existing.paper_url and item.paper_url:
                existing.paper_url = item.paper_url
            if item.cited_by_count > existing.cited_by_count:
                existing.cited_by_count = item.cited_by_count
            continue
        seen_keys[dedup_key] = item
        combined.append(item)

    if req.sort == "citations":
        combined.sort(key=lambda x: (x.cited_by_count, x.year or 0), reverse=True)
    elif req.sort == "year":
        combined.sort(key=lambda x: (x.year or 0, x.cited_by_count), reverse=True)
    else:
        # Keep Exact DOI Matches first, then preserve interleaved API relevance order
        combined.sort(key=lambda x: 0 if x.match_context == "Exact DOI Match" else 1)

    oa_count = sum(1 for item in combined if item.source_provider == "OpenAlex")
    dc_count = sum(1 for item in combined if item.source_provider == "DataCite")
    open_access_count = sum(1 for item in combined if item.is_open_access)

    return ResearchSearchResponse(
        mode=req.mode,
        query_executed=search_query,
        dataset_label=dataset_label,
        total_results=len(combined),
        openalex_count=oa_count,
        datacite_count=dc_count,
        open_access_count=open_access_count,
        provider_status=provider_status,
        results=combined,
        retrieved_at=datetime.now(timezone.utc).isoformat(),
    )
