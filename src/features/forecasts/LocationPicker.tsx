"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { LOCATION_ID } from "./model";

const PickerMap = dynamic(
  () => import("./PickerMap").then((m) => m.PickerMap),
  { ssr: false },
);

interface GeocodeHit {
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
}

/** Register a new point context — place search, manual coordinates, or a map
 * click. Registration is metadata only; nothing downloads or trains. */
export function LocationPicker({
  onCreated,
  onCancel,
}: {
  onCreated: (locationId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const latNum = Number(lat);
  const lonNum = Number(lon);
  const coordsValid =
    lat.trim() !== "" &&
    lon.trim() !== "" &&
    Number.isFinite(latNum) &&
    Number.isFinite(lonNum) &&
    Math.abs(latNum) <= 90 &&
    Math.abs(lonNum) <= 180;

  async function search() {
    if (query.trim().length < 2) return;
    setError("");
    try {
      const r = await fetch(`/api/v1/geocode?q=${encodeURIComponent(query.trim())}`, {
        cache: "no-store",
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.detail || v.error || "Place search failed.");
      const results = (Array.isArray(v) ? v : Array.isArray(v?.results) ? v.results : [v]) as GeocodeHit[];
      const usable = results.filter(
        (h) => Number.isFinite(Number(h?.latitude)) && Number.isFinite(Number(h?.longitude)),
      );
      if (!usable.length) throw new Error("No coordinates found for that place.");
      setHits(usable.slice(0, 5));
    } catch (e) {
      setHits([]);
      setError(e instanceof Error ? e.message : "Place search failed.");
    }
  }

  function choose(hit: GeocodeHit) {
    setLat(String(hit.latitude));
    setLon(String(hit.longitude));
    if (!name.trim())
      setName([hit.name, hit.admin1 || hit.country].filter(Boolean).join(", "));
    setHits([]);
  }

  async function submit() {
    if (!coordsValid || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/v1/forecasts/v2/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), latitude: latNum, longitude: lonNum }),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.detail || v.error || "Location registration failed.");
      const id = v?.location?.location_id;
      if (!LOCATION_ID.test(id ?? "")) throw new Error("Invalid location response.");
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="location-picker" aria-label="Add a forecast point">
      <div className="location-picker-grid">
        <label>
          Place search (optional)
          <span className="location-search">
            <input
              aria-label="Search for a place"
              value={query}
              placeholder="e.g. Jaffna, Sri Lanka"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void search()}
            />
            <button type="button" onClick={() => void search()}>
              Search
            </button>
          </span>
        </label>
        {hits.length > 0 && (
          <ul className="location-hits">
            {hits.map((h, i) => (
              <li key={i}>
                <button type="button" onClick={() => choose(h)}>
                  {[h.name, h.admin1, h.country].filter(Boolean).join(", ")} (
                  {Number(h.latitude).toFixed(3)}, {Number(h.longitude).toFixed(3)})
                </button>
              </li>
            ))}
          </ul>
        )}
        <label>
          Display name
          <input
            aria-label="Location display name"
            value={name}
            maxLength={80}
            placeholder="My forecast point"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="location-coords">
          <label>
            Latitude
            <input
              aria-label="Latitude"
              type="number"
              step="any"
              min={-90}
              max={90}
              value={lat}
              placeholder="-90 … 90"
              onChange={(e) => setLat(e.target.value)}
            />
          </label>
          <label>
            Longitude
            <input
              aria-label="Longitude"
              type="number"
              step="any"
              min={-180}
              max={180}
              value={lon}
              placeholder="-180 … 180"
              onChange={(e) => setLon(e.target.value)}
            />
          </label>
        </div>
        <p className="forecast-small">
          A single point — its forecast is never a district or country average.
          Coordinates work without the search; the map click also fills them.
        </p>
        <PickerMap
          latitude={coordsValid ? latNum : null}
          longitude={coordsValid ? lonNum : null}
          onPick={(a, o) => {
            setLat(a.toFixed(5));
            setLon(o.toFixed(5));
          }}
        />
        {error && (
          <div role="alert" className="forecast-notice">
            {error}
          </div>
        )}
        <div className="ml-actions">
          <button
            className="ml-generate"
            disabled={busy || !coordsValid || !name.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Registering…" : "Use this point"}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
