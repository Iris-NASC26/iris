"use client";

import { X, Clock, Play, Pause, SkipBack, SkipForward, FastForward } from "lucide-react";

interface TimePanelProps {
  selectedDate: string;
  isPlaying: boolean;
  playbackSpeed: number;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onStepMonth: (direction: -1 | 1) => void;
  onClose: () => void;
}

const SPEED_OPTIONS = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1.0 },
  { label: "2×", value: 2.0 },
  { label: "5×", value: 5.0 },
];

export function TimePanel({
  selectedDate,
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onSpeedChange,
  onStepMonth,
  onClose,
}: TimePanelProps) {
  return (
    <div className="iris-flyout-panel iris-time-drawer" style={{ width: "320px" }}>
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
          <strong style={{ fontSize: "16px", color: "var(--iris-accent-bright)" }}>{selectedDate}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--iris-text-muted)" }}>Temporal Resolution:</span>
          <span>Monthly (Calendar Climatology)</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--iris-text-muted)" }}>Dataset Horizon:</span>
          <span>2018-01 to 2024-12 (84 frames)</span>
        </div>

        {/* Playback Controls & Stepping */}
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <button
            className="iris-quick-pill"
            style={{ width: "38px", height: "38px", padding: 0, justifyContent: "center" }}
            onClick={() => onStepMonth(-1)}
            title="Step back 1 month"
            type="button"
          >
            <SkipBack size={15} />
          </button>

          <button
            className={`iris-quick-pill ${isPlaying ? "active" : ""}`}
            style={{ flex: 1, height: "38px", justifyContent: "center", fontSize: "13px" }}
            onClick={onTogglePlay}
            type="button"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? "Pause Stream" : "Play Stream"}</span>
          </button>

          <button
            className="iris-quick-pill"
            style={{ width: "38px", height: "38px", padding: 0, justifyContent: "center" }}
            onClick={() => onStepMonth(1)}
            title="Step forward 1 month"
            type="button"
          >
            <SkipForward size={15} />
          </button>
        </div>

        {/* Playback Speeds */}
        <div style={{ marginTop: "4px" }}>
          <div style={{ fontSize: "11px", color: "var(--iris-text-muted)", marginBottom: "6px" }}>
            Stream Playback Speed
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                className={`iris-quick-pill ${playbackSpeed === opt.value ? "active" : ""}`}
                style={{ height: "32px", fontSize: "12px", justifyContent: "center" }}
                onClick={() => onSpeedChange(opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
