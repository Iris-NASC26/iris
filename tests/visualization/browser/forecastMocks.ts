import type { Page } from "@playwright/test";
import { FORECAST_REGIONS } from "../../../src/features/forecasts/model";
import { forecastFixture, catalogueFixture } from "../forecastFixtures";

/** Phase-1 registry shape — the six seeds as the backend returns them. */
export function v2LocationsFixture(extra: object[] = []) {
  return {
    locations: [
      ...FORECAST_REGIONS.map((r, i) => ({
        schema_version: "iris.forecast-location.v1",
        location_id: r.id,
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone || "UTC",
        geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
        spatial_mode: "point",
        source: "seed",
        created_at: "2025-01-01T00:00:00Z",
        _i: i,
      })),
      ...extra,
    ].map(({ _i, ...l }) => l),
    total: FORECAST_REGIONS.length + extra.length,
  };
}

export function v2CompatibilityFixture(overrides: object = {}) {
  return {
    state: "needs_history",
    reasons: ["no_dataset"],
    message: "No frozen historical dataset yet — prepare data first.",
    location_id: "colombo",
    location_name: "Colombo",
    target: "precip_24h",
    suggested_dataset_id: null,
    dataset: null,
    ...overrides,
  };
}

export async function mockForecasts(page: Page) {
  const now = Date.now();
  await page.route("**/api/v1/forecasts/**", (route) => {
    const path = new URL(route.request().url()).pathname.split("/"),
      id = path[4];
    if (id === "v2" && path[5] === "locations")
      return route.fulfill({ json: v2LocationsFixture() });
    if (id === "v2" && path[5] === "compatibility")
      return route.fulfill({ json: v2CompatibilityFixture() });
    if (id === "v2" && path[5] === "catalogue")
      return route.fulfill({ json: catalogueFixture(now) });
    if (id === "catalogue")
      return route.fulfill({ json: catalogueFixture(now) });
    if (id === "capabilities")
      return route.fulfill({
        json: {
          capabilities: {
            iris_ml: {
              state: "awaiting_verified_training_archive",
              detail: "No reviewed Iris correction model is enabled.",
            },
            river_forecast: {
              state: "awaiting_ewds_access",
              detail: "River-flow forecasts are not connected.",
            },
          },
        },
      });
    if (path[5] === "observations")
      return route.fulfill({
        json: {
          schema_version: "iris.forecast-context.v1",
          id,
          provider: "NASA GPM IMERG Early",
          product: "GPM_3IMERGDE.07",
          units: "mm/day",
          time_standard: "UTC",
          location: FORECAST_REGIONS.find((r) => r.id === id),
          spatial_support: "nearest_0.1_degree_grid_cell",
          source_url: "https://cmr.earthdata.nasa.gov/TEST-ONLY",
          retrieved_at: new Date(now).toISOString(),
          caveat: "TEST-ONLY synthetic observation context.",
          sources: [
            {
              sha256: "c".repeat(64),
              url: "https://opendap.earthdata.nasa.gov/TEST-ONLY",
            },
            {
              sha256: "c".repeat(64),
              url: "https://opendap.earthdata.nasa.gov/TEST-ONLY",
            },
          ],
          rows: [
            {
              timestamp: "2026-11-12",
              value: 0,
              qa: "usable",
              reported_latitude: 6.95,
              reported_longitude: 79.85,
            },
            {
              timestamp: "2026-11-13",
              value: null,
              qa: "missing",
              reported_latitude: 6.95,
              reported_longitude: 79.85,
            },
          ],
        },
      });
    const site = FORECAST_REGIONS.find((r) => r.id === id);
    return site
      ? route.fulfill({ json: forecastFixture(site, now) })
      : route.fulfill({
          status: 422,
          json: { detail: "Unsupported forecast." },
        });
  });
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
}
