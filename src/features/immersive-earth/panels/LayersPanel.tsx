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
    <div className="iris-flyout-panel iris-layers-drawer">
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

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {layers.map((layer) => (
          <div key={layer.id} className="iris-layer-row">
            <div className="iris-layer-info">
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
              <span className="iris-layer-desc">{layer.description}</span>
            </div>

            <label className="iris-toggle">
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => onToggleLayer(layer.id)}
              />
              <span className="iris-toggle-slider" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
