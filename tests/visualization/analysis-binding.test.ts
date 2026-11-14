import test from 'node:test';
import assert from 'node:assert/strict';
import { bindAnalysis, significance, sourceKey, trend } from '../../src/features/visualization/adapters/analysisBinding.ts';
import { parsePreview } from '../../src/features/visualization/model.ts';
import { fixture } from './browser/fixtures.ts';
import { analysisFixture } from './browser/analysisFixture.ts';
const submission = { seasonal: 'auto' as const, methods: ['sen_slope', 'hamed_rao_mk'] as ('sen_slope' | 'hamed_rao_mk')[] };

test('source-bound analysis preserves different source/analysis digests and selects only requested methods', () => {
    const p = parsePreview(fixture()), binding = bindAnalysis(p, submission, analysisFixture());
    assert.equal(binding.inputKey, sourceKey(p)); assert.equal(trend(binding, 'ols'), null);
    assert.equal(trend(binding, 'sen_slope')!.value, 2); assert.equal(significance(binding)!.p, 0.03);
    assert.notEqual(p.sha256_hash, binding.result.sha256_hash);
});
test('wrong source, variable, units, region, period and submitted settings cannot bind', () => {
    const p = parsePreview(fixture());
    for (const change of [{ source_job_id: 'different' }, { parameter_code: 'RAIN' }, { unit: 'K' }, { location: 'Other' }, { end_year: 2025 }, { requested_analysis_methods: ['ols'] }, { requested_seasonal_adjustment: 'none' }, { sha256_hash: '' }, { provenance_mode: 'live_nasa_power' }, { dataset_name: {} }, { method_version: 123 }, { seasonal_adjustment_method: [] }])
        assert.throws(() => bindAnalysis(p, submission, { ...analysisFixture(), ...change }), /does not match/);
});
test('invalid intervals, non-finite estimates, probabilities and duplicate timestamps are rejected', () => {
    const p = parsePreview(fixture());
    for (const change of [{ sens_ci_low: 5 }, { sens_slope_decadal: Infinity }, { hamed_rao_mk_p: -0.1 }, { hamed_rao_mk_p: 1.1 }, { hamed_rao_mk_p: NaN }, { analysis_series: [analysisFixture().analysis_series[0], analysisFixture().analysis_series[0]] }])
        assert.throws(() => bindAnalysis(p, submission, { ...analysisFixture(), ...change }));
});
test('changing immutable source identity prevents lookup of stale results', () => {
    const p = parsePreview(fixture()), key = sourceKey(p);
    assert.notEqual(key, sourceKey({ ...p, sha256_hash: 'c'.repeat(64) }));
    assert.notEqual(key, sourceKey({ ...p, extraction_config: { ...p.extraction_config, point_lat: 30 } }));
    assert.equal(key, sourceKey({ ...p, extraction_config: Object.fromEntries(Object.entries(p.extraction_config).reverse()) as typeof p.extraction_config }));
});
test('a slope alone never implies significance', () => {
    const b = bindAnalysis(parsePreview(fixture()), { seasonal: 'auto', methods: ['sen_slope'] }, analysisFixture(['sen_slope']));
    assert.equal(significance(b), null);
});
