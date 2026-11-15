import { mockForecasts } from "./forecastMocks";
import { test, expect } from "@playwright/test";
import { INVESTIGATIONS } from "../../../src/features/hazards/model";
import { rainfallFixture, historyFixture } from "../hazardFixtures";

test.beforeEach(async ({ page }) => {
  await mockForecasts(page);
  await page.addInitScript(() =>
    localStorage.setItem("iris-onboarding-complete", "true"),
  );
});

test("historical reconstruction excludes later context and never silently fetches a forecast", async ({
  page,
}) => {
  let requests = 0;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/v1/hazards/**", (route) => {
    requests++;
    return route.fulfill({ json: historyFixture() });
  });
  await page.goto("/workspace/case-studies/nepal-floods-2024");
  await expect(page.locator(".hazard-heading")).toContainText("Nepal floods");
  await expect(page.getByLabel("Reconstruction cutoff")).toHaveValue(
    "2024-09-26",
  );
  await expect(
    page.getByRole("heading", { name: "The documented event window begins" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("0 independently verified issue-time records admitted"),
  ).toBeVisible();
  expect(requests).toBe(0);
  await page
    .getByRole("button", { name: "Load NASA historical context", exact: true })
    .click();
  await expect(
    page.getByRole("img", {
      name: /NASA POWER historical daily precipitation context/,
    }),
  ).toBeVisible();
  await expect(page.locator(".hazard-chart canvas").first()).toBeVisible();
  await page.getByLabel("Include after-cutoff context (hindsight)").check();
  await expect(
    page.getByRole("heading", { name: "The documented event window begins" }),
  ).toBeVisible();
  await expect(page.locator("[data-after-cutoff]")).toHaveCount(2);
  await page
    .getByText("Source, timing and reproducibility", { exact: true })
    .click();
  await expect(
    page
      .locator(".hazard-provenance")
      .filter({ hasText: "Source, timing and reproducibility" }),
  ).toContainText("NASA POWER");
  await page.getByText("Inspect the values", { exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Missing", exact: true }),
  ).toHaveCount(1);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export historical evidence" })
    .click();
  expect((await downloadPromise).suggestedFilename()).toContain(
    "nasa-context.json",
  );
  expect(requests).toBe(1);
  expect(errors).toEqual([]);
});

test("forecast is explicit, research-only, and resets when the investigation changes", async ({
  page,
}) => {
  let requests = 0;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/v1/hazards/rainfall?*", (route) => {
    requests++;
    return route.fulfill({ json: rainfallFixture() });
  });
  await page.goto("/workspace/case-studies/nepal-floods-2024");
  await page
    .getByRole("button", { name: "Current precipitation outlook", exact: true })
    .click();
  expect(requests).toBe(0);
  await page
    .getByRole("button", { name: "Load current 72-hour outlook" })
    .click();
  await expect(page.locator(".hazard-metrics")).toContainText("24");
  await expect(page.locator(".hazard-chart canvas").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Rolling 24 hours", exact: true })
    .click();
  await page.getByLabel("Exploratory 24-hour threshold").fill("24");
  await expect(page.locator(".hazard-research")).toContainText(
    "49 overlapping windows",
  );
  await expect(page.locator(".hazard-research")).toContainText(
    "Zero exceedances does not establish safety",
  );
  await page
    .getByText("Source, timing and reproducibility", { exact: true })
    .click();
  await expect(
    page
      .locator(".hazard-provenance")
      .filter({ hasText: "Source, timing and reproducibility" }),
  ).toContainText("Not evaluated");
  await expect(
    page
      .locator(".hazard-provenance")
      .filter({ hasText: "Source, timing and reproducibility" }),
  ).toContainText("not forecast issue time");
  await page.getByRole("link", { name: "Cyclone Ditwah", exact: true }).click();
  await expect(page.getByLabel("Reconstruction cutoff")).toHaveValue(
    "2025-11-27",
  );
  await expect(page.locator(".hazard-metrics")).toHaveCount(0);
  await expect(page.locator(".hazard-heading")).toContainText("Cyclone Ditwah");
  expect(requests).toBe(1);
  expect(errors).toEqual([]);
});

test("missing coverage and credential errors withhold results without falling back to sample data", async ({
  page,
}) => {
  let fail = false;
  await page.route("**/api/v1/hazards/rainfall?*", (route) =>
    route.fulfill(
      fail
        ? {
            status: 503,
            json: {
              detail:
                "Meteomatics access was refused. Check credentials and precipitation entitlements.",
            },
          }
        : {
            json: rainfallFixture(
              INVESTIGATIONS[0],
              Date.now(),
              Array.from({ length: 72 }, (_, i) => i),
            ),
          },
    ),
  );
  await page.goto("/workspace/case-studies/nepal-floods-2024");
  await page
    .getByRole("button", { name: "Current precipitation outlook", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load current 72-hour outlook" })
    .click();
  await page.getByLabel("Exploratory 24-hour threshold").fill("5");
  await expect(page.locator(".hazard-research")).toContainText(
    "Screen withheld: no complete 24-hour windows",
  );
  fail = true;
  await page.getByRole("button", { name: "Refresh current outlook" }).click();
  await expect(
    page.locator(".hazard-workspace").getByRole("alert"),
  ).toContainText("access was refused");
  await expect(page.locator(".hazard-metrics")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Export outlook evidence" }),
  ).toHaveCount(0);
});

test("expired forecast remains inspectable but is excluded from the current threshold screen", async ({
  page,
}) => {
  await page.route("**/api/v1/hazards/rainfall?*", (route) =>
    route.fulfill({
      json: rainfallFixture(INVESTIGATIONS[0], Date.now() - 3600000),
    }),
  );
  await page.goto("/workspace/case-studies/nepal-floods-2024");
  await page
    .getByRole("button", { name: "Current precipitation outlook", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load current 72-hour outlook" })
    .click();
  await expect(page.locator(".hazard-metrics")).toContainText("Expired");
  await page.getByLabel("Exploratory 24-hour threshold").fill("5");
  await expect(page.locator(".hazard-research")).toContainText(
    "Screen withheld: refresh this expired snapshot",
  );
});

test("case navigation is accessible on mobile and landing markers link directly without spending API queries", async ({
  page,
}) => {
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/hazards/")) requests++;
  });
  await page.goto("/");
  await expect(
    page.locator(
      'a.landing-cobe-marker[href^="/workspace/forecasts?forecastId=kathmandu"]',
    ),
  ).toBeAttached();
  await expect(
    page.locator(
      'a.landing-cobe-marker[href^="/workspace/forecasts?forecastId=colombo"]',
    ),
  ).toBeAttached();
  expect(requests).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace/case-studies/ditwah-sri-lanka-2025");
  await expect(page.locator(".hazard-heading")).toContainText(
    "Colombo sample point",
  );
  await page.getByLabel("Include after-cutoff context (hindsight)").check();
  await expect(
    page.getByRole("heading", { name: "Reported cyclone landfall" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(requests).toBe(0);
});
