import registry from "../../../shared/forecast-regions.json" with { type: "json" };

export const FORECAST_REGIONS = registry.regions;
export type ForecastRegion = (typeof FORECAST_REGIONS)[number];
export const forecastHref = (id: string, artifactId?: string | null) =>
  `/workspace/forecasts?forecastId=${encodeURIComponent(id)}${artifactId ? `&run=${encodeURIComponent(artifactId)}` : ""}`;
export const forecastRegion = (id: string) =>
  FORECAST_REGIONS.find((r) => r.id === id);
export interface ForecastWindow {
  start: string;
  end: string;
  p10: number | null;
  median: number | null;
  p90: number | null;
  members_available: number;
}
export interface Forecast {
  schema_version: "iris.forecast.v1";
  artifact_id: string;
  id: string;
  kind: "precipitation";
  location: ForecastRegion;
  provider: "Meteomatics";
  model: "ecmwf-ens";
  model_initialization_at: null;
  parameter: "precip_3h:mm";
  units: "mm";
  interval_hours: 3;
  spatial_support: "point";
  time_standard: "UTC";
  retrieved_at: string;
  expires_at: string;
  provider_response_generated_at: string;
  source_url: string;
  source_response_sha256: string;
  ensemble_size: 51;
  quantile_method: "linear";
  interval_meaning: "ensemble_10th_to_90th_percentiles_not_calibrated_probability";
  warning_state: "not_evaluated";
  iris_ml_applied: false;
  rows: ForecastWindow[];
  rolling_24h: ForecastWindow[];
  daily: ForecastWindow[];
  peak_24h: ForecastWindow | null;
  members: { id: number; values: (number | null)[] }[];
  missing_member_intervals: number;
}
export interface ForecastCard {
  artifact_id: string | null;
  id: string;
  location: ForecastRegion;
  kind: "precipitation";
  state: "fresh" | "stale" | "unavailable";
  peak_24h: ForecastWindow | null;
  retrieved_at: string | null;
  expires_at: string | null;
  valid_start: string | null;
  valid_end: string | null;
  message: string | null;
}
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
export const time = (value: unknown): number => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)
  )
    throw new Error("Invalid forecast time.");
  return Date.parse(value);
};
export function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b),
    at = (sorted.length - 1) * p,
    lo = Math.floor(at),
    hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}
