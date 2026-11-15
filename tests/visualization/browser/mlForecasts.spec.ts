import { test, expect } from "@playwright/test";
import { mockForecasts } from "./forecastMocks";

const v2 = {
  capabilities: {
    schema_version: "iris.ml-forecast.v2",
    credentials: { configured: false, reason: "Meteomatics credentials are missing" },
    policy: "history-only",
    admin_token_required: false,
    sources: {
      era5: { param: "ecmwf-era5", declared_availability_lag_hours: 144, role: "retrospective" },
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
    return route.fulfill({ json: v2.empty });
  });
  (page as unknown as { __reqs: string[] }).__reqs = requests;
});

test("ML panel shows honest unavailable states and never requests provider futures", async ({ page }) => {
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await expect(page.getByRole("heading", { name: "Local predictions from verified history." })).toBeVisible();
  await expect(page.locator(".ml-forecast")).toContainText("Missing");
  await expect(page.locator(".ml-forecast")).toContainText("None");
  // Ingest is disabled without configured credentials — no fake action.
  await expect(
    page.getByRole("button", { name: /Queue history ingest/ }),
  ).toBeDisabled();
  const reqs = (page as unknown as { __reqs: string[] }).__reqs;
  expect(reqs.filter((u) => u.includes("api.meteomatics.com"))).toEqual([]);
  // No v2 request may carry a future date parameter.
  expect(reqs.filter((u) => /v2.*(forecast|ens|future)/i.test(u))).toEqual([]);
});

test("prediction request surfaces the unavailable contract, not a fake run", async ({ page }) => {
  await page.route("**/api/v1/forecasts/v2/colombo/predict", (route) =>
    route.fulfill({
      json: {
        state: "unavailable",
        reason: "no horizon produced a verified local prediction",
        horizons: [{ horizon: 0, reason: "no active model for this horizon" }],
      },
    }),
  );
  await page.goto("/workspace/forecasts?forecastId=colombo");
  const btn = page.getByRole("button", { name: "Predict from active models" });
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400); // scroll-behavior: smooth settles
  await btn.click();
  await expect(page.locator(".ml-forecast")).toContainText(
    "Prediction unavailable: no horizon produced a verified local prediction",
  );
  await expect(page.locator(".ml-forecast")).toContainText("no active model");
});
