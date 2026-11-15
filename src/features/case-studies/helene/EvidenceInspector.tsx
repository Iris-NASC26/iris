"use client";

import React from "react";
import { TimelineStop } from "./types";
import { heleneData } from "./heleneData";

interface EvidenceInspectorProps {
  currentStop: TimelineStop;
  onFocusSep26: () => void;
  onReplaySoil: () => void;
}

export function EvidenceInspector({
  currentStop,
  onFocusSep26,
  onReplaySoil,
}: EvidenceInspectorProps) {
  const getStopValues = (dateKey: string) => {
    // Check observations for each indicator
    let ocean: { val: string; cadence: string; note?: string } = {
      val: "Not available in curated selection",
      cadence: "Monthly",
    };
    let rain: { val: string; cadence: string } = {
      val: "Not available in curated selection",
      cadence: "Monthly",
    };
    let soil: { val: string; cadence: string } = {
      val: "Not available in curated selection",
      cadence: "Daily",
    };
    let runoff: { val: string; cadence: string } = {
      val: "Not available in curated selection",
      cadence: "Monthly",
    };
    let wind: { val: string; cadence: string } = {
      val: "Not available in curated selection",
      cadence: "Monthly",
    };

    if (dateKey === "2024-08") {
      ocean = { val: `${heleneData.ocean.observations[0].value.toFixed(2)} °C`, cadence: "Monthly (Reported)" };
      rain = { val: `${heleneData.rainfall.observations[0].value.toFixed(2)} kg/m²`, cadence: "Monthly Total" };
      runoff = { val: `${heleneData.runoff.observations[0].value.toFixed(6)} kg/m²`, cadence: "Monthly Mean" };
    } else if (dateKey === "2024-10") {
      rain = { val: `${heleneData.rainfall.observations[2].value.toFixed(2)} kg/m²`, cadence: "Monthly Total" };
      runoff = { val: `${heleneData.runoff.observations[2].value.toFixed(6)} kg/m²`, cadence: "Monthly Mean" };
    } else if (dateKey.startsWith("2024-09")) {
      // September monthlies provide background for all September dates
      ocean = {
        val: `${heleneData.ocean.observations[1].value.toFixed(2)} °C`,
        cadence: "September Monthly",
        note: "Source-period mapping caveat",
      };
      rain = { val: `${heleneData.rainfall.observations[1].value.toFixed(2)} kg/m²`, cadence: "September Monthly" };
      runoff = { val: `${heleneData.runoff.observations[1].value.toFixed(6)} kg/m²`, cadence: "September Monthly" };
      wind = { val: `${heleneData.wind.observations[0].value.toFixed(2)} m/s`, cadence: "September Monthly Mean" };

      // Daily soil observation
      const s = heleneData.soil.observations.find((o) => o.date === dateKey);
      if (s) {
        soil = { val: `${s.value.toFixed(2)} kg/m²`, cadence: "Daily Observation" };
      }
    }

    return { ocean, rain, soil, runoff, wind };
  };

  const values = getStopValues(currentStop.dateKey);

  const getExplanation = () => {
    if (currentStop.dateKey === "2024-09-26") {
      return "Only the surface-soil moisture record provides a daily measurement for this selected date. The other visible values summarize the larger monthly period.";
    }
    if (currentStop.dateKey === "2024-09-25") {
      return "Pre-landfall daily land measurement shows base topsoil moisture at 6.65 kg/m² before the main storm surge arrival.";
    }
    if (currentStop.dateKey === "2024-09-27") {
      return "Post-landfall land-surface estimate remains elevated at 7.59 kg/m², demonstrating lingering moisture saturation.";
    }
    if (currentStop.dateKey === "2024-08") {
      return "Late-summer antecedent context with typical warm coastal SST (27.72°C) and moderate regional baseline rainfall (138.53 kg/m²).";
    }
    return "Autumn post-event window. Rainfall collapses to 18.73 kg/m² and modeled runoff recedes sharply across the Southeast.";
  };

  return (
    <aside className="helene-timeline-inspector" aria-label="Evidence Inspector">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--case-accent)",
          }}
        >
          EVIDENCE INSPECTOR
        </span>
        <span
          style={{
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "4px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--case-border)",
            color: "var(--case-text-muted)",
          }}
        >
          Stop {currentStop.id + 1} of 5
        </span>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: 600, color: "var(--case-text)", marginBottom: "4px" }}>
          {currentStop.label}
        </h3>
        <span style={{ fontSize: "12px", color: "var(--case-text-muted)", textTransform: "uppercase" }}>
          {currentStop.sublabel}
        </span>
      </div>

      {/* Measurement Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "22px" }}>
        {[
          { label: "Ocean SST", val: values.ocean.val, cadence: values.ocean.cadence, color: "var(--ocean-color)" },
          { label: "Rainfall", val: values.rain.val, cadence: values.rain.cadence, color: "var(--rain-color)" },
          { label: "Soil Moisture", val: values.soil.val, cadence: values.soil.cadence, color: "var(--soil-color)" },
          { label: "Surface Runoff", val: values.runoff.val, cadence: values.runoff.cadence, color: "var(--runoff-color)" },
          { label: "Surface Wind", val: values.wind.val, cadence: values.wind.cadence, color: "var(--wind-color)" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: "8px 12px",
              background: "var(--case-surface)",
              borderRadius: "6px",
              border: "1px solid var(--case-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
              <span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span>
              <span style={{ color: "var(--case-text-muted)", fontSize: "10px" }}>{item.cadence}</span>
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: item.val.includes("Not available") ? "var(--case-text-muted)" : "var(--case-text)",
                fontFamily: item.val.includes("Not available") ? "inherit" : "monospace",
              }}
            >
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {/* Plain Language Explanation */}
      <div
        style={{
          padding: "14px",
          background: "rgba(209, 123, 96, 0.08)",
          borderLeft: "3px solid var(--case-highlight)",
          borderRadius: "0 6px 6px 0",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--case-highlight)", marginBottom: "4px" }}>
          TEMPORAL RESOLUTION NOTE
        </div>
        <p style={{ fontSize: "13px", color: "var(--case-text-secondary)", lineHeight: 1.55, margin: 0 }}>
          {getExplanation()}
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          type="button"
          className="helene-btn-secondary"
          onClick={onFocusSep26}
          style={{ width: "100%", justifyContent: "center", fontSize: "12px", padding: "8px" }}
        >
          Focus on Sep 26
        </button>
        <button
          type="button"
          className="helene-btn-secondary"
          onClick={onReplaySoil}
          style={{ width: "100%", justifyContent: "center", fontSize: "12px", padding: "8px" }}
        >
          Replay the Daily Soil Change
        </button>
      </div>
    </aside>
  );
}
