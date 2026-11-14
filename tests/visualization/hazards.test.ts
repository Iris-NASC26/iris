import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  INVESTIGATIONS,
  availableEvidence,
  investigation,
  parseHistory,
  parseRainfall,
  thresholdScreen,
} from "../../src/features/hazards/model.ts";
import { rainfallFixture, historyFixture } from "./hazardFixtures.ts";

describe("source-backed disaster investigations", () => {
  it("does not admit a later narrative of a bulletin as an issue-time archive", () => {
    for (const item of INVESTIGATIONS) {
      assert.equal(availableEvidence(item, item.default_cutoff).length, 0);
      assert.equal(availableEvidence(item, item.history_end).length, 0);
      assert.ok(
        item.sources.every((source) => source.url.startsWith("https://")),
      );
      assert.ok(
        item.sources.every((source) => source.type === "post_event_report"),
      );
    }
    assert.equal(investigation("invented-case"), undefined);
  });
});

describe("point precipitation contracts and research-only screening", () => {
  const item = INVESTIGATIONS[0],
    now = Date.UTC(2026, 10, 15, 6, 15);
  it("accepts the exact point and validates each independently recomputed 24-hour total", () => {
    const result = parseRainfall(rainfallFixture(item, now), item);
    assert.equal(result.peak_24h_mm, 24);
    assert.deepEqual(thresholdScreen(result, 24, now), {
      state: "research_only",
      count: 49,
    });
    assert.deepEqual(thresholdScreen(result, 24.1, now), {
      state: "research_only",
      count: 0,
    });
    assert.deepEqual(thresholdScreen(result, 24, now + 900000), {
      state: "stale",
      count: null,
    });
  });
  it("preserves gaps and withholds a screen without complete windows", () => {
    const mixed = parseRainfall(rainfallFixture(item, now, [24]), item);
    assert.equal(mixed.rolling_24h.filter((w) => w.value === null).length, 24);
    assert.equal(thresholdScreen(mixed, 1, now).count, 25);
    const empty = parseRainfall(
      rainfallFixture(
        item,
        now,
        Array.from({ length: 72 }, (_, i) => i),
      ),
      item,
    );
    assert.equal(empty.peak_24h_mm, null);
    assert.deepEqual(thresholdScreen(empty, 1, now), {
      state: "insufficient_data",
      count: null,
    });
  });
  for (const threshold of [0, -1, 2000.01, Infinity, NaN])
    it(`rejects invalid research threshold ${threshold}`, () => {
      assert.throws(() =>
        thresholdScreen(rainfallFixture(item, now), threshold, now),
      );
    });
  it("rejects other points, modified units, invented probabilities and wrong totals", () => {
    assert.throws(() =>
      parseRainfall(rainfallFixture(INVESTIGATIONS[1], now), item),
    );
    const wrongUnits = { ...rainfallFixture(item, now), units: "mm/h" };
    assert.throws(() => parseRainfall(wrongUnits, item));
    assert.throws(() =>
      parseRainfall(
        { ...rainfallFixture(item, now), hazard_model_validated: true },
        item,
      ),
    );
    const result = rainfallFixture(item, now);
    result.rolling_24h[0].value = 23;
    assert.throws(() => parseRainfall(result, item), /totals/);
  });
  it("rejects non-contiguous dates, invalid QA, stale summaries and non-prospective periods", () => {
    const gap = rainfallFixture(item, now);
    gap.rows[1].interval_start = gap.rows[0].interval_start;
    assert.throws(() => parseRainfall(gap, item), /non-contiguous/);
    const qa = rainfallFixture(item, now);
    qa.rows[0].value = null;
    assert.throws(() => parseRainfall(qa, item));
    const summary = rainfallFixture(item, now);
    summary.peak_24h_mm = 999;
    assert.throws(() => parseRainfall(summary, item), /summary/);
    const past = rainfallFixture(item, now - 86400000);
    past.retrieved_at = new Date(now).toISOString();
    past.expires_at = new Date(now + 900000).toISOString();
    past.provider_response_generated_at = past.retrieved_at;
    assert.throws(() => parseRainfall(past, item), /prospective/);
  });
});

describe("historical NASA precipitation admission", () => {
  const item = INVESTIGATIONS[0];
  it("retains zero, missing dates and retrospective provenance", () => {
    const result = parseHistory(historyFixture(), item);
    assert.equal(result.rows.length, 24);
    assert.equal(result.rows[0].value, 0);
    assert.equal(result.rows[1].value, null);
    assert.equal(result.as_of_availability_verified, false);
  });
  it("rejects wrong daily units, incomplete calendars and pre-event availability claims", () => {
    assert.throws(() =>
      parseHistory({ ...historyFixture(), units: "mm" }, item),
    );
    assert.throws(() =>
      parseHistory(
        { ...historyFixture(), as_of_availability_verified: true },
        item,
      ),
    );
    const fixture = historyFixture();
    fixture.rows.pop();
    assert.throws(() => parseHistory(fixture, item));
    const duplicate = historyFixture();
    duplicate.rows[1].timestamp = duplicate.rows[0].timestamp;
    assert.throws(() => parseHistory(duplicate, item));
  });
});
