/** One batched quad mesh for a native-cell field box: one quad per cell at the cell's own
 * corners, painted by absolute-value colour. Missing cells are left fully transparent.
 */
import * as THREE from 'three';
import { GLOBE_RADIUS, toCartesian } from './grid';
import type { Rgba } from './cellLayer';

export interface FieldCells {
  lats: readonly number[];
  lons: readonly number[];
  latStep: number;
  lonStep: number;
  values: readonly (number | null)[];
}

export interface FieldLayer {
  readonly mesh: THREE.Mesh;
  readonly cellCount: number;
  readonly finiteCount: number;
  dispose(): void;
}

export function createFieldLayer(
  cells: FieldCells,
  colorFor: (value: number) => Rgba,
  radius = GLOBE_RADIUS * 1.004,
): FieldLayer {
  const count = cells.lats.length * cells.lons.length;
  if (cells.values.length !== count) throw new RangeError('Field values do not match the cell grid');
  const positions = new Float32Array(count * 4 * 3);
  const colors = new Float32Array(count * 4 * 4);
  const indices = new Uint32Array(count * 6);
  const halfLat = cells.latStep / 2, halfLon = cells.lonStep / 2;
  let finite = 0;
  let cell = 0;
  for (const lat of cells.lats) {
    for (const lon of cells.lons) {
      const corners: [number, number][] = [
        [lat - halfLat, lon - halfLon], [lat - halfLat, lon + halfLon],
        [lat + halfLat, lon + halfLon], [lat + halfLat, lon - halfLon],
      ];
      corners.forEach((corner, k) => positions.set(toCartesian(corner[0], corner[1], radius), (cell * 4 + k) * 3));
      const value = cells.values[cell];
      const rgba: Rgba = value === null ? [0, 0, 0, 0] : colorFor(value);
      if (value !== null) finite += 1;
      for (let k = 0; k < 4; k++) colors.set(rgba, (cell * 4 + k) * 4);
      const v = cell * 4;
      indices.set([v, v + 1, v + 2, v, v + 2, v + 3], cell * 6);
      cell += 1;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.name = 'power-field-layer';
  return { mesh, cellCount: count, finiteCount: finite, dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); } };
}
