// Shared, source-backed investigations. This registry contains no calculated
// trend results, warning probabilities or synthetic observations.
import catalog from "../../../shared/hazard-investigations.json" with { type: "json" };

export const INVESTIGATIONS = catalog.cases;
export type Investigation = (typeof INVESTIGATIONS)[number];
export function investigation(id: string) {
  return INVESTIGATIONS.find((item) => item.id === id);
}
export const investigationHref = (id: string) =>
  `/workspace/case-studies/${encodeURIComponent(id)}`;
export function availableEvidence(item: Investigation, cutoff: string) {
  return item.timeline.filter((fact) => {
    const source = item.sources.find((s) => s.id === fact.source_id);
    // The catalogue's document date does not establish issue-time archival
    // availability. These reports cannot be admitted as pre-event features.
    const available =
      source &&
      (source as { verified_available_at?: unknown }).verified_available_at;
    return (
      source?.availability_verified === true &&
      typeof available === "string" &&
      Number.isFinite(Date.parse(available)) &&
      Date.parse(available) <= Date.parse(cutoff + "T23:59:59Z") &&
      fact.date <= cutoff
    );
  });
}

export interface RainRow {
  timestamp: string;
  interval_start: string;
  value: number | null;
  qa: "usable" | "missing";
}
export interface RainWindow {
  start: string;
  end: string;
  value: number | null;
}
export interface RainfallOutlook {
  schema_version: "iris.rainfall-outlook.v1";
  case_id: string;
  provider: "Meteomatics";
  requested_source: "mix";
  parameter: "precip_1h:mm";
  units: "mm";
  interval: "preceding_one_hour";
  time_standard: "UTC";
  quantity: "total_precipitation_water_equivalent";
  latitude: number;
  longitude: number;
  spatial_support: "point";
  retrieved_at: string;
  expires_at: string;
  from_cache: boolean;
  forecast_initialization_at: null;
  provider_response_generated_at: string;
  source_url: string;
  source_response_sha256: string;
  warning_state: "not_evaluated";
  hazard_model_validated: false;
  rows: RainRow[];
  rolling_24h: RainWindow[];
  peak_24h_mm: number | null;
  missing_hours: number;
  caveats: string[];
}
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const instant = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
export function parseRainfall(
  value: unknown,
  item: Investigation,
): RainfallOutlook {
  const r = value as RainfallOutlook | null;
  if (
    !r ||
    r.schema_version !== "iris.rainfall-outlook.v1" ||
    r.case_id !== item.id ||
    r.provider !== "Meteomatics" ||
    r.parameter !== "precip_1h:mm" ||
    r.units !== "mm" ||
    r.interval !== "preceding_one_hour" ||
    r.time_standard !== "UTC" ||
    r.quantity !== "total_precipitation_water_equivalent" ||
    r.spatial_support !== "point" ||
    r.latitude !== item.latitude ||
    r.longitude !== item.longitude ||
    r.requested_source !== "mix" ||
    r.warning_state !== "not_evaluated" ||
    r.hazard_model_validated !== false ||
    !instant(r.retrieved_at) ||
    !instant(r.expires_at) ||
    Date.parse(r.expires_at) <= Date.parse(r.retrieved_at) ||
    !instant(r.provider_response_generated_at) ||
    r.forecast_initialization_at !== null ||
    Date.parse(r.expires_at) - Date.parse(r.retrieved_at) !== 900000 ||
    Math.abs(
      Date.parse(r.provider_response_generated_at) - Date.parse(r.retrieved_at),
    ) > 3600000 ||
    Date.parse(r.provider_response_generated_at) - Date.parse(r.retrieved_at) >
      300000 ||
    typeof r.from_cache !== "boolean" ||
    typeof r.source_url !== "string" ||
    !r.source_url.startsWith("https://api.meteomatics.com/") ||
    !/^[a-f\d]{64}$/i.test(r.source_response_sha256 ?? "") ||
    !Array.isArray(r.rows) ||
    r.rows.length !== 72 ||
    !Array.isArray(r.rolling_24h) ||
    r.rolling_24h.length !== 49 ||
    !Array.isArray(r.caveats) ||
    !r.caveats.every((c) => typeof c === "string")
  )
    throw new Error(
      "The precipitation result does not match the selected point or supported contract.",
    );
  for (let i = 0; i < r.rows.length; i++) {
    const row = r.rows[i];
    if (
      !row ||
      !instant(row.timestamp) ||
      !instant(row.interval_start) ||
      Date.parse(row.timestamp) - Date.parse(row.interval_start) !== 3600000 ||
      !(row.value === null || (finite(row.value) && row.value >= 0)) ||
      row.qa !== (row.value === null ? "missing" : "usable") ||
      (i > 0 &&
        Date.parse(row.interval_start) !== Date.parse(r.rows[i - 1].timestamp))
    )
      throw new Error("Invalid or non-contiguous hourly precipitation result.");
  }
  if (Date.parse(r.rows[0].interval_start) < Date.parse(r.retrieved_at))
    throw new Error("The returned period is not a wholly prospective outlook.");
  const totals: number[] = [];
  for (let i = 0; i < r.rolling_24h.length; i++) {
    const w = r.rolling_24h[i],
      samples = r.rows.slice(i, i + 24);
    const expected = samples.every((s) => s.value !== null)
      ? samples.reduce((n, s) => n + s.value!, 0)
      : null;
    if (
      !w ||
      w.start !== samples[0].interval_start ||
      w.end !== samples[23].timestamp ||
      (expected !== null && !finite(expected)) ||
      (expected === null
        ? w.value !== null
        : !finite(w.value) ||
          Math.abs(w.value - expected) > 1e-7 * Math.max(1, expected))
    )
      throw new Error(
        "The rolling precipitation totals do not match their hourly intervals.",
      );
    if (w.value !== null) totals.push(w.value);
  }
  const peak = totals.length ? Math.max(...totals) : null;
  if (
    r.missing_hours !== r.rows.filter((row) => row.value === null).length ||
    (peak === null && r.peak_24h_mm !== null) ||
    (peak !== null &&
      (!finite(r.peak_24h_mm) ||
        Math.abs(peak - r.peak_24h_mm) > 1e-7 * Math.max(1, peak)))
  )
    throw new Error("Invalid precipitation coverage or summary.");
  return r;
}

