"use client";
import { useEffect, useState } from "react";
import {
  parseLocations,
  parseMlCatalogue,
  type ForecastCard,
} from "./model";

export function useForecastCatalogue() {
  const [cards, setCards] = useState<ForecastCard[]>([]),
    [error, setError] = useState(""),
    [clock, setClock] = useState(Date.now());
  useEffect(() => {
    let stopped = false;
    const controller = new AbortController();
    async function load() {
      try {
        const options = { cache: "no-store" as const, signal: controller.signal };
        const [lr, cr] = await Promise.all([
          fetch("/api/v1/forecasts/v2/locations?limit=200", options),
          fetch("/api/v1/forecasts/v2/catalogue", options),
        ]);
        if (!lr.ok || !cr.ok) throw new Error("Forecast service unavailable");
        const locations = parseLocations(await lr.json());
        const data = parseMlCatalogue(await cr.json(), locations);
        if (!stopped) {
          setCards(data);
          setError("");
          setClock(Date.now());
        }
      } catch {
        if (!stopped) {
          setError("Forecast updates unavailable");
          setClock(Date.now());
        }
      }
    }
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  return {
    cards: cards.map((c) =>
      c.state === "fresh" && c.expires_at && Date.parse(c.expires_at) <= clock
        ? { ...c, state: "stale" as const, peak_24h: null }
        : c,
    ),
    error,
  };
}
