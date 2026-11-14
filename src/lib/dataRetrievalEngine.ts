/**
 * Project Iris — Frontend & Next.js Server Data Discovery, Conversational SI & Extraction Types
 * 100% Real Data Architecture — Zero Synthetic or Hardcoded Dummy Series.
 * Supported Live NASA APIs:
 * 1. NASA POWER (`https://power.larc.nasa.gov/api/...`)
 * 2. NASA CMR (`https://cmr.earthdata.nasa.gov/search/...`)
 * 3. NASA AppEEARS (`https://appeears.earthdatacloud.nasa.gov/api/...`)
 * 4. NASA GES DISC (`https://api.giovanni.earthdata.nasa.gov/timeseries`)
 * 5. NASA Harmony (`https://harmony.earthdata.nasa.gov/...`)
 */

export type TemporalFrequency = "Daily" | "8-Day" | "16-Day" | "Monthly" | "Seasonal" | "Yearly";
export type TemporalAggregation = "mean" | "sum" | "min" | "max";
export type SpatialLevel = "global" | "regional";
export type SpatialSubmode = "bbox" | "point" | "preset";
export type SpatialReduction = "mean" | "median" | "grid";

export interface VariableLayer {
  variable_id: string;
  variable_name: string;
  unit: string;
  description: string;
  native_frequency: TemporalFrequency | string;
  supported_frequencies: string[];
  recommended_aggregation: TemporalAggregation;
  min_valid?: number | null;
  max_valid?: number | null;
}

export interface DataProduct {
  product_id: string;
  variable_id: string;
  variable_name: string;
  title: string;
  category: string;
  // Provenance: Where the data is from
  source_api: string;
  provider_agency: string;
  mission_or_instrument: string;
  source_url: string;
  citation_doi: string;
  // Scientific definition: What exactly it is
  description: string;
  what_it_measures: string;
  unit: string;
  native_frequency: string;
  supported_frequencies: string[];
  temporal_start: string;
  temporal_end: string;
  spatial_resolution: string;
  spatial_resolution_km: number;
  spatial_coverage: "Global" | "Regional";
  spatial_bbox: [number, number, number, number];
  gcmd_keywords: string[];
  ai_match_reason: string;
  relevance_score: number;
  is_async: boolean;
  available_layers: VariableLayer[];
  capability_state?: "planned" | "catalog_verified" | "extract_verified" | "credential_required" | "unsupported" | "deprecated";
  supported_spatial_modes?: string[];
  requires_credentials?: boolean;
  catalog_freshness_utc?: string | null;
}

export interface ExtractedIntent {
  subject_domain: string;
  scientific_category: string;
  keywords: string[];
  target_variables: string[];
  inferred_region_name: string;
  inferred_spatial_level: SpatialLevel;
  inferred_bbox: [number, number, number, number];
  inferred_Center: [number, number];
  inferred_start_date: string;
  inferred_end_date: string;
  inferred_frequency: TemporalFrequency;
  target_apis: string[];
  interpretation_summary: string;
  llm_model_used: string;
}

export interface DiscoveryResponse {
  query: string;
  intent: ExtractedIntent;
  products: DataProduct[];
  queried_sources: string[];
  provider_status?: Record<string, string>;
  cache_hit: boolean;
  total_candidates_evaluated: number;
}

export interface ProductDetailsResponse {
  product: DataProduct;
  recommended_date_start: string;
  recommended_date_end: string;
  global_eligible: boolean;
  high_res_global_warning: string | null;
  estimated_fetch_seconds: number;
  estimated_volume_mb: number;
}

export interface ExtractionRequest {
  product_id: string;
  variable_id: string;
  variable_name?: string;
  source_api: string;
  unit?: string;
  start_date: string;
  end_date: string;
  target_frequency: TemporalFrequency;
  temporal_aggregation: TemporalAggregation;
  spatial_level: SpatialLevel;
  spatial_Submode: SpatialSubmode;
  region_name: string;
  bbox: [number, number, number, number];
  point_lat?: number;
  point_lon?: number;
  spatial_reduction: SpatialReduction;
  additional_products?: Array<{ product_id: string; variable_id: string }>;
}

export interface JobStep {
  step: number;
  label: string;
  status: "pending" | "active" | "completed" | "failed";
}

