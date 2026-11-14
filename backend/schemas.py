"""
Pydantic v2 Schemas for Project Iris Data Retrieval Pipeline
Covers Discovery, Catalog Metadata, Time-Series Extraction, Job Polling, and Data Preview.
"""

from __future__ import annotations

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class DiscoverRequest(BaseModel):
    prompt: str = Field(..., min_length=2, description="Natural language subject domain or research query")
    preferred_providers: Optional[List[str]] = Field(
        default=None,
        description="Optional filter of upstream catalog APIs (e.g., ['NASA POWER', 'NASA AppEEARS', 'NASA CMR', 'NOAA CDO', 'EODAG / Copernicus', 'CSA / Geo.ca', 'OPeNDAP'])",
    )
    si_enabled: bool = Field(
        default=True,
        description="When False, bypasses LLM ranking and uses deterministic keyword matching only",
    )
    gemini_api_key: Optional[str] = Field(default=None, description="Optional user-supplied Gemini API key")
    noaa_cdo_token: Optional[str] = Field(default=None, description="Optional user-supplied NOAA CDO token")
    earthdata_token: Optional[str] = Field(default=None, description="Optional user-supplied NASA Earthdata token")


class ExtractedIntent(BaseModel):
    subject_domain: str = Field(..., description="Primary scientific subject domain (e.g., Terrestrial Hydrology & Drought)")
    scientific_category: str = Field(..., description="High-level Earth system sphere (Atmosphere, Water, Land, Biosphere, Cryosphere, Oceans)")
    keywords: List[str] = Field(..., description="Identified GCMD / CF standardized search keywords")
    target_variables: List[str] = Field(..., description="Specific physical variables to retrieve")
    inferred_region_name: str = Field(default="Global / Custom Region", description="Detected geographic place name")
    inferred_spatial_level: Literal["global", "regional"] = Field(default="regional")
    inferred_bbox: List[float] = Field(
        default=[-122.6, 35.0, -118.5, 40.8],
        description="[min_lon, min_lat, max_lon, max_lat] in WGS84",
    )
    inferred_Center: List[float] = Field(
        default=[37.9, -120.55],
        description="[lat, lon] centroid",
    )
    inferred_start_date: str = Field(default="2005-01-01", description="ISO YYYY-MM-DD start date")
    inferred_end_date: str = Field(default="2025-12-31", description="ISO YYYY-MM-DD end date")
    inferred_frequency: Literal["Daily", "8-Day", "16-Day", "Monthly", "Seasonal", "Yearly"] = Field(default="Monthly")
    target_apis: List[str] = Field(..., description="Upstream catalog APIs selected for querying")
    interpretation_summary: str = Field(..., description="Plain-English explanation of how the prompt was interpreted")
    llm_model_used: str = Field(default="gemini-3.5-flash-lite")


class VariableLayer(BaseModel):
    variable_id: str
    variable_name: str
    unit: str
    description: str
    native_frequency: str
    supported_frequencies: List[str] = Field(
        default_factory=lambda: ["Daily", "8-Day", "16-Day", "Monthly", "Seasonal", "Yearly"]
    )
    recommended_aggregation: Literal["mean", "sum", "min", "max"] = "mean"
    min_valid: Optional[float] = None
    max_valid: Optional[float] = None


