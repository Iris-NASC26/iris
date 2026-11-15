"use client";

import React, { useState, useEffect } from "react";
import "./heleneStyles.css";
import { ScientificScene } from "./types";
import { HeleneHeader } from "./HeleneHeader";
import { HeleneHero } from "./HeleneHero";
import { StudyRegion } from "./StudyRegion";
import { EvidenceSignalIndex } from "./EvidenceSignalIndex";
import { GuidedInvestigation } from "./GuidedInvestigation";
import { EvidenceTimeline } from "./EvidenceTimeline";
import { SignalComparison } from "./SignalComparison";
import { ScientificVerdict } from "./ScientificVerdict";
import { EvidenceLimitations } from "./EvidenceLimitations";
import { SourcesAndMethods } from "./SourcesAndMethods";

export function HeleneArticle() {
  const [activeSection, setActiveSection] = useState("hero");
  const [activeScene, setActiveScene] = useState<ScientificScene>("ocean");

  const sections = [
    { id: "hero", num: "01", title: "Introduction", shortLabel: "Intro" },
    { id: "study-region", num: "02", title: "Geographic Context", shortLabel: "Region" },
    { id: "five-signals", num: "03", title: "Five Signals", shortLabel: "Signals" },
    { id: "ocean", num: "04", title: "Ocean Investigation", shortLabel: "Ocean" },
    { id: "rainfall", num: "05", title: "Rainfall Investigation", shortLabel: "Rain" },
    { id: "soil", num: "06", title: "Soil Moisture", shortLabel: "Soil" },
    { id: "runoff", num: "07", title: "Surface Runoff", shortLabel: "Runoff" },
    { id: "wind", num: "08", title: "Wind Speed", shortLabel: "Wind" },
    { id: "evidence-timeline", num: "09", title: "Evidence Timeline", shortLabel: "Timeline" },
    { id: "compare-signals", num: "10", title: "Compare Signals", shortLabel: "Compare" },
    { id: "scientific-verdict", num: "11", title: "Scientific Verdict", shortLabel: "Verdict" },
    { id: "limitations", num: "12", title: "Limitations", shortLabel: "Limits" },
    { id: "sources", num: "13", title: "Sources & Methodology", shortLabel: "Sources" },
  ];

  // Smooth scroll handler
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectChapter = (scene: ScientificScene) => {
    setActiveScene(scene);
    scrollTo(scene);
  };

  // Section visibility tracking for chapter rail
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight / 3;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  return (
    <article className="helene-article-root" aria-label="Hurricane Helene Interactive Case Study">
      {/* Top Header */}
      <HeleneHeader
        sections={sections}
        activeSection={activeSection}
        onSelectSection={scrollTo}
      />

      {/* Narrow Desktop Fixed Chapter Progress Rail (left: 28px, top: 50%) */}
      <nav className="helene-chapter-rail" aria-label="Investigation progress rail">
        <div className="helene-rail-line" />
        {sections.map((sec, idx) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              className={`helene-rail-item ${isActive ? "active" : ""}`}
              onClick={() => scrollTo(sec.id)}
              aria-label={`Jump to ${sec.title}`}
            >
              <div className="helene-rail-dot" />
              <div className="helene-rail-tooltip">
                <span style={{ color: "var(--case-accent)", fontWeight: 700, marginRight: "6px" }}>
                  {sec.num}
                </span>
                {sec.title}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Scene 1: Editorial Hero */}
      <HeleneHero
        onBeginInvestigation={() => scrollTo("study-region")}
        onExploreEvidence={() => scrollTo("evidence-timeline")}
        onSelectScene={(sceneId) => {
          setActiveScene(sceneId as ScientificScene);
          scrollTo(sceneId);
        }}
      />

      {/* Scene 2: Geographic Question */}
      <StudyRegion />

      {/* Scene 3: Five Evidence Signals */}
      <EvidenceSignalIndex onSelectChapter={handleSelectChapter} />

      {/* Scenes 4–8: Guided Scrollytelling Investigation Engine */}
      <GuidedInvestigation
        activeScene={activeScene}
        setActiveScene={setActiveScene}
      />

      {/* Scene 9: Signature Experience — The Evidence Timeline */}
      <EvidenceTimeline />

      {/* Scene 10: Compare the Signals */}
      <SignalComparison />

      {/* Scene 11: The Scientific Verdict */}
      <ScientificVerdict />

      {/* Scene 12: Evidence Limitations */}
      <EvidenceLimitations />

      {/* Scene 13: Sources & Methodology */}
      <SourcesAndMethods />
    </article>
  );
}