export type Aggregation = "three-hour" | "rolling" | "daily";
export function windows(f: Forecast, aggregation: Aggregation) {
  return aggregation === "three-hour"
    ? f.rows
    : aggregation === "rolling"
      ? f.rolling_24h
      : f.daily;
}
export function memberTotals(
  f: Forecast,
  aggregation: Aggregation,
  index: number,
) {
  const left = aggregation === "daily" ? index * 8 : index,
    size = aggregation === "three-hour" ? 1 : 8;
  return f.members.map((m) => {
    const slice = m.values.slice(left, left + size);
    return slice.every((v) => v !== null)
      ? slice.reduce<number>((sum, v) => sum + v!, 0)
      : null;
  });
}
export function parseForecast(value: unknown, id: string): Forecast {
  const f = value as Forecast,
    site = forecastRegion(id);
  if (
    !f ||
    !site ||
    f.schema_version !== "iris.forecast.v1" ||
    f.id !== id ||
    f.kind !== "precipitation" ||
    f.location?.id !== id ||
    f.location.latitude !== site.latitude ||
    f.location.longitude !== site.longitude ||
    f.provider !== "Meteomatics" ||
    f.model !== "ecmwf-ens" ||
    f.parameter !== "precip_3h:mm" ||
    f.units !== "mm" ||
    f.interval_hours !== 3 ||
    f.spatial_support !== "point" ||
    f.time_standard !== "UTC" ||
    f.ensemble_size !== 51 ||
    f.quantile_method !== "linear" ||
    f.warning_state !== "not_evaluated" ||
    f.iris_ml_applied !== false ||
    f.model_initialization_at !== null ||
    f.interval_meaning !==
      "ensemble_10th_to_90th_percentiles_not_calibrated_probability" ||
    typeof f.source_url !== "string" ||
    !f.source_url.startsWith("https://api.meteomatics.com/") ||
    !/^[a-f\d]{64}$/.test(f.source_response_sha256 ?? "") ||
    !/^[a-f\d]{64}$/.test(f.artifact_id ?? "") ||
    !Array.isArray(f.members) ||
    f.members.length !== 51 ||
    !Array.isArray(f.rows) ||
    f.rows.length !== 24 ||
    !Array.isArray(f.rolling_24h) ||
    f.rolling_24h.length !== 17 ||
    !Array.isArray(f.daily) ||
    f.daily.length !== 3
  )
    throw new Error(
      "The forecast does not match the selected location or supported source.",
    );
  const retrieved = time(f.retrieved_at),
    generated = time(f.provider_response_generated_at);
  if (
    time(f.expires_at) - retrieved !== 10800000 ||
    generated - retrieved > 300000 ||
    retrieved - generated > 3600000
  )
    throw new Error("Invalid forecast freshness metadata.");
  if (
    new Set(f.members.map((m) => m.id)).size !== 51 ||
    f.members.some(
      (m) =>
        !Number.isInteger(m.id) ||
        m.id < 0 ||
        m.id > 50 ||
        !Array.isArray(m.values) ||
        m.values.length !== 24 ||
        m.values.some((v) => !(v === null || (finite(v) && v >= 0))),
    )
  )
    throw new Error("Invalid ensemble member data.");
  f.rows.forEach((w, i) => {
    if (
      !w ||
      time(w.end) - time(w.start) !== 10800000 ||
      (i > 0 && w.start !== f.rows[i - 1].end)
    )
      throw new Error("Non-contiguous forecast intervals.");
  });
  if (time(f.rows[0].start) < retrieved)
    throw new Error("Forecast interval began before retrieval.");
  for (const aggregation of ["three-hour", "rolling", "daily"] as const)
    windows(f, aggregation).forEach((w, i) => {
      const left = aggregation === "daily" ? i * 8 : i,
        size = aggregation === "three-hour" ? 1 : 8;
      const totals = memberTotals(f, aggregation, i).filter(
        (n): n is number => n !== null,
      );
      if (
        !w ||
        w.start !== f.rows[left].start ||
        w.end !== f.rows[left + size - 1].end ||
        w.members_available !== totals.length ||
        totals.some((n) => !finite(n))
      )
        throw new Error("Invalid forecast aggregation.");
      for (const [name, p] of [
        ["p10", 0.1],
        ["median", 0.5],
        ["p90", 0.9],
      ] as const) {
        const expected = totals.length === 51 ? percentile(totals, p) : null,
          actual = w[name];
        if (
          expected === null
            ? actual !== null
            : !finite(actual) ||
              Math.abs(actual - expected) > 1e-7 * Math.max(1, expected)
        )
          throw new Error(
            "Forecast quantiles disagree with their ensemble members.",
          );
      }
    });
  const usable = f.rolling_24h.filter((w) => w.median !== null),
    peak = usable.reduce<ForecastWindow | null>(
      (best, w) => (!best || w.median! > best.median! ? w : best),
      null,
    );
  if (
    (peak === null
      ? f.peak_24h !== null
      : !f.peak_24h ||
        (
          ["start", "end", "p10", "median", "p90", "members_available"] as const
        ).some((k) => f.peak_24h![k] !== peak[k])) ||
    f.missing_member_intervals !==
      f.members.flatMap((m) => m.values).filter((v) => v === null).length
  )
    throw new Error("Invalid forecast summary.");
  return f;
}
export function parseCatalogue(value: unknown): ForecastCard[] {
  const v = value as { schema_version?: string; forecasts?: ForecastCard[] };
  if (
    !v ||
    v.schema_version !== "iris.forecast-catalogue.v1" ||
    !Array.isArray(v.forecasts) ||
    v.forecasts.length !== FORECAST_REGIONS.length
  )
    throw new Error("Forecast catalogue unavailable.");
  if (new Set(v.forecasts.map((c) => c.id)).size !== FORECAST_REGIONS.length)
    throw new Error("Duplicate forecast cards.");
  return v.forecasts.map((card) => {
    const site = forecastRegion(card.id);
    if (
      !site ||
      card.location?.latitude !== site.latitude ||
      card.location?.longitude !== site.longitude ||
      !["fresh", "stale", "unavailable"].includes(card.state) ||
      card.kind !== "precipitation"
    )
      throw new Error("Invalid forecast card.");
    if (
      card.state === "fresh" &&
      (!card.expires_at ||
        !card.retrieved_at ||
        time(card.expires_at) <= time(card.retrieved_at))
    )
      throw new Error("Missing forecast freshness.");
    if (
      card.peak_24h &&
      (!finite(card.peak_24h.median) || card.peak_24h.median < 0)
    )
      throw new Error("Invalid forecast headline.");
    return { ...card, location: site };
  });
}

