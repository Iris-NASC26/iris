"use client";

import { X, Columns2, ArrowRightLeft } from "lucide-react";
import { DEMO_SCENES } from "../data/demoScenes";
import type { DemoScene } from "../types";

interface ComparePanelProps {
  primaryScene: DemoScene;
  comparisonLocationId: string | null;
  selectedDate: string;
  onSelectComparison: (id: string | null) => void;
  onClose: () => void;
}

export function ComparePanel({
  primaryScene,
  comparisonLocationId,
  selectedDate,
  onSelectComparison,
  onClose,
}: ComparePanelProps) {
  const comparisonScene = comparisonLocationId ? DEMO_SCENES[comparisonLocationId] : null;

  const primaryRecord = primaryScene.timeSeries.find((r) => r.date === selectedDate);
  const primaryVal = primaryRecord ? primaryRecord.value : primaryScene.currentValue;

  const compRecord = comparisonScene?.timeSeries.find((r) => r.date === selectedDate);
  const compVal = compRecord ? compRecord.value : comparisonScene?.currentValue ?? null;

  const diff = compVal !== null ? (primaryVal - compVal).toFixed(1) : null;

  return (
    <div className="iris-flyout-panel iris-compare-drawer">
      <div className="iris-drawer-header">
        <div>
          <h3>Planetary Comparison</h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--iris-text-muted)" }}>
            Compare environmental signals across two regions.
          </p>
        </div>
        <button
          aria-label="Close compare panel"
          className="iris-drawer-close"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      {comparisonScene ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Side-by-Side Comparison */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: "10px",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.03)",
              padding: "12px",
              borderRadius: "14px",
            }}
          >
            <div>
              <strong style={{ fontSize: "15px", display: "block" }}>{primaryScene.locationName}</strong>
              <span style={{ fontSize: "12px", color: "var(--iris-text-muted)" }}>{primaryScene.country}</span>
              <div style={{ fontSize: "22px", fontWeight: "650", marginTop: "4px", color: "var(--iris-accent-bright)" }}>
                {primaryVal.toFixed(1)} {primaryScene.unit}
              </div>
            </div>

            <div style={{ color: "var(--iris-text-muted)", display: "flex", justifyContent: "center" }}>
              <ArrowRightLeft size={18} />
            </div>

            <div>
              <strong style={{ fontSize: "15px", display: "block" }}>{comparisonScene.locationName}</strong>
              <span style={{ fontSize: "12px", color: "var(--iris-text-muted)" }}>{comparisonScene.country}</span>
              <div style={{ fontSize: "22px", fontWeight: "650", marginTop: "4px", color: "#38bdf8" }}>
                {compVal !== null ? `${compVal.toFixed(1)} ${comparisonScene.unit}` : "—"}
              </div>
            </div>
          </div>

          {diff !== null && (
            <div
              style={{
                fontSize: "13px",
                padding: "8px 12px",
                borderRadius: "10px",
                background: "rgba(19, 224, 192, 0.08)",
                border: "1px solid rgba(19, 224, 192, 0.2)",
                color: "var(--iris-text-primary)",
              }}
            >
              Differential ({selectedDate}): <strong>{Number(diff) > 0 ? `+${diff}` : diff} {primaryScene.unit}</strong> between {primaryScene.locationName} and {comparisonScene.locationName}.
            </div>
          )}

          <button
            className="iris-quick-pill"
            style={{ width: "100%", justifyContent: "center", height: "36px", fontSize: "13px" }}
            onClick={() => onSelectComparison(null)}
          >
            Choose Different Location
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ fontSize: "13px", color: "var(--iris-text-secondary)", margin: 0 }}>
            Select a second location marker on Earth or pick a benchmark station below:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {Object.values(DEMO_SCENES)
              .filter((s) => s.id !== primaryScene.id)
              .map((scene) => (
                <button
                  key={scene.id}
                  className="iris-quick-pill"
                  style={{
                    height: "40px",
                    justifyContent: "space-between",
                    padding: "0 14px",
                    fontSize: "13px",
                  }}
                  onClick={() => onSelectComparison(scene.id)}
                >
                  <span>{scene.locationName}</span>
                  <span style={{ fontSize: "12px", color: "var(--iris-text-muted)" }}>{scene.country}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
