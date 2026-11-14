// TEST-ONLY synthetic transport fixtures. Never import into application code.
import {
  INVESTIGATIONS,
  type Investigation,
  type RainfallOutlook,
  type HistoricalContext,
} from "../../src/features/hazards/model.ts";

export function rainfallFixture(
  item: Investigation = INVESTIGATIONS[0],
  now = Date.now(),
  missing: number[] = [],
): RainfallOutlook {
  const start = Math.floor(now / 3600000) * 3600000 + 7200000;
  const rows = Array.from({ length: 72 }, (_, i) => ({
    timestamp: new Date(start + i * 3600000).toISOString(),
    interval_start: new Date(start + (i - 1) * 3600000).toISOString(),
    value: missing.includes(i) ? null : 1,
    qa: missing.includes(i) ? ("missing" as const) : ("usable" as const),
  }));
  const rolling_24h = Array.from({ length: 49 }, (_, i) => ({
    start: rows[i].interval_start,
    end: rows[i + 23].timestamp,
    value: rows.slice(i, i + 24).some((r) => r.value === null) ? null : 24,
  }));
  return {
    schema_version: "iris.rainfall-outlook.v1",
    case_id: item.id,
    provider: "Meteomatics",
    requested_source: "mix",
    parameter: "precip_1h:mm",
    units: "mm",
    quantity: "total_precipitation_water_equivalent",
    interval: "preceding_one_hour",
    time_standard: "UTC",
    latitude: item.latitude,
    longitude: item.longitude,
    spatial_support: "point",
    retrieved_at: new Date(now).toISOString(),
    expires_at: new Date(now + 900000).toISOString(),
    from_cache: false,
    forecast_initialization_at: null,
    provider_response_generated_at: new Date(now).toISOString(),
    source_url: "https://api.meteomatics.com/TEST-ONLY",
    source_response_sha256: "a".repeat(64),
    warning_state: "not_evaluated",
    hazard_model_validated: false,
    rows,
    rolling_24h,
    peak_24h_mm: rolling_24h.some((w) => w.value !== null) ? 24 : null,
    missing_hours: missing.length,
    caveats: ["TEST-ONLY synthetic values; not scientific evidence."],
  };
}

export function historyFixture(
  item: Investigation = INVESTIGATIONS[0],
): HistoricalContext {
  const start = Date.parse(item.history_start + "T00:00:00Z"),
    end = Date.parse(item.history_end + "T00:00:00Z");
  return {
    schema_version: "iris.hazard-history.v1",
    case_id: item.id,
    provider: "NASA POWER",
    parameter: "PRECTOTCORR",
    units: "mm/day",
    time_standard: "UTC",
    spatial_support: "point",
    latitude: item.latitude,
    longitude: item.longitude,
    retrieved_at: new Date().toISOString(),
    source_url: "https://power.larc.nasa.gov/TEST-ONLY",
    source_response_sha256: "b".repeat(64),
    as_of_availability_verified: false,
    purpose: "retrospective_context",
    from_cache: false,
    rows: Array.from({ length: (end - start) / 86400000 + 1 }, (_, i) => ({
      timestamp: new Date(start + i * 86400000).toISOString().slice(0, 10),
      value: i === 1 ? null : i,
      qa: i === 1 ? "missing" : "usable",
    })),
    caveat: "TEST-ONLY synthetic context. Not proof of pre-event availability.",
  };
}
