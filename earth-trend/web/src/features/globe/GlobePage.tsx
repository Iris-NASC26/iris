'use client';

/** Living Globe renderer (U03) plus raw monthly NASA POWER fields. The field is unanalysed
 * native-cell data painted on an absolute scale — never a trend, significance or relief layer.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { usePreferences } from '../../state/preferences';
import { fetchField, FieldError } from '../../data/field';
import type { FieldResult } from '../../contracts/generated';
import { CELL_COUNT } from './renderer/grid';
import { createSyntheticField, syntheticColor, SYNTHETIC_LABEL } from './renderer/syntheticField';
import { createFieldLayer, type FieldLayer } from './renderer/fieldLayer';
import { fieldColor, fieldRamp } from './renderer/fieldColors';
import type { BasemapState, GlobeScene, Nudge, PickedCell, RenderStats, SpinResult } from './renderer/GlobeScene';

const BENCHMARK_SECONDS = 10;
const fieldColors = { values: null as Float32Array | null };

type Status = 'loading' | 'ready' | 'unsupported' | 'error';

const FIELD_VARIABLES = [
  { id: 'V01', label: 'V01 · Air temperature (°C)' },
  { id: 'V12', label: 'V12 · Surface sunlight (W/m²)' },
] as const;

const REGION_PRESETS = [
  { id: 'srilanka', label: 'Sri Lanka & South India', box: { latMin: 4, latMax: 16, lonMin: 76, lonMax: 86 } },
  { id: 'amazon', label: 'Central Amazon', box: { latMin: -8, latMax: 2, lonMin: -68, lonMax: -56 } },
  { id: 'sahara', label: 'Sahara', box: { latMin: 18, latMax: 28, lonMin: -10, lonMax: 25 } },
  { id: 'europe', label: 'Western Europe', box: { latMin: 44, latMax: 56, lonMin: -5, lonMax: 15 } },
] as const;

interface FieldState { result: FieldResult; layer: FieldLayer }

export function GlobePage() {
  const { reducedMotion } = usePreferences();
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<GlobeScene | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [generation, setGeneration] = useState(0);
  const [basemap, setBasemap] = useState<BasemapState | 'pending'>('pending');
  const [showCells, setShowCells] = useState(false);
  const [rotate, setRotate] = useState(false);
  const [picked, setPicked] = useState<PickedCell | null>(null);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [benchmark, setBenchmark] = useState<SpinResult | 'running' | null>(null);
  const [fieldVariable, setFieldVariable] = useState<string>('V01');
  const [fieldMonth, setFieldMonth] = useState('2024-01');
  const [box, setBox] = useState<{ latMin: number; latMax: number; lonMin: number; lonMax: number }>(REGION_PRESETS[0].box);
  const [field, setField] = useState<FieldState | null>(null);
  const [fieldStatus, setFieldStatus] = useState<'idle' | 'loading' | { error: string }>({ error: '' });
  const fieldAbort = useRef<AbortController | null>(null);
  const fieldLayer = useRef<FieldLayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    const element = container.current;
    if (!element) return;
    void import('./renderer/GlobeScene').then(({ createGlobeScene, webglAvailable }) => {
      if (cancelled) return;
      if (!webglAvailable()) return setStatus('unsupported');
      try {
        scene.current = createGlobeScene(element, setPicked, setBasemap);
        setStatus('ready');
        setGeneration(value => value + 1);
      } catch { setStatus('error'); }
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    applyCells(showCells);
  }, [showCells, status, generation]);
  useEffect(() => { scene.current?.setAutoRotate(rotate && !reducedMotion); }, [rotate, reducedMotion, status, generation]);
  useEffect(() => {
    if (status !== 'ready') return;
    const timer = window.setInterval(() => setStats(scene.current?.stats() ?? null), 500);
    return () => window.clearInterval(timer);
  }, [status]);

  function applyCells(on: boolean) {
    fieldColors.values ??= createSyntheticField();
    scene.current?.setCells(on ? fieldColors.values : null, syntheticColor);
  }

  async function runBenchmark() {
    if (!scene.current || benchmark === 'running') return;
    setShowCells(true); applyCells(true); setBenchmark('running');
    await new Promise(resolve => setTimeout(resolve, 300));
    setBenchmark(await scene.current.spinBenchmark(BENCHMARK_SECONDS));
  }

  useEffect(() => () => { fieldAbort.current?.abort(); fieldLayer.current?.dispose(); }, []);

  async function loadField() {
    if (!scene.current || fieldStatus === 'loading') return;
    fieldAbort.current?.abort();
    const controller = new AbortController();
    fieldAbort.current = controller;
    setFieldStatus('loading');
    try {
      const result = await fetchField(fieldVariable, { month: fieldMonth, ...box }, controller.signal);
      const layer = createFieldLayer(
        { lats: result.cell_lats, lons: result.cell_lons, latStep: result.box.cell_lat_step, lonStep: result.box.cell_lon_step, values: result.values },
        fieldColor(fieldVariable),
      );
      fieldLayer.current?.dispose();
      fieldLayer.current = layer;
      scene.current.setField(layer);
      setField({ result, layer });
      setFieldStatus('idle');
    } catch (error) {
      if (controller.signal.aborted) return;
      setFieldStatus({ error: error instanceof FieldError ? error.message : 'The field could not be loaded.' });
    }
  }

  function clearField() {
    fieldAbort.current?.abort();
    fieldLayer.current = null;
    scene.current?.setField(null);
    setField(null);
    setFieldStatus('idle');
  }

  function pickedFieldValue(): string | null {
    if (!field || !picked || picked.index === null) return null;
    const { result } = field;
    const latIndex = result.cell_lats.reduce((best, v, i) => Math.abs(v - picked.lat) < Math.abs(result.cell_lats[best] - picked.lat) ? i : best, 0);
    const lonIndex = result.cell_lons.reduce((best, v, i) => Math.abs(v - picked.lon) < Math.abs(result.cell_lons[best] - picked.lon) ? i : best, 0);
    const value = result.values[latIndex * result.cell_lons.length + lonIndex];
    return value === null ? 'missing' : `${value} ${result.source.units}`;
  }
  const nudges: [Nudge, string][] = [['left', 'Rotate west'], ['right', 'Rotate east'], ['up', 'Tilt north'], ['down', 'Tilt south'], ['in', 'Zoom in'], ['out', 'Zoom out']];

  return <section className="globe-page" aria-label="Living Globe">
    <div className="page-heading"><p className="eyebrow">LIVING GLOBE · RENDERER CHECK</p><h1>Living Globe</h1>
      <p>The interactive globe engine and NASA basemap are ready. No scientific layer is loaded: trends, significance and relief wait for validated global layers.</p></div>
    <div className="globe-layout">
      <div className="globe-stage">
        <div className="globe-canvas" ref={container} role="img" aria-label="Interactive 3D globe with a NASA GIBS satellite image basemap. No scientific data layer is loaded." />
        {status === 'loading' && <p className="globe-overlay" aria-live="polite">Starting the globe…</p>}
        {(status === 'unsupported' || status === 'error') && <div className="globe-overlay globe-fallback" role="alert"><Icon name="alert" size={22} />
          <strong>{status === 'unsupported' ? 'WebGL 2 is not available in this browser.' : 'The globe could not start.'}</strong>
          <span>The workspace still works. An accessible 2D grid view with numeric region controls will replace this panel in a later task.</span></div>}
        {showCells && <p className="globe-banner" role="note">{SYNTHETIC_LABEL}</p>}
        {basemap === 'failed' && <p className="globe-notice" role="alert">The NASA basemap image could not be loaded, so a plain sphere is shown. If the development server was started before <code>web/public</code> existed, restart it.</p>}
        <p className="globe-attribution">{basemap === 'failed' ? 'Basemap image unavailable.' : 'Basemap: NASA EOSDIS Global Imagery Browse Services (GIBS), Blue Marble Shaded Relief & Bathymetry. Decorative; no measurement is derived from it.'}</p>
      </div>
      <aside className="globe-panel" aria-label="Globe controls">
        <h2>View</h2>
        <div className="globe-buttons">
          <button className="secondary-button" type="button" disabled={status !== 'ready'} onClick={() => scene.current?.reset()}>Reset view</button>
          <label className="motion-control"><input type="checkbox" checked={rotate && !reducedMotion} disabled={status !== 'ready' || reducedMotion} onChange={event => setRotate(event.target.checked)} />Auto-rotate{reducedMotion ? ' (off: reduced motion)' : ''}</label>
        </div>
        <div className="globe-nudges" role="group" aria-label="Keyboard camera controls">{nudges.map(([direction, label]) =>
          <button className="secondary-button" type="button" key={direction} disabled={status !== 'ready'} onClick={() => scene.current?.nudge(direction)}>{label}</button>)}</div>
        <h2>Real NASA POWER field</h2>
        <p className="small-label">Raw monthly native-cell values on an absolute colour scale. Not a trend, significance or validated layer.</p>
        <label className="field-control">Variable
          <select value={fieldVariable} onChange={event => setFieldVariable(event.target.value)} disabled={fieldStatus === 'loading'}>
            {FIELD_VARIABLES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select></label>
        <label className="field-control">Month
          <input type="month" value={fieldMonth} onChange={event => setFieldMonth(event.target.value)} disabled={fieldStatus === 'loading'} /></label>
        <label className="field-control">Region
          <select defaultValue="srilanka" disabled={fieldStatus === 'loading'}
            onChange={event => { const preset = REGION_PRESETS.find(p => p.id === event.target.value); if (preset) setBox(preset.box); }}>
            {REGION_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select></label>
        <div className="field-box-inputs" role="group" aria-label="Custom region box">
          {(['latMin', 'latMax', 'lonMin', 'lonMax'] as const).map(key =>
            <label className="field-control" key={key}>{key.replace('Min', ' min').replace('Max', ' max')}
              <input type="number" step="0.5" value={box[key]} disabled={fieldStatus === 'loading'}
                onChange={event => setBox(current => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}
        </div>
        <div className="globe-buttons">
          <button className="primary-button" type="button" disabled={status !== 'ready' || fieldStatus === 'loading'} onClick={() => void loadField()}>
            {fieldStatus === 'loading' ? 'Loading field…' : 'Load field'}</button>
          {field && <button className="secondary-button" type="button" onClick={clearField}>Clear field</button>}
        </div>
        <div className="globe-readout" aria-live="polite" aria-label="Field status">
          {fieldStatus === 'loading' ? <p>Fetching raw cells from NASA POWER…</p>
            : typeof fieldStatus === 'object' && fieldStatus.error ? <p role="alert">{fieldStatus.error}</p>
            : field ? <p><strong>{field.result.variable_id} {field.result.month}</strong> · {field.layer.finiteCount.toLocaleString('en-US')} of {field.layer.cellCount.toLocaleString('en-US')} cells have values
              {field.layer.finiteCount < field.layer.cellCount ? ' (empty cells are missing, not zero)' : ''}.<br />
              {fieldRamp(field.result.variable_id)?.label(field.result.source.units)}<br />
              Source: {field.result.source.store_title} {field.result.source.store_version}{field.result.source.served_from_cache ? ' (served from local cache)' : ''}. {field.result.source.caveats[0]}</p>
            : <p>No field loaded.</p>}
        </div>
        <h2>Renderer test</h2>
        <label className="motion-control"><input type="checkbox" checked={showCells} disabled={status !== 'ready'} onChange={event => setShowCells(event.target.checked)} />Show {CELL_COUNT.toLocaleString('en-US')} test-only cells</label>
        <p className="small-label">Abstract synthetic pattern. It is not an Earth variable and never leaves this page.</p>
        <button className="primary-button" type="button" disabled={status !== 'ready' || benchmark === 'running'} onClick={() => void runBenchmark()}>
          {benchmark === 'running' ? `Spinning for ${BENCHMARK_SECONDS} s…` : `Run ${BENCHMARK_SECONDS}-second spin benchmark`}</button>
        <div className="globe-readout" aria-live="polite" aria-label="Benchmark result">
          {benchmark && benchmark !== 'running' ? <p><strong>Median {benchmark.medianFps.toFixed(1)} fps</strong> (slowest {benchmark.minFps.toFixed(1)}) over {benchmark.frames} frames · {benchmark.canvas} @ {benchmark.pixelRatio}× · {benchmark.renderer}.{benchmark.gpu ? ` Last frame: ${benchmark.gpu.drawCalls} draw calls, ${benchmark.gpu.triangles.toLocaleString('en-US')} triangles, ${benchmark.gpu.textures} textures.` : ''} Target ≥ 30 fps on the reference laptop; this reading applies only to this device.</p>
            : <p>No benchmark run yet.</p>}
        </div>
        <p className="small-label" aria-label="GPU objects">{stats ? `GPU objects: ${stats.geometries} geometries, ${stats.textures} textures · ${stats.drawCalls} draw calls · ${stats.triangles.toLocaleString('en-US')} triangles` : 'GPU objects: starting'}</p>
        <h2>Picked cell</h2>
        <p className="globe-readout">{picked ? (picked.index === null ? 'No cell' : `Cell ${picked.index} · ${picked.lat.toFixed(2)}°, ${picked.lon.toFixed(2)}°${pickedFieldValue() ? ` · field value ${pickedFieldValue()}` : ''}`) : 'Click the globe to map a point to its 1° grid cell. No value is shown because no layer is loaded.'}</p>
      </aside>
    </div>
  </section>;
}
