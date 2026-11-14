// A completed analysis is attached to an immutable extracted job, never inferred
// from a similar variable name or a frontend endpoint difference.
import type { PreviewResponse, CaseFileAnalysisResponse } from '@/lib/dataRetrievalEngine';
import type { AnalysisBinding, AnalysisSubmission } from '../hooks/useScientificAnalysis';
import { timestamp } from '../model';

export function sourceKey(p: PreviewResponse | null | undefined): string {
    if (!p) return '';
    return JSON.stringify([p.job_id, p.result_id, p.sha256_hash, p.product.product_id, p.product.variable_id,
        p.summary_stats.unit, p.spatial_semantics_applied, Object.entries(p.extraction_config).sort(([a], [b]) => a.localeCompare(b))]);
}
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const probability = (v: unknown) => finite(v) && v >= 0 && v <= 1;
export function bindAnalysis(p: PreviewResponse, submission: AnalysisSubmission, value: unknown): AnalysisBinding {
    const r = value as CaseFileAnalysisResponse | null, c = p.extraction_config;
    if (!r || r.source_job_id !== p.job_id || r.parameter_code !== c.variable_id || r.unit !== p.summary_stats.unit
        || r.location !== c.region_name || r.start_year !== Number(c.start_date.slice(0, 4)) || r.end_year !== Number(c.end_date.slice(0, 4))
        || typeof r.result_id !== 'string' || !r.result_id || typeof r.dataset_name !== 'string'
        || !/^[a-f\d]{64}$/i.test(r.sha256_hash ?? '') || typeof r.method_version !== 'string' || !r.method_version
        || !['live_extracted_result', 'pinned_real_snapshot'].includes(r.provenance_mode)
        || r.requested_seasonal_adjustment !== submission.seasonal || typeof r.seasonal_adjustment_method !== 'string' || !r.seasonal_adjustment_method
        || !Array.isArray(r.requested_analysis_methods) || !submission.methods.length
        || [...r.requested_analysis_methods].sort().join('|') !== [...submission.methods].sort().join('|')
        || !finite(r.completeness_pct) || r.completeness_pct < 0 || r.completeness_pct > 100
        || !Number.isInteger(r.valid_months_count) || r.valid_months_count < 0
        || !Array.isArray(r.analysis_series) || !r.analysis_series.length)
        throw new Error('Analysis does not match the extracted source and submitted settings; visualization was not bound.');
    for (const method of submission.methods) {
        if (method === 'sen_slope' && (!finite(r.sens_slope_decadal) || !finite(r.sens_ci_low) || !finite(r.sens_ci_high) || r.sens_ci_low > r.sens_ci_high)) throw new Error('Invalid Sen trend interval.');
        if (method === 'ols' && (!finite(r.ols_slope_decadal) || !finite(r.ols_ci_low_decadal) || !finite(r.ols_ci_high_decadal) || r.ols_ci_low_decadal > r.ols_ci_high_decadal || !probability(r.ols_p_value))) throw new Error('Invalid OLS result.');
        if (method === 'hamed_rao_mk' && !probability(r.hamed_rao_mk_p)) throw new Error('Invalid Mann–Kendall p-value.');
        if (method === 'seasonal_kendall' && !probability(r.seasonal_kendall_p)) throw new Error('Invalid Seasonal Kendall p-value.');
    }
    const seen = new Set<string>();
    for (const row of r.analysis_series) {
        if (!row || typeof row.timestamp !== 'string' || seen.has(row.timestamp)
            || ![row.value, row.deseasonalized_value, row.ols_trend, row.sen_trend].every(v => v === null || finite(v))) throw new Error('Invalid analysis observations.');
        timestamp(row.timestamp); // strict UTC/calendar validation, including invalid leap days
        seen.add(row.timestamp);
    }
    // The backend analysis digest hashes its processing input; it is intentionally
    // distinct from the extraction artifact digest retained in sourceKey.
    return { inputKey: sourceKey(p), submission: { seasonal: submission.seasonal, methods: [...submission.methods] }, result: r };
}
export function trend(binding: AnalysisBinding, method: 'sen_slope' | 'ols') {
    if (!binding.submission.methods.includes(method)) return null;
    const r = binding.result;
    return method === 'sen_slope' ? { value: r.sens_slope_decadal, low: r.sens_ci_low, high: r.sens_ci_high, label: 'Sen slope' }
        : { value: r.ols_slope_decadal, low: r.ols_ci_low_decadal, high: r.ols_ci_high_decadal, label: 'OLS slope' };
}
export function significance(binding: AnalysisBinding) {
    const r = binding.result, methods = binding.submission.methods;
    if (methods.includes('hamed_rao_mk')) return { p: r.hamed_rao_mk_p, label: 'Hamed–Rao Mann–Kendall' };
    if (methods.includes('seasonal_kendall')) return { p: r.seasonal_kendall_p!, label: 'Seasonal Kendall' };
    if (methods.includes('ols')) return { p: r.ols_p_value, label: 'OLS t-test' };
    return null;
}
