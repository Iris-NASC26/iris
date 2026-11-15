"use client";
// Studio panel components. All shared state comes from StudioContext so panel
// lifecycles never own loaded data — closing/reopening a panel is lossless.
import { useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { DataChart, ChartCanvas, type ChartKind, type SelectEvent } from "../Charts";
import { format, lineData, paired, summary } from "../model";
import { useStudioTheme as useTheme } from './display';
import { useStudio, type StudioState } from "./state";

import { SeasonalCycle } from '../presentation/SeasonalCycle';
import { TimeTrack } from '../presentation/TimeTrack';
import { ObservationNavigator } from '../presentation/ObservationNavigator';
import '../presentation/presentation.css';
type P = IDockviewPanelProps;
const Empty = ({ text }: { text: string }) => <div className="viz-empty"><p>{text}</p></div>;

function EmptyData() { return <div className="viz-empty viz-empty-hero"><h3>A clearer picture starts with real data.</h3><p>Search for a dataset, confirm a location and period, then load observations in the controls drawer.</p></div>; }

function publish(studio: StudioState, e: SelectEvent) {
    if (e.kind === 'time') { const i = studio.times.indexOf(e.time); if (i >= 0) commitIndex(studio, i); }
    else if (e.kind === 'month') { const i = studio.primaryRows.findIndex(r => r.time >= e.time && new Date(r.time).getUTCMonth() === e.month); if (i >= 0) commitIndex(studio, i); }
    else { const i = studio.times.indexOf(e.time); if (i >= 0) commitIndex(studio, i); }
}
function commitIndex(studio: StudioState, i: number) {
    const r = studio.primaryRows[i];
    if (!r || !studio.primary) return;
    studio.setPlaying(false);
    studio.setTimeIndex(i);
    studio.select({ seriesId: studio.primary.id, time: r.time, timestamp: r.timestamp });
}

export function TimeSeriesPanel(_p: P) {
    const s = useStudio();
    const [kind, setKind] = useState<ChartKind | 'track'>('line');
    const [signal, setSignal] = useState<'observed' | 'analysis'>('observed');
    if (!s.primary) return <EmptyData />;
    const stats = summary(s.primaryRows);
    const markTime = s.selection?.seriesId === s.primary.id ? s.selection.time : s.primaryRows[Math.min(s.timeIndex, s.primaryRows.length - 1)]?.time ?? null;
    return <div className="viz-panel viz-timeseries-panel">
        <div className="viz-record-heading"><div><span className="viz-record-eyebrow">THE OBSERVATION RECORD</span><h3>Follow the signal through time.</h3></div><span className="viz-record-count">{stats.count.toLocaleString()} usable / {s.primaryRows.length.toLocaleString()} rows</span></div>
        <div className="viz-panel-tools">
            <span className="viz-chart-types" role="group" aria-label="Chart type">{(['line', 'area', 'bars', 'distribution', 'track'] as const).map(k => <button key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setSignal('observed'); }}>{({ line: 'Line', area: 'Area', bars: 'Bars', distribution: 'Distribution', track: '3D Track' } as const)[k]}</button>)}</span>
            {s.analysis.binding && <label>Signal<select aria-label="Signal" value={signal} onChange={e => { setSignal(e.target.value as typeof signal); if(e.target.value==='analysis') setKind('line'); }}><option value="observed">Observed record</option><option value="analysis">Analysis-adjusted & fitted</option></select></label>}
            {s.entries.length > 1 && <label className="viz-check"><input type="checkbox" checked={s.normalized} onChange={e => s.setNormalized(e.target.checked)}/> Standardize (unitless)</label>}
            <select aria-label="Primary series" value={s.primary.id} onChange={e => s.setPrimaryId(e.target.value)}>{s.entries.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </div>
        {signal === 'analysis' && s.analysis.binding ? <AnalyzedSeries studio={s}/> : stats.count ? kind === 'track' ? <TimeTrack key={`${s.primary.id}:${s.normalized}`}/> : <DataChart kind={kind} entries={s.entries} primary={s.primary} data={s.data} normalized={s.normalized} markTime={markTime} onSelect={e => publish(s, e)}/> : <Empty text="No usable observations in this period. Adjust the display filters or inspect the QA flags." />}
        <ObservationNavigator/>
        <div className="viz-series-overview"><span>Source mean<strong>{format(stats.mean)}</strong></span><span>Source range<strong>{format(stats.min)} to {format(stats.max)}</strong></span><span>{stats.missing} missing / excluded</span></div>
        <p className="viz-panel-foot">Units {s.primary.preview.summary_stats.unit} · {s.primary.preview.extraction_config.target_frequency} · gaps are real, never connected.</p>
    </div>;
}