class DataProduct(BaseModel):
    product_id: str
    variable_id: str
    variable_name: str
    title: str
    category: str
    # Provenance: Where the data is from
    source_api: str = Field(..., description="Catalog/Extraction API adapter identifier (e.g., NASA POWER, NASA AppEEARS, NASA CMR, NOAA CDO, EODAG / Copernicus, CSA / Geo.ca, OPeNDAP)")
    provider_agency: str = Field(..., description="Originating agency & archive (e.g., NASA Langley Research Center / MERRA-2)")
    mission_or_instrument: str = Field(..., description="Satellite mission, sensor, or reanalysis model (e.g., Terra & Aqua MODIS / GMAO MERRA-2)")
    source_url: str = Field(..., description="Official documentation or landing page URL")
    citation_doi: str = Field(default="https://earthdata.nasa.gov/", description="DOI or official citation URL")
    # Definition: What exactly it is
    description: str = Field(..., description="Detailed plain-English explanation of what this dataset is")
    what_it_measures: str = Field(..., description="Physical phenomenon and methodology behind the measurement")
    unit: str
    native_frequency: str
    supported_frequencies: List[str]
    temporal_start: str = Field(..., description="Earliest available date YYYY-MM-DD")
    temporal_end: str = Field(..., description="Latest available date YYYY-MM-DD or Present")
    spatial_resolution: str = Field(..., description="Grid cell size (e.g., 0.5° × 0.625°, 250m, 0.05°)")
    spatial_resolution_km: float = Field(default=50.0, description="Approximate resolution in km for guardrail checks")
    spatial_coverage: Literal["Global", "Regional"] = "Global"
    spatial_bbox: List[float] = Field(default=[-180.0, -90.0, 180.0, 90.0], description="[min_lon, min_lat, max_lon, max_lat]")
    gcmd_keywords: List[str] = Field(default_factory=list)
    ai_match_reason: str = Field(..., description="One-sentence explanation of why this dataset fits the user's subject domain")
    relevance_score: float = Field(..., ge=0.0, le=100.0)
    is_async: bool = Field(default=False, description="True if upstream extraction uses async job polling")
    available_layers: List[VariableLayer] = Field(default_factory=list)
    capability_state: Literal[
        "planned",
        "catalog_verified",
        "extract_verified",
        "credential_required",
        "unsupported",
        "deprecated",
    ] = Field(
        default="extract_verified",
        description="SRS v1.0 capability readiness state for this product/provider",
    )
    supported_spatial_modes: List[str] = Field(
        default_factory=lambda: ["point", "bbox"],
        description="Supported spatial extraction modes for this product",
    )
    requires_credentials: bool = Field(
        default=False,
        description="True if extraction requires authenticated upstream credentials",
    )
    catalog_freshness_utc: Optional[str] = Field(
        default=None,
        description="ISO-8601 UTC timestamp when catalog metadata was verified",
    )


class DiscoveryResponse(BaseModel):
    query: str
    intent: ExtractedIntent
    products: List[DataProduct]
    queried_sources: List[str]
    provider_status: Dict[str, str] = Field(default_factory=dict, description="Live status per queried API platform")
    cache_hit: bool = False
    total_candidates_evaluated: int = 0


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    stage: Optional[Literal["topic_discovery", "keyword_confirmation", "parameter_definition", "ready_to_extract"]] = None
    intent: Optional[ExtractedIntent] = None
    products: Optional[List[DataProduct]] = None
    selected_product: Optional[DataProduct] = None
    proposed_config: Optional[ExtractionRequest] = None
    provider_status: Optional[Dict[str, str]] = None


class ChatTurnRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's natural language chat message")
    conversation_stage: Literal["topic_discovery", "keyword_confirmation", "parameter_definition", "ready_to_extract"] = "topic_discovery"
    confirmed_keywords: Optional[List[str]] = Field(
        default=None,
        description="User-confirmed keywords that gate firing live catalog API queries across the 10 databases",
    )
    cached_intent: Optional[ExtractedIntent] = Field(
        default=None,
        description="Previously extracted intent from Stage 1 when confirming keywords in Stage 2",
    )
    selected_product_id: Optional[str] = None
    selected_variable_id: Optional[str] = None
    selected_source_api: Optional[str] = None
    current_config: Optional[ExtractionRequest] = None
    preferred_providers: Optional[List[str]] = None
    history: List[Dict[str, str]] = Field(default_factory=list)


