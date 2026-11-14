"use client";

import { X, Layers, Sliders, Globe2, Activity, MapPin } from "lucide-react";
import type { LayerItem } from "../types";

interface LayersPanelProps {
  layers: LayerItem[];
  onToggleLayer: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onClose: () => void;
}

export function LayersPanel({
  layers,
  onToggleLayer,
  onOpacityChange,
  onClose,
}: LayersPanelProps) {
  const basemapLayers = layers.filter((l) => l.category === "basemap" || l.id === "night-lights");
  const scientificLayers = layers.filter((l) => l.category === "raster" && l.id !== "night-lights");
  const vectorLayers = layers.filter((l) => l.category === "vector");

  const renderLayerRow = (layer: LayerItem) => (
    <div
      key={layer.id}
      className="iris-layer-row"
      style={{
        flexDirection: "column",
        alignItems: "stretch",
        gap: "6px",
        padding: "10px 12px",
        background: layer.visible ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.015)",
        border: layer.visible ? "1px solid rgba(19, 224, 192, 0.2)" : "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "12px",
        transition: "all 0.18s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="iris-layer-info" style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className="iris-layer-title"
              style={{
                color: layer.visible ? "var(--iris-text-primary)" : "var(--iris-text-secondary)",
                fontWeight: layer.visible ? "600" : "500",
              }}
            >
              {layer.name}
            </span>
            {layer.badge && (
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: layer.visible ? "rgba(19, 224, 192, 0.14)" : "rgba(255, 255, 255, 0.06)",
                  color: layer.visible ? "var(--iris-accent-bright)" : "var(--iris-text-muted)",
                }}
              >
                {layer.badge}
              </span>
            )}
          </div>
          <span className="iris-layer-desc" style={{ marginTop: "2px" }}>
            {layer.description}
          </span>
        </div>

        <label className="iris-toggle" style={{ marginLeft: "10px", flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={() => onToggleLayer(layer.id)}
          />
          <span className="iris-toggle-slider" />
        </label>
      </div>

      {/* Opacity slider when layer is visible and adjustable */}
      {layer.visible && layer.id !== "observation-markers" && layer.id !== "reticle-targeting" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingTop: "6px",
            marginTop: "2px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Sliders size={12} style={{ color: "var(--iris-text-muted)" }} />
          <span style={{ fontSize: "11px", color: "var(--iris-text-muted)", minWidth: "44px" }}>
            Opacity
          </span>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={layer.opacity}
            onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))}
            style={{
              flex: 1,
              height: "4px",
              accentColor: "var(--iris-accent-bright)",
              cursor: "pointer",
            }}
          />
          <span style={{ fontSize: "11px", color: "var(--iris-text-secondary)", minWidth: "30px", textAlign: "right" }}>
            {Math.round(layer.opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="iris-flyout-panel iris-layers-drawer" style={{ width: "340px", maxHeight: "80vh", overflowY: "auto" }}>
      <div className="iris-drawer-header">
        <div>
          <h3>Earth Layers</h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--iris-text-muted)" }}>
            Toggle imagery, scientific fields, and targeting.
          </p>
        </div>
        <button
          aria-label="Close layers panel"
          className="iris-drawer-close"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Section 1: Scientific Field Overlays */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <Activity size={13} style={{ color: "var(--iris-accent-bright)" }} />
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--iris-text-muted)", fontWeight: "600" }}>
              Scientific Data Fields
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {scientificLayers.map(renderLayerRow)}
          </div>
        </div>

        {/* Section 2: Satellite Imagery & Night Lights */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <Globe2 size={13} style={{ color: "#38bdf8" }} />
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--iris-text-muted)", fontWeight: "600" }}>
              Satellite & Basemaps
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {basemapLayers.map(renderLayerRow)}
          </div>
        </div>

        {/* Section 3: Annotations & Targeting */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <MapPin size={13} style={{ color: "#34d399" }} />
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--iris-text-muted)", fontWeight: "600" }}>
              Markers & Selection Reticle
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {vectorLayers.map(renderLayerRow)}
          </div>
        </div>
      </div>
    </div>
  );
}
