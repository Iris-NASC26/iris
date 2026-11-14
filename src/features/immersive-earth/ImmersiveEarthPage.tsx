"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DEMO_SCENES, INITIAL_LAYERS } from "./data/demoScenes";
import type { ImmersiveMode, LayerItem } from "./types";
import { CesiumImmersiveGlobe } from "./CesiumImmersiveGlobe";
import { ImmersiveHeader } from "./ImmersiveHeader";
import { ImmersiveModeDock } from "./ImmersiveModeDock";
import { ImmersiveNavigationRail } from "./ImmersiveNavigationRail";
import { LocationInformationPanel } from "./LocationInformationPanel";
import { GlobeQuickControls } from "./GlobeQuickControls";
import { EarthTimeline } from "./EarthTimeline";
import { LayersPanel } from "./panels/LayersPanel";
import { ComparePanel } from "./panels/ComparePanel";
import { EvidencePanel } from "./panels/EvidencePanel";
import { TimePanel } from "./panels/TimePanel";
import "./styles/immersive-earth.css";

export function ImmersiveEarthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mode and Location State
  const [activeMode, setActiveMode] = useState<ImmersiveMode>("explore");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("colombo");
  const [comparisonLocationId, setComparisonLocationId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("Jan 2024");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [layers, setLayers] = useState<LayerItem[]>(INITIAL_LAYERS);
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState<boolean>(true);

  // Camera Signals
  const [resetSignal, setResetSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState(0);

  // 2D Screen Projection of the Selected Location for Reticle & Connector
  const [screenPoint, setScreenPoint] = useState<{ x: number; y: number; visible: boolean } | null>(null);

  // Handle URL parameters (e.g. from Landing Page deep links)
  useEffect(() => {
    const place = searchParams.get("place");
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    if (place) {
      const match = Object.values(DEMO_SCENES).find(
        (s) =>
          s.locationName.toLowerCase().includes(place.toLowerCase()) ||
          place.toLowerCase().includes(s.locationName.toLowerCase()) ||
          s.country.toLowerCase().includes(place.toLowerCase())
      );
      if (match) {
        setSelectedLocationId(match.id);
        setIsLocationPanelOpen(true);
        return;
      }
    }

    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        let nearestId = "colombo";
        let minD = Infinity;
        Object.values(DEMO_SCENES).forEach((s) => {
          const d = Math.hypot(s.latitude - lat, s.longitude - lon);
          if (d < minD) {
            minD = d;
            nearestId = s.id;
          }
        });
        setSelectedLocationId(nearestId);
        setIsLocationPanelOpen(true);
      }
    }
  }, [searchParams]);

  // Synchronize URL without full reload
  const handleSelectLocation = useCallback(
    (id: string) => {
      setSelectedLocationId(id);
      setIsLocationPanelOpen(true);
      const targetScene = DEMO_SCENES[id];
      if (targetScene) {
        router.replace(
          `/workspace/globe?place=${encodeURIComponent(targetScene.locationName)}&lat=${targetScene.latitude}&lon=${targetScene.longitude}`,
          { scroll: false }
        );
      }
    },
    [router]
  );

  // Toggle Layer Visibility
  const handleToggleLayer = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  }, []);

  const handleOpacityChange = useCallback((layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, opacity } : layer
      )
    );
  }, []);

  // Quick Action Handlers
  const handleToggleRotate = useCallback(() => {
    setIsAutoRotating((prev) => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomSignal((prev) => prev + 1);
  }, []);

  const handleResetCamera = useCallback(() => {
    setSelectedLocationId("colombo");
    setIsAutoRotating(true);
    setResetSignal((prev) => prev + 1);
  }, []);

  const handleToggleLayers = useCallback(() => {
    setActiveMode((prev) => (prev === "layers" ? "explore" : "layers"));
  }, []);

  const handleToggleCompare = useCallback(() => {
    setActiveMode((prev) => (prev === "compare" ? "explore" : "compare"));
  }, []);

  const activeScene = DEMO_SCENES[selectedLocationId] || DEMO_SCENES.colombo;

  // Calculate card anchor position for the connecting curve
  // Card is placed at: right: 50px, top: ~26.5vh
  const cardAnchorX = typeof window !== "undefined" ? window.innerWidth - 418 - 50 : 1200;
  const cardAnchorY = typeof window !== "undefined" ? window.innerHeight * 0.35 : 350;

  return (
    <div className="iris-immersive-root">
      {/* Layer 0: Deep Space Starfield & Subtle Nebula */}
      <div className="iris-space-background" />

      {/* Layer 1: 3D Cesium Earth Globe */}
      <CesiumImmersiveGlobe
        comparisonLocationId={comparisonLocationId}
        isAutoRotating={isAutoRotating}
        onScreenPointUpdate={setScreenPoint}
        onSelectLocation={handleSelectLocation}
        resetSignal={resetSignal}
        selectedLocationId={selectedLocationId}
        zoomSignal={zoomSignal}
      />

      {/* Layer 2: Atmosphere Visual Enhancements */}
      <div className="iris-atmosphere-glow" />

      {/* Interactive Reticle & Connecting Arc SVG */}
      {isLocationPanelOpen && screenPoint && screenPoint.visible && (
        <svg className="iris-reticle-overlay">
          <defs>
            <linearGradient id="irisArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#13e0c0" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#2fffe0" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
            </linearGradient>
            <filter id="irisGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 4-Corner Reticle Brackets around Target Location */}
          <g transform={`translate(${screenPoint.x}, ${screenPoint.y})`} filter="url(#irisGlowFilter)">
            {/* Soft pulsing target circle */}
            <circle cx="0" cy="0" r="28" fill="none" stroke="#2fffe0" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <circle cx="0" cy="0" r="3" fill="#ffffff" />

            {/* Corner Bracket ┌ */}
            <path d="M -22 -14 L -22 -22 L -14 -22" fill="none" stroke="#2fffe0" strokeWidth="1.8" />
            {/* Corner Bracket ┐ */}
            <path d="M 14 -22 L 22 -22 L 22 -14" fill="none" stroke="#2fffe0" strokeWidth="1.8" />
            {/* Corner Bracket └ */}
            <path d="M -22 14 L -22 22 L -14 22" fill="none" stroke="#2fffe0" strokeWidth="1.8" />
            {/* Corner Bracket ┘ */}
            <path d="M 14 22 L 22 22 L 22 14" fill="none" stroke="#2fffe0" strokeWidth="1.8" />
          </g>

          {/* Sleek Bezier Connecting Arc from Reticle to Location Card */}
          {cardAnchorX > screenPoint.x && (
            <path
              d={`M ${screenPoint.x + 28} ${screenPoint.y} C ${screenPoint.x + (cardAnchorX - screenPoint.x) * 0.45} ${screenPoint.y - 10}, ${screenPoint.x + (cardAnchorX - screenPoint.x) * 0.55} ${cardAnchorY}, ${cardAnchorX} ${cardAnchorY}`}
              fill="none"
              stroke="url(#irisArcGrad)"
              strokeWidth="1.6"
              filter="url(#irisGlowFilter)"
            />
          )}
        </svg>
      )}

      {/* Layer 3: Top Header */}
      <ImmersiveHeader />

      {/* Layer 3: Minimal Left Navigation Rail */}
      <ImmersiveNavigationRail activeMode={activeMode} onModeChange={setActiveMode} />

      {/* Layer 3: Centered Floating Mode Dock */}
      <ImmersiveModeDock activeMode={activeMode} onModeChange={setActiveMode} />

      {/* Layer 4: Context Drawers according to Active Mode */}
      {activeMode === "layers" && (
        <LayersPanel
          layers={layers}
          onClose={() => setActiveMode("explore")}
          onOpacityChange={handleOpacityChange}
          onToggleLayer={handleToggleLayer}
        />
      )}

      {activeMode === "compare" && (
        <ComparePanel
          comparisonLocationId={comparisonLocationId}
          onClose={() => setActiveMode("explore")}
          onSelectComparison={setComparisonLocationId}
          primaryScene={activeScene}
          selectedDate={selectedDate}
        />
      )}

      {activeMode === "evidence" && (
        <EvidencePanel onClose={() => setActiveMode("explore")} scene={activeScene} />
      )}

      {activeMode === "time" && (
        <TimePanel
          isPlaying={isPlaying}
          onClose={() => setActiveMode("explore")}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          selectedDate={selectedDate}
        />
      )}

      {/* Layer 4: Right-Hand Location Information Card */}
      {isLocationPanelOpen && (
        <LocationInformationPanel
          onClose={() => setIsLocationPanelOpen(false)}
          scene={activeScene}
          selectedDate={selectedDate}
        />
      )}

      {/* Layer 5: Globe Quick Controls */}
      <GlobeQuickControls
        activeMode={activeMode}
        isAutoRotating={isAutoRotating}
        onReset={handleResetCamera}
        onToggleCompare={handleToggleCompare}
        onToggleLayers={handleToggleLayers}
        onToggleRotate={handleToggleRotate}
        onZoomIn={handleZoomIn}
      />

      {/* Layer 5: Floating Historical Timeline */}
      <EarthTimeline
        isPlaying={isPlaying}
        onDateChange={setSelectedDate}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        selectedDate={selectedDate}
      />

      {/* Subtle Scientific Attribution */}
      <aside className="iris-attribution">
        Earth imagery: NASA GIBS / Blue Marble (MODIS) · Atmosphere: NASA POWER MERRA-2
      </aside>
    </div>
  );
}
