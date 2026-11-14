import { expect, test } from '@playwright/test';

test.describe('Next.js public integration', () => {
  test('renders Navida public pages, native navigation and deep-link refresh without hydration errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /A changing planet/ })).toBeVisible();
    await page.getByRole('navigation', { name: 'Product navigation', exact: true }).getByRole('link', { name: 'About', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Better climate conversations start with better evidence' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Clarity without oversimplification' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Product navigation', exact: true }).getByRole('link', { name: 'Methodology', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Browser-compatibility data credit' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'CC-BY-4.0', exact: true })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
    await page.getByRole('navigation', { name: 'Product navigation', exact: true }).getByRole('link', { name: 'Our data' }).click();
    await expect(page.getByRole('region', { name: 'Planned NASA sources' }).getByRole('article')).toHaveCount(13);
    await page.getByRole('link', { name: 'Open workspace', exact: true }).click();
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByRole('status')).toHaveText('Local server connected');
    expect(errors).toEqual([]);
  });

  test('mobile public navigation uses a keyboard-accessible dialog', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open product navigation' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Platform', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'One workspace for the investigation' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('server denies remote origins/hosts, keeps secrets inaccessible and returns real 404s', async ({ request }) => {
    const health = await request.get('/api/v1/health');
    expect(health.ok()).toBe(true);
    expect((await health.json()).analysis_ready).toBe(false);
    const remote = await request.get('/api/v1/health', { headers: { Origin: 'https://attacker.test' } });
    expect(remote.status()).toBe(403);
    const host = await request.get('/api/v1/health', { headers: { Host: 'attacker.test:5173' } });
    expect(host.status()).toBe(403);
    expect((await request.get('/.env')).status()).toBe(404);
    expect((await request.get('/api/v1/cube/globe')).status()).toBe(404);
    expect((await request.get('/workspace/no-such-page')).status()).toBe(404);
  });
});
