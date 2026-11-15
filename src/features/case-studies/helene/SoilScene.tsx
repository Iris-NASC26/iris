"use client";

import React, { useState, useEffect } from "react";
import { heleneData } from "./heleneData";
import { calculateSoilDifference } from "./heleneCalculations";

export function SoilScene() {
  const [dateA, setDateA] = useState<string>("2024-09-25");
  const [dateB, setDateB] = useState<string>("2024-09-26");
  const [isReplaying, setIsReplaying] = useState(false);

  const observations = heleneData.soil.observations;
  const diffResult = calculateSoilDifference(dateA, dateB);

  // Replay the Three Days animation
  useEffect(() => {
    if (!isReplaying) return;

    // Step 1: Sep 25
    setDateA("2024-09-25");
    setDateB("2024-09-25");

    const timer1 = setTimeout(() => {
      // Step 2: Sep 26 (emphasizes the jump from Sep 25)
      setDateA("2024-09-25");
      setDateB("2024-09-26");
    }, 900);

    const timer2 = setTimeout(() => {
      // Step 3: Sep 27
      setDateA("2024-09-26");
      setDateB("2024-09-27");
    }, 1800);

    const timer3 = setTimeout(() => {
      // End replay and return to canonical 25 vs 26
      setDateA("2024-09-25");
      setDateB("2024-09-26");
      setIsReplaying(false);
    }, 2700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isReplaying]);

  const dates = [
    { key: "2024-09-25", label: "Sep 25", value: 6.64522886 },
    { key: "2024-09-26", label: "Sep 26", value: 7.66144991 },
    { key: "2024-09-27", label: "Sep 27", value: 7.58885908 },
  ];

  // Active target observation for visual moisture level
  const activeObsB = observations.find((o) => o.date === dateB) ?? observations[1];
  const moistureRatio = (activeObsB.value - 6.0) / 2.0; // normalised 0..1

  return (
    <div className="helene-viz-frame" style={{ background: "#111f18" }}>
      {/* Header Metric */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--soil-color)",
              textTransform: "uppercase",
            }}
          >
            GLDAS DAILY SURFACE-SOIL MOISTURE
          </span>
          <div className="helene-big-metric">
            {diffResult ? diffResult.formattedDiff : "+1.02 kg/m²"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--case-text-muted)" }}>
            Difference: {dateA.slice(5)} to {dateB.slice(5)} (Daily Land-Surface Model)
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsReplaying(true)}
          disabled={isReplaying}
          style={{
            background: isReplaying ? "var(--case-surface-raised)" : "rgba(145, 168, 131, 0.15)",
            color: "var(--soil-color)",
            border: "1px solid var(--soil-color)",
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: isReplaying ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>{isReplaying ? "● Replaying..." : "▶ Replay the Three Days"}</span>
        </button>
      </div>

      {/* Main Exhibition Layout: Soil Cutaway (Left) + 3-Point Chart (Right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          flex: 1,
          marginTop: "16px",
          minHeight: "220px",
        }}
      >
        {/* Left: Scientific Soil Cross-Section Cutaway */}
        <div
          style={{
            position: "relative",
            background: "#08131B",
            borderRadius: "8px",
            border: "1px solid var(--case-border)",
            overflow: "hidden",
            padding: "8px",
          }}
        >
          <svg
            viewBox="0 0 240 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "100%" }}
            aria-label="Conceptual Soil Moisture Cross-Section Exhibit"
          >
            <defs>
              {/* Soil granular texture */}
              <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.6" fill="rgba(255, 255, 255, 0.1)" />
              </pattern>
            </defs>

            {/* Top Land Silhouette & Grass Elements */}
            <path
              d="M 0 30 Q 60 25 120 30 T 240 28 L 240 40 L 0 40 Z"
              fill="#2a3d2e"
            />
            {/* Small Grass Motifs */}
            {[20, 50, 90, 130, 170, 210].map((gx) => (
              <path
                key={gx}
                d={`M ${gx} 28 L ${gx - 2} 18 M ${gx} 28 L ${gx + 2} 17 M ${gx} 28 L ${gx} 16`}
                stroke="var(--soil-color)"
                strokeWidth="1"
                strokeLinecap="round"
              />
            ))}

            {/* Layer 1: Topsoil / Organic Layer */}
            <rect x="0" y="38" width="240" height="42" fill="#5A4D41" />
            <rect x="0" y="38" width="240" height="42" fill="url(#grain)" />
            {/* Dynamic Moisture Infiltration Glow in Layer 1 */}
            <rect
              x="0"
              y="38"
              width="240"
              height="42"
              fill="rgba(118, 169, 207, 0.35)"
              style={{
                opacity: 0.2 + moistureRatio * 0.7,
                transition: "opacity 0.5s ease",
              }}
            />
            <text x="10" y="62" fill="rgba(255, 255, 255, 0.5)" fontSize="9" fontFamily="monospace">
              UPPER TOPSOIL
            </text>

            {/* Layer 2: Subsoil Horizon */}
            <rect x="0" y="80" width="240" height="55" fill="#43382F" />
            <rect x="0" y="80" width="240" height="55" fill="url(#grain)" />
            <rect
              x="0"
              y="80"
              width="240"
              height="55"
              fill="rgba(118, 169, 207, 0.25)"
              style={{
                opacity: 0.1 + moistureRatio * 0.5,
                transition: "opacity 0.5s ease",
              }}
            />
            <text x="10" y="108" fill="rgba(255, 255, 255, 0.4)" fontSize="9" fontFamily="monospace">
              SUBSOIL HORIZON
            </text>

            {/* Layer 3: Deep Sediment Layer */}
            <rect x="0" y="135" width="240" height="65" fill="#322923" />
            <rect x="0" y="135" width="240" height="65" fill="url(#grain)" />
            <text x="10" y="170" fill="rgba(255, 255, 255, 0.3)" fontSize="9" fontFamily="monospace">
              DEEP SUBSTRATE
            </text>

            {/* Boundary separator lines */}
            <line x1="0" y1="38" x2="240" y2="38" stroke="rgba(218, 232, 229, 0.2)" strokeWidth="1" />
            <line x1="0" y1="80" x2="240" y2="80" stroke="rgba(218, 232, 229, 0.15)" strokeWidth="1" />
            <line x1="0" y1="135" x2="240" y2="135" stroke="rgba(218, 232, 229, 0.15)" strokeWidth="1" />
          </svg>
          <div
            style={{
              position: "absolute",
              bottom: "4px",
              right: "8px",
              fontSize: "8.5px",
              color: "var(--case-text-muted)",
              letterSpacing: "0.04em",
            }}
          >
            CONCEPTUAL SOIL RESPONSE — NOT A MEASURED PROFILE
          </div>
        </div>

        {/* Right: Precise 3-Point Scientific Line Chart */}
        <div
          style={{
            position: "relative",
            background: "#08131B",
            borderRadius: "8px",
            border: "1px solid var(--case-border)",
            padding: "8px",
          }}
        >
          <svg
            viewBox="0 0 240 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "100%" }}
          >
            {/* Gridlines: 6.5, 7.0, 7.5, 8.0 kg/m2 */}
            {[6.5, 7.0, 7.5, 8.0].map((val) => {
              // Map 6.0 -> 170, 8.0 -> 30
              const y = 170 - ((val - 6.0) / 2.0) * 140;
              return (
                <g key={val}>
                  <line
                    x1="45"
                    y1={y}
                    x2="225"
                    y2={y}
                    stroke="rgba(218, 232, 229, 0.08)"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <text
                    x="40"
                    y={y + 3}
                    fill="var(--case-text-muted)"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Line connecting the 3 dates */}
            {(() => {
              // x coordinates: Sep 25 -> 70, Sep 26 -> 135, Sep 27 -> 200
              const pts = dates.map((d, i) => {
                const x = 70 + i * 65;
                const y = 170 - ((d.value - 6.0) / 2.0) * 140;
                return { ...d, x, y };
              });

              return (
                <g>
                  {/* Area fill under curve */}
                  <polygon
                    points={`${pts[0].x},170 ${pts[0].x},${pts[0].y} ${pts[1].x},${pts[1].y} ${pts[2].x},${pts[2].y} ${pts[2].x},170`}
                    fill="rgba(145, 168, 131, 0.12)"
                  />
                  {/* Trend line */}
                  <polyline
                    points={`${pts[0].x},${pts[0].y} ${pts[1].x},${pts[1].y} ${pts[2].x},${pts[2].y}`}
                    stroke="var(--soil-color)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Highlighting step 25 -> 26 rise */}
                  <line
                    x1={pts[0].x}
                    y1={pts[0].y}
                    x2={pts[1].x}
                    y2={pts[0].y}
                    stroke="rgba(209, 123, 96, 0.4)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={pts[1].x}
                    y1={pts[0].y}
                    x2={pts[1].x}
                    y2={pts[1].y}
                    stroke="var(--case-highlight)"
                    strokeWidth="2"
                  />

                  {/* Observation points */}
                  {pts.map((p) => {
                    const isSelectedA = p.key === dateA;
                    const isSelectedB = p.key === dateB;
                    return (
                      <g key={p.key}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isSelectedA || isSelectedB ? "6" : "4"}
                          fill={isSelectedB ? "var(--case-highlight)" : isSelectedA ? "var(--case-accent)" : "var(--soil-color)"}
                          stroke="#08131B"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y={p.y - 10}
                          fill={isSelectedB ? "var(--case-highlight)" : "#F5F3EC"}
                          fontSize="10"
                          fontWeight="700"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {p.value.toFixed(2)}
                        </text>
                        <text
                          x={p.x}
                          y="185"
                          fill={isSelectedA || isSelectedB ? "var(--soil-color)" : "var(--case-text-muted)"}
                          fontSize="9.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {p.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* THE DAILY DIFFERENCE LAB CONTROLS */}
      <div
        style={{
          marginTop: "12px",
          padding: "12px 16px",
          background: "rgba(8, 19, 27, 0.75)",
          border: "1px solid var(--case-border)",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--case-accent)", letterSpacing: "0.08em" }}>
            DAILY DIFFERENCE LAB:
          </span>
          <label style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>
            Handle A:
            <select
              value={dateA}
              onChange={(e) => setDateA(e.target.value)}
              style={{
                marginLeft: "4px",
                background: "var(--case-surface)",
                color: "var(--case-text)",
                border: "1px solid var(--case-border)",
                padding: "3px 6px",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              {dates.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>
            Handle B:
            <select
              value={dateB}
              onChange={(e) => setDateB(e.target.value)}
              style={{
                marginLeft: "4px",
                background: "var(--case-surface)",
                color: "var(--case-text)",
                border: "1px solid var(--case-border)",
                padding: "3px 6px",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              {dates.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {diffResult && (
          <div style={{ fontSize: "12px", fontFamily: "monospace" }}>
            <span style={{ color: "var(--case-text-muted)" }}>Computed Step: </span>
            <strong style={{ color: diffResult.absDiff >= 0 ? "var(--case-highlight)" : "var(--case-text)" }}>
              {diffResult.formattedDiff}
            </strong>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "10px",
          fontSize: "11px",
          color: "var(--case-text-muted)",
          lineHeight: 1.4,
        }}
      >
        Note: The daily record reveals change that the monthly datasets cannot
        resolve at the same level of detail.
      </div>
    </div>
  );
}
