import { test, expect } from "@playwright/test";
import {
  v2CompatibilityFixture,
  v2LocationsFixture,
} from "./forecastMocks";

const NEW_POINT = {
  schema_version: "iris.forecast-location.v1",
  location_id: "loc-a40fb92b2f5c",
  name: "Jaffna test point",
  latitude: 9.6615,
  longitude: 80.0255,
  timezone: "UTC",
  geometry: { type: "Point", coordinates: [80.0255, 9.6615] },
  spatial_mode: "point",
  source: "registered",
  created_at: "2025-01-01T00:00:00Z",
};

const capabilities = {
  schema_version: "iris.ml-forecast.v2",
  credentials: { configured: true },
  policy: "history-only",
  sources: {},
  admin_token_required: false,
  targets: {
    precip_24h: { label: "Rainfall", unit: "mm", composite_days: 1, sources: ["era5"] },
  },
};

function routeRegistry(page: import("@playwright/test").Page, extras: object[] = []) {
  const registered: object[] = [];
  const mutations: string[] = [];
  return page.route("**/api/v1/forecasts/v2/**", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (route.request().method() === "POST") mutations.push(`${route.request().method()} ${path}`);
    if (path.endsWith("/locations") && route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { name: string; latitude: number; longitude: number };
      const rec = { ...NEW_POINT, name: body.name, latitude: body.latitude, longitude: body.longitude };
      registered.push(rec);
      return route.fulfill({ status: 201, json: { location: rec, created: true } });
    }
    if (path.endsWith("/locations"))
      return route.fulfill({ json: v2LocationsFixture([...extras, ...registered]) });
    if (path.endsWith("/compatibility"))
      return route.fulfill({
        json: v2CompatibilityFixture({
          location_id: url.searchParams.get("location_id") || "colombo",
          target: url.searchParams.get("target") || "precip_24h",
        }),
      });
    if (path.endsWith("/capabilities")) return route.fulfill({ json: capabilities });
    return route.fulfill({ json: {
      state: "unavailable", source_id: "era5", records: [],
      coverage: { complete_days: 0, first_day: null, last_day: null },
      datasets: [], models: [], reports: [], job: null,
    } });
  }).then(() => ({ registered, mutations }));
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("iris-onboarding-complete", "true"));
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
});

test("a non-seeded point registers, joins the selector, and opens a scoped workspace", async ({ page }) => {
  await routeRegistry(page);
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await page.getByRole("button", { name: "+ New point" }).click();
  await page.getByLabel("Location display name").fill("Jaffna test point");
  await page.getByLabel("Latitude").fill("9.6615");
  await page.getByLabel("Longitude").fill("80.0255");
  await page.getByRole("button", { name: "Use this point" }).click();
  // workspace switches to the new point — scope, not another place's data
  await expect(page).toHaveURL(/forecastId=loc-a40fb92b2f5c/);
  await expect(page.getByRole("heading", { name: "Jaffna test point outlook" })).toBeVisible();
  await expect(page.locator(".forecast-workspace")).toContainText("not an area or district average");
  // the point is now a first-class selector option
  await expect(page.getByLabel("Forecast location").locator("option", { hasText: "Jaffna test point" })).toHaveCount(1);
});

test("opening and selecting locations never mutates the forecast backend", async ({ page }) => {
  const { mutations } = await routeRegistry(page);
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await expect(page.getByRole("heading", { name: "Colombo outlook" })).toBeVisible();
  await page.getByLabel("Forecast location").selectOption("kathmandu");
  await expect(page.getByRole("heading", { name: "Kathmandu outlook" })).toBeVisible();
  expect(mutations).toEqual([]);
});

test("unknown location ids get an honest notice instead of borrowed data", async ({ page }) => {
  await routeRegistry(page);
  await page.goto("/workspace/forecasts?forecastId=loc-999999999999");
  await expect(page.locator(".forecast-notice")).toContainText("not a registered forecast context");
  await expect(page.locator(".ml-forecast")).toHaveCount(0);
});

test("dataset selection binds to the URL and blocked compatibility disables generate", async ({ page }) => {
  const ds = { dataset_id: "ds-0123456789abcdef", location_id: "colombo", source_id: "era5",
    variables: ["precip_24h"], precip_complete_days: 365, records: 365,
    content_sha256: "a".repeat(64), spatial_mode: "point",
    spatial_support: "point", quarantine: { count: 0, reasons: [] },
    coverage: { first_day: "2024-01-01", last_day: "2024-12-31" },
    created_at: "2025-01-01T00:00:00Z" };
  await page.route("**/api/v1/forecasts/v2/**", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith("/locations")) return route.fulfill({ json: v2LocationsFixture() });
    if (path.endsWith("/compatibility"))
      return route.fulfill({ json: v2CompatibilityFixture({
        state: "outside_spatial_support",
        reasons: ["dataset_bound_to_other_location"],
        message: "This dataset was built for Point B; it cannot forecast Colombo.",
        location_id: "colombo",
      }) });
    if (path.endsWith("/capabilities")) return route.fulfill({ json: capabilities });
    if (path.endsWith("/datasets")) return route.fulfill({ json: { datasets: [ds], total: 1 } });
    return route.fulfill({ json: {
      state: "unavailable", source_id: "era5", records: [],
      coverage: { complete_days: 0, first_day: null, last_day: null },
      datasets: [ds], models: [], reports: [], job: null,
    } });
  });
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await expect(page.getByLabel("Historical dataset revision")).toHaveValue("ds-0123456789abcdef");
  await expect(page).toHaveURL(/dataset=ds-0123456789abcdef|forecastId=colombo/);
  const btn = page.getByRole("button", { name: "Generate forecast from datasets" });
  await expect(btn).toBeDisabled();
  await expect(page.locator(".ml-readiness")).toContainText("cannot forecast Colombo");
});

test("location controls work at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routeRegistry(page);
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await expect(page.getByLabel("Forecast location")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ New point" })).toBeVisible();
  await page.getByRole("button", { name: "+ New point" }).click();
  await expect(page.getByLabel("Latitude")).toBeVisible();
  await expect(page.getByLabel("Longitude")).toBeVisible();
});
