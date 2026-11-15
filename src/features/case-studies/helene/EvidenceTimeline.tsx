"use client";

import React, { useState, useEffect, useRef } from "react";
import { TimelineStop } from "./types";
import { heleneData } from "./heleneData";
import { EvidenceInspector } from "./EvidenceInspector";

export function EvidenceTimeline() {
  const [currentStopIndex, setCurrentStopIndex] = useState(2); // Default: Sep 26
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);

  const stops: TimelineStop[] = [
    {
      id: 0,
      label: "August 2024",
      sublabel: "Monthly Baseline Context",
      dateKey: "2024-08",
      type: "monthly",
      narrative: "Antecedent late-summer conditions across the Gulf and Southeastern Atlantic.",
    },
    {
      id: 1,
      label: "September 25, 2024",
      sublabel: "Daily Pre-Landfall Observation",
      dateKey: "2024-09-25",
      type: "daily",
      narrative: "Day prior to Helene's Florida landfall; daily land-surface moisture baseline.",
    },
    {
      id: 2,
      label: "September 26, 2024",
      sublabel: "Daily Landfall Window",
      dateKey: "2024-09-26",
      type: "daily",
      narrative: "Helene makes landfall in Big Bend region, FL; rapid daily topsoil moisture jump.",
    },
    {
      id: 3,
      label: "September 27, 2024",
      sublabel: "Daily Post-Landfall Window",
      dateKey: "2024-09-27",
      type: "daily",
      narrative: "Storm tracks inland across GA and the Southern Appalachians; sustained moisture.",
    },
    {
      id: 4,
      label: "October 2024",
      sublabel: "Post-Event Monthly Context",
      dateKey: "2024-10",
      type: "monthly",
      narrative: "Sharp transition to dry autumn conditions across the Southeastern study region.",
    },
  ];

  const currentStop = stops[currentStopIndex];

  // Auto-play timeline timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 2400 / playbackSpeed;
    const timer = setInterval(() => {
      setCurrentStopIndex((prev) => (prev + 1) % stops.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, stops.length]);

  const handleNext = () => {
    setCurrentStopIndex((prev) => Math.min(stops.length - 1, prev + 1));
  };

  const handlePrev = () => {
    setCurrentStopIndex((prev) => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStopIndex(0);
  };

  const handleFocusSep26 = () => {
    setIsPlaying(false);
    setCurrentStopIndex(2);
  };

  const handleReplaySoil = () => {
    setIsPlaying(false);
    setCurrentStopIndex(1); // Sep 25
    setTimeout(() => {
      setCurrentStopIndex(2); // Sep 26
    }, 1000);
    setTimeout(() => {
      setCurrentStopIndex(3); // Sep 27
    }, 2000);
  };

  // Helper to extract measurement for a track given the current stop
  const getTrackData = (trackId: "ocean" | "rain" | "soil" | "runoff" | "wind") => {
    const key = currentStop.dateKey;
    switch (trackId) {
      case "ocean":
        if (key === "2024-08") {
          return {
            val: heleneData.ocean.observations[0].value.toFixed(2),
            unit: "°C",
            cadence: "Monthly",
            source: "MODIS-Aqua",
            available: true,
          };
        }
        if (key.startsWith("2024-09")) {
          return {
            val: heleneData.ocean.observations[1].value.toFixed(2),
            unit: "°C",
            cadence: "Monthly",
            source: "MODIS-Aqua",
            available: true,
            note: "Reported September Monthly Value",
          };
        }
        return { val: "Not available in curated selection", unit: "", cadence: "Monthly", source: "MODIS-Aqua", available: false };

      case "rain":
        if (key === "2024-08") {
          return {
            val: heleneData.rainfall.observations[0].value.toFixed(2),
            unit: "kg/m²",
            cadence: "Monthly Total",
            source: "NLDAS-2",
            available: true,
          };
        }
        if (key.startsWith("2024-09")) {
          return {
            val: heleneData.rainfall.observations[1].value.toFixed(2),
            unit: "kg/m²",
            cadence: "Monthly Total",
            source: "NLDAS-2",
            available: true,
          };
        }
        if (key === "2024-10") {
          return {
            val: heleneData.rainfall.observations[2].value.toFixed(2),
            unit: "kg/m²",
            cadence: "Monthly Total",
            source: "NLDAS-2",
            available: true,
          };
        }
        return { val: "Not available in curated selection", unit: "", cadence: "Monthly", source: "NLDAS-2", available: false };

      case "soil":
        if (key.startsWith("2024-09")) {
          const obs = heleneData.soil.observations.find((o) => o.date === key);
          if (obs) {
            return {
              val: obs.value.toFixed(2),
              unit: "kg/m²",
              cadence: "Daily Mean",
              source: "GLDAS CLSM",
              available: true,
            };
          }
        }
        return { val: "Not available in curated selection", unit: "", cadence: "Daily", source: "GLDAS CLSM", available: false };

      case "runoff":
        if (key === "2024-08") {
          return {
            val: heleneData.runoff.observations[0].value.toFixed(6),
            unit: "kg/m²",
            cadence: "Monthly Mean",
            source: "GLDAS Noah",
            available: true,
          };
        }
        if (key.startsWith("2024-09")) {
          return {
            val: heleneData.runoff.observations[1].value.toFixed(6),
            unit: "kg/m²",
            cadence: "Monthly Mean",
            source: "GLDAS Noah",
            available: true,
          };
        }
        if (key === "2024-10") {
          return {
            val: heleneData.runoff.observations[2].value.toFixed(6),
            unit: "kg/m²",
            cadence: "Monthly Mean",
            source: "GLDAS Noah",
            available: true,
          };
        }
        return { val: "Not available in curated selection", unit: "", cadence: "Monthly", source: "GLDAS Noah", available: false };

      case "wind":
        if (key.startsWith("2024-09")) {
          return {
            val: heleneData.wind.observations[0].value.toFixed(2),
            unit: "m/s",
            cadence: "Monthly Mean",
            source: "MERRA-2",
            available: true,
          };
        }
        return { val: "Not available in curated selection", unit: "", cadence: "Monthly", source: "MERRA-2", available: false };
    }
  };

  const tracks = [
    { id: "ocean" as const, title: "Ocean SST", color: "var(--ocean-color)" },
    { id: "rain" as const, title: "Precipitation", color: "var(--rain-color)" },
    { id: "soil" as const, title: "Soil Moisture", color: "var(--soil-color)" },
    { id: "runoff" as const, title: "Surface Runoff", color: "var(--runoff-color)" },
    { id: "wind" as const, title: "Surface Wind", color: "var(--wind-color)" },
  ];

  return (
    <section className="helene-section" id="evidence-timeline">
      <div className="helene-container">
        <div>
          <div className="helene-eyebrow">SIGNATURE EXPERIENCE</div>
          <h2 className="helene-chapter-heading helene-serif">
            Five Signals. One September.
          </h2>
          <p className="helene-body-text" style={{ maxWidth: "660px" }}>
            Follow the available observations across August, September and October
            2024. Notice what changes—and what the different datasets cannot resolve.
          </p>
        </div>

        <div className="helene-timeline-grid">
          {/* Left: Scientific Timeline & Instrument Track Deck (72%) */}
          <div className="helene-timeline-left">
            {/* Timeline Control Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                paddingBottom: "20px",
                borderBottom: "1px solid var(--case-border)",
              }}
            >
              {/* Playback Transport Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    background: isPlaying ? "var(--case-highlight)" : "var(--case-surface-raised)",
                    color: isPlaying ? "#08131B" : "var(--case-text)",
                    border: "1px solid var(--case-border)",
                    padding: "7px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  aria-label={isPlaying ? "Pause timeline" : "Play timeline"}
                >
                  {isPlaying ? "❚❚ Pause" : "▶ Play"}
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentStopIndex === 0}
                  style={{
                    background: "transparent",
                    color: currentStopIndex === 0 ? "var(--case-text-muted)" : "var(--case-text)",
                    border: "1px solid var(--case-border)",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: currentStopIndex === 0 ? "default" : "pointer",
                  }}
                  aria-label="Previous stop"
                >
                  ‹ Prev
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentStopIndex === stops.length - 1}
                  style={{
                    background: "transparent",
                    color: currentStopIndex === stops.length - 1 ? "var(--case-text-muted)" : "var(--case-text)",
                    border: "1px solid var(--case-border)",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: currentStopIndex === stops.length - 1 ? "default" : "pointer",
                  }}
                  aria-label="Next stop"
                >
                  Next ›
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    background: "transparent",
                    color: "var(--case-text-muted)",
                    border: "1px solid var(--case-border)",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                  aria-label="Reset to beginning"
                >
                  ↺ Reset
                </button>
              </div>

              {/* Speed Switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--case-text-muted)" }}>Speed:</span>
                {([0.5, 1, 2] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{
                      background: playbackSpeed === spd ? "var(--case-surface-raised)" : "transparent",
                      color: playbackSpeed === spd ? "var(--case-accent)" : "var(--case-text-muted)",
                      border: "1px solid var(--case-border)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {spd}×
                  </button>
                ))}
              </div>
            </div>

            {/* Discrete Stops Horizontal Track Strip */}
            <div style={{ margin: "24px 0", position: "relative" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "10px",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {stops.map((stop, idx) => {
                  const isActive = idx === currentStopIndex;
                  return (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStopIndex(idx);
                      }}
                      style={{
                        background: isActive ? "rgba(209, 123, 96, 0.12)" : "rgba(8, 19, 27, 0.5)",
                        border: isActive ? "1.5px solid var(--case-highlight)" : "1px solid var(--case-border)",
                        borderRadius: "8px",
                        padding: "10px 8px",
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      aria-label={`Select observation stop ${stop.label}`}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: isActive ? "var(--case-highlight)" : "var(--case-text-muted)",
                          marginBottom: "4px",
                        }}
                      >
                        {stop.type.toUpperCase()}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: isActive ? "#F5F3EC" : "#C0C9CB",
                        }}
                      >
                        {stop.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Five Narrow Horizontal Evidence Tracks */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
              {tracks.map((trk) => {
                const data = getTrackData(trk.id);
                const isSoilHighlight = trk.id === "soil" && currentStop.type === "daily";

                return (
                  <div
                    key={trk.id}
                    className={`helene-timeline-track ${isSoilHighlight ? "highlighted" : ""}`}
                  >
                    {/* Left: Indicator title and Source */}
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: trk.color }}>
                        {trk.title}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "var(--case-text-muted)" }}>
                        {data.source}
                      </div>
                    </div>

                    {/* Middle: Observation Cadence Badge & Notes */}
                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "rgba(255, 255, 255, 0.04)",
                          color: "var(--case-text-secondary)",
                        }}
                      >
                        {data.cadence}
                      </span>
                    </div>

                    {/* Right: Available Measurement */}
                    <div style={{ textAlign: "right" }}>
                      {data.available ? (
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#F5F3EC", fontFamily: "monospace" }}>
                          {data.val} {data.unit}
                        </div>
                      ) : (
                        <div style={{ fontSize: "11px", color: "var(--case-text-muted)", fontStyle: "italic" }}>
                          Not available in curated selection
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Contextual Evidence Inspector (28%) */}
          <EvidenceInspector
            currentStop={currentStop}
            onFocusSep26={handleFocusSep26}
            onReplaySoil={handleReplaySoil}
          />
        </div>
      </div>
    </section>
  );
}
