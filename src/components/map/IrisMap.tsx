"use client";

import { bbox as turfBbox, bboxPolygon } from "@turf/turf";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";
import {
  Layer,
  Map,
  NavigationControl,
  ScaleControl,
  Source,
  useControl,
  type LayerProps,
  type MapRef,
} from "react-map-gl/maplibre";
import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { IControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { Icon } from "@/components/ui/Icon";

const MIN_SPAN = 0.1;
const MAX_SPAN = 5;

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    openstreetmap: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "openstreetmap", type: "raster" as const, source: "openstreetmap" }],
};

const coverageFill: LayerProps = {
  id: "iris-coverage-fill",
  type: "fill",
  paint: { "fill-color": "#059669", "fill-opacity": 0.2 },
};

const coverageLine: LayerProps = {
  id: "iris-coverage-line",
  type: "line",
  paint: { "line-color": "#047857", "line-width": 2 },
};

const bboxFill: LayerProps = {
  id: "iris-bbox-fill",
  type: "fill",
  paint: { "fill-color": "#059669", "fill-opacity": 0.12 },
};

const bboxLine: LayerProps = {
  id: "iris-bbox-line",
  type: "line",
  paint: { "line-color": "#047857", "line-width": 2, "line-dasharray": [4, 2] },
};

export type IrisMapBbox = [number, number, number, number];
export type IrisMapCoverage =
  | Feature<Polygon | MultiPolygon>
  | FeatureCollection<Polygon | MultiPolygon>
  | Polygon
  | MultiPolygon;

export interface IrisMapProps {
  mode: "selection" | "preview";
  bbox?: IrisMapBbox;
  coverageGeoJSON?: IrisMapCoverage | null;
  onRegionSelect?: (bbox: IrisMapBbox, regionName?: string) => void;
  onMapClick?: (coordinate: [number, number]) => void;
  height?: string;
  className?: string;
  regionName?: string;
}

interface DrawControlProps {
  drawRef: React.MutableRefObject<MapboxDraw | null>;
  onDrawChange: (features: Feature[]) => void;
}

function DrawControl({ drawRef, onDrawChange }: DrawControlProps) {
  const onDrawCreate = useCallback(
    (event: { features: Feature[] }) => onDrawChange(event.features),
    [onDrawChange],
  );
  const onDrawUpdate = useCallback(
    (event: { features: Feature[] }) => onDrawChange(event.features),
    [onDrawChange],
  );

  const draw = useControl(
    () =>
      new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: "simple_select",
      }) as unknown as IControl & MapboxDraw,
    ({ map }) => {
      const eventMap = map as unknown as {
        on: (type: string, listener: (event: { features: Feature[] }) => void) => void;
      };
      eventMap.on("draw.create", onDrawCreate);
      eventMap.on("draw.update", onDrawUpdate);
    },
    ({ map }) => {
      const eventMap = map as unknown as {
        off: (type: string, listener: (event: { features: Feature[] }) => void) => void;
      };
      eventMap.off("draw.create", onDrawCreate);
      eventMap.off("draw.update", onDrawUpdate);
    },
    { position: "top-left" },
  );

  useEffect(() => {
    drawRef.current = draw;
    return () => {
      drawRef.current = null;
    };
  }, [draw, drawRef]);

  return null;
}

function validateFeature(feature: Feature): { bbox?: IrisMapBbox; error?: string } {
  if (!feature.geometry) {
    return { error: "The drawn shape has no geometry." };
  }

  const coordinatesAreValid = (geometry: Geometry): boolean => {
    if (geometry.type === "GeometryCollection") {
      return geometry.geometries.every(coordinatesAreValid);
    }

    const visit = (value: unknown): boolean => {
      if (!Array.isArray(value)) return false;
      if (typeof value[0] === "number" && typeof value[1] === "number") {
        return (
          Number.isFinite(value[0]) &&
          Number.isFinite(value[1]) &&
          value[0] >= -180 &&
          value[0] <= 180 &&
          value[1] >= -90 &&
          value[1] <= 90
        );
      }
      return value.every(visit);
    };

    return visit(geometry.coordinates);
  };

  if (!coordinatesAreValid(feature.geometry)) {
    return { error: "Selection contains coordinates outside WGS84 bounds." };
  }

  const bounds = turfBbox(feature) as IrisMapBbox;
  if (!bounds.every(Number.isFinite)) {
    return { error: "The drawn shape contains invalid coordinates." };
  }

  const [minLon, minLat, maxLon, maxLat] = bounds;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
    return { error: "Selection must stay within WGS84 bounds (longitude ±180°, latitude ±90°)." };
  }

  const width = maxLon - minLon;
  const height = maxLat - minLat;
  if (width < MIN_SPAN || height < MIN_SPAN) {
    return { error: `Selection must be at least ${MIN_SPAN}° wide and tall.` };
  }
  if (width > MAX_SPAN || height > MAX_SPAN) {
    return { error: `Selection cannot exceed ${MAX_SPAN}° in either dimension.` };
  }

  return { bbox: [minLon, minLat, maxLon, maxLat] };
}

