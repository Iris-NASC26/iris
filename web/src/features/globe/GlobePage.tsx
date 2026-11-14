'use client';

/** Living Globe renderer spike (U03). Shows a GIBS basemap and, on request, a test-only synthetic
 * grid to prove the engine. No scientific layer, trend or observation is loaded here.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { usePreferences } from '../../state/preferences';
import { CELL_COUNT } from './renderer/grid';
import { createSyntheticField, syntheticColor, SYNTHETIC_LABEL } from './renderer/syntheticField';
import type { BasemapState, GlobeScene, Nudge, PickedCell, RenderStats, SpinResult } from './renderer/GlobeScene';

const BENCHMARK_SECONDS = 10;
const fieldColors = { values: null as Float32Array | null };

type Status = 'loading' | 'ready' | 'unsupported' | 'error';

export function GlobePage() {
  const { reducedMotion } = usePreferences();
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<GlobeScene | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [basemap, setBasemap] = useState<BasemapState | 'pending'>('pending');
  const [showCells, setShowCells] = useState(false);
  const [rotate, setRotate] = useState(false);
  const [picked, setPicked] = useState<PickedCell | null>(null);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [benchmark, setBenchmark] = useState<SpinResult | 'running' | null>(null);

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
      } catch { setStatus('error'); }
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    fieldColors.values ??= createSyntheticField();
    scene.current?.setCells(showCells ? fieldColors.values : null, syntheticColor);
  }, [showCells, status]);
  useEffect(() => { scene.current?.setAutoRotate(rotate && !reducedMotion); }, [rotate, reducedMotion, status]);
  useEffect(() => {
    if (status !== 'ready') return;
    const timer = window.setInterval(() => setStats(scene.current?.stats() ?? null), 500);
    return () => window.clearInterval(timer);
  }, [status]);

  async function runBenchmark() {
    if (!scene.current || benchmark === 'running') return;
    setShowCells(true); setBenchmark('running');
    await new Promise(resolve => setTimeout(resolve, 300));
    setBenchmark(await scene.current.spinBenchmark(BENCHMARK_SECONDS));
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
        <p className="globe-readout">{picked ? (picked.index === null ? 'No cell' : `Cell ${picked.index} · ${picked.lat.toFixed(2)}°, ${picked.lon.toFixed(2)}°`) : 'Click the globe to map a point to its 1° grid cell. No value is shown because no layer is loaded.'}</p>
      </aside>
    </div>
  </section>;
}
