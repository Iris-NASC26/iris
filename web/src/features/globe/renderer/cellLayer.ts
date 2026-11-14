/** One batched, indexed mesh for the whole 1° grid: 64,800 quads, one draw call, exact cell corners.
 * Numeric values stay in typed arrays; this layer holds only display colours. Relief, significance
 * channels and no-data hatching belong to U08.
 */
import * as THREE from 'three';
import { CELL_COUNT, GLOBE_RADIUS, cellCorners, toCartesian } from './grid';

export type Rgba = [number, number, number, number];

export interface CellLayer {
  readonly mesh: THREE.Mesh;
  readonly cellCount: number;
  paint(values: Float32Array, colorFor: (value: number) => Rgba): void;
  dispose(): void;
}

export function createCellLayer(radius = GLOBE_RADIUS * 1.002): CellLayer {
  const positions = new Float32Array(CELL_COUNT * 4 * 3);
  const colors = new Float32Array(CELL_COUNT * 4 * 4);
  const indices = new Uint32Array(CELL_COUNT * 6);
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    cellCorners(cell).forEach((corner, k) => positions.set(toCartesian(corner.lat, corner.lon, radius), (cell * 4 + k) * 3));
    const v = cell * 4;
    indices.set([v, v + 1, v + 2, v, v + 2, v + 3], cell * 6);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const colorAttribute = new THREE.BufferAttribute(colors, 4);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('color', colorAttribute);
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.name = 'iris-1deg-cell-layer';
  return {
    mesh, cellCount: CELL_COUNT,
    paint(values, colorFor) {
      if (values.length !== CELL_COUNT) throw new RangeError(`Expected ${CELL_COUNT} cell values`);
      for (let cell = 0; cell < CELL_COUNT; cell++) {
        const rgba = colorFor(values[cell]);
        for (let k = 0; k < 4; k++) colors.set(rgba, (cell * 4 + k) * 4);
      }
      colorAttribute.needsUpdate = true;
    },
    dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
