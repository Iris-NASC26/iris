"use client";

import React, { useState } from "react";
import { ScientificScene } from "./types";

interface EvidenceSignalIndexProps {
  onSelectChapter: (scene: ScientificScene) => void;
}

export function EvidenceSignalIndex({ onSelectChapter }: EvidenceSignalIndexProps) {
  const [hoveredSignal, setHoveredSignal] = useState<string | null>(null);

  const signals = [
    {
      id: "ocean" as ScientificScene,
      num: "01",
      category: "OCEAN",
      title: "Sea Surface Temperature",
      role: "Late-summer coastal thermal context.",
      metric: "27.72°C / AUGUST 2024",
      color: "var(--ocean-color)",
    },
    {
      id: "rainfall" as ScientificScene,
      num: "02",
      category: "RAIN",
      title: "Monthly Precipitation",
      role: "Water arriving across the study region.",
      metric: "212.52 kg/m² / SEPTEMBER 2024",
      color: "var(--rain-color)",
    },
    {
      id: "soil" as ScientificScene,
      num: "03",
      category: "SOIL",
      title: "Surface Soil Moisture",
      role: "A rapid daily change in the land-surface estimate.",
      metric: "+1.02 kg/m² / SEPTEMBER 25–26",
      color: "var(--soil-color)",
    },
    {
      id: "runoff" as ScientificScene,
      num: "04",
      category: "RUNOFF",
      title: "Surface Runoff",
      role: "Modeled water movement across land.",
      metric: "1.92× / SEPTEMBER VS AUGUST",
      color: "var(--runoff-color)",
    },
    {
      id: "wind" as ScientificScene,
      num: "05",
      category: "WIND",
      title: "Regional Wind Speed",
      role: "The effect of averaging atmospheric observations.",
      metric: "4.79 m/s / SEPTEMBER 2024",
      color: "var(--wind-color)",
    },
  ];

  const renderMaterialIllustration = (id: ScientificScene) => {
    switch (id) {
      case "ocean":
        return (
          <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
            <path
              d="M 0 12 Q 30 6 60 12 T 120 12 M 0 24 Q 30 18 60 24 T 120 24 M 0 34 Q 30 28 60 34 T 120 34"
              stroke="var(--ocean-color)"
              strokeWidth="1.2"
              strokeOpacity="0.75"
              fill="none"
            />
          </svg>
        );
      case "rainfall":
        return (
          <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
            {[10, 26, 42, 58, 74, 90, 106].map((x, i) => (
              <line
                key={x}
                x1={x}
                y1={4 + (i % 3) * 4}
                x2={x - 4}
                y2={34}
                stroke="var(--rain-color)"
                strokeWidth="1.2"
                strokeDasharray="4 6"
                strokeOpacity="0.8"
              />
            ))}
          </svg>
        );
      case "soil":
        return (
          <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
            <rect x="0" y="4" width="120" height="8" fill="#5A4D41" fillOpacity="0.4" />
            <rect x="0" y="14" width="120" height="10" fill="#43382F" fillOpacity="0.5" />
            <rect x="0" y="26" width="120" height="12" fill="#322923" fillOpacity="0.6" />
            <line x1="0" y1="13" x2="120" y2="13" stroke="var(--soil-color)" strokeWidth="0.8" strokeOpacity="0.6" />
            <line x1="0" y1="25" x2="120" y2="25" stroke="var(--soil-color)" strokeWidth="0.8" strokeOpacity="0.4" />
          </svg>
        );
      case "runoff":
        return (
          <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
            <path
              d="M 10 10 Q 40 20 70 14 T 115 32 M 35 18 Q 60 26 90 28 T 115 38"
              stroke="var(--runoff-color)"
              strokeWidth="1.4"
              strokeOpacity="0.7"
              fill="none"
            />
          </svg>
        );
      case "wind":
        return (
          <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
            <path
              d="M 5 12 C 40 10 80 16 115 12 M 20 22 C 55 20 75 25 110 22 M 10 32 C 45 30 85 34 118 30"
              stroke="var(--wind-color)"
              strokeWidth="1.2"
              strokeOpacity="0.7"
              strokeDasharray="6 3"
              fill="none"
            />
          </svg>
        );
    }
  };

  return (
    <section className="helene-section" id="five-signals">
      <div className="helene-container">
        <div>
          <div className="helene-eyebrow">THE EVIDENCE SIGNALS</div>
          <h2 className="helene-section-heading helene-serif">
            The Earth left five kinds of evidence.
          </h2>
          <p className="helene-body-text" style={{ maxWidth: "660px" }}>
            Five environmental products, each with a different physical meaning and
            temporal resolution.
          </p>
        </div>

        <div className="helene-signal-rows" role="list">
          {signals.map((sig) => {
            const isHovered = hoveredSignal === sig.id;
            return (
              <div
                key={sig.id}
                className="helene-signal-row"
                onMouseEnter={() => setHoveredSignal(sig.id)}
                onMouseLeave={() => setHoveredSignal(null)}
                onClick={() => onSelectChapter(sig.id)}
                role="listitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectChapter(sig.id);
                  }
                }}
                aria-label={`Explore ${sig.title}`}
              >
                <div className="helene-signal-num">{sig.num}</div>
                <div className="helene-signal-tag" style={{ color: sig.color }}>
                  {sig.category}
                </div>
                <div className="helene-signal-main">
                  <h4>{sig.title}</h4>
                  <p>{sig.role}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "16px" }}>
                  <div
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transform: isHovered ? "translateX(0)" : "translateX(10px)",
                      transition: "opacity 0.25s ease, transform 0.25s ease",
                    }}
                  >
                    {renderMaterialIllustration(sig.id)}
                  </div>
                  <div className="helene-signal-metric helene-tabular">
                    {sig.metric}
                  </div>
                </div>
                <div className="helene-signal-arrow">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
