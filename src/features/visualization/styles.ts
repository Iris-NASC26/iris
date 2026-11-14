/** Presentation-only field styling. Pure; no renderer imports. Styling never alters source values. */
import { FIELD_SCALE, numeric, scale, type SpatialField } from "./model";

export interface ColourRamp {
    id: string;
    name: string;
    note: string;
    diverging: boolean;
    /** Sequential/diverging RGB stops, low → high. */
    stops: [number, number, number][];
}

export const RAMPS: ColourRamp[] = [
    {
        id: "thermal",
        name: "Thermal (Iris)",
        note: "Blue–teal–yellow sequential ramp for raw values.",
        diverging: false,
        stops: [[38, 64, 127], [27, 151, 139], [246, 223, 118]],
    },
    {
        id: "viridis",
        name: "Viridis (colour-safe)",
        note: "Perceptually uniform sequential ramp, safe for common colour-vision deficiency.",
        diverging: false,
        stops: [[68, 1, 84], [49, 104, 142], [53, 183, 121], [253, 231, 37]],
    },
    {
        id: "magma",
        name: "Magma (colour-safe)",
        note: "Perceptually uniform dark-to-bright sequential ramp.",
        diverging: false,
        stops: [[0, 0, 4], [87, 16, 110], [188, 55, 84], [249, 142, 9], [252, 253, 191]],
    },
    {
        id: "coolwarm",
        name: "Blue–red diverging",
        note: "Zero-centred diverging ramp. Only meaningful for anomaly/difference fields — raw variables do not share one 'zero'.",
        diverging: true,
        stops: [[59, 76, 192], [221, 221, 221], [180, 4, 38]],
    },
];

export const DEFAULT_RAMP = "thermal";

export type RangeMode = "fixed" | "auto" | "custom";
export interface FieldStyle {
    rampId: string;
    rangeMode: RangeMode;
    /** Custom domain when rangeMode === 'custom'. */
    custom?: [number, number] | null;
}
export const DEFAULT_STYLE: FieldStyle = { rampId: DEFAULT_RAMP, rangeMode: "fixed", custom: null };

export function ramp(id: string): ColourRamp {
    return RAMPS.find(r => r.id === id) ?? RAMPS[0];
}

/**
 * Resolve the displayed colour domain for a field.
 * - fixed: the variable's documented physical scale (consistent across months/extents)
 * - auto: the loaded field's own value range (labelled 'current loaded field')
 * - custom: the user's explicit domain, falling back to fixed
 * Diverging ramps centre the domain on zero when the data supports it.
 */
export function styleRange(field: Pick<SpatialField, "variable_id" | "values">, style: FieldStyle): [number, number] {
    let domain: [number, number];
    if (style.rangeMode === "auto")
        domain = scale(field.values);
    else if (style.rangeMode === "custom" && style.custom && style.custom.every(numeric) && style.custom[0] < style.custom[1])
        domain = style.custom;
    else
        domain = FIELD_SCALE[field.variable_id] ?? scale(field.values);
    if (ramp(style.rampId).diverging && domain[0] < 0 && domain[1] > 0) {
        const bound = Math.max(Math.abs(domain[0]), Math.abs(domain[1]));
        return [-bound, bound];
    }
    return domain;
}

/** Human description of what an automatic range represents — never ambiguous. */
export function rangeLabel(style: FieldStyle, variableId: string): string {
    if (style.rangeMode === "auto")
        return "Automatic range: fitted to the currently loaded field only — it can differ between months and extents.";
    if (style.rangeMode === "custom")
        return "Custom range: the entered bounds are used until reset.";
    return `Fixed physical scale (${FIELD_SCALE[variableId]?.[0] ?? "?"} to ${FIELD_SCALE[variableId]?.[1] ?? "?"} source units) — identical for every month and extent.`;
}

/** Map a value into a ramp colour; values outside the domain clamp at the ends. */
export function rampColor(value: number, range: [number, number], selected: ColourRamp): string {
    const t = Math.max(0, Math.min(1, (value - range[0]) / (range[1] - range[0])));
    const stops = selected.stops;
    const scaled = t * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(scaled));
    const u = scaled - i;
    const a = stops[i], b = stops[i + 1];
    return "#" + a.map((v, c) => Math.round(v + (b[c] - v) * u).toString(16).padStart(2, "0")).join("");
}

/** CSS gradient for the legend, matching rampColor exactly. */
export function rampGradient(selected: ColourRamp): string {
    const stops = selected.stops.map((c, i) =>
        `rgb(${c.join(",")}) ${(i / (selected.stops.length - 1) * 100).toFixed(1)}%`);
    return `linear-gradient(90deg,${stops.join(",")})`;
}
