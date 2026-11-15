import assert from "node:assert/strict";
import { it } from "node:test";
import {
  parseMlCapabilities,
  parseMlDatasets,
  parseMlHistory,
  parseMlModels,
  parseMlPrediction,
  parseMlTrends,
} from "../../src/features/forecasts/model";

const caps = {
  schema_version: "iris.ml-forecast.v2",
  credentials: { configured: true },
  policy: "history-only",
  admin_token_required: false,
  sources: {
    era5: { param: "ecmwf-era5", declared_availability_lag_hours: 144, role: "retrospective" },
  },
};

it("accepts a valid v2 capabilities document", () => {
  const c = parseMlCapabilities(caps);
  assert.equal(c.sources.era5.declared_availability_lag_hours, 144);
});

it("rejects wrong schema versions and missing source metadata", () => {
  assert.throws(() => parseMlCapabilities({ ...caps, schema_version: "v1" }));
  assert.throws(() =>
    parseMlCapabilities({
      ...caps,
      sources: { era5: { param: "x", role: "y" } },
    }),
  );
});

it("rejects malformed history: negative or reversed intervals", () => {
  const base = {
    state: "available",
    source_id: "era5",
    coverage: { complete_days: 1, first_day: "2020-01-01", last_day: "2020-01-01" },
  };
  assert.throws(() =>
    parseMlHistory({
      ...base,
      records: [
        {
          interval_start: "2020-01-01T00:00:00Z",
          interval_end: "2020-01-02T00:00:00Z",
          value: -1,
          unit: "mm",
          available_at: null,
        },
      ],
    }),
  );
  assert.throws(() =>
    parseMlHistory({
      ...base,
      records: [
        {
          interval_start: "2020-01-02T00:00:00Z",
          interval_end: "2020-01-01T00:00:00Z",
          value: 1,
          unit: "mm",
          available_at: null,
        },
      ],
    }),
  );
});

it("rejects tampered dataset manifests", () => {
  const good = {
    dataset_id: "ds-0123456789abcdef",
    source_id: "era5",
    records: 10,
    precip_complete_days: 10,
    coverage: { first_day: "a", last_day: "b" },
    quarantine: { count: 0, reasons: [] },
    content_sha256: "a".repeat(64),
    created_at: "x",
  };
  assert.equal(parseMlDatasets({ datasets: [good] }).length, 1);
  assert.throws(() =>
    parseMlDatasets({ datasets: [{ ...good, content_sha256: "zzz" }] }),
  );
  assert.throws(() =>
    parseMlDatasets({ datasets: [{ ...good, dataset_id: "fake" }] }),
  );
});

it("enforces the model state machine", () => {
  const card = {
    model_id: "m-0123456789abcd-h0",
    location_id: "colombo",
    horizon_index: 0,
    state: "eligible",
    dataset_id: "ds-0123456789abcdef",
    trained_at: "x",
    metrics: {},
    eligibility_reasons: [],
  };
  assert.equal(parseMlModels({ models: [card] }).length, 1);
  assert.throws(() =>
    parseMlModels({ models: [{ ...card, state: "published" }] }),
  );
});

it("rejects unordered or negative ML quantiles", () => {
  const run = {
    run_id: "run-1",
    predictions: [
      {
        window_start: "2024-01-01T00:00:00Z",
        window_end: "2024-01-02T00:00:00Z",
        q10: 5,
        q50: 4,
        q90: 9,
        unit: "mm",
      },
    ],
  };
  assert.throws(() => parseMlPrediction(run), /ordered/);
  assert.throws(() =>
    parseMlPrediction({
      ...run,
      predictions: [{ ...run.predictions[0], q10: -1, q50: 4, q90: 9 }],
    }),
  );
  const unavailable = parseMlPrediction({ state: "unavailable", reason: "no active model" });
  assert.equal(unavailable.state, "unavailable");
});

