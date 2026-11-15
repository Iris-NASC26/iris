import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { v2CompatibilityFixture, v2LocationsFixture } from "./forecastMocks";

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
    if (path.endsWith("/locations")) return route.fulfill({ json: v2LocationsFixture() });
    if (path.endsWith("/compatibility")) return route.fulfill({ json: v2CompatibilityFixture() });
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
    if (path.endsWith("/locations")) return route.fulfill({ json: v2LocationsFixture() });
    if (path.endsWith("/compatibility")) return route.fulfill({ json: v2CompatibilityFixture() });
    if (path.includes("/runs/")) return route.fulfill({ json: forecast("merra2_t2m") });
    if (path.endsWith("/history")) return route.fulfill({ json: { state: "unavailable", source_id: "M2T1NXSLV.5.12.4", records: [], coverage: { complete_days: 0 } } });
    return route.fulfill({ json: { datasets: [], models: [], reports: [], job: null } });
  });
  await page.goto("/workspace/forecasts?forecastId=colombo&run=run-" + "b".repeat(16));
  await expect(page.getByLabel("ML forecast target")).toHaveValue("merra2_t2m");
  await expect(page.locator(".ml-forecast-chart canvas").first()).toBeVisible();
  expect(mutations).toEqual([]);
});

test("experimental forecast displays red baseline errors and preserves saved navigation", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("iris-onboarding-complete", "true"));
  const mutations: string[] = [];
  await page.route("**/api/v1/forecasts/v2/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "POST") mutations.push(path);
    if (path.endsWith("/capabilities")) return route.fulfill({ json: capabilities });
    if (path.endsWith("/locations")) return route.fulfill({ json: v2LocationsFixture() });
    if (path.endsWith("/compatibility")) return route.fulfill({ json: v2CompatibilityFixture() });
    if (path.endsWith("/published")) return route.fulfill({ json: { forecasts: [forecast("merra2_t2m")] } });
    if (path.includes("/runs/")) return route.fulfill({ json: forecast("merra2_t2m") });
    if (path.endsWith("/jobs")) return route.fulfill({ json: { job: {
      job_id: "v2-rejected", kind: "pipeline", status: "complete", progress: 1, error: null,
      checkpoint: { result: { state: "unavailable", models: [{ state: "rejected",
        metrics: { model_mae: 2.75, baseline_mae: 2.55 },
        eligibility_reasons: ["Model did not beat both persistence and seasonal climatology on the untouched chronological test."],
      }] } },
    } } });
    if (path.endsWith("/prediction")) return route.fulfill({ json: {
      ...forecast("smap_surface_sm"), quality_status: "experimental_preview", scope: "experimental_preview",
      predictions: forecast("smap_surface_sm").predictions.map(w => ({ ...w,
        quality_status: "experimental_preview", error_vs_baseline_pct: 8,
        evaluation: { model_mae: 2.75, baseline_mae: 2.55, n_eval: 890 },
        quality_reasons: ["Model did not beat the seasonal baseline."],
      })),
    } });
    if (path.endsWith("/history")) return route.fulfill({ json: { state: "unavailable", records: [], coverage: { complete_days: 0 } } });
    return route.fulfill({ json: { datasets: [], models: [], reports: [], job: null } });
  });
  await page.goto("/workspace/forecasts?forecastId=colombo&target=smap_surface_sm");
  await expect(page.locator(".result-badge")).toContainText("Experimental preview");
  await expect(page.locator(".result-warning")).toContainText("8% more error than baseline");
  await expect(page.locator(".result-error.quality-warning")).toHaveCount(3);
  await expect(page.locator(".result-days")).toBeVisible();
  await expect(page.locator(".ml-forecast-chart canvas").first()).toBeVisible();
  expect(await page.locator(".result-warning").evaluate(el => getComputedStyle(el).color)).toBe("rgb(179, 56, 70)");
  await page.getByRole("link", { name: "Air temperature — View saved forecast" }).click();
  await expect(page).toHaveURL(/target=merra2_t2m&run=/);
  await expect(page.locator("#forecast-result .forecast-kicker")).toContainText("SAVED FORECAST");
  await expect(page.getByRole("region", { name: "Generated forecast" })).toContainText("Air temperature");
  await expect(page.locator(".ml-forecast-chart canvas").first()).toBeVisible();
  expect(mutations).toEqual([]);
});

