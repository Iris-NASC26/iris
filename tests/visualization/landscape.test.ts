import test from 'node:test';
import assert from 'node:assert/strict';
import { landscape } from '../../src/features/visualization/landscape/model.ts';
import { timestamp, type Datum } from '../../src/features/visualization/model.ts';
// Hand-computable synthetic test values. Never imported by the application.
const row = (date: string, value: number | null): Datum => ({ timestamp: date, time: timestamp(date), value, qa: value === null ? 'Missing' : 'Valid' });

test('landscape preserves source units, zeros, negatives and missing months', () => {
    const rows = [row('2020-01', 0), row('2020-02', null), row('2021-01', -2)];
    const m = landscape(rows, 'Monthly', 'observed', 'C');
    assert.deepEqual(m.cells.map(c => c.value), [0, -2]); assert.equal(m.missing, 22);
    assert.equal(m.unit, 'C'); assert.equal(m.patches.length, 0); assert.deepEqual(m.years, [2020, 2021]);
    assert.equal(rows[1].value, null);
});
test('departures subtract only the matching calendar-month mean', () => {
    const m = landscape([row('2020-01', 1), row('2021-01', 3), row('2021-02', 5)], 'Monthly', 'departure', 'C');
    assert.deepEqual(m.cells.map(c => c.value), [-1, 1, 0]); assert.deepEqual(m.range, [-1, 1]);
    assert.match(m.description, /not a climate normal/);
});
test('standardization uses the sample deviation, not a climate baseline', () => {
    const m = landscape([row('2020-01', 1), row('2020-02', 3), row('2020-03', 5)], 'Monthly', 'standardized', 'C');
    assert.deepEqual(m.cells.map(c => c.value), [-1, 0, 1]); assert.equal(m.unit, 'standard deviations');
    assert.match(landscape([row('2020-01', 5), row('2020-02', 5)], 'Monthly', 'standardized', 'C').reason, /nonzero variance/);
});
test('complete grids merge into a single rectangular surface patch', () => {
    const data = Array.from({ length: 3 }, (_, y) => Array.from({ length: 12 }, (_, m) => row(`${2020 + y}-${String(m + 1).padStart(2, '0')}`, y * 12 + m))).flat();
    const m = landscape(data, 'Monthly', 'observed', 'C');
    assert.equal(m.patches.length, 1); assert.equal(m.patches[0].points.length, 36); assert.equal(m.missing, 0);
});
test('every surface quad has four real corners; absent months and years never get bridged', () => {
    const data = [2020, 2021, 2023].flatMap(y => [1, 2, 3, 4].map(m => row(`${y}-0${m}`, y === 2021 && m === 2 ? null : y + m)));
    const model = landscape(data, 'Monthly', 'observed', 'C');
    const valid = new Set(model.cells.map(c => `${c.year}:${c.month}`));
    for (const patch of model.patches) for (const [month, year, value] of patch.points) {
        assert.ok(valid.has(`${year}:${month}`)); assert.ok(Number.isFinite(value));
        assert.notEqual(year, 2022);
    }
    assert.deepEqual(model.patches.map(p => p.points), [[[2, 2020, 2023], [3, 2020, 2024], [2, 2021, 2024], [3, 2021, 2025]]]);
});
test('unsupported cadence, duplicate calendar cells, invalid values and excessive windows fail visibly', () => {
    assert.match(landscape([row('2020-01', 1)], 'Daily', 'observed', 'C').reason, /requires monthly/);
    assert.match(landscape([row('2020-01-01', 1), row('2020-01-02', 2)], 'Monthly', 'observed', 'C').reason, /More than one/);
    assert.match(landscape([row('1800-01', 1), row('2020-01', 2)], 'Monthly', 'observed', 'C').reason, /150 years/);
    assert.match(landscape([row('2020-01', Infinity)], 'Monthly', 'observed', 'C').reason, /invalid/);
    assert.match(landscape([row('2020-01', null)], 'Monthly', 'observed', 'C').reason, /No usable/);
    assert.match(landscape([], 'Monthly', 'observed', 'C').reason, /No observations/);
});
test('constant observed values have a finite non-degenerate color domain', () => {
    const m = landscape([row('2020-01', 0)], 'Monthly', 'observed', 'C');
    assert.ok(m.range[0] < 0 && m.range[1] > 0); assert.equal(m.cells[0].value, 0);
});
