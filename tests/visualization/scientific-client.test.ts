import test from "node:test";
import assert from "node:assert/strict";
import {
  computePearsonCorrelation,
  computeDeseasonalizedCorrelation,
  computeLagCrossCorrelation,
  computeSensSlope,
  generateBaselineSpatialField,
  formatMonthToIso,
  formatIsoToMonth,
} from "../../src/features/immersive-earth/services/scientificDataClient.ts";

test("scientific calculations: Pearson correlation behaves with mathematical precision", () => {
  // Perfect positive
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 6, 8, 10];
  const { r: rPos, n: nPos } = computePearsonCorrelation(x, y);
  assert.equal(rPos, 1);
  assert.equal(nPos, 5);

  // Perfect negative
  const yNeg = [10, 8, 6, 4, 2];
  const { r: rNeg } = computePearsonCorrelation(x, yNeg);
  assert.equal(rNeg, -1);

  // Constant series does not produce NaN
  const constant = [5, 5, 5, 5, 5];
  const { r: rConst } = computePearsonCorrelation(x, constant);
  assert.equal(rConst, 0);
});

test("scientific calculations: Theil-Sen slope and Mann-Kendall estimator", () => {
  // Known linear trend of +0.5 units/month -> +6.0 units/year
  const trendSeries = [10, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5];
  const stats = computeSensSlope(trendSeries);
  assert.equal(stats.slopePerYear, 6.0);
  assert.ok(stats.pValue < 0.05, "P-value should be significant for clear linear trend");
  assert.ok(stats.zScore > 2.0, "Z-score should indicate strong positive monotonic trend");
});

test("scientific calculations: Exploratory lag cross-correlation", () => {
  const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  // Shifted by +2
  const b = [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const lags = computeLagCrossCorrelation(a, b, 4);
  assert.ok(Array.isArray(lags));
  assert.equal(lags.length, 9); // -4 to +4
});

test("scientific calculations: Baseline spatial field generator obeys physical domains", () => {
  const v01Field = generateBaselineSpatialField("V01", "2024-01");
  assert.equal(v01Field.schema_version, "visualization.field.v1");
  assert.equal(v01Field.variable_id, "V01");
  assert.equal(v01Field.units, "°C");
  assert.ok(v01Field.cell_lats.length > 10);
  assert.ok(v01Field.cell_lons.length > 10);

  // Verify non-empty and bounded temperatures [-60°C, 48°C]
  const validV01 = v01Field.values.filter((v): v is number => typeof v === "number");
  assert.equal(validV01.length, v01Field.values.length);
  validV01.forEach((temp) => {
    assert.ok(temp >= -60 && temp <= 48, `Temperature ${temp} outside physical range`);
  });

  const v12Field = generateBaselineSpatialField("V12", "2024-06");
  assert.equal(v12Field.variable_id, "V12");
  assert.equal(v12Field.units, "W/m²");
  const validV12 = v12Field.values.filter((v): v is number => typeof v === "number");
  validV12.forEach((flux) => {
    assert.ok(flux >= 0 && flux <= 500, `Solar flux ${flux} outside physical range`);
  });
});

test("date formatting: month-to-iso and iso-to-month roundtrips cleanly", () => {
  assert.equal(formatMonthToIso("Jan 2024"), "2024-01");
  assert.equal(formatMonthToIso("Dec 2018"), "2018-12");
  assert.equal(formatIsoToMonth("2024-01"), "Jan 2024");
  assert.equal(formatIsoToMonth("2018-12"), "Dec 2018");
});
