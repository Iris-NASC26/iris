import { test, expect } from "@playwright/test";
import {
  mockForecasts,
  v2CompatibilityFixture,
  v2LocationsFixture,
} from "./forecastMocks";

const v2 = {
  capabilities: {
    schema_version: "iris.ml-forecast.v2",
    credentials: { configured: false, reason: "Meteomatics credentials are missing" },
    earthdata_credentials: { configured: true },
    policy: "history-only",
    admin_token_required: false,
    sources: {
      era5: { param: "ecmwf-era5", declared_availability_lag_hours: 144, role: "retrospective" },
    },
    targets: {
      precip_24h: { label: "Precipitation (24h)", unit: "mm", composite_days: 1, sources: ["era5"] },
      smap_surface_sm: { label: "Surface soil moisture (SMAP L3)", unit: "m3/m3", composite_days: 1, sources: ["SPL3SMP_E.006"] },
      modis_ndvi: { label: "NDVI (MODIS 16-day composite)", unit: "1", composite_days: 16, sources: ["MOD13Q1.061"] },
    },
    earthdata_products: {
      "SPL3SMP_E.006": { delay_days: 3, daac: "NSIDC", cadence: "daily", note: "SMAP L3 daily" },
      "MOD13Q1.061": { delay_days: 10, daac: "LP DAAC", cadence: "16-day composite", note: "scale 1e-4" },
    },
  },
  empty: { state: "unavailable", records: [], coverage: { complete_days: 0, first_day: null, last_day: null }, datasets: [], models: [], reports: [] },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("iris-onboarding-complete", "true"),
  );
  await mockForecasts(page);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.route("**/api/v1/forecasts/v2/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities")) return route.fulfill({ json: v2.capabilities });
    if (path.endsWith("/locations")) return route.fulfill({ json: v2LocationsFixture() });
    if (path.endsWith("/compatibility")) return route.fulfill({ json: v2CompatibilityFixture() });
    return route.fulfill({ json: v2.empty });
  });
  (page as unknown as { __reqs: string[] }).__reqs = requests;
});

test("ML panel shows honest unavailable states and never requests provider futures", async ({ page }) => {
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await expect(page.getByRole("heading", { name: "Colombo outlook" })).toBeVisible();
  const selector = page.getByLabel("ML forecast target");
  await expect(selector).toBeVisible();
  await selector.selectOption("smap_surface_sm");
  await expect(page.locator(".ml-forecast")).toContainText("SPL3SMP_E.006");
  await expect(page.locator(".ml-forecast")).toContainText("Queue history ingest (SPL3SMP_E.006, 1 yr)");
  await selector.selectOption("modis_ndvi");
  await expect(page.locator(".ml-forecast")).toContainText("composite");
  await expect(page.locator(".ml-forecast")).toContainText("Configured");
  await expect(page.locator(".ml-forecast")).toContainText("None");
  // Precip ingest stays disabled without Meteomatics credentials — no fake action.
  await selector.selectOption("precip_24h");
  await page.getByText("Advanced pipeline controls", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Queue history ingest \(era5/ }),
  ).toBeDisabled();
  const reqs = (page as unknown as { __reqs: string[] }).__reqs;
  expect(reqs.filter((u) => u.includes("api.meteomatics.com"))).toEqual([]);
  // No v2 request may carry a future date parameter.
  expect(reqs.filter((u) => /ens_select|source=ecmwf-ens|api\.meteomatics\.com/i.test(u))).toEqual([]);
});

test("prediction request surfaces the unavailable contract, not a fake run", async ({ page }) => {
  await page.route("**/api/v1/forecasts/v2/colombo/predict**", (route) =>
    route.fulfill({
      json: {
        state: "unavailable",
        reason: "no horizon produced a verified local prediction",
        horizons: [{ horizon: 0, reason: "no active model for this horizon" }],
      },
    }),
  );
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await page.getByText("Advanced pipeline controls", { exact: true }).click();
  const btn = page.getByRole("button", { name: "Predict from active models" });
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400); // scroll-behavior: smooth settles
  await btn.click();
  await page.getByText("Why is there no forecast?", { exact: true }).click();
  await expect(page.locator(".ml-forecast")).toContainText(
    "Prediction unavailable: no horizon produced a verified local prediction",
  );
  await expect(page.locator(".ml-forecast")).toContainText("no active model");
});
