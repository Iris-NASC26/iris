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
