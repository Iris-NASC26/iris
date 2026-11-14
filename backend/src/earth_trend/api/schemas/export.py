"""Deterministically export all public contracts, without adding operational routes."""

import json

from pydantic import BaseModel
from pydantic.json_schema import models_json_schema

from earth_trend.api.app import create_app

from . import (
    AnalysisRequest,
    AnalysisResult,
    Capabilities,
    ComparisonRequest,
    ComparisonResult,
    DatasetBinding,
    Error,
    Estimate,
    FdrResult,
    Job,
    JobAccepted,
    LayerManifest,
    MonthlyWindow,
    OutlookRequest,
    OutlookResult,
    Provenance,
    RegionSpec,
    ScanRequest,
    ScanResult,
    Series,
    TestResult,
    Transform,
)
from .geocoding import GeocodeResult
from .source_series import FieldResult, PointSeriesResult, RegionalSeriesResult

PUBLIC_MODELS: tuple[type[BaseModel], ...] = (
    AnalysisRequest,
    AnalysisResult,
    Capabilities,
    ComparisonRequest,
    ComparisonResult,
    DatasetBinding,
    Error,
    Estimate,
    FdrResult,
    FieldResult,
    GeocodeResult,
    Job,
    JobAccepted,
    LayerManifest,
    MonthlyWindow,
    OutlookRequest,
    OutlookResult,
    PointSeriesResult,
    Provenance,
    RegionalSeriesResult,
    RegionSpec,
    ScanRequest,
    ScanResult,
    Series,
    TestResult,
    Transform,
)


def build_document() -> dict[str, object]:
    """Health is the only implemented route; components include planned wire types."""
    _, bundle = models_json_schema(
        [(model, "validation") for model in PUBLIC_MODELS],
        ref_template="#/components/schemas/{model}",
    )
    document: dict[str, object] = create_app().openapi()
    components = document.setdefault("components", {})
    assert isinstance(components, dict)
    schemas = components.setdefault("schemas", {})
    assert isinstance(schemas, dict)
    schemas.update(bundle["$defs"])
    document["info"] = {
        "title": "Earth Trend Detective contracts",
        "version": "1.0",
        "description": (
            "F03 contract definitions. Components do not imply implemented endpoints "
            "or validated methods."
        ),
    }
    document["x-contract-models"] = sorted(model.__name__ for model in PUBLIC_MODELS)
    return document


def render_document() -> str:
    return (
        json.dumps(build_document(), indent=2, sort_keys=True, ensure_ascii=False, allow_nan=False)
        + "\n"
    )


if __name__ == "__main__":
    print(render_document(), end="")
