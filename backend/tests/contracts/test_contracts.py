"""Wire-contract verification, deliberately distinct from scientific validation."""

import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import BaseModel, ValidationError

from earth_trend.api.app import create_app
from earth_trend.api.schemas import (
    AnalysisRequest,
    AnalysisResult,
    Estimate,
    MonthlyWindow,
    RegionSpec,
    Series,
)
from earth_trend.api.schemas.export import PUBLIC_MODELS, build_document, render_document

FIXTURES = Path(__file__).with_name("fixtures")
MODELS = {model.__name__: model for model in PUBLIC_MODELS}
VALID = sorted((FIXTURES / "valid").glob("*.json"))
INVALID = json.loads((FIXTURES / "invalid.json").read_text(encoding="utf-8"))["cases"]


def fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURES / "valid" / f"{name}.json").read_text(encoding="utf-8"))  # type: ignore[no-any-return]


def validate(model: type[BaseModel], payload: object) -> BaseModel:
    return model.model_validate_json(json.dumps(payload, ensure_ascii=False))


@pytest.mark.parametrize("path", VALID, ids=lambda path: path.stem)
def test_valid_fixtures_round_trip(path: Path) -> None:
    example = json.loads(path.read_text(encoding="utf-8"))
    assert example["fixture_kind"] == "synthetic_contract"
    assert "no NASA observations" in example["disclosure"]
    model = MODELS[example["model"]]
    parsed = validate(model, example["payload"])
    dumped = parsed.model_dump_json()
    assert model.model_validate_json(dumped) == parsed
    assert json.loads(dumped) == parsed.model_dump(mode="json")


def test_every_public_contract_has_a_fixture() -> None:
    covered = {json.loads(path.read_text(encoding="utf-8"))["model"] for path in VALID}
    assert set(MODELS) <= covered


@pytest.mark.parametrize("specimen", INVALID, ids=lambda specimen: specimen["id"])
def test_invalid_specimens_fail_as_declared(specimen: dict[str, Any]) -> None:
    example = fixture(specimen["base"])
    payload = example["payload"]
    parent = payload
    for key in specimen["path"][:-1]:
        parent = parent[key]
    parent[specimen["path"][-1]] = specimen["value"]
    with pytest.raises(ValidationError) as failure:
        validate(MODELS[example["model"]], payload)
    assert any(
        error["type"] == specimen["error_type"] and specimen["message"] in error["msg"]
        for error in failure.value.errors()
    )


@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf")])
@pytest.mark.parametrize(
    "name,path",
    [
        ("available-estimate", ["value"]),
        ("available-test", ["p"]),
        ("series-with-missing-month", ["value", 0]),
        ("analysis-request", ["alpha"]),
        ("region-bbox", ["bbox", 0]),
        ("completed-outlook", ["projection", "quantiles", 0, "median"]),
    ],
)
def test_nonfinite_values_rejected_in_python_and_json(
    name: str, path: list[str | int], value: float
) -> None:
    example = fixture(name)
    payload = example["payload"]
    parent = payload
    for key in path[:-1]:
        parent = parent[key]
    parent[path[-1]] = value
    with pytest.raises(ValidationError):
        MODELS[example["model"]].model_validate(payload)
    with pytest.raises(ValidationError):
        validate(MODELS[example["model"]], payload)


@pytest.mark.parametrize(
    "alpha,valid", [(0.0099, False), (0.01, True), (0.05, True), (0.10, True), (0.1001, False)]
)
def test_alpha_design_boundaries(alpha: float, valid: bool) -> None:
    payload = fixture("analysis-request")["payload"]
    payload["alpha"] = alpha
    if valid:
        validate(AnalysisRequest, payload)
    else:
        with pytest.raises(ValidationError):
            validate(AnalysisRequest, payload)


@pytest.mark.parametrize(
    "start,end,valid",
    [
        ("2000-01", "2049-12", True),
        ("2000-01", "2050-01", False),
        ("2000-02", "2000-02", True),
        ("0000-01", "0001-01", False),
        ("2000-1", "2000-02", False),
        ("2000-01-01", "2000-02", False),
    ],
)
def test_monthly_window_limits(start: str, end: str, valid: bool) -> None:
    payload = {"start": start, "end": end}
    if valid:
        validate(MonthlyWindow, payload)
    else:
        with pytest.raises(ValidationError):
            validate(MonthlyWindow, payload)


