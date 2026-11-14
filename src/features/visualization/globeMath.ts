/** Equirectangular texture / Three SphereGeometry coordinate convention. */
export function vector(lat: number, lon: number, radius = 1): [
    number,
    number,
    number
] {
    const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
    return [radius * Math.cos(a) * Math.cos(b), radius * Math.sin(a), -radius * Math.cos(a) * Math.sin(b)];
}
export function location(x: number, y: number, z: number): {
    lat: number;
    lon: number;
} {
    const r = Math.hypot(x, y, z);
    return { lat: Math.asin(Math.max(-1, Math.min(1, y / r))) * 180 / Math.PI, lon: Math.atan2(-z, x) * 180 / Math.PI };
}
