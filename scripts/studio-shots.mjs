import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const theme of ['light', 'dark']) {
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(t => { localStorage.setItem('iris-onboarding-complete', 'true'); localStorage.setItem('iris-theme', t); }, theme);
  await page.goto('http://localhost:3000/workspace/visualize', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `artifacts/visualization/studio-${theme}.png` });
}
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.addInitScript(() => { localStorage.setItem('iris-onboarding-complete', 'true'); localStorage.setItem('iris-theme', 'dark'); });
await m.goto('http://localhost:3000/workspace/visualize', { waitUntil: 'networkidle', timeout: 60000 });
await m.waitForTimeout(1500);
await m.screenshot({ path: 'artifacts/visualization/studio-mobile-dark.png' });
await b.close(); console.log('done');
