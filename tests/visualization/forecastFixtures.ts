// TEST-ONLY synthetic forecasts. Application modules never import this file.
import {
  FORECAST_REGIONS,
  type Forecast,
  type ForecastCard,
  type ForecastRegion,
  type ForecastWindow,
} from "../../src/features/forecasts/model.ts";
export function forecastFixture(
  site: ForecastRegion = FORECAST_REGIONS[0],
  now = Date.now(),
): Forecast {
  const first = Math.floor(now / 10800000) * 10800000 + 10800000;
  const w = (i: number, n: number): ForecastWindow => ({
    start: new Date(first + i * 10800000).toISOString(),
    end: new Date(first + (i + n) * 10800000).toISOString(),
    p10: 0.5 * n,
    median: 2.5 * n,
    p90: 4.5 * n,
    members_available: 51,
  });
  const rows = Array.from({ length: 24 }, (_, i) => w(i, 1)),
    rolling_24h = Array.from({ length: 17 }, (_, i) => w(i, 8));
  return {
    schema_version: "iris.forecast.v1",
    artifact_id: "a".repeat(64),
    id: site.id,
    kind: "precipitation",
    location: site,
    provider: "Meteomatics",
    model: "ecmwf-ens",
    model_initialization_at: null,
    parameter: "precip_3h:mm",
    units: "mm",
    interval_hours: 3,
    spatial_support: "point",
    time_standard: "UTC",
    retrieved_at: new Date(now).toISOString(),
    expires_at: new Date(now + 10800000).toISOString(),
    provider_response_generated_at: new Date(now).toISOString(),
    source_url: "https://api.meteomatics.com/TEST-ONLY",
    source_response_sha256: "b".repeat(64),
    ensemble_size: 51,
    quantile_method: "linear",
    interval_meaning:
      "ensemble_10th_to_90th_percentiles_not_calibrated_probability",
    warning_state: "not_evaluated",
    iris_ml_applied: false,
    rows,
    rolling_24h,
    daily: [w(0, 8), w(8, 8), w(16, 8)],
    peak_24h: rolling_24h[0],
    members: Array.from({ length: 51 }, (_, id) => ({
      id,
      values: Array.from({ length: 24 }, () => id / 10),
    })),
    missing_member_intervals: 0,
  };
}
export function catalogueFixture(now = Date.now()) {
  return {
    schema_version: "iris.forecast-catalogue.v1",
    forecasts: FORECAST_REGIONS.map((site) => {
      const f = forecastFixture(site, now);
      return {
        id: site.id,
        artifact_id: f.artifact_id,
        location: site,
        kind: "precipitation",
        state: "fresh",
        peak_24h: f.peak_24h,
        retrieved_at: f.retrieved_at,
        expires_at: f.expires_at,
        valid_start: f.rows[0].start,
        valid_end: f.rows[23].end,
        message: null,
      } satisfies ForecastCard;
    }),
  };
}
