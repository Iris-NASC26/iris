"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Globe, Layers, MoreHorizontal, Sparkles, Box, Activity, FileText, X } from "lucide-react";
import type { ImmersiveMode } from "./types";

interface ImmersiveNavigationRailProps {
  activeMode: ImmersiveMode;
  onModeChange: (mode: ImmersiveMode) => void;
}

const WORKSPACE_LINKS = [
  { to: "/workspace/intelligence", label: "System Intelligence", icon: Sparkles },
  { to: "/workspace/data-selection", label: "Data Selection", icon: Box },
  { to: "/workspace/data-preview", label: "Data Preview", icon: Layers },
  { to: "/workspace/data-analysis", label: "Data Analysis", icon: Activity },
  { to: "/workspace/visualize", label: "Plot & Visualize", icon: Activity },
  { to: "/workspace/research", label: "Existing Research", icon: FileText },
];

export function ImmersiveNavigationRail({ activeMode, onModeChange }: ImmersiveNavigationRailProps) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target as Node)) {
        setFlyoutOpen(false);
      }
    }
    if (flyoutOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [flyoutOpen]);

  return (
    <>
      <aside aria-label="Quick Navigation Rail" className="iris-nav-rail">
        <button
          aria-label="Explore Earth"
          className={`iris-rail-btn ${activeMode === "explore" ? "active" : ""}`}
          onClick={() => onModeChange("explore")}
          title="Explore Living Globe"
          type="button"
        >
          <Globe size={19} />
        </button>

        <button
          aria-label="Earth Layers"
          className={`iris-rail-btn ${activeMode === "layers" ? "active" : ""}`}
          onClick={() => onModeChange("layers")}
          title="Layer Visibility & Overlays"
          type="button"
        >
          <Layers size={19} />
        </button>

        <button
          aria-label="Workspace Navigation Menu"
          className={`iris-rail-btn ${flyoutOpen ? "active" : ""}`}
          onClick={() => setFlyoutOpen(!flyoutOpen)}
          title="Workspace Navigation"
          type="button"
        >
          <MoreHorizontal size={19} />
        </button>
      </aside>

      {flyoutOpen && (
        <div className="iris-flyout-panel iris-nav-flyout" ref={flyoutRef}>
          <div className="iris-drawer-header">
            <h3>Workspace Navigation</h3>
            <button className="iris-drawer-close" onClick={() => setFlyoutOpen(false)}>
              <X size={15} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {WORKSPACE_LINKS.map((link) => {
              const IconComp = link.icon;
              return (
                <Link
                  key={link.to}
                  href={link.to}
                  className="iris-quick-pill"
                  style={{
                    height: "38px",
                    padding: "0 14px",
                    fontSize: "13px",
                    textDecoration: "none",
                    justifyContent: "flex-start",
                  }}
                  onClick={() => setFlyoutOpen(false)}
                >
                  <IconComp size={15} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
