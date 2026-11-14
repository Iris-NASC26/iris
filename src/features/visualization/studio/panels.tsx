"use client";
// Studio panel components. All shared state comes from StudioContext so panel
// lifecycles never own loaded data — closing/reopening a panel is lossless.
import { useMemo, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { DataChart, ChartCanvas, type ChartKind, type SelectEvent } from "../Charts";
import { calendar, deviation, format, MONTHS, monthlyCells, paired, scale, summary, type VisualSeries } from "../model";
import { useTheme } from "@/context/ThemeContext";
import { useStudio, type StudioState } from "./state";

type P = IDockviewPanelProps;
const Empty = ({ text }: { text: string }) => <div className="viz-empty"><p>{text}</p></div>;

function EmptyData() { return <div className="viz-empty viz-empty-hero"><h3>A clearer picture starts with real data.</h3><p>Search for a dataset, confirm a location and period, then load observations in the controls drawer. Nothing was fetched automatically.</p><span>No demonstration values are loaded.</span></div>; }

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
    const [kind, setKind] = useState<ChartKind>('line');
    if (!s.primary) return <EmptyData />;
    const stats = summary(s.primaryRows);
    const markTime = s.selection?.seriesId === s.primary.id ? s.selection.time : s.primaryRows[Math.min(s.timeIndex, s.primaryRows.length - 1)]?.time ?? null;
    return <div className="viz-panel">
        <div className="viz-panel-tools">
            <span className="viz-chart-types" role="group" aria-label="Chart type">{(['line', 'area', 'bars'] as const).map(k => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{({ line: 'Line', area: 'Area', bars: 'Bars' } as const)[k]}</button>)}</span>
            {s.entries.length > 1 && <label className="viz-check"><input type="checkbox" checked={s.normalized} onChange={e => s.setNormalized(e.target.checked)}/> Standardize (unitless)</label>}
            <select aria-label="Primary series" value={s.primary.id} onChange={e => s.setPrimaryId(e.target.value)}>{s.entries.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </div>
        {stats.count ? <DataChart kind={kind} entries={s.entries} primary={s.primary} data={s.data} normalized={s.normalized} markTime={markTime} onSelect={e => publish(s, e)}/> : <Empty text="No usable observations in this period. Adjust the display filters or inspect the QA flags." />}
        <p className="viz-panel-foot">Units {s.primary.preview.summary_stats.unit} · {s.primary.preview.extraction_config.target_frequency} · gaps are real, never connected.</p>
    </div>;
}

export function SeasonalPanel(_p: P) {
    const s = useStudio();
    const [view, setView] = useState<'heatmap' | 'profile'>('heatmap');
    if (!s.primary) return <EmptyData />;
    const cells = monthlyCells(s.primaryRows);
    const years = [...new Set(cells.map(c => c.year))];
    return <div className="viz-panel">
        <div className="viz-panel-tools">
            <span className="viz-chart-types" role="group" aria-label="Seasonal view"><button aria-pressed={view === 'heatmap'} onClick={() => setView('heatmap')}>Year-by-month</button><button aria-pressed={view === 'profile'} onClick={() => setView('profile')}>Seasonal profile</button></span>
            <select aria-label="Seasonal series" value={s.primary.id} onChange={e => s.setPrimaryId(e.target.value)}>{s.entries.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </div>
        {view === 'heatmap'
            ? (cells.length ? <><DataChart kind="heatmap" entries={s.entries} primary={s.primary} data={s.data} normalized={false} onSelect={e => publish(s, e)}/><p className="viz-panel-foot">{years.length} year{years.length === 1 ? '' : 's'} · departures from each calendar month’s mean over the selected period (descriptive, not a backend seasonal adjustment). Empty cells have no usable observations; click a cell to select that month.</p></>
                : <Empty text="No usable monthly cells in the selected period." />)
            : <SeasonalProfile series={s.primary} rows={s.primaryRows} />}
    </div>;
}

function SeasonalProfile({ series, rows }: { series: VisualSeries; rows: ReturnType<typeof useStudio>['primaryRows'] }) {
    const { dark } = useTheme();
    const foreground = dark ? '#c9d8d2' : '#53665e', grid = dark ? '#283e36' : '#e5ece8';
    const byMonth = useMemo(() => {
        const groups = new Map<number, { year: number; value: number; timestamp: string }[]>();
        rows.forEach(r => { if (r.value === null) return; const d = new Date(r.time); const a = groups.get(d.getUTCMonth()) ?? []; a.push({ year: d.getUTCFullYear(), value: r.value, timestamp: r.timestamp }); groups.set(d.getUTCMonth(), a); });
        return groups;
    }, [rows]);
    const profile = calendar(rows);
    const yearly = [...new Set(rows.map(r => new Date(r.time).getUTCFullYear()))].sort();
    const option = { animation: false, backgroundColor: 'transparent', aria: { enabled: true }, textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: foreground },
        tooltip: { trigger: 'axis' as const, confine: true }, legend: { type: 'scroll' as const, top: 5, textStyle: { color: foreground } },
        grid: { left: 72, right: 25, top: 55, bottom: 40 },
        xAxis: { type: 'category' as const, data: MONTHS, axisLabel: { color: foreground } },
        yAxis: { type: 'value' as const, name: series.preview.summary_stats.unit, scale: true, splitLine: { lineStyle: { color: grid } }, axisLabel: { color: foreground } },
        series: [
            { name: 'Selected-period calendar-month mean', type: 'line' as const, data: profile.map(m => m.mean), connectNulls: false, lineStyle: { width: 3, color: series.color }, itemStyle: { color: series.color }, symbolSize: 7 },
            ...yearly.map((y, i) => ({ name: String(y), type: 'line' as const, data: MONTHS.map((_, m) => byMonth.get(m)?.find(v => v.year === y)?.value ?? null), connectNulls: false, lineStyle: { width: 1, opacity: 0.45, type: 'dashed' as const }, symbol: 'none', color: undefined as unknown as string, itemStyle: {}, emphasis: { focus: 'series' as const } })),
        ],
    };
    return <><ChartCanvas option={option} label={`Seasonal profile for ${series.label}; dashed lines are individual years with real gaps.`}/><p className="viz-panel-foot">Solid line: mean of available values per calendar month (not a climate normal). Dashed: individual years — missing months stay missing.</p></>;
}

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

export function ObservationTablePanel(_p: P) {
    const s = useStudio();
    if (!s.primary) return <EmptyData />;
    const rows = s.primaryRows;
    return <div className="viz-panel">
        <div className="viz-panel-tools"><span className="viz-muted">Source values and QA flags — nothing interpolated.</span><button className="viz-button" onClick={() => s.exportData('csv')}>Export CSV</button><button className="viz-button" onClick={() => s.exportData('json')}>Export JSON</button></div>
        <div className="viz-table-scroll"><table><caption>Observation data for {s.primary.label}</caption><thead><tr><th>Timestamp</th><th>Source value ({s.primary.preview.summary_stats.unit})</th><th>Plotted value</th><th>Source QA</th><th>Selected</th></tr></thead><tbody>{rows.slice(s.tablePage * 50, s.tablePage * 50 + 50).map(r => <tr key={r.timestamp} data-selected={s.selection?.seriesId === s.primary!.id && s.selection.time === r.time || undefined} onClick={() => { const i = rows.indexOf(r); if (i >= 0) commitIndex(s, i); }}><td>{r.timestamp}</td><td>{format(r.sourceValue ?? null, 4)}</td><td>{format(r.value, 4)}</td><td>{r.qa}</td><td>{s.selection?.time === r.time ? '●' : ''}</td></tr>)}</tbody></table></div>
        <div className="viz-table-pages"><button disabled={s.tablePage === 0} onClick={() => s.setTablePage(p => p - 1)}>Previous rows</button><span>Page {s.tablePage + 1} of {Math.max(1, Math.ceil(rows.length / 50))}</span><button disabled={(s.tablePage + 1) * 50 >= rows.length} onClick={() => s.setTablePage(p => p + 1)}>Next rows</button></div>
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
                : <p className="viz-muted">Click a chart point, heatmap cell, aligned pair, or table row to commit a selection shared across panels.</p>}
        </section>
        <section className="viz-control-section"><span className="viz-step">DISPLAY</span>
            <div className="viz-filter-row"><label>From<input type="date" value={s.filterStart} onChange={e => s.setFilterStart(e.target.value)}/></label><label>To<input type="date" value={s.filterEnd} onChange={e => s.setFilterEnd(e.target.value)}/></label></div>
            <label className="viz-check"><input type="checkbox" checked={s.includeFlagged} onChange={e => s.setIncludeFlagged(e.target.checked)}/> Include provider-flagged values (display only — backend inference policy unchanged)</label>
            <dl className="viz-kv"><dt>Usable</dt><dd>{stats.count} ({stats.missing} missing/excluded)</dd><dt>Mean</dt><dd>{format(stats.mean)} {p.summary_stats.unit}</dd><dt>First→last</dt><dd>{format(stats.change)} {p.summary_stats.unit} — endpoint difference, not an estimated trend</dd></dl>
        </section>
        <section className="viz-control-section"><span className="viz-step">SOURCE</span>
            <dl className="viz-kv"><dt>Product</dt><dd>{p.product.product_id} / {p.product.variable_id}</dd><dt>Provider</dt><dd>{p.product.source_api} / {p.product.provider_agency}</dd><dt>Support</dt><dd>{p.extraction_config.target_frequency} / {p.extraction_config.temporal_aggregation} · {p.spatial_semantics_applied || 'point sampling'}</dd><dt>Result / job</dt><dd>{p.result_id || '—'} / {p.job_id}</dd><dt>Retrieved</dt><dd>{p.retrieved_at}</dd><dt>SHA-256</dt><dd className="viz-hash">{p.sha256_hash || 'Not supplied'}</dd></dl>
            {p.product.source_url && <a href={p.product.source_url} rel="noreferrer" target="_blank">Source documentation</a>}
        </section>
        <section className="viz-control-section"><span className="viz-step">SERIES</span>{s.series.map(v => <article key={v.id} className="viz-series-row"><label><input type="checkbox" checked={!s.hidden.includes(v.id)} onChange={e => s.toggleHidden(v.id, e.target.checked)}/><i style={{ background: v.color }}/>{v.label}</label><button onClick={() => s.removeSeries(v.id)}>Remove</button></article>)}</section>
    </div>;
}