class ChatTurnResponse(BaseModel):
    assistant_reply: str
    next_stage: Literal["topic_discovery", "keyword_confirmation", "parameter_definition", "ready_to_extract"]
    llm_model_used: str
    llm_live_status: str
    intent: Optional[ExtractedIntent] = None
    products: List[DataProduct] = Field(default_factory=list)
    selected_product: Optional[DataProduct] = None
    proposed_config: Optional[ExtractionRequest] = None
    provider_status: Dict[str, str] = Field(default_factory=dict)
    trigger_extraction: bool = False


class ProductDetailsResponse(BaseModel):
    product: DataProduct
    recommended_date_start: str
    recommended_date_end: str
    global_eligible: bool
    high_res_global_warning: Optional[str] = None
    estimated_fetch_seconds: int = 2
    estimated_volume_mb: float = 0.8


class ExtractionRequest(BaseModel):
    product_id: str
    variable_id: str
    variable_name: Optional[str] = None
    source_api: str
    unit: Optional[str] = None
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")
    target_frequency: Literal["Daily", "8-Day", "16-Day", "Monthly", "Seasonal", "Yearly"] = "Monthly"
    temporal_aggregation: Literal["mean", "sum", "min", "max"] = "mean"
    spatial_level: Literal["global", "regional"] = "regional"
    spatial_Submode: Literal["bbox", "point", "preset"] = "bbox"
    region_name: str = "California Central Valley"
    bbox: List[float] = Field(
        default=[-122.6, 35.0, -118.5, 40.8],
        description="[min_lon, min_lat, max_lon, max_lat]",
    )
    point_lat: Optional[float] = 36.77
    point_lon: Optional[float] = -119.41
    spatial_reduction: Literal["mean", "median", "grid"] = "mean"
    additional_products: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="Optional secondary products for multi-variable comparison",
    )


class JobStep(BaseModel):
    step: int
    label: str
    status: Literal["pending", "active", "completed", "failed"]


class JobStatusResponse(BaseModel):
    job_id: str
    status: Literal["queued", "fetching_upstream", "resampling", "completed", "failed"]
    progress_percent: int = Field(..., ge=0, le=100)
    status_message: str
    source_api: str
    product_id: str
    variable_id: str
    steps: List[JobStep]


class ObservationRow(BaseModel):
    timestamp: str = Field(..., description="ISO-8601 date or timestamp in UTC")
    value: Optional[float] = Field(default=None, description="Observed/resampled value, null if missing")
    secondary_value: Optional[float] = Field(default=None, description="Optional comparison variable value")
    rolling_avg: Optional[float] = Field(default=None, description="Rolling average trend value")
    anomaly_z: Optional[float] = Field(default=None, description="Standardized anomaly Z-score")
    unit: str
    variable_id: str
    qa_flag: Literal["Valid", "Flagged", "Interpolated", "Missing"] = "Valid"


class SummaryStats(BaseModel):
    count: int
    valid_count: int
    flagged_count: int
    missing_count: int
    completeness_pct: float
    missing_pct: float
    missing_warning: bool
    mean: float
    median: float
    std_dev: float
    min_val: float
    min_date: str
    max_val: float
    max_date: str
    decadal_slope: float
    unit: str


class PreviewResponse(BaseModel):
    job_id: str
    result_id: Optional[str] = None
    status: Literal["completed", "running", "failed"] = "completed"
    product: DataProduct
    extraction_config: ExtractionRequest
    summary_stats: SummaryStats
    chart_series: List[ObservationRow]
    raw_rows: List[ObservationRow]
    total_rows: int
    page: int = 1
    page_size: int = 100
    upstream_live_fetched: bool = True
    provenance_mode: Literal["live_upstream", "cached_real", "pinned_snapshot"] = "live_upstream"
    sha256_hash: Optional[str] = None
    spatial_semantics_applied: str = "point_exact"
    qa_summary_note: str = (
        "Retrieval QA flags reflect upstream fill-value and physical range checks. "
        "Scientific anomaly detection (|Z| >= 2.0 on deseasonalized residuals) is performed in the Case File."
    )
    secondary_jobs: List[Dict[str, str]] = Field(default_factory=list)
    api_endpoint_called: str
    retrieved_at: str


