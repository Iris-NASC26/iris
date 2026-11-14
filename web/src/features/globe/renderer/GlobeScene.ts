/** Reusable globe.gl/Three.js scene lifecycle (U03). No React, data fetching or scientific state.
 * The caller owns the container; `dispose()` releases every GPU object created here.
 */
import Globe from 'globe.gl';
import * as THREE from 'three';
import { createCellLayer, type CellLayer, type Rgba } from './cellLayer';
import { cellIndexFromLatLon } from './grid';

export const BASEMAP_URL = '/globe/basemap-2048x1024.jpg';
const DEFAULT_VIEW = { lat: 15, lng: 10, altitude: 2.0 } as const;
const NUDGE = { lat: 15, lng: 20, altitude: 0.35 } as const;

export interface RenderStats { geometries: number; textures: number; drawCalls: number; triangles: number }
export interface SpinResult { medianFps: number; minFps: number; frames: number; seconds: number; renderer: string; canvas: string; pixelRatio: number; gpu: RenderStats | null }
export interface PickedCell { lat: number; lon: number; index: number | null }
export type Nudge = 'left' | 'right' | 'up' | 'down' | 'in' | 'out';

export interface GlobeScene {
  setCells(values: Float32Array | null, colorFor?: (value: number) => Rgba): void;
  reset(): void;
  nudge(direction: Nudge): void;
  setAutoRotate(on: boolean, speed?: number): void;
  spinBenchmark(seconds: number): Promise<SpinResult>;
  stats(): RenderStats;
  dispose(): void;
}

export function webglAvailable(): boolean {
  try { return document.createElement('canvas').getContext('webgl2') !== null; } catch { return false; }
}

export type BasemapState = 'loaded' | 'failed';

export function createGlobeScene(container: HTMLElement, onPick: (cell: PickedCell) => void, onBasemap: (state: BasemapState) => void = () => undefined): GlobeScene {
  const globe = new Globe(container, { rendererConfig: { antialias: true, powerPreference: 'high-performance' }, animateIn: false, waitForGlobeReady: false })
    .globeImageUrl(BASEMAP_URL).backgroundColor('#0b1412').showAtmosphere(true).atmosphereColor('#8cdeb6').atmosphereAltitude(0.12)
    .onGlobeClick(({ lat, lng }) => onPick({ lat, lon: lng, index: cellIndexFromLatLon(lat, lng) }));
  // The sphere is drawn even if the image fails; the caller is told so it never implies a basemap is visible.
  const probe = new Image();
  probe.onload = () => onBasemap('loaded');
  probe.onerror = () => onBasemap('failed');
  probe.src = BASEMAP_URL;
  const renderer = globe.renderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const controls = globe.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 120;
  controls.maxDistance = 450;
  controls.autoRotate = false;
  globe.pointOfView(DEFAULT_VIEW, 0);

  const resize = () => { globe.width(container.clientWidth).height(container.clientHeight); };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  let layer: CellLayer | null = null;
  let disposed = false;
  const dropLayer = () => { layer?.dispose(); layer = null; };

  return {
    setCells(values, colorFor) {
      dropLayer();
      if (!values || !colorFor) return;
      layer = createCellLayer();
      layer.paint(values, colorFor);
      globe.scene().add(layer.mesh);
    },
    reset() { globe.pointOfView(DEFAULT_VIEW, 700); },
    nudge(direction) {
      const view = globe.pointOfView();
      const next = { ...view };
      if (direction === 'left') next.lng -= NUDGE.lng;
      if (direction === 'right') next.lng += NUDGE.lng;
      if (direction === 'up') next.lat = Math.min(80, next.lat + NUDGE.lat);
      if (direction === 'down') next.lat = Math.max(-80, next.lat - NUDGE.lat);
      if (direction === 'in') next.altitude = Math.max(0.3, next.altitude - NUDGE.altitude);
      if (direction === 'out') next.altitude = Math.min(3.5, next.altitude + NUDGE.altitude);
      globe.pointOfView(next, 400);
    },
    setAutoRotate(on, speed = 0.6) { controls.autoRotate = on; controls.autoRotateSpeed = speed; },
    spinBenchmark(seconds) {
      const wasRotating = controls.autoRotate, previousSpeed = controls.autoRotateSpeed;
      controls.autoRotate = true; controls.autoRotateSpeed = 6;
      const deltas: number[] = [];
      return new Promise(resolve => {
        const start = performance.now();
        let last = start;
        const tick = (now: number) => {
          if (disposed) return resolve({ medianFps: 0, minFps: 0, frames: deltas.length, seconds: 0, renderer: 'disposed', canvas: '', pixelRatio: 0, gpu: null });
          deltas.push(now - last); last = now;
          if (now - start < seconds * 1000) return void requestAnimationFrame(tick);
          controls.autoRotate = wasRotating; controls.autoRotateSpeed = previousSpeed;
          const sorted = [...deltas.slice(1)].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)] ?? Infinity;
          const gl = renderer.getContext();
          const info = gl.getExtension('WEBGL_debug_renderer_info');
          resolve({
            medianFps: 1000 / median, minFps: 1000 / (sorted[sorted.length - 1] ?? Infinity), frames: sorted.length,
            seconds: (now - start) / 1000, renderer: info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unavailable',
            canvas: `${renderer.domElement.width}×${renderer.domElement.height}`, pixelRatio: renderer.getPixelRatio(), gpu: this.stats(),
          });
        };
        requestAnimationFrame(tick);
      });
    },
    stats() {
      const { memory, render } = renderer.info;
      return { geometries: memory.geometries, textures: memory.textures, drawCalls: render.calls, triangles: render.triangles };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      dropLayer();
      globe.pauseAnimation();
      globe.scene().traverse(object => {
        const item = object as THREE.Mesh;
        item.geometry?.dispose();
        for (const material of [item.material].flat() as (THREE.Material & { map?: THREE.Texture | null })[]) {
          material?.map?.dispose(); material?.dispose();
        }
      });
      globe._destructor();
      renderer.dispose();
      renderer.forceContextLoss();
      container.replaceChildren();
    },
  };
}