export function ComparisonPanel(_p: P) {
    const s = useStudio();
    if (!s.primary) return <EmptyData />;
    const visible = s.entries;
    const trendBinding = s.analysis.binding;
    const trendOk = trendBinding && trendBinding.submission.methods.some(m => m === 'sen_slope' || m === 'ols') && trendBinding.inputKey === s.analysis.inputKey;
    return <div className="viz-panel viz-panel-scroll">
        <table className="viz-compare"><caption>Visible series over the shared display window — descriptive values only.</caption>
            <thead><tr><th>Series</th><th>Usable</th><th>Mean</th><th>Range</th><th>Std dev</th><th>First→last</th></tr></thead>
            <tbody>{visible.map(v => { const rows = s.data.get(v.id) ?? []; const st = summary(rows); const sd = deviation(rows); return <tr key={v.id}><td><i className="viz-swatch" style={{ background: v.color }}/>{v.label}</td><td>{st.count}</td><td>{format(st.mean)} {v.preview.summary_stats.unit}</td><td>{format(st.min)}–{format(st.max)}</td><td>{sd === null ? 'Unavailable' : sd === 0 ? '0 (zero variance)' : format(sd)}</td><td>{format(st.change)}</td></tr>; })}</tbody>
        </table>
        {trendOk ? <div className="viz-control-section"><span className="viz-step">SUBMITTED TREND ESTIMATE</span>
            <dl className="viz-kv"><dt>Sen slope</dt><dd>{format(trendBinding.result.sens_slope_decadal)} {trendBinding.result.unit}/decade · 95% CI {format(trendBinding.result.sens_ci_low)} to {format(trendBinding.result.sens_ci_high)}</dd><dt>OLS slope</dt><dd>{format(trendBinding.result.ols_slope_decadal)} {trendBinding.result.unit}/decade · 95% CI {format(trendBinding.result.ols_ci_low_decadal)} to {format(trendBinding.result.ols_ci_high_decadal)}</dd><dt>Bound to</dt><dd>{trendBinding.result.dataset_name} · {trendBinding.result.start_year}–{trendBinding.result.end_year} · methods {trendBinding.submission.methods.join(', ')}</dd></dl>
            <p className="viz-muted">Intervals are this submission’s estimates only; no cross-dataset trend comparison is implied.</p></div>
            : <p className="viz-muted">Trend estimates appear here only for a matching submitted analysis on the primary series — run the selected methods on Data Analysis. Endpoint differences above are descriptive, not trend estimates.</p>}
    </div>;
}