export interface ForecastContext {
  id: string;
  provider: "NASA GPM IMERG Early";
  product: "GPM_3IMERGDE.07";
  units: "mm/day";
  time_standard: "UTC";
  location: ForecastRegion;
  retrieved_at: string;
  source_url: string;
  caveat: string;
  sources: { sha256: string; url: string }[];
  rows: {
    timestamp: string;
    value: number | null;
    qa: "usable" | "missing";
    reported_latitude: number;
    reported_longitude: number;
  }[];
}
export function parseContext(value: unknown, id: string): ForecastContext {
  const v = value as ForecastContext,
    site = forecastRegion(id);
  if (
    !v ||
    !site ||
    v.id !== id ||
    v.provider !== "NASA GPM IMERG Early" ||
    v.product !== "GPM_3IMERGDE.07" ||
    v.units !== "mm/day" ||
    v.time_standard !== "UTC" ||
    v.location?.latitude !== site.latitude ||
    v.location?.longitude !== site.longitude ||
    typeof v.caveat !== "string" ||
    typeof v.source_url !== "string" ||
    !v.source_url.startsWith("https://cmr.earthdata.nasa.gov/") ||
    !Array.isArray(v.rows) ||
    v.rows.length < 1 ||
    v.rows.length > 7 ||
    !Array.isArray(v.sources) ||
    v.sources.length !== v.rows.length
  )
    throw new Error(
      "NASA observations do not match this forecast point or supported product.",
    );
  const retrieved = time(v.retrieved_at);
  v.rows.forEach((r, i) => {
    if (
      !r ||
      !/^\d{4}-\d{2}-\d{2}$/.test(r.timestamp) ||
      time(r.timestamp + "T00:00:00Z") + 86400000 > retrieved ||
      (i > 0 && r.timestamp <= v.rows[i - 1].timestamp) ||
      !(r.value === null || (finite(r.value) && r.value >= 0)) ||
      r.qa !== (r.value === null ? "missing" : "usable") ||
      !finite(r.reported_latitude) ||
      !finite(r.reported_longitude) ||
      Math.abs(r.reported_latitude - site.latitude) > 0.051 ||
      Math.abs(r.reported_longitude - site.longitude) > 0.051
    )
      throw new Error("Invalid or out-of-support NASA observation.");
  });
  if (
    v.sources.some(
      (s) =>
        !/^[a-f0-9]{64}$/.test(s.sha256) ||
        !s.url.startsWith("https://opendap.earthdata.nasa.gov/"),
    )
  )
    throw new Error("NASA source provenance is incomplete.");
  return v;
}

/* ---- Iris historical-ML forecast contracts (iris.ml-forecast.v2) ----
 * These describe the local pipeline built only on Meteomatics *past* records.
 * They are deliberately separate from the provider-ensemble contracts above:
 * a v2 run is never a provider forecast and vice versa.
 */

export interface MlTarget {
  label: string;
  unit: string;
  composite_days: number;
  sources: string[];
}
export interface MlCapabilities {
  schema_version: string;
  credentials: { configured: boolean; reason?: string };
  policy: string;
  admin_token_required: boolean;
  sources: Record<
    string,
    { param: string; declared_availability_lag_hours: number; role: string }
  >;
  targets?: Record<string, MlTarget>;
  earthdata_products?: Record<
    string,
    { delay_days: number; daac: string; cadence: string; note: string }
  >;
}
export function parseMlCapabilities(v: unknown): MlCapabilities {
  const c = v as MlCapabilities;
  if (
    !c ||
    c.schema_version !== "iris.ml-forecast.v2" ||
    typeof c.credentials?.configured !== "boolean" ||
    typeof c.policy !== "string" ||
    !c.sources ||
    Object.values(c.sources).some(
      (s) =>
        typeof s?.param !== "string" ||
        !finite(s?.declared_availability_lag_hours) ||
        typeof s?.role !== "string",
    )
  )
    throw new Error("Invalid ML forecast capabilities response.");
  return c;
}

export interface MlHistory {
  state: string;
  source_id: string;
  records: {
    interval_start: string;
    interval_end: string;
    value: number;
    unit: string;
    available_at: string | null;
  }[];
  coverage: { complete_days: number; first_day: string | null; last_day: string | null };
}
export function parseMlHistory(v: unknown): MlHistory {
  const h = v as MlHistory;
  if (
    !h ||
    typeof h.state !== "string" ||
    !Array.isArray(h.records) ||
    !h.coverage ||
    !finite(h.coverage.complete_days) ||
    h.records.some(
      (r) =>
        typeof r?.interval_start !== "string" ||
        typeof r?.interval_end !== "string" ||
        !finite(r?.value) ||
        r.value < 0 ||
        Date.parse(r.interval_end) <= Date.parse(r.interval_start),
    )
  )
    throw new Error("Invalid ML history response.");
  return h;
}

