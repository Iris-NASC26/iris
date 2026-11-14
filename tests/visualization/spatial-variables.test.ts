import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SPATIAL_VARIABLES, isSpatialVariableId } from '../../src/features/visualization/spatialVariables.ts';
import { FIELD_SCALE, parseField, parseOverview } from '../../src/features/visualization/model.ts';
import { NATIVE_STEP, fieldRoute, GLOBAL_BOX } from '../../src/features/visualization/extents.ts';

// Synthetic TEST-ONLY transport; not a NASA observation or scientific fixture.
const source = { artifact_sha256: { test: 'a'.repeat(64) }, scientifically_validated: false };
describe('shared spatial variable bindings', () => {
    for (const variable of SPATIAL_VARIABLES) {
        it(`accepts ${variable.id} in both grid contracts with its own units and resolution`, () => {
            const steps = NATIVE_STEP[variable.id];
            const payload = { schema_version: 'visualization.field.v1', variable_id: variable.id,
                field: variable.field, units: variable.units, source_units: variable.source_units,
                time_standard: variable.family === 'syn1deg' ? 'LST' : 'UTC', month: '2024-01',
                cell_lats: [5, 5 + steps.lat], cell_lons: [80, 80 + steps.lon],
                lat_step: steps.lat, lon_step: steps.lon, values: [0, 1, null, 2], source };
            assert.equal(parseField(payload).variable_id, variable.id);
            assert.deepEqual(FIELD_SCALE[variable.id], variable.range);
            assert.equal(fieldRoute(GLOBAL_BOX, variable.id), 'overview');
            const overview = { ...payload, schema_version: 'visualization.overview.v1',
                extent: { lat_min: 4, lat_max: 7, lon_min: 79, lon_max: 82 },
                resolution: { source_lat_step: steps.lat, source_lon_step: steps.lon,
                    aggregation: 'none', factor_lat: 1, factor_lon: 1, output_cells: 4 } };
            assert.equal(parseOverview(overview).variable_id, variable.id);
            assert.throws(() => parseField({ ...payload, source_units: 'wrong-unit' }), /binding/);
            assert.throws(() => parseOverview({ ...overview, field: 'WRONG' }), /binding/);
        });
    }
    it('rejects non-allowlisted IDs', () => {
        assert.equal(isSpatialVariableId('SNODP'), true);
        assert.equal(isSpatialVariableId('FAKE'), false);
        assert.equal(isSpatialVariableId('__proto__'), false);
    });
});
