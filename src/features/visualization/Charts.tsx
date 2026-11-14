"use client";
import { useEffect, useRef, useState } from "react";
import type { EChartsCoreOption, EChartsType } from "echarts/core";
import { useTheme } from "@/context/ThemeContext";
import { calendar, histogram, lineData, MONTHS, monthlyCells, paired, scale, standardize, type Datum, type VisualSeries } from "./model";
export type ChartKind = "line" | "area" | "bars" | "seasonal" | "heatmap" | "distribution" | "scatter";
export const CHARTS: {
    id: ChartKind;
    label: string;
    hint: string;
}[] = [
    { id: "line", label: "Time series", hint: "Follow the observations through time. Gaps remain visible." },
    { id: "area", label: "Area", hint: "A filled time series with a visible zero baseline; no interpolation across gaps." },
    { id: "bars", label: "Observation bars", hint: "Compare individual observed values against zero." },
    { id: "seasonal", label: "Seasonal profile", hint: "Mean of available values for each calendar month in the selected period; not a climate normal." },
    { id: "heatmap", label: "Monthly heatmap", hint: "Each cell is the observed monthly mean minus that calendar month's mean in the selected period. Empty cells have no usable data." },
    { id: "distribution", label: "Distribution", hint: "Frequency of observed values. A distribution has no time ordering." },
    { id: "scatter", label: "Relationship", hint: "Pairs series with the same cadence and exactly matching timestamps. Association does not establish causation." },
];
export function ChartCanvas({ option, label, onSelect }: {
    option: EChartsCoreOption;
    label: string;
    onSelect?: (time: number) => void;
}) {
    const node = useRef<HTMLDivElement>(null), chart = useRef<EChartsType | null>(null);
    const latest = useRef({ option, onSelect });
    latest.current = { option, onSelect };
    const [error, setError] = useState("");
    useEffect(() => {
        let disposed = false;
        let observer: ResizeObserver | undefined;
        void Promise.all([import('echarts/core'), import('echarts/charts'), import('echarts/components'), import('echarts/renderers')]).then(([engine, charts, components, renderers]) => {
            if (disposed || !node.current)
                return;
            engine.use([charts.LineChart, charts.BarChart, charts.HeatmapChart, charts.ScatterChart, components.GridComponent, components.TooltipComponent, components.LegendComponent, components.DataZoomComponent, components.VisualMapComponent, components.AriaComponent, renderers.CanvasRenderer]);
            const instance = engine.init(node.current, undefined, { renderer: 'canvas' });
            chart.current = instance;
            instance.setOption(latest.current.option, { notMerge: true });
            instance.on('click', params => { const point = params.data as unknown; if (Array.isArray(point) && typeof point[0] === 'number' && point[0] > 100000000000)
                latest.current.onSelect?.(point[0]); });
            observer = new ResizeObserver(() => instance.resize());
            observer.observe(node.current);
        }).catch(() => { if (!disposed)
            setError("Chart renderer unavailable. The observation table and exports remain available."); });
        return () => { disposed = true; observer?.disconnect(); chart.current?.dispose(); chart.current = null; };
    }, []);
    useEffect(() => { chart.current?.setOption(option, { notMerge: true }); }, [option]);
    return <div className="viz-chart-frame" role="img" aria-label={label}><div className="viz-chart-canvas" ref={node}/>{error && <p role="alert">{error}</p>}</div>;
}
export function DataChart({ kind, entries, primary, data, normalized, onSelect }: {
    kind: ChartKind;
    entries: VisualSeries[];
    primary: VisualSeries;
    data: Map<string, Datum[]>;
    normalized: boolean;
    onSelect: (time: number) => void;
}) {
    const { dark } = useTheme();
    const foreground = dark ? '#c9d8d2' : '#53665e', grid = dark ? '#283e36' : '#e5ece8';
    const selected = data.get(primary.id) ?? [];
    const sameUnit = entries.every(s => s.preview.summary_stats.unit === primary.preview.summary_stats.unit);
    const sameCadence = entries.every(s => s.preview.extraction_config.target_frequency === primary.preview.extraction_config.target_frequency);
    const comparisonAllowed = (sameUnit && sameCadence) || normalized;
    const plotted = comparisonAllowed ? entries : [primary];
    const units = normalized ? 'Standard deviations (z-score)' : primary.preview.summary_stats.unit;
    const option: EChartsCoreOption = { animation: false, useUTC: true, color: entries.map(s => s.color), backgroundColor: 'transparent', aria: { enabled: true },
        textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: foreground },
        tooltip: { trigger: 'axis', renderMode: 'richText', confine: true },
        grid: { left: 72, right: 25, top: 55, bottom: 72 },
        legend: { type: 'scroll', top: 5, textStyle: { color: foreground } },
        xAxis: { type: 'time', axisLine: { lineStyle: { color: grid } }, axisLabel: { color: foreground } },
        yAxis: { type: 'value', name: units, scale: kind !== 'area' && kind !== 'bars', splitLine: { lineStyle: { color: grid } }, axisLabel: { color: foreground } },
        dataZoom: [{ type: 'inside', filterMode: 'none' }, { type: 'slider', height: 20, bottom: 12, filterMode: 'none' }],
    };
    if (['line', 'area', 'bars'].includes(kind)) {
        option.series = plotted.map(s => ({ name: s.label, type: kind === 'bars' ? 'bar' : 'line', connectNulls: false,
            data: lineData(normalized ? standardize(data.get(s.id) ?? []) : data.get(s.id) ?? [], s.preview.extraction_config.target_frequency),
            showSymbol: true, symbolSize: (data.get(s.id)?.length ?? 0) > 800 ? 2 : 4, lineStyle: { width: 2, color: s.color }, itemStyle: { color: s.color },
            ...(kind === 'area' ? { areaStyle: { opacity: 0.12 } } : {}), emphasis: { focus: 'series' } }));
    }
    else if (kind === 'seasonal') {
        option.xAxis = { type: 'category', data: MONTHS, axisLabel: { color: foreground } };
        option.series = [{ name: primary.label, type: 'bar', data: calendar(selected).map(m => m.mean), itemStyle: { color: primary.color, borderRadius: [5, 5, 0, 0] } }];
        option.dataZoom = [];
    }
    else if (kind === 'heatmap') {
        const cells = monthlyCells(selected), years = [...new Set(cells.map(c => c.year))].sort();
        const range = scale(cells.map(c => c.anomaly), true);
        option.xAxis = { type: 'category', data: MONTHS, splitArea: { show: true }, axisLabel: { color: foreground } };
        option.yAxis = { type: 'category', data: years, name: 'Year', axisLabel: { color: foreground } };
        option.visualMap = { min: range[0], max: range[1], calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#416ab0', '#e5ece7', '#b65234'] }, textStyle: { color: foreground } };
        option.series = [{ type: 'heatmap', name: `Calendar-month departures (${primary.preview.summary_stats.unit})`, data: cells.map(c => [c.month, years.indexOf(c.year), c.anomaly]), itemStyle: { borderWidth: 2, borderColor: dark ? '#10271e' : '#fff' }, emphasis: { itemStyle: { borderColor: primary.color, borderWidth: 2 } } }];
        option.tooltip = { trigger: 'item', renderMode: 'richText', confine: true, formatter: ((params: {
                data: unknown;
            }) => { const d = params.data as number[]; return `${MONTHS[d[0]]} ${years[d[1]]}\nDeparture: ${d[2].toFixed(3)} ${primary.preview.summary_stats.unit}\nDescriptive selected-period baseline`; }) as never };
        option.dataZoom = years.length > 20 ? [{ type: 'slider', yAxisIndex: 0, orient: 'vertical', right: 0, width: 14 }] : [];
    }
    else if (kind === 'distribution') {
        const bins = histogram(selected);
        option.xAxis = { type: 'category', name: primary.preview.summary_stats.unit, data: bins.map(b => `${b.low.toFixed(2)} to ${b.high.toFixed(2)}`), axisLabel: { rotate: 25, color: foreground } };
        option.yAxis = { type: 'value', name: 'Observations', minInterval: 1, splitLine: { lineStyle: { color: grid } } };
        option.dataZoom = [];
        option.series = [{ type: 'bar', name: primary.label, data: bins.map(b => b.count), barCategoryGap: '4%', itemStyle: { color: primary.color, borderRadius: [4, 4, 0, 0] } }];
    }
    else {
        const other = entries.find(s => s.id !== primary.id && s.preview.extraction_config.target_frequency === primary.preview.extraction_config.target_frequency);
        option.xAxis = { type: 'value', name: `${primary.preview.product.variable_id} (${primary.preview.summary_stats.unit})`, scale: true, splitLine: { lineStyle: { color: grid } } };
        option.yAxis = { type: 'value', name: other ? `${other.preview.product.variable_id} (${other.preview.summary_stats.unit})` : 'Select a second series with matching cadence', scale: true, splitLine: { lineStyle: { color: grid } } };
        option.tooltip = { trigger: 'item', renderMode: 'richText', confine: true, formatter: ((params: {
                data: unknown;
            }) => { const d = params.data as [
                number,
                number,
                string
            ]; return `${d[2]}\n${primary.preview.product.variable_id}: ${d[0]} ${primary.preview.summary_stats.unit}\n${other?.preview.product.variable_id}: ${d[1]} ${other?.preview.summary_stats.unit}`; }) as never };
        option.series = [{ name: 'Exactly aligned observations', type: 'scatter', data: other ? paired(selected, data.get(other.id) ?? []) : [], symbolSize: 8, itemStyle: { color: primary.color, opacity: 0.7 } }];
        option.dataZoom = [];
    }
    return <>
  {!comparisonAllowed && entries.length > 1 && ['line', 'area', 'bars'].includes(kind) && <p className="viz-note">Different units or cadences: showing the primary series. Enable standardization for an explicitly unitless comparison, or use Relationship with separate axes.</p>}
  {normalized && ['line', 'area', 'bars'].includes(kind) && <p className="viz-note">Each series is standardized independently using its selected-period mean and sample standard deviation. Absolute magnitudes and units are not comparable in this view.</p>}
  {kind === 'scatter' && entries.length < 2 ? <div className="viz-empty">Load a second dataset or location to compare observations.</div> :
            <ChartCanvas option={option} label={`${CHARTS.find(c => c.id === kind)?.label} for ${primary.label}. Exact values are available in the observation table.`} onSelect={onSelect}/>}
 </>;
}
