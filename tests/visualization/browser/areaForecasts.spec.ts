import { test, expect } from "@playwright/test";
import { v2CompatibilityFixture, v2LocationsFixture } from "./forecastMocks";

const AREA = {
  schema_version: "iris.forecast-location.v2",
  location_id: "area-cf6131c5ffc5",
  name: "Minneriya test box",
  latitude: 8.5,
  longitude: 80.75,
  timezone: "UTC",
  geometry: {
    type: "Polygon",
    coordinates: [[[80.0, 7.5], [81.5, 7.5], [81.5, 9.5], [80.0, 9.5], [80.0, 7.5]]],
  },
  spatial_mode: "area_mean",
  bbox: [80.0, 7.5, 81.5, 9.5],
  centroid: { latitude: 8.5, longitude: 80.75 },
  source: "registered",
  created_at: "2025-02-01T00:00:00Z",
};

const AREA_DS_OLD = {
  dataset_id: "ds-aaaaaaaabbbbccc1",
  location_id: "area-cf6131c5ffc5",
  source_id: "nasa_power",
  variables: ["power_t2m"],
  records: 366,
  precip_complete_days: 366,
  content_sha256: "a".repeat(64),
  created_at: "2025-02-01T00:00:00Z",
  spatial_mode: "area_mean",
  spatial_support: "area_mean",
  requested_geometry: AREA.geometry,
  spatial_extent: { known: true, kind: "area_mean", note: "weighted cell mean" },
  aggregation: { policy: "coslat_weighted_mean_v1" },
  coverage: { first_day: "2024-01-01", last_day: "2024-12-31" },
  quarantine: { count: 0, reasons: [] },
};
const AREA_DS_NEW = {
  ...AREA_DS_OLD,
  dataset_id: "ds-aaaaaaaabbbbccc2",
  created_at: "2025-02-10T00:00:00Z",
};

const capabilities = {
  schema_version: "iris.ml-forecast.v2",
  credentials: { configured: false },
  earthdata_credentials: { configured: false },
  policy: "history-only",
  sources: {},
  admin_token_required: false,
  targets: {
    precip_24h: { label: "Rainfall", unit: "mm", composite_days: 1, sources: ["era5"] },
    power_t2m: { label: "Air temperature (NASA POWER daily)", unit: "K", composite_days: 1, sources: ["nasa_power"] },
  },
  source_capabilities: {
    nasa_power: {
      spatial_modes: ["point", "area_mean"],
      requires_credentials: false,
      access: "public REST API",
      delay_hours: 72,
    },
  },
};

const empty = {
  state: "unavailable",
  source_id: "nasa_power",
  records: [],
  coverage: { complete_days: 0, first_day: null, last_day: null },
  datasets: [],
  models: [],
  reports: [],
  job: null,
};

function freshnessFixture(overrides: object = {}) {
  return {
    location_id: "area-cf6131c5ffc5",
    spatial_mode: "area_mean",
    source_id: "nasa_power",
    target: "power_t2m",
    state: "fresh",
    latest_observation_end: "2025-02-10T00:00:00Z",
    input_age_hours: 26,
    availability_basis: "estimated ~72h publication delay; not a verified archive",
    latest_dataset_id: "ds-aaaaaaaabbbbccc2",
    last_update: null,
    checked_at: "2025-02-12T00:00:00Z",
    ...overrides,
  };
}

async function routeArea(
  page: import("@playwright/test").Page,
  { datasets = [AREA_DS_OLD], freshness = {} as object, postUpdate = "running" } = {},
) {
  const posts: string[] = [];
  let updatesPosted = 0;
  await page.route("**/api/v1/forecasts/v2/**", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    if (method === "POST") posts.push(`${method} ${path}`);
    if (path.endsWith("/locations") && method === "POST") {
      const body = route.request().postDataJSON() as { name: string; bbox?: number[] };
      const rec = { ...AREA, name: body.name, bbox: body.bbox ?? AREA.bbox };
      return route.fulfill({ status: 201, json: { location: rec, created: true } });
    }
    if (path.endsWith("/locations"))
      return route.fulfill({ json: v2LocationsFixture([AREA]) });
    if (path.endsWith("/compatibility"))
      return route.fulfill({
        json: v2CompatibilityFixture({
          state: "ready",
          reasons: [],
          message: "This area_mean dataset can train and forecast the selected target.",
          location_id: "area-cf6131c5ffc5",
          location_name: "Minneriya test box",
          target: url.searchParams.get("target") || "power_t2m",
          suggested_dataset_id: null,
          dataset: AREA_DS_OLD,
        }),
      });
    if (path.endsWith("/capabilities")) return route.fulfill({ json: capabilities });
    if (path.endsWith("/freshness"))
      return route.fulfill({ json: freshnessFixture(freshness) });
    if (path.endsWith("/update") && method === "POST") {
      updatesPosted += 1;
      return route.fulfill({
        json: {
          job_id: "v2-aaaa11112222",
          kind: "update",
          location_id: "area-cf6131c5ffc5",
          status: postUpdate,
          progress: 0.4,
          checkpoint: { variable: "power_t2m", message: "Checking for newer observations" },
          error: null,
          idem: "update-power_t2m-nasa_power",
          created_at: "2025-02-12T00:00:00Z",
          updated_at: "2025-02-12T00:00:00Z",
        },
      });
    }
    if (path.includes("/jobs/v2-aaaa11112222"))
      return route.fulfill({
        json: {
          job_id: "v2-aaaa11112222",
          kind: "update",
          location_id: "area-cf6131c5ffc5",
          status: "finished",
          progress: 1,
          checkpoint: {
            variable: "power_t2m",
            result: { state: "new_revision", dataset_id: "ds-aaaaaaaabbbbccc2" },
          },
          error: null,
          idem: "update-power_t2m-nasa_power",
          created_at: "2025-02-12T00:00:00Z",
          updated_at: "2025-02-12T00:00:00Z",
        },
      });
    if (path.endsWith("/datasets"))
      return route.fulfill({
        json: {
          state: "available",
          datasets: updatesPosted > 0 ? [AREA_DS_OLD, AREA_DS_NEW] : datasets,
        },
      });
    if (path.endsWith("/datasets") && method === "POST")
      return route.fulfill({ json: {} });
    return route.fulfill({
      json: {
        ...empty,
        datasets: updatesPosted > 0 ? [AREA_DS_OLD, AREA_DS_NEW] : datasets,
      },
    });
  });
  return { posts, updates: () => updatesPosted };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("iris-onboarding-complete", "true"));
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
});