# ============================================================================
# SRS v1.0 CAPABILITY MATRIX, GLOBAL TREND CUBE, CASE BOARD & CASE FILE SCHEMAS
# ============================================================================


class ProviderCapabilityRecord(BaseModel):
    provider_id: str
    provider_name: str
    agency: str
    catalog_state: Literal["planned", "catalog_verified", "extract_verified", "credential_required", "unsupported", "deprecated"]
    extraction_state: Literal["planned", "catalog_verified", "extract_verified", "credential_required", "unsupported", "deprecated"]
    supported_geometries: List[str]
    native_cadences: List[str]
    requires_auth: bool
    auth_mechanism: str
    sync_or_async: Literal["sync", "async", "catalog_only"]
    quota_guardrail: str
    qa_semantics: str
    citation_url: str
    last_verified_utc: str
    notes: str


class CubeLayerManifest(BaseModel):
    layer_id: str
    variable_id: str
    variable_name: str
    category: str
    unit: str
    source_product: str
    provider_agency: str
    citation_doi: str
    native_resolution: str
    cube_grid_resolution: str = "1.0° × 1.0° (from 0.5° analysis grid)"
    temporal_window: str
    valid_month_rule: str = ">= 10 valid months per year (83.3% coverage)"
    status: Literal["verified_release", "snapshot_pinned", "catalog_pending"]
    sha256_hash: str
    caveats: List[str]


class CubeCellRecord(BaseModel):
    cell_id: str
    lat: float
    lon: float
    region_label: str
    is_land: bool
    decadal_slope: float
    ci_low: float
    ci_high: float
    mk_p_value: float
    fdr_q_value: float
    significant_fdr: bool
    evidence_grade: Literal["A", "B", "C", "D"]
    valid_coverage_pct: float
    sparkline: List[float]
    opposite_dipole_region: Optional[str] = None


class GlobeCubeResponse(BaseModel):
    cube_version: str
    manifest_sha256: str
    snapshot_timestamp_utc: str
    provenance_mode: Literal["verified_cube_snapshot", "live_cached_cube"]
    active_layer: CubeLayerManifest
    available_layers: List[CubeLayerManifest]
    analysis_window: str
    method_summary: str
    fdr_alpha: float = 0.05
    total_cells: int
    significant_cells_count: int
    significant_area_pct: float
    cells: List[CubeCellRecord]
    time_lapse_decades: List[Dict[str, object]]


class RegionalVariableScanRow(BaseModel):
    layer_id: str
    variable_id: str
    variable_name: str
    category: str
    unit: str
    source_product: str
    citation_doi: str
    analyzable: bool
    unavailable_reason: Optional[str] = None
    decadal_slope: Optional[float] = None
    ci_low: Optional[float] = None
    ci_high: Optional[float] = None
    mk_p_value: Optional[float] = None
    fdr_q_value: Optional[float] = None
    significant_fdr: bool = False
    evidence_grade: Optional[Literal["A", "B", "C", "D"]] = None
    grade_reason: str
    valid_coverage_pct: float
    caveats: List[str]
    sparkline: List[float] = Field(default_factory=list)


class TwoRegionComparisonResult(BaseModel):
    variable_id: str
    variable_name: str
    unit: str
    window: str
    region_a_name: str
    region_a_bbox: List[float]
    region_a_slope: float
    region_a_ci: List[float]
    region_a_p: float
    region_a_grade: Literal["A", "B", "C", "D"]
    region_a_series: List[float]
    region_b_name: str
    region_b_bbox: List[float]
    region_b_slope: float
    region_b_ci: List[float]
    region_b_p: float
    region_b_grade: Literal["A", "B", "C", "D"]
    region_b_series: List[float]
    slope_difference: float
    difference_ci: List[float]
    concordance_label: str
    non_causal_disclosure: str


