"use client";

import React, { useState } from "react";
import { heleneData } from "./heleneData";
import { calculateRainfallComparison } from "./heleneCalculations";

export function RainfallScene() {
  const [selectedMonth, setSelectedMonth] = useState<string>("2024-09");
  const [compareA, setCompareA] = useState<string>("2024-08");
  const [compareB, setCompareB] = useState<string>("2024-09");

  const observations = heleneData.rainfall.observations;
  const currentObs = observations.find((o) => o.date === selectedMonth) ?? observations[1];
  const comparison = calculateRainfallComparison(compareA, compareB);

  const months = [
    { key: "2024-08", label: "AUG 2024", short: "Aug" },
    { key: "2024-09", label: "SEP 2024", short: "Sep" },
    { key: "2024-10", label: "OCT 2024", short: "Oct" },
  ];

  const maxVal = 240; // Max domain for scale

  return (
    <div className="helene-viz-frame" style={{ background: "#0a1924" }}>
      {/* Header Metric */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--rain-color)",
              textTransform: "uppercase",
            }}
          >
            NASA NLDAS-2 REGIONAL MONTHLY PRECIPITATION
          </span>
          <div className="helene-big-metric">
            {currentObs.value.toFixed(2)} kg/m²
          </div>
          <div style={{ fontSize: "12px", color: "var(--case-text-muted)" }}>
            Selected: {currentObs.date} · Area-Averaged Total
          </div>
        </div>

        {/* Selected Month Indicator Tabs */}
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
                color: selectedMonth === m.key ? "var(--rain-color)" : "var(--case-text-muted)",
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

      {/* RAINFALL CHAMBER: SVG Chart with Rain Textures and Waterline */}
      <div style={{ flex: 1, position: "relative", minHeight: "230px", marginTop: "16px" }}>
        <svg
          viewBox="0 0 500 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            {/* Fine vertical rain-line texture pattern */}
            <pattern id="rainLines" width="6" height="12" patternUnits="userSpaceOnUse">
              <line
                x1="3"
                y1="0"
                x2="3"
                y2="7"
                stroke="rgba(218, 232, 229, 0.28)"
                strokeWidth="1"
              />
            </pattern>
            {/* Selected month rain pattern */}
            <pattern id="rainLinesActive" width="6" height="12" patternUnits="userSpaceOnUse">
              <line
                x1="3"
                y1="0"
                x2="3"
                y2="8"
                stroke="rgba(118, 169, 207, 0.55)"
                strokeWidth="1.2"
              />
            </pattern>
          </defs>

          {/* Gridlines */}
          {[50, 100, 150, 200].map((tick) => {
            const y = 180 - (tick / maxVal) * 160;
            return (
              <g key={tick}>
                <line
                  x1="60"
                  y1={y}
                  x2="480"
                  y2={y}
                  stroke="rgba(218, 232, 229, 0.08)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x="50"
                  y={y + 3}
                  fill="var(--case-text-muted)"
                  fontSize="9.5"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Three precise rainfall columns */}
          {observations.map((obs, idx) => {
            // Positions: idx 0 (Aug) -> 120, idx 1 (Sep) -> 240, idx 2 (Oct) -> 360
            const colX = 110 + idx * 130;
            const barW = 74;
            const barH = (obs.value / maxVal) * 160;
            const barY = 180 - barH;
            const isSelected = obs.date === selectedMonth;

            return (
              <g
                key={obs.date}
                onClick={() => setSelectedMonth(obs.date)}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                aria-label={`Select ${obs.date}: ${obs.value.toFixed(2)} kg/m²`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedMonth(obs.date);
                }}
              >
                {/* Bar Base Fill */}
                <rect
                  x={colX}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx="3"
                  fill={isSelected ? "rgba(118, 169, 207, 0.22)" : "rgba(80, 100, 115, 0.15)"}
                  stroke={isSelected ? "var(--rain-color)" : "rgba(218, 232, 229, 0.2)"}
                  strokeWidth={isSelected ? "1.5" : "1"}
                />

                {/* Vertical Rain Streaks Texture (clipped inside bar) */}
                <rect
                  x={colX + 1}
                  y={barY + 1}
                  width={barW - 2}
                  height={barH - 2}
                  rx="2"
                  fill={isSelected ? "url(#rainLinesActive)" : "url(#rainLines)"}
                />

                {/* Soft horizontal waterline motif at top of bar */}
                <line
                  x1={colX + 2}
                  y1={barY}
                  x2={colX + barW - 2}
                  y2={barY}
                  stroke={isSelected ? "#D2EDE8" : "rgba(218, 232, 229, 0.4)"}
                  strokeWidth="2"
                />

                {/* Value Label */}
                <text
                  x={colX + barW / 2}
                  y={barY - 8}
                  fill={isSelected ? "#F5F3EC" : "#82949B"}
                  fontSize="12"
                  fontWeight={isSelected ? "700" : "500"}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {obs.value.toFixed(1)}
                </text>

                {/* Month Label */}
                <text
                  x={colX + barW / 2}
                  y="200"
                  fill={isSelected ? "var(--rain-color)" : "var(--case-text-muted)"}
                  fontSize="11"
                  fontWeight={isSelected ? "700" : "500"}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {months[idx].short.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1="60"
            y1="180"
            x2="480"
            y2="180"
            stroke="rgba(218, 232, 229, 0.3)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Comparison Drawer / Control Box */}
      <div
        style={{
          marginTop: "12px",
          padding: "12px 16px",
          background: "rgba(8, 19, 27, 0.75)",
          border: "1px solid var(--case-border)",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--case-accent)", letterSpacing: "0.08em" }}>
              COMPARE:
            </span>
            <select
              value={compareA}
              onChange={(e) => setCompareA(e.target.value)}
              style={{
                background: "var(--case-surface)",
                color: "var(--case-text)",
                border: "1px solid var(--case-border)",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
              }}
              aria-label="Month A"
            >
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>vs</span>
            <select
              value={compareB}
              onChange={(e) => setCompareB(e.target.value)}
              style={{
                background: "var(--case-surface)",
                color: "var(--case-text)",
                border: "1px solid var(--case-border)",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
              }}
              aria-label="Month B"
            >
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {comparison && (
            <div style={{ display: "flex", gap: "18px", fontSize: "12px", fontFamily: "monospace" }}>
              <div>
                <span style={{ color: "var(--case-text-muted)" }}>Abs Diff: </span>
                <strong style={{ color: comparison.absDiff >= 0 ? "var(--case-accent)" : "var(--case-highlight)" }}>
                  {comparison.formattedDiff}
                </strong>
              </div>
              {comparison.ratio !== null && (
                <div>
                  <span style={{ color: "var(--case-text-muted)" }}>Ratio: </span>
                  <strong style={{ color: "var(--case-text)" }}>
                    {comparison.ratio.toFixed(2)}×
                  </strong>
                </div>
              )}
              {comparison.relDiffPercent !== null && (
                <div>
                  <span style={{ color: "var(--case-text-muted)" }}>Rel: </span>
                  <strong style={{ color: comparison.relDiffPercent >= 0 ? "var(--case-accent)" : "var(--case-highlight)" }}>
                    {comparison.relDiffPercent > 0 ? "+" : ""}
                    {comparison.relDiffPercent.toFixed(1)}%
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Narrative annotation below */}
      <div
        style={{
          marginTop: "12px",
          padding: "8px 12px",
          borderLeft: "2px solid var(--case-highlight)",
          background: "rgba(209, 123, 96, 0.05)",
          fontSize: "12px",
          color: "var(--case-text-secondary)",
          fontStyle: "italic",
        }}
      >
        &ldquo;Monthly totals tell us how much precipitation the regional product
        represents over the month—not exactly when each storm produced it.&rdquo;
      </div>
    </div>
  );
}
