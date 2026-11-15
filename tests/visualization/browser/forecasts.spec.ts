import { test, expect } from "@playwright/test";
import { mockForecasts } from "./forecastMocks";
import { forecastFixture, catalogueFixture } from "../forecastFixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("iris-onboarding-complete", "true"),
  );
  await mockForecasts(page);
});

test("every landing marker opens future forecasts directly, not a location or past disaster", async ({
  page,
}) => {
  const blocked: string[] = [];
  page.on("request", (r) => {
    if (/echarts|cesium|\/forecasts\/colombo/.test(r.url()))
      blocked.push(r.url());
  });
  await page.goto("/");
  const markers = page.locator("a.landing-cobe-marker");
  await expect(markers).toHaveCount(6);
  await expect(markers.first()).toContainText("Rainfall forecast");
  await expect(markers.first()).toContainText("20.0 mm");
  for (const href of await markers.evaluateAll((nodes) =>
    nodes.map((n) => (n as HTMLAnchorElement).getAttribute("href")),
  ))
    expect(href).toContain("/workspace/data-analysis?forecastId=");
  await expect(
    page
      .locator("a.landing-cobe-marker")
      .filter({ hasText: /Ditwah|Nepal floods/ }),
  ).toHaveCount(0);
  expect(blocked).toEqual([]);
  await markers.first().focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "What comes next in Colombo?" }),
  ).toBeVisible();
  await expect(page.locator(".forecast-metrics")).toContainText("20");
  await expect(page.locator(".forecast-chart canvas").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load current 72-hour outlook" }),
  ).toHaveCount(0);
});

test("forecast customizations preserve source quantities, member evidence and export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/workspace/data-analysis?forecastId=colombo");
  await expect(page.locator(".forecast-chart canvas").first()).toBeVisible();
  await page.getByLabel("Forecast accumulation").selectOption("rolling");
  await page.getByLabel("Forecast display").selectOption("members");
  await page.getByLabel("Forecast research threshold").fill("20");
  await expect(page.locator(".forecast-detail-grid")).toContainText(
    "26 of 51 members",
  );
  await page.getByLabel("Show details in UTC").check();
  await page.getByLabel("Forecast display").selectOption("bars");
  await page.getByRole("button", { name: "Load recent NASA context" }).click();
  await expect(
    page.getByText("TEST-ONLY synthetic observation context."),
  ).toBeVisible();
  await page
    .getByText("Forecast values and reproducibility", { exact: true })
    .click();
  const promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export forecast & member evidence" })
    .click();
  expect((await promise).suggestedFilename()).toBe(
    "iris-colombo-forecast.json",
  );
  await page.getByLabel("Forecast location").selectOption("kathmandu");
  await expect(
    page.getByRole("heading", { name: "What comes next in Kathmandu?" }),
  ).toBeVisible();
  await expect(
    page.getByText("TEST-ONLY synthetic observation context."),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("expired predictions cannot drive current exceedance claims and failures never manufacture predictions", async ({
  page,
}) => {
  const old = forecastFixture(undefined, Date.now() - 4 * 3600000);
  await page.route("**/api/v1/forecasts/colombo*", (route) =>
    route.fulfill({ json: old }),
  );
  await page.goto("/workspace/data-analysis?forecastId=colombo");
  await expect(
    page.getByText("Expired snapshot · refresh required", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Forecast research threshold").fill("10");
  await expect(
    page.getByText("Exceedance screen withheld for an expired snapshot."),
  ).toBeVisible();
  await page.route("**/api/v1/forecasts/colombo*", (route) =>
    route.fulfill({
      status: 503,
      json: { detail: "Provider temporarily unavailable." },
    }),
  );
  await page.reload();
  await expect(
    page.locator(".forecast-workspace").getByRole("alert"),
  ).toContainText("Provider temporarily unavailable");
  await expect(page.locator(".forecast-metrics")).toHaveCount(0);
});

test("mobile layout and dark theme remain readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace/data-analysis?forecastId=colombo");
  await expect(page.locator(".forecast-metrics")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Upcoming conditions", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open dashboard navigation" }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page
    .locator(".dashboard-sidebar")
    .getByRole("button", { name: "Close dashboard navigation" })
    .click();
  await expect(page.locator(".forecast-chart canvas").first()).toBeVisible();
});