export interface JobStatusResponse {
  job_id: string;
  status: "queued" | "fetching_upstream" | "resampling" | "completed" | "failed";
  progress_percent: number;
  status_message: string;
  source_api: string;
  product_id: string;
  variable_id: string;
  steps: JobStep[];
}

export interface ObservationRow {
  timestamp: string;
  value: number | null;
  secondary_value?: number | null;
  rolling_avg: number | null;
  anomaly_z: number | null;
  unit: string;
  variable_id: string;
  qa_flag: "Valid" | "Flagged" | "Interpolated" | "Missing";
}

export interface SummaryStats {
  count: number;
  valid_count: number;
  flagged_count: number;
  missing_count: number;
  completeness_pct: number;
  missing_pct: number;
  missing_warning: boolean;
  mean: number;
  median: number;
  std_dev: number;
  min_val: number;
  min_date: string;
  max_val: number;
  max_date: string;
  decadal_slope: number;
  unit: string;
}

export interface PreviewResponse {
  job_id: string;
  result_id?: string | null;
  status: "completed" | "running" | "failed";
  product: DataProduct;
  extraction_config: ExtractionRequest;
  summary_stats: SummaryStats;
  chart_series: ObservationRow[];
  raw_rows: ObservationRow[];
  total_rows: number;
  page: number;
  page_size: number;
  upstream_live_fetched: boolean;
  provenance_mode?: "live_upstream" | "cached_real" | "pinned_snapshot";
  sha256_hash?: string | null;
  spatial_semantics_applied?: string;
  qa_summary_note?: string;
  secondary_jobs?: Array<{
    product_id: string;
    variable_id: string;
    source_api: string;
    status: string;
    message: string;
  }>;
  api_endpoint_called: string;
  retrieved_at: string;
}

export type CapabilityState =
  | "planned"
  | "catalog_verified"
  | "extract_verified"
  | "credential_required"
  | "unsupported"
  | "deprecated";

export interface ProviderCapabilityRecord {
  provider_id: string;
  provider_name: string;
  agency: string;
  catalog_state: CapabilityState;
  extraction_state: CapabilityState;
  supported_geometries: string[];
  native_cadences: string[];
  requires_auth: boolean;
  auth_mechanism: string;
  sync_or_async: "sync" | "async" | "catalog_only";
  quota_guardrail: string;
  qa_semantics: string;
  citation_url: string;
  last_verified_utc: string;
  notes: string;
}

export interface CubeLayerManifest {
  layer_id: string;
  variable_id: string;
  variable_name: string;
  category: string;
  unit: string;
  source_product: string;
  provider_agency: string;
  citation_doi: string;
  native_resolution: string;
  cube_grid_resolution: string;
  temporal_window: string;
  valid_month_rule: string;
  status: "verified_release" | "snapshot_pinned" | "catalog_pending";
  sha256_hash: string;
  caveats: string[];
}

export interface CubeCellRecord {
  cell_id: string;
  lat: number;
  lon: number;
  region_label: string;
  is_land: boolean;
  decadal_slope: number;
  ci_low: number;
  ci_high: number;
  mk_p_value: number;
  fdr_q_value: number;
  significant_fdr: boolean;
  evidence_grade: "A" | "B" | "C" | "D";
  valid_coverage_pct: number;
  sparkline: number[];
  opposite_dipole_region?: string | null;
}

export interface GlobeCubeResponse {
  cube_version: string;
  manifest_sha256: string;
  snapshot_timestamp_utc: string;
  provenance_mode: "verified_cube_snapshot" | "live_cached_cube";
  active_layer: CubeLayerManifest;
  available_layers: CubeLayerManifest[];
  analysis_window: string;
  method_summary: string;
  fdr_alpha: number;
  total_cells: number;
  significant_cells_count: number;
  significant_area_pct: number;
  cells: CubeCellRecord[];
  time_lapse_decades: Array<{
    period: string;
    global_mean_anomaly: number;
    significant_pct: number;
    headline: string;
  }>;
}

export interface MonthlyFingerprintItem {
  month_index: number;
  month_name: string;
  climatology_mean?: number | null;
  decadal_slope?: number | null;
  mk_p_value?: number | null;
  significant?: boolean | null;
  contribution_pct?: number | null;
}

