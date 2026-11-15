"use client";

import React, { useState } from "react";
import { heleneData } from "./heleneData";
import { calculateOceanDifference } from "./heleneCalculations";

export function OceanScene() {
  const [selectedMonth, setSelectedMonth] = useState<"2024-08" | "2024-09" | "both">("2024-08");
  const diffInfo = calculateOceanDifference();

  const activeVal =
    selectedMonth === "2024-08"
      ? heleneData.ocean.observations[0].value
      : selectedMonth === "2024-09"
      ? heleneData.ocean.observations[1].value
      : null;

  return (
    <div className="helene-viz-frame" style={{ background: "#0c1d27" }}>
      {/* Visual header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--ocean-color)",
              textTransform: "uppercase",
            }}
          >
            NASA MODIS-AQUA NIGHTTIME SST
          </span>
          <div className="helene-big-metric">
            {activeVal !== null ? `${activeVal.toFixed(2)} °C` : "27.72°C vs 27.18°C"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--case-text-muted)" }}>
            {selectedMonth === "2024-08"
              ? "Reported August 2024 Monthly Value"
              : selectedMonth === "2024-09"
              ? "Reported September 2024 Monthly Value"
              : `Change: ${diffInfo.formattedDiff} between Aug and Sep`}
          </div>
        </div>

        {/* Tab selector */}
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
          <button
            type="button"
            onClick={() => setSelectedMonth("2024-08")}
            style={{
              background: selectedMonth === "2024-08" ? "var(--case-surface-raised)" : "transparent",
              color: selectedMonth === "2024-08" ? "var(--ocean-color)" : "var(--case-text-muted)",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            AUG 2024
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth("2024-09")}
            style={{
              background: selectedMonth === "2024-09" ? "var(--case-surface-raised)" : "transparent",
              color: selectedMonth === "2024-09" ? "var(--ocean-color)" : "var(--case-text-muted)",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            SEP 2024
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth("both")}
            style={{
              background: selectedMonth === "both" ? "var(--case-surface-raised)" : "transparent",
              color: selectedMonth === "both" ? "var(--ocean-color)" : "var(--case-text-muted)",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Compare Both Months
          </button>
        </div>
      </div>

      {/* Ocean Thermal Graphic with Current Lines & Wave Cross-Section */}
      <div style={{ flex: 1, position: "relative", minHeight: "220px", marginTop: "16px" }}>
        <svg
          viewBox="0 0 500 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Subtle current lines */}
          <path
            d="M 10 50 C 90 40 180 65 270 50 S 430 40 490 55"
            stroke="rgba(108, 190, 197, 0.25)"
            strokeWidth="1.2"
          />
          <path
            d="M 20 90 C 110 80 190 105 300 90 S 420 85 480 95"
            stroke="rgba(108, 190, 197, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <path
            d="M 5 130 C 80 125 170 145 280 130 S 410 120 495 135"
            stroke="rgba(108, 190, 197, 0.2)"
            strokeWidth="1"
          />

          {/* Vertical measurement markers */}
          {/* Marker 1: August (27.72 C) -> x: 150 */}
          {/* Scale: 26 C -> 200, 29 C -> 40 */}
          {/* y = 200 - ((val - 26) / 3) * 160 */}
          {(() => {
            const augY = 200 - ((diffInfo.augVal - 26) / 3) * 160;
            const sepY = 200 - ((diffInfo.sepVal - 26) / 3) * 160;
            const isAugActive = selectedMonth === "2024-08" || selectedMonth === "both";
            const isSepActive = selectedMonth === "2024-09" || selectedMonth === "both";

            return (
              <g>
                {/* Connecting slope line */}
                <line
                  x1="150"
                  y1={augY}
                  x2="350"
                  y2={sepY}
                  stroke="rgba(218, 232, 229, 0.4)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* August Pillar */}
                <line
                  x1="150"
                  y1="220"
                  x2="150"
                  y2={augY}
                  stroke={isAugActive ? "var(--ocean-color)" : "rgba(108, 190, 197, 0.3)"}
                  strokeWidth={isAugActive ? "3" : "1.5"}
                />
                <circle
                  cx="150"
                  cy={augY}
                  r={isAugActive ? "7" : "5"}
                  fill={isAugActive ? "var(--ocean-color)" : "rgba(108, 190, 197, 0.5)"}
                  stroke="#08131B"
                  strokeWidth="2"
                />
                <text
                  x="150"
                  y={augY - 14}
                  fill={isAugActive ? "#F5F3EC" : "#82949B"}
                  fontSize="13"
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  27.72°C
                </text>
                <text
                  x="150"
                  y="235"
                  fill="var(--case-text-muted)"
                  fontSize="11"
                  textAnchor="middle"
                >
                  AUG 2024
                </text>

                {/* September Pillar */}
                <line
                  x1="350"
                  y1="220"
                  x2="350"
                  y2={sepY}
                  stroke={isSepActive ? "var(--ocean-color)" : "rgba(108, 190, 197, 0.3)"}
                  strokeWidth={isSepActive ? "3" : "1.5"}
                />
                <circle
                  cx="350"
                  cy={sepY}
                  r={isSepActive ? "7" : "5"}
                  fill={isSepActive ? "var(--ocean-color)" : "rgba(108, 190, 197, 0.5)"}
                  stroke="#08131B"
                  strokeWidth="2"
                />
                <text
                  x="350"
                  y={sepY - 14}
                  fill={isSepActive ? "#F5F3EC" : "#82949B"}
                  fontSize="13"
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  27.18°C
                </text>
                <text
                  x="350"
                  y="235"
                  fill="var(--case-text-muted)"
                  fontSize="11"
                  textAnchor="middle"
                >
                  SEP 2024
                </text>

                {/* Difference Callout */}
                <rect
                  x="215"
                  y={(augY + sepY) / 2 - 14}
                  width="70"
                  height="22"
                  rx="4"
                  fill="rgba(8, 19, 27, 0.9)"
                  stroke="rgba(218, 232, 229, 0.2)"
                />
                <text
                  x="250"
                  y={(augY + sepY) / 2 + 1}
                  fill="var(--case-accent)"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  -0.53°C
                </text>
              </g>
            );
          })()}

          {/* Bottom Layered Wave Cross-section */}
          <path
            d="M 0 210 Q 70 198 140 210 T 280 210 T 420 210 T 500 205 L 500 240 L 0 240 Z"
            fill="rgba(108, 190, 197, 0.12)"
          />
          <path
            d="M 0 220 Q 80 212 160 220 T 320 220 T 480 218 L 500 240 L 0 240 Z"
            fill="rgba(108, 190, 197, 0.2)"
          />
        </svg>
      </div>

      {/* Interpretation & Limitations Panels */}
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            background: "rgba(8, 19, 27, 0.65)",
            border: "1px solid var(--case-border)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--case-accent)",
              marginBottom: "4px",
            }}
          >
            WHAT WE LEARNED
          </div>
          <p style={{ fontSize: "12px", color: "var(--case-text-secondary)", margin: 0, lineHeight: 1.5 }}>
            These two months had similar warm coastal sea surface temperatures, but the
            small selection alone cannot establish whether either month was anomalous.
          </p>
        </div>

        <div
          style={{
            padding: "12px 14px",
            background: "rgba(8, 19, 27, 0.65)",
            border: "1px solid var(--case-border)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--case-highlight)",
              marginBottom: "4px",
            }}
          >
            SCIENTIFIC LIMITATION
          </div>
          <p style={{ fontSize: "12px", color: "var(--case-text-secondary)", margin: 0, lineHeight: 1.5 }}>
            Monthly, water-only regional observations do not independently measure the
            complete pre-landfall storm environment.
          </p>
        </div>
      </div>
    </div>
  );
}
