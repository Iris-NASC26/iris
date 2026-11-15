import { it } from "node:test";
import assert from "node:assert/strict";
import {
  recordScene,
  seasonalSummary,
  MAX_SCENE_POINTS,
} from "../../src/features/visualization/presentation/model.ts";
import {
  timestamp,
  type Datum,
} from "../../src/features/visualization/model.ts";
const row = (stamp: string, value: number | null): Datum => ({
  timestamp: stamp,
  time: timestamp(stamp),
  value,
  qa: value === null ? "Missing" : "Valid",
});

it("seasonal radius is linear in signed source values; source values remain unchanged", () => {
  const rows = [row("2020-01", -10), row("2020-02", 0), row("2020-03", 10)];
  const scene = recordScene(rows, "Monthly", "C", "cycle");
  assert.deepEqual(scene.range, [-10, 10]);
  assert.deepEqual(
    scene.points.map((p) => p.row.value),
    [-10, 0, 10],
  );
  scene.points.forEach((p, i) =>
    assert.ok(
      Math.abs(Math.hypot(p.position[0], p.position[2]) - (3 + i * 2)) < 1e-12,
    ),
  );
  assert.equal(scene.points[0].row, rows[0]);
  assert.deepEqual(scene.segments, [
    [0, 1],
    [1, 2],
  ]);
});
it("seasonal years and months use actual calendar identities without closing the year loop", () => {
  const scene = recordScene(
    [row("2020-11", 1), row("2020-12", 2), row("2021-01", 3)],
    "Monthly",
    "mm/day",
    "cycle",
  );
  assert.deepEqual(scene.segments, [[0, 1]]);
  assert.equal(scene.points[0].position[1], 0);
  assert.equal(scene.points[2].position[1], 6);
  assert.equal(scene.points[2].month, 0);
});
it("explicit and absent missing months both remain unconnected", () => {
  for (const rows of [
    [row("2020-01", 1), row("2020-02", null), row("2020-03", 3)],
    [row("2020-01", 1), row("2020-03", 3)],
  ]) {
    assert.equal(recordScene(rows, "Monthly", "C", "cycle").segments.length, 0);
    assert.equal(
      recordScene(rows, "Monthly", "C", "timeline").segments.length,
      0,
    );
  }
});
it("3D time spacing follows elapsed UTC time, not observation index", () => {
  const scene = recordScene(
    [row("2020-01-01", 0), row("2020-01-02", 1), row("2020-01-05", 2)],
    "Daily",
    "C",
    "timeline",
  );
  assert.deepEqual(
    scene.points.map((p) => p.position[0]),
    [-8, -4, 8],
  );
  assert.deepEqual(scene.segments, [[0, 1]]);
});
it("zero-variance and all-missing records do not invent variation or values", () => {
  const constant = recordScene(
    [row("2020-01", 0), row("2020-02", 0)],
    "Monthly",
    "1",
    "cycle",
  );
  assert.ok(constant.range[0] < 0 && constant.range[1] > 0);
  assert.ok(
    constant.points.every(
      (p) => Math.abs(Math.hypot(p.position[0], p.position[2]) - 5) < 1e-12,
    ),
  );
  const missing = recordScene([row("2020-01", null)], "Monthly", "C", "cycle");
  assert.equal(missing.points.length, 0);
  assert.match(missing.reason, /No usable/);
});
it("unsupported cadence, duplicate months and oversized scenes fail with a full-data 2D path", () => {
  assert.match(
    recordScene([{ ...row("2020-01", 1), time: 1e30 }], "Monthly", "C", "cycle")
      .reason,
    /Invalid/,
  );
  assert.match(
    recordScene([row("2020-01-01", 1)], "Daily", "C", "cycle").reason,
    /Monthly/,
  );
  assert.match(
    recordScene(
      [row("2020-01-01", 1), row("2020-01-15", 2)],
      "Monthly",
      "C",
      "cycle",
    ).reason,
    /not silently averaged/,
  );
  const rows = Array.from({ length: MAX_SCENE_POINTS + 1 }, (_, i) =>
    row(new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10), i),
  );
  assert.match(
    recordScene(rows, "Daily", "C", "timeline").reason,
    /no observations were downsampled/,
  );
  assert.equal(rows.length, MAX_SCENE_POINTS + 1);
});
it("seasonal summaries are actual observed ranges and selected-period means, not uncertainty", () => {
  const result = seasonalSummary([
    row("2020-01", -5),
    row("2021-01", 5),
    row("2020-02", null),
  ]);
  assert.deepEqual(result[0], { month: 0, count: 2, mean: 0, min: -5, max: 5 });
  assert.deepEqual(result[1], {
    month: 1,
    count: 0,
    mean: null,
    min: null,
    max: null,
  });
});
