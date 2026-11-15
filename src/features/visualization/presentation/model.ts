/** Display geometry only. Source values, dates and QA are never modified. */
import { hasGap, type Datum } from "../model";

export const MAX_SCENE_POINTS = 6000;
export type SceneMode = "cycle" | "timeline";
export interface ScenePoint {
  position: [number, number, number];
  row: Datum;
  year: number;
  month: number;
}
export interface SceneLabel {
  position: [number, number, number];
  text: string;
  kind: "month" | "year" | "value" | "time";
}
export interface RecordScene {
  mode: SceneMode;
  points: ScenePoint[];
  segments: [number, number][];
  years: number[];
  labels: SceneLabel[];
  range: [number, number];
  unit: string;
  missing: number;
  reason: string;
}
export function displayRange(values: number[]): [number, number] {
  if (!values.length) return [0, 1];
  let lo = Infinity,
    hi = -Infinity;
  for (const v of values) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  if (lo === hi) {
    const pad = Math.max(Math.abs(lo) * 0.02, 0.1);
    return [lo - pad, hi + pad];
  }
  return [lo, hi];
}
export function recordScene(
  rows: Datum[],
  cadence: string,
  unit: string,
  mode: SceneMode,
): RecordScene {
  const empty = (reason: string): RecordScene => ({
    mode,
    points: [],
    segments: [],
    years: [],
    labels: [],
    range: [0, 1],
    unit,
    missing: rows.filter((r) => r.value === null).length,
    reason,
  });
  if (!rows.length) return empty("No observations in this display window.");
  if (mode === "cycle" && cadence !== "Monthly")
    return empty(
      "Seasonal orbits require Monthly observations. Use the time series for this cadence; no monthly aggregation is performed here.",
    );
  const sorted = [...rows].sort((a, b) => a.time - b.time);
  if (
    sorted.some(
      (r, i) =>
        !Number.isFinite(r.time) ||
        !Number.isFinite(new Date(r.time).getTime()) ||
        (r.value !== null && !Number.isFinite(r.value)) ||
        (i > 0 && r.time === sorted[i - 1].time),
    )
  )
    return empty(
      "Invalid or duplicate observations cannot be placed in the scene.",
    );
  const seen = new Set<string>();
  if (mode === "cycle")
    for (const row of sorted) {
      const d = new Date(row.time),
        key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      if (seen.has(key))
        return empty(
          "More than one observation occupies a calendar month. Values are not silently averaged.",
        );
      seen.add(key);
    }
  const valid = sorted.filter((r) => r.value !== null);
  if (!valid.length)
    return empty(
      "No usable observations. Missing and excluded values remain empty.",
    );
  if (valid.length > MAX_SCENE_POINTS)
    return empty(
      `3D supports up to ${MAX_SCENE_POINTS.toLocaleString()} observations. Narrow the display window or use the full 2D chart; no observations were downsampled.`,
    );
  const firstYear = new Date(sorted[0].time).getUTCFullYear(),
    lastYear = new Date(sorted.at(-1)!.time).getUTCFullYear();
  if (mode === "cycle" && lastYear - firstYear > 149)
    return empty("Limit the seasonal display window to 150 years.");
  const years = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, i) => firstYear + i,
  );
  const range = displayRange(valid.map((r) => r.value!)),
    span = range[1] - range[0];
  const points: ScenePoint[] = [],
    segments: [number, number][] = [];
  const first = sorted[0].time,
    last = sorted.at(-1)!.time;
  let previous: number | null = null;
  for (const row of sorted) {
    if (row.value === null) {
      previous = null;
      continue;
    }
    const d = new Date(row.time),
      year = d.getUTCFullYear(),
      month = d.getUTCMonth(),
      fraction = (row.value - range[0]) / span;
    const angle = (month / 12) * Math.PI * 2 - Math.PI / 2,
      radius = 3 + fraction * 4;
    const position: [number, number, number] =
      mode === "cycle"
        ? [
            Math.cos(angle) * radius,
            ((year - firstYear) / Math.max(1, lastYear - firstYear)) * 6,
            Math.sin(angle) * radius,
          ]
        : [
            ((row.time - first) / Math.max(1, last - first)) * 16 - 8,
            fraction * 6,
            0,
          ];
    const index = points.length;
    if (previous !== null) {
      const prior = points[previous];
      if (
        !hasGap(prior.row.time, row.time, cadence) &&
        (mode === "timeline" || prior.year === year)
      )
        segments.push([previous, index]);
    }
    points.push({ position, row, year, month });
    previous = index;
  }
  const labels: SceneLabel[] = [];
  for (let i = 0; i < 3; i++) {
    const v = range[0] + (span * i) / 2;
    labels.push({
      kind: "value",
      position: mode === "cycle" ? [3 + i * 2, -0.35, 0] : [-9, i * 3, 0],
      text: `${v.toPrecision(3)} ${unit}`,
    });
  }
  if (mode === "cycle") {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    months.forEach((text, m) => {
      const a = (m / 12) * Math.PI * 2 - Math.PI / 2;
      labels.push({
        text,
        kind: "month",
        position: [Math.cos(a) * 8, 6.8, Math.sin(a) * 8],
      });
    });
    const step = Math.max(1, Math.ceil(years.length / 5));
    years
      .filter((_, i) => i % step === 0 || i === years.length - 1)
      .forEach((year) =>
        labels.push({
          kind: "year",
          text: String(year),
          position: [
            -8,
            ((year - firstYear) / Math.max(1, lastYear - firstYear)) * 6,
            0,
          ],
        }),
      );
  } else
    for (let i = 0; i < 5; i++) {
      const t = first + ((last - first) * i) / 4;
      labels.push({
        kind: "time",
        text: new Date(t).toISOString().slice(0, 10),
        position: [-8 + (16 * i) / 4, -0.7, 0],
      });
    }
  return {
    mode,
    points,
    segments,
    years,
    labels,
    range,
    unit,
    missing: sorted.length - valid.length,
    reason: "",
  };
}

export function seasonalSummary(rows: Datum[]) {
  return Array.from({ length: 12 }, (_, month) => {
    const samples = rows.filter(
      (r) => r.value !== null && new Date(r.time).getUTCMonth() === month,
    );
    const values = samples.map((r) => r.value!);
    return {
      month,
      count: values.length,
      mean: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    };
  });
}