function AnalyzedSeries({ studio: s }: { studio: StudioState }) {
    const { dark } = useTheme(), b = s.analysis.binding!;
    const foreground = dark ? '#acbdcf' : '#47586d';
    const byTime = new Map(b.result.analysis_series.map(r => [Date.parse(r.timestamp), r]));
    const aligned = s.primaryRows.map(row => ({ row, result: byTime.get(row.time) }));
    if (!aligned.some(x => x.result?.deseasonalized_value !== null && x.result?.deseasonalized_value !== undefined && x.row.value !== null)) return <Empty text="The analysis-adjusted observations cannot be aligned to the visible source timestamps. Use the observed record or Data Analysis; no values were interpolated."/>;
    const series = [{ name: `Analysis-adjusted (${b.result.seasonal_adjustment_method})`, field: 'deseasonalized_value' as const, color: s.primary!.color },
        ...(b.submission.methods.includes('ols') ? [{ name: 'Submitted OLS fit', field: 'ols_trend' as const, color: '#e5ab74' }] : []),
        ...(b.submission.methods.includes('sen_slope') ? [{ name: 'Submitted Sen fit', field: 'sen_trend' as const, color: '#b39ae6' }] : [])];
    return <><ChartCanvas label={`Submitted analysis-adjusted observations and requested fits for ${s.primary!.label}. Fits are not drawn on unadjusted observations.`} resetable onSelect={data => { if (Array.isArray(data) && typeof data[0] === 'number') publish(s, { kind: 'time', time: data[0] }); }} option={{
        animation: false, useUTC: true, aria: { enabled: true }, backgroundColor: 'transparent', grid: { top: 45, left: 65, right: 20, bottom: 55 },
        legend: { type: 'scroll', textStyle: { color: foreground } }, tooltip: { trigger: 'axis', confine: true, renderMode: 'richText' },
        xAxis: { type: 'time', axisLabel: { color: foreground } }, yAxis: { type: 'value', name: b.result.unit, scale: true, axisLabel: { color: foreground }, splitLine: { lineStyle: { color: dark ? '#29394d' : '#dbe4ed' } } },
        dataZoom: [{ type: 'inside', filterMode: 'none' }, { type: 'slider', height: 18, bottom: 5, filterMode: 'none' }],
        series: series.map((item, i) => ({ name: item.name, type: 'line', connectNulls: false, showSymbol: i === 0, symbolSize: 3, lineStyle: { width: 2, type: i === 0 ? 'solid' : 'dashed', color: item.color }, itemStyle: { color: item.color },
            data: lineData(aligned.map(x => ({ ...x.row, value: x.row.value === null ? null : x.result?.[item.field] ?? null })), s.primary!.preview.extraction_config.target_frequency) })),
    }}/><p className="viz-panel-foot">Backend fits and adjusted values are aligned by exact timestamp. Only requested methods are shown. Original analysis window {b.result.start_year}–{b.result.end_year}; brush zoom does not refit.</p></>;
}

export function SeasonalPanel(_p: P) { return <SeasonalCycle/>; }

