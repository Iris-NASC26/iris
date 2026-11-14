"use client";
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { IDockviewPanelProps } from 'dockview-react';
import { ChartCanvas } from '../Charts';
import { MONTHS } from '../model';
import { landscape, MAX_SURFACE_PATCHES, type Landscape } from '../landscape/model';
import { PALETTES, useDisplay } from './display';
import { useStudio } from './state';
const LandscapeChart = dynamic(() => import('../landscape/LandscapeChart').then(m => m.LandscapeChart), { ssr: false, loading: () => <p className="viz-muted">Loading the 3D renderer…</p> });

export function LandscapeHeatmap({ model, onSelect, selectedTime }: { model: Landscape; onSelect: (time: number) => void; selectedTime: number | null }) {
    const { display } = useDisplay(), foreground = display.dark ? '#acbdcf' : '#47586d';
    const selected = model.cells.find(c => c.row.time === selectedTime);
    return <ChartCanvas label={`${model.description}. ${model.cells.length} values in ${model.unit}. Blank cells are missing or excluded.`} onSelect={data => { const value = (data as { value?: unknown })?.value ?? data; if (Array.isArray(value) && typeof value[3] === 'number') onSelect(value[3]); }} option={{
        animation: false, aria: { enabled: true }, backgroundColor: 'transparent',
        grid: { top: 24, left: 60, right: 20, bottom: 65 },
        xAxis: { type: 'category', data: MONTHS, axisLabel: { color: foreground }, splitArea: { show: false } },
        yAxis: { type: 'category', data: model.years.map(String), name: 'Year', axisLabel: { color: foreground }, nameTextStyle: { color: foreground } },
        visualMap: { min: model.range[0], max: model.range[1], dimension: 2, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 100, itemWidth: 10, text: [model.range[1].toPrecision(3), model.range[0].toPrecision(3)], inRange: { color: PALETTES[display.palette] }, textStyle: { color: foreground }, precision: 2 },
        tooltip: { confine: true, renderMode: 'richText', formatter: ((p: { data: number[] }) => `${MONTHS[p.data[0]]} ${model.years[p.data[1]]}\n${p.data[2].toPrecision(5)} ${model.unit}\n${model.description}`) as never },
        series: [{ type: 'heatmap', data: model.cells.map(c => ({ value: [c.month, model.years.indexOf(c.year), c.value, c.row.time], itemStyle: { borderWidth: selected?.row.time === c.row.time ? 3 : 1, borderColor: selected?.row.time === c.row.time ? '#ffe5a0' : display.dark ? '#111d2c' : '#fff' } })), emphasis: { itemStyle: { borderWidth: 2, borderColor: '#ffe5a0' } } }],
        dataZoom: model.years.length > 25 ? [{ type: 'slider', yAxisIndex: 0, orient: 'vertical', right: 0, width: 12 }] : [],
    }}/>
}

