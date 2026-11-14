/** Verified NASA POWER grid bindings shared with the Python spatial reader. */
import definitions from "../../../shared/spatial-variables.json" with { type: "json" };

export type SpatialVariableId = keyof typeof definitions;
export const SPATIAL_VARIABLES = Object.entries(definitions).map(([id, definition]) => ({
    id: id as SpatialVariableId, ...definition,
}));
export const SPATIAL_GROUPS = [...new Set(SPATIAL_VARIABLES.map(variable => variable.group))];
export function isSpatialVariableId(value: unknown): value is SpatialVariableId {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(definitions, value);
}
export function spatialVariable(id: SpatialVariableId) { return definitions[id]; }

