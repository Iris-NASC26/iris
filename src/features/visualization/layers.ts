/**
 * Layer model for the map-centred workspace. Pure; no renderer imports.
 * Order is top → bottom. Only the two imagery layers (field, basemap) can
 * exchange z-order; vector overlays always render above imagery — the model
 * records intent honestly rather than faking unsupported reordering.
 */

export type LayerId = "field" | "points" | "extent" | "basemap";

export interface LayerDef {
    id: LayerId;
    name: string;
    group: string;
    /** Where the layer draws; imagery layers can be reordered against each other. */
    stack: "imagery" | "overlay";
}

export const LAYER_DEFS: LayerDef[] = [
    { id: "field", name: "Scientific field", group: "Data layers", stack: "imagery" },
    { id: "points", name: "Observation points", group: "Data layers", stack: "overlay" },
    { id: "extent", name: "Requested extent outline", group: "Overlays", stack: "overlay" },
    { id: "basemap", name: "NASA GIBS basemap", group: "Basemap", stack: "imagery" },
];

/** Top → bottom. */
export const DEFAULT_ORDER: LayerId[] = ["points", "extent", "field", "basemap"];

export function moveLayer(order: LayerId[], id: LayerId, direction: -1 | 1): LayerId[] {
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length)
        return order;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
}

/**
 * Imagery draw order for the engine (0 = bottom). Overlay entries return -1 —
 * they are primitives/entities, always above imagery.
 */
export function imageryIndex(order: LayerId[], id: LayerId): number {
    const def = LAYER_DEFS.find(d => d.id === id);
    if (!def || def.stack !== "imagery")
        return -1;
    const imagery = order.filter(l => LAYER_DEFS.find(d => d.id === l)?.stack === "imagery");
    // order is top→bottom; imagery index counts from the bottom.
    return imagery.length - 1 - imagery.indexOf(id);
}
