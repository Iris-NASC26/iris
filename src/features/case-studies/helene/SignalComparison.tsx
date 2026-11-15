"use client";

import React, { useState } from "react";
import { ScientificScene } from "./types";
import { heleneData } from "./heleneData";

export function SignalComparison() {
  const [varA, setVarA] = useState<ScientificScene>("rainfall");
  const [varB, setVarB] = useState<ScientificScene>("runoff");

  const variables = [
    { id: "rainfall" as ScientificScene, name: "Rainfall (Monthly Precipitation)", unit: "kg/m²", color: "var(--rain-color)" },
    { id: "runoff" as ScientificScene, name: "Runoff (Surface Runoff)", unit: "kg/m²", color: "var(--runoff-color)" },
    { id: "ocean" as ScientificScene, name: "Sea Surface Temperature", unit: "°C", color: "var(--ocean-color)" },
    { id: "soil" as ScientificScene, name: "Surface Soil Moisture", unit: "kg/m²", color: "var(--soil-color)" },
    { id: "wind" as ScientificScene, name: "Surface Wind Speed", unit: "m/s", color: "var(--wind-color)" },
  ];

  const handleSwap = () => {
    const temp = varA;
    setVarA(varB);
    setVarB(temp);
  };

  const handleReset = () => {
    setVarA("rainfall");
    setVarB("runoff");
  };

  // Helper to extract comparison card data for a given variable
  const getVariableCardData = (scene: ScientificScene) => {
    switch (scene) {
      case "rainfall": {
        const aug = heleneData.rainfall.observations[0].value;
        const sep = heleneData.rainfall.observations[1].value;
        const diff = sep - aug;
        const rel = (diff / aug) * 100;
        return {
          title: "Monthly Precipitation (NLDAS-2)",
          period: "August 2024 → September 2024",
          startVal: `${aug.toFixed(2)} kg/m²`,
          endVal: `${sep.toFixed(2)} kg/m²`,
          absDiff: `+${diff.toFixed(2)} kg/m²`,
          relDiff: `+${rel.toFixed(1)}%`,
          cadence: "Monthly Accumulation",
          notes: "Represents total atmospheric moisture arriving across the full bounding region over the calendar month.",
          canCompare: true,
          color: "var(--rain-color)",
        };
      }
      case "runoff": {
        const aug = heleneData.runoff.observations[0].value;
        const sep = heleneData.runoff.observations[1].value;
        const diff = sep - aug;
        const rel = (diff / aug) * 100;
        const ratio = sep / aug;
        return {
          title: "Surface Runoff (GLDAS Noah)",
          period: "August 2024 → September 2024",
          startVal: `${aug.toFixed(6)} kg/m²`,
          endVal: `${sep.toFixed(6)} kg/m²`,
          absDiff: `+${diff.toFixed(6)} kg/m²`,
          relDiff: `+${rel.toFixed(1)}% (${ratio.toFixed(2)}×)`,
          cadence: "Monthly Mean Rate",
          notes: "Simulated overland water flux. A 1.92× factor reflects soil capacity exceedance in the land-surface model.",
          canCompare: true,
          color: "var(--runoff-color)",
        };
      }
      case "ocean": {
        const aug = heleneData.ocean.observations[0].value;
        const sep = heleneData.ocean.observations[1].value;
        const diff = sep - aug;
        return {
          title: "Sea Surface Temperature (MODIS)",
          period: "August 2024 → September 2024",
          startVal: `${aug.toFixed(2)} °C`,
          endVal: `${sep.toFixed(2)} °C`,
          absDiff: `${diff.toFixed(2)} °C`,
          relDiff: `${((diff / aug) * 100).toFixed(1)}%`,
          cadence: "Monthly Nighttime Composite",
          notes: "Late-summer thermal background. Small cooling is consistent with seasonal transition and storm upwelling.",
          canCompare: true,
          color: "var(--ocean-color)",
        };
      }
      case "soil": {
        const d25 = heleneData.soil.observations[0].value;
        const d26 = heleneData.soil.observations[1].value;
        const diff = d26 - d25;
        const rel = (diff / d25) * 100;
        return {
          title: "Surface Soil Moisture (GLDAS CLSM)",
          period: "September 25 → September 26, 2024",
          startVal: `${d25.toFixed(2)} kg/m²`,
          endVal: `${d26.toFixed(2)} kg/m²`,
          absDiff: `+${diff.toFixed(2)} kg/m²`,
          relDiff: `+${rel.toFixed(1)}%`,
          cadence: "Daily Mean Estimate",
          notes: "Rapid 24-hour land response capturing infiltration right around storm landfall.",
          canCompare: true,
          color: "var(--soil-color)",
        };
      }
      case "wind": {
        const sep = heleneData.wind.observations[0].value;
        return {
          title: "Surface Wind Speed (MERRA-2)",
          period: "September 2024 (Single Monthly Observation)",
          startVal: "—",
          endVal: `${sep.toFixed(2)} m/s`,
          absDiff: "Unavailable",
          relDiff: "Unavailable",
          cadence: "Monthly Reanalysis Mean",
          notes: "Change comparison unavailable: curated selection contains a single monthly mean (4.79 m/s). Monthly averaging conceals momentary peak gusts.",
          canCompare: false,
          color: "var(--wind-color)",
        };
      }
    }
  };

  const cardA = getVariableCardData(varA);
  const cardB = getVariableCardData(varB);

  return (
    <section className="helene-section" id="compare-signals">
      <div className="helene-container">
        <div>
          <div className="helene-eyebrow">MULTIVARIATE EVIDENCE LAB</div>
          <h2 className="helene-chapter-heading helene-serif">
            Different Measurements. Shared Context.
          </h2>
          <p className="helene-body-text" style={{ maxWidth: "680px" }}>
            Compare the available evidence without implying that unrelated physical
            quantities share the same scale. Each Earth-system product maintains its
            native units and observational cadence.
          </p>
        </div>

        {/* Toolbar controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "32px",
            padding: "16px 20px",
            background: "var(--case-surface)",
            border: "1px solid var(--case-border)",
            borderRadius: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Variable A Dropdown */}
            <div>
              <span style={{ fontSize: "11px", color: "var(--case-text-muted)", display: "block" }}>
                VARIABLE A:
              </span>
              <select
                value={varA}
                onChange={(e) => setVarA(e.target.value as ScientificScene)}
                style={{
                  background: "var(--case-surface-raised)",
                  color: "var(--case-text)",
                  border: "1px solid var(--case-border)",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
                aria-label="Select Variable A"
              >
                {variables.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.id === varB}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwap}
              style={{
                alignSelf: "flex-end",
                background: "transparent",
                border: "1px solid var(--case-border)",
                color: "var(--case-accent)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Swap variables"
            >
              ⇄ Swap
            </button>

            {/* Variable B Dropdown */}
            <div>
              <span style={{ fontSize: "11px", color: "var(--case-text-muted)", display: "block" }}>
                VARIABLE B:
              </span>
              <select
                value={varB}
                onChange={(e) => setVarB(e.target.value as ScientificScene)}
                style={{
                  background: "var(--case-surface-raised)",
                  color: "var(--case-text)",
                  border: "1px solid var(--case-border)",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
                aria-label="Select Variable B"
              >
                {variables.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.id === varA}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            style={{
              background: "transparent",
              color: "var(--case-text-muted)",
              border: "1px solid var(--case-border)",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Reset Default (Rainfall vs Runoff)
          </button>
        </div>

        {/* Two Comparison Columns */}
        <div className="helene-comparison-grid">
          {/* Column A */}
          <div className="helene-compare-col" style={{ borderTop: `3px solid ${cardA.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: cardA.color }}>
                  COLUMN A
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginTop: "4px" }}>
                  {cardA.title}
                </h3>
              </div>
              <span
                style={{
                  fontSize: "10.5px",
                  padding: "3px 8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "4px",
                  color: "var(--case-text-muted)",
                }}
              >
                {cardA.cadence}
              </span>
            </div>

            <div style={{ fontSize: "12px", color: "var(--case-text-muted)", marginBottom: "20px" }}>
              Timeframe: <strong style={{ color: "var(--case-text)" }}>{cardA.period}</strong>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div style={{ padding: "12px", background: "var(--case-surface-raised)", borderRadius: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>Initial State</span>
                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "monospace", marginTop: "2px" }}>
                  {cardA.startVal}
                </div>
              </div>
              <div style={{ padding: "12px", background: "var(--case-surface-raised)", borderRadius: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>Target State</span>
                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "monospace", marginTop: "2px", color: cardA.color }}>
                  {cardA.endVal}
                </div>
              </div>
            </div>

            {cardA.canCompare ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  padding: "14px",
                  background: "rgba(8, 19, 27, 0.6)",
                  borderRadius: "8px",
                  border: "1px solid var(--case-border)",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>Absolute Shift</span>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--case-accent)", fontFamily: "monospace" }}>
                    {cardA.absDiff}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>Relative Shift</span>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--case-text)", fontFamily: "monospace" }}>
                    {cardA.relDiff}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "14px",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "8px",
                  border: "1px dashed var(--case-border)",
                  fontSize: "12px",
                  color: "var(--case-text-muted)",
                  marginBottom: "20px",
                }}
              >
                Temporal Change Unavailable (Single Observation in Curated Selection)
              </div>
            )}

            <p style={{ fontSize: "13px", color: "var(--case-text-secondary)", lineHeight: 1.6, margin: 0 }}>
              {cardA.notes}
            </p>
          </div>

          {/* Column B */}
          <div className="helene-compare-col" style={{ borderTop: `3px solid ${cardB.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: cardB.color }}>
                  COLUMN B
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginTop: "4px" }}>
                  {cardB.title}
                </h3>
              </div>
              <span
                style={{
                  fontSize: "10.5px",
                  padding: "3px 8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "4px",
                  color: "var(--case-text-muted)",
                }}
              >
                {cardB.cadence}
              </span>
            </div>

            <div style={{ fontSize: "12px", color: "var(--case-text-muted)", marginBottom: "20px" }}>
              Timeframe: <strong style={{ color: "var(--case-text)" }}>{cardB.period}</strong>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div style={{ padding: "12px", background: "var(--case-surface-raised)", borderRadius: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>Initial State</span>
                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "monospace", marginTop: "2px" }}>
                  {cardB.startVal}
                </div>
              </div>
              <div style={{ padding: "12px", background: "var(--case-surface-raised)", borderRadius: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>Target State</span>
                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "monospace", marginTop: "2px", color: cardB.color }}>
                  {cardB.endVal}
                </div>
              </div>
            </div>

            {cardB.canCompare ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  padding: "14px",
                  background: "rgba(8, 19, 27, 0.6)",
                  borderRadius: "8px",
                  border: "1px solid var(--case-border)",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>Absolute Shift</span>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--case-accent)", fontFamily: "monospace" }}>
                    {cardB.absDiff}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>Relative Shift</span>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--case-text)", fontFamily: "monospace" }}>
                    {cardB.relDiff}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "14px",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "8px",
                  border: "1px dashed var(--case-border)",
                  fontSize: "12px",
                  color: "var(--case-text-muted)",
                  marginBottom: "20px",
                }}
              >
                Temporal Change Unavailable (Single Observation in Curated Selection)
              </div>
            )}

            <p style={{ fontSize: "13px", color: "var(--case-text-secondary)", lineHeight: 1.6, margin: 0 }}>
              {cardB.notes}
            </p>
          </div>
        </div>

        {/* Methodological footnote */}
        <div
          style={{
            marginTop: "24px",
            fontSize: "12px",
            color: "var(--case-text-muted)",
            textAlign: "center",
          }}
        >
          Methodological principle: Environmental variables with distinct dimensions
          and physical scales are never combined into arbitrary unified axes.
        </div>
      </div>
    </section>
  );
}
