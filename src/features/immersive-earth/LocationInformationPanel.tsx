"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, ExternalLink, Thermometer, Calendar, TrendingUp, X, BarChart2, BookOpen, Check } from "lucide-react";
import type { DemoScene } from "./types";
import { useVisualizations } from "@/features/visualization/store";
import { useDashboard } from "@/context/DashboardContext";
import { buildPreviewFromScene } from "./services/scientificDataClient";

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
  const router = useRouter();
  const { add } = useVisualizations();
  const { setLocation } = useDashboard();
  const [addedToast, setAddedToast] = useState(false);

  // Find value corresponding to current selectedDate from timeSeries, or fallback to currentValue
  const timeRecord = scene.timeSeries.find((r) => r.date === selectedDate);
  const displayValue = timeRecord ? timeRecord.value : scene.currentValue;

  const handleAddToVisualize = () => {
    try {
      const preview = buildPreviewFromScene(
        scene.locationName,
        scene.country,
        scene.latitude,
        scene.longitude,
        scene.variable,
        scene.unit,
        scene.timeSeries
      );
      add(preview);
      setLocation(`${scene.locationName}, ${scene.country}`);
      setAddedToast(true);
      setTimeout(() => {
        setAddedToast(false);
        router.push("/workspace/visualize");
      }, 700);
    } catch (err) {
      console.warn("Could not add to visual series:", err);
      router.push("/workspace/visualize");
    }
  };

  const researchQuery = encodeURIComponent(`${scene.locationName} ${scene.variable} climate trend`);

  return (
    <article aria-label="Location Environmental Profile" className="iris-location-panel">
      {/* Section A: Location Identity */}
      <div className="iris-location-header">
        <div className="iris-location-title-row">
          <MapPin className="iris-location-pin" size={26} strokeWidth={2.2} />
          <div className="iris-location-titles">
            <h2>{scene.locationName}</h2>
            <p>{scene.country} · {scene.latitude.toFixed(2)}°N, {scene.longitude.toFixed(2)}°E</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Link
            className="iris-card-link-btn"
            href={`/workspace/data-analysis?place=${encodeURIComponent(
              scene.locationName
            )}&lat=${scene.latitude}&lon=${scene.longitude}&variable=${scene.variableCode}`}
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

      {/* Section F: Deep Actions (Plot & Visualize / Literature) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginTop: "14px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <button
          className="iris-quick-pill"
          onClick={handleAddToVisualize}
          style={{
            height: "36px",
            fontSize: "12px",
            justifyContent: "center",
            background: addedToast ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.04)",
            borderColor: addedToast ? "#10b981" : "rgba(255, 255, 255, 0.12)",
          }}
          type="button"
        >
          {addedToast ? <Check size={14} className="text-emerald-400" /> : <BarChart2 size={14} />}
          <span>{addedToast ? "Added to Studio" : "Plot in Studio"}</span>
        </button>

        <Link
          className="iris-quick-pill"
          href={`/workspace/research?query=${researchQuery}`}
          style={{
            height: "36px",
            fontSize: "12px",
            justifyContent: "center",
            textDecoration: "none",
          }}
        >
          <BookOpen size={14} />
          <span>Research Papers</span>
        </Link>
      </div>
    </article>
  );
}
