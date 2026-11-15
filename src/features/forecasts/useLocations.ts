"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseLocations, type ForecastLocation } from "./model";

/** Server registry of forecast contexts — seeds plus user points. */
export function useLocations() {
  const [locations, setLocations] = useState<ForecastLocation[] | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    try {
      const r = await fetch("/api/v1/forecasts/v2/locations?limit=500", {
        cache: "no-store",
        signal: c.signal,
      });
      if (!r.ok) throw new Error("Location registry unavailable");
      const parsed = parseLocations(await r.json());
      if (!c.signal.aborted) {
        setLocations(parsed);
        setError("");
      }
    } catch {
      if (!c.signal.aborted) setError("Location registry unavailable");
    }
  }, []);
  useEffect(() => {
    void load();
    return () => controller.current?.abort();
  }, [load]);
  return { locations, error, reload: load };
}
