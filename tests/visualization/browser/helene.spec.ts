import { test, expect } from "@playwright/test";

test.describe("Hurricane Helene Interactive Case Study Browser Suite", () => {
  test("Case Studies listing contains the Hurricane Helene tile and navigates to the article", async ({
    page,
  }) => {
    // Dismiss the onboarding tour modal
    await page.addInitScript(() => {
      window.localStorage.setItem("iris-onboarding-complete", "true");
    });

    await page.goto("/workspace/case-studies");

    // Look for the Hurricane Helene card
    const card = page.locator(".hazard-case-card", {
      hasText: "Hurricane Helene",
    });
    await expect(card).toBeVisible();

    await expect(card).toContainText("COMPOUND WEATHER EVENTS");
    await expect(card).toContainText("SOUTHEASTERN USA");
    await expect(card).toContainText("2024");
    await expect(card).toContainText(
      "Five signals behind an extraordinary September."
    );
    await expect(card).toContainText("Explore Case Study");

    // Click the tile to navigate to the Helene case study
    await card.click();
    await page.waitForURL("**/workspace/case-studies/hurricane-helene-2024");
    expect(page.url()).toContain(
      "/workspace/case-studies/hurricane-helene-2024"
    );

    // Verify top header
    await expect(page.locator(".helene-top-header")).toBeVisible();
    await expect(page.locator(".helene-top-header")).toContainText("IRIS");
    await expect(page.locator(".helene-top-header")).toContainText(
      "FIELD NOTES"
    );
    await expect(page.locator(".helene-top-header")).toContainText(
      "CASE STUDY 2024"
    );
    await expect(page.locator(".helene-back-btn")).toContainText(
      "BACK TO CASE STUDIES"
    );

    // Verify Hero content
    await expect(page.locator(".helene-hero-title")).toContainText(
      "Hurricane Helene:"
    );
    await expect(page.locator(".helene-hero-subtitle")).toContainText(
      "Following the Water Inland."
    );

    // Verify Earth-System Orbit Graphic
    await expect(page.locator(".helene-orbit-svg")).toBeVisible();

    // Verify Geographic Context
    await expect(page.locator("#study-region")).toContainText(
      "A storm crosses boundaries. So does the science."
    );
    await expect(page.locator("#study-region")).toContainText("84.5°W");
    await expect(page.locator("#study-region")).toContainText("36.5°N");

    // Test "Inspect the Observation Area" drawer
    const inspectBtn = page.getByRole("button", {
      name: "Inspect the Observation Area",
    });
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();
    await expect(page.locator(".helene-side-drawer")).toBeVisible();
    await expect(page.locator(".helene-side-drawer")).toContainText("0.125°");
    await expect(page.locator(".helene-side-drawer")).toContainText("~9 km");
    // Close drawer
    await page.getByRole("button", { name: "Close panel" }).click();

    // Verify Five Evidence Signals section
    await expect(page.locator("#five-signals")).toBeVisible();
    await expect(page.locator("#five-signals")).toContainText(
      "27.72°C / AUGUST 2024"
    );
    await expect(page.locator("#five-signals")).toContainText(
      "212.52 kg/m² / SEPTEMBER 2024"
    );
    await expect(page.locator("#five-signals")).toContainText(
      "+1.02 kg/m² / SEPTEMBER 25–26"
    );
    await expect(page.locator("#five-signals")).toContainText(
      "1.92× / SEPTEMBER VS AUGUST"
    );
    await expect(page.locator("#five-signals")).toContainText(
      "4.79 m/s / SEPTEMBER 2024"
    );

    // Verify Evidence Timeline section
    await expect(page.locator("#evidence-timeline")).toBeVisible();
    await expect(page.locator("#evidence-timeline")).toContainText(
      "Five Signals. One September."
    );

    // Verify Multivariate Evidence Lab (Signal Comparison)
    await expect(page.locator("#compare-signals")).toBeVisible();
    await expect(page.locator("#compare-signals")).toContainText(
      "Different Measurements. Shared Context."
    );

    // Verify Scientific Verdict and Checkpoint Questions
    await expect(page.locator("#scientific-verdict")).toBeVisible();
    await expect(page.locator("#scientific-verdict")).toContainText(
      "What can we actually conclude?"
    );

    // Test answering question 1
    const q1Option = page.getByRole("button", {
      name: "Daily soil moisture (GLDAS CLSM)",
    });
    await expect(q1Option).toBeVisible();
    await q1Option.click();
    await expect(page.locator("#scientific-verdict")).toContainText("Accurate.");

    // Verify Limitations accordion
    await expect(page.locator("#limitations")).toBeVisible();
    await expect(page.locator("#limitations")).toContainText(
      "The limits are part of the discovery."
    );
    await expect(page.locator("#limitations")).toContainText(
      "Spatial Averaging & Grid Homogenization"
    );

    // Verify Sources & Methodology
    await expect(page.locator("#sources")).toBeVisible();
    await expect(page.locator("#sources")).toContainText("Trace the Evidence.");
    await expect(page.locator("#sources")).toContainText(
      "DATA-SCOPE DISCLAIMER"
    );

    // Test Back button navigation
    await page.locator(".helene-back-btn").click();
    await page.waitForURL("**/workspace/case-studies");
    expect(page.url()).toContain("/workspace/case-studies");
  });
});
