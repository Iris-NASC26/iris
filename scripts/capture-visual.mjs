// Screenshot + timing capture for the GeoLibre-inspired milestone.
// Uses the same synthetic transport fixtures as the test suite — no NASA calls.
import { chromium } from '@playwright/test';
import { field, product, fixture } from '../tests/visualization/browser/fixtures.ts';

const BASE = 'http://127.0.0.1:3000';
const OUT = 'artifacts/visualization';
const browser = await chromium.launch();
const stats = {};

async function mocks(page) {
  await page.route('**/api/v1/si/discover', r => r.fulfill({ json: { products: [product], query: 't', queried_sources: ['NASA POWER'] } }));
  await page.route('**/api/v1/timeseries/jobs/*/preview?*', r => r.fulfill({ json: fixture() }));
  await page.route('**/api/v1/timeseries/extract', r => r.fulfill({ json: fixture() }));
  await page.route('**/api/v1/visualization/field?*', r => { const month = new URL(r.request().url()).searchParams.get('month') ?? '2024-01'; return r.fulfill({ json: { ...field, month } }); });
  await page.route('**/api/v1/visualization/overview?*', r => r.fulfill({ json: field }));
}

async function shot(page, name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log('shot', name);
}

for (const theme of ['light', 'dark']) {
  for (const [vp, tag] of [[{ width: 1440, height: 900 }, 'desktop'], [{ width: 390, height: 844 }, 'mobile']]) {
    const page = await browser.newPage({ baseURL: BASE, viewport: vp });
    await mocks(page);
    await page.addInitScript(t => {
      localStorage.setItem('iris-onboarding-complete', 'true');
      localStorage.setItem('iris-theme', t);
    }, theme);
    // Landing + COBE init timing
    const t0 = Date.now();
    await page.goto('/');
    await page.locator('.landing-cobe div[style*="anchor-name"]').first().waitFor({ timeout: 15000 }).catch(() => {});
    stats[`cobe-init-${theme}-${tag}`] = Date.now() - t0;
    await shot(page, `landing-${theme}-${tag}`);
    // Workspace with loaded field
    await page.goto('/workspace/globe?place=Colombo,%20Sri%20Lanka&lat=6.9355&lon=79.8487');
    await page.getByRole('heading', { name: 'Make the change visible.' }).waitFor();
    const t1 = Date.now();
    await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
    await page.getByText('3 of 4 native cells contain values', { exact: false }).waitFor();
    stats[`field-load-${theme}-${tag}`] = Date.now() - t1;
    await shot(page, `globe-field-${theme}-${tag}`);
    // Inspector open via 2D pick
    await page.getByRole('button', { name: '2D map', exact: true }).click();
    const map = page.locator('.viz-flat-map');
    const box = await map.boundingBox();
    if (box) await map.click({ position: { x: box.width * (260.3 / 360), y: box.height * (84.75 / 180) } });
    await page.locator('.viz-map-inspector').waitFor().catch(() => {});
    await shot(page, `inspector-${theme}-${tag}`);
    await page.close();
  }
}
// Interaction timing: styling change + playback request latency
const page = await browser.newPage({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
await mocks(page);
await page.addInitScript(() => localStorage.setItem('iris-onboarding-complete', 'true'));
await page.goto('/workspace/globe');
await page.getByRole('heading', { name: 'Make the change visible.' }).waitFor();
await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
await page.getByText('3 of 4 native cells contain values', { exact: false }).waitFor();
let t = Date.now();
await page.getByLabel('Colour ramp').selectOption('viridis');
stats['restyle-ramp'] = Date.now() - t;
t = Date.now();
await page.getByRole('button', { name: 'Next month', exact: true }).first().click();
await page.locator('.viz-map-applied').getByText('2024-02').waitFor().catch(() => {});
stats['month-step-load'] = Date.now() - t;
await page.close();
await browser.close();
console.log(JSON.stringify(stats, null, 1));
