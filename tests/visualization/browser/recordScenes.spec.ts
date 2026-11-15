import { test, expect } from "@playwright/test";
import { VisualizationPage } from "./VisualizationPage";
import { fixture } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/timeseries/jobs/*/preview?*", (route) =>
    route.fulfill({ json: fixture() }),
  );
});

test("seasonal orbit, year emphasis and profile share exact source selections", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await new VisualizationPage(page).open("/workspace/visualize?jobId=job-test");
  await page.getByRole("tab", { name: "Seasonal cycles", exact: true }).click();
  const panel = page.locator(".viz-cycle-panel");
  await expect(
    panel.getByRole("img", { name: /Interactive 3D seasonal orbit/ }),
  ).toBeVisible();
  await expect(panel.locator(".viz-record-mount canvas")).toBeVisible();
  await expect(
    panel.getByRole("img", { name: /Interactive 3D seasonal orbit/ }),
  ).toHaveAttribute("aria-label", /4 source observations/);
  await page.getByLabel("Highlight seasonal year").selectOption("2021");
  await panel.getByLabel("Inspect source observation").press("ArrowRight");
  await expect(panel.locator(".viz-observation-nav")).toContainText("2020-02");
  await expect(panel.locator(".viz-observation-value")).toContainText(
    "Unavailable",
  );
  await panel.getByRole("button", { name: "Next source observation" }).click();
  await expect(panel.locator(".viz-observation-nav")).toContainText("2020-03");
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(page.locator(".viz-immersive")).toHaveAttribute(
    "data-environment",
    "dark",
  );
  await expect(panel.locator(".viz-record-mount canvas")).toBeVisible();
  await panel
    .getByRole("button", { name: "Seasonal profile", exact: true })
    .click();
  await expect(
    panel.getByRole("img", { name: /Seasonal profile for/ }),
  ).toBeVisible();
  await expect(panel).toContainText("not confidence intervals");
  await panel
    .getByRole("button", { name: "Year-by-month", exact: true })
    .click();
  await expect(
    panel.getByRole("img", { name: /Monthly heatmap/ }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "3D Seasonal orbit", exact: true })
    .click();
  const orbitCanvas = panel.locator(".viz-record-mount canvas");
  await expect(orbitCanvas).toBeVisible();
  await orbitCanvas.evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext("webgl2");
    const extension = context?.getExtension("WEBGL_lose_context");
    if (!extension)
      throw new Error("Context-loss test needs the WebGL extension");
    extension.loseContext();
  });
  await expect(panel.getByRole("status")).toContainText("context was lost");
  await expect(
    panel.getByRole("img", { name: /Seasonal profile for/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("time-series modes and 3D track retain missing observations and shared timestamps", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await new VisualizationPage(page).open("/workspace/visualize?jobId=job-test");
  await page.getByRole("tab", { name: "Time series", exact: true }).click();
  const panel = page.locator(".viz-timeseries-panel");
  await expect(panel).toContainText("4 usable / 6 rows");
  await panel.getByRole("button", { name: "Area", exact: true }).click();
  await expect(panel.getByRole("img", { name: /Area for/ })).toBeVisible();
  await panel.getByRole("button", { name: "3D Track", exact: true }).click();
  await expect(
    panel.getByRole("img", { name: /Interactive 3D time track/ }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Next source observation" }).click();
  await expect(panel.locator(".viz-observation-nav")).toContainText("2020-02");
  await expect(panel.locator(".viz-observation-value")).toContainText(
    "Unavailable",
  );
  await panel.getByRole("button", { name: "Line", exact: true }).click();
  await expect(
    panel.getByRole("img", { name: /Time series for/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("denied 3D uses the full 2D views without losing usable source data", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      kind: string,
      ...args: unknown[]
    ) {
      return kind.startsWith("webgl")
        ? null
        : (original as (...p: unknown[]) => unknown).call(this, kind, ...args);
    } as typeof original;
  });
  await new VisualizationPage(page).open("/workspace/visualize?jobId=job-test");
  await page.getByRole("tab", { name: "Seasonal cycles", exact: true }).click();
  await expect(
    page.locator(".viz-cycle-panel").getByRole("status"),
  ).toContainText("equivalent 2D view");
  await expect(
    page.getByRole("img", { name: /Seasonal profile for/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Time series", exact: true }).click();
  await page.getByRole("button", { name: "3D Track", exact: true }).click();
  await expect(
    page.locator(".viz-timeseries-panel").getByRole("status"),
  ).toContainText("equivalent 2D view");
  await expect(
    page.getByRole("img", { name: /Time series for/ }),
  ).toBeVisible();
});

test("mobile seasonal and time views stay within the screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const ui = new VisualizationPage(page);
  await ui.open("/workspace/visualize?jobId=job-test");
  await page.getByLabel("Panel", { exact: true }).selectOption("seasonal");
  await expect(
    page.locator(".viz-cycle-panel .viz-record-mount canvas"),
  ).toBeVisible();
  await ui.noOverflow();
  await page.getByLabel("Panel", { exact: true }).selectOption("timeseries");
  await page.getByRole("button", { name: "3D Track", exact: true }).click();
  await expect(
    page.locator(".viz-timeseries-panel .viz-record-mount canvas"),
  ).toBeVisible();
  await ui.noOverflow();
});

test("timeline brush zoom survives linked observation selection", async ({
  page,
}) => {
  await new VisualizationPage(page).open("/workspace/visualize?jobId=job-test");
  await page.getByRole("tab", { name: "Time series", exact: true }).click();
  const panel = page.locator(".viz-timeseries-panel"),
    frame = panel.locator(".viz-chart-frame");
  const canvas = panel.locator(".viz-chart-canvas canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Timeline canvas has no interactive bounds");
  await canvas.hover({
    position: { x: box.width * 0.55, y: box.height * 0.45 },
  });
  await page.mouse.wheel(0, -400);
  await expect
    .poll(
      async () =>
        Number(await frame.getAttribute("data-zoom-end")) -
        Number(await frame.getAttribute("data-zoom-start")),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(
      async () =>
        Number(await frame.getAttribute("data-zoom-end")) -
        Number(await frame.getAttribute("data-zoom-start")),
    )
    .toBeLessThan(95);
  const start = Number(await frame.getAttribute("data-zoom-start")),
    end = Number(await frame.getAttribute("data-zoom-end"));
  await panel.getByRole("button", { name: "Next source observation" }).click();
  await expect(panel.locator(".viz-observation-nav")).toContainText("2020-02");
  await expect
    .poll(async () => Number(await frame.getAttribute("data-zoom-start")))
    .toBeCloseTo(start, 5);
  await expect
    .poll(async () => Number(await frame.getAttribute("data-zoom-end")))
    .toBeCloseTo(end, 5);
});