export interface HistoricalContext {
  schema_version: "iris.hazard-history.v1";
  case_id: string;
  provider: "NASA POWER";
  parameter: "PRECTOTCORR";
  units: "mm/day";
  time_standard: "UTC";
  spatial_support: "point";
  latitude: number;
  longitude: number;
  retrieved_at: string;
  source_url: string;
  source_response_sha256: string;
  as_of_availability_verified: false;
  purpose: "retrospective_context";
  from_cache: boolean;
  rows: { timestamp: string; value: number | null; qa: "usable" | "missing" }[];
  caveat: string;
}
export function parseHistory(
  value: unknown,
  item: Investigation,
): HistoricalContext {
  const r = value as HistoricalContext | null;
  const start = Date.parse(item.history_start + "T00:00:00Z"),
    end = Date.parse(item.history_end + "T00:00:00Z");
  if (
    !r ||
    r.schema_version !== "iris.hazard-history.v1" ||
    r.case_id !== item.id ||
    r.provider !== "NASA POWER" ||
    r.parameter !== "PRECTOTCORR" ||
    r.units !== "mm/day" ||
    r.time_standard !== "UTC" ||
    r.spatial_support !== "point" ||
    r.latitude !== item.latitude ||
    r.longitude !== item.longitude ||
    !instant(r.retrieved_at) ||
    !/^[a-f\d]{64}$/i.test(r.source_response_sha256 ?? "") ||
    r.as_of_availability_verified !== false ||
    r.purpose !== "retrospective_context" ||
    !Array.isArray(r.rows) ||
    r.rows.length !== (end - start) / 86400000 + 1 ||
    typeof r.caveat !== "string" ||
    typeof r.source_url !== "string" ||
    !r.source_url.startsWith("https://power.larc.nasa.gov/")
  )
    throw new Error(
      "Historical observations do not match the selected investigation.",
    );
  r.rows.forEach((row, index) => {
    if (
      !row ||
      row.timestamp !==
        new Date(start + index * 86400000).toISOString().slice(0, 10) ||
      !(row.value === null || (finite(row.value) && row.value >= 0)) ||
      row.qa !== (row.value === null ? "missing" : "usable")
    )
      throw new Error("Invalid historical precipitation observations.");
  });
  return r;
}

export function thresholdScreen(
  outlook: RainfallOutlook,
  threshold: number,
  now = Date.now(),
) {
  if (!finite(threshold) || threshold <= 0 || threshold > 2000)
    throw new Error(
      "Use an exploratory threshold above 0 and at most 2,000 mm per 24 hours.",
    );
  if (now >= Date.parse(outlook.expires_at))
    return { state: "stale" as const, count: null };
  const valid = outlook.rolling_24h.filter((w) => w.value !== null);
  if (!valid.length)
    return { state: "insufficient_data" as const, count: null };
  return {
    state: "research_only" as const,
    count: valid.filter((w) => w.value! >= threshold).length,
  };
}