test("default page selects an already published forecast for presentation", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("iris-onboarding-complete", "true"));
  await page.route("**/api/v1/forecasts/v2/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities")) return route.fulfill({ json: capabilities });
    if (path.endsWith("/locations")) return route.fulfill({ json: v2LocationsFixture() });
    if (path.endsWith("/compatibility")) return route.fulfill({ json: v2CompatibilityFixture() });
    if (path.endsWith("/published")) return route.fulfill({ json: { forecasts: [forecast("merra2_t2m")] } });
    if (path.endsWith("/prediction")) return route.fulfill({ json: forecast("merra2_t2m") });
    if (path.endsWith("/history")) return route.fulfill({ json: { state: "unavailable", records: [], coverage: { complete_days: 0 } } });
    return route.fulfill({ json: { datasets: [], models: [], reports: [], job: null } });
  });
  await page.goto("/workspace/forecasts?forecastId=colombo");
  await expect(page).toHaveURL(/target=merra2_t2m/);
  await expect(page.locator(".ml-forecast-chart canvas").first()).toBeVisible();
});

test("generation from a saved run exits the archive and shows the new result", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("iris-onboarding-complete", "true"));
  let generated = false;
  const latest = { ...forecast("merra2_t2m"), run_id: "run-" + "c".repeat(16) };
  await page.route("**/api/v1/forecasts/v2/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities")) return route.fulfill({ json: capabilities });
    if (path.endsWith("/locations")) return route.fulfill({ json: v2LocationsFixture() });
    if (path.endsWith("/compatibility")) return route.fulfill({ json: v2CompatibilityFixture() });
    if (path.endsWith("/generate")) { generated = true; return route.fulfill({ json: latest }); }
    if (path.includes("/runs/")) return route.fulfill({ json: forecast("merra2_t2m") });
    if (path.endsWith("/prediction")) return route.fulfill({ json: generated ? latest : forecast("merra2_t2m") });
    if (path.endsWith("/history")) return route.fulfill({ json: { state: "unavailable", records: [], coverage: { complete_days: 0 } } });
    return route.fulfill({ json: { datasets: [], models: [], reports: [], job: null } });
  });
  await page.goto("/workspace/forecasts?forecastId=colombo&target=merra2_t2m&run=run-" + "b".repeat(16));
  await expect(page.locator("#forecast-result .forecast-kicker")).toContainText("SAVED FORECAST");
  await page.getByRole("button", { name: "Generate forecast from datasets" }).click();
  await expect(page).not.toHaveURL(/[?&]run=/);
  await expect(page.locator("#forecast-result caption")).toContainText(latest.run_id);
  await expect(page.getByRole("link", { name: "Open permanent link to this forecast" })).toHaveAttribute("href", new RegExp(latest.run_id));
});

test("mobile dark preview keeps warnings readable and exports quality metadata", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("iris-onboarding-complete", "true");
    localStorage.setItem("iris-theme", "dark");
  });
  const preview = { ...forecast("merra2_t2m"), quality_status: "experimental_preview",
    predictions: forecast("merra2_t2m").predictions.map(w => ({ ...w,
      quality_status: "experimental_preview", error_vs_baseline_pct: 8.2,
      evaluation: { model_mae: 2.7, baseline_mae: 2.5, n_eval: 100 },
    })),
  };
  await page.route("**/api/v1/forecasts/v2/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities")) return route.fulfill({ json: capabilities });
    if (path.endsWith("/locations")) return route.fulfill({ json: v2LocationsFixture() });
    if (path.endsWith("/compatibility")) return route.fulfill({ json: v2CompatibilityFixture() });
    if (path.endsWith("/prediction")) return route.fulfill({ json: preview });
    if (path.endsWith("/history")) return route.fulfill({ json: { state: "unavailable", records: [], coverage: { complete_days: 0 } } });
    return route.fulfill({ json: { datasets: [], models: [], reports: [], job: null } });
  });
  await page.goto("/workspace/forecasts?forecastId=colombo&target=merra2_t2m");
  await expect(page.locator(".result-warning")).toContainText("8.2% more error than baseline");
  await expect(page.locator(".result-big-number")).toContainText("26.85");
  await page.getByRole("button", { name: "Switch temperature unit" }).click();
  await expect(page.locator(".result-big-number")).toContainText("300");
  await expect(page.locator(".result-big-number")).toContainText("K");
  expect(await page.locator(".result-warning").evaluate(el => getComputedStyle(el).color)).toBe("rgb(255, 155, 168)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export forecast and evidence" }).click();
  const saved = JSON.parse(await readFile((await (await event).path())!, "utf8"));
  expect(saved.forecast.quality_status).toBe("experimental_preview");
  expect(saved.forecast.predictions[0].error_vs_baseline_pct).toBe(8.2);
  expect(saved.forecast.predictions[0].unit).toBe("K");
});