@pytest.mark.parametrize(
    "field,value",
    [
        ("value", [1.0, None]),
        ("coverage", [1.0, 1.1, 0.8]),
        ("valid", [False, False, True]),
        ("reason", [None, None, None]),
        ("time", ["2003-01", "2003-03", "2003-04"]),
        ("time", ["2003-03", "2003-02", "2003-01"]),
        ("value", [1.0, 0.0, 0.0]),
        ("units", "K"),
    ],
)
def test_series_consistency(field: str, value: object) -> None:
    payload = fixture("series-with-missing-month")["payload"]
    payload[field] = value
    with pytest.raises(ValidationError):
        validate(Series, payload)


def test_missing_is_distinct_from_true_zero() -> None:
    parsed = Series.model_validate_json(json.dumps(fixture("series-with-missing-month")["payload"]))
    assert parsed.value[1] is None and parsed.reason[1] == "missing_observation"
    assert parsed.value[2] == 0 and parsed.valid[2]


@pytest.mark.parametrize(
    "field,value",
    [
        ("ci_high", None),
        ("ci_method_version", None),
        ("confidence_level", 1.0),
        ("ci_reason", "insufficient_record"),
        ("status", "unavailable"),
    ],
)
def test_confidence_and_availability_invariants(field: str, value: object) -> None:
    payload = fixture("available-estimate")["payload"]
    payload[field] = value
    with pytest.raises(ValidationError):
        validate(Estimate, payload)


@pytest.mark.parametrize(
    "mutation",
    [
        "branch",
        "confidence",
        "release",
        "family_kind",
        "member_p",
        "family_window",
        "synthetic_science",
        "grade",
    ],
)
def test_analysis_identities(mutation: str) -> None:
    payload = fixture("analysis-in-scan-context")["payload"]
    match mutation:
        case "branch":
            payload["branches"][0]["estimates"][0]["branch_id"] = "reference_raw_monthly"
        case "confidence":
            payload["branches"][0]["estimates"][0]["confidence_level"] = 0.90
        case "release":
            payload["data_release_id"] = "different-release"
        case "family_kind":
            payload["fdr"]["family_kind"] = "seasonal_fingerprint"
        case "member_p":
            payload["fdr"]["membership"]["members"][0]["p"] = 0.5
        case "family_window":
            payload["fdr"]["context"]["window"]["start"] = "2004-01"
        case "synthetic_science":
            payload["evidence_kind"] = "scientific"
        case "grade":
            payload.update(analysis_status="unavailable", reason="method_validation_required")
    with pytest.raises(ValidationError):
        validate(AnalysisResult, payload)


def test_geometry_bounds_do_not_claim_topology_validation() -> None:
    # A closed bow-tie is structurally valid here; D14 must reject its self-intersection.
    value = {
        "kind": "polygon",
        "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]]},
        "dateline": "not_crossing",
        "interior": "bounded",
    }
    validate(RegionSpec, value)


def test_export_is_deterministic_and_adds_only_the_retrieval_endpoints() -> None:
    assert render_document() == render_document()
    document = build_document()
    assert document["paths"] == create_app().openapi()["paths"]
    paths = document["paths"]
    assert isinstance(paths, dict)
    assert set(paths) == {
        "/api/v1/health",
        "/api/v1/series/{variable_id}",
        "/api/v1/field/{variable_id}",
        "/api/v1/regional-series/{variable_id}",
        "/api/v1/geocode",
    }
    components = document["components"]
    assert isinstance(components, dict)
    assert len(components["schemas"]) > len(PUBLIC_MODELS)


def test_no_fixture_is_added_to_application_assets() -> None:
    web = Path(__file__).resolve().parents[3] / "web" / "src"
    assert not list(web.rglob("*fixture*.json"))


