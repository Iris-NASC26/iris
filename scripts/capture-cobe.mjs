import { chromium } from '@playwright/test';
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:3000', viewport: { width: 1440, height: 900 } });
  await page.addInitScript(t => { localStorage.setItem('iris-onboarding-complete', 'true'); localStorage.setItem('iris-theme', t); }, theme);
  await page.goto('/');
  await page.locator('.landing-cobe div[style*="anchor-name"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  const section = page.locator('.landing-cobe').first();
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `artifacts/visualization/cobe-${theme}-desktop.png` });
  // element-level crop of the globe + markers
  await section.screenshot({ path: `artifacts/visualization/cobe-element-${theme}.png` });
  console.log('cobe', theme, 'done');
  await page.close();
}
await browser.close();
