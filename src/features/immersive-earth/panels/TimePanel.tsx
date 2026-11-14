"use client";

import { X, Clock, FastForward, Play, Pause } from "lucide-react";

interface TimePanelProps {
  selectedDate: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}

export function TimePanel({
  selectedDate,
  isPlaying,
  onTogglePlay,
  onClose,
}: TimePanelProps) {
  return (
    <div className="iris-flyout-panel iris-time-drawer">
      <div className="iris-drawer-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={18} className="text-emerald-400" />
          <h3>Temporal Dimensions</h3>
        </div>
        <button
          aria-label="Close time panel"
          className="iris-drawer-close"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--iris-text-muted)" }}>Current Snapshot:</span>
          <strong style={{ fontSize: "15px", color: "var(--iris-text-primary)" }}>{selectedDate}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--iris-text-muted)" }}>Temporal Resolution:</span>
          <span>Monthly (Calendar Climatology)</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--iris-text-muted)" }}>Dataset Horizon:</span>
          <span>2018-01 to 2024-12 (84 frames)</span>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <button
            className={`iris-quick-pill ${isPlaying ? "active" : ""}`}
            style={{ flex: 1, height: "38px", justifyContent: "center", fontSize: "13px" }}
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? "Pause Stream" : "Play Stream"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
