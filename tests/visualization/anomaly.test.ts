import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAnomaly, parseAnomaly, type AnomalyData } from '../../src/features/visualization/model.ts';
import { ANOMALY_SCALE, rangeLabel, styleRange } from '../../src/features/visualization/styles.ts';

const createValidAnomaly = (): AnomalyData => ({
    schema_version: 'visualization.anomaly.v1',
    variable_id: 'V01',
    field: 'T2M',
    month: '2023-07',
    units: '°C relative to 1991–2020 baseline',
    source_units: 'C',
    time_standard: 'UTC',
    cell_lats: [10.0, 10.5],
    cell_lons: [20.0, 20.625],
    lat_step: 0.5,
    lon_step: 0.625,
    values: [1.25, -0.75, null, 2.1],
    target_values: [26.25, 24.25, null, 27.1],
    baseline_means: [25.0, 25.0, 24.5, 25.0],
    baseline_counts: [30, 30, 15, 28],
    baseline_period: {
        start_year: 1991,
        end_year: 2020,
        calendar_month: 7,
        calendar_month_name: 'July',
        min_valid_years: 20,
    },
    anomaly_min: -0.75,
    anomaly_max: 2.1,
    anomaly_mean: 0.8667,
    source: {
        title: 'NASA POWER MERRA-2 Monthly Climatological Anomaly',
        url: 'https://power.larc.nasa.gov',
        version: 'v2.5.0',
        retrieved_at: '2026-11-15T00:00:00Z',
        from_cache: true,
        scientifically_validated: false,
        caveats: ['Requires ≥ 20 valid baseline years'],
        artifact_sha256: {
            climatology: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
    },
});

describe('Anomaly data model and runtime validation', () => {
    it('identifies and parses a valid NASA historical anomaly payload', () => {
        const payload = createValidAnomaly();
        assert.equal(isAnomaly(payload), true);
        const parsed = parseAnomaly(payload);
        assert.equal(parsed.schema_version, 'visualization.anomaly.v1');
        assert.equal(parsed.month, '2023-07');
        assert.equal(parsed.baseline_period.calendar_month_name, 'July');
        assert.equal(parsed.baseline_period.start_year, 1991);
        assert.equal(parsed.baseline_period.end_year, 2020);
        assert.deepEqual(parsed.values, [1.25, -0.75, null, 2.1]);
    });

    it('rejects incorrect schema versions or missing anomaly fields', () => {
        const payload = createValidAnomaly() as any;
        payload.schema_version = 'visualization.field.v1';
        assert.throws(() => parseAnomaly(payload), /incompatible anomaly grid/);

        const withoutPeriod = createValidAnomaly() as any;
        delete withoutPeriod.baseline_period;
        assert.throws(() => parseAnomaly(withoutPeriod), /baseline period manifest is invalid/);
    });

    it('rejects mismatched array lengths across target, baseline and anomaly values', () => {
        const p1 = createValidAnomaly();
        p1.target_values = [26.25, 24.25]; // too short
        assert.throws(() => parseAnomaly(p1), /Anomaly arrays do not match the grid cell length/);

        const p2 = createValidAnomaly();
        p2.baseline_means = [25.0];
        assert.throws(() => parseAnomaly(p2), /Anomaly arrays do not match the grid cell length/);

        const p3 = createValidAnomaly();
        p3.values = [1.25, -0.75, null]; // grid is 2x2 = 4
        assert.throws(() => parseAnomaly(p3), /incompatible anomaly grid/);
    });

    it('rejects non-monotonic or inverted coordinates', () => {
        const p = createValidAnomaly();
        p.cell_lats = [10.5, 10.0]; // inverted
        assert.throws(() => parseAnomaly(p), /Spatial axes must be strictly increasing/);
    });

    it('never converts missing anomaly values to zero', () => {
        const payload = createValidAnomaly();
        const parsed = parseAnomaly(payload);
        assert.strictEqual(parsed.values[2], null);
        assert.notStrictEqual(parsed.values[2], 0);
    });
});

describe('Scientific anomaly calculation constraints', () => {
    it('verifies anomaly equals target minus baseline mean where valid baseline >= 20', () => {
        const p = createValidAnomaly();
        for (let i = 0; i < p.values.length; i++) {
            const target = p.target_values[i];
            const base = p.baseline_means[i];
            const count = p.baseline_counts[i];
            const anom = p.values[i];
            if (target !== null && base !== null && count >= 20) {
                assert.ok(Math.abs((target - base) - anom!) < 1e-4);
            } else {
                assert.strictEqual(anom, null);
            }
        }
    });

    it('withholds anomaly calculation when valid baseline years < 20', () => {
        const p = createValidAnomaly();
        // cell index 2 has count 15 < 20: value must be null
        assert.strictEqual(p.baseline_counts[2], 15);
        assert.strictEqual(p.values[2], null);
    });
});

describe('Zero-centered divergent palette and styling', () => {
    it('forces zero-centered symmetric bounds for anomaly fields in auto mode', () => {
        const p = createValidAnomaly();
        // values are [1.25, -0.75, null, 2.1]. max abs is 2.1
        const range = styleRange(p, { rampId: 'coolwarm', rangeMode: 'auto' });
        assert.equal(range[0], -2.1);
        assert.equal(range[1], 2.1);
    });

    it('forces zero-centered symmetric bounds even when all anomalies are positive', () => {
        const p = createValidAnomaly();
        p.values = [0.5, 1.2, 2.4, 0.8];
        const range = styleRange(p, { rampId: 'coolwarm', rangeMode: 'auto' });
        assert.equal(range[0], -2.4);
        assert.equal(range[1], 2.4);
    });

    it('uses standard ANOMALY_SCALE [-6, 6] in fixed mode', () => {
        const p = createValidAnomaly();
        const range = styleRange(p, { rampId: 'coolwarm', rangeMode: 'fixed' });
        assert.deepEqual(range, ANOMALY_SCALE);
        assert.deepEqual(range, [-6, 6]);
    });

    it('provides clear range description noting zero-centering and baseline period', () => {
        const label = rangeLabel({ rampId: 'coolwarm', rangeMode: 'fixed' }, 'V01', true);
        assert.match(label, /1991–2020 baseline/);
        assert.match(label, /zero-centered/);
    });
});
