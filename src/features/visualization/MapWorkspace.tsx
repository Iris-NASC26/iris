"use client";
// The map-centred investigation workspace: selection bar, layer/styling panel,
// Cesium stage with 2D fallback, cell inspector and the month timeline. Used
// by the dedicated /workspace/globe route — one owner, one Cesium lifecycle.
import dynamic from "next/dynamic";
import Link from 'next/link';
import '@/features/hazards/hazards.css';
import { useState } from "react";
import { estimateNativeCells, EXTENT_PRESETS, fieldRoute, parseBox } from "./extents";
import { imageryIndex, LAYER_DEFS, moveLayer } from "./layers";
import { format, isOverview, numeric } from "./model";
import { DEFAULT_STYLE, RAMPS, rangeLabel, styleRange, type RangeMode } from "./styles";
import type { MapState } from "./studio/state";
import { isSpatialVariableId, SPATIAL_GROUPS, SPATIAL_VARIABLES, spatialVariable } from "./spatialVariables";

const Globe = dynamic(() => import('./Globe').then(m => m.Globe), { ssr: false, loading: () => <p className="viz-empty">Loading Earth renderer...</p> });

export function MapWorkspace({ map, selectedTimestamp, onInspectTimeSeries, spatialOnly = false }: {
    map: MapState;
    selectedTimestamp?: string;
    onInspectTimeSeries?: () => void;
    spatialOnly?: boolean;
}) {
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [layersOpen, setLayersOpen] = useState(true);
    const { field, applied } = map;
    return <section className="viz-map-workspace" aria-label="Map-centred investigation workspace">
     <div className="viz-map-topbar">
      <label>Spatial variable<select value={map.variable} onChange={e => { if (isSpatialVariableId(e.target.value)) map.setVariable(e.target.value); }}>{SPATIAL_GROUPS.map(group => <optgroup key={group} label={group}>{SPATIAL_VARIABLES.filter(variable => variable.group === group).map(variable => <option key={variable.id} value={variable.id}>{variable.label} / {variable.field} ({variable.units})</option>)}</optgroup>)}</select></label>
      <label>Spatial extent<select value={map.extentId} onChange={e => { const preset = EXTENT_PRESETS.find(p => p.id === e.target.value); if (!preset) return; map.setExtentId(preset.id); if (preset.id !== 'custom') { map.setBox(preset.box.map(String)); map.frame(); } }}>{EXTENT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <div className="viz-month-row"><label>Spatial month<input type="month" value={map.month} onChange={e => map.setMonth(e.target.value)}/></label><div className="viz-month-steps"><button className="viz-button" aria-label="Previous month" onClick={() => map.shiftMonth(-1)}>◀</button><button className="viz-button" aria-label="Next month" onClick={() => map.shiftMonth(1)}>▶</button></div></div>
      <button className="viz-button viz-primary" disabled={map.busy} onClick={() => map.load()}>{map.busy ? 'Loading cells...' : 'Load spatial field'}</button>
      {field && <button className="viz-button" onClick={map.clear}>Clear field</button>}
      <span className="viz-map-applied" role="status">{field && applied ? `Loaded: ${applied.variable} / ${applied.month} / ${applied.box[0]}°–${applied.box[1]}°N, ${applied.box[2]}°–${applied.box[3]}°E` : map.busy ? 'Loading the requested field…' : 'No field loaded for this selection'}</span>
      <span className="viz-map-panel-toggles"><button className="viz-button" aria-pressed={layersOpen} onClick={() => setLayersOpen(o => !o)}>{layersOpen ? 'Hide layers' : 'Layers'}</button><button className="viz-button" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen(o => !o)}>{inspectorOpen ? 'Hide inspector' : 'Inspector'}</button></span>
     </div>
     <p className="viz-spatial-description" role="note">{spatialVariable(map.variable).note} Choose an extent and month, then load the spatial field. Colours represent grid-cell values.</p>
     <div className="viz-map-body">
      {layersOpen && <aside className="viz-map-layers" aria-label="Selection and layer controls">
       
       <section><span className="viz-step">SELECTION</span>
        <p className="viz-muted">{EXTENT_PRESETS.find(p => p.id === map.extentId)?.note}</p>
        {['South latitude', 'North latitude', 'West longitude', 'East longitude'].map((label, i) => <label key={label}>{label}<input type="number" step="any" value={map.box[i]} onChange={e => { map.setExtentId('custom'); map.setBox(map.box.map((v, j) => i === j ? e.target.value : v)); }}/></label>)}
        <p className="viz-muted">{parseBox(map.box) ? `≈${estimateNativeCells(parseBox(map.box)!, map.variable).toLocaleString()} native cells — ${fieldRoute(parseBox(map.box)!, map.variable) === 'field' ? 'native-resolution read (≤ 4,000 cells)' : 'aggregated overview; the declared output resolution is shown with the loaded field'}.` : 'Enter an ordered extent before loading.'}</p>
        <div className="viz-map-selection-actions"><button className="viz-button" onClick={map.requestExtentAround}>Use box around selected location</button>
        <button className="viz-button" aria-pressed={map.drawMode} onClick={() => map.setDrawMode(!map.drawMode)}>{map.drawMode ? 'Cancel box drawing' : 'Draw box on 2D map'}</button></div>
        {map.drawMode && <p className="viz-muted" role="status">Drawing armed — switch to the 2D map and drag a rectangle to set the requested extent.</p>}
       </section>
       <section className="viz-layer-controls"><span className="viz-step">LAYERS</span>
        {map.layerOrder.map((id, index) => { if (spatialOnly && id === 'points') return null; const def = LAYER_DEFS.find(d => d.id === id)!; const status = id === 'field' ? (field ? 'loaded' : map.busy ? 'loading…' : 'not loaded') : id === 'points' ? `${map.points.length} marker${map.points.length === 1 ? '' : 's'}` : id === 'extent' ? 'requested box' : map.engineBasemap; return <article key={id} className="viz-layer"><div className="viz-layer-head"><label className="viz-check"><input type="checkbox" checked={map.layerVisible[id]} onChange={e => map.setLayerVisible(v => ({ ...v, [id]: e.target.checked }))}/> {def.name}</label><span className="viz-layer-order"><button aria-label={`Move ${def.name} up`} disabled={index === 0} onClick={() => map.setLayerOrder(o => moveLayer(o, id, -1))}>↑</button><button aria-label={`Move ${def.name} down`} disabled={index === map.layerOrder.length - 1} onClick={() => map.setLayerOrder(o => moveLayer(o, id, 1))}>↓</button></span></div><small>{def.group} / {status}</small>
         {id === 'field' && <label>Field opacity<input aria-label="Field opacity" type="range" min={0.2} max={1} step={0.05} value={map.fieldAlpha} onChange={e => map.setFieldAlpha(Number(e.target.value))}/></label>}
         {id === 'basemap' && <label>Basemap opacity<input aria-label="Basemap opacity" type="range" min={0.2} max={1} step={0.05} value={map.basemapAlpha} onChange={e => map.setBasemapAlpha(Number(e.target.value))}/></label>}
        </article>; })}
        <p className="viz-muted">Imagery layers can be reordered; outlines and markers always draw above imagery.</p>
        <button className="viz-button" onClick={map.frame}>Frame selected extent</button>
       </section>
       <section><span className="viz-step">FIELD STYLING</span>
        <label>Colour ramp<select value={map.style.rampId} onChange={e => map.setStyle(s => ({ ...s, rampId: e.target.value }))}>{RAMPS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select><small className="viz-muted">{RAMPS.find(r => r.id === map.style.rampId)?.note}</small></label>
        <label>Colour range<select value={map.style.rangeMode} onChange={e => map.setStyle(s => ({ ...s, rangeMode: e.target.value as RangeMode }))}><option value="fixed">Fixed physical scale</option><option value="auto">Automatic — loaded field</option><option value="custom">Custom bounds</option></select><small className="viz-muted">{field ? rangeLabel(map.style, field.variable_id) : 'Applies to the next loaded field.'}</small></label>
        {map.style.rangeMode === 'custom' && <div className="viz-two-cols"><label>Range min<input type="number" step="any" value={map.customRange[0]} onChange={e => { const next: [string, string] = [e.target.value, map.customRange[1]]; map.setCustomRange(next); const lo = Number(next[0]), hi = Number(next[1]); map.setStyle(s => ({ ...s, custom: numeric(lo) && numeric(hi) && lo < hi ? [lo, hi] : s.custom })); }}/></label><label>Range max<input type="number" step="any" value={map.customRange[1]} onChange={e => { const next: [string, string] = [map.customRange[0], e.target.value]; map.setCustomRange(next); const lo = Number(next[0]), hi = Number(next[1]); map.setStyle(s => ({ ...s, custom: numeric(lo) && numeric(hi) && lo < hi ? [lo, hi] : s.custom })); }}/></label></div>}
        {field && <p className="viz-muted">Displayed range: {format(styleRange(field, map.style)[0])} to {format(styleRange(field, map.style)[1])} {field.units}.</p>}
        <button className="viz-button" onClick={() => { map.setStyle({ ...DEFAULT_STYLE, rampId: spatialVariable(map.variable).ramp }); map.setCustomRange(['', '']); }}>Restore default styling</button>
       </section>
       {field && <section><span className="viz-step">FIELD SOURCE</span><div className="viz-field-source"><strong>{field.values.filter(numeric).length} of {field.values.length} {isOverview(field) ? 'output cells' : 'native cells'} contain values / {field.month} / {field.units} / {field.time_standard}</strong>{isOverview(field) && <p>Extent {field.extent.lat_min}° to {field.extent.lat_max}° N, {field.extent.lon_min}° to {field.extent.lon_max}° E — {field.resolution.output_cells.toLocaleString()} output cells at {format(field.lat_step)}° × {format(field.lon_step)}°{field.resolution.aggregation === 'none' ? ' (native source resolution)' : `, ${field.resolution.factor_lat} × ${field.resolution.factor_lon} cells combined by cos(lat)-area-weighted mean from ${format(field.resolution.source_lat_step)}° × ${format(field.resolution.source_lon_step)}°`}.</p>}<p>{field.source.title} / {field.source.version}{field.source.stale_cache ? ' / STALE CACHED SOURCE' : field.source.from_cache ? ' / Cached source' : ' / Retrieved source'}</p><p>Raw monthly model data. No slope, significance, forecast or scientific validation is implied.</p><details><summary>Spatial source and provenance</summary><a href={field.source.url} target="_blank" rel="noreferrer">NASA source store</a><p>Retrieved {field.source.retrieved_at}</p><ul>{field.source.caveats.map(c => <li key={c}>{c}</li>)}</ul><pre>{JSON.stringify(field.source.artifact_sha256, null, 2)}</pre></details></div></section>}
      </aside>}
      <div className="viz-map-stage">
       {map.error && <p role="alert" className="viz-error">{map.error}</p>}
       <Globe field={field} points={map.points} onPick={map.onPick} extentBox={parseBox(map.box)} frameSignal={map.frameSignal} basemapAlpha={map.basemapAlpha} basemapVisible={map.layerVisible.basemap} fieldAlpha={map.fieldAlpha} fieldVisible={map.layerVisible.field} fieldStyle={map.style} pointsVisible={map.layerVisible.points} extentVisible={map.layerVisible.extent} fieldUnderBasemap={imageryIndex(map.layerOrder, 'field') < imageryIndex(map.layerOrder, 'basemap')} drawMode={map.drawMode} cellClearSignal={map.cellClearSignal} onDrawBox={map.onDrawBox} onCellInspect={i => { map.setInspection(i); if (i) setInspectorOpen(true); }} onEngineState={s => { map.setEngineBasemap(s.basemap); if (s.basemap === 'tiles-degraded') map.onEngineNotice('Tiled basemap requests failed — switched to the local NASA image. "Retry tiled imagery" restores it.'); }}/>
      </div>
      {inspectorOpen && <aside className="viz-map-inspector" aria-label="Cell inspector">
       <div className="viz-inspector-head"><span className="viz-step">INSPECTOR</span><button className="viz-button" onClick={() => setInspectorOpen(false)}>Close</button></div>
       {map.inspection ? <><dl>
        <dt>Coordinates</dt><dd>{map.inspection.lat.toFixed(3)}°, {map.inspection.lon.toFixed(3)}°</dd>
        <dt>Value</dt><dd>{!field ? 'No spatial field loaded' : map.inspection.cell ? (map.inspection.value === null ? 'Missing or invalid source value (transparent cell)' : `${format(map.inspection.value)} ${field.units}`) : 'Outside the loaded field grid'}</dd>
        {map.inspection.cell && <><dt>Cell footprint</dt><dd>{map.inspection.cell.south.toFixed(3)}°–{map.inspection.cell.north.toFixed(3)}° N, {map.inspection.cell.west.toFixed(3)}°–{map.inspection.cell.east.toFixed(3)}° E</dd></>}
        {field && <><dt>Month / standard</dt><dd>{field.month} / {field.time_standard}</dd>
        <dt>Resolution</dt><dd>{isOverview(field) && field.resolution.aggregation !== 'none' ? `Aggregated ${format(field.lat_step)}° × ${format(field.lon_step)}° cells (${field.resolution.factor_lat} × ${field.resolution.factor_lon} native cells, area-weighted mean)` : `Native ${format(field.lat_step)}° × ${format(field.lon_step)}° cells`}</dd>
        {isOverview(field) && map.inspection.cell && field.coverage && <><dt>Source coverage</dt><dd>{(() => { const r = field.cell_lats.indexOf(map.inspection!.cell!.lat), c = field.cell_lons.indexOf(map.inspection!.cell!.lon); const cov = field.coverage?.[r * field.cell_lons.length + c]; return cov === null || cov === undefined ? 'Unavailable' : `${Math.round(cov * 100)}% of source cells contributed`; })()}</dd></>}
        <dt>Source</dt><dd>{field.source.title} / {field.source.version}{field.source.stale_cache ? ' / stale cache' : ''}</dd></>}
       </dl>
       <div className="viz-inspector-actions">
        {onInspectTimeSeries && <button className="viz-button" onClick={onInspectTimeSeries}>Inspect time series at this point</button>}
        <button className="viz-button" onClick={() => { map.setInspection(null); map.clearCell(); }}>Clear selection</button>
       </div>
       <p className="viz-muted">{spatialOnly ? 'Inspect the grid value here, or open the visualization studio to explicitly request a point time series. ' : 'Coordinates were copied to the location form — loading a point series remains an explicit action. '}Picked values come from the numerical payload, never from imagery colours.</p></> : <p className="viz-muted">Click a cell on the map to inspect its actual value, footprint and provenance. Camera moves never inspect data.</p>}
      </aside>}
     </div>
     <div className="viz-map-timeline">
      <button className="viz-button" disabled={!field} aria-pressed={map.playing} onClick={() => map.setPlaying(!map.playing)}>{map.playing ? 'Pause spatial playback' : 'Play spatial field'}</button>
      <div className="viz-month-steps"><button className="viz-button" aria-label="Previous month" onClick={() => map.shiftMonth(-1)}>◀</button><button className="viz-button" aria-label="Next month" onClick={() => map.shiftMonth(1)}>▶</button></div>
      <span>Loaded month: <strong>{field?.month ?? 'none'}</strong></span>
      {selectedTimestamp && <span>Selected observation: <strong>{selectedTimestamp}</strong></span>}
      {field && selectedTimestamp && !spatialOnly && <label className="viz-check"><input type="checkbox" checked={map.syncLinked} onChange={e => map.setSyncLinked(e.target.checked)}/> Sync spatial field to observation month</label>}
      <p className="viz-muted">Playback issues a real request per month — unsupported months report failure instead of repeating another month’s values.</p>
     </div>
    </section>;
}
