"use client";
import { useState } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/maplibre";
import type { ForecastRegion } from "./model";
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
export function ForecastMap({ site }: { site: ForecastRegion }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="forecast-point-map"
      role="region"
      aria-label={`Forecast sample point at ${site.name}`}
    >
      {failed ? (
        <p>
          Basemap unavailable. The forecast point is {site.latitude}°,{" "}
          {site.longitude}°.
        </p>
      ) : (
        <Map
          initialViewState={{
            latitude: site.latitude,
            longitude: site.longitude,
            zoom: 5,
          }}
          mapStyle={style}
          style={{ height: 270, width: "100%" }}
          onError={() => setFailed(true)}
          scrollZoom={false}
        >
          <NavigationControl />
          <ScaleControl />
          <Marker latitude={site.latitude} longitude={site.longitude}>
            <span
              className="forecast-map-marker"
              aria-label="Exact forecast sample point"
            />
          </Marker>
        </Map>
      )}
      <p>
        One forecast point. No regional rainfall surface or flood footprint is
        inferred from it.
      </p>
    </div>
  );
}
