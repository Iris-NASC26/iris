"use client";
import { useEffect, useRef, useState } from "react";
import { color, scale, numeric, format, type FieldData } from "./model";
import { vector, location } from "./globeMath";
export interface MapPoint {
    id: string;
    label: string;
    lat: number;
    lon: number;
    value: number | null;
    units: string;
    color: string;
}
interface SceneAPI {
    update: (field: FieldData | null, points: MapPoint[]) => void;
    focus: (lat: number, lon: number) => void;
    nudge: (action: string) => void;
}
export function Globe({ field, points, onPick }: {
    field: FieldData | null;
    points: MapPoint[];
    onPick: (lat: number, lon: number) => void;
}) {
    const mount = useRef<HTMLDivElement>(null), api = useRef<SceneAPI | null>(null);
    const latest = useRef({ field, points, onPick });
    latest.current = { field, points, onPick };
    const [mode, setMode] = useState<'3d' | '2d'>('3d'), [state, setState] = useState('Loading 3D engine'), [imageReady, setImageReady] = useState(false);
    const [readout, setReadout] = useState<{
        lat: number;
        lon: number;
        value: number | null;
    } | null>(null);
    const range = field ? scale(field.values) : [0, 1] as [
        number,
        number
    ];
    const inspect = (lat: number, lon: number) => {
        const f = latest.current.field;
        let value: number | null = null;
        if (f) {
            const la = f.cell_lats.findIndex(x => Math.abs(x - lat) <= f.lat_step / 2), lo = f.cell_lons.findIndex(x => Math.abs(x - lon) <= f.lon_step / 2);
            if (la >= 0 && lo >= 0)
                value = f.values[la * f.cell_lons.length + lo];
        }
        setReadout({ lat, lon, value });
        latest.current.onPick(lat, lon);
    };
    const inspectRef = useRef(inspect);
    inspectRef.current = inspect;
    useEffect(() => {
        if (mode !== '3d')
            return;
        let disposed = false, cleanup = () => { };
        void Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')]).then(([T, { OrbitControls }]) => {
            if (disposed || !mount.current)
                return;
            const target = mount.current;
            let renderer: import('three').WebGLRenderer;
            try {
                renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
            }
            catch {
                setState('WebGL unavailable. Use the 2D map.');
                setMode('2d');
                return;
            }
            renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
            renderer.outputColorSpace = T.SRGBColorSpace;
            target.appendChild(renderer.domElement);
            renderer.domElement.setAttribute('aria-label', 'Interactive Earth globe. Use camera buttons and coordinate inputs for keyboard selection.');
            const scene = new T.Scene(), camera = new T.PerspectiveCamera(38, 1, 0.1, 50);
            camera.position.set(...vector(15, 50, 3.5));
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.enablePan = false;
            controls.minDistance = 1.6;
            controls.maxDistance = 5;
            controls.rotateSpeed = 0.6;
            const earthMaterial = new T.MeshPhongMaterial({ color: '#314f61', shininess: 5 });
            const earth = new T.Mesh(new T.SphereGeometry(1, 96, 64), earthMaterial);
            scene.add(earth);
            scene.add(new T.AmbientLight('#c2e5ed', 2.1));
            const sun = new T.DirectionalLight('#fff3db', 1.6);
            sun.position.set(3, 4, 5);
            scene.add(sun);
            const halo = new T.Mesh(new T.SphereGeometry(1.025, 64, 48), new T.MeshBasicMaterial({ color: '#28b7aa', transparent: true, opacity: 0.08, side: T.BackSide }));
            scene.add(halo);
            let texture: import('three').Texture | undefined;
            const loader = new T.TextureLoader();
            loader.load('/visualization/basemap-2048x1024.jpg', loaded => {
                if (disposed) {
                    loaded.dispose();
                    return;
                }
                texture = loaded;
                loaded.colorSpace = T.SRGBColorSpace;
                earthMaterial.map = loaded;
                earthMaterial.color.set('#ffffff');
                earthMaterial.needsUpdate = true;
                setImageReady(true);
            }, undefined, () => { if (!disposed)
                setState('Basemap unavailable; plain Earth sphere shown.'); });
            const overlay = new T.Group(), markers = new T.Group();
            scene.add(overlay, markers);
            const release = (group: import('three').Group) => { while (group.children.length) {
                const object = group.children[0] as import('three').Mesh;
                group.remove(object);
                object.geometry.dispose();
                (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose());
            } };
            const update = (f: FieldData | null, current: MapPoint[]) => {
                release(overlay);
                release(markers);
                if (f) {
                    const positions: number[] = [], colors: number[] = [], limits = scale(f.values);
                    f.values.forEach((v, index) => {
                        if (v === null)
                            return;
                        const row = Math.floor(index / f.cell_lons.length), column = index % f.cell_lons.length;
                        const lat = f.cell_lats[row], lon = f.cell_lons[column];
                        const low = Math.max(-90, lat - f.lat_step / 2), high = Math.min(90, lat + f.lat_step / 2), west = lon - f.lon_step / 2, east = lon + f.lon_step / 2;
                        const corners = [vector(low, west, 1.004), vector(low, east, 1.004), vector(high, east, 1.004), vector(high, west, 1.004)];
                        const paint = new T.Color(color(v, limits));
                        [0, 1, 2, 0, 2, 3].forEach(i => { positions.push(...corners[i]); colors.push(paint.r, paint.g, paint.b); });
                    });
                    const geometry = new T.BufferGeometry();
                    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
                    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
                    overlay.add(new T.Mesh(geometry, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, transparent: true, opacity: 0.93 })));
                }
                current.forEach(point => { const marker = new T.Mesh(new T.SphereGeometry(0.014, 12, 8), new T.MeshBasicMaterial({ color: point.color })); marker.position.set(...vector(point.lat, point.lon, 1.016)); markers.add(marker); });
            };
            const resize = () => { const width = Math.max(1, target.clientWidth), height = Math.max(1, target.clientHeight); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); };
            const observer = new ResizeObserver(resize);
            observer.observe(target);
            resize();
            const raycaster = new T.Raycaster(), mouse = new T.Vector2();
            let down: [
                number,
                number
            ] = [0, 0];
            const pointerDown = (event: PointerEvent) => { down = [event.clientX, event.clientY]; };
            const pointerUp = (event: PointerEvent) => { if (Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5)
                return; const box = renderer.domElement.getBoundingClientRect(); mouse.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1); raycaster.setFromCamera(mouse, camera); const hit = raycaster.intersectObject(earth)[0]; if (hit) {
                const point = location(hit.point.x, hit.point.y, hit.point.z);
                inspectRef.current(point.lat, point.lon);
            } };
            renderer.domElement.addEventListener('pointerdown', pointerDown);
            renderer.domElement.addEventListener('pointerup', pointerUp);
            api.current = { update, focus: (lat, lon) => { camera.position.set(...vector(lat, lon, Math.max(2.1, camera.position.length()))); controls.update(); }, nudge: action => {
                    const current = location(camera.position.x, camera.position.y, camera.position.z), r = camera.position.length();
                    if (action === 'reset')
                        camera.position.set(...vector(15, 50, 3.5));
                    else if (action === 'in' || action === 'out')
                        camera.position.multiplyScalar(action === 'in' ? 0.85 : 1.15);
                    else
                        camera.position.set(...vector(Math.max(-85, Math.min(85, current.lat + (action === 'north' ? 10 : action === 'south' ? -10 : 0))), current.lon + (action === 'east' ? 15 : action === 'west' ? -15 : 0), r));
                    controls.update();
                } };
            update(latest.current.field, latest.current.points);
            setState('3D globe ready');
            renderer.setAnimationLoop(() => { if (document.hidden)
                return; controls.update(); renderer.render(scene, camera); });
            cleanup = () => { renderer.setAnimationLoop(null); observer.disconnect(); renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); controls.dispose(); release(overlay); release(markers); earth.geometry.dispose(); earthMaterial.dispose(); halo.geometry.dispose(); halo.material.dispose(); texture?.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); api.current = null; };
        }).catch(() => { if (!disposed) {
            setState('3D engine unavailable. Use the 2D map.');
            setMode('2d');
        } });
        return () => { disposed = true; cleanup(); };
    }, [mode]);
    useEffect(() => { api.current?.update(field, points); }, [field, points]);
    return <div className="viz-globe">
  <div className="viz-globe-toolbar"><div className="viz-segment" role="group" aria-label="Map projection">
   <button aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>3D globe</button><button aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>2D map</button>
  </div><span className="viz-muted">{state}</span></div>
  <div className="viz-earth-stage">
   {mode === '3d' ? <div className="viz-three-mount" ref={mount}/> :
            <svg className="viz-flat-map" viewBox="0 0 1000 500" role="img" aria-label="Equirectangular world map with retrieved data only" onClick={event => { const r = event.currentTarget.getBoundingClientRect(); inspectRef.current(90 - (event.clientY - r.top) / r.height * 180, (event.clientX - r.left) / r.width * 360 - 180); }}>
     <image href="/visualization/basemap-2048x1024.jpg" width="1000" height="500"/>
     {field?.values.map((value, i) => value === null ? null : <rect key={i} x={(field.cell_lons[i % field.cell_lons.length] - field.lon_step / 2 + 180) / 360 * 1000} y={(90 - field.cell_lats[Math.floor(i / field.cell_lons.length)] - field.lat_step / 2) / 180 * 500} width={field.lon_step / 360 * 1000} height={field.lat_step / 180 * 500} fill={color(value, range)}><title>{`${field.month}: ${value} ${field.units}`}</title></rect>)}
     {points.map(point => <circle key={point.id} cx={(point.lon + 180) / 360 * 1000} cy={(90 - point.lat) / 180 * 500} r="4" fill={point.color}><title>{point.label}</title></circle>)}
    </svg>}
   <div className="viz-earth-overlay"><span>EARTH OBSERVATION</span><strong>{field ? `${field.field} / ${field.month}` : 'Your data, in place.'}</strong><p>{field ? 'Native grid cells. No spatial smoothing.' : 'Select a dataset and location, or load a real spatial field.'}</p></div>
   <p className="viz-basemap-credit">{imageReady || mode === '2d' ? 'Basemap: NASA EOSDIS GIBS / Blue Marble. Decorative imagery, not measurement data.' : 'NASA basemap loading; no measurement is derived from this image.'}</p>
  </div>
  {mode === '3d' && <div className="viz-camera-controls" role="group" aria-label="Keyboard camera controls">
   {[['west', 'Rotate west'], ['east', 'Rotate east'], ['north', 'Tilt north'], ['south', 'Tilt south'], ['in', 'Zoom in'], ['out', 'Zoom out'], ['reset', 'Reset globe']].map(([action, label]) => <button key={action} onClick={() => api.current?.nudge(action)}>{label}</button>)}
   {points[0] && <button onClick={() => api.current?.focus(points[0].lat, points[0].lon)}>Focus on selected data</button>}
   {field && <button onClick={() => api.current?.focus((field.cell_lats[0]+field.cell_lats.at(-1)!)/2,(field.cell_lons[0]+field.cell_lons.at(-1)!)/2)}>Focus on spatial field</button>}
  </div>}
  {field && <div className="viz-field-legend"><span>{format(range[0])}</span><i style={{ background: 'linear-gradient(90deg,#26407f,#1b978b,#f6df76)' }}/><span>{format(range[1])} {field.units}</span><small>Raw value / {field.time_standard}. Missing cells are transparent. Scale belongs to this loaded field.</small></div>}
  {readout && <p className="viz-readout" role="status">Picked {readout.lat.toFixed(3)}, {readout.lon.toFixed(3)}{field ? ` / ${readout.value === null ? 'No value in the loaded field' : `${format(readout.value)} ${field.units}`} / ${field.month}` : ''}. Coordinates copied to selection; load data explicitly.</p>}
  {points.length > 0 && <ul className="viz-map-values" aria-label="Mapped observations">{points.map(point => <li key={point.id}><i style={{ background: point.color }}/><span>{point.label}</span><strong>{numeric(point.value) ? `${format(point.value)} ${point.units}` : 'No observation at this time'}</strong></li>)}</ul>}
 </div>;
}
