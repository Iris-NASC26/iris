"use client";
import { useEffect, useRef, useState } from 'react';
import type { EChartsOption, EChartsType } from 'echarts';
import { MONTHS } from '../model';
import { PALETTES, type DisplayPrefs } from '../studio/display';
import { landscapeTooltipPoint, type Landscape } from './model';

export function LandscapeChart({ model, display, reset, selectedTime, onSelect, onUnavailable }: {
    model: Landscape; display: DisplayPrefs; reset: number; selectedTime: number | null;
    onSelect: (time: number) => void; onUnavailable: (reason: string) => void;
}) {
    const node = useRef<HTMLDivElement>(null), instance = useRef<EChartsType | null>(null);
    const latest = useRef({ onSelect, onUnavailable }); latest.current = { onSelect, onUnavailable };
    const camera = useRef<Record<string, number | number[]>>({});
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let disposed = false, observer: ResizeObserver | undefined;
        const mount = node.current;
        const lost = (event: Event) => { event.preventDefault(); latest.current.onUnavailable('The graphics context was lost. Continue exploring in the 2D heatmap.'); };
        // Release the capability-probe context immediately; it must not compete
        // with the real renderer on mobile/context-limited browsers.
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        if (!gl) { latest.current.onUnavailable('WebGL is unavailable. The equivalent 2D heatmap is shown.'); return; }
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        void Promise.all([import('echarts'), import('echarts-gl')]).then(([engine]) => {
            if (disposed || !node.current) return;
            const chart = engine.init(node.current, undefined, { renderer: 'canvas', devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2) });
            instance.current = chart;
            chart.on('click', event => {
                const point = (event as { data?: unknown }).data;
                if (Array.isArray(point) && typeof point[3] === 'number') latest.current.onSelect(point[3]);
            });
            chart.on('grid3dcamerachanged', event => {
                const values = event as Record<string, unknown>;
                for (const key of ['alpha', 'beta', 'distance', 'orthographicSize']) if (typeof values[key] === 'number' && Number.isFinite(values[key])) camera.current[key] = values[key] as number;
                if (Array.isArray(values.center) && values.center.length === 3 && values.center.every(v => typeof v === 'number' && Number.isFinite(v))) camera.current.center = values.center;
            });
            // ECharts GL creates an additional canvas; capture context loss from it.
            node.current.addEventListener('webglcontextlost', lost, true);
            observer = new ResizeObserver(() => chart.resize()); observer.observe(node.current);
            setReady(true);
        }).catch(() => { if (!disposed) latest.current.onUnavailable('The 3D renderer could not load. The 2D heatmap and data exports remain available.'); });
        return () => { disposed = true; mount?.removeEventListener('webglcontextlost', lost, true); observer?.disconnect(); instance.current?.dispose(); instance.current = null; };
    }, []);
    useEffect(() => {
        const chart = instance.current;
        if (!ready || !chart) return;
        const foreground = display.dark ? '#acbdcf' : '#47586d', grid = display.dark ? '#2b3c51' : '#d5dfe9';
        const point = (c: Landscape['cells'][number]) => [c.month, c.year, c.value, c.row.time];
        const colors = PALETTES[display.palette];
        const columns = display.representation === 'columns';
        const series: unknown[] = columns ? [{ type: 'bar3D', name: model.description, data: model.cells.map(point), shading: 'color', barSize: [0.7, 0.7], itemStyle: { opacity: 0.93 }, emphasis: { itemStyle: { color: '#fff3b0' } } }]
            : [...model.patches.map(p => ({ type: 'surface', data: p.points, shading: 'color', silent: true, wireframe: { show: display.wireframe, lineStyle: { color: foreground, opacity: 0.13, width: 0.6 } }, itemStyle: { opacity: 0.95 } })),
                { type: 'scatter3D', name: 'Observed months', data: model.cells.map(point), symbolSize: 4, itemStyle: { opacity: 0.85 } }];
        const selected = model.cells.find(c => c.row.time === selectedTime);
        if (selected) series.push({ type: 'scatter3D', name: 'Selected observation', data: [point(selected)], symbolSize: 13, itemStyle: { color: '#fff4ac', borderWidth: 2, borderColor: '#172231' } });
        const axis = { axisLabel: { color: foreground, fontSize: 10 }, nameTextStyle: { color: foreground, fontSize: 11 }, axisLine: { lineStyle: { color: grid } }, axisTick: { show: false }, splitLine: { lineStyle: { color: grid, opacity: 0.5 } }, splitArea: { show: false } };
        const option = {
            animation: false, backgroundColor: 'transparent',
            tooltip: { confine: true, renderMode: 'richText', formatter: (p: { data?: unknown }) => {
                const point = landscapeTooltipPoint(p.data);
                if (!point || !Number.isInteger(point.x) || !MONTHS[point.x] || !Number.isInteger(point.y) || !Number.isFinite(point.y)) return '';
                return `${MONTHS[point.x]} ${point.y}\n${point.value.toPrecision(5)} ${model.unit}\n${model.description}`;
            } },
            visualMap: { min: model.range[0], max: model.range[1], dimension: 2, calculable: false, orient: 'horizontal', left: 'center', bottom: 5, itemWidth: 10, itemHeight: 140, text: [model.range[1].toPrecision(3), model.range[0].toPrecision(3)], textStyle: { color: foreground }, inRange: { color: colors }, precision: 2 },
            xAxis3D: { ...axis, type: 'value', min: 0, max: 11, interval: 1, name: 'Month', axisLabel: { color: foreground, formatter: (v: number) => MONTHS[v] ?? '' } },
            yAxis3D: { ...axis, type: 'value', min: model.years[0] - 0.5, max: model.years[model.years.length - 1] + 0.5, minInterval: 1, name: 'Year', axisLabel: { color: foreground, formatter: (v: number) => Number.isInteger(v) ? String(v) : '' } },
            zAxis3D: { ...axis, type: 'value', name: model.unit, min: columns ? Math.min(0, model.range[0]) : model.range[0], max: columns ? Math.max(0, model.range[1]) : model.range[1] },
            grid3D: { left: 0, right: 0, top: -12, bottom: 20, boxWidth: 120, boxDepth: 150, boxHeight: display.height,
                viewControl: { projection: display.projection, autoRotate: false, alpha: 30, beta: 32, distance: 230, minDistance: 110, maxDistance: 420, animation: false, panMouseButton: 'middle', ...camera.current },
                light: { main: { intensity: 1.1 }, ambient: { intensity: 0.7 } }, postEffect: { enable: false }, temporalSuperSampling: { enable: false } },
            series,
        } as unknown as EChartsOption;
        try { chart.setOption(option, { notMerge: true }); }
        catch { latest.current.onUnavailable('3D rendering failed for this record. The 2D heatmap remains available.'); }
        // Camera events stay in a ref: linked selections preserve orbit/zoom and
        // hover never updates React. The explicit reset remounts this component.
    }, [model, display, reset, selectedTime, ready]);
    return <div className="viz-landscape-canvas" role="img" aria-label={`Interactive 3D seasonal landscape. ${model.cells.length} monthly values; ${model.unit}. Drag to orbit, scroll to zoom. Equivalent values are available in the heatmap and data exports.`}>
        <div ref={node} style={{ position: 'absolute', inset: 0 }}/>
        {!ready && <span className="viz-render-status" role="status">Preparing the 3D landscape…</span>}
    </div>;
}
