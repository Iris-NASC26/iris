import type {
  DataProduct,
  DiscoveryResponse,
  ExtractionRequest,
  ObservationRow,
  PreviewResponse,
} from "@/lib/dataRetrievalEngine";

export const DEVELOPMENT_DEMO_PREFIX = "DEMO_";

export function isDevelopmentDemoProduct(productId: string) {
  return productId.startsWith(DEVELOPMENT_DEMO_PREFIX);
}

const demoBbox: [number, number, number, number] = [
  77.9365304,
  29.6441381,
  80.2029893,
  30.7788666,
];

function createDemoProduct(options: {
  productId: string;
  variableId: string;
  variableName: string;
  title: string;
  unit: string;
  description: string;
}): DataProduct {
  const layer = {
    variable_id: options.variableId,
    variable_name: options.variableName,
    unit: options.unit,
    description: options.description,
    native_frequency: "Monthly",
    supported_frequencies: ["Monthly", "Yearly"],
    recommended_aggregation: "mean" as const,
  };

  return {
    product_id: `${DEVELOPMENT_DEMO_PREFIX}${options.productId}`,
    variable_id: options.variableId,
    variable_name: options.variableName,
    title: `DEMO — ${options.title}`,
    category: "Development fixture",
    source_api: "Local demo fixture",
    provider_agency: "Iris development data",
    mission_or_instrument: "Preloaded sample values",
    source_url: "",
    citation_doi: "",
    description: "Local development fixture; values are illustrative, not provider observations.",
    what_it_measures: options.description,
    unit: options.unit,
    native_frequency: "Monthly",
    supported_frequencies: ["Monthly", "Yearly"],
    temporal_start: "2000-01-01",
    temporal_end: "2024-12-31",
    spatial_resolution: "Regional grid (demo)",
    spatial_resolution_km: 50,
    spatial_coverage: "Global",
    spatial_bbox: [-180, -90, 180, 90],
    gcmd_keywords: ["development fixture", options.variableId.toLowerCase()],
    ai_match_reason: "Preloaded local fixture; no catalog request was made.",
    relevance_score: 100,
    is_async: false,
    available_layers: [layer],
    supported_spatial_modes: ["bbox"],
    requires_credentials: false,
  };
}

export const DEVELOPMENT_DEMO_PRODUCTS: DataProduct[] = [
  createDemoProduct({
    productId: "TEMPERATURE",
    variableId: "DEMO_T2M",
    variableName: "Near-surface air temperature",
    title: "Regional temperature series",
    unit: "°C",
    description: "Illustrative monthly near-surface air temperature values.",
  }),
  createDemoProduct({
    productId: "PRECIPITATION",
    variableId: "DEMO_PRECTOT",
    variableName: "Precipitation",
    title: "Regional precipitation series",
    unit: "mm/day",
    description: "Illustrative monthly precipitation values.",
  }),
];

export const DEVELOPMENT_DEMO_DISCOVERY: DiscoveryResponse = {
  query: "Local demo: temperature and precipitation",
  intent: {
    subject_domain: "Regional climate demo",
    scientific_category: "Climate variability",
    keywords: ["temperature", "precipitation", "demo"],
    target_variables: ["DEMO_T2M", "DEMO_PRECTOT"],
    inferred_region_name: "Uttarakhand, India (demo)",
    inferred_spatial_level: "regional",
    inferred_bbox: demoBbox,
    inferred_Center: [30.21150235, 79.06975985],
    inferred_start_date: "2018-01-01",
    inferred_end_date: "2024-12-31",
    inferred_frequency: "Monthly",
    target_apis: ["Local demo fixture"],
    interpretation_summary: "Preloaded local data for testing the selection and preview interface.",
    llm_model_used: "local-development-fixture",
  },
  products: DEVELOPMENT_DEMO_PRODUCTS,
  queried_sources: ["Local development fixture"],
  provider_status: { "Local development fixture": "loaded locally" },
  cache_hit: false,
  total_candidates_evaluated: DEVELOPMENT_DEMO_PRODUCTS.length,
};

