"use client";

import React, { useState } from "react";

interface EarthSystemOrbitProps {
  onSelectScene: (sceneId: string) => void;
}

export function EarthSystemOrbit({ onSelectScene }: EarthSystemOrbitProps) {
  const [hoveredSignal, setHoveredSignal] = useState<string | null>(null);

  const signals = [
    {
      id: "ocean",
      num: "01",
      label: "OCEAN",
      color: "#6CBEC5",
      x: 390,
      y: 90,
      pathIndex: 0,
    },
    {
      id: "rainfall",
      num: "02",
      label: "RAIN",
      color: "#76A9CF",
      x: 440,
      y: 280,
      pathIndex: 1,
    },
    {
      id: "soil",
      num: "03",
      label: "SOIL",
      color: "#91A883",
      x: 340,
      y: 450,
      pathIndex: 2,
    },
    {
      id: "runoff",
      num: "04",
      label: "RUNOFF",
      color: "#C99B72",
      x: 100,
      y: 420,
      pathIndex: 3,
    },
    {
      id: "wind",
      num: "05",
      label: "WIND",
      color: "#B2A6BD",
      x: 70,
      y: 150,
      pathIndex: 4,
    },
  ];

  return (
    <div className="helene-orbit-container" aria-label="Conceptual Earth-System Orbit Graphic">
      <svg
        className="helene-orbit-svg"
        viewBox="0 0 530 530"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Conceptual Earth-System Hurricane Vortex Illustration"
      >
        <defs>
          <radialGradient id="orbitGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#11212A" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#08131B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#08131B" stopOpacity="0" />
          </radialGradient>
          <filter id="subtleBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Ambient backdrop disc */}
        <circle cx="265" cy="265" r="220" fill="url(#orbitGlow)" />

        {/* Outer orbital reference rings */}
        <circle
          cx="265"
          cy="265"
          r="230"
          stroke="rgba(218, 232, 229, 0.08)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <circle
          cx="265"
          cy="265"
          r="190"
          stroke="rgba(218, 232, 229, 0.12)"
          strokeWidth="1"
        />
        <circle
          cx="265"
          cy="265"
          r="135"
          stroke="rgba(218, 232, 229, 0.16)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Conceptual Vortex Topographic Contour Spirals */}
        {/* Spiral arm 1: Ocean Thermal Influence */}
        <path
          d="M 265 265 Q 290 200 360 170 T 400 110"
          stroke={hoveredSignal === "ocean" ? "#6CBEC5" : "rgba(108, 190, 197, 0.35)"}
          strokeWidth={hoveredSignal === "ocean" ? "2.5" : "1.5"}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "all 0.3s ease" }}
        />
        <path
          d="M 265 265 C 310 230 350 210 380 140"
          stroke="rgba(108, 190, 197, 0.2)"
          strokeWidth="1"
          fill="none"
        />

        {/* Spiral arm 2: Atmospheric Rain Bands */}
        <path
          d="M 265 265 Q 330 270 380 280 T 430 280"
          stroke={hoveredSignal === "rainfall" ? "#76A9CF" : "rgba(118, 169, 207, 0.35)"}
          strokeWidth={hoveredSignal === "rainfall" ? "2.5" : "1.5"}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "all 0.3s ease" }}
        />
        <path
          d="M 265 265 C 340 290 390 320 420 310"
          stroke="rgba(118, 169, 207, 0.2)"
          strokeWidth="1"
          strokeDasharray="2 4"
          fill="none"
        />

        {/* Spiral arm 3: Land Moisture Infiltration */}
        <path
          d="M 265 265 Q 310 340 330 390 T 340 440"
          stroke={hoveredSignal === "soil" ? "#91A883" : "rgba(145, 168, 131, 0.35)"}
          strokeWidth={hoveredSignal === "soil" ? "2.5" : "1.5"}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "all 0.3s ease" }}
        />
        <path
          d="M 265 265 C 290 350 300 400 315 425"
          stroke="rgba(145, 168, 131, 0.2)"
          strokeWidth="1"
          fill="none"
        />

        {/* Spiral arm 4: Topographic Runoff Paths */}
        <path
          d="M 265 265 Q 190 320 140 370 T 110 410"
          stroke={hoveredSignal === "runoff" ? "#C99B72" : "rgba(201, 155, 114, 0.35)"}
          strokeWidth={hoveredSignal === "runoff" ? "2.5" : "1.5"}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "all 0.3s ease" }}
        />
        <path
          d="M 265 265 C 180 340 160 380 135 410"
          stroke="rgba(201, 155, 114, 0.2)"
          strokeWidth="1"
          strokeDasharray="2 3"
          fill="none"
        />

        {/* Spiral arm 5: Atmospheric Wind Streamlines */}
        <path
          d="M 265 265 Q 180 210 130 180 T 80 160"
          stroke={hoveredSignal === "wind" ? "#B2A6BD" : "rgba(178, 166, 189, 0.35)"}
          strokeWidth={hoveredSignal === "wind" ? "2.5" : "1.5"}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "all 0.3s ease" }}
        />
        <path
          d="M 265 265 C 190 190 140 160 100 130"
          stroke="rgba(178, 166, 189, 0.2)"
          strokeWidth="1"
          fill="none"
        />

        {/* Center Vortex Core Eyewall Circles (Topographic style) */}
        <circle cx="265" cy="265" r="75" stroke="rgba(218, 232, 229, 0.25)" strokeWidth="1" />
        <circle cx="265" cy="265" r="50" stroke="rgba(218, 232, 229, 0.35)" strokeWidth="1.2" />
        <circle cx="265" cy="265" r="30" stroke="rgba(209, 123, 96, 0.6)" strokeWidth="1.5" />
        <circle cx="265" cy="265" r="14" fill="rgba(209, 123, 96, 0.2)" stroke="#D17B60" strokeWidth="1.5" />
        <circle cx="265" cy="265" r="4" fill="#D17B60" />

        {/* Vortex Calibrated Radials */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 265 + Math.cos(rad) * 32;
          const y1 = 265 + Math.sin(rad) * 32;
          const x2 = 265 + Math.cos(rad) * 44;
          const y2 = 265 + Math.sin(rad) * 44;
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(218, 232, 229, 0.25)"
              strokeWidth="1"
            />
          );
        })}

        {/* Numbered Orbital Labels & Markers */}
        {signals.map((sig) => {
          const isHovered = hoveredSignal === sig.id;
          return (
            <g
              key={sig.id}
              className="helene-orbit-label"
              onMouseEnter={() => setHoveredSignal(sig.id)}
              onMouseLeave={() => setHoveredSignal(null)}
              onClick={() => onSelectScene(sig.id)}
              tabIndex={0}
              role="button"
              aria-label={`Jump to ${sig.label} chapter`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectScene(sig.id);
                }
              }}
            >
              {/* Leader Line */}
              <circle
                cx={sig.x}
                cy={sig.y}
                r={isHovered ? 6 : 4}
                fill={sig.color}
                style={{ transition: "all 0.25s ease" }}
              />
              {isHovered && (
                <circle
                  cx={sig.x}
                  cy={sig.y}
                  r="10"
                  stroke={sig.color}
                  strokeWidth="1"
                  strokeOpacity="0.5"
                />
              )}

              {/* Text label */}
              <text
                x={sig.x > 265 ? sig.x + 14 : sig.x - 14}
                y={sig.y + 4}
                textAnchor={sig.x > 265 ? "start" : "end"}
                fill={isHovered ? "#F5F3EC" : "#C0C9CB"}
                fontSize="12"
                fontWeight="600"
                letterSpacing="0.08em"
                fontFamily="system-ui, sans-serif"
                style={{ transition: "fill 0.2s ease" }}
              >
                <tspan fill={sig.color} fontWeight="700">
                  {sig.num}
                </tspan>
                <tspan dx="6">/ {sig.label}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