@pytest.mark.parametrize(
    "name,path,value",
    [
        ("available-test", ["p"], -0.01),
        ("fdr-family", ["membership", "members", 0, "q"], 1.01),
        ("fdr-family", ["membership", "members", 0, "actual_window", "start"], "2004-01"),
        ("fdr-family", ["membership", "exclusions", 0, "member_id"], "V01"),
        ("scan-with-excluded-variable", ["rows", 0, "actual_window", "start"], "2004-01"),
        ("scan-with-excluded-variable", ["fdr", "membership", "exclusions"], []),
        ("scan-with-excluded-variable", ["evidence_kind"], "scientific"),
        (
            "scan-with-excluded-variable",
            ["fdr", "membership", "members", 0, "branch_id"],
            "annual_layer",
        ),
        ("comparison-result", ["right", "binding_id"], "a-different-product"),
        ("comparison-result", ["right", "slope", "units"], "mm/decade"),
        ("comparison-result", ["common_support"], ["2003-03", "2003-01"]),
        ("comparison-result", ["bootstrap", "validation_report_id"], None),
        ("completed-outlook", ["projection", "quantiles", 0, "lower95"], 99.0),
        ("completed-outlook", ["projection", "quantiles", 0, "time"], "2023-12"),
        ("completed-outlook", ["record_length_years"], 1.0),
        ("completed-outlook", ["forecast", "horizon_months"], 24),
        ("completed-outlook", ["forecast", "skill", "decision"], "unavailable"),
        ("layer-manifest", ["q", "count"], 64801),
        ("layer-manifest", ["p", "byte_order"], "big"),
        ("layer-manifest", ["q", "scale"], 0.1),
        ("layer-manifest", ["q", "branch_id"], "monthly_anomaly"),
        ("layer-manifest", ["slope", "artifact", "path"], "/artifacts/../secret"),
        ("layer-manifest", ["fdr", "context", "data_release_id"], "different-release"),
        ("dataset-binding", ["unit_evidence"], "header_verified"),
        ("local-unready-capabilities", ["analysis_ready"], True),
        ("waiting-provider-job", ["progress"], 0.5),
        ("succeeded-job", ["updated_at"], "2026-11-13T00:00:00Z"),
        ("job-accepted", ["created_at"], "2026-11-14T00:00:00+05:30"),
        ("analysis-with-seasonal-family", ["seasonality", "months", 1, "month"], 1),
        ("analysis-with-seasonal-family", ["seasonality", "fdr", "family_id"], "not-a-sha256"),
        (
            "analysis-with-seasonal-family",
            ["seasonality", "fdr", "context", "window", "start"],
            "2004-01",
        ),
    ],
)
def test_response_cross_field_invariants(name: str, path: list[str | int], value: object) -> None:
    example = fixture(name)
    parent = example["payload"]
    for key in path[:-1]:
        parent = parent[key]
    parent[path[-1]] = value
    with pytest.raises(ValidationError):
        validate(MODELS[example["model"]], example["payload"])


def test_chlorophyll_layer_discloses_distinct_estimands() -> None:
    from earth_trend.api.schemas import LayerManifest

    payload = fixture("layer-manifest")["payload"]
    payload["variable_id"] = "V11"
    payload["slope"].update(units="mg/m³/decade", value_transform="anomaly")
    for key in ("p", "q", "standardized_slope"):
        payload[key]["value_transform"] = "log10_anomaly"
    validate(LayerManifest, payload)
    payload["slope"]["value_transform"] = "log10_anomaly"
    with pytest.raises(ValidationError, match="chlorophyll"):
        validate(LayerManifest, payload)


def test_ring_and_request_size_limits() -> None:
    payload = fixture("region-polygon")["payload"]
    ring = payload["geometry"]["coordinates"][0]
    payload["geometry"]["coordinates"] = [ring] * 51
    with pytest.raises(ValidationError):
        validate(RegionSpec, payload)
    payload["geometry"]["coordinates"] = [[ring[0], ring[1], ring[2]] * 667 + [ring[0]]]
    with pytest.raises(ValidationError):
        validate(RegionSpec, payload)
