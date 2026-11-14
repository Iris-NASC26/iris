"use client";

import { useMemo } from "react";
import Link from "next/link";
import { X, FlaskConical, ExternalLink, ShieldCheck, AlertCircle, TrendingUp } from "lucide-react";
import type { DemoScene } from "../types";
import { computeSensSlope } from "../services/scientificDataClient";

interface EvidencePanelProps {
  scene: DemoScene;
  onClose: () => void;
}

export function EvidencePanel({ scene, onClose }: EvidencePanelProps) {
  const stats = useMemo(() => {
    const vals = scene.timeSeries.map((s) => s.value);
    return computeSensSlope(vals);
  }, [scene]);

  // Sparkline coordinates
  const sparkline = useMemo(() => {
    const vals = scene.timeSeries.map((s) => s.value);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const width = 270;
    const height = 48;

    const points = vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * width;
        const y = height - ((v - minVal) / (maxVal - minVal || 1)) * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return { points, width, height, minVal, maxVal };
  }, [scene]);

  return (
    <div className="iris-flyout-panel iris-evidence-drawer" style={{ width: "340px" }}>
      <div className="iris-drawer-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FlaskConical size={18} className="text-emerald-400" />
          <h3>Scientific Evidence</h3>
        </div>
        <button
          aria-label="Close evidence panel"
          className="iris-drawer-close"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Dataset Card */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div style={{ fontSize: "10px", color: "var(--iris-text-muted)", textTransform: "uppercase" }}>
            Target Investigation
          </div>
          <div style={{ fontSize: "15px", fontWeight: "650", marginTop: "2px" }}>
            {scene.locationName}, {scene.country}
          </div>
          <div style={{ fontSize: "11px", color: "var(--iris-text-secondary)", marginTop: "2px" }}>
            Coordinates: {scene.latitude.toFixed(4)}° N, {scene.longitude.toFixed(4)}° E
          </div>
        </div>

        {/* Statistical Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              padding: "10px",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#34d399", fontWeight: "600" }}>Sen&apos;s Slope</div>
            <div style={{ fontSize: "17px", fontWeight: "700", marginTop: "2px", color: "#ffffff" }}>
              {stats.slopePerYear > 0 ? `+${stats.slopePerYear}` : stats.slopePerYear} {scene.unit}/yr
            </div>
            <div style={{ fontSize: "10px", color: "var(--iris-text-muted)" }}>Robust Rank Estimator</div>
          </div>

          <div
            style={{
              background: "rgba(53, 191, 255, 0.08)",
              border: "1px solid rgba(53, 191, 255, 0.2)",
              padding: "10px",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "600" }}>Mann–Kendall p</div>
            <div style={{ fontSize: "17px", fontWeight: "700", marginTop: "2px", color: "#ffffff" }}>
              {stats.pValue < 0.001 ? "< 0.001" : stats.pValue}
            </div>
            <div style={{ fontSize: "10px", color: "var(--iris-text-muted)" }}>Hamed–Rao Corrected</div>
          </div>
        </div>

        {/* Time Series Sparkline */}
        {sparkline && (
          <div
            style={{
              background: "rgba(0, 0, 0, 0.28)",
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--iris-text-muted)", marginBottom: "4px" }}>
              <span>2018-01 ({sparkline.minVal} {scene.unit})</span>
              <span>2024-12 ({sparkline.maxVal} {scene.unit})</span>
            </div>
            <svg width="100%" height={sparkline.height} viewBox={`0 0 ${sparkline.width} ${sparkline.height}`}>
              <polyline
                points={sparkline.points}
                fill="none"
                stroke="var(--iris-accent-bright)"
                strokeWidth="1.8"
              />
            </svg>
          </div>
        )}

        {/* Provenance and Integrity */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11px", color: "var(--iris-text-secondary)" }}>
          <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            Source verified via <strong>{scene.sourceName}</strong>. Spatial native grid sampling with zero artificial interpolation.
          </span>
        </div>

        {/* Caveat */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11px", color: "var(--iris-text-muted)" }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            MERRA-2 assimilation model output; 2-meter air temperature is not directly assimilated by surface satellites.
          </span>
        </div>

        {/* Action Link to Full Case File */}
        <Link
          className="iris-quick-pill"
          href={`/workspace/data-analysis?place=${encodeURIComponent(scene.locationName)}&lat=${scene.latitude}&lon=${scene.longitude}&variable=${scene.variableCode}`}
          style={{
            height: "38px",
            fontSize: "12px",
            justifyContent: "center",
            textDecoration: "none",
            background: "rgba(19, 224, 192, 0.12)",
            color: "var(--iris-accent-bright)",
            borderColor: "rgba(19, 224, 192, 0.3)",
          }}
        >
          <span>Open Full Case File Analysis</span>
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
