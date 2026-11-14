/** TEST-ONLY synthetic values for renderer benchmarks. This is an abstract index-based wave
 * pattern, deliberately unrelated to any Earth variable. It must never be presented as data.
 */
import { CELL_COUNT, COLS } from './grid';

export const SYNTHETIC_LABEL = 'Test-only synthetic pattern: not Earth observations';

export function createSyntheticField(): Float32Array {
  const values = new Float32Array(CELL_COUNT);
  for (let index = 0; index < CELL_COUNT; index++) {
    const row = Math.floor(index / COLS), col = index % COLS;
    const hash = Math.imul(index ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    values[index] = hash % 100 < 3 ? Number.NaN : Math.sin(row * 0.33) * Math.cos(col * 0.19);
  }
  return values;
}

/** Neutral two-hue ramp for -1..1. It is not the approved signed-trend scale (U08). NaN is transparent. */
export function syntheticColor(value: number): [number, number, number, number] {
  if (Number.isNaN(value)) return [0, 0, 0, 0];
  const t = (Math.max(-1, Math.min(1, value)) + 1) / 2;
  return [0.25 + 0.7 * t, 0.35 + 0.1 * (1 - Math.abs(2 * t - 1)), 0.95 - 0.8 * t, 0.62];
}
