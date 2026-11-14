"use client";

import { X, Layers, Eye, EyeOff, Sliders } from "lucide-react";
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
  return (
    <div className="iris-flyout-panel iris-layers-drawer" style={{ width: "320px" }}>
      <div className="iris-drawer-header">
        <div>
          <h3>Earth Layers</h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--iris-text-muted)" }}>
            Choose what the planet reveals.
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

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {layers.map((layer) => (
          <div
            key={layer.id}
            className="iris-layer-row"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: "8px",
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="iris-layer-info" style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="iris-layer-title">{layer.name}</span>
                  {layer.badge && (
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        background: "rgba(19, 224, 192, 0.12)",
                        color: "var(--iris-accent-bright)",
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

              <label className="iris-toggle" style={{ marginLeft: "10px" }}>
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => onToggleLayer(layer.id)}
                />
                <span className="iris-toggle-slider" />
              </label>
            </div>

            {/* Opacity slider when layer is visible */}
            {layer.visible && layer.category === "raster" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  paddingTop: "6px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <Sliders size={12} style={{ color: "var(--iris-text-muted)" }} />
                <span style={{ fontSize: "11px", color: "var(--iris-text-muted)", minWidth: "42px" }}>
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
                <span style={{ fontSize: "11px", color: "var(--iris-text-secondary)", minWidth: "28px", textAlign: "right" }}>
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
