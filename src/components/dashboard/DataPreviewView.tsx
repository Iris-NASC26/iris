"use client";

import { useEffect, useId, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import {
  type JobStatusResponse,
  type ObservationRow,
  type PreviewResponse,
} from "@/lib/dataRetrievalEngine";

const IrisMap = dynamic(
  () => import("@/components/map/IrisMap").then((module) => module.IrisMap),
  { ssr: false },
);

export function DataPreviewView({ routeJobId }: { routeJobId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chartGradId = useId();
  const {
    extractionConfig,
    extractedPreview,
    setExtractedPreview,
    setAutoRunCase,
  } = useDashboard();

  const effectiveJobId = routeJobId || searchParams.get("jobId") || extractedPreview?.job_id || "";

  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [showRolling, setShowRolling] = useState(true);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [zoomEndPct, setZoomEndPct] = useState(100);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Table search, filter, sort & pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [qaFilter, setQaFilter] = useState<"ALL" | "Valid" | "Flagged" | "Missing">("ALL");
  const [sortField, setSortField] = useState<"timestamp" | "value">("timestamp");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Fetch real time-series preview from backend (never synthesize dummy series)
  useEffect(() => {
    let cancelled = false;

    const loadJobData = async () => {
      if (extractedPreview && (!effectiveJobId || extractedPreview.job_id === effectiveJobId)) {
        return;
      }

      setLoadingPreview(true);
      setPreviewError("");
      try {
        if (effectiveJobId) {
          const statusRes = await fetch(`/api/v1/timeseries/jobs/${encodeURIComponent(effectiveJobId)}/status`);
          if (statusRes.ok && !cancelled) {
            setJobStatus((await statusRes.json()) as JobStatusResponse);
          }
          const prevRes = await fetch(
            `/api/v1/timeseries/jobs/${encodeURIComponent(effectiveJobId)}/preview?page=1&page_size=500`,
          );
          if (prevRes.ok && !cancelled) {
            const data = (await prevRes.json()) as PreviewResponse;
            setExtractedPreview(data);
            setLoadingPreview(false);
            return;
          }
        }

        const res = await fetch("/api/v1/timeseries/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(extractionConfig),
        });
        const data = await res.json();
        if (res.ok && !cancelled) {
          setExtractedPreview(data as PreviewResponse);
        } else if (!cancelled) {
          setPreviewError(data?.error || data?.detail || "Upstream NASA time-series extraction failed.");
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewError(`Could not reach backend for live time-series extraction: ${String(err)}`);
        }
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    loadJobData();
    return () => {
      cancelled = true;
    };
  }, [effectiveJobId, extractedPreview, extractionConfig, setExtractedPreview]);

  if (!extractedPreview) {
    return (
      <div className="data-preview-page dashboard-page-inner">
        <section className="dashboard-card" style={{ padding: "2rem" }}>
          <span className="section-kicker">
            <span>01</span> Live NASA Time-Series Extraction
          </span>
          <h2 style={{ marginTop: "0.5rem" }}>
            {loadingPreview
              ? `Fetching live time-series observations from ${extractionConfig.source_api}…`
              : "Live Time-Series Preview Unavailable"}
          </h2>
          {previewError && (
            <p className="si-error-msg" role="alert" style={{ marginTop: "0.75rem" }}>
              <Icon name="alert" size={15} /> {previewError}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button
              className="dp-secondary-btn"
              onClick={() => router.push("/workspace/intelligence")}
              type="button"
            >
              Return to SI Chat Assistant
            </button>
            <button
              className="dp-proceed-btn"
              onClick={() => router.push("/workspace/data-selection")}
              type="button"
            >
              Adjust Dataset & Parameters <Icon name="arrow" size={14} />
            </button>
          </div>
        </section>
      </div>
    );
  }

  const preview = extractedPreview;

  const { product, extraction_config: cfg, summary_stats: stats, chart_series: series } = preview;
  const coverageGeoJSON = useMemo(() => {
    const [minLon, minLat, maxLon, maxLat] =
      cfg.spatial_level === "global" ? [-170, -75, 170, 75] : cfg.bbox;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ]],
      },
    };
  }, [cfg.bbox, cfg.spatial_level]);

  const visibleSeries = useMemo(() => {
    const count = Math.max(12, Math.round((series.length * zoomEndPct) / 100));
    return series.slice(0, count);
  }, [series, zoomEndPct]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = series.filter((row) => {
      if (qaFilter !== "ALL" && row.qa_flag !== qaFilter) return false;
      if (!q) return true;
      return (
        row.timestamp.toLowerCase().includes(q) ||
        String(row.value ?? "missing").toLowerCase().includes(q) ||
        row.qa_flag.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortField === "timestamp") {
        return sortAsc
          ? a.timestamp.localeCompare(b.timestamp)
          : b.timestamp.localeCompare(a.timestamp);
      }
      const va = a.value ?? -999999;
      const vb = b.value ?? -999999;
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [qaFilter, searchQuery, series, sortAsc, sortField]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows]);

  const downloadFile = (format: "csv" | "json") => {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(preview, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iris-${product.variable_id}-${cfg.start_date}-${cfg.end_date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const header = "timestamp_utc,value,rolling_avg,anomaly_z,unit,variable_id,qa_flag,source_api\n";
    const body = series
      .map(
        (r) =>
          `${r.timestamp},${r.value ?? ""},${r.rolling_avg ?? ""},${r.anomaly_z ?? ""},${r.unit},${r.variable_id},${r.qa_flag},"${product.source_api}"`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iris-${product.variable_id}-${cfg.start_date}-${cfg.end_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProceedToAnalysis = () => {
    setAutoRunCase(true);
    router.push(`/workspace/visualize?jobId=${encodeURIComponent(preview.job_id)}`);
  };

  return (
    <div className="data-preview-page dashboard-page-inner">
      {/* 1. STEPPED EXTRACTION PIPELINE STATUS TRACKER */}
      <section className="dp-pipeline-banner dashboard-card">
        <div className="dp-pipeline-steps">
          {(
            jobStatus?.steps ?? [
              { step: 1, label: `Request Routed to ${product.source_api}`, status: "completed" },
              { step: 2, label: "Spatial Subsetting & QA Masking", status: "completed" },
              {
                step: 3,
                label: `Temporal Resampling (${cfg.target_frequency} · ${cfg.temporal_aggregation})`,
                status: "completed",
              },
              { step: 4, label: "Validated & Ready for Preview", status: "completed" },
            ]
          ).map((s) => (
            <div className={`dp-step-pill ${s.status}`} key={s.step}>
              <span>
                <Icon name="check" size={12} />
              </span>
              <strong>
                {s.step}. {s.label}
              </strong>
            </div>
          ))}
        </div>
        {loadingPreview && <span className="dp-syncing-tag">Syncing upstream observations…</span>}
      </section>

      {/* 2. TOP HEADER, PROVENANCE ("WHERE IT IS FROM" & "WHAT IT IS") & ACTION BAR */}
      <section className="dp-header-card dashboard-card">
        <div className="dp-header-top">
          <div>
            <div className="dp-badges-row">
              <span className="dp-api-badge">
                <Icon name="globe" size={12} /> {product.source_api}
              </span>
              <span className="dp-freq-badge">{cfg.target_frequency} Series</span>
              <span className="dp-scope-badge">
                {cfg.spatial_level === "global" ? "Global Grid" : `Regional · ${cfg.region_name}`}
              </span>
              <code>Job ID: {preview.job_id}</code>
              {preview.result_id && <code>Result ID: {preview.result_id}</code>}
              {preview.sha256_hash && <code>SHA-256: {preview.sha256_hash.slice(0, 12)}…</code>}
            </div>
            <h2>
              {product.variable_name} <code>({product.variable_id})</code>
            </h2>
            <p className="dp-dataset-subtitle">{product.title}</p>
          </div>

          <div className="dp-header-actions">
            <button
              className="dp-secondary-btn"
              onClick={() => router.push("/workspace/data-selection")}
              type="button"
            >
              Adjust Parameters
            </button>
            <button className="dp-export-btn" onClick={() => downloadFile("csv")} type="button">
              <Icon name="download" size={14} /> Export CSV
            </button>
            <button className="dp-export-btn" onClick={() => downloadFile("json")} type="button">
              <Icon name="download" size={14} /> Export JSON
            </button>
            <button className="dp-proceed-btn" onClick={handleProceedToAnalysis} type="button">
              Proceed to Analysis <Icon name="arrow" size={15} />
            </button>
          </div>
        </div>

        {/* Explicit Provenance & Scientific Explanation Strip */}
        <div className="dp-provenance-strip">
          <div>
            <small>Where the data is from (Originating Archive & Instrument)</small>
            <strong>
              {product.provider_agency} — {product.mission_or_instrument}
            </strong>
          </div>
          <div>
            <small>What exactly it is (Scientific Measurement)</small>
            <strong>{product.what_it_measures}</strong>
          </div>
          <div>
            <small>SRS v1.0 Provenance & Spatial Semantics</small>
            <strong>
              Mode: {preview.provenance_mode || "live_upstream"} ·{" "}
              {preview.spatial_semantics_applied || "point_exact"}
            </strong>
          </div>
        </div>
        {preview.secondary_jobs && preview.secondary_jobs.length > 0 && (
          <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <small style={{ fontWeight: 700 }}>Independent Comparison Product Jobs:</small>
            {preview.secondary_jobs.map((sj) => (
              <span
                className={`quality-badge ${sj.status === "completed" ? "valid" : "missing"}`}
                key={`${sj.product_id}-${sj.variable_id}`}
              >
                {sj.product_id} ({sj.variable_id}): {sj.status} — {sj.message}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 3. SUMMARY STATISTICS & DATA QUALITY STRIP (KPI CARDS) */}
      <section className="dp-kpi-grid" aria-label="Summary statistics and data quality">
        <article className="dp-kpi-card dashboard-card">
          <small>Total Observations</small>
          <strong>
            {stats.count} <span>{cfg.target_frequency.toLowerCase()} steps</span>
          </strong>
          <p>
            Window: {cfg.start_date} → {cfg.end_date}
          </p>
        </article>

        <article className="dp-kpi-card dashboard-card">
          <small>Data Completeness & QA</small>
          <strong>
            {stats.completeness_pct}% <span>valid</span>
          </strong>
          <p className={stats.missing_warning ? "warn" : "good"}>
            {stats.valid_count} valid · {stats.flagged_count} flagged · {stats.missing_count} missing
            {stats.missing_warning ? " (Interpolation recommended)" : " (High quality record)"}
          </p>
        </article>

        <article className="dp-kpi-card dashboard-card">
          <small>Mean ± Std Deviation</small>
          <strong>
            {stats.mean} ± {stats.std_dev} <span>{stats.unit}</span>
          </strong>
          <p>
            Median: {stats.median} {stats.unit} ({cfg.spatial_reduction.toUpperCase()} reduction)
          </p>
        </article>

        <article className="dp-kpi-card dashboard-card">
          <small>Observed Min / Max Range</small>
          <strong>
            {stats.min_val} to {stats.max_val} <span>{stats.unit}</span>
          </strong>
          <p>
            Min on {stats.min_date} · Peak on {stats.max_date}
          </p>
        </article>

        <article className="dp-kpi-card dashboard-card">
          <small>Preliminary Decadal Trend</small>
          <strong className={stats.decadal_slope >= 0 ? "pos" : "neg"}>
            {stats.decadal_slope >= 0 ? `+${stats.decadal_slope}` : stats.decadal_slope}{" "}
            <span>{stats.unit}/dec</span>
          </strong>
          <p>Ready for STL & Mann–Kendall testing</p>
        </article>
      </section>

      {/* 4. MAIN VISUALIZATION PANEL (INTERACTIVE GAP-AWARE TIME-SERIES CHART) */}
      <section className="dp-chart-card dashboard-card">
        <div className="dp-chart-toolbar">
          <div>
            <span className="section-kicker">
              <span>02</span> Gap-Aware Time-Series Inspection Chart
            </span>
            <h3>
              {product.variable_name} ({stats.unit}) — {cfg.region_name}
            </h3>
          </div>

          <div className="dp-chart-toggles">
            <label className="dp-toggle-pill">
              <input
                checked={showRolling}
                onChange={(e) => setShowRolling(e.target.checked)}
                type="checkbox"
              />
              <span>Rolling Average Trendline</span>
            </label>
            <label className="dp-toggle-pill">
              <input
                checked={showAnomalies}
                onChange={(e) => setShowAnomalies(e.target.checked)}
                type="checkbox"
              />
              <span>Highlight Extreme Anomalies (|Z| ≥ 2.1)</span>
            </label>
            <div className="dp-zoom-control">
              <small>Zoom Window ({visibleSeries.length} pts):</small>
              <input
                aria-label="Zoom time series window"
                max={100}
                min={20}
                onChange={(e) => setZoomEndPct(Number(e.target.value))}
                type="range"
                value={zoomEndPct}
              />
            </div>
          </div>
        </div>

        <GapAwareTimeSeriesChart
          gradId={chartGradId}
          hoveredIdx={hoveredIdx}
          onHover={setHoveredIdx}
          series={visibleSeries}
          showAnomalies={showAnomalies}
          showRolling={showRolling}
          unit={stats.unit}
        />

        <div className="dp-chart-legend">
          <span>
            <i className="dot-obs" /> Observed {product.variable_id} ({stats.unit})
          </span>
          {showRolling && (
            <span>
              <i className="line-roll" /> Rolling Mean Trendline
            </span>
          )}
          {showAnomalies && (
            <span>
              <i className="dot-flag" /> Flagged Extreme Anomaly (|Z| ≥ 2.1)
            </span>
          )}
          <span>
            <i className="band-gap" /> Shaded Missing-Data Interval (Sensor/Cloud Gap)
          </span>
        </div>
      </section>

      {/* 5. BOTTOM SPLIT VIEW: SPATIAL FOOTPRINT CONFIRMATION (32%) & PAGINATED DATA TABLE (68%) */}
      <div className="dp-bottom-split">
        <aside className="dp-spatial-confirm dashboard-card">
          <span className="section-kicker">
            <span>03</span> Spatial Footprint & API Provenance
          </span>
          <h3>{cfg.region_name}</h3>

          <div className="dp-mini-map-wrap">
            <IrisMap
              bbox={cfg.spatial_level === "global" ? [-170, -75, 170, 75] : cfg.bbox}
              coverageGeoJSON={coverageGeoJSON}
              height="220px"
              mode="preview"
            />
          </div>

          <dl className="dp-meta-list">
            <div>
              <dt>Bounding Box (WGS84)</dt>
              <dd>[{cfg.bbox.map((v) => `${v.toFixed(2)}°`).join(", ")}]</dd>
            </div>
            <div>
              <dt>Spatial & Temporal Aggregation</dt>
              <dd>
                Spatial {cfg.spatial_reduction.toUpperCase()} · {cfg.target_frequency} (
                {cfg.temporal_aggregation.toUpperCase()})
              </dd>
            </div>
            <div>
              <dt>Originating Agency & Archive</dt>
              <dd>{product.provider_agency}</dd>
            </div>
            <div>
              <dt>Upstream REST Endpoint Queried</dt>
              <dd>
                <code className="dp-endpoint-code">{preview.api_endpoint_called}</code>
              </dd>
            </div>
          </dl>

          <a className="dp-doi-link" href={product.citation_doi} rel="noreferrer" target="_blank">
            View Official Dataset DOI & Citation <Icon name="external" size={12} />
          </a>
        </aside>

        <section className="dp-table-panel dashboard-card">
          <div className="dp-table-toolbar">
            <div>
              <span className="section-kicker">
                <span>04</span> Standardized Tabular Observation Record
              </span>
              <h3>
                Raw Time-Series Observations ({filteredRows.length} of {series.length} rows)
              </h3>
            </div>

            <div className="dp-table-controls">
              <div className="dp-qa-filter-pills">
                {(["ALL", "Valid", "Flagged", "Missing"] as const).map((status) => (
                  <button
                    className={qaFilter === status ? "active" : ""}
                    key={status}
                    onClick={() => {
                      setQaFilter(status);
                      setCurrentPage(1);
                    }}
                    type="button"
                  >
                    {status}
                  </button>
                ))}
              </div>
              <label className="dp-table-search">
                <Icon name="search" size={14} />
                <input
                  aria-label="Filter observation rows"
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search date, value, or QA…"
                  value={searchQuery}
                />
              </label>
            </div>
          </div>

          <div className="dashboard-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <button
                      className="dp-sort-th"
                      onClick={() => {
                        if (sortField === "timestamp") setSortAsc((v) => !v);
                        else {
                          setSortField("timestamp");
                          setSortAsc(true);
                        }
                      }}
                      type="button"
                    >
                      Timestamp (UTC) {sortField === "timestamp" ? (sortAsc ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th>
                    <button
                      className="dp-sort-th"
                      onClick={() => {
                        if (sortField === "value") setSortAsc((v) => !v);
                        else {
                          setSortField("value");
                          setSortAsc(false);
                        }
                      }}
                      type="button"
                    >
                      Observed Value ({stats.unit}) {sortField === "value" ? (sortAsc ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th>Rolling Mean</th>
                  <th>Anomaly Z-Score</th>
                  <th>Variable</th>
                  <th>Quality Flag</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr key={row.timestamp}>
                    <td>
                      <code>{row.timestamp}</code>
                    </td>
                    <td>
                      <strong>{row.value !== null ? row.value : "NULL (Gap)"}</strong>
                    </td>
                    <td>{row.rolling_avg !== null ? row.rolling_avg : "—"}</td>
                    <td>
                      {row.anomaly_z !== null
                        ? `${row.anomaly_z >= 0 ? "+" : ""}${row.anomaly_z}σ`
                        : "—"}
                    </td>
                    <td>
                      <code>{row.variable_id}</code>
                    </td>
                    <td>
                      <span className={`quality-badge ${row.qa_flag.toLowerCase()}`}>
                        {row.qa_flag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dp-pagination-bar">
            <span>
              Showing page <b>{currentPage}</b> of <b>{totalPages}</b> ({filteredRows.length} total
              observations)
            </span>
            <div className="dp-page-btns">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                ← Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                type="button"
              >
                Next →
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function GapAwareTimeSeriesChart({
  series,
  unit,
  showRolling,
  showAnomalies,
  hoveredIdx,
  onHover,
  gradId,
}: {
  series: ObservationRow[];
  unit: string;
  showRolling: boolean;
  showAnomalies: boolean;
  hoveredIdx: number | null;
  onHover: (idx: number | null) => void;
  gradId: string;
}) {
  const width = 920;
  const height = 260;
  const padLeft = 58;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const { minVal, maxVal } = useMemo(() => {
    const vals = series.map((r) => r.value).filter((v): v is number => v !== null);
    if (vals.length === 0) return { minVal: 0, maxVal: 100 };
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const span = Math.max(0.01, mx - mn);
    return { minVal: mn - span * 0.1, maxVal: mx + span * 0.1 };
  }, [series]);

  const xFor = (i: number) =>
    padLeft + (i / Math.max(1, series.length - 1)) * plotW;
  const yFor = (val: number) =>
    padTop + plotH - ((val - minVal) / Math.max(1e-6, maxVal - minVal)) * plotH;

  const segments = useMemo(() => {
    const segs: string[][] = [];
    let current: string[] = [];
    series.forEach((row, i) => {
      if (row.value === null) {
        if (current.length > 0) {
          segs.push(current);
          current = [];
        }
      } else {
        current.push(`${xFor(i).toFixed(1)},${yFor(row.value).toFixed(1)}`);
      }
    });
    if (current.length > 0) segs.push(current);
    return segs;
  }, [series, minVal, maxVal]);

  const rollingPoints = useMemo(() => {
    return series
      .map((row, i) =>
        row.rolling_avg !== null ? `${xFor(i).toFixed(1)},${yFor(row.rolling_avg).toFixed(1)}` : null,
      )
      .filter((p): p is string => p !== null)
      .join(" ");
  }, [series, minVal, maxVal]);

  const hoveredRow = hoveredIdx !== null ? series[hoveredIdx] : null;

  return (
    <div className="dp-chart-svg-wrap">
      <svg
        aria-label="Interactive time-series preview chart with missing data gap highlighting"
        onMouseLeave={() => onHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * width - padLeft;
          const idx = Math.round((relX / plotW) * (series.length - 1));
          if (idx >= 0 && idx < series.length) onHover(idx);
        }}
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padTop + plotH * (1 - frac);
          const v = minVal + (maxVal - minVal) * frac;
          return (
            <g key={frac}>
              <line
                stroke="var(--border)"
                strokeDasharray="3 3"
                strokeWidth="1"
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
              />
              <text fill="var(--faint)" fontSize="9.5" textAnchor="end" x={padLeft - 8} y={y + 3}>
                {v.toFixed(2)}
              </text>
            </g>
          );
        })}

        {series.map((row, i) => {
          if (row.value !== null) return null;
          const stepW = Math.max(8, plotW / Math.max(10, series.length));
          return (
            <g key={`gap-${row.timestamp}`}>
              <rect
                fill="#dc2626"
                fillOpacity="0.14"
                height={plotH}
                stroke="#dc2626"
                strokeDasharray="2 2"
                strokeWidth="0.8"
                width={stepW}
                x={xFor(i) - stepW / 2}
                y={padTop}
              />
            </g>
          );
        })}

        {segments.map((seg, idx) => {
          if (seg.length < 2) return null;
          const firstX = seg[0].split(",")[0];
          const lastX = seg[seg.length - 1].split(",")[0];
          const areaPts = `${firstX},${padTop + plotH} ${seg.join(" ")} ${lastX},${padTop + plotH}`;
          return (
            <g key={`seg-${idx}`}>
              <polygon fill={`url(#${gradId})`} points={areaPts} />
              <polyline
                fill="none"
                points={seg.join(" ")}
                stroke="#059669"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.1"
              />
            </g>
          );
        })}

        {showRolling && rollingPoints && (
          <polyline
            fill="none"
            points={rollingPoints}
            stroke="#0284c7"
            strokeDasharray="5 3"
            strokeWidth="2"
          />
        )}

        {showAnomalies &&
          series.map((row, i) => {
            if (row.value === null || row.qa_flag !== "Flagged") return null;
            return (
              <circle
                cx={xFor(i)}
                cy={yFor(row.value)}
                fill="#d97706"
                key={`anom-${row.timestamp}`}
                r="4.2"
                stroke="#fff"
                strokeWidth="1.5"
              />
            );
          })}

        {hoveredIdx !== null && hoveredRow && (
          <g>
            <line
              stroke="var(--text)"
              strokeDasharray="2 2"
              strokeWidth="1"
              x1={xFor(hoveredIdx)}
              x2={xFor(hoveredIdx)}
              y1={padTop}
              y2={padTop + plotH}
            />
            {hoveredRow.value !== null && (
              <circle
                cx={xFor(hoveredIdx)}
                cy={yFor(hoveredRow.value)}
                fill="#059669"
                r="5"
                stroke="#fff"
                strokeWidth="2"
              />
            )}
          </g>
        )}

        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const idx = Math.min(series.length - 1, Math.round(frac * (series.length - 1)));
          const row = series[idx];
          if (!row) return null;
          return (
            <text
              fill="var(--faint)"
              fontSize="9.5"
              key={`x-${idx}`}
              textAnchor="middle"
              x={xFor(idx)}
              y={height - 10}
            >
              {row.timestamp}
            </text>
          );
        })}
      </svg>

      {hoveredRow && (
        <div className="dp-chart-tooltip">
          <strong>{hoveredRow.timestamp}</strong>
          <span>
            Value:{" "}
            <b>
              {hoveredRow.value !== null ? `${hoveredRow.value} ${unit}` : "MISSING (Sensor Gap)"}
            </b>
          </span>
          {hoveredRow.rolling_avg !== null && (
            <span>
              Rolling Mean: <b>{hoveredRow.rolling_avg} {unit}</b>
            </span>
          )}
          <span className={`quality-badge ${hoveredRow.qa_flag.toLowerCase()}`}>
            {hoveredRow.qa_flag}
          </span>
        </div>
      )}
    </div>
  );
}
