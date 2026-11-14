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
    await page.addInitScript(() => localStorage.setItem('iris.studio.layout.v4', '{broken'));
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
    await page.addInitScript(() => localStorage.setItem('iris.studio.layout.v3', JSON.stringify({
        version: 3, preset: 'compare', focus: true, hidden: ['timeseries'], layout: {
            grid: {}, panels: { comparison: { id: 'comparison', contentComponent: 'comparison' }, table: { id: 'table', contentComponent: 'table' } },
        },
    })));
    await new VisualizationPage(page).open();
    await expect(page.getByRole('tab', { name: 'Time series', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Compare', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Observations', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Data controls', exact: true }).click();
    await expect(page.getByLabel('Visualization controls')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Data Analysis', exact: true })).toBeVisible();
});
