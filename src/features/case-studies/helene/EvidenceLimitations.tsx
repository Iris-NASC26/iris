"use client";

import React, { useState } from "react";

export function EvidenceLimitations() {
  const [openIndex, setOpenIndex] = useState<number>(0); // First open by default

  const topics = [
    {
      title: "Spatial Averaging & Grid Homogenization",
      summary:
        "The datasets used here represent regional averages across an area spanning 84.5°W–81.0°W and 29.0°N–36.5°N. Spatial averaging compresses steep geographic gradients—such as orographic rainfall enhancement along the Blue Ridge Mountains—into a single composite regional number.",
    },
    {
      title: "Daily versus Monthly Temporal Resolution",
      summary:
        "A monthly accumulation (like NLDAS-2 precipitation) records the total water arriving over 30 days, smoothing out whether rain fell in two catastrophic hours or spread evenly over weeks. Conversely, daily products (like GLDAS soil moisture) isolate rapid step changes, but remain discrete snapshots that miss sub-daily surge dynamics.",
    },
    {
      title: "Different Physical Quantities & Dimensions",
      summary:
        "Precipitation (mass of incoming atmospheric flux), soil moisture (stored water mass per surface unit), runoff (overland flux rate), and wind speed (vector magnitude) possess distinct physical mechanics. They cannot be placed on a common mathematical scale or directly subtracted from one another.",
    },
    {
      title: "Land-Surface Models versus Satellite Remote Sensing",
      summary:
        "MODIS-Aqua provides direct thermal infrared radiometric retrievals of ocean skin temperature. By contrast, GLDAS Noah and CLSM are numerical land-surface models forced by meteorological analyses. Modeled runoff reflects land parameterization equations, not physical stream gauge readings in local riverbeds.",
    },
    {
      title: "Curated Window vs Long-Term Historical Climatology",
      summary:
        "The three-month sample (August, September, October 2024) illustrates contrast within a single late-summer season. It does not constitute a multi-decadal climatological baseline, and no statistical return periods or long-term trend significance p-values should be inferred from this isolated window alone.",
    },
    {
      title: "Correlation versus Physical Causation",
      summary:
        "Concurrent spikes in rainfall, soil moisture, and runoff during late September demonstrate temporal alignment within the Earth system. However, correlation across area-averaged metrics does not prove localized causal mechanisms of infrastructure failure or hillside destabilization without catchment-scale hydrological models.",
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? -1 : idx));
  };

  return (
    <section className="helene-section" id="limitations">
      <div className="helene-container">
        <div>
          <div className="helene-eyebrow">OBSERVATIONAL INTEGRITY</div>
          <h2 className="helene-chapter-heading helene-serif">
            The limits are part of the discovery.
          </h2>
          <p className="helene-body-text" style={{ maxWidth: "680px" }}>
            Every Earth-system dataset is defined by its spatial domain, sampling
            frequency, and physical assumptions. Transparent science treats
            methodological boundaries as foundational context.
          </p>
        </div>

        <div style={{ marginTop: "40px", borderTop: "1px solid var(--case-border)" }}>
          {topics.map((t, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={t.title} className="helene-accordion-item">
                <button
                  type="button"
                  className="helene-accordion-btn"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--case-accent)" }}>
                      0{idx + 1}
                    </span>
                    <span>{t.title}</span>
                  </span>
                  <span
                    style={{
                      fontSize: "18px",
                      color: isOpen ? "var(--case-highlight)" : "var(--case-text-muted)",
                      transform: isOpen ? "rotate(45deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="helene-accordion-content">
                    <p style={{ maxWidth: "800px", margin: 0 }}>{t.summary}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
