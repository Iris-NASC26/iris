import { test, expect } from '@playwright/test';
import { VisualizationPage } from './VisualizationPage';
import { fixture, product } from './fixtures';
import { analysisFixture } from './analysisFixture';

test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/timeseries/jobs/*/preview?*', route => route.fulfill({ json: fixture() }));
});

test('landscape is the default; 3D, heatmap, themes and quantities use the selected record', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await new VisualizationPage(page).open('/workspace/visualize?jobId=job-test');
    await expect(page.getByLabel('Preset', { exact: true })).toHaveValue('landscape');
    await expect(page.getByLabel('Selected record')).toContainText('Test air temperature');
    await expect(page.locator('.viz-landscape-canvas canvas').first()).toBeVisible();
    await expect(page.getByRole('img', { name: /Interactive 3D seasonal landscape/ })).toHaveAttribute('aria-label', /4 monthly values/);
    await page.getByRole('button', { name: '3D Columns', exact: true }).click();
    await expect(page.locator('.viz-landscape-canvas canvas').first()).toBeVisible();
    await page.getByRole('button', { name: '2D Heatmap', exact: true }).click();
    await expect(page.locator('.viz-landscape-canvas')).toHaveCount(0);
    await page.getByLabel('Landscape quantity').selectOption('departure');
    await expect(page.locator('.viz-landscape-panel .viz-panel-foot')).toContainText('not a climate normal');
    await page.getByLabel('Environment', { exact: true }).selectOption('light');
    await expect(page.locator('.viz-immersive')).toHaveAttribute('data-environment', 'light');
    await expect(page.getByRole('tab', { name: 'Outlook', exact: true })).toHaveCount(0);
    await expect(page.locator('.viz-three-mount')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('WebGL denial shows the equivalent heatmap without losing observations', async ({ page }) => {
    await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind: string, ...args: unknown[]) {
            return kind.startsWith('webgl') ? null : (original as (...p: unknown[]) => unknown).call(this, kind, ...args);
        } as typeof original;
    });
    await new VisualizationPage(page).open('/workspace/visualize?jobId=job-test');
    await expect(page.getByText('WebGL is unavailable. The equivalent 2D heatmap is shown.')).toBeVisible();
    await expect(page.locator('.viz-landscape-panel .viz-chart-canvas canvas')).toBeVisible();
    await expect(page.locator('.viz-landscape-panel .viz-panel-foot')).toContainText('20 empty calendar cells');
});

test('completed Data Analysis binds evidence and fitted values across navigation without rerunning', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/v1/analyze/case-file', route => {
        requests++;
        return route.fulfill({ json: analysisFixture(route.request().postDataJSON().analysis_methods) });
    });
    const ui = new VisualizationPage(page); await ui.open('/workspace/visualize?jobId=job-test');
    await page.getByRole('button', { name: 'Scientific analysis', exact: true }).click();
    await page.getByRole('checkbox', { name: /Sen.*s slope/ }).check();
    await page.getByRole('checkbox', { name: /Mann.*Kendall trend test/ }).check();
    await page.getByRole('button', { name: /Run selected analysis/ }).click();
    await page.getByRole('link', { name: /Explore in Visualization Studio/ }).click();
    await expect(page.getByLabel('Selected record')).toContainText('Matching result attached');
    await expect(page.locator('.viz-evidence')).toContainText('95% confidence interval: 0.5 to 3.5');
    await expect(page.locator('.viz-evidence')).toContainText('p = 0.0300');
    await expect(page.locator('.viz-evidence')).toContainText('Hamed–Rao Mann–Kendall');
    await page.getByLabel('Signal', { exact: true }).selectOption('analysis');
    await expect(page.getByRole('img', { name: /Submitted analysis-adjusted observations/ })).toBeVisible();
    await page.getByLabel('Preset', { exact: true }).selectOption('evidence');
    await expect(page.getByRole('img', { name: /Trend estimates and 95% confidence intervals/ })).toBeVisible();
    expect(requests).toBe(1);
    // A different immutable job must not reuse this analysis.
    await page.route('**/api/v1/si/discover', route => route.fulfill({ json: { products: [product], query: 'test', queried_sources: ['NASA POWER'] } }));
    await page.route('**/api/v1/timeseries/extract', route => route.fulfill({ json: fixture('job-other', -1.29, 36.82) }));
    await ui.discover();
    await page.getByLabel('Datasets').getByRole('checkbox', { name: /Test air temperature/ }).check();
    await ui.load();
    await expect(page.getByLabel('Selected record')).toContainText('Not yet attached');
    expect(requests).toBe(1);
});

test('mobile landscape remains usable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const ui = new VisualizationPage(page); await ui.open('/workspace/visualize?jobId=job-test');
    await expect(page.locator('.viz-studio-mobile')).toBeVisible();
    await page.getByRole('button', { name: '2D Heatmap', exact: true }).click();
    await ui.noOverflow();
    await page.locator('.viz-studio-mobile > label select').selectOption('evidence');
    await expect(page.getByText('Explore the record now.')).toBeVisible();
});
