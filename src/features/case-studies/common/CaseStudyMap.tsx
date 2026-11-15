"use client";

import React from "react";

interface CaseStudyMapProps {
  locationName: string;
  coords: {
    west: number;
    east: number;
    south: number;
    north: number;
  };
  center: {
    lat: number;
    lon: number;
  };
}

export function CaseStudyMap({ locationName, coords, center }: CaseStudyMapProps) {
  const width = 480;
  const height = 280;
  const padding = 40;

  // Calculate normalized coordinate positioning inside the SVG box
  const lonSpan = coords.east - coords.west || 1;
  const latSpan = coords.north - coords.south || 1;

  const getX = (lon: number) => {
    return padding + ((lon - coords.west) / lonSpan) * (width - 2 * padding);
  };

  const getY = (lat: number) => {
    return height - padding - ((lat - coords.south) / latSpan) * (height - 2 * padding);
  };

  const minX = getX(coords.west);
  const maxX = getX(coords.east);
  const minY = getY(coords.north);
  const maxY = getY(coords.south);

  const centerX = getX(center.lon);
  const centerY = getY(center.lat);

  return (
    <div style={{ width: "100%", maxWidth: "540px", margin: "0 auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`Geographic bounding box for ${locationName}`}
      >
        <defs>
          <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(218, 232, 229, 0.05)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width={width} height={height} fill="#0b171f" rx="8" />
        <rect width={width} height={height} fill="url(#gridPattern)" rx="8" />

        {/* Lat/Lon Guide Lines */}
        <line x1={padding} y1={centerY} x2={width - padding} y2={centerY} stroke="rgba(218, 232, 229, 0.12)" strokeDasharray="3 3" />
        <line x1={centerX} y1={padding} x2={centerX} y2={height - padding} stroke="rgba(218, 232, 229, 0.12)" strokeDasharray="3 3" />

        {/* Bounding Box Outline */}
        <rect
          x={minX + 8}
          y={minY + 8}
          width={Math.max(20, maxX - minX - 16)}
          height={Math.max(20, maxY - minY - 16)}
          fill="rgba(21, 157, 126, 0.08)"
          stroke="#159d7e"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          rx="4"
        />

        {/* Center Target Marker */}
        <circle cx={centerX} cy={centerY} r="18" fill="rgba(21, 157, 126, 0.15)" />
        <circle cx={centerX} cy={centerY} r="6" fill="#159d7e" />
        <circle cx={centerX} cy={centerY} r="2" fill="#ffffff" />

        {/* Location Label */}
        <text
          x={centerX}
          y={Math.min(height - 48, centerY + 30)}
          textAnchor="middle"
          fill="#f5f3ec"
          fontSize="12"
          fontWeight="600"
          fontFamily="inherit"
        >
          {locationName}
        </text>

        {/* Lat / Lon Labels */}
        <text x={padding} y={height - 12} fill="#69818b" fontSize="10" fontFamily="monospace">
          {coords.west.toFixed(2)}°E, {coords.south.toFixed(2)}°N
        </text>
        <text x={width - padding} y={20} textAnchor="end" fill="#69818b" fontSize="10" fontFamily="monospace">
          {coords.east.toFixed(2)}°E, {coords.north.toFixed(2)}°N
        </text>
        <text x={centerX} y={20} textAnchor="middle" fill="#159d7e" fontSize="10" fontFamily="monospace" fontWeight="bold">
          CENTER: {center.lat.toFixed(2)}°N, {center.lon.toFixed(2)}°E
        </text>
      </svg>
    </div>
  );
}
