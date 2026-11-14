/** Fixed absolute-value colour ramps for raw monthly fields. These are display scales for
 * unanalysed values — not the approved diverging trend scale, which belongs to U08.
 */
import type { Rgba } from './cellLayer';

interface Ramp { stops: [number, Rgba][]; label: (units: string) => string }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function rampColor(stops: [number, Rgba][], value: number): Rgba {
  if (value <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (value >= last[0]) return last[1];
  for (let i = 1; i < stops.length; i++) {
    if (value <= stops[i][0]) {
      const t = (value - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      const [a, b] = [stops[i - 1][1], stops[i][1]];
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
    }
  }
  return last[1];
}

const ALPHA = 0.82;
const a = (r: number, g: number, b: number): Rgba => [r / 255, g / 255, b / 255, ALPHA];

const RAMPS: Record<string, Ramp> = {
  // 2 m air temperature, −40 to +45 °C, blue → white → red, white at 0 °C.
  V01: {
    stops: [[-40, a(49, 54, 149)], [-20, a(33, 102, 172)], [-10, a(103, 169, 207)], [0, a(247, 247, 247)], [15, a(253, 174, 97)], [30, a(215, 48, 39)], [45, a(165, 0, 38)]],
    label: units => `Raw monthly value scale, −40 (blue) to +45 (red) ${units}; white is 0. Not a trend scale.`,
  },
  // All-sky surface sunlight, 0 to 400 W/m², dark violet → amber.
  V12: {
    stops: [[0, a(68, 1, 84)], [100, a(59, 82, 139)], [200, a(33, 145, 140)], [300, a(94, 201, 98)], [400, a(253, 231, 37)]],
    label: units => `Raw monthly value scale, 0 (violet) to 400 (amber) ${units}. Not a trend scale.`,
  },
};

export function fieldRamp(variable: string): Ramp | null {
  return RAMPS[variable] ?? null;
}

export function fieldColor(variable: string): (value: number) => Rgba {
  const ramp = RAMPS[variable];
  if (!ramp) throw new RangeError(`No field colour ramp for ${variable}`);
  return (value: number) => rampColor(ramp.stops, value);
}
