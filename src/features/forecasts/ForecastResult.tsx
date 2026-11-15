"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/context/ThemeContext";
import { ChartCanvas } from "@/features/visualization/Charts";
import type { MlPrediction } from "./model";

const number = (value: number, digits = 2) => new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(value);
const date = (value: string, weekday = false) => new Intl.DateTimeFormat("en", {
  ...(weekday ? { weekday: "short" as const } : {}), day: "numeric", month: "short", timeZone: "UTC",
}).format(new Date(value));
const unitLabel = (unit: string) => ({ "kg/m^2": "kg/m²", "m3/m3": "m³/m³", "kg/m^2/8day": "kg/m²", "1": "index" }[unit] || unit);

export const targetLabel = (target: string, fallback?: string) => ({
  precip_24h: "Rainfall", smap_surface_sm: "Surface soil moisture · SMAP", smap_rootzone_sm: "Root-zone moisture · SMAP",
  merra2_t2m: "Air temperature · MERRA-2", modis_lst_day: "Land temperature · MODIS", modis_ndvi: "Vegetation · MODIS",
  viirs_ndvi: "Vegetation · VIIRS", modis_et: "Evapotranspiration", gldas_sm: "Soil moisture · GLDAS",
  gldas_tair: "Air temperature · GLDAS", modis_snow: "Snow index",
}[target] || fallback || target);

