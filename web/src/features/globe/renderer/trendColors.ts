/** U08 display contract for a future validated trend layer: a fixed colour-blind-safe
 * diverging ramp, a significance channel kept separate from colour, and a missing rule
 * that can never be mistaken for zero. The value domain is a display decision pending
 * S-task approval, so it is an explicit parameter, not a hard-coded scientific claim.
 * No scientific result is produced here — paint only what a validated layer supplies.
 */
import type { Rgba } from './cellLayer';

/** Blue (negative) ↔ white (zero) ↔ orange-brown (positive): safe for common CVD types. */
const STOPS: [number, Rgba][] = [
  [-1, [59 / 255, 76 / 255, 192 / 255, 0.85]],
  [-0.5, [146 / 255, 197 / 255, 222 / 255, 0.85]],
  [0, [247 / 255, 247 / 255, 247 / 255, 0.55]],
  [0.5, [244 / 255, 165 / 255, 130 / 255, 0.85]],
  [1, [178 / 255, 24 / 255, 43 / 255, 0.85]],
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Map a signed value in ±`domain` to the fixed ramp; out-of-domain values clamp. */
export function trendColor(value: number, domain: number): Rgba {
  if (!Number.isFinite(domain) || domain <= 0 || !Number.isFinite(value)) throw new RangeError('A finite positive domain is required');
  const t = Math.max(-1, Math.min(1, value / domain));
  if (t <= STOPS[0][0]) return STOPS[0][1];
  const last = STOPS[STOPS.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const k = (t - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0]);
      const [a, b] = [STOPS[i - 1][1], STOPS[i][1]];
      return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)];
    }
  }
  return last[1];
}

/** The significance channel is a separate overlay (diagonal hatch rendered above the
 * colour), never a colour blend, so non-significant cells keep their signed colour. */
export const SIGNIFICANCE_ALPHA = 0.85;
export const NON_SIGNIFICANT_ALPHA = 0.35;

export function significanceAlpha(significant: boolean): number {
  return significant ? SIGNIFICANCE_ALPHA : NON_SIGNIFICANT_ALPHA;
}

/** Missing data renders as fully transparent — visibly empty, never white (zero). */
export const MISSING_RGBA: Rgba = [0, 0, 0, 0];