export interface MlDataset {
  dataset_id: string;
  source_id: string;
  records: number;
  precip_complete_days: number;
  coverage: { first_day: string | null; last_day: string | null };
  quarantine: { count: number; reasons: string[] };
  content_sha256: string;
  created_at: string;
}
export function parseMlDatasets(v: unknown): MlDataset[] {
  const list = (v as { datasets?: unknown })?.datasets;
  if (!Array.isArray(list)) throw new Error("Invalid datasets response.");
  list.forEach((d) => {
    const m = d as MlDataset;
    if (
      !/^ds-[a-f0-9]{16}$/.test(m?.dataset_id ?? "") ||
      !finite(m?.records) ||
      !finite(m?.precip_complete_days) ||
      !/^[a-f0-9]{64}$/.test(m?.content_sha256 ?? "")
    )
      throw new Error("Invalid dataset manifest.");
  });
  return list as MlDataset[];
}

export type MlModelState =
  | "candidate"
  | "eligible"
  | "active"
  | "rejected"
  | "stale"
  | "retired";
export interface MlModelCard {
  model_id: string;
  location_id: string;
  horizon_index: number;
  state: MlModelState;
  dataset_id: string;
  trained_at: string;
  metrics: {
    model_mae?: number | null;
    baseline_mae?: number | null;
    skill_vs_best_baseline?: number | null;
    folds?: number;
    n_eval?: number;
    model_sha256?: string | null;
    target?: string;
  };
  eligibility_reasons: string[];
}
export function parseMlModels(v: unknown): MlModelCard[] {
  const list = (v as { models?: unknown })?.models;
  if (!Array.isArray(list)) throw new Error("Invalid models response.");
  const states: MlModelState[] = [
    "candidate",
    "eligible",
    "active",
    "rejected",
    "stale",
    "retired",
  ];
  list.forEach((m) => {
    const c = m as MlModelCard;
    if (
      !/^m-[a-f0-9]{14}(-[a-z0-9]{1,8})?-h[0-2]$/.test(c?.model_id ?? "") ||
      !states.includes(c?.state) ||
      !Array.isArray(c?.eligibility_reasons)
    )
      throw new Error("Invalid model card.");
  });
  return list as MlModelCard[];
}

export interface MlTrendReport {
  family_id: string;
  state: "computed" | "insufficient";
  reason?: string;
  slope_per_decade?: number | null;
  ci_90?: [number, number] | null;
  p_raw?: number | null;
  q_bh?: number | null;
  completeness: number;
  n_complete_months: number;
  lag1_autocorrelation?: number | null;
  method: string;
  scope: string;
}
export function parseMlTrends(v: unknown): MlTrendReport[] {
  const list = (v as { reports?: unknown })?.reports;
  if (!Array.isArray(list)) throw new Error("Invalid trends response.");
  list.forEach((r) => {
    const t = r as MlTrendReport;
    if (
      !t ||
      (t.state !== "computed" && t.state !== "insufficient") ||
      !finite(t.completeness) ||
      (t.q_bh != null && (!finite(t.q_bh) || t.q_bh < 0 || t.q_bh > 1))
    )
      throw new Error("Invalid trend report.");
  });
  return list as MlTrendReport[];
}

export interface MlJob {
  job_id: string;
  kind: string;
  status: "queued" | "running" | "complete" | "failed" | "cancelled";
  progress: number;
  checkpoint: Record<string, unknown>;
  error: string | null;
}

export interface MlPredictionWindow {
  window_start: string;
  window_end: string;
  q10: number;
  q50: number;
  q90: number;
  unit: string;
}
export interface MlPrediction {
  state?: string;
  reason?: string;
  horizons?: { horizon: number; reason: string }[];
  run_id?: string;
  issued_at?: string;
  uncertainty_method?: string;
  predictions?: MlPredictionWindow[];
}
export function parseMlPrediction(v: unknown): MlPrediction {
  const p = v as MlPrediction;
  if (!p || typeof p !== "object") throw new Error("Invalid prediction response.");
  if (p.state === "unavailable") return p;
  if (
    !Array.isArray(p.predictions) ||
    p.predictions.some(
      (w) =>
        !finite(w?.q10) ||
        !finite(w?.q50) ||
        !finite(w?.q90) ||
        w.q10 < 0 ||
        w.q50 < 0 ||
        w.q90 < 0 ||
        !(w.q10 <= w.q50 && w.q50 <= w.q90),
    )
  )
    throw new Error("Invalid ML prediction: quantiles must be finite, ordered, nonnegative.");
  return p;
}
