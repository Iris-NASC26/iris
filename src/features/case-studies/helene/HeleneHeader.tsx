"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface HeleneHeaderProps {
  sections: Array<{ id: string; title: string }>;
  activeSection: string;
  onSelectSection: (id: string) => void;
}

export function HeleneHeader({
  sections,
  activeSection,
  onSelectSection,
}: HeleneHeaderProps) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header className="helene-top-header" role="banner">
        <div className="helene-top-header-left">
          <Link
            href="/"
            style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span>IRIS</span>
            <span style={{ color: "var(--case-border-strong)" }}>/</span>
            <span style={{ color: "var(--case-text)" }}>FIELD NOTES</span>
          </Link>
        </div>

        <div className="helene-top-header-right">
          <span className="helene-header-tag">CASE STUDY 2024</span>
          <Link
            href="/workspace/case-studies"
            className="helene-back-btn"
            aria-label="Back to Case Studies"
          >
            <span>←</span>
            <span>BACK TO CASE STUDIES</span>
          </Link>
        </div>

        <div
          className="helene-progress-bar"
          style={{ width: `${scrollProgress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(scrollProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </header>

      {/* Mobile Chapter Navigation */}
      <div className="helene-mobile-nav" aria-label="Mobile table of contents">
        <select
          className="helene-mobile-select"
          value={activeSection}
          onChange={(e) => onSelectSection(e.target.value)}
          aria-label="Jump to investigation chapter"
        >
          {sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              {sec.title}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
