import { test, expect } from "@playwright/test";
import { mockForecasts } from "./forecastMocks";
test.beforeEach(async ({ page }) => {
  await mockForecasts(page);
});

// Landing hero COBE globe: illustrative navigation only. No scientific engines
// may load on the landing route, and every marker is a real link so the same
// destinations work without WebGL or a pointer.

test("COBE globe renders marker links that open upcoming predictions", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("iris-onboarding-complete", "true"),
  );
  const blocked: string[] = [];
  page.on("request", (r) => {
    if (/cesium|echarts|gibs\.earthdata/.test(r.url())) blocked.push(r.url());
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const canvas = page.locator(".landing-cobe-canvas");
  await expect(canvas).toBeVisible();
  const markers = page.locator("a.landing-cobe-marker");
  await expect(markers).toHaveCount(6);
  await expect(markers.first()).toHaveAttribute(
    "href",
    /\/workspace\/forecasts\?forecastId=/,
  );
  // Keyboard-equivalent navigation: markers are ordinary links in tab order.
  await markers.nth(0).focus();
  await expect(markers.nth(0)).toBeFocused();
  // The landing route must never pull the scientific engines or basemap tiles.
  expect(blocked).toEqual([]);
  // Keyboard-equivalent activation works even while the marker is occluded.
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/workspace\/forecasts\?forecastId=/, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "What comes next in Colombo?" }),
  ).toBeVisible();
  await expect(page.locator(".forecast-metrics")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load current 72-hour outlook" }),
  ).toHaveCount(0);
});

test("landing globe pauses on hover and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".landing-cobe-canvas")).toBeVisible();
  // Wait for cobe's own anchor divs (created on the first rendered frame) so
  // the hover listener is attached before hovering.
  await expect(
    page.locator('.landing-cobe div[style*="anchor-name"]').first(),
  ).toBeAttached();
  await page.locator(".landing-cobe").hover();
  await expect(page.locator(".landing-cobe-paused")).toBeVisible();
});

test("no-WebGL fallback keeps equivalent location links", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await mockForecasts(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      kind: string,
      ...args: unknown[]
    ) {
      if (kind === "webgl" || kind === "webgl2") return null;
      return (original as (...p: unknown[]) => unknown).call(
        this,
        kind,
        ...args,
      );
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator(".landing-cobe-fallback")).toBeVisible();
  await expect(page.getByText(/Interactive globe unavailable/)).toBeVisible();
  const markers = page.locator("a.landing-cobe-marker");
  await expect(markers).toHaveCount(6);
  await markers.nth(3).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    /\/workspace\/forecasts\?forecastId=central-valley/,
  );
  await context.close();
});

test("landing canvas resizes with the viewport without leaking", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".landing-cobe-canvas")).toBeVisible();
  await page.setViewportSize({ width: 500, height: 900 });
  await page.waitForTimeout(400);
  const box = await page.locator(".landing-cobe-canvas").boundingBox();
  expect(box?.width).toBeGreaterThan(200);
  expect(box?.width).toBeLessThanOrEqual(500);
});
