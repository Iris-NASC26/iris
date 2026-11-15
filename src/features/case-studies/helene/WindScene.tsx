"use client";

import React, { useState } from "react";
import { heleneData } from "./heleneData";

export function WindScene() {
  const [eventType, setEventType] = useState<"short" | "medium" | "long">("short");
  const windVal = heleneData.wind.observations[0].value; // 4.79129171 m/s

  // Conceptual interval for 30 days
  // Short: Day 26-27 (2 days)
  // Medium: Day 24-28 (5 days)
  // Long: Day 20-30 (11 days)
  const getInterval = () => {
    switch (eventType) {
      case "short":
        return { start: 26, end: 27, label: "Short Event (2 Days: Landfall window)" };
      case "medium":
        return { start: 24, end: 28, label: "Medium Event (5 Days: Pre-storm to decay)" };
      case "long":
        return { start: 20, end: 30, label: "Long Event (11 Days: Extended system)" };
    }
  };

  const interval = getInterval();

  return (
    <div className="helene-viz-frame" style={{ background: "#16141e" }}>
      {/* Header Metric */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--wind-color)",
              textTransform: "uppercase",
            }}
          >
            NASA MERRA-2 SURFACE WIND SPEED
          </span>
          <div className="helene-big-metric">
            {windVal.toFixed(2)} m/s
          </div>
          <div style={{ fontSize: "12px", color: "var(--case-text-muted)" }}>
            Observed: September 2024 Monthly Regional Mean (~17.2 km/h)
          </div>
        </div>

        {/* Temporal averaging experiment controls */}
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              display: "block",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "var(--case-accent)",
              marginBottom: "4px",
            }}
          >
            EXPLAIN TEMPORAL AVERAGING:
          </span>
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
            {(["short", "medium", "long"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEventType(type)}
                style={{
                  background: eventType === type ? "var(--case-surface-raised)" : "transparent",
                  color: eventType === type ? "var(--wind-color)" : "var(--case-text-muted)",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Atmospheric Streamlines (Upper) + Calendar Strip (Lower) */}
      <div style={{ flex: 1, position: "relative", minHeight: "220px", marginTop: "16px" }}>
        <svg
          viewBox="0 0 500 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Upper Region: Fine atmospheric streamlines */}
          <g>
            <path
              d="M 20 40 C 120 25 240 55 360 35 S 460 20 490 30"
              stroke="var(--wind-color)"
              strokeWidth="1.2"
              strokeDasharray="8 4"
              strokeOpacity="0.6"
            />
            <path
              d="M 10 70 C 140 60 220 85 340 65 S 450 60 495 70"
              stroke="var(--wind-color)"
              strokeWidth="1.6"
              strokeDasharray="12 4"
              strokeOpacity="0.8"
            />
            <path
              d="M 30 100 C 160 90 260 110 370 95 S 470 90 500 100"
              stroke="var(--wind-color)"
              strokeWidth="1.2"
              strokeDasharray="6 3"
              strokeOpacity="0.5"
            />

            {/* Streamline direction chevrons */}
            <path d="M 260 62 L 268 67 L 260 72" stroke="var(--wind-color)" strokeWidth="1.5" strokeOpacity="0.8" />
            <path d="M 400 32 L 408 36 L 400 40" stroke="var(--wind-color)" strokeWidth="1.2" strokeOpacity="0.6" />
          </g>

          {/* Lower Region: 30 Conceptual Day Cells (September Calendar Strip) */}
          <g transform="translate(15, 130)">
            <rect
              x="0"
              y="0"
              width="470"
              height="65"
              rx="6"
              fill="rgba(8, 19, 27, 0.85)"
              stroke="rgba(218, 232, 229, 0.15)"
            />
            <text x="12" y="16" fill="var(--case-text-muted)" fontSize="9.5" fontWeight="600">
              SEPTEMBER (30 DAYS) TEMPORAL WINDOW
            </text>

            {/* Render 30 cell blocks */}
            {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
              const cellWidth = 13.8;
              const cellX = 12 + (day - 1) * cellWidth + (day - 1) * 1.5;
              const isHighlight = day >= interval.start && day <= interval.end;

              return (
                <g key={day}>
                  <rect
                    x={cellX}
                    y="24"
                    width={cellWidth}
                    height="28"
                    rx="2"
                    fill={isHighlight ? "var(--case-highlight)" : "rgba(218, 232, 229, 0.08)"}
                    stroke={isHighlight ? "#D17B60" : "rgba(218, 232, 229, 0.12)"}
                    strokeWidth="1"
                    style={{ transition: "all 0.25s ease" }}
                  />
                  {day % 5 === 0 && (
                    <text
                      x={cellX + cellWidth / 2}
                      y="60"
                      fill="var(--case-text-muted)"
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {day}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Caption */}
          <text
            x="485"
            y="214"
            fill="var(--case-text-muted)"
            fontSize="8.5"
            textAnchor="end"
            fontFamily="system-ui, sans-serif"
          >
            Conceptual illustration of monthly averaging. This is not a reconstruction of Helene&apos;s hourly wind record.
          </text>
        </svg>
      </div>

      {/* Insight Annotation Footer */}
      <div
        style={{
          marginTop: "12px",
          padding: "10px 14px",
          background: "rgba(8, 19, 27, 0.75)",
          border: "1px solid var(--case-border)",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ fontSize: "12px", color: "var(--case-text-secondary)" }}>
          Active Experiment: <strong>{interval.label}</strong>
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--case-accent)",
            fontWeight: 600,
            fontStyle: "italic",
          }}
        >
          &ldquo;A monthly mean is not a storm-intensity measurement.&rdquo;
        </div>
      </div>
    </div>
  );
}
