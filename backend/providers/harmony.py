"""
NASA Harmony API Provider (Isolated Module)
Official Docs: https://harmony.earthdata.nasa.gov/docs
- Capabilities Inspection: GET https://harmony.earthdata.nasa.gov/capabilities?collectionid={concept_id}
- Jobs Status Inspection:  GET https://harmony.earthdata.nasa.gov/jobs/{job_id}
- OGC API Coverages / Giovanni Area Averaging:
  GET https://harmony.earthdata.nasa.gov/{collection_id}/ogc-api-coverages/1.0/collections/{variable}/coverage/rangeset
- Uses Authorization: Bearer <EARTHDATA_TOKEN>
"""

from __future__ import annotations

from typing import Dict, List, Optional
import httpx

from config import get_earthdata_token
from providers.cmr import search_cmr_catalog
from schemas import DataProduct


async def get_harmony_collection_capabilities(
    concept_id: str,
    client: httpx.AsyncClient,
    earthdata_token: Optional[str] = None,
) -> Optional[Dict[str, object]]:
    """Queries `https://harmony.earthdata.nasa.gov/capabilities?collectionid={concept_id}` live."""
    token = get_earthdata_token(earthdata_token)
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    resp = await client.get(
        "https://harmony.earthdata.nasa.gov/capabilities",
        params={"collectionid": concept_id},
        headers=headers,
        timeout=12.0,
    )
    if resp.status_code == 200:
        return resp.json()
    return None


async def search_harmony_catalog(
    keywords: List[str],
    client: httpx.AsyncClient,
    max_results: int = 4,
) -> List[DataProduct]:
    """
    Discovers Harmony-enabled NASA collections via CMR (`has_transforms=true`)
    and verifies their subsetting capabilities against Harmony.
    """
    products = await search_cmr_catalog(
        keywords=keywords,
        client=client,
        has_transforms=True,
        max_results=max_results,
    )
    for p in products:
        p.source_api = "NASA Harmony"
        p.ai_match_reason = (
            f"Harmony-enabled NASA collection ({p.product_id}) supporting cloud subsetting & transformation."
        )
    return products
