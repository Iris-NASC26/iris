// Presentation transforms only. No interpolation, trend fitting or significance tests.
import { deviation, type Datum } from '../model';

export type Quantity = 'observed' | 'departure' | 'standardized';
export interface LandscapeCell { month: number; year: number; value: number; row: Datum }
export interface SurfacePatch { points: number[][] }
export interface Landscape {
    cells: LandscapeCell[]; years: number[]; patches: SurfacePatch[];
    range: [number, number]; missing: number; reason: string;
    unit: string; description: string;
}
export const MAX_LANDSCAPE_YEARS = 150;
export const MAX_SURFACE_PATCHES = 100;

export function landscapeTooltipPoint(data: unknown): { x: number; y: number; value: number } | null {
    const raw = Array.isArray(data) ? data
        : data && typeof data === 'object' && 'value' in data ? data.value : null;
    if (!Array.isArray(raw) || ![raw[0], raw[1], raw[2]].every(
        value => typeof value === 'number' && Number.isFinite(value)
    )) return null;
    return { x: raw[0], y: raw[1], value: raw[2] };
}

export function landscape(rows: Datum[], cadence: string, quantity: Quantity, sourceUnit: string): Landscape {
    const unit = quantity === 'standardized' ? 'standard deviations' : sourceUnit === '1' ? 'dimensionless' : sourceUnit;
    const description = quantity === 'observed' ? 'Observed values in source units'
        : quantity === 'departure' ? 'Departure from each calendar month’s mean in the visible record; not a climate normal or backend seasonal adjustment'
        : 'Standardized using the visible record’s mean and sample standard deviation; unitless';
    const empty = (reason: string): Landscape => ({ cells: [], years: [], patches: [], range: [0, 1], missing: 0, unit, description, reason });
    if (cadence !== 'Monthly') return empty('The seasonal landscape requires monthly observations. Use the time series for this cadence; no monthly aggregation is performed here.');
    if (!rows.length) return empty('No observations in the visible period.');
    const seen = new Set<string>();
    for (const r of rows) {
        const d = new Date(r.time), key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
        if (!Number.isFinite(r.time) || (r.value !== null && !Number.isFinite(r.value))) return empty('The record contains invalid timestamps or values.');
        if (seen.has(key)) return empty('More than one observation occupies a calendar month. Use the time series; observations are not silently averaged.');
        seen.add(key);
    }
    const first = Math.min(...rows.map(r => new Date(r.time).getUTCFullYear()));
    const last = Math.max(...rows.map(r => new Date(r.time).getUTCFullYear()));
    if (last - first + 1 > MAX_LANDSCAPE_YEARS) return empty(`Limit the display window to ${MAX_LANDSCAPE_YEARS} years for the landscape.`);
    const valid = rows.filter(r => r.value !== null);
    if (!valid.length) return empty('No usable observations. Missing and excluded QA values stay empty.');
    const mean = valid.reduce((s, r) => s + r.value!, 0) / valid.length;
    const sd = deviation(rows);
    if (quantity === 'standardized' && (!sd || !Number.isFinite(sd))) return empty('Standardization needs at least two usable values with nonzero variance. Choose observed values instead.');
    const means = Array.from({ length: 12 }, (_, m) => {
        const values = valid.filter(r => new Date(r.time).getUTCMonth() === m);
        return values.length ? values.reduce((s, r) => s + r.value!, 0) / values.length : null;
    });
    const cells = valid.map(row => {
        const date = new Date(row.time), month = date.getUTCMonth(), year = date.getUTCFullYear();
        const value = quantity === 'observed' ? row.value! : quantity === 'departure' ? row.value! - means[month]! : (row.value! - mean) / sd!;
        return { month, year, value, row };
    });
    const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);
    const values = cells.map(c => c.value);
    let lo = Math.min(...values), hi = Math.max(...values);
    if (quantity !== 'observed') { const bound = Math.max(Math.abs(lo), Math.abs(hi), 0.001); lo = -bound; hi = bound; }
    else if (lo === hi) { const pad = Math.max(Math.abs(lo) * 0.01, 0.01); lo -= pad; hi += pad; }
    return { cells, years, patches: surfacePatches(cells, years), range: [lo, hi], missing: years.length * 12 - cells.length, reason: '', unit, description };
}

// Partition complete adjacent quads into rectangles. A surface can never bridge
// an absent month/year. Isolated observations remain separate scatter points.
export function surfacePatches(cells: LandscapeCell[], years: number[]): SurfacePatch[] {
    const grid = new Map(cells.map(c => [`${c.year}:${c.month}`, c.value]));
    const rectangles: { start: number; end: number; left: number; right: number }[] = [];
    let active = new Map<string, typeof rectangles[number]>();
    for (let y = 0; y < years.length - 1; y++) {
        const next = new Map<string, typeof rectangles[number]>();
        let m = 0;
        const quad = (n: number) => [years[y], years[y + 1]].every(year => grid.has(`${year}:${n}`) && grid.has(`${year}:${n + 1}`));
        while (m < 11) {
            if (!quad(m)) { m++; continue; }
            const left = m;
            while (m < 11 && quad(m)) m++;
            const key = `${left}:${m}`, prior = active.get(key);
            const rect = prior ?? { start: years[y], end: years[y + 1], left, right: m };
            rect.end = years[y + 1];
            if (!prior) rectangles.push(rect);
            next.set(key, rect);
        }
        active = next;
    }
    return rectangles.map(r => ({ points: Array.from({ length: r.end - r.start + 1 }, (_, yi) =>
        Array.from({ length: r.right - r.left + 1 }, (_, mi) => [r.left + mi, r.start + yi, grid.get(`${r.start + yi}:${r.left + mi}`)!])).flat() }));
}
