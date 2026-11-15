"use client";

import React, { useState } from "react";
import { heleneData } from "./heleneData";
import { calculateRunoffComparison } from "./heleneCalculations";

export function RunoffScene() {
  const [selectedMonth, setSelectedMonth] = useState<string>("2024-09");
  const observations = heleneData.runoff.observations;
  const currentObs = observations.find((o) => o.date === selectedMonth) ?? observations[1];
  const augToSep = calculateRunoffComparison("2024-08", "2024-09");

  const months = [
    { key: "2024-08", label: "AUG 2024", short: "Aug" },
    { key: "2024-09", label: "SEP 2024", short: "Sep" },
    { key: "2024-10", label: "OCT 2024", short: "Oct" },
  ];

  const isSep = selectedMonth === "2024-09";

  return (
    <div className="helene-viz-frame" style={{ background: "#1c1712" }}>
      {/* Header Metric */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--runoff-color)",
              textTransform: "uppercase",
            }}
          >
            GLDAS NOAH MODELED SURFACE RUNOFF
          </span>
          <div className="helene-big-metric">
            {currentObs.value.toFixed(6)} kg/m²
          </div>
          <div style={{ fontSize: "12px", color: "var(--case-text-muted)" }}>
            Selected: {currentObs.date} · Monthly Area-Average
          </div>
        </div>

        {/* Month selector */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "rgba(8, 19, 27, 0.7)",
            padding: "3px",
            borderRadius: "6px",
            border: "1px solid var(--case-border)",
          }}
        >
          {months.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedMonth(m.key)}
              style={{
                background: selectedMonth === m.key ? "var(--case-surface-raised)" : "transparent",
                color: selectedMonth === m.key ? "var(--runoff-color)" : "var(--case-text-muted)",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {m.short.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* FLOWING TERRAIN VECTOR ILLUSTRATION & RUNOFF BARS */}
      <div style={{ flex: 1, position: "relative", minHeight: "220px", marginTop: "16px" }}>
        <svg
          viewBox="0 0 500 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <linearGradient id="terrainGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2A201A" />
              <stop offset="100%" stopColor="#181310" />
            </linearGradient>
            <linearGradient id="terrainGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3A2D24" />
              <stop offset="100%" stopColor="#221A15" />
            </linearGradient>
          </defs>

          {/* Layered Ridge 1 (Far background) */}
          <path
            d="M 0 110 Q 70 85 150 100 T 320 80 T 500 105 L 500 220 L 0 220 Z"
            fill="url(#terrainGrad1)"
          />
          {/* Subtle contour lines on Ridge 1 */}
          <path
            d="M 40 105 Q 110 95 180 105 M 240 92 Q 330 85 420 98"
            stroke="rgba(201, 155, 114, 0.15)"
            strokeWidth="1"
          />

          {/* Layered Ridge 2 (Midground slope) */}
          <path
            d="M 0 145 Q 100 120 220 140 T 440 125 T 500 138 L 500 220 L 0 220 Z"
            fill="url(#terrainGrad2)"
          />

          {/* Illustrated Branching Runoff Flow Channels Following Slope */}
          <g style={{ transition: "all 0.4s ease" }}>
            {/* Primary Channel 1 */}
            <path
              d="M 80 125 Q 110 145 130 170 T 160 215"
              stroke="var(--runoff-color)"
              strokeWidth={isSep ? "3.2" : "1.6"}
              strokeOpacity={isSep ? "0.9" : "0.4"}
              strokeLinecap="round"
              fill="none"
            />
            {/* Tributary 1a */}
            <path
              d="M 125 150 Q 145 165 140 185"
              stroke="var(--runoff-color)"
              strokeWidth={isSep ? "2" : "1"}
              strokeOpacity={isSep ? "0.7" : "0.3"}
              strokeLinecap="round"
              fill="none"
            />

            {/* Primary Channel 2 */}
            <path
              d="M 280 110 Q 300 135 320 160 T 350 215"
              stroke="var(--runoff-color)"
              strokeWidth={isSep ? "3.2" : "1.6"}
              strokeOpacity={isSep ? "0.9" : "0.4"}
              strokeLinecap="round"
              fill="none"
            />
            {/* Tributary 2a */}
            <path
              d="M 330 140 Q 345 160 335 180"
              stroke="var(--runoff-color)"
              strokeWidth={isSep ? "1.8" : "0.9"}
              strokeOpacity={isSep ? "0.7" : "0.3"}
              strokeLinecap="round"
              fill="none"
            />

            {/* Basin pooling motif at foot of slope */}
            <path
              d="M 140 210 Q 170 205 210 212 T 360 208"
              stroke="var(--runoff-color)"
              strokeWidth={isSep ? "2.5" : "1.2"}
              strokeOpacity={isSep ? "0.8" : "0.3"}
              fill="none"
            />
          </g>

          {/* Embedded Analytical Columns (Top Right) */}
          <g transform="translate(340, 20)">
            <rect
              x="0"
              y="0"
              width="145"
              height="80"
              rx="6"
              fill="rgba(8, 19, 27, 0.85)"
              stroke="rgba(218, 232, 229, 0.15)"
            />
            <text x="12" y="18" fill="var(--case-text-muted)" fontSize="9.5" fontWeight="600">
              OBSERVED RUNOFF
            </text>
            {observations.map((obs, i) => {
              const isCur = obs.date === selectedMonth;
              return (
                <g key={obs.date} transform={`translate(12, ${34 + i * 16})`}>
                  <text
                    x="0"
                    y="0"
                    fill={isCur ? "var(--runoff-color)" : "var(--case-text-secondary)"}
                    fontSize="10"
                    fontWeight={isCur ? "700" : "500"}
                    fontFamily="monospace"
                  >
                    {obs.date.slice(5)}: {obs.value.toFixed(6)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Caption */}
          <text
            x="485"
            y="212"
            fill="var(--case-text-muted)"
            fontSize="8.5"
            textAnchor="end"
            fontFamily="system-ui, sans-serif"
          >
            ILLUSTRATIVE FLOW MOTIF — NOT MEASURED STREAMFLOW
          </text>
        </svg>
      </div>

      {/* Calculations & Comparative Metrics */}
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
        <div style={{ display: "flex", gap: "20px", fontSize: "12px", fontFamily: "monospace" }}>
          <div>
            <span style={{ color: "var(--case-text-muted)" }}>Aug → Sep Diff: </span>
            <strong style={{ color: "var(--case-accent)" }}>
              {augToSep ? augToSep.formattedDiff : "+0.008882 kg/m²"}
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--case-text-muted)" }}>Ratio: </span>
            <strong style={{ color: "var(--case-text)" }}>
              {augToSep && augToSep.ratio ? `${augToSep.ratio.toFixed(2)}×` : "1.92×"}
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--case-text-muted)" }}>Relative: </span>
            <strong style={{ color: "var(--case-accent)" }}>
              {augToSep && augToSep.relDiffPercent ? `+${augToSep.relDiffPercent.toFixed(1)}%` : "+91.6%"}
            </strong>
          </div>
        </div>

        <div style={{ fontSize: "11px", color: "var(--case-text-muted)", fontStyle: "italic" }}>
          Scientific caution: Model-simulated grid runoff, not river streamflow.
        </div>
      </div>
    </div>
  );
}
