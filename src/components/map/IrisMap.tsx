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
import type { IControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

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
  onRegionSelect?: (bbox: IrisMapBbox) => void;
  onMapClick?: (coordinate: [number, number]) => void;
  height?: string;
  className?: string;
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

export function IrisMap({
  mode,
  bbox,
  coverageGeoJSON,
  onRegionSelect,
  onMapClick,
  height = "400px",
  className = "",
}: IrisMapProps) {
  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const rectangleStartRef = useRef<[number, number] | null>(null);
  const [activeTool, setActiveTool] = useState<"rectangle" | "polygon" | null>(null);
  const [rectanglePreview, setRectanglePreview] = useState<Feature<Polygon> | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const bboxIsRenderable =
    bbox !== undefined &&
    bbox.every(Number.isFinite) &&
    bbox[0] >= -180 &&
    bbox[2] <= 180 &&
    bbox[1] >= -90 &&
    bbox[3] <= 90 &&
    bbox[0] < bbox[2] &&
    bbox[1] < bbox[3];

  useEffect(() => {
    if (!bboxIsRenderable || !bbox || !mapRef.current) return;
    mapRef.current.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 48, duration: 500, maxZoom: 12 },
    );
  }, [bbox, bboxIsRenderable]);

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
      if (result.bbox) onRegionSelect?.(result.bbox);
    },
    [onRegionSelect],
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
    if (result.bbox) onRegionSelect?.(result.bbox);
  };

  const handleMapMove = (event: { lngLat: { lng: number; lat: number } }) => {
    const first = rectangleStartRef.current;
    if (activeTool === "rectangle" && first) {
      setRectanglePreview(getRectangleFeature(first, [event.lngLat.lng, event.lngLat.lat]));
    }
  };

  const bounds: [[number, number], [number, number]] = bboxIsRenderable && bbox
    ? [[bbox[0], bbox[1]], [bbox[2], bbox[3]]]
    : [[-170, -75], [170, 75]];
  const bboxFeature = bboxIsRenderable && bbox ? bboxPolygon(bbox) : null;

  return (
    <div className={`iris-map-root ${className}`} style={{ height }}>
      {mode === "selection" && (
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
                : `Draw a region from ${MIN_SPAN}° to ${MAX_SPAN}° per side`}
          </span>
        </div>
      )}

      <div className="iris-map-canvas">
        <Map
          ref={mapRef}
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
  );
}
