"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { Icon } from "@/components/ui/Icon";
import { REGION_PRESETS, type DataProduct, type DiscoveryResponse, type ExtractionRequest, type PreviewResponse } from "@/lib/dataRetrievalEngine";
import { useVisualizations } from "./store";
import { CHARTS, type ChartKind } from "./Charts";
import { coordinates, csvCell, format, isOverview, MAX_SERIES, numeric, parseField, parseOverview, parsePreview, rows, summary, timestamp, type SpatialField, type VisualSeries } from "./model";
import { EXTENT_PRESETS, estimateNativeCells, fieldRoute, parseBox, type ExtentBox } from "./extents";
import type { MapPoint } from "./Globe";
import './visualization.css';
const DataChart = dynamic(() => import('./Charts').then(m => m.DataChart), { ssr: false, loading: () => <p className="viz-empty">Loading chart engine...</p> });
const Globe = dynamic(() => import('./Globe').then(m => m.Globe), { ssr: false, loading: () => <p className="viz-empty">Loading Earth renderer...</p> });
export function VisualizationWorkspace({ initialView = 'charts' }: {
    initialView?: 'charts' | 'globe';
}) {
    const dashboard = useDashboard(), store = useVisualizations(), params = useSearchParams(), router = useRouter();
    const [view, setView] = useState<'charts' | 'globe' | 'table'>(initialView), [kind, setKind] = useState<ChartKind>('line');
    const [prompt, setPrompt] = useState(''), [catalog, setCatalog] = useState<DataProduct[]>([]), [selected, setSelected] = useState<string[] | null>(null);
    const [searching, setSearching] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [place, setPlace] = useState(dashboard.extractionConfig.region_name), [lat, setLat] = useState(String(dashboard.extractionConfig.point_lat ?? 6.9355)), [lon, setLon] = useState(String(dashboard.extractionConfig.point_lon ?? 79.8487));
    const [start, setStart] = useState(dashboard.extractionConfig.start_date), [end, setEnd] = useState(dashboard.extractionConfig.end_date), [frequency, setFrequency] = useState('Monthly');
    const [primaryId, setPrimaryId] = useState(''), [hidden, setHidden] = useState<string[]>([]), [filterStart, setFilterStart] = useState(''), [filterEnd, setFilterEnd] = useState('');
    const [includeFlagged, setIncludeFlagged] = useState(false), [normalized, setNormalized] = useState(false), [timeIndex, setTimeIndex] = useState(0), [playing, setPlaying] = useState(false), [tablePage, setTablePage] = useState(0);
    const [fieldVariable, setFieldVariable] = useState<'V01' | 'V12'>('V01'), [fieldMonth, setFieldMonth] = useState('2024-01'), [fieldBox, setFieldBox] = useState(['4', '16', '76', '86']);
    const [field, setField] = useState<SpatialField | null>(null), [fieldBusy, setFieldBusy] = useState(false), [fieldError, setFieldError] = useState('');
    const [extentId, setExtentId] = useState('custom'), [basemapAlpha, setBasemapAlpha] = useState(1), [fieldAlpha, setFieldAlpha] = useState(0.93), [fieldVisible, setFieldVisible] = useState(true), [frameSignal, setFrameSignal] = useState(0);
    const request = useRef<AbortController | null>(null), fieldRequest = useRef<AbortController | null>(null), searchRequest = useRef<AbortController | null>(null), geoRequest = useRef<AbortController | null>(null);
    const seenPreview = useRef('');
    const productKey = (p: DataProduct) => `${p.product_id}::${p.variable_id}`;
    const products = useMemo(() => {
        const map = new Map<string, DataProduct>();
        [...dashboard.selectedProducts, ...dashboard.discoveryResult.products, ...catalog, ...(dashboard.activeProduct ? [dashboard.activeProduct] : []), ...(dashboard.extractedPreview ? [dashboard.extractedPreview.product] : [])].forEach(p => map.set(productKey(p), p));
        return [...map.values()];
    }, [dashboard.selectedProducts, dashboard.discoveryResult.products, dashboard.activeProduct, dashboard.extractedPreview, catalog]);
    const chosen = selected !== null ? products.filter(p => selected.includes(productKey(p))) : products.filter(p => dashboard.selectedProducts.some(s => productKey(s) === productKey(p))).slice(0, 1);
    const entries = store.series.filter(s => !hidden.includes(s.id));
    const primary = entries.find(s => s.id === primaryId) ?? entries[0];
    const validWindow = !filterStart || !filterEnd || filterStart <= filterEnd;
    const data = useMemo(() => new Map(store.series.map(s => [s.id, validWindow ? rows(s.preview, filterStart, filterEnd, includeFlagged) : []])), [store.series, filterStart, filterEnd, includeFlagged, validWindow]);
    const primaryRows = primary ? data.get(primary.id) ?? [] : [];
    const stats = summary(primaryRows);
    const times = primaryRows.map(r => r.time), selectedTime = times[Math.min(timeIndex, Math.max(0, times.length - 1))];
    const primaryIndex = Math.min(timeIndex, Math.max(0, primaryRows.length - 1));
    const points: MapPoint[] = entries.flatMap(s => { const position = coordinates(s.preview); if (!position)
        return []; const value = (data.get(s.id) ?? []).find(r => r.time === selectedTime)?.value ?? null; return [{ id: s.id, label: `${s.preview.product.variable_name} / ${s.preview.extraction_config.region_name}`, lat: position.lat, lon: position.lon, value, units: s.preview.summary_stats.unit, color: s.color }]; });
    const ingest = (preview: PreviewResponse) => { store.add(preview); setPrimaryId(preview.result_id || preview.job_id); };
    useEffect(() => { const p = dashboard.extractedPreview; if (!p || seenPreview.current === p.job_id)
        return; seenPreview.current = p.job_id; try {
        ingest(parsePreview(p));
    }
    catch (e) {
        setError(message(e));
    } }, [dashboard.extractedPreview]); // Immutable job identity prevents duplicate ingestion.
    useEffect(() => {
        const job = params.get('jobId');
        if (!job || dashboard.extractedPreview?.job_id === job)
            return;
        const controller = new AbortController();
        setLoading(true);
        setError('');
        void json(`/api/v1/timeseries/jobs/${encodeURIComponent(job)}/preview?page=1&page_size=1000`, { signal: controller.signal }).then(value => { if (controller.signal.aborted)
            return; const p = parsePreview(value); ingest(p); dashboard.setExtractedPreview(p); }).catch(e => { if (!controller.signal.aborted)
            setError(message(e)); }).finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, [params.get('jobId')]);
    useEffect(() => { setTimeIndex(0); setTablePage(0); setPlaying(false); }, [primary?.id, filterStart, filterEnd, includeFlagged]);
    useEffect(() => { if (!playing || times.length < 2)
        return; const id = window.setInterval(() => setTimeIndex(i => (i + 1) % times.length), 650); return () => clearInterval(id); }, [playing, times.length]);
    useEffect(() => () => { request.current?.abort(); fieldRequest.current?.abort(); searchRequest.current?.abort(); geoRequest.current?.abort(); }, []);
    const fieldKey = `${fieldVariable}|${fieldMonth}|${fieldBox.join(',')}`;
    useEffect(() => {
        // A request issued for this exact selection (e.g. the month steppers'
        // immediate reload) supersedes the clear; older requests are stale.
        if ((fieldRequest.current as { requestKey?: string } | null)?.requestKey === fieldKey)
            return;
        fieldRequest.current?.abort();
        setField(null);
        setFieldError('');
        setFieldBusy(false);
    }, [fieldKey]);
    async function discover(event: FormEvent) {
        event.preventDefault();
        if (!prompt.trim())
            return;
        searchRequest.current?.abort();
        const controller = new AbortController();
        searchRequest.current = controller;
        setSearching(true);
        setError('');
        try {
            const result = await json('/api/v1/si/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim(), preferred_providers: ['NASA POWER'] }), signal: controller.signal }) as DiscoveryResponse;
            if (controller.signal.aborted)
                return;
            if (!Array.isArray(result.products))
                throw new Error('Discovery returned no product catalog.');
            setCatalog(result.products);
            setSelected([]);
            const intent = result.intent;
            if (intent && intent.inferred_spatial_level !== 'global') {
                const center = intent.inferred_Center;
                if (Array.isArray(center) && center.length === 2 && center.every(numeric) && Math.abs(center[0]) <= 90 && Math.abs(center[1]) <= 180) {
                    setLat(String(center[0])); setLon(String(center[1]));
                    if (intent.inferred_region_name) setPlace(intent.inferred_region_name);
                }
                if (/^\d{4}-\d{2}-\d{2}$/.test(intent.inferred_start_date) && /^\d{4}-\d{2}-\d{2}$/.test(intent.inferred_end_date)) {
                    setStart(intent.inferred_start_date); setEnd(intent.inferred_end_date);
                }
            }
            setNotice(`${result.products.length} catalog matches. Select products, then load observations. Review any suggested coordinates and dates before loading. A catalog match is not an extraction guarantee.${result.intent?.inferred_spatial_level === "global" ? " Global requests need a selected point or bounded spatial field, not a falsely global point series." : ""}`);
        }
        catch (e) {
            if (!controller.signal.aborted)
                setError(message(e));
        }
        finally {
            if (!controller.signal.aborted)
                setSearching(false);
        }
    }
    async function geocode() {
        geoRequest.current?.abort();
        const controller = new AbortController();
        geoRequest.current = controller;
        setError('');
        setNotice('Resolving place...');
        try {
            const result = await json(`/api/v1/geocode?q=${encodeURIComponent(place.trim())}`, { signal: controller.signal }) as {
                lat: number;
                lon: number;
                name: string;
            };
            if (controller.signal.aborted)
                return;
            if (!numeric(result.lat) || !numeric(result.lon) || Math.abs(result.lat) > 90 || Math.abs(result.lon) > 180)
                throw new Error('The geocoder returned no valid point.');
            setLat(String(result.lat));
            setLon(String(result.lon));
            setPlace(result.name);
            setNotice('Top geocoder match filled. Confirm the place and coordinates before loading; the suggested point is not an administrative boundary.');
        }
        catch (e) {
            if (!controller.signal.aborted) {
                setError(message(e));
                setNotice('');
            }
        }
    }
    async function load() {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        const latitude = Number(lat), longitude = Number(lon);
        if (!lat.trim() || !lon.trim() || !numeric(latitude) || !numeric(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !start || !end || start > end) {
            setError('Enter valid coordinates and an ordered observation period.');
            return;
        }
        if (!chosen.length) {
            setError('Select a dataset from discovery or System Intelligence first.');
            return;
        }
        if (store.series.length + chosen.length > MAX_SERIES) {
            setError(`Keep at most ${MAX_SERIES} series in this workspace. Remove a series first.`);
            return;
        }
        if (chosen.some(p => start < p.temporal_start.slice(0, 10) || end > p.temporal_end.slice(0, 10))) {
            setError('The period falls outside the selected product catalog bounds. Review the dates or choose a different product.');
            return;
        }
        if (chosen.some(p => !p.supported_frequencies.includes(frequency))) {
            setError('The selected cadence is unsupported by one or more products.');
            return;
        }
        setLoading(true);
        setError('');
        setNotice('');
        try {
            let completed = 0;
            for (const product of chosen) {
                if (controller.signal.aborted)
                    break;
                setNotice(`Retrieving ${completed + 1} of ${chosen.length}: ${product.variable_name}...`);
                const config: ExtractionRequest = { product_id: product.product_id, variable_id: product.variable_id, variable_name: product.variable_name, source_api: product.source_api, unit: product.unit, start_date: start, end_date: end, target_frequency: frequency as ExtractionRequest['target_frequency'], temporal_aggregation: 'mean', spatial_level: 'regional', spatial_Submode: 'point', region_name: place.trim() || `${latitude}, ${longitude}`, bbox: [Math.max(-180, longitude - 0.1), Math.max(-90, latitude - 0.1), Math.min(180, longitude + 0.1), Math.min(90, latitude + 0.1)], point_lat: latitude, point_lon: longitude, spatial_reduction: 'mean' };
                const value = await json('/api/v1/timeseries/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config), signal: controller.signal });
                if (controller.signal.aborted)
                    break;
                const preview = parsePreview(value);
                ingest(preview);
                dashboard.setExtractedPreview(preview);
                completed++;
            }
            if (!controller.signal.aborted)
                setNotice(`${completed} series loaded. Change location and load again to compare places; existing series stay in the workspace.`);
        }
        catch (e) {
            if (!controller.signal.aborted)
                setError(message(e) + ' Previously loaded series are retained.');
        }
        finally {
            if (!controller.signal.aborted)
                setLoading(false);
        }
    }
    const shiftMonth = (delta: number) => {
        const [y, m] = fieldMonth.split('-').map(Number);
        if (!y || !m)
            return;
        const next = new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
        setFieldMonth(next);
        if (field)
            void loadField(next);
    };
    async function loadField(month = fieldMonth) {
        fieldRequest.current?.abort();
        const controller = new AbortController();
        fieldRequest.current = controller;
        setField(null);
        setFieldError('');
        const box = parseBox(fieldBox);
        if (!box) {
            setFieldError('Enter an ordered region box within latitude/longitude limits.');
            return;
        }
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            setFieldError('Choose a valid month.');
            return;
        }
        const route = fieldRoute(box, fieldVariable);
        (controller as AbortController & { requestKey?: string }).requestKey = `${fieldVariable}|${month}|${fieldBox.join(',')}`;
        setFieldBusy(true);
        try {
            const query = new URLSearchParams({ variable: fieldVariable, month, lat_min: fieldBox[0], lat_max: fieldBox[1], lon_min: fieldBox[2], lon_max: fieldBox[3] });
            const result = route === 'overview'
                ? parseOverview(await json(`/api/v1/visualization/overview?${query}`, { signal: controller.signal }))
                : parseField(await json(`/api/v1/visualization/field?${query}`, { signal: controller.signal }));
            if (result.variable_id !== fieldVariable || result.month !== month)
                throw new Error("The spatial response does not match the requested variable and month.");
            if (!controller.signal.aborted) {
                setField(result);
                setFrameSignal(s => s + 1);
            }
        }
        catch (e) {
            if (!controller.signal.aborted)
                setFieldError(message(e));
        }
        finally {
            if (!controller.signal.aborted)
                setFieldBusy(false);
        }
    }
    function exportData(type: 'csv' | 'json') {
        if (!primary)
            return;
        const preview = primary.preview;
        const payload = { export_kind: 'iris.visualization.v1', note: 'Raw observations and display filters. No validated trend inference.', filters: { start: filterStart, end: filterEnd, includeFlagged }, provenance: { product: preview.product, extraction: preview.extraction_config, result_id: preview.result_id, job_id: preview.job_id, sha256: preview.sha256_hash, spatial_semantics: preview.spatial_semantics_applied, endpoint: preview.api_endpoint_called, retrieved_at: preview.retrieved_at }, observations: primaryRows };
        const text = type === 'json' ? JSON.stringify(payload, null, 2) : [['timestamp', 'source_value', 'plotted_value', 'unit', 'qa_flag', 'product_id', 'source_api', 'job_id', 'result_id', 'retrieved_at', 'spatial_semantics'].map(csvCell).join(','), ...primaryRows.map(r => [r.timestamp, r.sourceValue, r.value, preview.summary_stats.unit, r.qa, preview.product.product_id, preview.product.source_api, preview.job_id, preview.result_id, preview.retrieved_at, preview.spatial_semantics_applied].map(csvCell).join(','))].join('\n');
        const url = URL.createObjectURL(new Blob([text], { type: type === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `iris-${preview.product.variable_id}.${type}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function analyze() { if (!primary)
        return; dashboard.setExtractedPreview(primary.preview); dashboard.setAutoRunCase(false); router.push(`/workspace/visualize?view=analysis&jobId=${encodeURIComponent(primary.preview.job_id)}`); }
    const pick = (latitude: number, longitude: number) => { setLat(latitude.toFixed(4)); setLon(longitude.toFixed(4)); setPlace(`Picked location ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`); };
    return <div className="viz-workbench dashboard-page-inner">
  <header className="viz-heading"><div><span className="viz-eyebrow">YOUR EARTH OBSERVATION STUDIO</span><h2>Make the change visible.</h2><p>Choose the evidence. Explore the patterns. Keep the source in view.</p></div><Link className="viz-button" href="/workspace/intelligence"><Icon name="sparkles" size={16}/> Open SI discovery</Link></header>
  <div className="viz-layout">
   <aside className="viz-controls" aria-label="Visualization controls">
    <section className="viz-control-section"><span className="viz-step">01 / CHOOSE YOUR DATA</span>
     <form onSubmit={discover}><label htmlFor="viz-prompt">Find a dataset</label><div className="viz-search"><input id="viz-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Temperature, rain, sunlight..." maxLength={500}/><button disabled={searching || !prompt.trim()} type="submit">{searching ? 'Searching...' : 'Search'}</button></div></form>
     <p className="viz-muted">Uses the same discovery API as SI, focused on NASA POWER. Products selected in SI appear here too.</p>
     <div className="viz-product-list" aria-label="Datasets">{products.length ? products.map(product => <label key={productKey(product)} className="viz-product"><input type="checkbox" checked={chosen.some(p => productKey(p) === productKey(product))} onChange={e => { const current = chosen.map(productKey); setSelected(e.target.checked ? [...current, productKey(product)] : current.filter(key => key !== productKey(product))); }}/><span><strong>{product.variable_name}</strong><small>{product.source_api} / {product.unit}</small><small>{product.temporal_start.slice(0, 10)} to {product.temporal_end.slice(0, 10)}</small></span></label>) : <p className="viz-muted">Search above or select datasets in SI to begin. No observations are fetched on page load.</p>}</div>
    </section>
    <section className="viz-control-section"><span className="viz-step">02 / LOCATE THE QUESTION</span>
     <label htmlFor="viz-place">Place or region centre</label><div className="viz-search"><input id="viz-place" value={place} onChange={e => setPlace(e.target.value)} maxLength={120}/><button onClick={() => void geocode()} disabled={!place.trim()}>Find</button></div>
     <label htmlFor="viz-preset">Location preset</label><select id="viz-preset" value="" onChange={e => { const p = REGION_PRESETS.find(r => r.id === e.target.value); if (p) {
        setPlace(p.name);
        setLat(String(p.center[0]));
        setLon(String(p.center[1]));
    } }}><option value="">Choose a location...</option>{REGION_PRESETS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
     <div className="viz-two-cols"><label>Latitude<input type="number" min={-90} max={90} step="any" value={lat} onChange={e => setLat(e.target.value)}/></label><label>Longitude<input type="number" min={-180} max={180} step="any" value={lon} onChange={e => setLon(e.target.value)}/></label></div>
     <p className="viz-note">Time-series retrieval samples a point. A region name does not make it a regional average. Click the globe to pick coordinates.</p>
    </section>
    <section className="viz-control-section"><span className="viz-step">03 / SET THE PERIOD</span>
     <div className="viz-two-cols"><label>Observation start<input type="date" value={start} onChange={e => setStart(e.target.value)}/></label><label>Observation end<input type="date" value={end} onChange={e => setEnd(e.target.value)}/></label></div>
     <label>Observation cadence<select value={frequency} onChange={e => setFrequency(e.target.value)}>{['Daily', '8-Day', '16-Day', 'Monthly', 'Seasonal', 'Yearly'].map(f => <option key={f} disabled={chosen.some(p => !p.supported_frequencies.includes(f))}>{f}</option>)}</select></label>
     <p className="viz-muted">Temporal reduction: mean of source observations. Provider restrictions still apply.</p>
     <button className="viz-button viz-primary" onClick={() => void load()} disabled={loading || !chosen.length || store.series.length >= MAX_SERIES}>{loading ? 'Loading observations...' : 'Load selected datasets'}<Icon name="arrow" size={16}/></button>
     {loading && <button className="viz-button" onClick={() => { request.current?.abort(); setLoading(false); setNotice('Request cancelled. Existing data retained.'); }}>Cancel load</button>}
    </section>
    {store.series.length > 0 && <section className="viz-control-section"><span className="viz-step">LOADED SERIES / {store.series.length} OF {MAX_SERIES}</span><div className="viz-loaded-list">{store.series.map(s => <article key={s.id}><label><input type="checkbox" checked={!hidden.includes(s.id)} onChange={e => setHidden(current => e.target.checked ? current.filter(id => id !== s.id) : [...current, s.id])}/><i style={{ background: s.color }}/><span>{s.label}</span></label><button aria-label={`Remove ${s.label}`} onClick={() => store.remove(s.id)}>Remove</button></article>)}</div></section>}
   </aside>
   <section className="viz-results" aria-label="Visualization results" aria-busy={loading}>
    {error && <div className="viz-error" role="alert"><strong>Could not complete this request</strong><p>{error}</p></div>}{notice && <p className="viz-notice" role="status">{notice}</p>}
    <div className="viz-view-tabs" role="group" aria-label="Visualization view">{([['charts', 'Charts & patterns'], ['globe', 'Living globe'], ['table', 'Observation table']] as const).map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</div>
    {primary && <div className="viz-data-toolbar"><label>Primary series<select value={primary.id} onChange={e => setPrimaryId(e.target.value)}>{entries.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label><button className="viz-button" onClick={() => exportData('csv')}>Export CSV</button><button className="viz-button" onClick={() => exportData('json')}>Export JSON</button><button className="viz-button" onClick={analyze}>Scientific analysis</button></div>}
    {primary && <><div className="viz-filter-row"><label>Display from<input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}/></label><label>Display to<input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}/></label><label className="viz-check"><input type="checkbox" checked={includeFlagged} onChange={e => setIncludeFlagged(e.target.checked)}/> Include provider-flagged values</label></div>{!validWindow && <p className="viz-error" role="alert">Display end must follow display start.</p>}
     <div className="viz-kpis"><div><span>Usable observations</span><strong>{stats.count}</strong><small>{stats.missing} excluded or missing rows</small></div><div><span>Observed mean</span><strong>{format(stats.mean)}<small>{primary.preview.summary_stats.unit}</small></strong></div><div><span>Observed range</span><strong>{format(stats.min)} <small>to</small> {format(stats.max)}</strong></div><div><span>First-to-last change</span><strong>{format(stats.change)}<small>{primary.preview.summary_stats.unit}</small></strong><small>Endpoint difference, not an estimated trend</small></div></div>
    </>}
    {view === 'charts' && (primary ? <section className="viz-chart-card"><div className="viz-chart-types" role="group" aria-label="Chart type">{CHARTS.map(c => <button key={c.id} aria-pressed={kind === c.id} onClick={() => setKind(c.id)}>{c.label}</button>)}</div><p className="viz-chart-hint">{CHARTS.find(c => c.id === kind)?.hint}</p>{['line', 'area', 'bars'].includes(kind) && entries.length > 1 && <label className="viz-check"><input type="checkbox" checked={normalized} onChange={e => setNormalized(e.target.checked)}/> Standardize series for a unitless comparison</label>}{stats.count ? <DataChart kind={kind} entries={entries} primary={primary} data={data} normalized={normalized} onSelect={t => { const i = times.indexOf(t); if (i >= 0)
        setTimeIndex(i); }}/> : <div className="viz-empty">No usable observations in this period. Adjust the display filters or inspect the QA flags.</div>}</section> : <Empty />)}
    {view === 'globe' && <>
     <Globe field={field} points={points} onPick={pick} extentBox={parseBox(fieldBox)} frameSignal={frameSignal} basemapAlpha={basemapAlpha} fieldAlpha={fieldAlpha} fieldVisible={fieldVisible}
      onEngineState={s => { if (s.basemap === 'tiles-degraded') setNotice('Tiled basemap requests failed — switched to the local NASA image. "Retry tiled imagery" restores it.'); }}/>
     <section className="viz-field-controls"><div><span className="viz-eyebrow">REAL SPATIAL DATA</span><h3>Explore a month, cell by cell.</h3><p>Dataset → spatial extent → month → load. Extents within the native cell budget load full-resolution cells; larger extents load a documented, area-weighted overview — never an inferred surface from point samples.</p></div>
      <div className="viz-field-form"><label>Spatial variable<select value={fieldVariable} onChange={e => setFieldVariable(e.target.value as 'V01' | 'V12')}><option value="V01">Air temperature / T2M</option><option value="V12">Surface sunlight / ALLSKY_SFC_SW_DWN</option></select></label>
       <label>Spatial extent<select value={extentId} onChange={e => { const preset = EXTENT_PRESETS.find(p => p.id === e.target.value); if (!preset) return; setExtentId(preset.id); if (preset.id !== 'custom') { setFieldBox(preset.box.map(String)); setFrameSignal(s => s + 1); } }}>{EXTENT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><small className="viz-muted">{EXTENT_PRESETS.find(p => p.id === extentId)?.note}</small></label>
       <button className="viz-button" onClick={() => { const a = Number(lat), b = Number(lon); if (numeric(a) && numeric(b) && lat.trim() && lon.trim() && Math.abs(a) <= 90 && Math.abs(b) <= 180) { setExtentId('custom'); setFieldBox([String(Math.max(-90, a - 5)), String(Math.min(90, a + 5)), String(Math.max(-180, b - 5)), String(Math.min(180, b + 5))]); } }}>Use box around selected location</button>
       <div className="viz-month-row"><label>Spatial month<input type="month" value={fieldMonth} onChange={e => setFieldMonth(e.target.value)}/></label><div className="viz-month-steps"><button className="viz-button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>◀</button><button className="viz-button" aria-label="Next month" onClick={() => shiftMonth(1)}>▶</button></div></div>
       {['South latitude', 'North latitude', 'West longitude', 'East longitude'].map((label, i) => <label key={label}>{label}<input type="number" step="any" value={fieldBox[i]} onChange={e => { setExtentId('custom'); setFieldBox(current => current.map((v, j) => i === j ? e.target.value : v)); }}/></label>)}
       <p className="viz-muted">{parseBox(fieldBox) ? `≈${estimateNativeCells(parseBox(fieldBox)!, fieldVariable).toLocaleString()} native cells — ${fieldRoute(parseBox(fieldBox)!, fieldVariable) === 'field' ? 'native-resolution read (≤ 4,000 cells)' : 'aggregated overview; the declared output resolution is shown with the loaded field'}.` : 'Enter an ordered extent before loading.'}</p>
       <button className="viz-button viz-primary" disabled={fieldBusy} onClick={() => void loadField()}>{fieldBusy ? 'Loading cells...' : 'Load spatial field'}</button><button className="viz-button" onClick={() => { fieldRequest.current?.abort(); setField(null); setFieldBusy(false); }}>Clear field</button>
      </div>{fieldError && <p role="alert" className="viz-error">{fieldError}</p>}
      <div className="viz-layer-controls"><span className="viz-step">LAYERS</span>
       <label className="viz-check"><input type="checkbox" checked={fieldVisible} onChange={e => setFieldVisible(e.target.checked)}/> Scientific field layer</label>
       <label>Field opacity<input aria-label="Field opacity" type="range" min={0.2} max={1} step={0.05} value={fieldAlpha} onChange={e => setFieldAlpha(Number(e.target.value))}/></label>
       <label>Basemap opacity<input aria-label="Basemap opacity" type="range" min={0.2} max={1} step={0.05} value={basemapAlpha} onChange={e => setBasemapAlpha(Number(e.target.value))}/></label>
       <button className="viz-button" onClick={() => setFrameSignal(s => s + 1)}>Frame selected extent</button>
      </div>
      {field && <div className="viz-field-source"><strong>{field.values.filter(numeric).length} of {field.values.length} {isOverview(field) ? 'output cells' : 'native cells'} contain values / {field.month} / {field.units} / {field.time_standard}</strong>{isOverview(field) && <p>Extent {field.extent.lat_min}° to {field.extent.lat_max}° N, {field.extent.lon_min}° to {field.extent.lon_max}° E — {field.resolution.output_cells.toLocaleString()} output cells at {format(field.lat_step)}° × {format(field.lon_step)}°{field.resolution.aggregation === 'none' ? ' (native source resolution)' : `, ${field.resolution.factor_lat} × ${field.resolution.factor_lon} cells combined by cos(lat)-area-weighted mean from ${format(field.resolution.source_lat_step)}° × ${format(field.resolution.source_lon_step)}°`}.</p>}<p>{field.source.title} / {field.source.version}{field.source.stale_cache ? ' / STALE CACHED SOURCE' : field.source.from_cache ? ' / Cached source' : ' / Retrieved source'}</p><p>Raw monthly model data. No slope, significance, forecast or scientific validation is implied.</p><details><summary>Spatial source and provenance</summary><a href={field.source.url} target="_blank" rel="noreferrer">NASA source store</a><p>Retrieved {field.source.retrieved_at}</p><ul>{field.source.caveats.map(c => <li key={c}>{c}</li>)}</ul><pre>{JSON.stringify(field.source.artifact_sha256, null, 2)}</pre></details></div>}
     </section>
    </>}
    {primary && primaryRows.length > 0 && <section className="viz-time-control"><button className="viz-button" onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play observations'}</button><label>Selected observation<input aria-label="Observation time" type="range" min={0} max={Math.max(0, times.length - 1)} value={primaryIndex} onChange={e => { setPlaying(false); setTimeIndex(Number(e.target.value)); }}/></label><strong>{primaryRows[primaryIndex]?.timestamp} / {format(primaryRows[primaryIndex]?.value ?? null)} {primary.preview.summary_stats.unit}</strong><button className="viz-button" onClick={() => { const month = primaryRows[primaryIndex]?.timestamp.slice(0, 7); if (month) { setFieldMonth(month); void loadField(month); } }}>Load spatial field for the selected month</button><p>Playback selects retrieved observations only. Spatial fields retain their separately labelled month and change only on an explicit load.</p></section>}
    {view === 'table' && (primary ? <section className="viz-table-card"><h3>Inspect every observation</h3><p>Values are source observations; blank values are missing or excluded by the visible QA filter.</p><div className="viz-table-scroll"><table><caption>Observation data for {primary.label}</caption><thead><tr><th>Timestamp</th><th>Source value ({primary.preview.summary_stats.unit})</th><th>Plotted value</th><th>Source QA</th></tr></thead><tbody>{primaryRows.slice(tablePage * 50, tablePage * 50 + 50).map(r => <tr key={r.timestamp}><td>{r.timestamp}</td><td>{format(r.sourceValue ?? null, 4)}</td><td>{format(r.value, 4)}</td><td>{r.qa}</td></tr>)}</tbody></table></div><div className="viz-table-pages"><button disabled={tablePage === 0} onClick={() => setTablePage(p => p - 1)}>Previous rows</button><span>Page {tablePage + 1} of {Math.max(1, Math.ceil(primaryRows.length / 50))}</span><button disabled={(tablePage + 1) * 50 >= primaryRows.length} onClick={() => setTablePage(p => p + 1)}>Next rows</button></div></section> : <Empty />)}
    {primary && <SourceDetails entry={primary}/>}
   </section>
  </div>
 </div>;
}
function Empty() { return <div className="viz-empty viz-empty-hero"><Icon name="activity" size={40}/><h3>A clearer picture starts with real data.</h3><p>Search for a dataset, confirm a location and period, then load observations. SI selections and completed Data Preview jobs can be used here directly.</p><span>No demonstration values are loaded.</span></div>; }
function SourceDetails({ entry }: {
    entry: VisualSeries;
}) { const p = entry.preview; return <details className="viz-provenance"><summary>Source, quality and interpretation</summary><dl><dt>Product / variable</dt><dd>{p.product.product_id} / {p.product.variable_id}</dd><dt>Provider</dt><dd>{p.product.source_api} / {p.product.provider_agency}</dd><dt>Time support</dt><dd>{p.extraction_config.target_frequency} / {p.extraction_config.temporal_aggregation}</dd><dt>Spatial support</dt><dd>{p.spatial_semantics_applied || 'Point sampling requested; source footprint not independently verified'}</dd><dt>Result / job</dt><dd>{p.result_id || 'No immutable result ID supplied'} / {p.job_id}</dd><dt>Retrieved</dt><dd>{p.retrieved_at}</dd><dt>Source hash</dt><dd>{p.sha256_hash || 'Not supplied by the extraction service'}</dd></dl><p>Valid source rows are shown by default. Flagged values are optional; missing and interpolated values are never substituted. Gap intervals are not connected. UTC axes position the returned period labels; the extraction contract does not always include the original source time standard. Compare temporal support before interpreting cross-provider relationships. Selected-period means and endpoint differences describe observations, not statistical significance or attribution.</p>{p.product.source_url && <a href={p.product.source_url} rel="noreferrer" target="_blank">Source documentation</a>}</details>; }
function message(error: unknown): string { return error instanceof Error ? error.message : 'The request could not be completed.'; }
async function json(url: string, init: RequestInit = {}): Promise<unknown> { const response = await fetch(url, { ...init, cache: 'no-store', signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(100000)]) : AbortSignal.timeout(100000) }); const body = await response.json().catch(() => null); if (!response.ok)
    throw new Error(typeof body?.error === 'string' ? body.error : typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status}).`); return body; }
