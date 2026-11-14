import { test, expect } from '@playwright/test';
import { VisualizationPage } from './VisualizationPage';
import { fixture } from './fixtures';

test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/timeseries/jobs/*/preview?*', route => route.fulfill({ json: fixture() }));
});

test('clean toolbar and remaining tabs work without closing access to views', async ({ page }) => {
    const ui = new VisualizationPage(page); await ui.open('/workspace/visualize?jobId=job-test');
    const toolbar = page.getByRole('toolbar', { name: 'Studio controls' });
    await expect(toolbar.getByRole('combobox')).toHaveCount(0);
    await expect(toolbar.getByRole('button')).toHaveText(['Data controls', 'Export CSV', 'Export JSON']);
    const topTabs = page.locator('.dv-tabs-container').filter({ has: page.getByRole('tab', { name: 'Seasonal landscape', exact: true }) });
    await expect(topTabs.getByRole('tab', { name: 'Time series', exact: true })).toBeVisible();
    await topTabs.getByRole('tab', { name: 'Time series', exact: true }).click();
    await expect(page.getByRole('img', { name: /Time series for/ })).toBeVisible();
    for (const name of ['Compare', 'Observations', 'Outlook', 'Living Earth']) {
        await expect(page.getByRole('tab', { name, exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Seasonal cycles', exact: true }).click();
    await expect(page.getByRole('img', { name: /Monthly heatmap/ })).toBeVisible();
    await page.getByRole('button', { name: 'Seasonal profile', exact: true }).click();
    await expect(page.getByRole('img', { name: /Seasonal profile for/ })).toBeVisible();
    await page.getByRole('tab', { name: 'Seasonal cycles', exact: true }).click({ button: 'middle' });
    await expect(page.getByRole('tab', { name: 'Seasonal cycles', exact: true })).toBeVisible();
});

test('corrupt persisted layouts recover automatically without a reset control', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('iris.studio.layout.v5', '{broken'));
    await new VisualizationPage(page).open();
    await expect(page.getByRole('toolbar', { name: 'Studio controls' }).getByRole('status')).toContainText('default arrangement is ready');
    await expect(page.getByRole('tab', { name: 'Time series', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset workspace', exact: true })).toHaveCount(0);
});

test('mobile view selector excludes removed panels and keeps visualization accessible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const ui = new VisualizationPage(page); await ui.open('/workspace/visualize?jobId=job-test');
    await expect(page.locator('.viz-studio-mobile')).toBeVisible();
    const selector = page.getByLabel('Panel', { exact: true });
    await expect(selector.getByRole('option')).toHaveCount(8);
    for (const name of ['Compare', 'Observations', 'Outlook']) await expect(selector.getByRole('option', { name, exact: true })).toHaveCount(0);
    await selector.selectOption('source');
    await expect(page.getByText('point_exact', { exact: false }).last()).toBeVisible();
    await ui.noOverflow();
});

test('data controls toggle without removed focus controls', async ({ page }) => {
    await new VisualizationPage(page).open();
    await page.getByRole('button', { name: 'Data controls', exact: true }).click();
    await expect(page.getByLabel('Visualization controls')).toBeVisible();
    await page.getByRole('button', { name: 'Hide data controls', exact: true }).click();
    await expect(page.getByLabel('Visualization controls')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Focus|Exit focus)$/ })).toHaveCount(0);
});

test('legacy saved layouts cannot restore removed panels or focus state', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('iris.studio.layout.v4', JSON.stringify({
        version: 4, preset: 'compare', focus: true, hidden: ['timeseries'], layout: {
            grid: {}, panels: { comparison: { id: 'comparison', contentComponent: 'comparison' }, table: { id: 'table', contentComponent: 'table' } },
        },
    })));
    await new VisualizationPage(page).open();
    await expect(page.getByRole('tab', { name: 'Time series', exact: true })).toBeVisible();
    const topTabs = page.locator('.dv-tabs-container').filter({ has: page.getByRole('tab', { name: 'Seasonal landscape', exact: true }) });
    await expect(topTabs.getByRole('tab', { name: 'Time series', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Compare', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Observations', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Data controls', exact: true }).click();
    await expect(page.getByLabel('Visualization controls')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Data Analysis', exact: true })).toBeVisible();
});

test('tab headers follow the app theme despite an old saved dark environment', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('iris-theme', 'light');
        localStorage.setItem('iris.studio.display.v1', JSON.stringify({ dark: true, palette: 'ocean' }));
    });
    await new VisualizationPage(page).open('/workspace/visualize?jobId=job-test');
    await expect(page.locator('.viz-immersive')).toHaveAttribute('data-environment', 'light');
    await expect(page.locator('.viz-studio-dock')).toHaveClass(/dockview-theme-light/);
    const header = page.locator('.dv-tabs-and-actions-container').first();
    const brightness = () => header.evaluate(element => (getComputedStyle(element).backgroundColor.match(/[\d.]+/g) ?? []).slice(0, 3).reduce((sum, v) => sum + Number(v), 0));
    await expect.poll(brightness).toBeGreaterThan(600);
    await expect(page.getByLabel('Palette')).toHaveValue('ocean');
    await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
    await expect(page.locator('.viz-studio-dock')).toHaveClass(/dockview-theme-dark/);
    await expect.poll(brightness).toBeLessThan(200);
    await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
    await expect.poll(brightness).toBeGreaterThan(600);
});

test('observation playback advances the linked selection and preserves missing values', async ({ page }) => {
    await new VisualizationPage(page).open('/workspace/visualize?jobId=job-test');
    await page.getByRole('tab', { name: 'Source & selection', exact: true }).click();
    await expect(page.getByText('4 (2 missing/excluded)', { exact: true })).toBeVisible();
    await page.clock.install();
    await page.getByRole('button', { name: 'Play observations', exact: true }).click();
    await page.clock.fastForward(650);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByLabel('Observation time')).toHaveValue('1');
    const selection = page.locator('.viz-panel .viz-control-section').filter({ hasText: 'SELECTION' }).first();
    await expect(selection).toContainText('2020-02');
    await expect(selection).toContainText('Unavailable C (QA: Missing)');
});