function getRectangleFeature(
  first: [number, number],
  second: [number, number],
): Feature<Polygon> {
  const [west, east] = [first[0], second[0]].sort((a, b) => a - b);
  const [south, north] = [first[1], second[1]].sort((a, b) => a - b);
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]],
    },
  };
}

const QUICK_LOCATION_PRESETS: Array<{ name: string; bbox: IrisMapBbox }> = [
  { name: "Sri Lanka", bbox: [79.6, 6.0, 81.8, 9.8] },
  { name: "California Valley", bbox: [-122.5, 35.5, -119.0, 39.0] },
  { name: "Horn of Africa", bbox: [38.0, 3.5, 43.0, 8.5] },
  { name: "Amazon Basin", bbox: [-63.5, -5.5, -59.5, -1.5] },
  { name: "Central Europe", bbox: [9.0, 47.5, 13.5, 51.5] },
];

export function IrisMap({
  mode,
  bbox,
  coverageGeoJSON,
  onRegionSelect,
  onMapClick,
  height = "400px",
  className = "",
  regionName,
}: IrisMapProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const rectangleStartRef = useRef<[number, number] | null>(null);

  const [activeTool, setActiveTool] = useState<"rectangle" | "polygon" | null>(null);
  const [rectanglePreview, setRectanglePreview] = useState<Feature<Polygon> | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stagedBbox, setStagedBbox] = useState<IrisMapBbox | undefined>(bbox);
  const [stagedRegionName, setStagedRegionName] = useState<string | undefined>(regionName);

  // Jump-to-location search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Sync staged bbox with prop when prop updates
  useEffect(() => {
    if (bbox) {
      setStagedBbox(bbox);
      setStagedRegionName(regionName);
    }
  }, [bbox, regionName]);

  const activeBboxToRender = stagedBbox ?? bbox;
  const bboxIsRenderable =
    activeBboxToRender !== undefined &&
    activeBboxToRender.every(Number.isFinite) &&
    activeBboxToRender[0] >= -180 &&
    activeBboxToRender[2] <= 180 &&
    activeBboxToRender[1] >= -90 &&
    activeBboxToRender[3] <= 90 &&
    activeBboxToRender[0] < activeBboxToRender[2] &&
    activeBboxToRender[1] < activeBboxToRender[3];

  const fitToBbox = useCallback((targetBbox: IrisMapBbox, padding = 48) => {
    if (!mapRef.current) return;
    mapRef.current.fitBounds(
      [
        [targetBbox[0], targetBbox[1]],
        [targetBbox[2], targetBbox[3]],
      ],
      { padding, duration: 500, maxZoom: 12 },
    );
  }, []);

  useEffect(() => {
    if (!bboxIsRenderable || !activeBboxToRender || !mapRef.current) return;
    fitToBbox(activeBboxToRender);
  }, [activeBboxToRender, bboxIsRenderable, fitToBbox]);

  // Handle map resize on fullscreen transition and window changes
  useEffect(() => {
    const resizeMap = () => {
      try {
        mapRef.current?.resize();
      } catch {
        // Map instance might not be mounted yet
      }
    };

    // Immediate and staged resizes to accommodate CSS transitions
    resizeMap();
    const frameId = requestAnimationFrame(resizeMap);
    const timer1 = setTimeout(resizeMap, 100);
    const timer2 = setTimeout(resizeMap, 300);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isExpanded]);

  // ResizeObserver on the container to prevent any tile rendering gaps
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const handleApplyAndExit = useCallback(() => {
    if (stagedBbox) {
      onRegionSelect?.(stagedBbox, stagedRegionName);
    }
    setIsExpanded(false);
  }, [onRegionSelect, stagedBbox, stagedRegionName]);

  // Escape key listener for fullscreen mode
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleApplyAndExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleApplyAndExit, isExpanded]);

  const handleDrawChange = useCallback(
    (features: Feature[]) => {
      const feature = features.at(-1);
      if (!feature) return;

      const result = validateFeature(feature);
      if (result.error) {
        setValidationError(result.error);
        drawRef.current?.deleteAll();
        return;
      }

      setValidationError(null);
      setActiveTool(null);
      if (result.bbox) {
        setStagedBbox(result.bbox);
        setStagedRegionName(undefined);
        if (!isExpanded) {
          onRegionSelect?.(result.bbox);
        }
      }
    },
    [isExpanded, onRegionSelect],
  );

  const clearSelection = () => {
    drawRef.current?.deleteAll();
    rectangleStartRef.current = null;
    setRectanglePreview(null);
    setValidationError(null);
    setActiveTool(null);
  };

  const selectTool = (tool: "rectangle" | "polygon") => {
    drawRef.current?.deleteAll();
    rectangleStartRef.current = null;
    setRectanglePreview(null);
    setValidationError(null);
    setActiveTool(tool);
    if (tool === "polygon") {
      drawRef.current?.changeMode("draw_polygon");
    } else {
      drawRef.current?.changeMode("simple_select");
    }
  };

  const handleMapClick = (event: { lngLat: { lng: number; lat: number } }) => {
    const coordinate: [number, number] = [event.lngLat.lng, event.lngLat.lat];
    if (activeTool !== "rectangle") {
      if (activeTool === null) onMapClick?.(coordinate);
      return;
    }

    const first = rectangleStartRef.current;
    if (!first) {
      rectangleStartRef.current = coordinate;
      setRectanglePreview(getRectangleFeature(coordinate, coordinate));
      setValidationError(null);
      return;
    }

    const feature = getRectangleFeature(first, coordinate);
    const result = validateFeature(feature);
    rectangleStartRef.current = null;
    setRectanglePreview(null);
    if (result.error) {
      setValidationError(result.error);
      return;
    }

    drawRef.current?.deleteAll();
    drawRef.current?.add(feature);
    drawRef.current?.changeMode("simple_select");
    setActiveTool(null);
    setValidationError(null);
    if (result.bbox) {
      setStagedBbox(result.bbox);
      setStagedRegionName(undefined);
      if (!isExpanded) {
        onRegionSelect?.(result.bbox);
      }
    }
  };

  const handleMapMove = (event: { lngLat: { lng: number; lat: number } }) => {
    const first = rectangleStartRef.current;
    if (activeTool === "rectangle" && first) {
      setRectanglePreview(getRectangleFeature(first, [event.lngLat.lng, event.lngLat.lat]));
    }
  };

  // Jump to location helper
  const handleJumpToPreset = (presetBbox: IrisMapBbox, name?: string) => {
    setStagedBbox(presetBbox);
    const feature = bboxPolygon(presetBbox);
    drawRef.current?.deleteAll();
    drawRef.current?.add(feature);
    drawRef.current?.changeMode("simple_select");
    setStagedRegionName(name);
    fitToBbox(presetBbox);
    setValidationError(null);
    setSearchFeedback(name ? `Jumped to ${name}` : null);
    if (!isExpanded) {
      onRegionSelect?.(presetBbox, name);
    }
  };

  const handleGeocodeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchFeedback(null);
    try {
      const res = await fetch(`/api/v1/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setSearchFeedback(`Location "${query}" not found`);
        return;
      }
      const data = await res.json();
      if (data.bbox && Array.isArray(data.bbox) && data.bbox.length === 4) {
        handleJumpToPreset(data.bbox as IrisMapBbox, data.name || query);
      } else if (typeof data.lat === "number" && typeof data.lon === "number") {
        const span = 1.0;
        const newBox: IrisMapBbox = [
          Math.max(-180, data.lon - span),
          Math.max(-90, data.lat - span),
          Math.min(180, data.lon + span),
          Math.min(90, data.lat + span),
        ];
        handleJumpToPreset(newBox, data.name || query);
      } else {
        setSearchFeedback(`Could not compute bounds for "${query}"`);
      }
    } catch {
      setSearchFeedback(`Geocoding error for "${query}"`);
    } finally {
      setIsSearching(false);
    }
  };

  const bounds: [[number, number], [number, number]] = bboxIsRenderable && activeBboxToRender
    ? [[activeBboxToRender[0], activeBboxToRender[1]], [activeBboxToRender[2], activeBboxToRender[3]]]
    : [[-170, -75], [170, 75]];
  const bboxFeature = bboxIsRenderable && activeBboxToRender ? bboxPolygon(activeBboxToRender) : null;

  // Live HUD metrics for the bottom-left floating pill
  const activeBox = stagedBbox ?? bbox ?? [-122.6, 35.0, -118.5, 40.8];
  const [hudMinLon, hudMinLat, hudMaxLon, hudMaxLat] = activeBox;
  const hudWidth = Math.abs(hudMaxLon - hudMinLon);
  const hudHeight = Math.abs(hudMaxLat - hudMinLat);
  const hudIsValid =
    hudWidth >= MIN_SPAN &&
    hudWidth <= MAX_SPAN &&
    hudHeight >= MIN_SPAN &&
    hudHeight <= MAX_SPAN;

  return (
    <>
      {/* Dark Dimmed Backdrop when maximized */}
      {isExpanded && (
        <div
          aria-hidden="true"
          className="iris-fullscreen-backdrop"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div
        ref={containerRef}
        className={
          isExpanded
            ? "iris-map-fullscreen-container"
            : `iris-map-root ${className}`
        }
        style={isExpanded ? undefined : { height }}
      >
        {/* Normal Top Toolbar when in inline mode */}
        {mode === "selection" && !isExpanded && (
          <div className="iris-map-toolbar" role="toolbar" aria-label="Map drawing tools">
            <button
              aria-pressed={activeTool === "rectangle"}
              className={`iris-tool-btn${activeTool === "rectangle" ? " active" : ""}`}
              onClick={() => selectTool("rectangle")}
              type="button"
            >
              Rectangle
            </button>
            <button
              aria-pressed={activeTool === "polygon"}
              className={`iris-tool-btn${activeTool === "polygon" ? " active" : ""}`}
              onClick={() => selectTool("polygon")}
              type="button"
            >
              Polygon
            </button>
            <button className="iris-tool-btn" onClick={clearSelection} type="button">
              Clear
            </button>
            <span className="iris-tool-hint">
              {activeTool === "rectangle"
                ? "Click two opposite corners"
                : activeTool === "polygon"
                  ? "Click to add vertices; double-click to finish"
                  : `Draw ${MIN_SPAN}° to ${MAX_SPAN}° per side`}
            </span>
            <button
              aria-label="Expand map to full screen"
              className="iris-tool-btn iris-expand-btn"
              onClick={() => setIsExpanded(true)}
              title="Expand map (fullscreen)"
              type="button"
            >
              <span className="iris-expand-icon">⤢</span>
              <span>Expand Map</span>
            </button>
          </div>
        )}

        {/* Maximized Fullscreen HUD Overlays */}
        {mode === "selection" && isExpanded && (
          <>
            {/* Top-Left Floating Pill: Tools + Quick Region Jump */}
            <div className="iris-hud-topleft" role="toolbar" aria-label="Fullscreen map tools">
              <div className="iris-hud-tool-buttons">
                <button
                  aria-pressed={activeTool === "rectangle"}
                  className={`iris-tool-btn${activeTool === "rectangle" ? " active" : ""}`}
                  onClick={() => selectTool("rectangle")}
                  type="button"
                >
                  Rectangle
                </button>
                <button
                  aria-pressed={activeTool === "polygon"}
                  className={`iris-tool-btn${activeTool === "polygon" ? " active" : ""}`}
                  onClick={() => selectTool("polygon")}
                  type="button"
                >
                  Polygon
                </button>
                <button className="iris-tool-btn" onClick={clearSelection} type="button">
                  Clear
                </button>
              </div>

              <div className="iris-hud-divider" />

              {/* Jump search form */}
              <form className="iris-hud-search-form" onSubmit={handleGeocodeSearch}>
                <div className="iris-hud-search-input-wrap">
                  <Icon name="search" size={13} />
                  <input
                    aria-label="Jump to region"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Jump to location..."
                    type="text"
                    value={searchQuery}
                  />
                  {isSearching && <span className="button-spinner" />}
                </div>
                <button
                  className="iris-tool-btn"
                  disabled={isSearching || !searchQuery.trim()}
                  type="submit"
                >
                  Jump
                </button>
              </form>

              {/* Quick preset buttons */}
              <div className="iris-hud-preset-chips">
                {QUICK_LOCATION_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className="iris-hud-preset-btn"
                    onClick={() => handleJumpToPreset(preset.bbox, preset.name)}
                    type="button"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom-Left Floating Pill: Live Coordinates & Validation Badge */}
            <div className="iris-hud-bottomleft" role="status" aria-label="Area coordinates and validation">
              <div className="iris-hud-coords-group">
                <span className="iris-hud-coords-title">
                  <Icon name="globe" size={12} /> Bounding Box:
                </span>
                <code className="iris-hud-coord-item">
                  Lat: {hudMinLat.toFixed(2)}° – {hudMaxLat.toFixed(2)}°
                </code>
                <code className="iris-hud-coord-item">
                  Lon: {hudMinLon.toFixed(2)}° – {hudMaxLon.toFixed(2)}°
                </code>
                <span className="iris-hud-span-text">
                  Span: {hudWidth.toFixed(2)}° × {hudHeight.toFixed(2)}°
                </span>
              </div>

              {hudIsValid ? (
                <span className="ds-api-pill iris-hud-status-badge">
                  <Icon name="check" size={11} /> Valid Area ({MIN_SPAN}° to {MAX_SPAN}° per side)
                </span>
              ) : (
                <span className="ds-capability-notice iris-hud-warning-badge">
                  <Icon name="alert" size={11} />
                  {hudWidth < MIN_SPAN || hudHeight < MIN_SPAN
                    ? `Span too small (min ${MIN_SPAN}° per side)`
                    : `Span exceeds max ${MAX_SPAN}° per side`}
                </span>
              )}

              {searchFeedback && (
                <span className="iris-hud-search-feedback">{searchFeedback}</span>
              )}
            </div>

            {/* Top-Right Floating CTA: Apply Area & Exit Fullscreen */}
            <div className="iris-hud-topright">
              <button
                className="ds-primary-extract-btn iris-hud-apply-btn"
                onClick={handleApplyAndExit}
                type="button"
              >
                Apply Area & Exit Fullscreen <Icon name="check" size={15} />
              </button>
              <button
                aria-label="Exit fullscreen"
                className="iris-tool-btn iris-hud-close-btn"
                onClick={() => setIsExpanded(false)}
                title="Exit fullscreen (Esc)"
                type="button"
              >
                ✕
              </button>
            </div>
          </>
        )}

        {/* Map Canvas */}
        <div className="iris-map-canvas">
          <Map
            ref={mapRef}
            mapLib={maplibregl}
            attributionControl={{ compact: true }}
            doubleClickZoom={activeTool !== "polygon"}
            initialViewState={{
              bounds,
              fitBoundsOptions: { padding: 48 },
            }}
            mapStyle={OSM_STYLE}
            onClick={handleMapClick}
            onMouseMove={handleMapMove}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />
            <ScaleControl position="bottom-right" unit="metric" />

            {mode === "selection" && (
              <DrawControl drawRef={drawRef} onDrawChange={handleDrawChange} />
            )}

            {mode === "preview" && coverageGeoJSON && (
              <Source data={coverageGeoJSON} id="iris-coverage" type="geojson">
                <Layer {...coverageFill} />
                <Layer {...coverageLine} />
              </Source>
            )}

            {mode === "selection" && bboxFeature && activeTool === null && !rectanglePreview && (
              <Source data={bboxFeature} id="iris-selected-bbox" type="geojson">
                <Layer {...bboxFill} />
                <Layer {...bboxLine} />
              </Source>
            )}

            {mode === "selection" && rectanglePreview && (
              <Source data={rectanglePreview} id="iris-rectangle-preview" type="geojson">
                <Layer {...bboxFill} />
                <Layer {...bboxLine} />
              </Source>
            )}

            {mode === "preview" && bboxFeature && !coverageGeoJSON && (
              <Source data={bboxFeature} id="iris-selected-bbox" type="geojson">
                <Layer {...bboxFill} />
                <Layer {...bboxLine} />
              </Source>
            )}
          </Map>
        </div>

        {validationError && (
          <div className="iris-map-error" role="alert">
            {validationError}
          </div>
        )}
      </div>
    </>
  );
}
