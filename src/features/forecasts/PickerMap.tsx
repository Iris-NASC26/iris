"use client";
import { useRef, useState } from "react";
import {
  Layer,
  Map,
  Marker,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { getVersion, setWorkerUrl } from "maplibre-gl";

if (typeof window !== "undefined")
  setWorkerUrl(`/maplibre-gl-worker.mjs?v=${getVersion()}`);

const style = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

function boxGeoJSON(b: [number, number, number, number]) {
  const [w, s, e, n] = b;
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s],
        ],
      ],
    },
    properties: {},
  };
}

/** Click-to-pick map: a point click fills coordinates; area mode takes two
 * opposite corners and draws the chosen box. Clicks only fill inputs —
 * they never register anything by themselves. */
export function PickerMap({
  mode = "point",
  latitude,
  longitude,
  bbox = null,
  onPick,
  onBox,
}: {
  mode?: "point" | "area";
  latitude: number | null;
  longitude: number | null;
  bbox?: [number, number, number, number] | null;
  onPick: (lat: number, lon: number) => void;
  onBox?: (b: [number, number, number, number]) => void;
}) {
  const corner = useRef<[number, number] | null>(null);
  const [preview, setPreview] = useState<[number, number] | null>(null);

  function click(lat: number, lon: number) {
    if (mode === "point") {
      onPick(lat, lon);
      return;
    }
    if (!corner.current) {
      corner.current = [lon, lat];
      setPreview([lon, lat]);
      return;
    }
    const [w, s] = [
      Math.min(corner.current[0], lon),
      Math.min(corner.current[1], lat),
    ];
    const [e, n] = [
      Math.max(corner.current[0], lon),
      Math.max(corner.current[1], lat),
    ];
    corner.current = null;
    setPreview(null);
    onBox?.([w, s, e, n]);
  }

  const drawn = bbox ?? null;
  return (
    <div className="forecast-point-map location-picker-map">
      <Map
        initialViewState={{
          latitude: latitude ?? (drawn ? (drawn[1] + drawn[3]) / 2 : 20),
          longitude: longitude ?? (drawn ? (drawn[0] + drawn[2]) / 2 : 10),
          zoom: latitude == null && drawn == null ? 2 : 6,
        }}
        mapStyle={style}
        style={{ height: 220, width: "100%" }}
        scrollZoom={false}
        onClick={(e) => click(e.lngLat.lat, e.lngLat.lng)}
        cursor="crosshair"
      >
        <NavigationControl />
        {mode === "point" && latitude != null && longitude != null && (
          <Marker latitude={latitude} longitude={longitude}>
            <span className="forecast-map-marker" aria-label="Chosen forecast point" />
          </Marker>
        )}
        {mode === "area" && drawn && (
          <Source id="pick-box" type="geojson" data={boxGeoJSON(drawn)}>
            <Layer
              id="pick-box-fill"
              type="fill"
              paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.18 }}
            />
            <Layer
              id="pick-box-line"
              type="line"
              paint={{ "line-color": "#2563eb", "line-width": 2 }}
            />
          </Source>
        )}
        {mode === "area" && preview && (
          <Marker latitude={preview[1]} longitude={preview[0]}>
            <span className="forecast-map-marker" aria-label="First corner" />
          </Marker>
        )}
      </Map>
      <p>
        {mode === "point"
          ? "Click the map to set the forecast point, or type coordinates above."
          : preview
            ? "Click the opposite corner to finish the box, or type the bounds above."
            : "Click two opposite corners to draw the area, or type the bounds above."}
      </p>
    </div>
  );
}
