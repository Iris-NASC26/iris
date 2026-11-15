import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { heleneData } from "../../src/features/case-studies/helene/heleneData.ts";
import {
  calculateOceanDifference,
  calculateRainfallComparison,
  calculateSoilDifference,
  calculateRunoffComparison,
  formatScientificValue,
} from "../../src/features/case-studies/helene/heleneCalculations.ts";

describe("Hurricane Helene (2024) Data Integrity and Calculation Contracts", () => {
  test("geographic domain matches curated NASA Giovanni bounding coordinates", () => {
    assert.equal(heleneData.region.west, -84.5);
    assert.equal(heleneData.region.east, -81.0);
    assert.equal(heleneData.region.south, 29.0);
    assert.equal(heleneData.region.north, 36.5);
    assert.equal(heleneData.event.start, "2024-09-26");
    assert.equal(heleneData.event.end, "2024-09-27");
  });

  test("verified numerical records match exact specification values", () => {
    // Ocean
    assert.equal(heleneData.ocean.observations[0].value, 27.7181339);
    assert.equal(heleneData.ocean.observations[1].value, 27.1833229);

    // Rainfall
    assert.equal(heleneData.rainfall.observations[0].value, 138.532867);
    assert.equal(heleneData.rainfall.observations[1].value, 212.519058);
    assert.equal(heleneData.rainfall.observations[2].value, 18.7252617);

    // Soil Moisture
    assert.equal(heleneData.soil.observations[0].value, 6.64522886);
    assert.equal(heleneData.soil.observations[1].value, 7.66144991);
    assert.equal(heleneData.soil.observations[2].value, 7.58885908);

    // Runoff
    assert.equal(heleneData.runoff.observations[0].value, 0.00969412271);
    assert.equal(heleneData.runoff.observations[1].value, 0.0185763612);
    assert.equal(heleneData.runoff.observations[2].value, 0.000836261839);

    // Wind
    assert.equal(heleneData.wind.observations[0].value, 4.79129171);
  });

  test("ocean temperature difference computes exact delta between Aug and Sep", () => {
    const diff = calculateOceanDifference();
    assert.equal(diff.augVal, 27.7181339);
    assert.equal(diff.sepVal, 27.1833229);
    assert.ok(Math.abs(diff.diff - -0.534811) < 0.0001);
    assert.equal(diff.formattedDiff, "-0.53 °C");
  });

  test("rainfall comparison between August and September computes correct delta, ratio and percentage", () => {
    const res = calculateRainfallComparison("2024-08", "2024-09");
    assert.ok(res !== null);
    assert.equal(res.unit, "kg/m²");
    // Absolute diff ~ +73.986
    assert.ok(Math.abs(res.absDiff - 73.986191) < 0.001);
    assert.equal(res.formattedDiff, "+73.99 kg/m²");

    // Ratio ~ 1.534
    assert.ok(res.ratio !== null);
    assert.ok(Math.abs(res.ratio - 1.534069) < 0.001);

    // Relative percentage ~ +53.4%
    assert.ok(res.relDiffPercent !== null);
    assert.ok(Math.abs(res.relDiffPercent - 53.4069) < 0.01);
  });

  test("daily soil difference computes exact +1.02 kg/m² day-to-day step between Sep 25 and Sep 26", () => {
    const res = calculateSoilDifference("2024-09-25", "2024-09-26");
    assert.ok(res !== null);
    assert.ok(Math.abs(res.absDiff - 1.01622105) < 0.0001);
    assert.equal(res.formattedDiff, "+1.02 kg/m²");
  });

  test("runoff ratio computes approximately 1.92× between September and August", () => {
    const res = calculateRunoffComparison("2024-08", "2024-09");
    assert.ok(res !== null);
    assert.ok(res.ratio !== null);
    assert.ok(Math.abs(res.ratio - 1.9162497) < 0.001);
    assert.equal(res.ratio.toFixed(2), "1.92");
    assert.equal(res.formattedDiff, "+0.008882 kg/m²");
  });

  test("formatting helper formats numerical values with precision", () => {
    assert.equal(formatScientificValue(27.7181339, 2), "27.72");
    assert.equal(formatScientificValue(0.00969412, 6), "0.009694");
  });
});
