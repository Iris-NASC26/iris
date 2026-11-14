// Synthetic TEST-ONLY analysis response, never used as scientific evidence.
import { fixture } from './fixtures';
export function analysisFixture(methods = ['sen_slope', 'hamed_rao_mk']) {
    const p = fixture();
    return {
        result_id: 'analysis-test-only', source_job_id: p.job_id, provenance_mode: 'live_extracted_result', sha256_hash: 'b'.repeat(64), method_version: 'TEST-ONLY',
        dataset_name: p.product.variable_name, parameter_code: 'T2M', unit: 'C', location: p.extraction_config.region_name, start_year: 2020, end_year: 2021,
        completeness_pct: 16.7, valid_months_count: 4, seasonal_adjustment_method: 'TEST calendar means', requested_seasonal_adjustment: 'auto', requested_analysis_methods: methods,
        hamed_rao_mk_z: 2, hamed_rao_mk_p: 0.03, fdr_q_value: 0.03, effective_sample_size_n_eff: 4, lag1_autocorrelation: 0, kendall_tau: 0.5,
        sens_slope_decadal: 2, sens_ci_low: 0.5, sens_ci_high: 3.5, ols_slope_decadal: 2.5, ols_t_statistic: 2, ols_t_degrees_freedom: 2, ols_p_value: 0.1, ols_ci_low_decadal: -0.5, ols_ci_high_decadal: 4,
        seasonal_kendall_z: null, seasonal_kendall_p: null, change_point_timestamp: null, change_point_statistic: null, change_point_p_value: null,
        analysis_series: p.chart_series.map(row => ({ timestamp: row.timestamp, value: row.value, seasonal_component: row.value === null ? null : 10, deseasonalized_value: row.qa_flag === 'Valid' ? row.value! - 10 : null, anomaly_z: null, ols_trend: row.value === null ? null : 1, sen_trend: row.value === null ? null : 1, qa_flag: row.qa_flag })),
        evidence_grade: 'D', evidence_grade_title: 'TEST ONLY', evidence_grade_reasons: ['Synthetic transport test'], explanations: { explorer: 'TEST ONLY', student: 'TEST ONLY', scientist: 'TEST ONLY' }, recommended_views: [], annual_stripes: [], monthly_fingerprint: [], trend_triangle: [], caveats: [],
        outlook: { not_a_prediction_label: 'TEST ONLY', horizon_year: 2050, continuation_points: [], skill_gate_passed: false, backtest_rmse: null, climatology_baseline_rmse: null, skill_score_pss: null, skill_gate_reason: 'TEST ONLY', short_term_forecast_points: [], cmip6_Reference_note: 'TEST ONLY' }, citation_doi: '', source_agency: 'TEST',
    };
}
