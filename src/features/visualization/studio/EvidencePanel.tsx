"use client";
import { useState } from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import { ChartCanvas } from '../Charts';
import { format } from '../model';
import { significance, sourceKey, trend } from '../adapters/analysisBinding';
import { useVisualizations } from '../store';
import { useStudio } from './state';
import { useStudioTheme } from './display';

export function EvidencePanel(_props: IDockviewPanelProps) {
    const s = useStudio(), binding = s.analysis.binding;
    if (!s.primary) return <div className="viz-empty"><h3>Follow the evidence.</h3><p>The selected record’s location, coverage and completed analysis will appear here.</p></div>;
    const p = s.primary.preview;
    const estimate = binding ? trend(binding, 'sen_slope') ?? trend(binding, 'ols') : null;
    const test = binding ? significance(binding) : null;
    return <div className="viz-panel viz-panel-scroll viz-evidence">
        <span className="viz-eyebrow">WHAT · WHERE · HOW MUCH</span>
        <h3>{p.product.variable_name}</h3><p className="viz-muted">{p.extraction_config.region_name}<br/>{p.spatial_semantics_applied || 'Point sampling; not a regional mean'}</p>
        {binding ? <>
            <div className="viz-evidence-rate"><span>{estimate?.label ?? 'Trend rate not requested'}</span><strong>{estimate ? `${estimate.value > 0 ? '+' : ''}${format(estimate.value, 3)}` : '—'}</strong><span>{binding.result.unit} / decade</span></div>
            {estimate && <p>95% confidence interval: <strong>{format(estimate.low, 3)} to {format(estimate.high, 3)}</strong> {binding.result.unit}/decade.</p>}
            <div className={`viz-significance ${test && test.p < 0.05 ? 'viz-significance-detected' : ''}`}><strong>{test ? test.p < 0.05 ? 'Evidence of a trend at α = 0.05' : 'A trend was not detected at α = 0.05' : 'No significance test requested'}</strong>{test && <span>{test.label} · p = {test.p < 0.0001 ? test.p.toExponential(2) : test.p.toFixed(4)}</span>}</div>
            <p className="viz-muted">A p-value does not measure the size or cause of a change. A result above 0.05 does not prove there is no change.</p>
            <dl className="viz-kv"><dt>Analysis window</dt><dd>{binding.result.start_year}–{binding.result.end_year}</dd><dt>Seasonal treatment</dt><dd>{binding.result.seasonal_adjustment_method}</dd><dt>Valid months</dt><dd>{binding.result.valid_months_count} · {binding.result.completeness_pct.toFixed(1)}% complete</dd><dt>Method version</dt><dd>{binding.result.method_version}</dd></dl>
            <p className="viz-note">Display filters, brush zoom and QA toggles do not recompute this analysis. Sen intervals use the backend’s rank method; they are not themselves an autocorrelation adjustment. Consult Data Analysis for diagnostics and caveats.</p>
        </> : <div className="viz-evidence-pending"><h4>Explore the record now.</h4><p>Run chosen methods on Data Analysis to attach trend rates, confidence intervals and significance. Descriptive endpoint differences are not fitted trends.</p><button className="viz-button" onClick={s.openAnalysis}>Open Data Analysis</button></div>}
        <details><summary>Source & reproducibility</summary><dl className="viz-kv"><dt>Provider</dt><dd>{p.product.provider_agency} · {p.product.source_api}</dd><dt>Product</dt><dd>{p.product.product_id}</dd><dt>Observation period</dt><dd>{p.extraction_config.start_date} to {p.extraction_config.end_date}</dd><dt>Cadence / reduction</dt><dd>{p.extraction_config.target_frequency} / {p.extraction_config.temporal_aggregation}</dd><dt>Retrieved</dt><dd>{p.retrieved_at}</dd></dl></details>
    </div>;
}

export function TrendIntervalsPanel(_props: IDockviewPanelProps) {
    const s = useStudio(), store = useVisualizations(), { dark } = useStudioTheme();
    const [method, setMethod] = useState<'sen_slope' | 'ols'>('sen_slope');
    const binding = s.analysis.binding, primary = s.primary;
    if (!binding || !primary) return <div className="viz-empty"><h3>Compare rates, with uncertainty.</h3><p>Complete analyses for loaded locations on Data Analysis. Matching estimates appear here; missing analyses never become zeros.</p></div>;
    const c = primary.preview.extraction_config;
    const compatible = s.entries.flatMap(series => {
        const b = store.analyses[sourceKey(series.preview)], cfg = series.preview.extraction_config;
        if (!b || b.result.unit !== binding.result.unit || b.result.parameter_code !== binding.result.parameter_code
            || series.preview.product.product_id !== primary.preview.product.product_id
            || cfg.start_date !== c.start_date || cfg.end_date !== c.end_date || cfg.target_frequency !== c.target_frequency
            || cfg.temporal_aggregation !== c.temporal_aggregation || cfg.spatial_reduction !== c.spatial_reduction
            || series.preview.spatial_semantics_applied !== primary.preview.spatial_semantics_applied
            || b.result.seasonal_adjustment_method !== binding.result.seasonal_adjustment_method) return [];
        const t = trend(b, method);
        return t ? [{ series, estimate: t }] : [];
    });
    const foreground = dark ? '#acbdcf' : '#47586d';
    return <div className="viz-panel"><div className="viz-panel-tools"><label>Trend method<select value={method} onChange={e => setMethod(e.target.value as typeof method)}><option value="sen_slope">Sen slope</option><option value="ols">OLS slope</option></select></label><span className="viz-muted">{binding.result.unit}/decade · 95% intervals</span></div>
        {compatible.length ? <ChartCanvas label={`Trend estimates and 95% confidence intervals for ${compatible.length} compatible location analyses. The vertical reference is zero change.`} option={{
            animation: false, aria: { enabled: true }, backgroundColor: 'transparent', grid: { left: 155, right: 30, top: 25, bottom: 60 },
            xAxis: { type: 'value', name: `${binding.result.unit}/decade`, nameLocation: 'middle', nameGap: 30, axisLabel: { color: foreground }, nameTextStyle: { color: foreground }, splitLine: { lineStyle: { color: dark ? '#29394d' : '#dbe4ed' } } },
            yAxis: { type: 'category', data: compatible.map(x => x.series.preview.extraction_config.region_name), axisLabel: { color: foreground, width: 140, overflow: 'truncate' } },
            tooltip: { renderMode: 'richText', confine: true, trigger: 'item' },
            series: [...compatible.map((x, i) => ({ name: `${x.series.preview.extraction_config.region_name}: 95% CI`, type: 'line' as const, data: [[x.estimate.low, i], [x.estimate.high, i]], symbol: 'rect', symbolSize: [3, 12], lineStyle: { color: x.series.color, width: 3 }, itemStyle: { color: x.series.color }, ...(i === 0 ? { markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: foreground, type: 'dashed' as const }, data: [{ xAxis: 0 }] } } : {}) })),
                { type: 'scatter' as const, name: 'Trend rate', data: compatible.map((x, i) => ({ value: [x.estimate.value, i], itemStyle: { color: x.series.color } })), symbolSize: 12 }],
        }}/> : <div className="viz-empty"><p>No matching requested {method === 'sen_slope' ? 'Sen' : 'OLS'} estimates. Choose that method in Data Analysis.</p></div>}
        <p className="viz-panel-foot">{compatible.length} compatible / {s.entries.length} visible series. Only matching variable, product, units, dates, cadence, reduction, spatial support and seasonal treatment are compared. Each location needs its own completed analysis. No regional significance map or pooled inference is implied.</p></div>;
}