test("numeric bounds register an area and the workspace is labelled area-average", async ({ page }) => {
  await routeArea(page);
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await page.getByRole("button", { name: "+ New point" }).click();
  await page.getByRole("button", { name: "Area (bounding box)" }).click();
  await page.getByLabel("Location display name").fill("Minneriya test box");
  await page.getByLabel("West (min lon)").fill("80");
  await page.getByLabel("South (min lat)").fill("7.5");
  await page.getByLabel("East (max lon)").fill("81.5");
  await page.getByLabel("North (max lat)").fill("9.5");
  await page.getByRole("button", { name: "Use this area" }).click();
  await expect(page).toHaveURL(/forecastId=area-cf6131c5ffc5/);
  await expect(page.getByRole("heading", { name: "Minneriya test box outlook" })).toBeVisible();
  // the area scope is labelled, never disguised as a point
  await expect(page.locator(".ml-scope-badge")).toHaveText("Area average");
  await expect(page.locator(".forecast-workspace")).toContainText("weighted mean over source grid cells");
  await expect(page.getByLabel("Forecast location").locator("option", { hasText: "(area)" })).toHaveCount(1);
});

test("reversed or invalid bounds are rejected before any registration", async ({ page }) => {
  const { posts } = await routeArea(page);
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await page.getByRole("button", { name: "+ New point" }).click();
  await page.getByRole("button", { name: "Area (bounding box)" }).click();
  await page.getByLabel("Location display name").fill("Broken box");
  await page.getByLabel("West (min lon)").fill("81.5");
  await page.getByLabel("East (max lon)").fill("80");
  await page.getByLabel("South (min lat)").fill("7.5");
  await page.getByLabel("North (max lat)").fill("9.5");
  await expect(page.locator(".location-picker .forecast-notice")).toContainText("west < east");
  await expect(page.getByRole("button", { name: "Use this area" })).toBeDisabled();
  expect(posts.filter((p) => p.includes("/locations"))).toEqual([]);
});

test("update data posts an update job — never a retrain or context switch", async ({ page }) => {
  const { posts, updates } = await routeArea(page, {
    datasets: [AREA_DS_OLD],
    freshness: { last_update: { status: "no_new_data", changed: false, checked_at: "2025-02-12T00:00:00Z" } },
  });
  await page.goto("/workspace/forecasts?forecastId=area-cf6131c5ffc5&target=power_t2m");
  await expect(page.locator(".ml-scope-badge")).toHaveText("Area average");
  // freshness line reports real input age + check outcome, not a reissue clock
  await expect(page.locator(".ml-freshness")).toContainText("Latest usable input: 2025-02-10");
  await expect(page.locator(".ml-freshness")).toContainText("checked, no new data");
  await page.getByRole("button", { name: "Update data" }).click();
  expect(updates()).toBe(1);
  // the dataset revision list updates only via the poll/completion, never eagerly
  const updateCalls = posts.filter((p) => p.includes("/update"));
  const retrainCalls = posts.filter((p) => p.includes("/train") || p.includes("/generate"));
  expect(updateCalls).toHaveLength(1);
  expect(retrainCalls).toEqual([]);
  await expect(page).toHaveURL(/forecastId=area-cf6131c5ffc5/);
});

test("a newer prepared revision is noticed without switching the pinned selection", async ({ page }) => {
  await routeArea(page, { datasets: [AREA_DS_OLD, AREA_DS_NEW] });
  await page.goto("/workspace/forecasts?forecastId=area-cf6131c5ffc5&target=power_t2m&dataset=ds-aaaaaaaabbbbccc1");
  await expect(page.getByLabel("Historical dataset revision")).toHaveValue("ds-aaaaaaaabbbbccc1");
  await expect(page.locator(".ml-readiness")).toContainText("newer data revision");
  await page.getByRole("button", { name: "Use latest revision" }).click();
  await expect(page).toHaveURL(/dataset=ds-aaaaaaaabbbbccc2/);
  await expect(page.getByLabel("Historical dataset revision")).toHaveValue("ds-aaaaaaaabbbbccc2");
});

test("area bounds stay usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routeArea(page);
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await page.getByRole("button", { name: "+ New point" }).click();
  await page.getByRole("button", { name: "Area (bounding box)" }).click();
  await expect(page.getByLabel("West (min lon)")).toBeVisible();
  await expect(page.getByLabel("North (max lat)")).toBeVisible();
});
