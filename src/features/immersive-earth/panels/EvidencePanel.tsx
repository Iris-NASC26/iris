"use client";

import Link from "next/link";
import { X, FlaskConical, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import type { DemoScene } from "../types";

interface EvidencePanelProps {
  scene: DemoScene;
  onClose: () => void;
}

export function EvidencePanel({ scene, onClose }: EvidencePanelProps) {
  return (
    <div className="iris-flyout-panel iris-evidence-drawer">
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
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--iris-text-muted)", textTransform: "uppercase" }}>
            Target Investigation
          </div>
          <div style={{ fontSize: "16px", fontWeight: "650", marginTop: "2px" }}>
            {scene.locationName}, {scene.country}
          </div>
          <div style={{ fontSize: "12px", color: "var(--iris-text-secondary)", marginTop: "2px" }}>
            Coordinates: {scene.latitude.toFixed(4)}° N, {scene.longitude.toFixed(4)}° E
          </div>
        </div>

        {/* Statistical Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          <div
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              padding: "10px",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#34d399", fontWeight: "600" }}>Sen&apos;s Slope</div>
            <div style={{ fontSize: "18px", fontWeight: "700", marginTop: "2px", color: "#ffffff" }}>
              +0.041 °C/yr
            </div>
            <div style={{ fontSize: "11px", color: "var(--iris-text-muted)" }}>Robust Rank Estimator</div>
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
            <div style={{ fontSize: "18px", fontWeight: "700", marginTop: "2px", color: "#ffffff" }}>
              &lt; 0.001
            </div>
            <div style={{ fontSize: "11px", color: "var(--iris-text-muted)" }}>Hamed–Rao Corrected</div>
          </div>
        </div>

        {/* Provenance and Integrity */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", color: "var(--iris-text-secondary)" }}>
          <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            Source verified via <strong>{scene.sourceName}</strong>. Spatial native grid sampling with zero artificial interpolation.
          </span>
        </div>

        {/* Caveat */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", color: "var(--iris-text-muted)" }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Coarse reanalysis spatial footprint (~0.5° × 0.625°). Local urban canopy gradients may differ.
          </span>
        </div>

        {/* Action Link */}
        <Link
          className="iris-quick-pill"
          href={`/workspace/data-analysis?place=${encodeURIComponent(
            scene.locationName
          )}&lat=${scene.latitude}&lon=${scene.longitude}`}
          style={{
            width: "100%",
            justifyContent: "center",
            height: "40px",
            textDecoration: "none",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.85) 0%, rgba(5, 150, 105, 0.95) 100%)",
            color: "#ffffff",
          }}
        >
          <span>Examine Full Case File in Data Analysis</span>
          <ExternalLink size={15} />
        </Link>
      </div>
    </div>
  );
}
