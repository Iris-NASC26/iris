"use client";

import React from "react";
import { ScientificScene } from "./types";
import { OceanScene } from "./OceanScene";
import { RainfallScene } from "./RainfallScene";
import { SoilScene } from "./SoilScene";
import { RunoffScene } from "./RunoffScene";
import { WindScene } from "./WindScene";

interface ScientificStageProps {
  activeScene: ScientificScene;
}

export function ScientificStage({ activeScene }: ScientificStageProps) {
  const getSceneHeader = (scene: ScientificScene) => {
    switch (scene) {
      case "ocean":
        return {
          num: "01",
          title: "OCEAN THERMAL STAGE",
          color: "var(--ocean-color)",
          badge: "MODIS-Aqua Nighttime SST",
        };
      case "rainfall":
        return {
          num: "02",
          title: "ATMOSPHERIC RAINFALL CHAMBER",
          color: "var(--rain-color)",
          badge: "NLDAS-2 Monthly",
        };
      case "soil":
        return {
          num: "03",
          title: "SOIL CROSS-SECTION CUTAWAY",
          color: "var(--soil-color)",
          badge: "GLDAS CLSM Daily Moisture",
        };
      case "runoff":
        return {
          num: "04",
          title: "FLOWING TERRAIN INTERFACE",
          color: "var(--runoff-color)",
          badge: "GLDAS Noah Runoff",
        };
      case "wind":
        return {
          num: "05",
          title: "TEMPORAL AVERAGING EXPERIMENT",
          color: "var(--wind-color)",
          badge: "MERRA-2 Surface Wind",
        };
    }
  };

  const header = getSceneHeader(activeScene);

  return (
    <div className="helene-scientific-stage" role="region" aria-label={header.title}>
      {/* Stage Header */}
      <div className="helene-stage-header">
        <div className="helene-stage-header-title">
          <span style={{ color: header.color, fontWeight: 700 }}>
            {header.num}
          </span>
          <span style={{ color: "var(--case-border-strong)" }}>/</span>
          <span style={{ color: "var(--case-text)" }}>{header.title}</span>
        </div>
        <div
          style={{
            fontSize: "11px",
            color: header.color,
            fontFamily: "monospace",
            padding: "2px 8px",
            background: "rgba(255, 255, 255, 0.04)",
            borderRadius: "4px",
            border: "1px solid var(--case-border)",
          }}
        >
          {header.badge}
        </div>
      </div>

      {/* Stage Visual Body */}
      <div className="helene-stage-body">
        {activeScene === "ocean" && <OceanScene />}
        {activeScene === "rainfall" && <RainfallScene />}
        {activeScene === "soil" && <SoilScene />}
        {activeScene === "runoff" && <RunoffScene />}
        {activeScene === "wind" && <WindScene />}
      </div>
    </div>
  );
}