class CaseBoardRequest(BaseModel):
    region_name: str = "California Central Valley, USA"
    bbox: List[float] = Field(default=[-122.6, 35.0, -118.5, 40.8])
    start_year: int = 2001
    end_year: int = 2024
    compare_region_name: Optional[str] = None
    compare_bbox: Optional[List[float]] = None
    compare_variable_id: str = "T2M"


class CaseBoardResponse(BaseModel):
    cube_version: str
    region_name: str
    bbox: List[float]
    start_year: int
    end_year: int
    area_km2: float
    grid_cells_count: int
    land_fraction_pct: float
    ocean_fraction_pct: float
    mean_coverage_pct: float
    fdr_alpha: float = 0.05
    scanned_variables: List[RegionalVariableScanRow]
    unavailable_variables: List[RegionalVariableScanRow]
    two_region_comparison: Optional[TwoRegionComparisonResult] = None


class MonthlyFingerprintItem(BaseModel):
    month_index: int
    month_name: str
    climatology_mean: Optional[float] = None
    decadal_slope: Optional[float] = None
    mk_p_value: Optional[float] = None
    significant: Optional[bool] = None
    contribution_pct: Optional[float] = None


class TrendTriangleCell(BaseModel):
    start_year: int
    end_year: int
    span_years: int
    decadal_slope: float
    mk_p_value: float
    significant: bool


class CaveatEvent(BaseModel):
    date_or_period: str
    category: Literal["Sensor Transition", "Reanalysis Boundary", "QA Coverage Gap", "Algorithm Version"]
    severity: Literal["info", "caution", "warning"]
    title: str
    description: str


class OutlookProjectionPoint(BaseModel):
    year: int
    central_value: float
    ci_low: float
    ci_high: float


class OutlookSectionData(BaseModel):
    not_a_prediction_label: str = (
        "Not a prediction — Conditional trend-continuation projection assuming the historical Sen's slope rate persists."
    )
    horizon_year: int
    continuation_points: List[OutlookProjectionPoint]
    skill_gate_passed: bool
    backtest_rmse: Optional[float] = None
    climatology_baseline_rmse: Optional[float] = None
    skill_score_pss: Optional[float] = None
    skill_gate_reason: str
    short_term_forecast_points: List[OutlookProjectionPoint]
    cmip6_Reference_note: str


class CaseFileObservation(BaseModel):
    timestamp: str
    value: Optional[float] = None
    seasonal_component: Optional[float] = None
    deseasonalized_value: Optional[float] = None
    anomaly_z: Optional[float] = None
    ols_trend: Optional[float] = None
    sen_trend: Optional[float] = None
    qa_flag: str


class CaseFileAnalysisRequest(BaseModel):
    job_id: Optional[str] = None
    case_id: Optional[str] = "IR–042"
    dataset_id: str = "temperature"
    dataset_name: str = "Near-surface air temperature"
    parameter_code: str = "T2M"
    unit: str = "°C"
    location: str = "Los Angeles County, CA"
    latitude: float = 34.05
    longitude: float = -118.24
    start_year: int = 2005
    end_year: int = 2025
    alpha: float = 0.05
    seasonal_adjustment: Literal[
        "auto", "calendar_climatology", "stl", "none"
    ] = "auto"
    analysis_methods: List[
        Literal[
            "ols",
            "hamed_rao_mk",
            "seasonal_kendall",
            "sen_slope",
            "pettitt",
            "anomalies",
            "seasonal_fingerprint",
            "case_file_diagnostics",
        ]
    ] = Field(
        default_factory=lambda: [
            "ols",
            "hamed_rao_mk",
            "seasonal_kendall",
            "sen_slope",
            "pettitt",
            "anomalies",
            "seasonal_fingerprint",
            "case_file_diagnostics",
        ]
    )