function createSampleRows(
  config: ExtractionRequest,
  product: DataProduct,
  hasSecondary: boolean,
): ObservationRow[] {
  const startYear = Number(config.start_date.slice(0, 4));
  const endYear = Number(config.end_date.slice(0, 4));
  const timestamps: string[] = [];

  if (config.target_frequency === "Yearly") {
    for (let year = startYear; year <= endYear && timestamps.length < 500; year += 1) {
      timestamps.push(`${year}-01-01`);
    }
  } else {
    const startMonth = Number(config.start_date.slice(5, 7)) - 1;
    const endMonth = Number(config.end_date.slice(5, 7)) - 1;
    for (
      let date = new Date(Date.UTC(startYear, startMonth, 1));
      date.getUTCFullYear() < endYear ||
      (date.getUTCFullYear() === endYear && date.getUTCMonth() <= endMonth);
      date.setUTCMonth(date.getUTCMonth() + 1)
    ) {
      if (timestamps.length >= 500) break;
      timestamps.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`);
    }
  }

  const isPrecipitation = product.variable_id === "DEMO_PRECTOT";
  return timestamps.map((timestamp, index) => {
    const month = Number(timestamp.slice(5, 7)) - 1;
    const value = isPrecipitation
      ? Number((3.2 + 2.4 * Math.sin((month / 12) * Math.PI * 2) + (index % 5) * 0.15).toFixed(2))
      : Number((18 + 7 * Math.sin((month / 12) * Math.PI * 2) + index * 0.015).toFixed(2));
    const secondaryValue = isPrecipitation
      ? Number((18 + 7 * Math.sin((month / 12) * Math.PI * 2) + index * 0.015).toFixed(2))
      : Number((3.2 + 2.4 * Math.sin((month / 12) * Math.PI * 2) + (index % 5) * 0.15).toFixed(2));

    return {
      timestamp,
      value,
      ...(hasSecondary ? { secondary_value: secondaryValue } : {}),
      rolling_avg: value,
      anomaly_z: 0,
      unit: product.unit,
      variable_id: product.variable_id,
      qa_flag: "Valid",
    };
  });
}

export function createDevelopmentDemoPreview(
  config: ExtractionRequest,
  product: DataProduct,
): PreviewResponse {
  const hasSecondary = Boolean(config.additional_products?.length);
  const rows = createSampleRows(config, product, hasSecondary);
  const values = rows.map((row) => row.value ?? 0);
  const sortedValues = [...values].sort((a, b) => a - b);
  const mean = values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
  const median = sortedValues[Math.floor(sortedValues.length / 2)] ?? 0;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
    Math.max(values.length, 1);
  const minValue = sortedValues[0] ?? 0;
  const maxValue = sortedValues.at(-1) ?? 0;
  const minIndex = values.indexOf(minValue);
  const maxIndex = values.indexOf(maxValue);
  const secondaryJobs = (config.additional_products ?? []).map((item) => ({
    product_id: item.product_id,
    variable_id: item.variable_id,
    source_api: "Local demo fixture",
    status: "completed",
    message: "Loaded locally; no upstream API request was made.",
  }));

  return {
    job_id: "development-demo-preview",
    result_id: "development-demo-result",
    status: "completed",
    product,
    extraction_config: config,
    summary_stats: {
      count: rows.length,
      valid_count: rows.length,
      flagged_count: 0,
      missing_count: 0,
      completeness_pct: rows.length ? 100 : 0,
      missing_pct: 0,
      missing_warning: false,
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      std_dev: Number(Math.sqrt(variance).toFixed(2)),
      min_val: minValue,
      min_date: rows[minIndex]?.timestamp ?? "",
      max_val: maxValue,
      max_date: rows[maxIndex]?.timestamp ?? "",
      decadal_slope: product.variable_id === "DEMO_PRECTOT" ? -0.02 : 0.18,
      unit: product.unit,
    },
    chart_series: rows,
    raw_rows: rows,
    total_rows: rows.length,
    page: 1,
    page_size: 500,
    upstream_live_fetched: false,
    spatial_semantics_applied: "development_demo_bbox",
    secondary_jobs: secondaryJobs,
    api_endpoint_called: "local://development-demo-fixture",
    retrieved_at: new Date().toISOString(),
  };
}

export const DEVELOPMENT_DEMO_BBOX = demoBbox;
