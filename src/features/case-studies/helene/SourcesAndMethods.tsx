"use client";

import React from "react";

export function SourcesAndMethods() {
  const sources = [
    {
      variable: "Ocean Sea Surface Temperature",
      product: "MODISA_L3m_NSST_Monthly_9km_R2019_0_sst",
      provider: "NASA GSFC / Giovanni",
      unit: "°C",
      cadence: "Monthly",
      resolution: "Approximately 9 km",
      coverage: "Global Oceans (Curated Bounding Box)",
      color: "var(--ocean-color)",
    },
    {
      variable: "Monthly Precipitation",
      product: "NLDAS_NOAH0125_M_2_0_Rainf",
      provider: "NASA GSFC / NLDAS-2",
      unit: "kg/m²",
      cadence: "Monthly Accumulation",
      resolution: "0.125° (~12.5 km)",
      coverage: "North America Land Domain",
      color: "var(--rain-color)",
    },
    {
      variable: "Surface Soil Moisture",
      product: "GLDAS_CLSM025_DA1_D_2_2_SoilMoist_S_tavg",
      provider: "NASA GSFC / GLDAS-2.2",
      unit: "kg/m²",
      cadence: "Daily Mean",
      resolution: "0.25° (~25 km)",
      coverage: "Global Land",
      color: "var(--soil-color)",
    },
    {
      variable: "Surface Runoff",
      product: "GLDAS_NOAH025_M_2_1_Qs_acc",
      provider: "NASA GSFC / GLDAS-2.1",
      unit: "kg/m²",
      cadence: "Monthly Total / Mean",
      resolution: "0.25° (~25 km)",
      coverage: "Global Land",
      color: "var(--runoff-color)",
    },
    {
      variable: "Surface Wind Speed",
      product: "M2TMNXFLX_5_12_4_SPEED",
      provider: "NASA GMAO / MERRA-2",
      unit: "m/s",
      cadence: "Monthly Mean",
      resolution: "0.5° × 0.625°",
      coverage: "Global Atmosphere",
      color: "var(--wind-color)",
    },
  ];

  return (
    <section className="helene-section" id="sources">
      <div className="helene-container">
        <div>
          <div className="helene-eyebrow">DATA PROVENANCE</div>
          <h2 className="helene-chapter-heading helene-serif">
            Trace the Evidence.
          </h2>
          <p className="helene-body-text" style={{ maxWidth: "680px" }}>
            NASA Giovanni provides a unified platform to access and analyze Earth-system
            gridded datasets from satellites, airborne platforms, and reanalyses.
          </p>
        </div>

        {/* Five Compact Dataset Records */}
        <div className="helene-sources-grid">
          {sources.map((src) => (
            <div
              key={src.product}
              className="helene-source-card"
              style={{ borderTop: `2px solid ${src.color}` }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: src.color, marginBottom: "4px" }}>
                {src.cadence.toUpperCase()}
              </div>
              <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--case-text)", marginBottom: "8px" }}>
                {src.variable}
              </h4>
              <div
                style={{
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "var(--case-accent)",
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  marginBottom: "12px",
                  wordBreak: "break-all",
                }}
              >
                {src.product}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "var(--case-text-muted)" }}>Provider: </span>
                  <span style={{ color: "var(--case-text-secondary)" }}>{src.provider}</span>
                </div>
                <div>
                  <span style={{ color: "var(--case-text-muted)" }}>Resolution: </span>
                  <span style={{ color: "var(--case-text-secondary)" }}>{src.resolution}</span>
                </div>
                <div>
                  <span style={{ color: "var(--case-text-muted)" }}>Native Unit: </span>
                  <span style={{ color: "var(--case-text-secondary)", fontFamily: "monospace" }}>{src.unit}</span>
                </div>
                <div>
                  <span style={{ color: "var(--case-text-muted)" }}>Coverage: </span>
                  <span style={{ color: "var(--case-text-secondary)" }}>{src.coverage}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* NASA Giovanni Link */}
        <div style={{ marginTop: "32px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: "var(--case-text-muted)" }}>Primary data portal:</span>
          <a
            href="https://giovanni.gsfc.nasa.gov/giovanni/"
            target="_blank"
            rel="noopener noreferrer"
            className="helene-btn-secondary"
            style={{ fontSize: "12px", padding: "6px 14px" }}
          >
            NASA Giovanni Data System ↗
          </a>
        </div>

        {/* Prominent Data Scope Disclaimer */}
        <div
          style={{
            marginTop: "36px",
            padding: "20px 24px",
            background: "rgba(209, 123, 96, 0.08)",
            border: "1px solid rgba(209, 123, 96, 0.3)",
            borderRadius: "10px",
            maxWidth: "860px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--case-highlight)", marginBottom: "6px" }}>
            DATA-SCOPE DISCLAIMER
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--case-text-secondary)", lineHeight: 1.6, margin: 0 }}>
            This interactive experience uses a curated selection of observations from NASA
            Giovanni area-averaged products. It is not the complete multi-year dataset
            and does not provide storm-specific attribution or prediction.
          </p>
        </div>
      </div>
    </section>
  );
}
