import assert from "node:assert/strict";
import { it } from "node:test";
import {
  FORECAST_REGIONS,
  parseForecast,
  parseCatalogue,
  memberTotals,
  percentile,
  forecastHref,
} from "../../src/features/forecasts/model.ts";
import { forecastFixture, catalogueFixture } from "./forecastFixtures.ts";

it("validates 51 real-shape member arrays and independently derived accumulated quantiles", () => {
  const f = parseForecast(forecastFixture(), "colombo");
  assert.equal(f.rolling_24h[0].median, 20);
  assert.equal(memberTotals(f, "rolling", 0)[50], 40);
  assert.equal(percentile([0, 2, 4, 6], 0.5), 3);
  assert.ok(forecastHref("colombo", f.artifact_id).includes("&run="));
});
it("rejects changed model, wrong point, claimed ML, unsupported units and forecast time gaps", () => {
  for (const replacement of [
    { model: "mix" },
    { units: "mm/h" },
    { iris_ml_applied: true },
    { ensemble_size: 50 },
    { location: FORECAST_REGIONS[1] },
  ])
    assert.throws(() =>
      parseForecast({ ...forecastFixture(), ...replacement }, "colombo"),
    );
  const f = forecastFixture();
  f.rows[1].start = f.rows[0].start;
  assert.throws(() => parseForecast(f, "colombo"));
});
it("does not accept summing marginal quantiles or altered member values", () => {
  const f = forecastFixture();
  f.members[0].values[0] = 100;
  assert.throws(() => parseForecast(f, "colombo"), /quantiles|summary/);
  const g = forecastFixture();
  g.rolling_24h[0].p90 = 100;
  assert.throws(() => parseForecast(g, "colombo"));
});
it("preserves missing members and withholds the affected distribution", () => {
  const f = forecastFixture();
  f.members[0].values[0] = null;
  f.missing_member_intervals = 1;
  for (const w of [f.rows[0], f.rolling_24h[0], f.daily[0]])
    Object.assign(w, {
      p10: null,
      median: null,
      p90: null,
      members_available: 50,
    });
  f.peak_24h = f.rolling_24h[1];
  assert.equal(parseForecast(f, "colombo").rows[0].median, null);
  assert.equal(memberTotals(f, "daily", 0)[0], null);
});
it("rejects duplicate members, future response generation and malformed dates", () => {
  const f = forecastFixture();
  f.members[1].id = 0;
  assert.throws(() => parseForecast(f, "colombo"));
  const g = forecastFixture();
  g.provider_response_generated_at = new Date(
    Date.now() + 3600000,
  ).toISOString();
  assert.throws(() => parseForecast(g, "colombo"));
  const h = forecastFixture();
  h.rows[0].end = "2026-02-30T00:00:00Z";
  assert.throws(() => parseForecast(h, "colombo"));
});
it("admits only complete, distinct forecast catalogue identities", () => {
  assert.equal(parseCatalogue(catalogueFixture()).length, 6);
  const c = catalogueFixture();
  c.forecasts[1] = c.forecasts[0];
  assert.throws(() => parseCatalogue(c));
  const d = catalogueFixture();
  d.forecasts[0].peak_24h!.median = -1;
  assert.throws(() => parseCatalogue(d));
});
