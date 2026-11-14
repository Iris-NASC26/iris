"""
SRS v1.0 Durable Job, Result & Provenance Store
Persists completed extraction results and job states to disk (`backend/data/iris_durable_store.json`)
so immutable result IDs survive backend restarts and can be handed off directly to the Case File.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Dict, Optional

from schemas import ExtractionRequest, PreviewResponse

STORE_PATH = Path(__file__).resolve().parent.parent / "data" / "iris_durable_store.json"


def compute_preview_sha256(preview: PreviewResponse) -> str:
    payload = {
        "product_id": preview.product.product_id,
        "variable_id": preview.extraction_config.variable_id,
        "source_api": preview.product.source_api,
        "start_date": preview.extraction_config.start_date,
        "end_date": preview.extraction_config.end_date,
        "rows": [(r.timestamp, r.value, r.qa_flag) for r in preview.chart_series],
    }
    raw_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw_bytes).hexdigest()


def normalize_request_cache_key(req: ExtractionRequest) -> str:
    norm = {
        "source_api": req.source_api,
        "product_id": req.product_id,
        "variable_id": req.variable_id,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "target_frequency": req.target_frequency,
        "temporal_aggregation": req.temporal_aggregation,
        "spatial_level": req.spatial_level,
        "spatial_Submode": req.spatial_Submode,
        "bbox": [round(float(x), 3) for x in (req.bbox or [])],
        "point_lat": round(float(req.point_lat or 0.0), 3),
        "point_lon": round(float(req.point_lon or 0.0), 3),
    }
    digest = hashlib.sha256(json.dumps(norm, sort_keys=True).encode("utf-8")).hexdigest()[:16]
    return f"res-{digest}"


def _load_disk_store() -> Dict[str, dict]:
    if not STORE_PATH.exists():
        return {"jobs": {}, "cache_index": {}}
    try:
        return json.loads(STORE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"jobs": {}, "cache_index": {}}


def _save_disk_store(data: Dict[str, dict]) -> None:
    try:
        STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        # Keep most recent 40 jobs to bound disk file size
        jobs = data.get("jobs", {})
        if len(jobs) > 40:
            sorted_keys = sorted(jobs.keys(), key=lambda k: jobs[k].get("created_at", 0.0))
            for k in sorted_keys[:-40]:
                jobs.pop(k, None)
        STORE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception:
        pass


def persist_extraction_job(
    job_id: str,
    created_at: float,
    req: ExtractionRequest,
    preview: PreviewResponse,
) -> PreviewResponse:
    sha = compute_preview_sha256(preview)
    result_id = normalize_request_cache_key(req)
    enriched = preview.model_copy(
        update={
            "result_id": result_id,
            "sha256_hash": sha,
        }
    )
    store = _load_disk_store()
    store.setdefault("jobs", {})[job_id] = {
        "created_at": created_at,
        "result_id": result_id,
        "req": req.model_dump(),
        "preview": enriched.model_dump(),
    }
    store.setdefault("cache_index", {})[result_id] = job_id
    _save_disk_store(store)
    return enriched


def load_persisted_job(job_id_or_result_id: str) -> Optional[Dict[str, object]]:
    store = _load_disk_store()
    jobs = store.get("jobs", {})
    if job_id_or_result_id in jobs:
        rec = jobs[job_id_or_result_id]
        return {
            "created_at": rec.get("created_at", 0.0),
            "req": ExtractionRequest.model_validate(rec["req"]),
            "preview": PreviewResponse.model_validate(rec["preview"]),
        }
    mapped_job_id = store.get("cache_index", {}).get(job_id_or_result_id)
    if mapped_job_id and mapped_job_id in jobs:
        rec = jobs[mapped_job_id]
        return {
            "created_at": rec.get("created_at", 0.0),
            "req": ExtractionRequest.model_validate(rec["req"]),
            "preview": PreviewResponse.model_validate(rec["preview"]),
        }
    return None