it("accepts signed target values without allowing negative rainfall", () => {
  const history = { state: "available", source_id: "MOD13Q1.061", coverage: { complete_days: 1 }, records: [
    { interval_start: "2020-01-01T00:00:00Z", interval_end: "2020-01-17T00:00:00Z", value: -.1, unit: "1" },
  ] };
  assert.equal(parseMlHistory(history).records[0].value, -.1);
  const signed = { predictions: [{ window_start: "2026-11-16T00:00:00Z", window_end: "2026-11-17T00:00:00Z", q10: -.2, q50: -.1, q90: .1, unit: "1", nonnegative: false }] };
  assert.equal(parseMlPrediction(signed).predictions![0].q50, -.1);
});

it("preserves explicit preview quality and rejects nonfinite error percentages", () => {
  const run = { quality_status: "experimental_preview", predictions: [{
    window_start: "2026-11-16T00:00:00Z", window_end: "2026-11-17T00:00:00Z",
    q10: .2, q50: .3, q90: .4, unit: "m3/m3", quality_status: "experimental_preview", error_vs_baseline_pct: 8.2,
  }] };
  assert.equal(parseMlPrediction(run).predictions![0].error_vs_baseline_pct, 8.2);
  assert.throws(() => parseMlPrediction({ ...run, predictions: [{ ...run.predictions[0], error_vs_baseline_pct: Infinity }] }));
  assert.throws(() => parseMlPrediction({ ...run, quality_status: "guaranteed" }));
});

it("validates trend reports including BH q-values", () => {
  const report = {
    family_id: "annual_total",
    state: "computed",
    slope_per_decade: 1.2,
    ci_90: [0.1, 2.3],
    p_raw: 0.02,
    q_bh: 0.05,
    completeness: 0.9,
    n_complete_months: 120,
    method: "theil-sen",
    scope: "retrospective_historical_only",
  };
  assert.equal(parseMlTrends({ reports: [report] }).length, 1);
  assert.throws(() =>
    parseMlTrends({ reports: [{ ...report, q_bh: 1.5 }] }),
  );
  assert.throws(() =>
    parseMlTrends({ reports: [{ ...report, state: "proven" }] }),
  );
});

// ---- Phase 1: dynamic point locations -------------------------------------

const loc = {
  schema_version: "iris.forecast-location.v1",
  location_id: "loc-a40fb92b2f5c",
  name: "Jaffna test point",
  latitude: 9.6615,
  longitude: 80.0255,
  timezone: "UTC",
  geometry: { type: "Point", coordinates: [80.0255, 9.6615] },
  spatial_mode: "point",
  source: "registered",
  created_at: "2025-01-01T00:00:00Z",
};

it("parses registered and seeded location records", async () => {
  const { parseLocation, parseLocations } = await import(
    "../../src/features/forecasts/model"
  );
  assert.equal(parseLocation({ location: loc }).location_id, "loc-a40fb92b2f5c");
  const listed = parseLocations({ locations: [loc, { ...loc, location_id: "colombo", source: "seed" }] });
  assert.equal(listed.length, 2);
});

it("rejects unsafe ids, out-of-range coordinates, and non-point records", async () => {
  const { parseLocations } = await import("../../src/features/forecasts/model");
  for (const bad of [
    { ...loc, location_id: "../escape" },
    { ...loc, location_id: "UPPERCASE" },
    { ...loc, latitude: 91 },
    { ...loc, longitude: -181 },
    { ...loc, latitude: Number.NaN },
    { ...loc, spatial_mode: "area" },
    { ...loc, name: "" },
    { ...loc, name: "x".repeat(81) },
    { ...loc, source: "imported" },
  ]) {
    assert.throws(() => parseLocations({ locations: [bad] }), JSON.stringify(bad));
  }
});

it("rejects duplicate location ids in a list", async () => {
  const { parseLocations } = await import("../../src/features/forecasts/model");
  assert.throws(() => parseLocations({ locations: [loc, loc] }));
});

