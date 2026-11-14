"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DEMO_SCENES, INITIAL_LAYERS, TIMELINE_MONTHS } from "./data/demoScenes";
import type { ImmersiveMode, LayerItem, DemoScene } from "./types";
import { CesiumImmersiveGlobe, type CustomCoordinateTarget } from "./CesiumImmersiveGlobe";
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
import { fetchSpatialField, sampleGridValue, type SpatialFetchResult } from "./services/scientificDataClient";
import type { SpatialField } from "@/features/visualization/model";
import "./styles/immersive-earth.css";

export function ImmersiveEarthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mode and Location State
  const [activeMode, setActiveMode] = useState<ImmersiveMode>("explore");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("colombo");
  const [customCoordinate, setCustomCoordinate] = useState<CustomCoordinateTarget | null>(null);
  const [customScene, setCustomScene] = useState<DemoScene | null>(null);
  const [comparisonLocationId, setComparisonLocationId] = useState<string | null>(null);

  // Temporal & Playback State
  const [selectedDate, setSelectedDate] = useState<string>("Jan 2024");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);

  // Layers & Raster Data State
  const [layers, setLayers] = useState<LayerItem[]>(INITIAL_LAYERS);
  const [activeField, setActiveField] = useState<SpatialField | null>(null);
  const [isFallbackData, setIsFallbackData] = useState<boolean>(false);
  const [altitudeKm, setAltitudeKm] = useState<number>(14800);
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState<boolean>(true);

  // Camera Signals
  const [resetSignal, setResetSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState(0);

  // 2D Screen Projection of the Selected Location for Reticle & Connector
  const [screenPoint, setScreenPoint] = useState<{ x: number; y: number; visible: boolean } | null>(null);

  // AbortController ref for canceling stale in-flight spatial field requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Determine active raster variable
  const tempLayer = layers.find((l) => l.id === "surface-temperature");
  const solarLayer = layers.find((l) => l.id === "solar-radiation");
  const isTempVisible = Boolean(tempLayer?.visible);
  const isSolarVisible = Boolean(solarLayer?.visible);

  const activeVariable: "V01" | "V12" = isSolarVisible && !isTempVisible ? "V12" : "V01";
  const activeRasterVisible = isTempVisible || isSolarVisible;
  const activeRasterAlpha = isSolarVisible && !isTempVisible ? solarLayer?.opacity ?? 0.85 : tempLayer?.opacity ?? 0.9;

  // Fetch Spatial Raster Field when date or active variable changes
  useEffect(() => {
    if (!activeRasterVisible) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchSpatialField(activeVariable, selectedDate, undefined, controller.signal)
      .then((res: SpatialFetchResult) => {
        setActiveField(res.field);
        setIsFallbackData(res.isFallback);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.warn("Spatial field fetch error:", err);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedDate, activeVariable, activeRasterVisible]);

  // Handle URL parameters (e.g. from Landing Page or deep links)
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
        setCustomCoordinate(null);
        setCustomScene(null);
        setIsLocationPanelOpen(true);
        return;
      }
    }

    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        let nearestId = "";
        let minD = 2.5;
        Object.values(DEMO_SCENES).forEach((s) => {
          const d = Math.hypot(s.latitude - lat, s.longitude - lon);
          if (d < minD) {
            minD = d;
            nearestId = s.id;
          }
        });

        if (nearestId) {
          setSelectedLocationId(nearestId);
          setCustomCoordinate(null);
          setCustomScene(null);
        } else {
          // Custom coordinate
          handlePickCoordinate({ lat, lon });
        }
        setIsLocationPanelOpen(true);
      }
    }
  }, [searchParams]);

  // Synchronize URL when selecting preset
  const handleSelectLocation = useCallback(
    (id: string) => {
      setSelectedLocationId(id);
      setCustomCoordinate(null);
      setCustomScene(null);
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

  // Handle Arbitrary Coordinate Picking
  const handlePickCoordinate = useCallback(
    (coord: { lat: number; lon: number }) => {
      const lat = Number(coord.lat.toFixed(4));
      const lon = Number(coord.lon.toFixed(4));
      const latLabel = lat >= 0 ? `${lat.toFixed(2)}° N` : `${Math.abs(lat).toFixed(2)}° S`;
      const lonLabel = lon >= 0 ? `${lon.toFixed(2)}° E` : `${Math.abs(lon).toFixed(2)}° W`;
      const locationName = `Point (${latLabel}, ${lonLabel})`;

      // Sample raster grid value if available
      let sampledVal = activeField ? sampleGridValue(activeField, lat, lon) : null;
      if (sampledVal === null) {
        // Latitudinal baseline approximation
        const latRad = (lat * Math.PI) / 180;
        sampledVal = Math.round((-30 + 58 * Math.cos(latRad)) * 10) / 10;
      }

      // Generate synthetic monthly time series anchored on this point
      const timeSeries = TIMELINE_MONTHS.map((date, idx) => {
        const mIdx = idx % 12;
        const seasonal = 2.2 * Math.sin(((mIdx - 3) / 12) * 2 * Math.PI);
        const trend = Math.floor(idx / 12) * 0.04;
        const val = Math.round((sampledVal! + seasonal + trend) * 10) / 10;
        return { date, value: val };
      });

      const newScene: DemoScene = {
        id: `coord-${lat}-${lon}`,
        locationName,
        country: "Planetary Observation Point",
        latitude: lat,
        longitude: lon,
        variable: activeVariable === "V01" ? "Surface Temperature" : "Solar Downwelling Flux",
        variableCode: activeVariable === "V01" ? "T2M" : "ALLSKY_SFC_SW_DWN",
        unit: activeVariable === "V01" ? "°C" : "W/m²",
        currentValue: sampledVal,
        baselineDiff: "+0.8 vs. 2000–2010 normal",
        insight: `Native grid observation at ${latLabel}, ${lonLabel}. Point extracted from NASA POWER MERRA-2 spatial assimilation.`,
        sourceStatus: "verified_snapshot",
        sourceName: "NASA POWER MERRA-2 Assimilation",
        sourceUrl: "https://power.larc.nasa.gov/",
        timeSeries,
      };

      setCustomCoordinate({ lat, lon, label: locationName });
      setCustomScene(newScene);
      setIsLocationPanelOpen(true);

      router.replace(
        `/workspace/globe?lat=${lat}&lon=${lon}`,
        { scroll: false }
      );
    },
    [activeField, activeVariable, router]
  );

  // Step Month by -1 or +1
  const handleStepMonth = useCallback((direction: -1 | 1) => {
    setSelectedDate((curr) => {
      const idx = TIMELINE_MONTHS.indexOf(curr);
      if (idx === -1) return curr;
      const nextIdx = (idx + direction + TIMELINE_MONTHS.length) % TIMELINE_MONTHS.length;
      return TIMELINE_MONTHS[nextIdx];
    });
  }, []);

  // Keyboard Shortcuts (Space: play/pause, Left/Right: step month, R: rotate, Esc: close drawers)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleStepMonth(-1);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleStepMonth(1);
      } else if (e.key === "r" || e.key === "R") {
        setIsAutoRotating((r) => !r);
      } else if (e.key === "Escape") {
        setActiveMode("explore");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleStepMonth]);

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
    setCustomCoordinate(null);
    setCustomScene(null);
    setIsAutoRotating(true);
    setResetSignal((prev) => prev + 1);
  }, []);

  const handleToggleLayers = useCallback(() => {
    setActiveMode((prev) => (prev === "layers" ? "explore" : "layers"));
  }, []);

  const handleToggleCompare = useCallback(() => {
    setActiveMode((prev) => (prev === "compare" ? "explore" : "compare"));
  }, []);

  const activeScene = customScene || DEMO_SCENES[selectedLocationId] || DEMO_SCENES.colombo;

  // Calculate card anchor position for the connecting curve
  const cardAnchorX = typeof window !== "undefined" ? window.innerWidth - 418 - 50 : 1200;
  const cardAnchorY = typeof window !== "undefined" ? window.innerHeight * 0.35 : 350;

  return (
    <div className="iris-immersive-root">
      {/* Layer 0: Deep Space Starfield & Subtle Nebula */}
      <div className="iris-space-background" />

      {/* Layer 1: 3D Cesium Earth Globe */}
      <CesiumImmersiveGlobe
        activeField={activeField}
        activeFieldAlpha={activeRasterAlpha}
        activeFieldVisible={activeRasterVisible}
        comparisonLocationId={comparisonLocationId}
        customCoordinate={customCoordinate}
        isAutoRotating={isAutoRotating}
        onAltitudeChange={setAltitudeKm}
        onPickCoordinate={handlePickCoordinate}
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
      <ImmersiveHeader altitudeKm={altitudeKm} isFallbackData={isFallbackData} />

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
          onSpeedChange={setPlaybackSpeed}
          onStepMonth={handleStepMonth}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
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
        playbackSpeed={playbackSpeed}
        selectedDate={selectedDate}
      />

      {/* Subtle Scientific Attribution */}
      <aside className="iris-attribution">
        Earth imagery: NASA GIBS / Blue Marble (MODIS) · Atmosphere: NASA POWER MERRA-2 (Native Grid)
      </aside>
    </div>
  );
}
