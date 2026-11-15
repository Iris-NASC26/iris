"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { Icon } from "@/components/ui/Icon";
import { REGION_PRESETS, type DataProduct, type DiscoveryResponse, type ExtractionRequest, type PreviewResponse } from "@/lib/dataRetrievalEngine";
import { useVisualizations } from "./store";
import { coordinates, csvCell, format, MAX_SERIES, numeric, parseField, parseOverview, parsePreview, rows, summary, type SpatialField } from "./model";
import { EXTENT_PRESETS, fieldRoute, parseBox, type ExtentBox } from "./extents";
import { DEFAULT_ORDER, type LayerId } from "./layers";
import { DEFAULT_STYLE, type FieldStyle } from "./styles";
import dynamic from "next/dynamic";
import { sourceKey } from './adapters/analysisBinding';
import { StudioDisplayProvider, useDisplay } from './studio/display';
import { StudioContext, type MapState, type StudioSelection, type StudioState } from "./studio/state";
import { StudioShell } from "./studio/StudioShell";
import type { CellInspection, MapPoint } from "./Globe";
import './visualization.css';
import { spatialVariable, type SpatialVariableId } from "./spatialVariables";
const MapWorkspace = dynamic(() => import('./MapWorkspace').then(module => module.MapWorkspace), { ssr: false });
export function VisualizationWorkspace({ initialView = 'charts' }: {
    initialView?: 'charts' | 'globe';
}) {
    return <StudioDisplayProvider><VisualizationWorkspaceContent initialView={initialView}/></StudioDisplayProvider>;
}
function VisualizationWorkspaceContent({ initialView }: { initialView: 'charts' | 'globe' }) {
    const { display } = useDisplay();
    const dashboard = useDashboard(), store = useVisualizations(), params = useSearchParams(), router = useRouter();
    const [prompt, setPrompt] = useState(''), [catalog, setCatalog] = useState<DataProduct[]>([]), [selected, setSelected] = useState<string[] | null>(null);
    const [searching, setSearching] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [place, setPlace] = useState(dashboard.extractionConfig.region_name), [lat, setLat] = useState(String(dashboard.extractionConfig.point_lat ?? 6.9355)), [lon, setLon] = useState(String(dashboard.extractionConfig.point_lon ?? 79.8487));
    const [start, setStart] = useState(dashboard.extractionConfig.start_date), [end, setEnd] = useState(dashboard.extractionConfig.end_date), [frequency, setFrequency] = useState('Monthly');
    const [primaryId, setPrimaryId] = useState(''), [hidden, setHidden] = useState<string[]>([]), [filterStart, setFilterStart] = useState(''), [filterEnd, setFilterEnd] = useState('');
    const [includeFlagged, setIncludeFlagged] = useState(false), [normalized, setNormalized] = useState(false), [timeIndex, setTimeIndex] = useState(0), [playing, setPlaying] = useState(false);
    const [selection, setSelection] = useState<StudioSelection | null>(null);
    const [fieldVariable, setFieldVariable] = useState<SpatialVariableId>('V01'), [fieldMonth, setFieldMonth] = useState('2024-01'), [fieldBox, setFieldBox] = useState(['4', '16', '76', '86']);
    const [field, setField] = useState<SpatialField | null>(null), [fieldBusy, setFieldBusy] = useState(false), [fieldError, setFieldError] = useState('');
    const [extentId, setExtentId] = useState('custom'), [basemapAlpha, setBasemapAlpha] = useState(1), [fieldAlpha, setFieldAlpha] = useState(0.93), [frameSignal, setFrameSignal] = useState(0);
    const [engineBasemap, setEngineBasemap] = useState('tiles-ready');
    const [fieldStyle, setFieldStyle] = useState<FieldStyle>(DEFAULT_STYLE), [customRange, setCustomRange] = useState<[string, string]>(['', '']);
    const [layerVisible, setLayerVisible] = useState<Record<LayerId, boolean>>({ field: true, points: true, extent: true, basemap: true }), [layerOrder, setLayerOrder] = useState<LayerId[]>(DEFAULT_ORDER);
    const [inspection, setInspection] = useState<CellInspection | null>(null);
    const [drawMode, setDrawMode] = useState(false), [cellClearSignal, setCellClearSignal] = useState(0), [applied, setApplied] = useState<{ variable: string; month: string; box: ExtentBox } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    // Whether this session has a loaded field — survives the transient null
    // while a reload is in flight, so playback/steppers keep driving requests.
    const spatialSession = useRef(false);
    const [spatialPlaying, setSpatialPlaying] = useState(false), [syncLinked, setSyncLinked] = useState(false);
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
    const selectedTimestamp = primaryRows[primaryIndex]?.timestamp;
    const inputKey = sourceKey(primary?.preview);
    const binding = store.analyses[inputKey] ?? null;
    const analysis: StudioState['analysis'] = { inputKey, binding, status: binding ? 'complete' : 'empty', error: '' };
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
    useEffect(() => {
        // One-shot prefill from landing-page study spots or shared links.
        // Fills the form only — retrieval still requires the explicit load.
        const presetLat = params.get('lat'), presetLon = params.get('lon'), presetPlace = params.get('place');
        const a = Number(presetLat), b = Number(presetLon);
        if (presetLat !== null && presetLon !== null && numeric(a) && numeric(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) {
            setLat(presetLat);
            setLon(presetLon);
            setPlace(presetPlace?.trim() || `Study location ${a.toFixed(2)}, ${b.toFixed(2)}`);
            setNotice('Study location prefilled. Review coordinates, then load observations explicitly.');
        } else if (presetPlace?.trim())
            setPlace(presetPlace.trim());
        if (params.get('view') === 'globe' && initialView !== 'globe')
            router.replace(`/workspace/globe?${params.toString()}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { setTimeIndex(0); setPlaying(false); setSelection(null); }, [primary?.id, filterStart, filterEnd, includeFlagged]);
    useEffect(() => { if (!playing || times.length < 2)
        return; const id = window.setInterval(() => setTimeIndex(i => (i + 1) % times.length), 650); return () => clearInterval(id); }, [playing, times.length]);
    useEffect(() => {
        if (playing && primary && selectedTime !== undefined && selectedTimestamp) {
            setSelection({ seriesId: primary.id, time: selectedTime, timestamp: selectedTimestamp });
        }
    }, [playing, primary?.id, selectedTime, selectedTimestamp]);
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
        setApplied(null);
        setInspection(null);
        setSpatialPlaying(false);
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
            setError('Select a dataset from discovery or Iris Intelligence first.');
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
        if (spatialSession.current)
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
                spatialSession.current = true;
                setField(result);
                setApplied({ variable: fieldVariable, month, box });
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
    // Spatial playback steps the loaded field month by month; each step is a
    // real request (stale responses are discarded), not a recycled frame.
    useEffect(() => {
        if (!spatialPlaying)
            return;
        const id = window.setInterval(() => shiftMonth(1), 900);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spatialPlaying, fieldMonth]);
    useEffect(() => { if (fieldError) setSpatialPlaying(false); }, [fieldError]);
    // Optional linkage: the selected observation month drives the spatial
    // field (debounced) — off by default so map and chart stay predictable.
    useEffect(() => {
        if (!syncLinked || !field || !primary || !spatialSession.current)
            return;
        const month = primaryRows[primaryIndex]?.timestamp.slice(0, 7);
        if (!month || month === field.month)
            return;
        const id = window.setTimeout(() => { setFieldMonth(month); void loadField(month); }, 450);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncLinked, primaryIndex, field?.month]);
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
        return; dashboard.setExtractedPreview(primary.preview); dashboard.setAutoRunCase(false); router.push(`/workspace/data-analysis?jobId=${encodeURIComponent(primary.preview.job_id)}`); }
    const pick = (latitude: number, longitude: number) => { setLat(latitude.toFixed(4)); setLon(longitude.toFixed(4)); setPlace(`Picked location ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`); };
    const map: MapState = {
        field, applied, busy: fieldBusy, error: fieldError,
        variable: fieldVariable, setVariable: variable => {
            setFieldVariable(variable);
            setFieldStyle({ ...DEFAULT_STYLE, rampId: spatialVariable(variable).ramp });
            setCustomRange(['', '']);
            setSpatialPlaying(false);
            setSyncLinked(false);
            spatialSession.current = false;
        },
        month: fieldMonth, setMonth: setFieldMonth,
        box: fieldBox, setBox: setFieldBox,
        extentId, setExtentId,
        load: m => void loadField(m), clear: () => { fieldRequest.current?.abort(); spatialSession.current = false; setField(null); setApplied(null); setFieldBusy(false); setSpatialPlaying(false); setSyncLinked(false); },
        shiftMonth,
        playing: spatialPlaying, setPlaying: setSpatialPlaying,
        syncLinked, setSyncLinked,
        style: fieldStyle, setStyle: setFieldStyle,
        customRange, setCustomRange,
        basemapAlpha, setBasemapAlpha,
        fieldAlpha, setFieldAlpha,
        layerVisible, setLayerVisible,
        layerOrder, setLayerOrder,
        inspection, setInspection,
        cellClearSignal, clearCell: () => setCellClearSignal(s => s + 1),
        drawMode, setDrawMode,
        frameSignal, frame: () => setFrameSignal(s => s + 1),
        engineBasemap, setEngineBasemap,
        points, onPick: pick,
        onDrawBox: box => { setExtentId('custom'); setFieldBox(box.map(v => String(v))); setDrawMode(false); },
        onEngineNotice: msg => setNotice(msg),
        requestExtentAround: () => { const a = Number(lat), b = Number(lon); if (numeric(a) && numeric(b) && lat.trim() && lon.trim() && Math.abs(a) <= 90 && Math.abs(b) <= 180) { setExtentId('custom'); setFieldBox([String(Math.max(-90, a - 5)), String(Math.min(90, a + 5)), String(Math.max(-180, b - 5)), String(Math.min(180, b + 5))]); } },
    };
    const studio: StudioState = {
        series: store.series, entries, primary, primaryRows, data, times, loading,
        hidden, toggleHidden: (id, show) => setHidden(c => show ? c.filter(x => x !== id) : [...c, id]),
        removeSeries: store.remove,
        primaryId: primary?.id ?? '', setPrimaryId,
        filterStart, setFilterStart, filterEnd, setFilterEnd,
        includeFlagged, setIncludeFlagged,
        normalized, setNormalized,
        selection, select: setSelection,
        timeIndex, setTimeIndex,
        playing, setPlaying,
        analysis, exportData, openAnalysis: analyze,
    };
    const controls = <aside className="viz-controls" aria-label="Visualization controls">
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
     <p className="viz-note">Time-series retrieval samples a point. A region name does not make it a regional average. Review the coordinates before loading.</p>
    </section>
    <section className="viz-control-section"><span className="viz-step">03 / SET THE PERIOD</span>
     <div className="viz-two-cols"><label>Observation start<input type="date" value={start} onChange={e => setStart(e.target.value)}/></label><label>Observation end<input type="date" value={end} onChange={e => setEnd(e.target.value)}/></label></div>
     <label>Observation cadence<select value={frequency} onChange={e => setFrequency(e.target.value)}>{['Daily', '8-Day', '16-Day', 'Monthly', 'Seasonal', 'Yearly'].map(f => <option key={f} disabled={chosen.some(p => !p.supported_frequencies.includes(f))}>{f}</option>)}</select></label>
     <p className="viz-muted">Temporal reduction: mean of source observations. Provider restrictions still apply.</p>
     <button className="viz-button viz-primary" onClick={() => void load()} disabled={loading || !chosen.length || store.series.length >= MAX_SERIES}>{loading ? 'Loading observations...' : 'Load selected datasets'}<Icon name="arrow" size={16}/></button>
     {loading && <button className="viz-button" onClick={() => { request.current?.abort(); setLoading(false); setNotice('Request cancelled. Existing data retained.'); }}>Cancel load</button>}
    </section>
    {store.series.length > 0 && <section className="viz-control-section"><span className="viz-step">LOADED SERIES / {store.series.length} OF {MAX_SERIES}</span><div className="viz-loaded-list">{store.series.map(s => <article key={s.id}><label><input type="checkbox" checked={!hidden.includes(s.id)} onChange={e => setHidden(current => e.target.checked ? current.filter(id => id !== s.id) : [...current, s.id])}/><i style={{ background: s.color }}/><span>{s.label}</span></label><button aria-label={`Remove ${s.label}`} onClick={() => store.remove(s.id)}>Remove</button></article>)}</div></section>}
   </aside>;
    const timeStrip = primary && primaryRows.length > 0 && <section className="viz-time-control"><button className="viz-button" onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play observations'}</button><label>Selected observation<input aria-label="Observation time" type="range" min={0} max={Math.max(0, times.length - 1)} value={primaryIndex} onChange={e => { setPlaying(false); setTimeIndex(Number(e.target.value)); const r = primaryRows[Number(e.target.value)]; if (r) setSelection({ seriesId: primary.id, time: r.time, timestamp: r.timestamp }); }}/></label><strong>{primaryRows[primaryIndex]?.timestamp} / {format(primaryRows[primaryIndex]?.value ?? null)} {primary.preview.summary_stats.unit}</strong><p>Step through retrieved timestamps and highlight the same observation across views.</p></section>;
    if (initialView === 'globe')
        return <div className="viz-workbench dashboard-page-inner">
  <header className="viz-heading"><div><span className="viz-eyebrow">LIVING GLOBE / NASA SPATIAL LAYERS</span><h2>Make the change visible.</h2><p>Choose a spatial variable, region and month to paint real NASA grid values across the globe.</p></div><Link className="viz-button" href="/workspace/visualize"><Icon name="activity" size={16}/> Open visualization studio</Link></header>
  <div className="viz-layout viz-spatial-layout">
   <section className="viz-results" aria-label="Visualization results" aria-busy={fieldBusy}>
    {notice && <p className="viz-notice" role="status">{notice}</p>}
    <MapWorkspace map={{ ...map, points: [] }} spatialOnly onInspectTimeSeries={() => router.push(`/workspace/visualize?${new URLSearchParams({ lat, lon, place })}`)}/>
   </section>
  </div>
 </div>;
    return <StudioContext.Provider value={studio}><div className="viz-workbench viz-immersive dashboard-page-inner" data-environment={display.dark ? 'dark' : 'light'}>
  <header className="viz-heading"><div><span className="viz-eyebrow">IRIS / EARTH SYSTEM OBSERVATORY</span><h2>Make the change visible.</h2><p>Explore the shape of the record. Follow the evidence behind the trend.</p></div><Link className="viz-button" href="/workspace/intelligence"><Icon name="sparkles" size={16}/> Open SI discovery</Link></header>
  {primary && <section className="viz-context-strip" aria-label="Selected record"><div><span>WHAT</span><strong>{primary.preview.product.variable_name}</strong><small>{primary.preview.summary_stats.unit} · {primary.preview.product.source_api}</small></div><div><span>WHERE</span><strong>{primary.preview.extraction_config.region_name}</strong><small>{primary.preview.spatial_semantics_applied || 'Point sample; not a regional mean'}</small></div><div><span>WHEN</span><strong>{primary.preview.extraction_config.start_date} → {primary.preview.extraction_config.end_date}</strong><small>{primary.preview.extraction_config.target_frequency} · {stats.count} visible usable observations</small></div><div><span>ANALYSIS</span><strong>{binding ? 'Matching result attached' : 'Not yet attached'}</strong><small>{binding ? `${binding.result.start_year}–${binding.result.end_year} · display filters do not retest` : 'Complete selected methods on Data Analysis'}</small></div></section>}
  <div className="viz-layout" data-studio data-drawer={drawerOpen || undefined}>
   {drawerOpen && controls}
   <section className="viz-results" aria-label="Visualization studio" aria-busy={loading}>
    {error && <div className="viz-error" role="alert"><strong>Could not complete this request</strong><p>{error}</p></div>}{notice && <p className="viz-notice" role="status">{notice}</p>}
    <StudioShell>
      <button className="viz-button" aria-pressed={drawerOpen} onClick={() => setDrawerOpen(o => !o)}>{drawerOpen ? 'Hide data controls' : 'Data controls'}</button>
      {primary && <button className="viz-button" onClick={() => exportData('csv')}>Export CSV</button>}
      {primary && <button className="viz-button" onClick={() => exportData('json')}>Export JSON</button>}
    </StudioShell>
    {timeStrip}
   </section>
  </div>
 </div></StudioContext.Provider>;
}
function message(error: unknown): string { return error instanceof Error ? error.message : 'The request could not be completed.'; }
async function json(url: string, init: RequestInit = {}): Promise<unknown> { const response = await fetch(url, { ...init, cache: 'no-store', signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(100000)]) : AbortSignal.timeout(100000) }); const body = await response.json().catch(() => null); if (!response.ok)
    throw new Error(typeof body?.error === 'string' ? body.error : typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status}).`); return body; }
