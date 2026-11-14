import { expect, test } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage';

test.describe('Navida workspace port', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', error => { throw error; });
  });
  test('browses the approved variable list without any scientific or external requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') requests.push(request.url()); });
    const workspace = new WorkspacePage(page);
    await workspace.open();
    await page.getByRole('link', { name: 'Explore the variables' }).click();
    await page.getByRole('textbox', { name: 'Search variables' }).fill('NDVI');
    await page.getByRole('button', { name: /Vegetation greenness/ }).click();
    await page.getByRole('combobox', { name: 'Explanation level' }).selectOption('scientist');
    await expect(page.getByText('_1_km_monthly_NDVI', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Open data preview' }).click();
    await expect(page).toHaveURL(/data-preview\?variable=V13$/);
    await expect(page.getByRole('heading', { name: 'No observations loaded' })).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
    await workspace.expectUnavailable();
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:5173')).toBe(true);
    expect(requests.filter(url => new URL(url).pathname.startsWith('/api/')).every(url => new URL(url).pathname === '/api/v1/health')).toBe(true);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Explanation level' })).toHaveValue('scientist');
    await expect(page.getByRole('heading', { name: 'Vegetation greenness' })).toBeVisible();
    await workspace.expectNoOverflow();
  });

  test('tour traps keyboard focus, closes with Escape and restores its trigger', async ({ page }) => {
    const workspace = new WorkspacePage(page);
    await workspace.open();
    const trigger = page.getByRole('button', { name: 'Take a quick tour' });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(dialog.getByRole('heading')).toHaveText('Choose a variable worth investigating');
    const close = dialog.getByRole('button', { name: 'Skip onboarding' });
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('mobile drawer, theme persistence and unavailable globe work with reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const workspace = new WorkspacePage(page);
    await workspace.open();
    const trigger = page.getByRole('button', { name: 'Open workspace navigation' });
    await trigger.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Switch to light mode' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Living Globe' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Living Globe', exact: true })).toBeVisible();
    await workspace.expectUnavailable();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('checkbox', { name: 'Reduce motion' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await workspace.expectNoOverflow();
  });

  test('Ask the Detective confirms before suggesting and links into data selection', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(new URL(request.url()).pathname); });
    const workspace = new WorkspacePage(page);
    await workspace.open();
    await page.getByRole('link', { name: 'Ask the Detective' }).click();
    await expect(page).toHaveURL(/\/workspace\/assistant$/);
    await page.getByRole('textbox', { name: 'Describe a research topic' }).fill('Heatwave and rainfall in California since 2010');
    await page.getByRole('button', { name: 'Send' }).click();
    const review = page.getByRole('region', { name: 'Review search terms' });
    await expect(review).toBeVisible();
    await expect(page.getByRole('region', { name: 'Suggested variables' })).toHaveCount(0);
    await review.getByRole('button', { name: 'Confirm and search' }).click();
    await page.getByRole('link', { name: /Inspect V01/ }).click();
    await expect(page).toHaveURL(/data-selection\?variable=V01$/);
    await expect(page.getByRole('heading', { name: 'Air temperature near the ground' })).toBeVisible();
    expect(apiCalls.every(path => path === '/api/v1/health')).toBe(true);
    await workspace.expectNoOverflow();
  });
});