export function LandscapePanel(_props: IDockviewPanelProps) {
    const s = useStudio(), { display, update } = useDisplay();
    const [reset, setReset] = useState(0), [unavailable, setUnavailable] = useState('');
    const model = useMemo(() => landscape(s.primaryRows, s.primary?.preview.extraction_config.target_frequency ?? '', display.quantity, s.primary?.preview.summary_stats.unit ?? ''), [s.primaryRows, s.primary, display.quantity]);
    const select = (time: number) => { const r = s.primaryRows.find(r => r.time === time); if (r && s.primary) { s.setPlaying(false); s.setTimeIndex(s.times.indexOf(time)); s.select({ seriesId: s.primary.id, time, timestamp: r.timestamp }); } };
    const flat = display.representation === 'heatmap' || !!unavailable || (display.representation === 'surface' && model.patches.length > MAX_SURFACE_PATCHES);
    if (!s.primary) return <div className="viz-empty viz-empty-hero viz-landscape-empty"><span className="viz-orbit-glyph" aria-hidden="true">◈</span><span className="viz-eyebrow">YOUR RECORD, IN A NEW DIMENSION</span><h3>See the shape of change.</h3><p>Data selected through SI, Data Selection and Data Analysis appears here automatically. Open data controls to load another record.</p><span>No demonstration values are loaded.</span></div>;
    return <div className="viz-panel viz-landscape-panel">
        <div className="viz-panel-tools viz-landscape-tools">
            <span className="viz-chart-types" role="group" aria-label="Landscape representation">{(['surface', 'columns', 'heatmap'] as const).map(value => <button key={value} aria-pressed={display.representation === value} onClick={() => update({ representation: value })}>{({ surface: '3D Surface', columns: '3D Columns', heatmap: '2D Heatmap' })[value]}</button>)}</span>
            <label>Quantity<select aria-label="Landscape quantity" value={display.quantity} onChange={e => update({ quantity: e.target.value as typeof display.quantity })}><option value="observed">Observed values</option><option value="departure">Calendar-month departures</option><option value="standardized">Standardized values</option></select></label>
            <label>Palette<select value={display.palette} onChange={e => update({ palette: e.target.value as typeof display.palette })}><option value="earth">Earth</option><option value="ocean">Ocean</option><option value="ember">Ember</option></select></label>
            <details className="viz-display-details"><summary>Scene settings</summary><div>
                <label>Projection<select value={display.projection} onChange={e => update({ projection: e.target.value as typeof display.projection })}><option value="perspective">Perspective</option><option value="orthographic">Orthographic</option></select></label>
                <label>Vertical emphasis<input type="range" min="15" max="100" value={display.height} onChange={e => update({ height: Number(e.target.value) })}/></label>
                <label className="viz-check"><input type="checkbox" checked={display.wireframe} onChange={e => update({ wireframe: e.target.checked })}/> Surface mesh</label>
                <button className="viz-button" onClick={() => { setUnavailable(''); setReset(v => v + 1); }}>Reset camera / retry 3D</button>
            </div></details>
        </div>
        <div className="viz-landscape-subtitle"><span>{s.primary.preview.product.variable_name}</span><span>{model.unit} · {model.cells.length} usable months</span></div>
        {!flat && display.representation === 'surface' && !model.reason && !model.patches.length && <p className="viz-muted">No complete adjacent-month/year grid is available for a surface. Real observations are shown as points. Choose 3D Columns or 2D Heatmap for a clearer view of this sparse record.</p>}
        {model.reason ? <div className="viz-empty"><h3>Use the time series for this record.</h3><p>{model.reason}</p></div>
            : flat ? <><LandscapeHeatmap model={model} onSelect={select} selectedTime={s.selection?.time ?? null}/>{unavailable && <p role="status" className="viz-notice">{unavailable}</p>}{model.patches.length > MAX_SURFACE_PATCHES && display.representation === 'surface' && <p className="viz-notice">This record is too fragmented for a clear surface. Use columns or this heatmap to inspect every usable month.</p>}</>
                : <LandscapeChart key={`${s.primary.id}:${reset}`} model={model} display={display} reset={reset} selectedTime={s.selection?.time ?? null} onSelect={select} onUnavailable={setUnavailable}/>}
        <p className="viz-panel-foot">{model.description}. {model.missing} empty calendar cells in the displayed years. Drag to orbit · scroll to zoom · click a point to link views. Surface shading connects adjacent observations for display only; gaps are never filled. Vertical emphasis changes appearance, not numeric values.</p>
    </div>;
}

export function LinkedHeatmapPanel(_props: IDockviewPanelProps) {
    const s = useStudio(), { display } = useDisplay();
    const model = useMemo(() => landscape(s.primaryRows, s.primary?.preview.extraction_config.target_frequency ?? '', display.quantity, s.primary?.preview.summary_stats.unit ?? ''), [s.primaryRows, s.primary, display.quantity]);
    return <div className="viz-panel"><div className="viz-panel-tools"><strong>Same values. A different perspective.</strong><span className="viz-muted">{model.unit}</span></div>{model.reason ? <div className="viz-empty"><p>{s.primary ? model.reason : 'Select a dataset to see its monthly pattern.'}</p></div> : <LandscapeHeatmap model={model} selectedTime={s.selection?.time ?? null} onSelect={time => { const r = s.primaryRows.find(r => r.time === time); if (r && s.primary) { s.setPlaying(false); s.setTimeIndex(s.times.indexOf(time)); s.select({ seriesId: s.primary.id, time, timestamp: r.timestamp }); } }}/>}<p className="viz-panel-foot">{model.description}. Empty cells contain no usable observation. Click a cell to select its source timestamp.</p></div>;
}