export function ForecastResult({ prediction, label, target, savedHref, archived, onExport }: {
  prediction: MlPrediction; label: string; target: string; savedHref: string; archived: boolean; onExport: () => void;
}) {
  const { dark } = useTheme();
  const [celsius, setCelsius] = useState(true);
  const windows = prediction.predictions || [];
  const first = windows[0];
  const isTemperature = first?.unit === "K";
  const convert = (value: number) => value - (isTemperature && celsius ? 273.15 : 0);
  const unit = isTemperature && celsius ? "°C" : unitLabel(first?.unit || "");
  const preview = prediction.quality_status === "experimental_preview" || windows.some(w => w.quality_status === "experimental_preview");
  const errorValues = windows.flatMap(w => w.error_vs_baseline_pct == null ? [] : [w.error_vs_baseline_pct]);
  const worstError = errorValues.length ? Math.max(...errorValues) : null;
  const reasons = [...new Set(windows.flatMap(w => w.quality_reasons || []))];
  const icon: IconName = isTemperature ? "thermometer" : target.includes("ndvi") ? "layers" : "activity";
  const chart = useMemo(() => {
    const values = prediction.predictions || [];
    const shift = values[0]?.unit === "K" && celsius ? 273.15 : 0;
    const foreground = dark ? "#b4cac3" : "#526a63";
    const accent = preview ? (dark ? "#f2a27d" : "#b75e39") : (dark ? "#50d2b1" : "#078665");
    return {
      animation: false,
      tooltip: { trigger: "axis" as const, renderMode: "richText" as const, confine: true,
        formatter: (params: unknown) => {
          const index = (params as { dataIndex: number }[])[0]?.dataIndex || 0;
          const w = values[index];
          return `${date(w.window_start)}\nEstimate: ${number(w.q50 - shift)} ${unit}\n10–90% range: ${number(w.q10 - shift)}–${number(w.q90 - shift)} ${unit}`;
        } },
      grid: { left: 58, right: 20, top: 25, bottom: 35 },
      xAxis: { type: "category" as const, boundaryGap: false, data: values.map(w => date(w.window_start)),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: foreground, margin: 14 } },
      yAxis: { type: "value" as const, name: unit, scale: true, axisLabel: { color: foreground },
        splitLine: { lineStyle: { color: dark ? "#28453d" : "#e5eeea", type: "dashed" as const } } },
      series: [
        { name: "Lower range", type: "line" as const, stack: "range", stackStrategy: "all" as const,
          data: values.map(w => w.q10 - shift), symbol: "none", lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 }, silent: true },
        { name: "10–90% model range", type: "line" as const, stack: "range", stackStrategy: "all" as const,
          data: values.map(w => w.q90 - w.q10), symbol: "none", lineStyle: { opacity: 0 },
          areaStyle: { color: accent, opacity: .13 }, silent: true },
        { name: "Estimate", type: "line" as const, data: values.map(w => w.q50 - shift), symbolSize: 10,
          lineStyle: { width: 3, color: accent }, itemStyle: { color: accent, borderColor: dark ? "#112e25" : "#fff", borderWidth: 3 } },
      ],
    };
  }, [prediction, celsius, dark, preview, unit]);
  if (!first) return null;
  return <section id="forecast-result" className={`ml-result forecast-result${preview ? " is-preview" : ""}`} aria-label="Generated forecast">
    <div className="result-heading">
      <div><span className="forecast-kicker">{archived ? "SAVED FORECAST" : "YOUR FORECAST"}</span>
        <h3 className="result-name">{targetLabel(target, label)}</h3></div>
      <span className={`result-badge ${preview ? "quality-warning" : "quality-pass"}`}>
        <Icon name={preview ? "alert" : "check"} size={14} /> {preview ? "Experimental preview" : "Passed model checks"}
      </span>
    </div>
    {preview && <div className="result-warning" role="status">
      <Icon name="alert" size={19} />
      <div><strong>{worstError != null && worstError > 0 ? `Up to ${number(worstError, 1)}% more error than baseline` : "Model quality checks not met"}</strong>
        <span>Historical test result · use this preview with caution.</span></div>
    </div>}
    <div className="result-hero">
      <div className="result-hero-value">
        <span className="result-eyebrow"><Icon name={icon} size={17} /> {date(first.window_start, true)} · first window</span>
        <div className="result-big-number">{number(convert(first.q50))}<span>{unit}</span></div>
        <span className="result-range">Estimated range <strong>{number(convert(first.q10))}–{number(convert(first.q90))} {unit}</strong></span>
      </div>
      <div className="result-hero-meta">
        <span><i /> Experimental local ML forecast</span>
        {prediction.input_age_hours != null && <span>Input age <strong>{number(prediction.input_age_hours / 24, 1)} days</strong></span>}
        {prediction.issued_at && <span>Issued <strong>{date(prediction.issued_at)} · {new Date(prediction.issued_at).toISOString().slice(11, 16)} UTC</strong></span>}
        {prediction.stale && <span className="quality-warning">Archived snapshot · generate to refresh</span>}
      </div>
    </div>
    <div className="result-days" aria-label="Forecast windows">
      {windows.map((w, index) => <article className="result-day" key={w.window_start}>
        <div className="result-day-top"><span>WINDOW {index + 1}</span><Icon name={icon} size={17} /></div>
        <h4>{date(w.window_start, true)}</h4>
        <div className="result-day-value">{number(convert(w.q50))}<span>{unit}</span></div>
        <p>{number(convert(w.q10))}–{number(convert(w.q90))} {unit} <span>range</span></p>
        {w.error_vs_baseline_pct != null && <span className={`result-error ${w.error_vs_baseline_pct > 0 || w.quality_status === "experimental_preview" ? "quality-warning" : "quality-pass"}`}>
          {number(Math.abs(w.error_vs_baseline_pct), 1)}% {w.error_vs_baseline_pct > 0 ? "more" : "less"} error vs baseline
        </span>}
        {w.quality_status === "experimental_preview" && w.error_vs_baseline_pct == null && <span className="result-error quality-warning">Quality checks not met</span>}
      </article>)}
    </div>
    <div className="result-chart-heading"><h4>Forecast outlook</h4>
      <div className="result-chart-key"><span><i />Estimate</span><span><i />10–90% range</span>
        {isTemperature && <button className="result-unit-toggle" onClick={() => setCelsius(!celsius)} aria-label="Switch temperature unit">{celsius ? "Show K" : "Show °C"}</button>}
      </div></div>
    <div className="ml-forecast-chart"><ChartCanvas option={chart} label={`${label} forecast estimates and 10th–90th percentile range`} /></div>
    <div className="result-footer"><span>UTC windows · error comparisons use held-out history</span>
      <div><Link href={savedHref} aria-label="Open permanent link to this forecast"><Icon name="external" size={14} /> Save link</Link>
        <button onClick={onExport} aria-label="Export forecast and evidence"><Icon name="download" size={14} /> Export</button></div></div>
    <details className="ml-datasets result-evidence"><summary>Forecast details &amp; evaluation</summary>
      <p className="forecast-small">Run {prediction.run_id} · {prediction.uncertainty_method}. Source publication times are estimated; source targets are not independent station observations.</p>
      {reasons.length > 0 && <ul className="quality-warning">{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      <div className="forecast-table"><table>
        <caption>Iris ML run {prediction.run_id} · original source units</caption>
        <thead><tr><th>Window (UTC)</th><th>Low (q10)</th><th>Estimate</th><th>High (q90)</th><th>Unit</th><th>Model MAE</th><th>Baseline MAE</th><th>Error vs baseline</th></tr></thead>
        <tbody>{windows.map(w => <tr key={w.window_start}>
          <td>{w.window_start.slice(0, 10)} → {w.window_end.slice(0, 10)}</td><td>{number(w.q10)}</td><td>{number(w.q50)}</td><td>{number(w.q90)}</td><td>{w.unit}</td>
          <td>{w.evaluation?.model_mae == null ? "—" : number(w.evaluation.model_mae)}</td><td>{w.evaluation?.baseline_mae == null ? "—" : number(w.evaluation.baseline_mae)}</td>
          <td className={w.quality_status === "experimental_preview" || (w.error_vs_baseline_pct || 0) > 0 ? "quality-warning" : ""}>{w.error_vs_baseline_pct == null ? "—" : `${number(w.error_vs_baseline_pct, 1)}%`}</td>
        </tr>)}</tbody>
      </table></div>
    </details>
  </section>;
}
