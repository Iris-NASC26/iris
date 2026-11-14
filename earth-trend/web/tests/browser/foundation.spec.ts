import { expect, test } from '@playwright/test';

test('React reaches the real local FastAPI health endpoint', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Local server connected');
  await expect(page.getByText(/Analysis unavailable/)).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/foundation-desktop.png', fullPage: true });
});

test('a narrow layout recovers from a connection failure using the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/v1/health', route => route.abort());
  await page.goto('/');
  const retry = page.getByRole('button', { name: 'Retry connection' });
  await expect(retry).toBeVisible();
  await page.unroute('**/api/v1/health');
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Local server connected');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
