"use client";

import { Compass, Layers, Clock, Columns2, FlaskConical } from "lucide-react";
import type { ImmersiveMode } from "./types";

interface ImmersiveModeDockProps {
  activeMode: ImmersiveMode;
  onModeChange: (mode: ImmersiveMode) => void;
}

const MODES: Array<{
  id: ImmersiveMode;
  label: string;
  icon: typeof Compass;
}> = [
  { id: "explore", label: "Explore", icon: Compass },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "time", label: "Time", icon: Clock },
  { id: "compare", label: "Compare", icon: Columns2 },
  { id: "evidence", label: "Evidence", icon: FlaskConical },
];

export function ImmersiveModeDock({ activeMode, onModeChange }: ImmersiveModeDockProps) {
  return (
    <nav aria-label="Immersive Earth Modes" className="iris-mode-dock">
      {MODES.map((mode) => {
        const IconComponent = mode.icon;
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            aria-pressed={isActive}
            className={`iris-mode-item ${isActive ? "active" : ""}`}
            onClick={() => onModeChange(mode.id)}
            type="button"
          >
            <IconComponent size={19} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
