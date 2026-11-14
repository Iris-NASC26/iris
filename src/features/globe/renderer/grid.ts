/** One-degree global grid geometry. Row 0 is -90..-89 latitude and column 0 is -180..-179 longitude.
 * Index = row * COLS + col. Pure functions only so picking and geometry stay independently testable.
 */
export const ROWS = 180;
export const COLS = 360;
export const CELL_COUNT = ROWS * COLS;

export interface GeoPoint { lat: number; lon: number }

export function wrapLongitude(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Cells own their south/west edges; 90°N belongs to the last row. Non-finite or out-of-range latitude gives null. */
export function cellIndexFromLatLon(lat: number, lon: number): number | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90) return null;
  const row = Math.min(ROWS - 1, Math.floor(lat + 90));
  const col = Math.min(COLS - 1, Math.floor(wrapLongitude(lon) + 180));
  return row * COLS + col;
}

export function cellCenter(index: number): GeoPoint {
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) throw new RangeError('Cell index outside the 1° grid');
  return { lat: Math.floor(index / COLS) - 90 + 0.5, lon: (index % COLS) - 180 + 0.5 };
}

/** Corners in south-west, south-east, north-east, north-west order. */
export function cellCorners(index: number): GeoPoint[] {
  const { lat, lon } = cellCenter(index);
  return [{ lat: lat - 0.5, lon: lon - 0.5 }, { lat: lat - 0.5, lon: lon + 0.5 },
    { lat: lat + 0.5, lon: lon + 0.5 }, { lat: lat + 0.5, lon: lon - 0.5 }];
}

/** Same convention as three-globe: radius 100 units, longitude 0 on the +Z side, north on +Y. */
export const GLOBE_RADIUS = 100;
export function toCartesian(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (90 - lon) * Math.PI / 180;
  return [radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)];
}
