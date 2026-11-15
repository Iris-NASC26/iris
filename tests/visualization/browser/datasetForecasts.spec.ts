import { test, expect } from "@playwright/test";

const capabilities = {
  schema_version: "iris.ml-forecast.v2", credentials: { configured: false },
  earthdata_credentials: { configured: true }, policy: "history-only", sources: {}, admin_token_required: false,
  targets: {
    precip_24h: { label: "Rainfall", unit: "mm", composite_days: 1, sources: ["era5"] },
    smap_surface_sm: { label: "Surface soil moisture", unit: "m3/m3", composite_days: 1, sources: ["SPL3SMP_E.006"] },
    merra2_t2m: { label: "Air temperature", unit: "K", composite_days: 1, sources: ["M2T1NXSLV.5.12.4"] },
  },
};

function forecast(target: string) {
  const soil = target === "smap_surface_sm";
  return {
    schema_version: "iris.ml-forecast.v2", state: "available", target, scope: "experimental_local_model",
    run_id: "run-" + "b".repeat(16), issued_at: "2026-11-15T06:00:00Z",
    latest_input_at: "2026-11-12T00:00:00Z", input_age_hours: 78,
    uncertainty_method: "Calibrated local quantile model",
    predictions: [0, 1, 2].map(i => ({
      window_start: `2026-11-${16 + i}T00:00:00Z`, window_end: `2026-11-${17 + i}T00:00:00Z`,
      q10: soil ? .2 : 297, q50: soil ? .35 : 300, q90: soil ? .45 : 303,
      unit: soil ? "m3/m3" : "K", nonnegative: soil,
    })),
  };
}

test("dataset generation completes, displays local predictions and exports evidence", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("iris-onboarding-complete", "true"));
  let complete = false;
  const requests: string[] = [];
  await page.route("**/api/v1/forecasts/**", route => {
    const url = new URL(route.request().url());
    requests.push(url.pathname + url.search);
    const path = url.pathname;
    const target = url.searchParams.get("target") || "smap_surface_sm";
    if (path.endsWith("/capabilities")) return route.fulfill({ json: capabilities });
    if (path.endsWith("/generate")) {
      expect(route.request().postDataJSON().variable).toBe("smap_surface_sm");
      return route.fulfill({ json: { job_id: "v2-test", kind: "pipeline", status: "queued", progress: .1, checkpoint: {}, error: null } });
    }
    if (path.endsWith("/jobs/v2-test")) {
      complete = true;
      return route.fulfill({ json: { job_id: "v2-test", kind: "pipeline", status: "complete", progress: 1, checkpoint: { result: { forecast: forecast(target) } }, error: null } });
    }
    if (path.endsWith("/prediction")) return route.fulfill({ json: complete ? forecast(target) : { state: "unavailable", reason: "No trained model yet" } });
    if (path.endsWith("/history")) return route.fulfill({ json: { state: "unavailable", source_id: "SPL3SMP_E.006", records: [], coverage: { complete_days: 0, first_day: null, last_day: null } } });
    return route.fulfill({ json: { datasets: [], models: [], reports: [], job: null } });
  });
  await page.goto("/workspace/forecasts?forecastId=colombo&target=smap_surface_sm");
  await expect(page.getByLabel("ML forecast target")).toHaveValue("smap_surface_sm");
  await page.getByRole("button", { name: "Generate forecast from datasets" }).click();
  await expect(page.getByRole("button", { name: "Preparing dataset forecast…" })).toBeDisabled();
  await expect(page.locator(".ml-forecast-chart canvas").first()).toBeVisible();
  await expect(page.locator(".ml-forecast")).toContainText("Experimental local ML forecast");
  await expect(page.locator(".ml-forecast table")).toContainText("m3/m3");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export forecast and evidence" }).click();
  expect((await download).suggestedFilename()).toContain("smap_surface_sm");
  await page.getByLabel("ML forecast target").selectOption("merra2_t2m");
  await expect(page).toHaveURL(/target=merra2_t2m/);
  await expect(page.locator(".ml-forecast table")).toContainText("300");
  await expect(page.locator(".ml-forecast table")).not.toContainText("m3/m3");
  expect(requests.some(path => /\/forecasts\/colombo(?:\?|$)/.test(path))).toBe(false);
  expect(requests.some(path => path.includes("source_id=SPL3SMP_E.006") && path.includes("variable=smap_surface_sm"))).toBe(true);
});

test("saved local runs load without generating a new prediction", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("iris-onboarding-complete", "true"));
  const mutations: string[] = [];
  await page.route("**/api/v1/forecasts/v2/**", route => {
    if (route.request().method() === "POST") mutations.push(route.request().url());
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities")) return route.fulfill({ json: capabilities });
    if (path.includes("/runs/")) return route.fulfill({ json: forecast("merra2_t2m") });
    if (path.endsWith("/history")) return route.fulfill({ json: { state: "unavailable", source_id: "M2T1NXSLV.5.12.4", records: [], coverage: { complete_days: 0 } } });
    return route.fulfill({ json: { datasets: [], models: [], reports: [], job: null } });
  });
  await page.goto("/workspace/forecasts?forecastId=colombo&run=run-" + "b".repeat(16));
  await expect(page.getByLabel("ML forecast target")).toHaveValue("merra2_t2m");
  await expect(page.locator(".ml-forecast-chart canvas").first()).toBeVisible();
  expect(mutations).toEqual([]);
});
