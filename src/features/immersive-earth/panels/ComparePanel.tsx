"use client";

import { useMemo } from "react";
import { X, ArrowRightLeft, TrendingUp, Activity } from "lucide-react";
import { DEMO_SCENES } from "../data/demoScenes";
import type { DemoScene } from "../types";
import {
  computePearsonCorrelation,
  computeDeseasonalizedCorrelation,
  computeLagCrossCorrelation,
} from "../services/scientificDataClient";

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

  // Correlation and Lag Analysis
  const stats = useMemo(() => {
    if (!comparisonScene) return null;
    const pVals = primaryScene.timeSeries.map((s) => s.value);
    const cVals = comparisonScene.timeSeries.map((s) => s.value);

    const { r: rawR, n } = computePearsonCorrelation(pVals, cVals);
    const { r: deseasonR } = computeDeseasonalizedCorrelation(primaryScene.timeSeries, comparisonScene.timeSeries);
    const lags = computeLagCrossCorrelation(pVals, cVals, 6);

    let maxAbsR = 0;
    let optimalLag = 0;
    lags.forEach((l) => {
      if (Math.abs(l.r) > maxAbsR) {
        maxAbsR = Math.abs(l.r);
        optimalLag = l.lag;
      }
    });

    return { rawR, deseasonR, n, lags, optimalLag, maxAbsR };
  }, [primaryScene, comparisonScene]);

  // Mini Sparkline SVG coordinates
  const sparklineData = useMemo(() => {
    if (!comparisonScene) return null;
    const pVals = primaryScene.timeSeries.map((s) => s.value);
    const cVals = comparisonScene.timeSeries.map((s) => s.value);
    const minP = Math.min(...pVals);
    const maxP = Math.max(...pVals);
    const minC = Math.min(...cVals);
    const maxC = Math.max(...cVals);

    const width = 270;
    const height = 48;

    const pPoints = pVals
      .map((v, i) => {
        const x = (i / (pVals.length - 1)) * width;
        const y = height - ((v - minP) / (maxP - minP || 1)) * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const cPoints = cVals
      .map((v, i) => {
        const x = (i / (cVals.length - 1)) * width;
        const y = height - ((v - minC) / (maxC - minC || 1)) * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return { pPoints, cPoints, width, height };
  }, [primaryScene, comparisonScene]);

  return (
    <div className="iris-flyout-panel iris-compare-drawer" style={{ width: "340px" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Side-by-Side Comparison Card */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: "8px",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.03)",
              padding: "10px 12px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div>
              <strong style={{ fontSize: "14px", display: "block" }}>{primaryScene.locationName}</strong>
              <span style={{ fontSize: "11px", color: "var(--iris-text-muted)" }}>{primaryScene.country}</span>
              <div style={{ fontSize: "20px", fontWeight: "650", marginTop: "2px", color: "var(--iris-accent-bright)" }}>
                {primaryVal.toFixed(1)} {primaryScene.unit}
              </div>
            </div>

            <div style={{ color: "var(--iris-text-muted)", display: "flex", justifyContent: "center" }}>
              <ArrowRightLeft size={16} />
            </div>

            <div>
              <strong style={{ fontSize: "14px", display: "block" }}>{comparisonScene.locationName}</strong>
              <span style={{ fontSize: "11px", color: "var(--iris-text-muted)" }}>{comparisonScene.country}</span>
              <div style={{ fontSize: "20px", fontWeight: "650", marginTop: "2px", color: "#38bdf8" }}>
                {compVal !== null ? `${compVal.toFixed(1)} ${comparisonScene.unit}` : "—"}
              </div>
            </div>
          </div>

          {diff !== null && (
            <div
              style={{
                fontSize: "12px",
                padding: "8px 12px",
                borderRadius: "10px",
                background: "rgba(19, 224, 192, 0.08)",
                border: "1px solid rgba(19, 224, 192, 0.2)",
                color: "var(--iris-text-primary)",
              }}
            >
              Differential ({selectedDate}):{" "}
              <strong>{Number(diff) > 0 ? `+${diff}` : diff} {primaryScene.unit}</strong>
            </div>
          )}

          {/* Synchronized Dual Sparklines */}
          {sparklineData && (
            <div
              style={{
                background: "rgba(0, 0, 0, 0.28)",
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px" }}>
                <span style={{ color: "var(--iris-accent-bright)", fontWeight: "600" }}>
                  — {primaryScene.locationName}
                </span>
                <span style={{ color: "#38bdf8", fontWeight: "600" }}>
                  — {comparisonScene.locationName}
                </span>
              </div>
              <svg width="100%" height={sparklineData.height} viewBox={`0 0 ${sparklineData.width} ${sparklineData.height}`}>
                <polyline
                  points={sparklineData.pPoints}
                  fill="none"
                  stroke="var(--iris-accent-bright)"
                  strokeWidth="1.8"
                />
                <polyline
                  points={sparklineData.cPoints}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeDasharray="3 2"
                />
              </svg>
            </div>
          )}

          {/* Scientific Statistical Metrics */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--iris-text-muted)" }}>Pearson r (N={stats.n})</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: stats.rawR > 0 ? "#34d399" : "#f87171" }}>
                  {stats.rawR > 0 ? `+${stats.rawR}` : stats.rawR}
                </div>
                <div style={{ fontSize: "10px", color: "var(--iris-text-muted)" }}>Raw Temporal Series</div>
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--iris-text-muted)" }}>Deseasonalized r</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#38bdf8" }}>
                  {stats.deseasonR > 0 ? `+${stats.deseasonR}` : stats.deseasonR}
                </div>
                <div style={{ fontSize: "10px", color: "var(--iris-text-muted)" }}>Cycle Removed</div>
              </div>
            </div>
          )}

          {/* Change Comparison Target Button */}
          <button
            className="iris-quick-pill"
            style={{ width: "100%", justifyContent: "center", height: "34px", fontSize: "12px" }}
            onClick={() => onSelectComparison(null)}
            type="button"
          >
            Change Comparison Target
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <p style={{ fontSize: "12px", color: "var(--iris-text-muted)", margin: "0 0 6px 0" }}>
            Select an observation target to compare against <strong>{primaryScene.locationName}</strong>:
          </p>
          {Object.values(DEMO_SCENES)
            .filter((s) => s.id !== primaryScene.id)
            .map((scene) => (
              <button
                key={scene.id}
                className="iris-layer-row"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
                onClick={() => onSelectComparison(scene.id)}
                type="button"
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--iris-text-primary)" }}>
                    {scene.locationName}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--iris-text-muted)" }}>
                    {scene.country} · {scene.variable}
                  </div>
                </div>
                <span style={{ fontSize: "12px", color: "var(--iris-accent-bright)", fontWeight: "600" }}>
                  Select →
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
