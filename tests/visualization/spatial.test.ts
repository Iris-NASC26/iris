import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOverview, fieldScale, MAX_OVERVIEW_CELLS, type OverviewData } from '../../src/features/visualization/model.ts';
import { cellAt, fieldRectangle, fieldToRgba } from '../../src/features/visualization/fieldRaster.ts';
import { estimateNativeCells, fieldRoute, parseBox, GLOBAL_BOX, EUROPE_BOX } from '../../src/features/visualization/extents.ts';
// TEST-ONLY synthetic transport fixtures; never imported by application code.

const nativeField = {
    schema_version: 'visualization.field.v1' as const, variable_id: 'V01' as const, month: '2024-01', field: 'T2M',
    units: 'C', source_units: 'C', time_standard: 'UTC',
    cell_lats: [5, 5.5], cell_lons: [80, 80.625], lat_step: 0.5, lon_step: 0.625, values: [0, 27, null, 25],
    source: { url: 'https://example.test/', title: 'T', version: '1', retrieved_at: '2026-11-14T00:00:00Z', artifact_sha256: { a: 'a'.repeat(64) }, from_cache: false, stale_cache: false, caveats: [], acknowledgement: '', scientifically_validated: false as const },
};

function overviewField(patch: Partial<OverviewData> = {}): OverviewData {
    return {
        ...nativeField, schema_version: 'visualization.overview.v1',
        cell_lats: [-45, 45], cell_lons: [-90, 90], lat_step: 90, lon_step: 180, values: [10, 20, 30, null],
        extent: { lat_min: -90, lat_max: 90, lon_min: -180, lon_max: 180 },
        resolution: { source_lat_step: 0.5, source_lon_step: 0.625, aggregation: 'area_weighted_mean', factor_lat: 180, factor_lon: 288, output_cells: 4 },
        coverage: [1, 1, 1, 0], ...patch,
    };
}

describe('extent routing and parsing', () => {
    it('rejects unordered, incomplete and out-of-range boxes', () => {
        assert.equal(parseBox(['20', '10', '0', '10']), null);
        assert.equal(parseBox(['-90', '90', '10', '10']), null);
        assert.equal(parseBox(['', '90', '-180', '180']), null);
        assert.equal(parseBox(['-95', '0', '0', '10']), null);
    });
    it('routes global and Europe extents to the overview path, small boxes to native', () => {
        assert.equal(fieldRoute(GLOBAL_BOX, 'V01'), 'overview');
        assert.equal(fieldRoute(EUROPE_BOX, 'V01'), 'overview');
        assert.equal(fieldRoute([4, 16, 76, 86], 'V01'), 'field');
        assert.equal(estimateNativeCells(GLOBAL_BOX, 'V01'), 180 / 0.5 * (360 / 0.625));
    });
});

describe('numeric raster registration', () => {
    it('places the first cell_lats row at the south edge and clamps to the world', () => {
        const rect = fieldRectangle(nativeField);
        assert.equal(rect.south, 4.75); assert.equal(rect.north, 5.75);
        assert.equal(rect.west, 79.6875); assert.equal(rect.east, 80.9375);
        assert.deepEqual(fieldRectangle({ ...nativeField, cell_lats: [-90], cell_lons: [-180, 180], lat_step: 0.5, lon_step: 0.5 }), { west: -180, south: -90, east: 180, north: -89.75 });
    });
    it('writes the northernmost latitude band into image row 0', () => {
        const { width, height, data } = fieldToRgba(nativeField, 1);
        assert.equal(width, 2); assert.equal(height, 2);
        // cell_lats ascend south→north; image row 0 is the northern band [null, 25].
        assert.equal(data[3], 0);               // north-west cell is missing → transparent
        assert.equal(data[7], 255);             // north-east value 25 present
        assert.equal(data[11], 255);            // southern row rendered last; value 0 still paints
        assert.equal(data[15], 255);            // value 27 present
    });
    it('never paints missing cells as zero-valued colours', () => {
        const { data } = fieldToRgba({ ...nativeField, values: [null, null, null, null] });
        assert.deepEqual([...data], new Array(16).fill(0));
    });
    it('inspects numbers from cell centres, not from pixel colours', () => {
        assert.equal(cellAt(nativeField, 5.1, 80.1)?.value, 0);
        assert.equal(cellAt(nativeField, 5.1, 80.5)?.value, 27);  // row 0, column 1
        assert.equal(cellAt(nativeField, 5.5, 80)?.value, null); // missing returns null, not 0
        assert.equal(cellAt(nativeField, 30, 30), null);         // outside coverage
        assert.equal(cellAt(nativeField, 5.76, 80), null);       // beyond the half-step window
    });
});

describe('fixed scales and overview contract', () => {
    it('keeps one physical scale per variable for temporal comparison', () => {
        assert.deepEqual(fieldScale({ variable_id: 'V01', values: [-10, 30] }), [-55, 45]);
        assert.deepEqual(fieldScale({ variable_id: 'V12', values: [50, 220] }), [0, 450]);
        assert.deepEqual(fieldScale({ variable_id: 'V99', values: [2, 8] }), [2, 8]); // unknown variables fall back to data range
    });
    it('accepts a consistent aggregated overview and rejects inconsistent manifests', () => {
        assert.equal(parseOverview(overviewField()).resolution.aggregation, 'area_weighted_mean');
        assert.throws(() => parseOverview(overviewField({ resolution: { ...overviewField().resolution, output_cells: 3 } })), /manifest|inconsistent/i);
        assert.throws(() => parseOverview(overviewField({ coverage: [0.5, 2, 1, 0] })), /coverage/i);
        assert.throws(() => parseOverview(overviewField({ resolution: { source_lat_step: 0.5, source_lon_step: 0.625, aggregation: 'none', factor_lat: 1, factor_lon: 1, output_cells: 4 } })), /native source resolution/i);
        assert.throws(() => parseOverview({ ...overviewField(), values: new Array(MAX_OVERVIEW_CELLS + 1).fill(0), cell_lats: [0], cell_lons: [0] }), /incompatible/i);
    });
    it('keeps longitude orientation correct at the dateline', () => {
        const dateline = { ...nativeField, cell_lons: [179.6875, -179.6875] } // centres adjacent across ±180
        ;
        assert.equal(cellAt(dateline, 5, 179.8)!.lon, 179.6875);
        assert.equal(cellAt(dateline, 5, -179.8)!.lon, -179.6875); // never reversed
    });
});
