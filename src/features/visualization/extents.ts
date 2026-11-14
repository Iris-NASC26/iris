/** Spatial-extent model for the visualization globe. Pure; no renderer imports. */
import { REGION_PRESETS } from "@/lib/dataRetrievalEngine";
import { numeric } from "./model";

/** Requested box in [south, north, west, east] degrees (ordered, no dateline wrap). */
export type ExtentBox = [number, number, number, number];

export interface SpatialExtent {
    id: string;
    name: string;
    box: ExtentBox;
    note: string;
}
/** Documented bounding box only — never claimed to be a continental polygon. */
export const EUROPE_BOX: ExtentBox = [34, 72, -25, 45];
export const GLOBAL_BOX: ExtentBox = [-90, 90, -180, 180];

export const EXTENT_PRESETS: SpatialExtent[] = [
    {
        id: "global",
        name: "Entire globe",
        box: GLOBAL_BOX,
        note: "Full dataset coverage. Served through the documented-aggregation overview path; coarse cells are labelled.",
    },
    {
        id: "europe",
        name: "Europe — bounding box",
        box: EUROPE_BOX,
        note: "Rectangular extent 34°N–72°N, 25°W–45°E. It frames Europe but is not a continental or administrative polygon.",
    },
    ...REGION_PRESETS.map(r => ({
        id: `region-${r.id}`,
        name: r.name,
        box: [r.bbox[1], r.bbox[3], r.bbox[0], r.bbox[2]] as ExtentBox,
        note: r.subtitle,
    })),
    { id: "custom", name: "Custom bounding box", box: [0, 1, 0, 1], note: "Edit the latitude/longitude bounds directly." },
];

/** Native grid steps per variable, verified against the source .zarray/.zattrs metadata. */
export const NATIVE_STEP: Record<string, { lat: number; lon: number }> = {
    V01: { lat: 0.5, lon: 0.625 },
    V12: { lat: 1, lon: 1 },
};

export function parseBox(values: string[]): ExtentBox | null {
    const b = values.map(Number);
    if (values.some(v => !v.trim()) || !b.every(numeric) || b[0] >= b[1] || b[2] >= b[3]
        || b[0] < -90 || b[1] > 90 || b[2] < -180 || b[3] > 180)
        return null;
    return [b[0], b[1], b[2], b[3]];
}

export function estimateNativeCells(box: ExtentBox, variable: string): number {
    const step = NATIVE_STEP[variable] ?? NATIVE_STEP.V01;
    const lats = Math.floor((box[1] - box[0]) / step.lat);
    const lons = Math.floor((box[3] - box[2]) / step.lon);
    return lats * lons;
}

/** Native /field reads are capped at 4,000 cells; larger extents use the overview path. */
export const NATIVE_FIELD_CELL_LIMIT = 4000;
export function fieldRoute(box: ExtentBox, variable: string): "field" | "overview" {
    return estimateNativeCells(box, variable) <= NATIVE_FIELD_CELL_LIMIT ? "field" : "overview";
}

export function boxCentre(box: ExtentBox): { lat: number; lon: number } {
    return { lat: (box[0] + box[1]) / 2, lon: (box[2] + box[3]) / 2 };
}

export function sameBox(a: ExtentBox, b: ExtentBox): boolean {
    return a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
}
