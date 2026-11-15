"use client";

import React, { useEffect, useRef } from "react";
import { ScientificScene } from "./types";
import { ScientificStage } from "./ScientificStage";
import { OceanScene } from "./OceanScene";
import { RainfallScene } from "./RainfallScene";
import { SoilScene } from "./SoilScene";
import { RunoffScene } from "./RunoffScene";
import { WindScene } from "./WindScene";

interface GuidedInvestigationProps {
  activeScene: ScientificScene;
  setActiveScene: (scene: ScientificScene) => void;
}

export function GuidedInvestigation({
  activeScene,
  setActiveScene,
}: GuidedInvestigationProps) {
  const oceanRef = useRef<HTMLDivElement>(null);
  const rainRef = useRef<HTMLDivElement>(null);
  const soilRef = useRef<HTMLDivElement>(null);
  const runoffRef = useRef<HTMLDivElement>(null);
  const windRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const scene = entry.target.getAttribute("data-scene") as ScientificScene;
          if (scene) {
            setActiveScene(scene);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "-25% 0px -40% 0px",
      threshold: 0.1,
    });

    const refs = [oceanRef, rainRef, soilRef, runoffRef, windRef];
    refs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [setActiveScene]);

  return (
    <section className="helene-section" id="investigation">
      <div className="helene-container">
        <div className="helene-scrolly-container">
          {/* Left Narrative Column (38%) */}
          <div className="helene-scrolly-narrative">
            {/* Chapter 1: Ocean */}
            <div
              ref={oceanRef}
              data-scene="ocean"
              id="ocean"
              className="helene-scrolly-step"
            >
              <div className="helene-eyebrow" style={{ color: "var(--ocean-color)" }}>
                01 / THE OCEAN
              </div>
              <h2 className="helene-chapter-heading helene-serif">
                The water was warm. But was it unusual?
              </h2>
              <p className="helene-body-text">
                Sea surface temperature changes naturally with the seasons. During
                late summer, warm water is common in the region&apos;s coastal
                environment.
              </p>
              <p className="helene-body-text">
                NASA MODIS-Aqua nighttime sea surface temperature measurements provide
                a view of that thermal background.
              </p>
              <p className="helene-body-text">
                The supplied case-study observations report 27.72°C in August 2024 and
                27.18°C for September 2024.
              </p>
              <p className="helene-body-text">
                These values help describe the regional environment around Helene, but
                they do not independently establish how much the storm intensified or
                why.
              </p>

              {/* Mobile-only inline visualization */}
              <div className="lg:hidden block" style={{ marginTop: "24px" }}>
                <OceanScene />
              </div>
            </div>

            {/* Chapter 2: Rainfall */}
            <div
              ref={rainRef}
              data-scene="rainfall"
              id="rainfall"
              className="helene-scrolly-step"
            >
              <div className="helene-eyebrow" style={{ color: "var(--rain-color)" }}>
                02 / THE ATMOSPHERE
              </div>
              <h2 className="helene-chapter-heading helene-serif">
                Then September broke the pattern.
              </h2>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "var(--case-accent)",
                  fontStyle: "italic",
                  marginBottom: "16px",
                }}
              >
                Note: this is a sharp contrast among the supplied months, not a
                verified record across all available history.
              </p>
              <p className="helene-body-text">
                The study region experienced substantial monthly precipitation in
                September 2024.
              </p>
              <p className="helene-body-text">
                The NASA NLDAS-2 series reports 138.53 kg/m² in August, 212.52 kg/m² in
                September, and 18.73 kg/m² in October.
              </p>
              <p className="helene-body-text">
                These three months tell a striking story of contrast—but
                September&apos;s value represents the entire month, not precipitation
                attributed exclusively to Hurricane Helene.
              </p>

              {/* Mobile-only inline visualization */}
              <div className="lg:hidden block" style={{ marginTop: "24px" }}>
                <RainfallScene />
              </div>
            </div>

            {/* Chapter 3: Soil Moisture */}
            <div
              ref={soilRef}
              data-scene="soil"
              id="soil"
              className="helene-scrolly-step"
            >
              <div className="helene-eyebrow" style={{ color: "var(--soil-color)" }}>
                03 / THE LAND
              </div>
              <h2 className="helene-chapter-heading helene-serif">
                A remarkable change, just one day apart.
              </h2>
              <p className="helene-body-text">
                Monthly precipitation can conceal rapid changes in the land system.
              </p>
              <p className="helene-body-text">
                The GLDAS daily surface-soil moisture product provides a different
                view.
              </p>
              <p className="helene-body-text">
                On September 25, 2024, the regional estimate was approximately 6.65
                kg/m². By September 26, it had increased to approximately 7.66 kg/m².
              </p>
              <p className="helene-body-text">
                That is a day-to-day increase of roughly 1.02 kg/m².
              </p>

              {/* Mobile-only inline visualization */}
              <div className="lg:hidden block" style={{ marginTop: "24px" }}>
                <SoilScene />
              </div>
            </div>

            {/* Chapter 4: Runoff */}
            <div
              ref={runoffRef}
              data-scene="runoff"
              id="runoff"
              className="helene-scrolly-step"
            >
              <div className="helene-eyebrow" style={{ color: "var(--runoff-color)" }}>
                04 / THE LAND–WATER INTERFACE
              </div>
              <h2 className="helene-chapter-heading helene-serif">
                The runoff signal rose, too.
              </h2>
              <p className="helene-body-text">
                Surface runoff is another component of the land-water system.
              </p>
              <p className="helene-body-text">
                The GLDAS Noah monthly product reports 0.009694 kg/m² in August 2024 and
                0.018576 kg/m² in September.
              </p>
              <p className="helene-body-text">
                September&apos;s value is approximately 1.92 times August&apos;s.
              </p>
              <p className="helene-body-text">
                This is a change in the modeled runoff product. It is not a direct
                measurement of river discharge, flood depth, or water level.
              </p>

              {/* Mobile-only inline visualization */}
              <div className="lg:hidden block" style={{ marginTop: "24px" }}>
                <RunoffScene />
              </div>
            </div>

            {/* Chapter 5: Wind */}
            <div
              ref={windRef}
              data-scene="wind"
              id="wind"
              className="helene-scrolly-step"
            >
              <div className="helene-eyebrow" style={{ color: "var(--wind-color)" }}>
                05 / THE ATMOSPHERE
              </div>
              <h2 className="helene-chapter-heading helene-serif">
                The storm was extreme. The average looks ordinary. Why?
              </h2>
              <p className="helene-body-text">
                The MERRA-2 monthly surface wind-speed value for September 2024 was
                approximately 4.79 m/s across the study region.
              </p>
              <p className="helene-body-text">
                That number should not be interpreted as Hurricane Helene&apos;s peak
                wind.
              </p>
              <p className="helene-body-text">
                A spatial and temporal average can conceal short-lived and localized
                extremes.
              </p>

              {/* Mobile-only inline visualization */}
              <div className="lg:hidden block" style={{ marginTop: "24px" }}>
                <WindScene />
              </div>
            </div>
          </div>

          {/* Right Visualization Stage (62%, Desktop Sticky) */}
          <div className="helene-stage-sticky-wrapper hidden lg:block">
            <ScientificStage activeScene={activeScene} />
          </div>
        </div>
      </div>
    </section>
  );
}
