import type { Page } from "@playwright/test";
import { FORECAST_REGIONS } from "../../../src/features/forecasts/model";
import { forecastFixture, catalogueFixture } from "../forecastFixtures";

export async function mockForecasts(page: Page) {
  const now = Date.now();
  await page.route("**/api/v1/forecasts/**", (route) => {
    const path = new URL(route.request().url()).pathname.split("/"),
      id = path[4];
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
