/** Pure helpers for the time-series chart. A missing observation always breaks the line. */

export interface Run { start: number; end: number }

/** Maximal runs of consecutive valid observations; the chart never draws across a gap. */
export function validRuns(valid: readonly boolean[]): Run[] {
  const runs: Run[] = [];
  valid.forEach((ok, index) => {
    if (!ok) return;
    const last = runs[runs.length - 1];
    if (last && last.end === index - 1) last.end = index; else runs.push({ start: index, end: index });
  });
  return runs;
}

export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const rough = (max - min) / Math.max(1, target - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map(factor => factor * power).find(candidate => candidate >= rough) ?? 10 * power;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}

export function extent(values: readonly (number | null)[]): { min: number; max: number; minIndex: number; maxIndex: number } | null {
  let result: ReturnType<typeof extent> = null;
  values.forEach((value, index) => {
    if (value === null) return;
    if (!result) result = { min: value, max: value, minIndex: index, maxIndex: index };
    if (value < result.min) { result.min = value; result.minIndex = index; }
    if (value > result.max) { result.max = value; result.maxIndex = index; }
  });
  return result;
}

/** Decimal places needed to show the given tick step without rounding the data. */
export function tickDecimals(ticks: readonly number[]): number {
  if (ticks.length < 2) return 1;
  const step = Math.abs(ticks[1] - ticks[0]);
  return Math.min(4, Math.max(0, Math.ceil(-Math.log10(step) - 1e-9)));
}
