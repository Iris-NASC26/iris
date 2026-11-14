"use client";

import Link from "next/link";
import { MapPin, ExternalLink, Thermometer, Calendar, TrendingUp, X } from "lucide-react";
import type { DemoScene } from "./types";

interface LocationInformationPanelProps {
  scene: DemoScene;
  selectedDate: string;
  onClose?: () => void;
}

export function LocationInformationPanel({
  scene,
  selectedDate,
  onClose,
}: LocationInformationPanelProps) {
  // Find value corresponding to current selectedDate from timeSeries, or fallback to currentValue
  const timeRecord = scene.timeSeries.find((r) => r.date === selectedDate);
  const displayValue = timeRecord ? timeRecord.value : scene.currentValue;

  return (
    <article aria-label="Location Environmental Profile" className="iris-location-panel">
      {/* Section A: Location Identity */}
      <div className="iris-location-header">
        <div className="iris-location-title-row">
          <MapPin className="iris-location-pin" size={26} strokeWidth={2.2} />
          <div className="iris-location-titles">
            <h2>{scene.locationName}</h2>
            <p>{scene.country}</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Link
            className="iris-card-link-btn"
            href={`/workspace/data-analysis?place=${encodeURIComponent(
              scene.locationName
            )}&lat=${scene.latitude}&lon=${scene.longitude}`}
            title="Open Full Scientific Analysis"
          >
            <ExternalLink size={18} />
          </Link>
          {onClose && (
            <button
              aria-label="Close location card"
              className="iris-card-link-btn"
              onClick={onClose}
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Section B: Separator */}
      <div className="iris-panel-separator" />

      {/* Section C: Metadata Row */}
      <div className="iris-meta-grid">
        <div className="iris-meta-col">
          <Thermometer className="iris-meta-icon" size={20} strokeWidth={2} />
          <div className="iris-meta-labels">
            <small>Variable</small>
            <strong>{scene.variable}</strong>
          </div>
        </div>

        <div className="iris-meta-col">
          <Calendar className="iris-meta-icon" size={20} strokeWidth={2} />
          <div className="iris-meta-labels">
            <small>Month</small>
            <strong>{selectedDate}</strong>
          </div>
        </div>
      </div>

      {/* Section D: Main Metric */}
      <div className="iris-metric-row">
        <div className="iris-main-metric">
          <span>{displayValue.toFixed(1)} {scene.unit}</span>
        </div>
        <div className="iris-diff-badge" title="Deviation relative to 2000–2010 decadal baseline">
          <span>{scene.baselineDiff}</span>
        </div>
      </div>

      {/* Section E: Scientific Insight */}
      <div className="iris-insight-row">
        <TrendingUp className="iris-insight-icon" size={20} strokeWidth={2} />
        <p className="iris-insight-text">{scene.insight}</p>
      </div>
    </article>
  );
}
