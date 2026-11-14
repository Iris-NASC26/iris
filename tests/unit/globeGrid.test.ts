import { expect, it } from 'vitest';
import { CELL_COUNT, cellCenter, cellCorners, cellIndexFromLatLon, toCartesian, wrapLongitude } from '../../src/features/globe/renderer/grid';
import { createSyntheticField, syntheticColor } from '../../src/features/globe/renderer/syntheticField';

it('has exactly 64,800 one-degree cells', () => { expect(CELL_COUNT).toBe(64800); });

it('maps points to the cell that owns their south and west edges', () => {
  expect(cellIndexFromLatLon(-90, -180)).toBe(0);
  expect(cellIndexFromLatLon(0.2, 0.2)).toBe(90 * 360 + 180);
  expect(cellIndexFromLatLon(-0.2, -0.2)).toBe(89 * 360 + 179);
  expect(cellIndexFromLatLon(90, 180)).toBe(CELL_COUNT - 1 - 359);
  expect(cellIndexFromLatLon(89.5, 179.9)).toBe(CELL_COUNT - 1);
});

it('wraps longitude across the dateline and rejects impossible latitude', () => {
  expect(wrapLongitude(190)).toBe(-170);
  expect(wrapLongitude(-181)).toBe(179);
  expect(cellIndexFromLatLon(10.5, 185)).toBe(cellIndexFromLatLon(10.5, -175));
  expect(cellIndexFromLatLon(91, 0)).toBeNull();
  expect(cellIndexFromLatLon(Number.NaN, 0)).toBeNull();
});

it('round-trips every cell centre and keeps corners inside the cell', () => {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const { lat, lon } = cellCenter(index);
    if (cellIndexFromLatLon(lat, lon) !== index) throw new Error(`cell ${index} did not round-trip`);
  }
  const [sw, se, ne, nw] = cellCorners(90 * 360 + 180);
  expect([sw, se, ne, nw]).toEqual([{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 1, lon: 1 }, { lat: 1, lon: 0 }]);
  expect(() => cellCenter(CELL_COUNT)).toThrow(RangeError);
});

it('uses the three-globe axis convention', () => {
  const [x, y, z] = toCartesian(0, 0, 100);
  expect([x, y, z].map(Math.round)).toEqual([0, 0, 100]);
  expect(toCartesian(90, 0, 100)[1]).toBeCloseTo(100);
  expect(toCartesian(0, 90, 100)[0]).toBeCloseTo(100);
});

it('keeps the synthetic benchmark field deterministic, partly missing and visibly test-only', () => {
  const first = createSyntheticField(), second = createSyntheticField();
  expect(first).toHaveLength(CELL_COUNT);
  expect(Array.from(first.slice(0, 2000))).toEqual(Array.from(second.slice(0, 2000)));
  const missing = first.filter(Number.isNaN).length;
  expect(missing).toBeGreaterThan(CELL_COUNT * 0.01);
  expect(missing).toBeLessThan(CELL_COUNT * 0.06);
  expect(syntheticColor(Number.NaN)[3]).toBe(0);
  expect(syntheticColor(0)[3]).toBeGreaterThan(0);
});