export function RelationshipPanel(_p: P) {
    const s = useStudio();
    const { dark } = useTheme();
    const foreground = dark ? '#c9d8d2' : '#53665e', grid = dark ? '#283e36' : '#e5ece8';
    const [xId, setXId] = useState(''); const [yId, setYId] = useState('');
    if (s.series.length < 2) return <EmptyData />;
    const x = s.series.find(v => v.id === xId) ?? s.entries[0] ?? s.series[0];
    const candidates = s.series.filter(v => v.id !== x.id && v.preview.extraction_config.target_frequency === x.preview.extraction_config.target_frequency);
    const y = candidates.find(v => v.id === yId) ?? candidates[0];
    if (!y) return <Empty text={`No second series shares the ${x.preview.extraction_config.target_frequency} cadence of ${x.label}. Exact timestamp pairing requires matching temporal support.`} />;
    const xr = s.data.get(x.id) ?? [], yr = s.data.get(y.id) ?? [];
    const points = paired(xr, yr);
    const option = { animation: false, backgroundColor: 'transparent', aria: { enabled: true }, textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: foreground },
        tooltip: { trigger: 'item' as const, confine: true, formatter: ((p: { data: [number, number, string] }) => `${p.data[2]}\n${x.preview.product.variable_id}: ${p.data[0]} ${x.preview.summary_stats.unit}\n${y.preview.product.variable_id}: ${p.data[1]} ${y.preview.summary_stats.unit}`) as never },
        grid: { left: 72, right: 25, top: 30, bottom: 60 },
        xAxis: { type: 'value' as const, name: `${x.preview.product.variable_id} (${x.preview.summary_stats.unit})`, scale: true, splitLine: { lineStyle: { color: grid } }, axisLabel: { color: foreground } },
        yAxis: { type: 'value' as const, name: `${y.preview.product.variable_id} (${y.preview.summary_stats.unit})`, scale: true, splitLine: { lineStyle: { color: grid } }, axisLabel: { color: foreground } },
        series: [{ name: 'Exactly aligned observations', type: 'scatter' as const, data: points, symbolSize: 8, itemStyle: { color: x.color, opacity: 0.7 } }],
    };
    const byLabel = new Map(xr.map(r => [r.timestamp, r.time]));
    return <div className="viz-panel">
        <div className="viz-panel-tools">
            <label>X<select aria-label="X series" value={x.id} onChange={e => setXId(e.target.value)}>{s.series.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
            <label>Y<select aria-label="Y series" value={y.id} onChange={e => setYId(e.target.value)}>{candidates.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
            <span className="viz-muted">{points.length} aligned pair{points.length === 1 ? '' : 's'} · association, not causation</span>
        </div>
        {points.length ? <ChartCanvas option={option} label={`Aligned pairs of ${x.label} and ${y.label}.`} onSelect={d => { const a = d as [number, number, string]; const t = byLabel.get(a[2]) ?? Date.parse(a[2]); const i = s.times.indexOf(t); if (Number.isFinite(t) && i >= 0) commitIndex(s, i); }}/> : <Empty text="No exactly aligned timestamps between these series in the selected period." />}
        <p className="viz-panel-foot">Pairs require identical source timestamps; non-matching rows are excluded, not interpolated.</p>
    </div>;
}

export function SourceInspectorPanel(_p: P) {
    const s = useStudio();
    if (!s.primary) return <EmptyData />;
    const p = s.primary.preview;
    const selRow = s.selection ? s.primaryRows.find(r => r.time === s.selection!.time) : null;
    const stats = summary(s.primaryRows);
    return <div className="viz-panel viz-panel-scroll">
        <section className="viz-control-section"><span className="viz-step">SELECTION</span>
            {s.selection && selRow ? <dl className="viz-kv"><dt>Timestamp</dt><dd>{s.selection.timestamp}</dd><dt>Value</dt><dd>{format(selRow.value)} {p.summary_stats.unit} (QA: {selRow.qa})</dd><dt>Series</dt><dd>{s.primary.label}</dd></dl>
                : <p className="viz-muted">Click a chart point, heatmap cell or aligned pair to commit a selection shared across panels.</p>}
        </section>
        <section className="viz-control-section"><span className="viz-step">DISPLAY</span>
            <div className="viz-filter-row"><label>From<input type="date" value={s.filterStart} onChange={e => s.setFilterStart(e.target.value)}/></label><label>To<input type="date" value={s.filterEnd} onChange={e => s.setFilterEnd(e.target.value)}/></label></div>
            <label className="viz-check"><input type="checkbox" checked={s.includeFlagged} onChange={e => s.setIncludeFlagged(e.target.checked)}/> Include provider-flagged values (display only — backend inference policy unchanged)</label>
            <dl className="viz-kv"><dt>Usable</dt><dd>{stats.count} ({stats.missing} missing/excluded)</dd><dt>Mean</dt><dd>{format(stats.mean)} {p.summary_stats.unit}</dd><dt>First→last</dt><dd>{format(stats.change)} {p.summary_stats.unit} — endpoint difference, not an estimated trend</dd></dl>
        </section>
        <section className="viz-control-section"><span className="viz-step">SOURCE</span>
            <dl className="viz-kv"><dt>Product</dt><dd>{p.product.product_id} / {p.product.variable_id}</dd><dt>Provider</dt><dd>{p.product.source_api} / {p.product.provider_agency}</dd><dt>Support</dt><dd>{p.extraction_config.target_frequency} / {p.extraction_config.temporal_aggregation} · {p.spatial_semantics_applied || 'point sampling'}</dd><dt>Retrieved</dt><dd>{p.retrieved_at}</dd></dl>
            {p.product.source_url && <a href={p.product.source_url} rel="noreferrer" target="_blank">Source documentation</a>}
        </section>
        <section className="viz-control-section"><span className="viz-step">SERIES</span>{s.series.map(v => <article key={v.id} className="viz-series-row"><label><input type="checkbox" checked={!s.hidden.includes(v.id)} onChange={e => s.toggleHidden(v.id, e.target.checked)}/><i style={{ background: v.color }}/>{v.label}</label><button onClick={() => s.removeSeries(v.id)}>Remove</button></article>)}</section>
    </div>;
}
