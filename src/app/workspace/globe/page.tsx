"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import {
  type CubeCellRecord,
  type GlobeCubeResponse,
} from "@/lib/dataRetrievalEngine";
import { getGlobeCubeSnapshot } from "@/lib/srsCubeAndScienceEngine";

export default function LivingGlobePage() {
  const router = useRouter();
  const { setLocation, setRegion, setBbox, setStartYear, setEndYear, setAutoRunCase } =
    useDashboard();

  const [selectedLayerId, setSelectedLayerId] = useState("cube_t2m");
  const [analysisWindow, setAnalysisWindow] = useState("1981-2025");
  const [cubeData, setCubeData] = useState<GlobeCubeResponse>(() =>
    getGlobeCubeSnapshot("cube_t2m", "1981-2025"),
  );
  const [loadingCube, setLoadingCube] = useState(false);

  // Globe / 2D fallback & visual channel controls per SRS v1.0
  const [viewMode, setViewMode] = useState<"globe3d" | "map2d">("globe3d");
  const [rotationLon, setRotationLon] = useState(-25);
  const [rotationLat, setRotationLat] = useState(18);
  const [fdrFilterOnly, setFdrFilterOnly] = useState(false);
  const [showRelief, setShowRelief] = useState(true);
  const [showDipoleLens, setShowDipoleLens] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [timeLapseIdx, setTimeLapseIdx] = useState(3);
  const [isPlayingTimeLapse, setIsPlayingTimeLapse] = useState(false);

  const [selectedCellId, setSelectedCellId] = useState<string>("cell-la");

  // Fetch versioned Global Trend Cube data from backend or snapshot
  useEffect(() => {
    let cancelled = false;
    setLoadingCube(true);
    fetch(
      `/api/v1/cube/globe?layer_id=${encodeURIComponent(selectedLayerId)}&window=${encodeURIComponent(analysisWindow)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: GlobeCubeResponse | null) => {
        if (!cancelled && data && data.cells) {
          setCubeData(data);
          if (!data.cells.some((c) => c.cell_id === selectedCellId) && data.cells.length > 0) {
            setSelectedCellId(data.cells[0].cell_id);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCubeData(getGlobeCubeSnapshot(selectedLayerId, analysisWindow));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCube(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLayerId, analysisWindow, selectedCellId]);

  // Respect OS prefers-reduced-motion
  useEffect(() => {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setReducedMotion(true);
      }
    } catch {
      // Ignore matchMedia errors
    }
  }, []);

  // Time-lapse playback timer
  useEffect(() => {
    if (!isPlayingTimeLapse || reducedMotion) return;
    const id = window.setInterval(() => {
      setTimeLapseIdx((prev) => (prev + 1) % Math.max(1, cubeData.time_lapse_decades.length));
    }, 1800);
    return () => window.clearInterval(id);
  }, [isPlayingTimeLapse, reducedMotion, cubeData.time_lapse_decades.length]);

  const activeCell = useMemo<CubeCellRecord | undefined>(
    () => cubeData.cells.find((c) => c.cell_id === selectedCellId) ?? cubeData.cells[0],
    [cubeData.cells, selectedCellId],
  );

  const dipolePartnerCell = useMemo<CubeCellRecord | undefined>(() => {
    if (!activeCell?.opposite_dipole_region) return undefined;
    const target = activeCell.opposite_dipole_region.toLowerCase();
    return cubeData.cells.find(
      (c) =>
        c.cell_id !== activeCell.cell_id &&
        (c.region_label.toLowerCase().includes(target.slice(0, 12)) ||
          target.includes(c.region_label.toLowerCase().slice(0, 12))),
    );
  }, [activeCell, cubeData.cells]);

  const handleOpenCaseBoard = (cell: CubeCellRecord) => {
    const minLon = Number(Math.max(-180, cell.lon - 2.5).toFixed(2));
    const maxLon = Number(Math.min(180, cell.lon + 2.5).toFixed(2));
    const minLat = Number(Math.max(-90, cell.lat - 2.0).toFixed(2));
    const maxLat = Number(Math.min(90, cell.lat + 2.0).toFixed(2));
    setLocation(cell.region_label);
    setRegion(cell.region_label);
    setBbox(`${minLat}, ${minLon}, ${maxLat}, ${maxLon}`);
    router.push(
      `/workspace/case-board?region=${encodeURIComponent(cell.region_label)}&bbox=${encodeURIComponent(`${minLon},${minLat},${maxLon},${maxLat}`)}`,
    );
  };

  const handleOpenCaseFile = (cell: CubeCellRecord) => {
    setLocation(cell.region_label);
    setRegion(cell.region_label);
    setStartYear(2005);
    setEndYear(2025);
    setAutoRunCase(true);
    router.push(
      `/workspace/visualize?region=${encodeURIComponent(cell.region_label)}&variable=${encodeURIComponent(cubeData.active_layer.variable_id)}`,
    );
  };

  const activeTimeSlice =
    cubeData.time_lapse_decades[timeLapseIdx] ?? cubeData.time_lapse_decades[0];

  return (
    <div className="srs-globe-page dashboard-page-inner">
      {/* 1. CUBE MANIFEST & PROVENANCE HEADER BAR */}
      <section className="dashboard-card srs-cube-banner">
        <div className="srs-cube-banner-top">
          <div>
            <div className="dp-badges-row">
              <span className="dp-api-badge">
                <Icon name="globe" size={12} /> Global Trend Cube · {cubeData.cube_version}
              </span>
              <span className="dp-freq-badge">
                {cubeData.provenance_mode === "verified_cube_snapshot"
                  ? "Verified Cube Snapshot (Read-Only)"
                  : "Live Cached Cube"}
              </span>
              <span className="dp-scope-badge">
                {cubeData.active_layer.cube_grid_resolution}
              </span>
              <code>SHA-256: {cubeData.manifest_sha256.slice(0, 16)}…</code>
            </div>
            <h2 style={{ marginTop: "0.35rem" }}>
              Living Globe — {cubeData.active_layer.variable_name}{" "}
              <code>({cubeData.active_layer.variable_id})</code>
            </h2>
            <p className="dp-dataset-subtitle">
              {cubeData.active_layer.source_product} · Window:{" "}
              <strong>{cubeData.active_layer.temporal_window}</strong> ·{" "}
              {cubeData.method_summary}
            </p>
          </div>

          <div className="dp-header-actions">
            <button
              className={`dp-secondary-btn ${viewMode === "globe3d" ? "active-pill" : ""}`}
              onClick={() => setViewMode("globe3d")}
              type="button"
            >
              <Icon name="globe" size={14} /> 3D Orthographic Globe
            </button>
            <button
              className={`dp-secondary-btn ${viewMode === "map2d" ? "active-pill" : ""}`}
              onClick={() => setViewMode("map2d")}
              type="button"
            >
              <Icon name="layers" size={14} /> 2D Equirectangular Map
            </button>
            {activeCell && (
              <button
                className="dp-proceed-btn"
                onClick={() => handleOpenCaseBoard(activeCell)}
                type="button"
              >
                Scan Region in Case Board <Icon name="arrow" size={14} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. MAIN THREE-COLUMN GLOBE WORKSPACE */}
      <div className="srs-globe-grid">
        {/* LEFT COLUMN: CUBE LAYER SELECTOR & CHANNEL CONTROLS */}
        <aside className="dashboard-card srs-globe-sidebar">
          <span className="section-kicker">
            <span>01</span> Global Trend Cube Layers ({cubeData.available_layers.length})
          </span>
          <h3>Select Verified Cube Variable</h3>
          <p className="srs-helper-copy">
            Live catalog discovery is isolated in System Intelligence. Only scientifically verified
            layers enter the Global Trend Cube.
          </p>

          <div className="srs-layer-list" role="listbox" aria-label="Global Trend Cube Layers">
            {cubeData.available_layers.map((layer) => {
              const isSelected = layer.layer_id === cubeData.active_layer.layer_id;
              const isPending = layer.status === "catalog_pending";
              return (
                <button
                  aria-selected={isSelected}
                  className={`srs-layer-item ${isSelected ? "active" : ""} ${isPending ? "pending" : ""}`}
                  key={layer.layer_id}
                  onClick={() => setSelectedLayerId(layer.layer_id)}
                  type="button"
                >
                  <div className="srs-layer-item-top">
                    <strong>{layer.variable_name}</strong>
                    <code>{layer.variable_id}</code>
                  </div>
                  <div className="srs-layer-item-meta">
                    <span>{layer.category}</span>
                    <span>{layer.unit}/dec</span>
                    <span className={`srs-status-dot ${layer.status}`}>
                      {layer.status === "verified_release"
                        ? "Verified"
                        : layer.status === "snapshot_pinned"
                          ? "Pinned Snapshot"
                          : "Release v1.1"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="srs-channel-controls">
            <span className="section-kicker">
              <span>02</span> Visual Channels & Significance
            </span>
            <label className="srs-check-row">
              <input
                checked={fdrFilterOnly}
                onChange={(e) => setFdrFilterOnly(e.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>BH-FDR Significance Gate (q &lt; 0.05)</strong>
                <small>Dim non-significant cells that fail False Discovery Rate control</small>
              </span>
            </label>

            <label className="srs-check-row">
              <input
                checked={showDipoleLens}
                onChange={(e) => setShowDipoleLens(e.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>Opposite-Trends Teleconnection Lens</strong>
                <small>Connect selected region to its opposing seesaw dipole</small>
              </span>
            </label>

            <label className="srs-check-row">
              <input
                checked={showRelief}
                onChange={(e) => setShowRelief(e.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>Bathymetric & Topographic Relief</strong>
                <small>Render continental elevation & ocean basin contours</small>
              </span>
            </label>

            <label className="srs-check-row">
              <input
                checked={reducedMotion}
                onChange={(e) => {
                  setReducedMotion(e.target.checked);
                  if (e.target.checked) setIsPlayingTimeLapse(false);
                }}
                type="checkbox"
              />
              <span>
                <strong>Reduced Motion Mode</strong>
                <small>Disable auto-rotation and animated pulse rings</small>
              </span>
            </label>

            <div style={{ marginTop: "0.75rem" }}>
              <small style={{ fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                Analysis Window
              </small>
              <div className="ds-date-presets">
                {["1981-2025", "1995-2025", "2001-2024", "2005-2025"].map((w) => (
                  <button
                    className={analysisWindow === w ? "active-pill" : ""}
                    key={w}
                    onClick={() => setAnalysisWindow(w)}
                    type="button"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: INTERACTIVE 3D ORTHOGRAPHIC GLOBE / 2D MAP CANVAS */}
        <section className="dashboard-card srs-globe-stage">
          <div className="srs-globe-stage-head">
            <div>
              <span className="section-kicker">
                <span>03</span>{" "}
                {viewMode === "globe3d"
                  ? "Interactive 3D Orthographic Trend Sphere"
                  : "2D Equirectangular Global Trend Projection"}
              </span>
              <h3>
                {cubeData.active_layer.variable_name} ({cubeData.active_layer.unit} / decade) ·{" "}
                {cubeData.significant_cells_count} of {cubeData.total_cells} nodes pass BH-FDR (
                {cubeData.significant_area_pct}%)
              </h3>
            </div>
            {loadingCube && <span className="dp-syncing-tag">Updating Cube Layer…</span>}
          </div>

          {viewMode === "globe3d" && (
            <div className="srs-globe-rotation-bar">
              <label>
                <span>Longitude Rotation ({rotationLon}°)</span>
                <input
                  max={180}
                  min={-180}
                  onChange={(e) => setRotationLon(Number(e.target.value))}
                  type="range"
                  value={rotationLon}
                />
              </label>
              <label>
                <span>Latitude Tilt ({rotationLat}°)</span>
                <input
                  max={65}
                  min={-65}
                  onChange={(e) => setRotationLat(Number(e.target.value))}
                  type="range"
                  value={rotationLat}
                />
              </label>
              <div className="srs-quick-hemispheres">
                <button
                  onClick={() => {
                    setRotationLon(-100);
                    setRotationLat(25);
                  }}
                  type="button"
                >
                  Americas
                </button>
                <button
                  onClick={() => {
                    setRotationLon(15);
                    setRotationLat(22);
                  }}
                  type="button"
                >
                  Europe/Africa
                </button>
                <button
                  onClick={() => {
                    setRotationLon(82);
                    setRotationLat(18);
                  }}
                  type="button"
                >
                  Asia/Indian Ocean
                </button>
                <button
                  onClick={() => {
                    setRotationLon(0);
                    setRotationLat(75);
                  }}
                  type="button"
                >
                  Arctic
                </button>
              </div>
            </div>
          )}

          {/* SVG Orthographic 3D Globe or 2D Equirectangular Canvas */}
          <div className="srs-globe-canvas-wrap">
            {viewMode === "globe3d" ? (
              <OrthographicGlobeSvg
                activeCell={activeCell}
                cells={cubeData.cells}
                dipolePartner={dipolePartnerCell}
                fdrFilterOnly={fdrFilterOnly}
                onSelectCell={(c) => setSelectedCellId(c.cell_id)}
                reducedMotion={reducedMotion}
                rotationLat={rotationLat}
                rotationLon={rotationLon}
                showDipoleLens={showDipoleLens}
                showRelief={showRelief}
                unit={cubeData.active_layer.unit}
              />
            ) : (
              <EquirectangularMapSvg
                activeCell={activeCell}
                cells={cubeData.cells}
                dipolePartner={dipolePartnerCell}
                fdrFilterOnly={fdrFilterOnly}
                onSelectCell={(c) => setSelectedCellId(c.cell_id)}
                showDipoleLens={showDipoleLens}
                showRelief={showRelief}
                unit={cubeData.active_layer.unit}
              />
            )}
          </div>

          {/* Color Scale, FDR Stipple & Method Legend */}
          <div className="srs-globe-legend-bar">
            <div className="srs-diverging-scale">
              <span>Strong Decreasing (−)</span>
              <i className="srs-scale-gradient" />
              <span>Neutral (0)</span>
              <i className="srs-scale-gradient-pos" />
              <span>Strong Increasing (+)</span>
            </div>
            <div className="srs-legend-tokens">
              <span>
                <b className="dot-sig" /> Solid Ring: BH-FDR Significant (q &lt; 0.05)
              </span>
              <span>
                <b className="dot-insig" /> Dashed Ring: Inconclusive (q ≥ 0.05)
              </span>
              {showDipoleLens && (
                <span>
                  <b className="line-dipole" /> Cyan Arc: Opposing Trend Dipole
                </span>
              )}
            </div>
          </div>

          {/* Time-Lapse Decadal Scrubber */}
          <div className="srs-timelapse-box">
            <div className="srs-timelapse-head">
              <div>
                <small>Decadal Emergence Time-Lapse ({activeTimeSlice?.period})</small>
                <strong>{activeTimeSlice?.headline}</strong>
              </div>
              <div className="srs-timelapse-btns">
                {!reducedMotion && (
                  <button
                    className="dp-secondary-btn"
                    onClick={() => setIsPlayingTimeLapse((v) => !v)}
                    type="button"
                  >
                    {isPlayingTimeLapse ? "Pause Time-Lapse" : "Play Time-Lapse"}
                  </button>
                )}
                {cubeData.time_lapse_decades.map((slice, idx) => (
                  <button
                    className={`srs-decade-pill ${timeLapseIdx === idx ? "active" : ""}`}
                    key={slice.period}
                    onClick={() => {
                      setIsPlayingTimeLapse(false);
                      setTimeLapseIdx(idx);
                    }}
                    type="button"
                  >
                    {slice.period} ({slice.significant_pct}% sig)
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: CELL INSPECTOR, SPARKLINE, GRADE & CASE BOARD HANDOFF */}
        <aside className="dashboard-card srs-cell-inspector">
          <span className="section-kicker">
            <span>04</span> Selected Cube Node & Provenance Inspector
          </span>
          {activeCell ? (
            <>
              <div className="srs-inspector-header">
                <div>
                  <h3>{activeCell.region_label}</h3>
                  <p>
                    Centroid: {activeCell.lat.toFixed(2)}°N, {activeCell.lon.toFixed(2)}°E ·{" "}
                    {activeCell.is_land ? "Continental / Land Cell" : "Marine / Ocean Cell"}
                  </p>
                </div>
                <span className={`srs-grade-badge grade-${activeCell.evidence_grade}`}>
                  Grade {activeCell.evidence_grade}
                </span>
              </div>

              <div className="srs-inspector-kpis">
                <div>
                  <small>Sen&apos;s Decadal Trend</small>
                  <strong className={activeCell.decadal_slope >= 0 ? "pos" : "neg"}>
                    {activeCell.decadal_slope >= 0 ? "+" : ""}
                    {activeCell.decadal_slope} {cubeData.active_layer.unit}/dec
                  </strong>
                  <span>
                    95% CI: [{activeCell.ci_low}, {activeCell.ci_high}]
                  </span>
                </div>
                <div>
                  <small>Hamed–Rao & BH-FDR</small>
                  <strong>q = {activeCell.fdr_q_value}</strong>
                  <span>
                    Raw p = {activeCell.mk_p_value} ·{" "}
                    {activeCell.significant_fdr ? "Passes FDR < 0.05" : "Fails FDR Gate"}
                  </span>
                </div>
                <div>
                  <small>Valid Month Coverage</small>
                  <strong>{activeCell.valid_coverage_pct}%</strong>
                  <span>Rule: {cubeData.active_layer.valid_month_rule}</span>
                </div>
              </div>

              {/* Mini Sparkline */}
              <div className="srs-sparkline-card">
                <div className="srs-sparkline-top">
                  <small>Deseasonalized Decadal Trajectory ({analysisWindow})</small>
                  <code>{cubeData.active_layer.variable_id}</code>
                </div>
                <svg aria-label="Cell trend sparkline" viewBox="0 0 280 76">
                  <line
                    stroke="var(--border)"
                    strokeDasharray="2 2"
                    x1="10"
                    x2="270"
                    y1="38"
                    y2="38"
                  />
                  {(() => {
                    const vals = activeCell.sparkline;
                    if (!vals || vals.length < 2) return null;
                    const minV = Math.min(...vals);
                    const maxV = Math.max(...vals);
                    const span = Math.max(0.01, maxV - minV);
                    const pts = vals
                      .map((v, i) => {
                        const x = 14 + (i / (vals.length - 1)) * 252;
                        const y = 64 - ((v - minV) / span) * 52;
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                      })
                      .join(" ");
                    return (
                      <polyline
                        fill="none"
                        points={pts}
                        stroke={activeCell.decadal_slope >= 0 ? "#d97706" : "#0284c7"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                      />
                    );
                  })()}
                </svg>
              </div>

              {/* Opposite-Trend Dipole Card */}
              {activeCell.opposite_dipole_region && (
                <div className="srs-dipole-callout">
                  <small>
                    <Icon name="globe" size={12} /> Opposite-Trends Teleconnection Lens
                  </small>
                  <strong>Linked Dipole: {activeCell.opposite_dipole_region}</strong>
                  <p>
                    Exhibits an opposing multi-decadal anomaly phase. Compare both regions side-by-side
                    in the Regional Case Board.
                  </p>
                  {dipolePartnerCell && (
                    <button
                      className="dp-secondary-btn"
                      onClick={() => setSelectedCellId(dipolePartnerCell.cell_id)}
                      type="button"
                    >
                      Jump to {dipolePartnerCell.region_label}
                    </button>
                  )}
                </div>
              )}

              {/* Layer Caveats & Provenance */}
              <div className="srs-caveat-box">
                <small>Registered Layer Caveats & Provenance</small>
                <ul>
                  {cubeData.active_layer.caveats.map((cav) => (
                    <li key={cav}>{cav}</li>
                  ))}
                </ul>
                <a
                  className="dp-doi-link"
                  href={cubeData.active_layer.citation_doi}
                  rel="noreferrer"
                  target="_blank"
                >
                  Official Source DOI ({cubeData.active_layer.provider_agency}){" "}
                  <Icon name="external" size={12} />
                </a>
              </div>

              <div className="srs-inspector-actions">
                <button
                  className="dp-proceed-btn"
                  onClick={() => handleOpenCaseBoard(activeCell)}
                  type="button"
                >
                  Open Regional Case Board <Icon name="arrow" size={14} />
                </button>
                <button
                  className="dp-secondary-btn"
                  onClick={() => handleOpenCaseFile(activeCell)}
                  type="button"
                >
                  Open Dynamic Case File (/visualize)
                </button>
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function OrthographicGlobeSvg({
  cells,
  activeCell,
  dipolePartner,
  rotationLon,
  rotationLat,
  fdrFilterOnly,
  showRelief,
  showDipoleLens,
  reducedMotion,
  onSelectCell,
}: {
  cells: CubeCellRecord[];
  activeCell?: CubeCellRecord;
  dipolePartner?: CubeCellRecord;
  rotationLon: number;
  rotationLat: number;
  fdrFilterOnly: boolean;
  showRelief: boolean;
  showDipoleLens: boolean;
  reducedMotion: boolean;
  unit: string;
  onSelectCell: (c: CubeCellRecord) => void;
}) {
  const cx = 290;
  const cy = 220;
  const radius = 185;

  const projectLonLat = (lon: number, lat: number) => {
    const lam = ((lon - rotationLon) * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;
    const phi0 = (rotationLat * Math.PI) / 180;

    const cosC =
      Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam);
    const x = cx + radius * Math.cos(phi) * Math.sin(lam);
    const y =
      cy -
      radius * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lam));
    return { x, y, visible: cosC >= -0.15, depth: cosC };
  };

  const projectedCells = cells.map((cell) => ({
    cell,
    proj: projectLonLat(cell.lon, cell.lat),
  }));

  const activeProj = activeCell ? projectLonLat(activeCell.lon, activeCell.lat) : null;
  const partnerProj = dipolePartner ? projectLonLat(dipolePartner.lon, dipolePartner.lat) : null;

  return (
    <svg
      aria-label="Interactive 3D Orthographic Global Trend Cube Sphere"
      className="srs-globe-svg"
      viewBox="0 0 580 440"
    >
      <defs>
        <radialGradient cx="38%" cy="32%" id="globeOceanGrad" r="68%">
          <stop offset="0%" stopColor={showRelief ? "#1e3a5f" : "#17253b"} />
          <stop offset="70%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#080d1a" />
        </radialGradient>
      </defs>

      {/* Outer Atmosphere Halo */}
      <circle
        cx={cx}
        cy={cy}
        fill="none"
        r={radius + 10}
        stroke="#059669"
        strokeOpacity="0.22"
        strokeWidth="8"
      />

      {/* Globe Sphere */}
      <circle
        cx={cx}
        cy={cy}
        fill="url(#globeOceanGrad)"
        r={radius}
        stroke="#334155"
        strokeWidth="2"
      />

      {/* Graticule Parallels & Meridians */}
      {[-60, -30, 0, 30, 60].map((latLine) => {
        const pts: string[] = [];
        for (let lonStep = -180; lonStep <= 180; lonStep += 10) {
          const p = projectLonLat(lonStep, latLine);
          if (p.visible) pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        }
        return pts.length > 1 ? (
          <polyline
            fill="none"
            key={`lat-${latLine}`}
            points={pts.join(" ")}
            stroke="#475569"
            strokeDasharray={latLine === 0 ? undefined : "3 3"}
            strokeOpacity={latLine === 0 ? "0.6" : "0.35"}
            strokeWidth={latLine === 0 ? "1.3" : "0.8"}
          />
        ) : null;
      })}

      {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lonLine) => {
        const pts: string[] = [];
        for (let latStep = -80; latStep <= 80; latStep += 10) {
          const p = projectLonLat(lonLine, latStep);
          if (p.visible) pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        }
        return pts.length > 1 ? (
          <polyline
            fill="none"
            key={`lon-${lonLine}`}
            points={pts.join(" ")}
            stroke="#475569"
            strokeDasharray="3 3"
            strokeOpacity="0.32"
            strokeWidth="0.8"
          />
        ) : null;
      })}

      {/* Teleconnection Dipole Arc */}
      {showDipoleLens && activeProj && partnerProj && activeProj.visible && partnerProj.visible && (
        <path
          d={`M ${activeProj.x} ${activeProj.y} Q ${cx} ${cy - 65} ${partnerProj.x} ${partnerProj.y}`}
          fill="none"
          stroke="#38bdf8"
          strokeDasharray="5 3"
          strokeWidth="2.2"
        />
      )}

      {/* Cube Nodes */}
      {projectedCells.map(({ cell, proj }) => {
        if (!proj.visible) return null;
        const isSelected = activeCell?.cell_id === cell.cell_id;
        const dimmed = fdrFilterOnly && !cell.significant_fdr;
        const fill =
          cell.decadal_slope > 0.15
            ? "#ea580c"
            : cell.decadal_slope > 0
              ? "#f59e0b"
              : cell.decadal_slope < -0.15
                ? "#0284c7"
                : "#38bdf8";

        return (
          <g
            className="srs-globe-node"
            key={cell.cell_id}
            onClick={() => onSelectCell(cell)}
            opacity={dimmed ? 0.25 : 0.96}
            style={{ cursor: "pointer" }}
          >
            {isSelected && !reducedMotion && (
              <circle
                cx={proj.x}
                cy={proj.y}
                fill="none"
                r="17"
                stroke="#34d399"
                strokeWidth="2"
              />
            )}
            <circle
              cx={proj.x}
              cy={proj.y}
              fill={fill}
              r={isSelected ? 10.5 : 7.5}
              stroke={isSelected ? "#ffffff" : cell.significant_fdr ? "#e2e8f0" : "#94a3b8"}
              strokeDasharray={cell.significant_fdr ? undefined : "2 2"}
              strokeWidth={isSelected ? "2.5" : "1.5"}
            />
            <text
              fill="#f8fafc"
              fontSize={isSelected ? "10.5" : "9"}
              fontWeight={isSelected ? "700" : "500"}
              textAnchor="middle"
              x={proj.x}
              y={proj.y - 13}
            >
              {cell.region_label.split(",")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function EquirectangularMapSvg({
  cells,
  activeCell,
  dipolePartner,
  fdrFilterOnly,
  showRelief,
  showDipoleLens,
  onSelectCell,
}: {
  cells: CubeCellRecord[];
  activeCell?: CubeCellRecord;
  dipolePartner?: CubeCellRecord;
  fdrFilterOnly: boolean;
  showRelief: boolean;
  showDipoleLens: boolean;
  unit: string;
  onSelectCell: (c: CubeCellRecord) => void;
}) {
  const width = 580;
  const height = 320;
  const toXY = (lon: number, lat: number) => ({
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  });

  const activeXY = activeCell ? toXY(activeCell.lon, activeCell.lat) : null;
  const partnerXY = dipolePartner ? toXY(dipolePartner.lon, dipolePartner.lat) : null;

  return (
    <svg
      aria-label="2D Equirectangular Global Trend Cube Map"
      className="srs-globe-svg"
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect fill={showRelief ? "#0f172a" : "#111827"} height={height} rx="10" width={width} />
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={`h-${f}`}
          stroke="#334155"
          strokeDasharray="3 3"
          x1={0}
          x2={width}
          y1={height * f}
          y2={height * f}
        />
      ))}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={`v-${f}`}
          stroke="#334155"
          strokeDasharray="3 3"
          x1={width * f}
          x2={width * f}
          y1={0}
          y2={height}
        />
      ))}

      {showDipoleLens && activeXY && partnerXY && (
        <path
          d={`M ${activeXY.x} ${activeXY.y} Q ${(activeXY.x + partnerXY.x) / 2} ${Math.max(25, Math.min(activeXY.y, partnerXY.y) - 45)} ${partnerXY.x} ${partnerXY.y}`}
          fill="none"
          stroke="#38bdf8"
          strokeDasharray="5 3"
          strokeWidth="2"
        />
      )}

      {cells.map((cell) => {
        const { x, y } = toXY(cell.lon, cell.lat);
        const isSelected = activeCell?.cell_id === cell.cell_id;
        const dimmed = fdrFilterOnly && !cell.significant_fdr;
        const fill =
          cell.decadal_slope > 0.15
            ? "#ea580c"
            : cell.decadal_slope > 0
              ? "#f59e0b"
              : cell.decadal_slope < -0.15
                ? "#0284c7"
                : "#38bdf8";

        return (
          <g
            key={cell.cell_id}
            onClick={() => onSelectCell(cell)}
            opacity={dimmed ? 0.25 : 0.96}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={x}
              cy={y}
              fill={fill}
              r={isSelected ? 10 : 7}
              stroke={isSelected ? "#ffffff" : cell.significant_fdr ? "#e2e8f0" : "#94a3b8"}
              strokeDasharray={cell.significant_fdr ? undefined : "2 2"}
              strokeWidth={isSelected ? "2.4" : "1.4"}
            />
            <text
              fill="#f8fafc"
              fontSize="9"
              fontWeight={isSelected ? "700" : "500"}
              textAnchor="middle"
              x={x}
              y={y - 11}
            >
              {cell.region_label.split(",")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