class CaseFileAnalysisResponse(BaseModel):
    result_id: str
    source_job_id: Optional[str] = None
    provenance_mode: Literal["live_extracted_result", "pinned_real_snapshot", "live_nasa_power"]
    sha256_hash: str
    method_version: str = "SRS-v1.0-monthly-climatology-HR-MK-Sen"
    dataset_name: str
    parameter_code: str
    unit: str
    location: str
    start_year: int
    end_year: int
    completeness_pct: float
    valid_months_count: int
    seasonal_adjustment_method: str
    requested_seasonal_adjustment: str = "auto"
    requested_analysis_methods: List[str] = Field(default_factory=list)
    # Core statistical outputs
    hamed_rao_mk_z: float
    hamed_rao_mk_p: float
    fdr_q_value: float
    effective_sample_size_n_eff: float
    lag1_autocorrelation: float
    kendall_tau: float
    sens_slope_decadal: float
    sens_ci_low: float
    sens_ci_high: float
    ols_slope_decadal: float
    ols_t_statistic: float
    ols_t_degrees_freedom: float
    ols_p_value: float
    ols_ci_low_decadal: float
    ols_ci_high_decadal: float
    seasonal_kendall_z: Optional[float] = None
    seasonal_kendall_p: Optional[float] = None
    change_point_timestamp: Optional[str] = None
    change_point_statistic: Optional[float] = None
    change_point_p_value: Optional[float] = None
    analysis_series: List[CaseFileObservation]
    # Evidence Grade
    evidence_grade: Literal["A", "B", "C", "D"]
    evidence_grade_title: str
    evidence_grade_reasons: List[str]
    # Explanations (Zero LLM numbers — strictly templated from verified stats)
    explanations: Dict[Literal["explorer", "student", "scientist"], str]
    recommended_views: List[str]
    # Diagnostic Views
    annual_stripes: List[Dict[str, object]]
    monthly_fingerprint: List[MonthlyFingerprintItem]
    trend_triangle: List[TrendTriangleCell]
    caveats: List[CaveatEvent]
    outlook: OutlookSectionData
    citation_doi: str
    source_agency: str


# ============================================================================
# EXISTING RESEARCH LITERATURE & DATASET CITATION DISCOVERY (OPENALEX & DATACITE)
# ============================================================================


class ResearchDatasetContext(BaseModel):
    product_id: str
    variable_id: str
    variable_name: str
    title: Optional[str] = None
    category: Optional[str] = None
    source_api: str
    provider_agency: Optional[str] = None
    mission_or_instrument: Optional[str] = None
    citation_doi: Optional[str] = None
    gcmd_keywords: List[str] = Field(default_factory=list)
    region_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ResearchSearchRequest(BaseModel):
    mode: Literal["manual", "dataset"] = "manual"
    query: Optional[str] = None
    dataset_context: Optional[ResearchDatasetContext] = None
    sources: List[Literal["openalex", "datacite"]] = Field(
        default_factory=lambda: ["openalex", "datacite"]
    )
    sort: Literal["relevance", "citations", "year"] = "relevance"
    per_source_limit: int = Field(default=15, ge=1, le=50)


class ResearchWorkItem(BaseModel):
    id: str
    source_provider: Literal["OpenAlex", "DataCite"]
    title: str
    authors: str
    year: Optional[int] = None
    publication: str
    work_type: str
    topic: str
    abstract_snippet: str
    doi: Optional[str] = None
    doi_url: Optional[str] = None
    primary_url: str
    paper_url: Optional[str] = None
    abstract_url: Optional[str] = None
    dataset_url: Optional[str] = None
    record_url: str
    is_open_access: bool = False
    cited_by_count: int = 0
    match_context: Optional[str] = None


class ResearchSearchResponse(BaseModel):
    mode: Literal["manual", "dataset"]
    query_executed: str
    dataset_label: Optional[str] = None
    total_results: int
    openalex_count: int
    datacite_count: int
    open_access_count: int
    provider_status: Dict[str, str] = Field(default_factory=dict)
    results: List[ResearchWorkItem] = Field(default_factory=list)
    retrieved_at: str

