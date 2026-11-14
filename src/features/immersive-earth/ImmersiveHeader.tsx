"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Globe, MoreHorizontal, ExternalLink, BookOpen, Layers, X } from "lucide-react";

interface ImmersiveHeaderProps {
  onExit?: () => void;
}

export function ImmersiveHeader({ onExit }: ImmersiveHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      </div>

      {/* Right Controls: NASA Data pill & Overflow Menu */}
      <div className="iris-header-right" ref={menuRef}>
        <div className="iris-nasa-badge" title="NASA GIBS WMTS Blue Marble & NASA POWER Zarr live streams">
          <span className="iris-status-dot" />
          <span>NASA Earth Data</span>
        </div>

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
              <span style={{ fontSize: "12px", color: "var(--iris-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Options</span>
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