it("parses compatibility states and rejects unknown ones", async () => {
  const { parseCompatibility } = await import("../../src/features/forecasts/model");
  const base = {
    state: "ready",
    reasons: [],
    message: "Dataset is ready.",
    location_id: "loc-a40fb92b2f5c",
    location_name: "Jaffna",
    target: "precip_24h",
    suggested_dataset_id: "ds-0123456789abcdef",
  };
  assert.equal(parseCompatibility(base).state, "ready");
  for (const state of ["needs_history", "insufficient_history", "outside_spatial_support", "unsupported_target", "unsupported_spatial_mode"]) {
    assert.equal(parseCompatibility({ ...base, state }).state, state);
  }
  assert.throws(() => parseCompatibility({ ...base, state: "area_ready" }));
  assert.throws(() => parseCompatibility({ ...base, location_id: "bad id" }));
});

const area = {
  schema_version: "iris.forecast-location.v2",
  location_id: "area-cf6131c5ffc5",
  name: "Minneriya test box",
  latitude: 8.5,
  longitude: 80.75,
  timezone: "UTC",
  geometry: { type: "Polygon", coordinates: [[[80.0, 7.5], [81.5, 7.5], [81.5, 9.5], [80.0, 9.5], [80.0, 7.5]]] },
  spatial_mode: "area_mean",
  bbox: [80.0, 7.5, 81.5, 9.5],
  centroid: { latitude: 8.5, longitude: 80.75 },
  source: "registered",
  created_at: "2025-02-01T00:00:00Z",
};

it("parses area location records with valid bbox", async () => {
  const { parseLocation, parseLocations } = await import(
    "../../src/features/forecasts/model"
  );
  const parsed = parseLocation({ location: area });
  assert.equal(parsed.spatial_mode, "area_mean");
  assert.deepEqual(parsed.bbox, [80.0, 7.5, 81.5, 9.5]);
  const listed = parseLocations({ locations: [loc, area] });
  assert.equal(listed.length, 2);
});

it("rejects area records with malformed or reversed bounds", async () => {
  const { parseLocations } = await import("../../src/features/forecasts/model");
  for (const bad of [
    { ...area, bbox: [81.5, 7.5, 80.0, 9.5] },
    { ...area, bbox: [80.0, 9.5, 81.5, 7.5] },
    { ...area, bbox: [80.0, 7.5, 81.5] },
    { ...area, bbox: null },
    { ...area, bbox: "not-a-box" },
    { ...area, bbox: [80.0, 7.5, 81.5, Number.NaN] },
    { ...area, spatial_mode: "centroid" },
  ]) {
    assert.throws(() => parseLocations({ locations: [bad] }), JSON.stringify(bad));
  }
});

it("parses freshness states and rejects invalid ones", async () => {
  const { parseMlFreshness } = await import("../../src/features/forecasts/model");
  const base = {
    location_id: "area-cf6131c5ffc5",
    source_id: "nasa_power",
    target: "power_t2m",
    state: "fresh",
    latest_observation_end: "2025-02-01T00:00:00Z",
    input_age_hours: 30.5,
    availability_basis: "estimated ~72h publication delay",
    latest_dataset_id: "ds-0123456789abcdef",
    checked_at: "2025-02-02T00:00:00Z",
  };
  assert.equal(parseMlFreshness(base).state, "fresh");
  for (const state of ["delayed", "no_data", "unsupported", "credential_failure", "retrieval_failure", "rate_limited"]) {
    assert.equal(parseMlFreshness({ ...base, state }).state, state);
  }
  assert.equal(
    parseMlFreshness({ ...base, latest_observation_end: null, input_age_hours: null, state: "no_data" }).state,
    "no_data",
  );
  assert.throws(() => parseMlFreshness({ ...base, state: "reissued" }));
  assert.throws(() => parseMlFreshness({ ...base, location_id: "bad id" }));
  assert.throws(() => parseMlFreshness({ ...base, input_age_hours: Number.NaN }));
  assert.throws(() => parseMlFreshness({ ...base, latest_observation_end: "not a date" }));
});
