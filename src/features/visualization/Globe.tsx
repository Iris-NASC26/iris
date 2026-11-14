"use client";
import { useEffect, useRef, useState } from "react";
import { color, fieldScale, format, isOverview, type SpatialField } from "./model";
import { cellAt, fieldRectangle } from "./fieldRaster";
import type { ExtentBox } from "./extents";
import { BASEMAP_RESOLUTION_NOTE, type BasemapMode, type EngineState, type GlobeEngine } from "./cesium/engine";
export interface MapPoint {
    id: string;
    label: string;
    lat: number;
    lon: number;
    value: number | null;
    units: string;
    color: string;
}
interface GlobeProps {
    field: SpatialField | null;
    points: MapPoint[];
    onPick: (lat: number, lon: number) => void;
    extentBox?: ExtentBox | null;
    frameSignal?: number;
    basemapAlpha?: number;
    fieldAlpha?: number;
    fieldVisible?: boolean;
    onEngineState?: (state: EngineState) => void;
}
export function Globe({ field, points, onPick, extentBox = null, frameSignal = 0, basemapAlpha = 1, fieldAlpha = 0.93, fieldVisible = true, onEngineState }: GlobeProps) {
    const mount = useRef<HTMLDivElement>(null), engine = useRef<GlobeEngine | null>(null);
    const latest = useRef({ field, points, onPick });
    latest.current = { field, points, onPick };
    const [mode, setMode] = useState<'3d' | '2d'>('3d'), [state, setState] = useState('Loading 3D engine'), [engineState, setEngineState] = useState<EngineState | null>(null);
    const [basemap, setBasemap] = useState<BasemapMode>('tiled');
    const [readout, setReadout] = useState<{
        lat: number;
        lon: number;
        value: number | null;
    } | null>(null);
    const range = field ? fieldScale(field) : [0, 1] as [
        number,
        number
    ];
    const inspect = (lat: number, lon: number) => {
        const f = latest.current.field;
        let value: number | null = null;
        const cell = f ? cellAt(f, lat, lon) : null;
        if (cell)
            value = cell.value;
        setReadout({ lat, lon, value });
        if (f && cell)
            engine.current?.selectCell({ west: cell.lon - f.lon_step / 2, east: cell.lon + f.lon_step / 2, south: cell.lat - f.lat_step / 2, north: cell.lat + f.lat_step / 2 });
        else
            engine.current?.selectCell(null);
        latest.current.onPick(lat, lon);
    };
    const inspectRef = useRef(inspect);
    inspectRef.current = inspect;
    const onEngineStateRef = useRef(onEngineState);
    onEngineStateRef.current = onEngineState;
    const reducedMotion = useRef(false);
    useEffect(() => { reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }, []);
    useEffect(() => {
        if (mode !== '3d')
            return;
        let cancelled = false;
        let created: GlobeEngine | null = null;
        void (async () => {
            try {
                const module = await import('./cesium/engine');
                if (cancelled || !mount.current)
                    return;
                created = await module.GlobeEngine.create(mount.current, {
                    reducedMotion: reducedMotion.current,
                    onPick: (lat, lon) => inspectRef.current(lat, lon),
                    onStatus: s => {
                        setEngineState(s);
                        setBasemap(s.basemap === 'tiles-ready' || s.basemap === 'tiles-loading' ? 'tiled' : 'local');
                        onEngineStateRef.current?.(s);
                        setState('3D globe ready');
                    },
                });
                if (cancelled) { created.dispose(); return; }
                engine.current = created;
                created.setField(latest.current.field, fieldAlpha, fieldVisible);
                created.setPoints(latest.current.points);
                created.setBasemapAlpha(basemapAlpha);
                if (extentBox)
                    created.setExtentOutline(extentBox);
            }
            catch {
                if (!cancelled) {
                    setState('WebGL unavailable. Use the 2D map.');
                    setMode('2d');
                }
            }
        })();
        return () => { cancelled = true; if (created) { created.dispose(); created = null; } engine.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);
    useEffect(() => { engine.current?.setField(field, fieldAlpha, fieldVisible); }, [field, fieldAlpha, fieldVisible]);
    useEffect(() => { engine.current?.setPoints(points); }, [points]);
    useEffect(() => { engine.current?.setBasemapAlpha(basemapAlpha); }, [basemapAlpha]);
    useEffect(() => { if (extentBox) engine.current?.setExtentOutline(extentBox); }, [extentBox]);
    useEffect(() => { if (frameSignal && extentBox) engine.current?.frame(extentBox); }, [frameSignal]); // eslint-disable-line react-hooks/exhaustive-deps
    const resolution = field && isOverview(field) ? field.resolution : null;
    const basemapLabel = engineState?.basemap === 'local' || engineState?.basemap === 'tiles-degraded'
        ? 'Basemap: local NASA Blue Marble image — degraded offline mode. Decorative imagery, not measurement data.'
        : `Basemap: NASA EOSDIS GIBS WMTS / Blue Marble Shaded Relief & Bathymetry (MODIS). ${BASEMAP_RESOLUTION_NOTE} Decorative imagery, not measurement data.`;
    return <div className="viz-globe">
  <div className="viz-globe-toolbar"><div className="viz-segment" role="group" aria-label="Map projection">
   <button aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>3D globe</button><button aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>2D map</button>
  </div><span className="viz-muted">{state}{engineState && engineState.tileFailures > 0 ? ` — ${engineState.tileFailures} tile request${engineState.tileFailures === 1 ? '' : 's'} failed${engineState.lastTileError ? ` (${engineState.lastTileError.slice(0, 120)})` : ''}` : ''}</span>
   {engineState && <button className="viz-basemap-toggle" onClick={() => { const next = basemap === 'tiled' ? 'local' : 'tiled'; setBasemap(next); engine.current?.setBasemap(next, false); }}>{basemap === 'tiled' ? 'Use local image' : 'Retry tiled imagery'}</button>}
  </div>
  <div className="viz-earth-stage">
   {mode === '3d' ? <div className="viz-three-mount" ref={mount}/> :
            <svg className="viz-flat-map" viewBox="0 0 1000 500" role="img" aria-label="Equirectangular world map with retrieved data only" onClick={event => { const r = event.currentTarget.getBoundingClientRect(); inspectRef.current(90 - (event.clientY - r.top) / r.height * 180, (event.clientX - r.left) / r.width * 360 - 180); }}>
     <image href="/visualization/basemap-2048x1024.jpg" width="1000" height="500"/>
     {field?.values.map((value, i) => value === null ? null : <rect key={i} x={(field.cell_lons[i % field.cell_lons.length] - field.lon_step / 2 + 180) / 360 * 1000} y={(90 - field.cell_lats[Math.floor(i / field.cell_lons.length)] - field.lat_step / 2) / 180 * 500} width={field.lon_step / 360 * 1000} height={field.lat_step / 180 * 500} fill={color(value, range)}><title>{`${field.month}: ${value} ${field.units}`}</title></rect>)}
     {points.map(point => <circle key={point.id} cx={(point.lon + 180) / 360 * 1000} cy={(90 - point.lat) / 180 * 500} r="4" fill={point.color}><title>{point.label}</title></circle>)}
    </svg>}
   <div className="viz-earth-overlay"><span>EARTH OBSERVATION</span><strong>{field ? `${field.field} / ${field.month}` : 'Your data, in place.'}</strong><p>{field ? (resolution && resolution.aggregation !== 'none' ? `Overview cells: ${resolution.factor_lat}×${resolution.factor_lon} native cells aggregated (area-weighted mean).` : 'Native grid cells. No spatial smoothing.') : 'Select a dataset and location, or load a real spatial field.'}</p></div>
   <p className="viz-basemap-credit">{basemapLabel}</p>
  </div>
  {mode === '3d' && <div className="viz-camera-controls" role="group" aria-label="Keyboard camera controls">
   {[['west', 'Rotate west'], ['east', 'Rotate east'], ['north', 'Tilt north'], ['south', 'Tilt south'], ['in', 'Zoom in'], ['out', 'Zoom out'], ['reset', 'Reset globe']].map(([action, label]) => <button key={action} onClick={() => engine.current?.nudge(action)}>{label}</button>)}
   {extentBox && <button onClick={() => engine.current?.frame(extentBox)}>Frame selected extent</button>}
   {points[0] && <button onClick={() => engine.current?.focus(points[0].lat, points[0].lon)}>Focus on selected data</button>}
   {field && <button onClick={() => engine.current?.frame([fieldRectangle(field).south, fieldRectangle(field).north, fieldRectangle(field).west, fieldRectangle(field).east])}>Focus on spatial field</button>}
  </div>}
  {field && <div className="viz-field-legend"><span>{format(range[0])}</span><i style={{ background: 'linear-gradient(90deg,#26407f,#1b978b,#f6df76)' }}/><span>{format(range[1])} {field.units}</span><small>Raw value / {field.time_standard}. Missing cells are transparent. Fixed physical scale for temporal comparison.{resolution && resolution.aggregation !== 'none' ? ` Displayed at ${format(field.lat_step)}° × ${format(field.lon_step)}° — coarser than the ${format(resolution.source_lat_step)}° × ${format(resolution.source_lon_step)}° source.` : ` Native ${format(field.lat_step)}° × ${format(field.lon_step)}° cells.`}</small></div>}
  {readout && <p className="viz-readout" role="status">Picked {readout.lat.toFixed(3)}, {readout.lon.toFixed(3)}{field ? ` / ${readout.value === null ? 'No value in the loaded field' : `${format(readout.value)} ${field.units}`} / ${field.month}` : ''}. Coordinates copied to selection; load data explicitly.</p>}
  {points.length > 0 && <ul className="viz-map-values" aria-label="Mapped observations">{points.map(point => <li key={point.id}><i style={{ background: point.color }}/><span>{point.label}</span><strong>{typeof point.value === 'number' ? `${format(point.value)} ${point.units}` : 'No observation at this time'}</strong></li>)}</ul>}
 </div>;
}
