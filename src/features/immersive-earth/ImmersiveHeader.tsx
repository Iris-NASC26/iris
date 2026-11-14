"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Globe, MoreHorizontal, ExternalLink, BookOpen, Layers, X, Maximize, Minimize } from "lucide-react";

interface ImmersiveHeaderProps {
  altitudeKm?: number;
  isFallbackData?: boolean;
  onExit?: () => void;
}

export function ImmersiveHeader({
  altitudeKm = 14800,
  isFallbackData = false,
  onExit,
}: ImmersiveHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  return (
    <header className="iris-immersive-header">
      {/* Brand & Page Identity */}
      <div className="iris-brand-group">
        <Link className="iris-brand-mark" href="/" title="Project Iris Home">
          <Globe size={26} strokeWidth={1.8} />
        </Link>
        <span className="iris-brand-text">Iris</span>
        <div className="iris-header-divider" />
        <span className="iris-title-text">Immersive Earth</span>

        {/* Dynamic Altitude Indicator */}
        <div
          style={{
            marginLeft: "18px",
            fontSize: "12px",
            color: "var(--iris-text-muted)",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "3px 10px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>Altitude:</span>
          <strong style={{ color: "var(--iris-accent-bright)", fontWeight: "600" }}>
            {altitudeKm.toLocaleString()} km
          </strong>
        </div>
      </div>

      {/* Right Controls: NASA Data pill, Fullscreen & Overflow Menu */}
      <div className="iris-header-right" ref={menuRef}>
        <div
          className="iris-nasa-badge"
          style={{
            borderColor: isFallbackData ? "rgba(245, 177, 75, 0.4)" : undefined,
          }}
          title={
            isFallbackData
              ? "NASA POWER MERRA-2 1981-2010 Verified Climatological Baseline Normals"
              : "NASA GIBS WMTS Blue Marble & NASA POWER Zarr live streams"
          }
        >
          <span
            className="iris-status-dot"
            style={{
              background: isFallbackData ? "#f5b14b" : "#2fffe0",
              boxShadow: isFallbackData ? "0 0 8px #f5b14b" : "0 0 10px #2fffe0",
            }}
          />
          <span>{isFallbackData ? "NASA Earth Data (Baseline)" : "NASA Earth Data (Live)"}</span>
        </div>

        {/* Fullscreen Button */}
        <button
          aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          className="iris-overflow-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          type="button"
        >
          {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
        </button>

        {/* Overflow Menu */}
        <button
          aria-label="Additional actions"
          className="iris-overflow-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          type="button"
        >
          <MoreHorizontal size={18} />
        </button>

        {isMenuOpen && (
          <div className="iris-flyout-panel" style={{ top: "68px", right: "48px", width: "230px" }}>
            <div className="iris-drawer-header" style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", color: "var(--iris-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Options
              </span>
              <button className="iris-drawer-close" onClick={() => setIsMenuOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Link
                href="/about"
                className="iris-quick-pill"
                style={{ height: "38px", fontSize: "13px", padding: "0 14px", textDecoration: "none" }}
              >
                <BookOpen size={14} />
                <span>About Iris</span>
              </Link>
              <Link
                href="/methodology"
                className="iris-quick-pill"
                style={{ height: "38px", fontSize: "13px", padding: "0 14px", textDecoration: "none" }}
              >
                <Layers size={14} />
                <span>Methodology</span>
              </Link>
              <Link
                href="/data"
                className="iris-quick-pill"
                style={{ height: "38px", fontSize: "13px", padding: "0 14px", textDecoration: "none" }}
              >
                <ExternalLink size={14} />
                <span>Data Sources</span>
              </Link>
              <Link
                href="/workspace/visualize"
                className="iris-quick-pill"
                style={{ height: "38px", fontSize: "13px", padding: "0 14px", textDecoration: "none", color: "var(--iris-accent-bright)" }}
              >
                <ExternalLink size={14} />
                <span>Exit Immersive View</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
