"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import { datasets } from "@/lib/dashboardData";
import {
  REGION_PRESETS,
  type CaseBoardResponse,
  type RegionalVariableScanRow,
} from "@/lib/dataRetrievalEngine";
import {
  CUBE_LAYERS,
  scanRegionalCaseBoardSnapshot,
} from "@/lib/srsCubeAndScienceEngine";

function RegionalCaseBoardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    region,
    setLocation,
    setRegion,
    setBbox,
    setDataset,
    setStartYear,
    setEndYear,
    setAutoRunCase,
  } = useDashboard();

  const [primaryRegionName, setPrimaryRegionName] = useState(
    searchParams.get("region") || region || REGION_PRESETS[1].name,
  );
  const [primaryBbox, setPrimaryBbox] = useState<[number, number, number, number]>(() => {
    const raw = searchParams.get("bbox");
    if (raw) {
      const parts = raw.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
        return [parts[0], parts[1], parts[2], parts[3]];
      }
    }
    return REGION_PRESETS[1].bbox;
  });

  const [windowStart, setWindowStart] = useState(2001);
  const [windowEnd, setWindowEnd] = useState(2024);

  // Two-Region Comparison state (SRS P0 requirement)
  const [compareRegionName, setCompareRegionName] = useState(REGION_PRESETS[0].name);
  const [compareBbox, setCompareBbox] = useState<[number, number, number, number]>(
    REGION_PRESETS[0].bbox,
  );
  const [compareVariableId, setCompareVariableId] = useState("T2M");

  const [boardData, setBoardData] = useState<CaseBoardResponse>(() =>
    scanRegionalCaseBoardSnapshot({
      region_name: primaryRegionName,
      bbox: primaryBbox,
      start_year: 2001,
      end_year: 2024,
      compare_region_name: REGION_PRESETS[0].name,
      compare_bbox: REGION_PRESETS[0].bbox,
      compare_variable_id: "T2M",
    }),
  );
  const [loadingBoard, setLoadingBoard] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingBoard(true);
    const payload = {
      region_name: primaryRegionName,
      bbox: primaryBbox,
      start_year: windowStart,
      end_year: windowEnd,
      compare_region_name: compareRegionName,
      compare_bbox: compareBbox,
      compare_variable_id: compareVariableId,
    };

    fetch("/api/v1/cube/case-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CaseBoardResponse | null) => {
        if (!cancelled && data && data.scanned_variables) {
          setBoardData(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBoardData(scanRegionalCaseBoardSnapshot(payload));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBoard(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    primaryRegionName,
    primaryBbox,
    windowStart,
    windowEnd,
    compareRegionName,
    compareBbox,
    compareVariableId,
  ]);

  const handleOpenVariableInCaseFile = (row: RegionalVariableScanRow) => {
    setLocation(boardData.region_name);
    setRegion(boardData.region_name);
    setBbox(
      `${boardData.bbox[1].toFixed(2)}, ${boardData.bbox[0].toFixed(2)}, ${boardData.bbox[3].toFixed(2)}, ${boardData.bbox[2].toFixed(2)}`,
    );
    setStartYear(boardData.start_year);
    setEndYear(boardData.end_year);
    const matchedDs =
      datasets.find((d) => d.code === row.variable_id) ?? {
        id: row.variable_id.toLowerCase(),
        name: row.variable_name,
        code: row.variable_id,
        category: row.category,
        source: row.source_product,
        unit: row.unit,
        resolution: "0.5° × 0.625°",
        coverage: `${boardData.start_year}–${boardData.end_year}`,
        description: `Global Trend Cube verified variable (${row.source_product}).`,
      };
    setDataset(matchedDs);
    setAutoRunCase(true);
    router.push(
      `/workspace/visualize?region=${encodeURIComponent(boardData.region_name)}&variable=${encodeURIComponent(row.variable_id)}`,
    );
  };

  const comp = boardData.two_region_comparison;

  return (
    <div className="srs-case-board-page dashboard-page-inner">
      {/* 1. TOP REGION & WINDOW CONFIGURATION BAR */}
      <section className="dashboard-card srs-cb-header">
        <div className="dp-header-top">
          <div>
            <div className="dp-badges-row">
              <span className="dp-api-badge">
                <Icon name="layers" size={12} /> Regional Case Board · {boardData.cube_version}
              </span>
              <span className="dp-freq-badge">BH-FDR Controlled (α = {boardData.fdr_alpha})</span>
              <span className="dp-scope-badge">
                {boardData.scanned_variables.length} Analyzable ·{" "}
                {boardData.unavailable_variables.length} Excluded/Pending
              </span>
            </div>
            <h2 style={{ marginTop: "0.35rem" }}>
              Multi-Variable Regional Scan: {boardData.region_name}
            </h2>
            <p className="dp-dataset-subtitle">
              Simultaneously scans all Fixed Global Trend Cube variables for the selected region,
              reports Hamed–Rao p-values, BH-FDR q-values, Evidence Grades (A–D), and lists
              non-analyzable variables with explicit scientific reasons.
            </p>
          </div>

          <div className="dp-header-actions">
            <button
              className="dp-secondary-btn"
              onClick={() => router.push("/workspace/globe")}
              type="button"
            >
              <Icon name="globe" size={14} /> Return to Living Globe
            </button>
            <button
              className="dp-proceed-btn"
              onClick={() => {
                if (boardData.scanned_variables[0]) {
                  handleOpenVariableInCaseFile(boardData.scanned_variables[0]);
                }
              }}
              type="button"
            >
              Open Primary Signal in Case File <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>

        {/* Region Preset & Temporal Window Controls */}
        <div className="si-intent-meta-grid" style={{ marginTop: "1rem" }}>
          <div className="si-meta-box">
            <small>1. Primary Study Region (Region A)</small>
            <select
              aria-label="Select Primary Study Region"
              onChange={(e) => {
                const preset = REGION_PRESETS.find((r) => r.id === e.target.value);
                if (preset) {
                  setPrimaryRegionName(preset.name);
                  setPrimaryBbox(preset.bbox);
                }
              }}
              style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", marginTop: "0.35rem" }}
              value={
                REGION_PRESETS.find((r) => r.name === primaryRegionName)?.id ?? REGION_PRESETS[1].id
              }
            >
              {REGION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.subtitle})
                </option>
              ))}
            </select>
          </div>

          <div className="si-meta-box">
            <small>2. Analysis Window (Start & End Year)</small>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
              <input
                aria-label="Window Start Year"
                max={windowEnd - 5}
                min={1981}
                onChange={(e) => setWindowStart(Number(e.target.value))}
                style={{ flex: 1, padding: "0.4rem", borderRadius: "6px" }}
                type="number"
                value={windowStart}
              />
              <input
                aria-label="Window End Year"
                max={2025}
                min={windowStart + 5}
                onChange={(e) => setWindowEnd(Number(e.target.value))}
                style={{ flex: 1, padding: "0.4rem", borderRadius: "6px" }}
                type="number"
                value={windowEnd}
              />
            </div>
          </div>

          <div className="si-meta-box">
            <small>3. Comparison Region (Region B for Side-by-Side Test)</small>
            <select
              aria-label="Select Comparison Region B"
              onChange={(e) => {
                const preset = REGION_PRESETS.find((r) => r.id === e.target.value);
                if (preset) {
                  setCompareRegionName(preset.name);
                  setCompareBbox(preset.bbox);
                }
              }}
              style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", marginTop: "0.35rem" }}
              value={
                REGION_PRESETS.find((r) => r.name === compareRegionName)?.id ?? REGION_PRESETS[0].id
              }
            >
              {REGION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="si-meta-box">
            <small>4. Two-Region Comparison Variable</small>
            <select
              aria-label="Select Comparison Variable"
              onChange={(e) => setCompareVariableId(e.target.value)}
              style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", marginTop: "0.35rem" }}
              value={compareVariableId}
            >
              {CUBE_LAYERS.filter((l) => l.status !== "catalog_pending").map((l) => (
                <option key={l.variable_id} value={l.variable_id}>
                  {l.variable_name} ({l.variable_id} · {l.unit})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 2. REGION COVERAGE & LAND-OCEAN FRACTION KPI STRIP */}
      <section className="dp-kpi-grid" aria-label="Regional spatial coverage metrics">
        <article className="dp-kpi-card dashboard-card">
          <small>Region Footprint Area</small>
          <strong>
            {boardData.area_km2.toLocaleString()} <span>km²</span>
          </strong>
          <p>
            BBox: [{boardData.bbox.map((v) => `${v.toFixed(1)}°`).join(", ")}]
          </p>
        </article>

        <article className="dp-kpi-card dashboard-card">
          <small>0.5° Analysis Grid Cells</small>
          <strong>
            {boardData.grid_cells_count} <span>cells</span>
          </strong>
          <p>Area-weighted cos(lat) spatial reduction</p>
        </article>

        <article className="dp-kpi-card dashboard-card">
          <small>Land vs. Ocean Fraction</small>
          <strong>
            {boardData.land_fraction_pct}% <span>land</span>
          </strong>
          <p>{boardData.ocean_fraction_pct}% marine / coastal fraction</p>
        </article>

        <article className="dp-kpi-card dashboard-card">
          <small>Mean Valid-Month Coverage</small>
          <strong>
            {boardData.mean_coverage_pct}% <span>valid</span>
          </strong>
          <p>Across {boardData.scanned_variables.length} analyzable cube layers</p>
        </article>

        <article className="dp-kpi-card dashboard-card">
          <small>BH-FDR Significant Signals</small>
          <strong className="pos">
            {boardData.scanned_variables.filter((v) => v.significant_fdr).length} of{" "}
            {boardData.scanned_variables.length} <span>layers</span>
          </strong>
          <p>Pass q &lt; {boardData.fdr_alpha} False Discovery Rate gate</p>
        </article>
      </section>

      {/* 3. SCANNED ANALYZABLE CUBE VARIABLES TABLE */}
      <section className="dashboard-card dp-table-panel">
        <div className="dp-table-toolbar">
          <div>
            <span className="section-kicker">
              <span>01</span> Analyzable Global Trend Cube Variables ({boardData.scanned_variables.length})
            </span>
            <h3>
              Simultaneous Multi-Variable Trend Scan ({boardData.start_year}–{boardData.end_year})
            </h3>
          </div>
          {loadingBoard && <span className="dp-syncing-tag">Scanning Regional Cube…</span>}
        </div>

        <div className="dashboard-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Variable & Sphere</th>
                <th>Sen&apos;s Slope (95% CI)</th>
                <th>Hamed–Rao p</th>
                <th>BH-FDR q</th>
                <th>Evidence Grade</th>
                <th>Coverage</th>
                <th>Primary Caveat & Source</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {boardData.scanned_variables.map((row) => (
                <tr key={row.layer_id}>
                  <td>
                    <strong>{row.variable_name}</strong>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                      <code>{row.variable_id}</code> · {row.category}
                    </div>
                  </td>
                  <td>
                    <strong className={(row.decadal_slope ?? 0) >= 0 ? "pos" : "neg"}>
                      {(row.decadal_slope ?? 0) >= 0 ? "+" : ""}
                      {row.decadal_slope} {row.unit}/dec
                    </strong>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                      [{row.ci_low}, {row.ci_high}]
                    </div>
                  </td>
                  <td>
                    <code>{row.mk_p_value?.toFixed(4)}</code>
                  </td>
                  <td>
                    <span className={`quality-badge ${row.significant_fdr ? "valid" : "flagged"}`}>
                      q = {row.fdr_q_value?.toFixed(4)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`srs-grade-badge grade-${row.evidence_grade ?? "C"}`}
                      title={row.grade_reason}
                    >
                      Grade {row.evidence_grade}
                    </span>
                  </td>
                  <td>{row.valid_coverage_pct}%</td>
                  <td style={{ maxWidth: "280px", fontSize: "11.5px" }}>
                    <div>{row.caveats[0]}</div>
                    <a
                      href={row.citation_doi}
                      rel="noreferrer"
                      style={{ color: "var(--green)", fontWeight: 600 }}
                      target="_blank"
                    >
                      {row.source_product} ↗
                    </a>
                  </td>
                  <td>
                    <button
                      className="dp-proceed-btn"
                      onClick={() => handleOpenVariableInCaseFile(row)}
                      style={{ padding: "6px 10px", fontSize: "11px" }}
                      type="button"
                    >
                      Open Case File <Icon name="arrow" size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. UNAVAILABLE / NOT ANALYZABLE VARIABLES WITH EXPLICIT SCIENTIFIC REASONS */}
      <section className="dashboard-card dp-table-panel">
        <span className="section-kicker">
          <span>02</span> Unavailable or Excluded Variables ({boardData.unavailable_variables.length})
        </span>
        <h3 style={{ margin: "4px 0 12px" }}>
          Variables Not Analyzable for {boardData.region_name} (Explicit SRS Exclusion Log)
        </h3>
        <div className="srs-unavail-grid">
          {boardData.unavailable_variables.map((item) => (
            <article className="srs-unavail-card" key={item.layer_id}>
              <div className="srs-unavail-top">
                <strong>
                  {item.variable_name} <code>({item.variable_id})</code>
                </strong>
                <span className="quality-badge missing">Not Analyzable</span>
              </div>
              <p>{item.unavailable_reason}</p>
              <small>
                Source: {item.source_product} · Gate: {item.grade_reason}
              </small>
            </article>
          ))}
        </div>
      </section>

      {/* 5. TWO-REGION SIDE-BY-SIDE COMPARISON WORKBENCH (SRS P0) */}
      {comp && (
        <section className="dashboard-card srs-two-region-card">
          <div className="dp-table-toolbar">
            <div>
              <span className="section-kicker">
                <span>03</span> Two-Region Side-by-Side Comparison (Same Variable & Window)
              </span>
              <h3>
                {comp.variable_name} ({comp.variable_id}) · {comp.window}
              </h3>
            </div>
            <span className="dp-freq-badge">{comp.concordance_label}</span>
          </div>

          <div className="srs-compare-columns">
            {/* Region A */}
            <article className="srs-compare-box">
              <div className="srs-compare-box-head">
                <div>
                  <small>Region A (Primary Focus)</small>
                  <h4>{comp.region_a_name}</h4>
                </div>
                <span className={`srs-grade-badge grade-${comp.region_a_grade}`}>
                  Grade {comp.region_a_grade}
                </span>
              </div>
              <div className="srs-compare-metrics">
                <div>
                  <small>Sen&apos;s Slope</small>
                  <strong>
                    {comp.region_a_slope >= 0 ? "+" : ""}
                    {comp.region_a_slope} {comp.unit}/dec
                  </strong>
                </div>
                <div>
                  <small>95% CI</small>
                  <strong>
                    [{comp.region_a_ci[0]}, {comp.region_a_ci[1]}]
                  </strong>
                </div>
                <div>
                  <small>Hamed–Rao p</small>
                  <strong>{comp.region_a_p.toFixed(4)}</strong>
                </div>
              </div>
              <p className="srs-bbox-note">
                Footprint BBox: [{comp.region_a_bbox.map((v) => `${v.toFixed(1)}°`).join(", ")}]
              </p>
            </article>

            {/* Slope Difference Center Card */}
            <article className="srs-compare-diff-box">
              <small>Trend Difference (Δβ = Region A − Region B)</small>
              <strong>
                {comp.slope_difference >= 0 ? "+" : ""}
                {comp.slope_difference} {comp.unit}/dec
              </strong>
              <span>
                95% Difference CI: [{comp.difference_ci[0]}, {comp.difference_ci[1]}] {comp.unit}/dec
              </span>
              <p>{comp.concordance_label}</p>
            </article>

            {/* Region B */}
            <article className="srs-compare-box">
              <div className="srs-compare-box-head">
                <div>
                  <small>Region B (Comparison Target)</small>
                  <h4>{comp.region_b_name}</h4>
                </div>
                <span className={`srs-grade-badge grade-${comp.region_b_grade}`}>
                  Grade {comp.region_b_grade}
                </span>
              </div>
              <div className="srs-compare-metrics">
                <div>
                  <small>Sen&apos;s Slope</small>
                  <strong>
                    {comp.region_b_slope >= 0 ? "+" : ""}
                    {comp.region_b_slope} {comp.unit}/dec
                  </strong>
                </div>
                <div>
                  <small>95% CI</small>
                  <strong>
                    [{comp.region_b_ci[0]}, {comp.region_b_ci[1]}]
                  </strong>
                </div>
                <div>
                  <small>Hamed–Rao p</small>
                  <strong>{comp.region_b_p.toFixed(4)}</strong>
                </div>
              </div>
              <p className="srs-bbox-note">
                Footprint BBox: [{comp.region_b_bbox.map((v) => `${v.toFixed(1)}°`).join(", ")}]
              </p>
            </article>
          </div>

          <div className="srs-non-causal-banner" role="note">
            <Icon name="info" size={16} />
            <p>{comp.non_causal_disclosure}</p>
          </div>
        </section>
      )}
    </div>
  );
}

export default function RegionalCaseBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-page-inner">
          <section className="dashboard-card" style={{ padding: "2rem" }}>
            <h2>Loading Regional Case Board…</h2>
          </section>
        </div>
      }
    >
      <RegionalCaseBoardInner />
    </Suspense>
  );
}
