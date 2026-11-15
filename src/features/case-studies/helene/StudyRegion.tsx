"use client";

import React, { useState } from "react";
import { heleneData } from "./heleneData";

export function StudyRegion() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { west, east, south, north } = heleneData.region;

  return (
    <section className="helene-section" id="study-region">
      <div className="helene-container">
        <div className="helene-geo-grid">
          {/* Left Narrative Column */}
          <div>
            <div className="helene-eyebrow">00 / GEOGRAPHIC CONTEXT</div>
            <h2 className="helene-chapter-heading helene-serif">
              A storm crosses boundaries. So does the science.
            </h2>
            <p className="helene-body-text">
              This investigation focuses on a rectangular area across the southeastern
              United States. The datasets describe different parts of the Earth
              system within that region, but they do not all use the same spatial
              resolution.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                margin: "24px 0 32px",
                padding: "18px",
                background: "var(--case-surface)",
                border: "1px solid var(--case-border)",
                borderRadius: "8px",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>
                  BOUNDING LONGITUDE
                </span>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--case-text)" }}>
                  {Math.abs(west)}°W – {Math.abs(east)}°W
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>
                  BOUNDING LATITUDE
                </span>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--case-text)" }}>
                  {south}°N – {north}°N
                </div>
              </div>
            </div>

            <button
              type="button"
              className="helene-btn-secondary"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
            >
              Inspect the Observation Area
            </button>
          </div>

          {/* Right SVG Coordinate Schematic */}
          <div
            style={{
              position: "relative",
              background: "var(--case-surface)",
              border: "1px solid var(--case-border)",
              borderRadius: "16px",
              padding: "24px",
              overflow: "hidden",
            }}
          >
            {/* Fine contour-line texture background pattern inside the map frame ONLY */}
            <svg
              viewBox="0 0 540 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: "100%", height: "auto", display: "block" }}
              aria-label="Southeastern USA Observation Area Coordinate Schematic"
            >
              <defs>
                <pattern
                  id="geoGrid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="rgba(218, 232, 229, 0.05)"
                    strokeWidth="1"
                  />
                </pattern>
                {/* Fine contour line pattern */}
                <pattern
                  id="contourPattern"
                  width="120"
                  height="120"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 0 30 Q 30 10 60 30 T 120 30 M 0 60 Q 40 40 80 60 T 120 60 M 0 90 Q 30 110 70 90 T 120 90"
                    fill="none"
                    stroke="rgba(108, 190, 197, 0.06)"
                    strokeWidth="0.8"
                  />
                </pattern>
              </defs>

              {/* Background grid and texture */}
              <rect width="540" height="400" fill="var(--case-surface)" />
              <rect width="540" height="400" fill="url(#geoGrid)" />
              <rect width="540" height="400" fill="url(#contourPattern)" />

              {/* Graticule lines */}
              {/* Latitude lines: 30N, 32N, 34N, 36N */}
              {[30, 32, 34, 36].map((lat) => {
                // Map lat 28 -> 38 to y 360 -> 40
                const y = 360 - ((lat - 28) / 10) * 320;
                return (
                  <g key={lat}>
                    <line
                      x1="60"
                      y1={y}
                      x2="480"
                      y2={y}
                      stroke="rgba(218, 232, 229, 0.12)"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                    />
                    <text
                      x="40"
                      y={y + 4}
                      fill="var(--case-text-muted)"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {lat}°N
                    </text>
                  </g>
                );
              })}

              {/* Longitude lines: 85W, 83W, 81W */}
              {[85, 83, 81].map((lon) => {
                // Map lon -86 -> -80 to x 80 -> 460
                const x = 80 + ((lon - 80) / -6 + 1) * 380;
                return (
                  <g key={lon}>
                    <line
                      x1={x}
                      y1="40"
                      x2={x}
                      y2="360"
                      stroke="rgba(218, 232, 229, 0.12)"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                    />
                    <text
                      x={x}
                      y="380"
                      fill="var(--case-text-muted)"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {lon}°W
                    </text>
                  </g>
                );
              })}

              {/* The Exact Helene Observation Bounding Box */}
              {/* west: -84.5 -> x1, east: -81.0 -> x2 */}
              {/* south: 29.0 -> y2, north: 36.5 -> y1 */}
              {(() => {
                // Lon map: -86 => 80, -80 => 460  (dx = 380 / 6 = 63.33)
                // -84.5 => 80 + ((-84.5 - -86) * 63.33) = 80 + (1.5 * 63.33) = 175
                // -81.0 => 80 + ((-81.0 - -86) * 63.33) = 80 + (5.0 * 63.33) = 396.6
                // Lat map: 28 => 360, 38 => 40 (dy = 320 / 10 = 32)
                // 36.5 => 360 - ((36.5 - 28) * 32) = 360 - (8.5 * 32) = 88
                // 29.0 => 360 - ((29.0 - 28) * 32) = 360 - (1.0 * 32) = 328
                const bx = 175;
                const by = 88;
                const bw = 396.6 - 175;
                const bh = 328 - 88;

                return (
                  <g>
                    {/* Bounding area fill */}
                    <rect
                      x={bx}
                      y={by}
                      width={bw}
                      height={bh}
                      fill="rgba(108, 190, 197, 0.08)"
                      stroke="var(--case-highlight)"
                      strokeWidth="1.5"
                    />

                    {/* Corner registration reticles */}
                    <path
                      d={`M ${bx - 6} ${by} L ${bx + 10} ${by} M ${bx} ${by - 6} L ${bx} ${by + 10}`}
                      stroke="var(--case-accent)"
                      strokeWidth="1.5"
                    />
                    <path
                      d={`M ${bx + bw + 6} ${by} L ${bx + bw - 10} ${by} M ${bx + bw} ${by - 6} L ${bx + bw} ${by + 10}`}
                      stroke="var(--case-accent)"
                      strokeWidth="1.5"
                    />
                    <path
                      d={`M ${bx - 6} ${by + bh} L ${bx + 10} ${by + bh} M ${bx} ${by + bh + 6} L ${bx} ${by + bh - 10}`}
                      stroke="var(--case-accent)"
                      strokeWidth="1.5"
                    />
                    <path
                      d={`M ${bx + bw + 6} ${by + bh} L ${bx + bw - 10} ${by + bh} M ${bx + bw} ${by + bh + 6} L ${bx + bw} ${by + bh - 10}`}
                      stroke="var(--case-accent)"
                      strokeWidth="1.5"
                    />

                    {/* Label inside box */}
                    <rect
                      x={bx + 12}
                      y={by + 12}
                      width="168"
                      height="24"
                      rx="4"
                      fill="rgba(8, 19, 27, 0.85)"
                      stroke="rgba(218, 232, 229, 0.16)"
                    />
                    <text
                      x={bx + 20}
                      y={by + 28}
                      fill="var(--case-text)"
                      fontSize="11"
                      fontWeight="600"
                      letterSpacing="0.06em"
                    >
                      CURATED STUDY DOMAIN
                    </text>

                    {/* Extent annotation */}
                    <text
                      x={bx + bw / 2}
                      y={by + bh - 14}
                      fill="var(--case-text-muted)"
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      3.5° LON × 7.5° LAT
                    </text>
                  </g>
                );
              })()}
            </svg>

            <div
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11px",
                color: "var(--case-text-muted)",
              }}
            >
              <span>COORDINATE BOUNDS: [84.5°W, 29.0°N] TO [81.0°W, 36.5°N]</span>
              <span>NOAA / NASA GIOVANNI AREA AVERAGE</span>
            </div>
          </div>
        </div>

        {/* Side Panel Drawer */}
        {drawerOpen && (
          <>
            <div
              className="helene-drawer-backdrop"
              onClick={() => setDrawerOpen(false)}
            />
            <aside
              className="helene-side-drawer"
              role="dialog"
              aria-label="Observation Area Inspection"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: "var(--case-accent)",
                  }}
                >
                  OBSERVATION AREA SPECIFICATION
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--case-text)",
                    fontSize: "20px",
                    cursor: "pointer",
                  }}
                  aria-label="Close panel"
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: "28px" }}>
                <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>
                  Selected Geographic Coordinates
                </h4>
                <div
                  style={{
                    padding: "12px",
                    background: "var(--case-surface)",
                    borderRadius: "6px",
                    border: "1px solid var(--case-border)",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                >
                  <div>West: 84.5°W (-84.5)</div>
                  <div>East: 81.0°W (-81.0)</div>
                  <div>South: 29.0°N (+29.0)</div>
                  <div>North: 36.5°N (+36.5)</div>
                </div>
              </div>

              <div style={{ marginBottom: "28px" }}>
                <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>
                  Regional Average vs Local Measurement
                </h4>
                <p style={{ fontSize: "13.5px", color: "var(--case-text-secondary)", lineHeight: 1.6 }}>
                  An area-averaged measurement integrates all observations across the
                  bounding box into a composite value for each time slice.
                  While this provides essential broad-scale Earth-system context, it
                  deliberately dampens localized flash flooding and isolated peak wind
                  gusts that occur at single surface stations.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>
                  The Five Source Resolutions
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { name: "Monthly Precipitation", res: "0.125°", note: "NLDAS-2 (~12.5 km)" },
                    { name: "Surface Soil Moisture", res: "0.25°", note: "GLDAS CLSM (~25 km)" },
                    { name: "Surface Runoff", res: "0.25°", note: "GLDAS Noah (~25 km)" },
                    { name: "Regional Wind Speed", res: "0.5° × 0.625°", note: "MERRA-2 (~50 × 60 km)" },
                    { name: "Sea Surface Temperature", res: "~9 km", note: "MODIS-Aqua Nighttime" },
                  ].map((item) => (
                    <div
                      key={item.name}
                      style={{
                        padding: "10px 14px",
                        background: "var(--case-surface)",
                        borderRadius: "6px",
                        border: "1px solid var(--case-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>
                          {item.note}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--case-accent)",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.res}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </section>
  );
}
