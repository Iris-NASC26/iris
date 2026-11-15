"use client";

import React from "react";
import { EarthSystemOrbit } from "./EarthSystemOrbit";

interface HeleneHeroProps {
  onBeginInvestigation: () => void;
  onExploreEvidence: () => void;
  onSelectScene: (sceneId: string) => void;
}

export function HeleneHero({
  onBeginInvestigation,
  onExploreEvidence,
  onSelectScene,
}: HeleneHeroProps) {
  return (
    <section className="helene-section helene-section-hero" id="hero">
      <div className="helene-container">
        <div className="helene-split-grid">
          {/* Left Narrative Column (52%) */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div className="helene-eyebrow">
              EARTH SYSTEM DETECTIVE / INVESTIGATION 2024
            </div>

            <h1 className="helene-hero-title helene-serif">
              Hurricane Helene:
            </h1>

            <div className="helene-hero-subtitle helene-serif">
              Following the Water Inland.
            </div>

            <p className="helene-hero-desc">
              Five environmental signals reveal how the ocean, atmosphere and land
              behaved around September 2024—and why understanding a storm
              requires more than one dataset.
            </p>

            <div className="helene-hero-meta helene-tabular">
              SEPTEMBER 2024 / SOUTHEASTERN UNITED STATES / 5 NASA GIOVANNI PRODUCTS
            </div>

            <div className="helene-btn-group">
              <button
                type="button"
                className="helene-btn-primary"
                onClick={onBeginInvestigation}
              >
                Begin Investigation
              </button>
              <button
                type="button"
                className="helene-btn-secondary"
                onClick={onExploreEvidence}
              >
                Explore the Evidence
              </button>
            </div>
          </div>

          {/* Right Illustration Column (48%) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <EarthSystemOrbit onSelectScene={onSelectScene} />
          </div>
        </div>

        {/* Bottom subtle divider and scroll prompt */}
        <div
          style={{
            marginTop: "80px",
            paddingTop: "24px",
            borderTop: "1px solid var(--case-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              color: "var(--case-text-muted)",
              textTransform: "uppercase",
            }}
          >
            SCROLL TO FOLLOW THE EVIDENCE
          </span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--case-text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}
