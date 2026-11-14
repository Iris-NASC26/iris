"use client";

import { MousePointerClick, ZoomIn, Layers, Columns2, RotateCcw } from "lucide-react";
import type { ImmersiveMode } from "./types";

interface GlobeQuickControlsProps {
  isAutoRotating: boolean;
  activeMode: ImmersiveMode;
  onToggleRotate: () => void;
  onZoomIn: () => void;
  onToggleLayers: () => void;
  onToggleCompare: () => void;
  onReset: () => void;
}

export function GlobeQuickControls({
  isAutoRotating,
  activeMode,
  onToggleRotate,
  onZoomIn,
  onToggleLayers,
  onToggleCompare,
  onReset,
}: GlobeQuickControlsProps) {
  return (
    <div aria-label="Globe Actions" className="iris-quick-controls">
      {/* 1. Rotate Toggle */}
      <button
        aria-pressed={isAutoRotating}
        className={`iris-quick-pill ${isAutoRotating ? "active" : ""}`}
        onClick={onToggleRotate}
        title={isAutoRotating ? "Pause Auto-Rotation" : "Resume Auto-Rotation"}
        type="button"
      >
        <MousePointerClick size={16} strokeWidth={2} />
        <span>Rotate</span>
      </button>

      {/* 2. Zoom Step */}
      <button
        className="iris-quick-pill"
        onClick={onZoomIn}
        title="Zoom In Camera"
        type="button"
      >
        <ZoomIn size={16} strokeWidth={2} />
        <span>Zoom</span>
      </button>

      {/* 3. Layers Drawer Toggle */}
      <button
        aria-pressed={activeMode === "layers"}
        className={`iris-quick-pill ${activeMode === "layers" ? "active" : ""}`}
        onClick={onToggleLayers}
        title="Toggle Layer Visibility"
        type="button"
      >
        <Layers size={16} strokeWidth={2} />
        <span>Layers</span>
      </button>

      {/* 4. Compare Mode Toggle */}
      <button
        aria-pressed={activeMode === "compare"}
        className={`iris-quick-pill ${activeMode === "compare" ? "active" : ""}`}
        onClick={onToggleCompare}
        title="Compare Two Earth Locations"
        type="button"
      >
        <Columns2 size={16} strokeWidth={2} />
        <span>Compare</span>
      </button>

      {/* 5. Reset Camera */}
      <button
        className="iris-quick-pill"
        onClick={onReset}
        title="Reset Camera to South Asia"
        type="button"
      >
        <RotateCcw size={16} strokeWidth={2} />
        <span>Reset</span>
      </button>
    </div>
  );
}