export interface CaseFileObservation {
  timestamp: string;
  value: number | null;
  seasonal_component: number | null;
  deseasonalized_value: number | null;
  anomaly_z: number | null;
  ols_trend: number | null;
  sen_trend: number | null;
  qa_flag: string;
}

export interface TrendTriangleCell {
  start_year: number;
  end_year: number;
  span_years: number;
  decadal_slope: number;
  mk_p_value: number;
  significant: boolean;
}

export interface CaveatEvent {
  date_or_period: string;
  category: "Sensor Transition" | "Reanalysis Boundary" | "QA Coverage Gap" | "Algorithm Version";
  severity: "info" | "caution" | "warning";
  title: string;
  description: string;
}

export interface OutlookProjectionPoint {
  year: number;
  central_value: number;
  ci_low: number;
  ci_high: number;
}

export interface OutlookSectionData {
  not_a_prediction_label: string;
  horizon_year: number;
  continuation_points: OutlookProjectionPoint[];
  skill_gate_passed: boolean;
  backtest_rmse: number | null;
  climatology_baseline_rmse: number | null;
  skill_score_pss: number | null;
  skill_gate_reason: string;
  short_term_forecast_points: OutlookProjectionPoint[];
  cmip6_Reference_note: string;
}

export interface CaseFileAnalysisResponse {
  result_id: string;
  source_job_id?: string | null;
  provenance_mode: "live_extracted_result" | "pinned_real_snapshot" | "live_nasa_power";
  sha256_hash: string;
  method_version: string;
  dataset_name: string;
  parameter_code: string;
  unit: string;
  location: string;
  start_year: number;
  end_year: number;
  completeness_pct: number;
  valid_months_count: number;
  seasonal_adjustment_method: string;
  requested_seasonal_adjustment: "auto" | "calendar_climatology" | "stl" | "none";
  requested_analysis_methods: string[];
  hamed_rao_mk_z: number;
  hamed_rao_mk_p: number;
  fdr_q_value: number;
  effective_sample_size_n_eff: number;
  lag1_autocorrelation: number;
  kendall_tau: number;
  sens_slope_decadal: number;
  sens_ci_low: number;
  sens_ci_high: number;
  ols_slope_decadal: number;
  ols_t_statistic: number;
  ols_t_degrees_freedom: number;
  ols_p_value: number;
  ols_ci_low_decadal: number;
  ols_ci_high_decadal: number;
  seasonal_kendall_z?: number | null;
  seasonal_kendall_p?: number | null;
  change_point_timestamp?: string | null;
  change_point_statistic?: number | null;
  change_point_p_value?: number | null;
  analysis_series: CaseFileObservation[];
  evidence_grade: "A" | "B" | "C" | "D";
  evidence_grade_title: string;
  evidence_grade_reasons: string[];
  explanations: {
    explorer: string;
    student: string;
    scientist: string;
  };
  recommended_views: string[];
  annual_stripes: Array<{ year: number; mean: number; anomaly: number; z: number | null }>;
  monthly_fingerprint: MonthlyFingerprintItem[];
  trend_triangle: TrendTriangleCell[];
  caveats: CaveatEvent[];
  outlook: OutlookSectionData;
  citation_doi: string;
  source_agency: string;
}

export interface ChatTurnRequest {
  message: string;
  conversation_stage: "topic_discovery" | "keyword_confirmation" | "parameter_definition" | "ready_to_extract";
  confirmed_keywords?: string[] | null;
  cached_intent?: ExtractedIntent | null;
  selected_product_id?: string | null;
  selected_variable_id?: string | null;
  selected_source_api?: string | null;
  current_config?: ExtractionRequest | null;
  preferred_providers?: string[] | null;
  history?: Array<{ role: string; content: string }>;
}

export interface ChatTurnResponse {
  assistant_reply: string;
  next_stage: "topic_discovery" | "keyword_confirmation" | "parameter_definition" | "ready_to_extract";
  llm_model_used: string;
  llm_live_status: string;
  intent?: ExtractedIntent | null;
  products: DataProduct[];
  selected_product?: DataProduct | null;
  proposed_config?: ExtractionRequest | null;
  provider_status: Record<string, string>;
  trigger_extraction: boolean;
}

