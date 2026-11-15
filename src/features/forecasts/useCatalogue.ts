"use client";
import { useEffect, useState } from "react";
import { parseCatalogue, type ForecastCard } from "./model";

export function useForecastCatalogue() {
  const [cards, setCards] = useState<ForecastCard[]>([]),
    [error, setError] = useState(""),
    [clock, setClock] = useState(Date.now());
  useEffect(() => {
    let stopped = false;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/v1/forecasts/v2/catalogue", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Forecast service unavailable");
        const data = parseCatalogue(await response.json());
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
