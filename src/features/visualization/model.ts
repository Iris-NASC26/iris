/** Pure visualization transforms. No inferential statistics or generated observations. */
import type { ObservationRow, PreviewResponse } from "@/lib/dataRetrievalEngine";
import { isSpatialVariableId, SPATIAL_VARIABLES, spatialVariable, type SpatialVariableId } from "./spatialVariables";
export const COLORS = ["#00a981", "#5089ed", "#d78837", "#b57ade", "#de6b86", "#49a5b6"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MAX_SERIES = 6;
export const MAX_ROWS = 50000;
export interface VisualSeries {
    id: string;
    label: string;
    preview: PreviewResponse;
    color: string;
}
export interface Datum {
    timestamp: string;
    time: number;
    value: number | null;
    sourceValue?: number | null;
    qa: ObservationRow["qa_flag"];
}
export interface FieldData {
    schema_version: "visualization.field.v1";
    variable_id: SpatialVariableId;
    month: string;
    field: string;
    units: string;
    source_units: string;
    time_standard: string;
    cell_lats: number[];
    cell_lons: number[];
    lat_step: number;
    lon_step: number;
    values: (number | null)[];
    source: {
        url: string;
        title: string;
        version: string;
        retrieved_at: string;
        artifact_sha256: Record<string, string>;
        from_cache: boolean;
        stale_cache: boolean;
        caveats: string[];
        acknowledgement: string;
        scientifically_validated: false;
    };
}
export interface OverviewData extends Omit<FieldData, "schema_version"> {
    schema_version: "visualization.overview.v1";
    extent: { lat_min: number; lat_max: number; lon_min: number; lon_max: number };
    resolution: {
        source_lat_step: number;
        source_lon_step: number;
        aggregation: "none" | "area_weighted_mean";
        factor_lat: number;
        factor_lon: number;
        output_cells: number;
    };
    coverage?: (number | null)[];
}
export type SpatialField = FieldData | OverviewData;
export const MAX_OVERVIEW_CELLS = 25000;
/**
 * Fixed labelled physical domains so temporal and regional comparisons keep one
 * consistent colour meaning. Values outside the domain clamp at the ramp ends.
 */
export const FIELD_SCALE: Record<string, [number, number]> = Object.fromEntries(
    SPATIAL_VARIABLES.map(variable => [variable.id, variable.range as [number, number]])
);
export function fieldScale(field: Pick<SpatialField, "variable_id" | "values">): [number, number] {
    return FIELD_SCALE[field.variable_id] ?? scale(field.values);
}
export const numeric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export function timestamp(value: string): number {
    if (!/^\d{4}(-\d{2}(-\d{2})?)?([T ].*)?$/.test(value))
        throw new Error("Unsupported observation timestamp.");
    if (value.includes(' '))
        throw new Error('Use an explicit ISO timestamp with time zone.');
    const datePart = value.split('T')[0];
    const normalized = datePart.length === 4 ? `${datePart}-01-01` : datePart.length === 7 ? `${datePart}-01` : datePart;
    const time = Date.parse(`${normalized}T00:00:00Z`);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== normalized)
        throw new Error("Invalid calendar date.");
    if (value.includes("T")) {
        if (!/(Z|[+-]\d{2}:\d{2})$/.test(value))
            throw new Error("Timestamp must declare its time zone.");
        const precise = Date.parse(value);
        if (!Number.isFinite(precise))
            throw new Error("Invalid observation timestamp.");
        return precise;
    }
    return time;
}
export function parsePreview(value: unknown): PreviewResponse {
    const p = value as PreviewResponse | null;
    if (!p || p.status !== "completed" || typeof p.job_id !== "string" || !p.job_id ||
        !p.product?.product_id || !p.product.variable_id || !p.product.source_api ||
        !p.extraction_config || typeof p.extraction_config.region_name !== "string" ||
        !Array.isArray(p.chart_series) || p.chart_series.length > MAX_ROWS ||
        !p.summary_stats || typeof p.summary_stats.unit !== "string")
        throw new Error("The extraction service returned an incomplete visualization result.");
    if (p.upstream_live_fetched !== true && !(p.provenance_mode === "cached_real" && /^[a-f0-9]{64}$/i.test(p.sha256_hash ?? ""))) {
        throw new Error("A live extraction or identifiable cached-real result is required. Prototype snapshots are not plotted.");
    }
    if (p.total_rows !== p.chart_series.length)
        throw new Error("The chart result is incomplete; retrieve the full observation series before plotting.");
    const seen = new Set<number>();
    for (const row of p.chart_series) {
        const time = timestamp(row.timestamp);
        if (seen.has(time))
            throw new Error("Duplicate observation timestamps must be resolved by the source service.");
        seen.add(time);
        if (!(row.value === null || numeric(row.value)) || !["Valid", "Missing", "Flagged", "Interpolated"].includes(row.qa_flag) ||
            row.unit !== p.summary_stats.unit || row.variable_id !== p.extraction_config.variable_id)
            throw new Error("Observation units, values or quality flags do not match the selected result.");
    }
    const loc = coordinates(p);
    if (!loc || Math.abs(loc.lat) > 90 || Math.abs(loc.lon) > 180)
        throw new Error("The source result has no valid geographic location.");
    return p;
}
export function coordinates(p: PreviewResponse): {
    lat: number;
    lon: number;
    representative: boolean;
} | null {
    const c = p.extraction_config;
    const representative = c.spatial_Submode !== "point";
    if (!representative && numeric(c.point_lat) && numeric(c.point_lon))
        return { lat: c.point_lat, lon: c.point_lon, representative };
    if (Array.isArray(c.bbox) && c.bbox.length === 4 && c.bbox.every(numeric))
        return { lat: (c.bbox[1] + c.bbox[3]) / 2, lon: (c.bbox[0] + c.bbox[2]) / 2, representative: true };
    return null;
}
export function rows(p: PreviewResponse, start = "", end = "", includeFlagged = false): Datum[] {
    const from = start ? timestamp(start) : -Infinity, to = end ? timestamp(end) + 86400000 - 1 : Infinity;
    return p.chart_series.map(row => ({ timestamp: row.timestamp, time: timestamp(row.timestamp),
        sourceValue: row.value, value: row.qa_flag === "Valid" || (includeFlagged && row.qa_flag === "Flagged") ? row.value : null, qa: row.qa_flag }))
        .filter(row => row.time >= from && row.time <= to).sort((a, b) => a.time - b.time);
}
export function summary(data: Datum[]) {
    const finite = data.filter((r): r is Datum & {
        value: number;
    } => r.value !== null);
    if (!finite.length)
        return { count: 0, missing: data.length, mean: null, min: null, max: null, first: null, last: null, change: null };
    const values = finite.map(r => r.value);
    return { count: finite.length, missing: data.length - finite.length, mean: values.reduce((a, b) => a + b, 0) / values.length,
        min: values.reduce((a, b) => Math.min(a, b)), max: values.reduce((a, b) => Math.max(a, b)), first: finite[0], last: finite.at(-1)!, change: finite.at(-1)!.value - finite[0].value };
}
export function deviation(data: Datum[]): number | null {
    const finite = data.filter((r): r is Datum & {
        value: number;
    } => r.value !== null);
    if (finite.length < 2)
        return null;
    const mean = finite.reduce((a, r) => a + r.value, 0) / finite.length;
    return Math.sqrt(finite.reduce((s, r) => s + (r.value - mean) ** 2, 0) / (finite.length - 1));
}
export function hasGap(a: number, b: number, cadence: string): boolean {
    const x = new Date(a), y = new Date(b), months = (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + y.getUTCMonth() - x.getUTCMonth();
    if (cadence === "Monthly")
        return months > 1;
    if (cadence === "Seasonal")
        return months > 3;
    if (cadence === "Yearly")
        return months > 12;
    const step = cadence === "8-Day" ? 8 : cadence === "16-Day" ? 16 : 1;
    return b - a > step * 86400000 * 1.01;
}
export function lineData(data: Datum[], cadence: string): [
    number,
    number | null
][] {
    const result: [
        number,
        number | null
    ][] = [];
    data.forEach((r, i) => { if (i && hasGap(data[i - 1].time, r.time, cadence))
        result.push([data[i - 1].time + 1, null]); result.push([r.time, r.value]); });
    return result;
}
export function standardize(data: Datum[]): Datum[] {
    const s = summary(data);
    if (s.mean === null)
        return data;
    const variance = data.reduce((sum, r) => sum + (r.value === null ? 0 : (r.value - s.mean!) ** 2), 0) / Math.max(1, s.count - 1);
    const deviation = Math.sqrt(variance);
    return data.map(r => ({ ...r, value: r.value === null ? null : deviation === 0 ? 0 : (r.value - s.mean!) / deviation }));
}
export function calendar(data: Datum[]) {
    const groups = Array.from({ length: 12 }, () => [] as number[]);
    for (const row of data)
        if (row.value !== null)
            groups[new Date(row.time).getUTCMonth()].push(row.value);
    return groups.map((values, month) => ({ month, count: values.length, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null }));
}
export function monthlyCells(data: Datum[]) {
    const byMonth = new Map<string, number[]>();
    for (const row of data)
        if (row.value !== null) {
            const key = new Date(row.time).toISOString().slice(0, 7);
            const a = byMonth.get(key) ?? [];
            a.push(row.value);
            byMonth.set(key, a);
        }
    const profile = calendar(data);
    return [...byMonth].map(([key, values]) => { const mean = values.reduce((a, b) => a + b, 0) / values.length; const month = Number(key.slice(5)) - 1; return { year: key.slice(0, 4), month, mean, anomaly: mean - profile[month].mean!, count: values.length }; });
}
export function histogram(data: Datum[], bins = 12) {
    const values = data.flatMap(r => r.value === null ? [] : [r.value]);
    if (!values.length)
        return [];
    const low = values.reduce((a, b) => Math.min(a, b)), high = values.reduce((a, b) => Math.max(a, b));
    if (low === high)
        return [{ low, high, count: values.length }];
    const width = (high - low) / bins;
    const result = Array.from({ length: bins }, (_, i) => ({ low: low + i * width, high: low + (i + 1) * width, count: 0 }));
    values.forEach(v => result[Math.min(bins - 1, Math.floor((v - low) / width))].count++);
    return result;
}
export function paired(a: Datum[], b: Datum[]): [
    number,
    number,
    string
][] {
    const lookup = new Map(b.filter(r => r.value !== null).map(r => [r.time, r.value!]));
    return a.flatMap(r => r.value !== null && lookup.has(r.time) ? [[r.value, lookup.get(r.time)!, r.timestamp] as [
            number,
            number,
            string
        ]] : []);
}
export function scale(values: (number | null)[], symmetric = false): [
    number,
    number
] {
    const finite = values.filter(numeric);
    if (!finite.length)
        return [0, 1];
    let low = finite.reduce((a, b) => Math.min(a, b)), high = finite.reduce((a, b) => Math.max(a, b));
    if (symmetric) {
        const bound = Math.max(Math.abs(low), Math.abs(high)) || 1;
        return [-bound, bound];
    }
    if (low === high) {
        low -= 0.5;
        high += 0.5;
    }
    return [low, high];
}
/** Blue/teal/yellow sequential raw-value ramp, not a significance or trend scale. */
export function color(value: number, range: [
    number,
    number
]): string {
    const t = Math.max(0, Math.min(1, (value - range[0]) / (range[1] - range[0])));
    const stops = [[38, 64, 127], [27, 151, 139], [246, 223, 118]];
    const a = t <= 0.5 ? stops[0] : stops[1], b = t <= 0.5 ? stops[1] : stops[2], u = t <= 0.5 ? t * 2 : (t - 0.5) * 2;
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * u).toString(16).padStart(2, '0')).join('');
}
function validateSpatialBinding(field: FieldData | OverviewData): void {
    const expected = spatialVariable(field.variable_id);
    if (field.field !== expected.field || field.source_units !== expected.source_units
        || ![expected.units, expected.source_units].includes(field.units)
        || field.time_standard !== (expected.family === 'syn1deg' ? 'LST' : 'UTC'))
        throw new Error("Spatial variable, units or time standard do not match the NASA source binding.");
}
export function parseField(value: unknown): FieldData {
    const f = value as FieldData;
    if (f?.schema_version !== "visualization.field.v1" || !isSpatialVariableId(f.variable_id) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(f.month) ||
        !Array.isArray(f.cell_lats) || !Array.isArray(f.cell_lons) || !Array.isArray(f.values) || !f.cell_lats.length || !f.cell_lons.length ||
        f.values.length !== f.cell_lats.length * f.cell_lons.length || f.values.length > 4000 || !numeric(f.lat_step) || !numeric(f.lon_step) || f.lat_step <= 0 || f.lon_step <= 0 ||
        !f.cell_lats.every(v => numeric(v) && Math.abs(v) <= 90) || !f.cell_lons.every(v => numeric(v) && Math.abs(v) <= 180) ||
        !f.values.every(v => v === null || numeric(v)) || f.source?.scientifically_validated !== false || !f.units || !f.source.artifact_sha256 ||
        Object.values(f.source.artifact_sha256).some(v => !/^[a-f0-9]{64}$/.test(v)))
        throw new Error("The spatial service returned an incompatible native grid.");
    if (f.cell_lats.some((v, i) => i > 0 && v <= f.cell_lats[i - 1]) || f.cell_lons.some((v, i) => i > 0 && v <= f.cell_lons[i - 1]))
        throw new Error("Spatial axes must be strictly increasing.");
    validateSpatialBinding(f);
    return f;
}
export function parseOverview(value: unknown): OverviewData {
    const f = value as OverviewData;
    if (f?.schema_version !== "visualization.overview.v1" || !isSpatialVariableId(f.variable_id) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(f.month) ||
        !Array.isArray(f.cell_lats) || !Array.isArray(f.cell_lons) || !Array.isArray(f.values) || !f.cell_lats.length || !f.cell_lons.length ||
        f.values.length !== f.cell_lats.length * f.cell_lons.length || f.values.length > MAX_OVERVIEW_CELLS || !numeric(f.lat_step) || !numeric(f.lon_step) || f.lat_step <= 0 || f.lon_step <= 0 ||
        !f.cell_lats.every(v => numeric(v) && Math.abs(v) <= 90) || !f.cell_lons.every(v => numeric(v) && Math.abs(v) <= 180) ||
        !f.values.every(v => v === null || numeric(v)) || f.source?.scientifically_validated !== false || !f.units || !f.source.artifact_sha256 ||
        Object.values(f.source.artifact_sha256).some(v => !/^[a-f0-9]{64}$/.test(v)))
        throw new Error("The spatial service returned an incompatible overview grid.");
    if (f.cell_lats.some((v, i) => i > 0 && v <= f.cell_lats[i - 1]) || f.cell_lons.some((v, i) => i > 0 && v <= f.cell_lons[i - 1]))
        throw new Error("Spatial axes must be strictly increasing.");
    const e = f.extent, r = f.resolution;
    if (!e || !numeric(e.lat_min) || !numeric(e.lat_max) || !numeric(e.lon_min) || !numeric(e.lon_max) ||
        !r || !numeric(r.source_lat_step) || !numeric(r.source_lon_step) || r.source_lat_step <= 0 || r.source_lon_step <= 0 ||
        !["none", "area_weighted_mean"].includes(r.aggregation) || !Number.isInteger(r.factor_lat) || !Number.isInteger(r.factor_lon) ||
        r.factor_lat < 1 || r.factor_lon < 1 || r.output_cells !== f.values.length)
        throw new Error("The overview extent or resolution manifest is inconsistent.");
    if (r.aggregation === "none" && (r.factor_lat !== 1 || r.factor_lon !== 1
        || Math.abs(r.source_lat_step - f.lat_step) > 1e-9 || Math.abs(r.source_lon_step - f.lon_step) > 1e-9))
        throw new Error("An unaggregated overview must keep the native source resolution.");
    if (f.coverage !== undefined && (!Array.isArray(f.coverage) || f.coverage.length !== f.values.length ||
        !f.coverage.every(v => v === null || (numeric(v) && v >= 0 && v <= 1))))
        throw new Error("Overview coverage weights must match the output cells.");
    validateSpatialBinding(f);
    return f;
}
export function isOverview(field: SpatialField): field is OverviewData {
    return field.schema_version === "visualization.overview.v1";
}
export const format = (value: number | null, digits = 2) => value === null ? "Unavailable" : new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(value);
export const csvCell = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