export interface RegionPreset {
  id: string;
  name: string;
  subtitle: string;
  bbox: [number, number, number, number];
  center: [number, number];
}

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: "sri-lanka",
    name: "Colombo, Western Province, Sri Lanka",
    subtitle: "Indian Ocean Monsoon & Biosphere",
    bbox: [79.52, 5.91, 81.88, 9.84],
    center: [6.9355, 79.8487],
  },
  {
    id: "california",
    name: "California Central Valley, USA",
    subtitle: "Agricultural Drought & Groundwater Basin",
    bbox: [-122.6, 35.0, -118.5, 40.8],
    center: [36.77, -119.41],
  },
  {
    id: "los-angeles",
    name: "Los Angeles County, CA",
    subtitle: "Urban Heat Island & Coastal Basin",
    bbox: [-118.95, 33.7, -117.62, 34.82],
    center: [34.05, -118.24],
  },
  {
    id: "amazon",
    name: "Central Amazon Basin, Brazil",
    subtitle: "Tropical Rainforest Canopy & Hydrology",
    bbox: [-68.0, -8.5, -52.0, 1.0],
    center: [-3.75, -60.0],
  },
  {
    id: "himalaya",
    name: "Central Himalaya (Koshi Basin, Nepal)",
    subtitle: "Alpine Cryosphere & Glacier Retreat",
    bbox: [85.0, 26.7, 89.2, 29.2],
    center: [27.95, 87.1],
  },
  {
    id: "mediterranean",
    name: "Mediterranean Europe",
    subtitle: "Heatwaves & Aridity Transition",
    bbox: [-9.5, 36.0, 28.0, 46.5],
    center: [41.25, 9.25],
  },
];

export const UPSTREAM_PROVIDER_LIST = [
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
] as const;

export const EMPTY_DISCOVERY_STATE: DiscoveryResponse = {
  query: "",
  intent: {
    subject_domain: "Awaiting Topic Input",
    scientific_category: "Earth Science",
    keywords: [],
    target_variables: [],
    inferred_region_name: "Colombo, Western Province, Sri Lanka",
    inferred_spatial_level: "regional",
    inferred_bbox: [79.52, 5.91, 81.88, 9.84],
    inferred_Center: [6.9355, 79.8487],
    inferred_start_date: "2018-01-01",
    inferred_end_date: "2024-12-31",
    inferred_frequency: "Monthly",
    target_apis: [...UPSTREAM_PROVIDER_LIST],
    interpretation_summary:
      "Ask the SI Assistant about any environmental or climate topic to discover live NASA datasets.",
    llm_model_used: "gemini-3.5-flash-lite",
  },
  products: [],
  queried_sources: [],
  provider_status: {},
  cache_hit: false,
  total_candidates_evaluated: 0,
};

export type ResearchSourceProvider = "openalex" | "datacite";
export type ResearchSortOrder = "relevance" | "citations" | "year";

export interface ResearchDatasetContext {
  product_id: string;
  variable_id: string;
  variable_name: string;
  title?: string;
  category?: string;
  source_api: string;
  provider_agency?: string;
  mission_or_instrument?: string;
  citation_doi?: string;
  gcmd_keywords?: string[];
  region_name?: string;
  start_date?: string;
  end_date?: string;
}

export interface ResearchSearchRequest {
  mode: "manual" | "dataset";
  query?: string;
  dataset_context?: ResearchDatasetContext | null;
  sources?: ResearchSourceProvider[];
  sort?: ResearchSortOrder;
  per_source_limit?: number;
}

export interface ResearchWorkItem {
  id: string;
  source_provider: "OpenAlex" | "DataCite";
  title: string;
  authors: string;
  year: number | null;
  publication: string;
  work_type: string;
  topic: string;
  abstract_snippet: string;
  doi: string | null;
  doi_url: string | null;
  primary_url: string;
  paper_url: string | null;
  abstract_url: string | null;
  dataset_url: string | null;
  record_url: string;
  is_open_access: boolean;
  cited_by_count: number;
  match_context: string | null;
}

export interface ResearchSearchResponse {
  mode: "manual" | "dataset";
  query_executed: string;
  dataset_label?: string | null;
  total_results: number;
  openalex_count: number;
  datacite_count: number;
  open_access_count: number;
  provider_status: Record<string, string>;
  results: ResearchWorkItem[];
  retrieved_at: string;
}
