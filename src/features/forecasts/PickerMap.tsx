"use client";
import {
  Map,
  Marker,
  NavigationControl,
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

/** Click-to-pick map for new forecast points — reuses the existing maplibre
 * stack; a click fills coordinates, never registers anything by itself. */
export function PickerMap({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number | null;
  longitude: number | null;
  onPick: (lat: number, lon: number) => void;
}) {
  return (
    <div className="forecast-point-map location-picker-map">
      <Map
        initialViewState={{
          latitude: latitude ?? 20,
          longitude: longitude ?? 10,
          zoom: latitude == null ? 2 : 6,
        }}
        mapStyle={style}
        style={{ height: 220, width: "100%" }}
        scrollZoom={false}
        onClick={(e) => onPick(e.lngLat.lat, e.lngLat.lng)}
        cursor="crosshair"
      >
        <NavigationControl />
        {latitude != null && longitude != null && (
          <Marker latitude={latitude} longitude={longitude}>
            <span className="forecast-map-marker" aria-label="Chosen forecast point" />
          </Marker>
        )}
      </Map>
      <p>Click the map to set the forecast point, or type coordinates above.</p>
    </div>
  );
}
