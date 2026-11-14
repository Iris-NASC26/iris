import { test, expect } from '@playwright/test';
import { VisualizationPage } from './VisualizationPage';
import { product, fixture, field } from './fixtures';

const monthEcho = (route: { request(): { url(): string } }) => {
  const month = new URL(route.request().url()).searchParams.get('month') ?? '2024-01';
  return { ...field, month };
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/si/discover', route => route.fulfill({ json: { products: [product], query: 'test', queried_sources: ['NASA POWER'] } }));
  await page.route('**/api/v1/timeseries/jobs/*/preview?*', route => route.fulfill({ json: fixture() }));
  await page.route('**/api/v1/timeseries/extract', route => route.fulfill({ json: fixture() }));
  await page.route('**/api/v1/visualization/field?*', route => route.fulfill({ json: monthEcho(route) }));
});

test('map workspace exposes top bar, layer tree, inspector and timeline', async ({ page }) => {
  const ui = new VisualizationPage(page);
  await ui.open('/workspace/globe');
  await expect(page.locator('.viz-map-topbar')).toBeVisible();
  await expect(page.locator('.viz-map-layers')).toBeVisible();
  await expect(page.getByText('No field loaded for this selection')).toBeVisible();
  // Living Globe is for gridded fields; point extraction stays in the studio.
  await expect(page.getByLabel('Find a dataset')).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Observation points', exact: true })).toHaveCount(0);
  for (const name of ['Scientific field', 'Requested extent outline', 'NASA GIBS basemap'])
    await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
  await expect(page.getByText('3 of 4 native cells contain values', { exact: false })).toBeVisible();
  await expect(page.locator('.viz-map-applied')).toContainText('Loaded: V01 / 2024-01');
  // Inspector opens on cell pick with real numbers and provenance.
  await page.getByRole('button', { name: '2D map', exact: true }).click();
  const map = page.locator('.viz-flat-map');
  const box = await map.boundingBox();
  // Field fixture: 2x2 cells at lat 5..6, lon 80..81.25 -> pick a cell centre.
  await map.click({ position: { x: box!.width * (260.3 / 360), y: box!.height * (84.75 / 180) } });
  await expect(page.locator('.viz-map-inspector')).toBeVisible();
  await expect(page.locator('.viz-map-inspector')).toContainText('Cell footprint');
  await expect(page.locator('.viz-map-inspector')).toContainText('C');
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect(page.locator('.viz-map-inspector')).toContainText('Click a cell on the map');
});

test('layer visibility, keyboard ordering and styling controls are real', async ({ page }) => {
  const ui = new VisualizationPage(page);
  await ui.open('/workspace/globe');
  await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
  await expect(page.getByText('3 of 4 native cells contain values', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '2D map', exact: true }).click();
  await expect(page.locator('.viz-flat-map rect.viz-extent-outline')).toBeVisible();
  // Visibility toggle hides the raster without another request.
  await expect(page.locator('.viz-flat-map rect')).toHaveCount(4); // 3 cells + extent outline
  await page.getByRole('checkbox', { name: 'Scientific field', exact: true }).uncheck();
  await expect(page.locator('.viz-flat-map rect')).toHaveCount(1); // only extent outline remains
  await page.getByRole('checkbox', { name: 'Scientific field', exact: true }).check();
  await expect(page.locator('.viz-flat-map rect')).toHaveCount(4);
  // Keyboard reorder: the field sits one step above the basemap — a single
  // "down" moves it to the bottom of the stack.
  await page.getByRole('button', { name: 'Move Scientific field down', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Move Scientific field down', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move Scientific field up', exact: true })).toBeEnabled();
  // Styling: ramp + labelled range scope + reset.
  await page.getByLabel('Colour ramp').selectOption('viridis');
  await page.getByLabel('Colour range').selectOption('auto');
  await expect(page.getByText(/Automatic range: fitted to the currently loaded field/)).toBeVisible();
  await expect(page.getByText(/Displayed range: 0 to 27 C/)).toBeVisible();
  await page.getByRole('button', { name: 'Restore default styling', exact: true }).click();
  await expect(page.getByText(/Fixed physical scale \(-55 to 45 source units\)/)).toBeVisible();
});

test('2D drag-draw sets the requested extent without loading data', async ({ page }) => {
  const ui = new VisualizationPage(page);
  await ui.open('/workspace/globe');
  await page.getByRole('button', { name: '2D map', exact: true }).click();
  await page.getByRole('button', { name: 'Draw box on 2D map', exact: true }).click();
  const map = page.locator('.viz-flat-map');
  const box = await map.boundingBox();
  // Drag roughly Europe: lat 20..60, lon -20..40.
  const xy = (lat: number, lon: number) => ({ x: box!.width * ((lon + 180) / 360), y: box!.height * ((90 - lat) / 180) });
  const a = xy(60, -20), b = xy(20, 40);
  await map.hover({ position: a });
  await page.mouse.down();
  await map.hover({ position: b });
  await page.mouse.up();
  const south = Number(await page.getByLabel('South latitude').inputValue());
  const east = Number(await page.getByLabel('East longitude').inputValue());
  expect(Math.abs(south - 20)).toBeLessThan(1);
  expect(Math.abs(east - 40)).toBeLessThan(1);
  // Drawing only edits the pending selection — no fetch until explicit load.
  await expect(page.getByText('No field loaded for this selection')).toBeVisible();
});

test('spatial playback issues one request per month and never recycles values', async ({ page }) => {
  const ui = new VisualizationPage(page);
  await ui.open('/workspace/globe');
  const months: string[] = [];
  await page.route('**/api/v1/visualization/field?*', route => { months.push(new URL(route.request().url()).searchParams.get('month') ?? ''); return route.fulfill({ json: monthEcho(route) }); });
  await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
  await expect(page.locator('.viz-map-applied')).toContainText('Loaded: V01 / 2024-01');
  await page.getByRole('button', { name: 'Play spatial field', exact: true }).click();
  // Playback issues a real request per month — wait on the request log, not
  // the wall clock, so a fast mock can't race the applied label.
  await expect.poll(() => months.filter(m => m !== '2024-01').length, { timeout: 8000 }).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Pause spatial playback', exact: true }).click();
  expect(months).toContain('2024-02');
  expect(months).toContain('2024-03');
});

test('Living Globe has no point loader or observation-sync controls', async ({ page }) => {
  const ui = new VisualizationPage(page);
  await ui.open('/workspace/globe');
  await expect(page.getByLabel('Visualization controls')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Load selected datasets', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
  await expect(page.locator('.viz-map-applied')).toContainText('2024-01');
  await expect(page.getByRole('checkbox', { name: 'Sync spatial field to observation month' })).toHaveCount(0);
  await expect(page.locator('.viz-time-control')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open visualization studio' })).toBeVisible();
});
