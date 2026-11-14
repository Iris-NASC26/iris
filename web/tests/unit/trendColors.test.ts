import { describe, expect, it } from 'vitest';
import {
  MISSING_RGBA,
  NON_SIGNIFICANT_ALPHA,
  SIGNIFICANCE_ALPHA,
  significanceAlpha,
  trendColor,
} from '../../src/features/globe/renderer/trendColors';

describe('U08 trend display contract', () => {
  it('maps a signed value onto a fixed diverging ramp and clamps outside it', () => {
    const zero = trendColor(0, 0.5);
    const negative = trendColor(-1, 1);
    const positive = trendColor(1, 1);
    expect(zero[0]).toBeCloseTo(zero[2], 2); // near-white at zero
    expect(negative[2]).toBeGreaterThan(negative[0]); // blue dominates
    expect(positive[0]).toBeGreaterThan(positive[2]); // red/orange dominates
    expect(trendColor(99, 1)).toEqual(trendColor(1, 1)); // clamps, never wraps
    expect(trendColor(-99, 1)).toEqual(trendColor(-1, 1));
  });

  it('keeps the sign readable: warm for positive, cool for negative, neutral near zero', () => {
    for (const value of [0.1, 0.4, 0.9]) {
      const [pr, , pb] = trendColor(value, 1);
      const [nr, , nb] = trendColor(-value, 1);
      expect(pr - pb).toBeGreaterThan(0.05); // positive skews warm
      expect(nb - nr).toBeGreaterThan(0.05); // negative skews cool
    }
    const [r, g, b] = trendColor(0, 1);
    expect(Math.abs(r - g)).toBeLessThan(0.02);
    expect(Math.abs(g - b)).toBeLessThan(0.02); // grey at zero, not a sign colour
  });

  it('keeps significance as a separate channel, never a colour change', () => {
    const significant = significanceAlpha(true);
    const not = significanceAlpha(false);
    expect(significant).toBe(SIGNIFICANCE_ALPHA);
    expect(not).toBe(NON_SIGNIFICANT_ALPHA);
    expect(not).toBeLessThan(significant);
  });

  it('renders missing as transparent, never as the zero colour', () => {
    expect(MISSING_RGBA[3]).toBe(0);
    const zero = trendColor(0, 1);
    expect(zero[3]).toBeGreaterThan(0);
    expect(MISSING_RGBA).not.toEqual(zero);
  });

  it('rejects a non-positive or non-finite domain rather than guessing a scale', () => {
    expect(() => trendColor(0.5, 0)).toThrow(RangeError);
    expect(() => trendColor(0.5, Number.NaN)).toThrow(RangeError);
    expect(() => trendColor(Number.NaN, 1)).toThrow(RangeError);
  });
});
