/** Pure mapping from a numeric field contract to raster pixels. No renderer imports. */
import { color, fieldScale, numeric, type SpatialField } from "./model";
import { ramp, rampColor, styleRange, type FieldStyle } from "./styles";

type Grid = Pick<SpatialField, "cell_lats" | "cell_lons" | "lat_step" | "lon_step" | "values" | "variable_id">;

export interface RasterRect { west: number; south: number; east: number; north: number }

/** Geographic footprint covered by the cell edges, in degrees. */
export function fieldRectangle(field: Grid): RasterRect {
    const lats = field.cell_lats, lons = field.cell_lons;
    return {
        west: Math.max(-180, lons[0] - field.lon_step / 2),
        east: Math.min(180, lons[lons.length - 1] + field.lon_step / 2),
        south: Math.max(-90, lats[0] - field.lat_step / 2),
        north: Math.min(90, lats[lats.length - 1] + field.lat_step / 2),
    };
}

function hexRgb(hex: string): [number, number, number] {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/**
 * One image pixel per output cell. Row 0 is the northernmost latitude band so a
 * north-up equirectangular texture registers exactly on the cell edges.
 * Missing/invalid cells are fully transparent — never painted as zero.
 */
export function fieldToRgba(field: Grid, alpha = 0.93, style?: FieldStyle): { width: number; height: number; data: Uint8ClampedArray<ArrayBuffer> } {
    const width = field.cell_lons.length, height = field.cell_lats.length;
    const data = new Uint8ClampedArray(width * height * 4);
    const range = style ? styleRange(field, style) : fieldScale(field);
    const selected = style ? ramp(style.rampId) : null;
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    for (let r = 0; r < height; r++) {
        const row = height - 1 - r; // cell_lats ascend; image rows descend from north
        for (let c = 0; c < width; c++) {
            const v = field.values[row * width + c];
            if (!numeric(v)) continue; // transparent
            const [red, green, blue] = hexRgb(selected ? rampColor(v, range, selected) : color(v, range));
            const i = (r * width + c) * 4;
            data[i] = red; data[i + 1] = green; data[i + 2] = blue; data[i + 3] = a;
        }
    }
    return { width, height, data };
}

/** Numeric cell lookup for inspection: nearest centre within half a native step. */
export function cellAt(field: Grid, lat: number, lon: number): { value: number | null; lat: number; lon: number } | null {
    const r = field.cell_lats.findIndex(x => Math.abs(x - lat) <= field.lat_step / 2 + 1e-9);
    const c = field.cell_lons.findIndex(x => Math.abs(x - lon) <= field.lon_step / 2 + 1e-9);
    if (r < 0 || c < 0) return null;
    return { value: field.values[r * field.cell_lons.length + c], lat: field.cell_lats[r], lon: field.cell_lons[c] };
}
