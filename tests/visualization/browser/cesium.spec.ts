import { test, expect, type Page } from '@playwright/test';
import { VisualizationPage } from './VisualizationPage';
import { field } from './fixtures';

// Synthetic TEST-ONLY transport fixtures; tile.jpg is a generated 256x256
// stub, never production imagery. No test here may reach a live service.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const TILE_JPEG = readFileSync(join(__dirname, 'tile.jpg'));

const overview = {
    ...field, schema_version: 'visualization.overview.v1',
    cell_lats: [-45, 45], cell_lons: [-90, 90], lat_step: 90, lon_step: 180, values: [10, 20, 30, null],
    extent: { lat_min: 34, lat_max: 72, lon_min: -25, lon_max: 45 },
    resolution: { source_lat_step: 0.5, source_lon_step: 0.625, aggregation: 'area_weighted_mean', factor_lat: 180, factor_lon: 288, output_cells: 4 },
    coverage: [1, 1, 1, 0],
};

async function globeReady(page: Page, t: typeof test) {
    const ok = await page.getByText('3D globe ready', { exact: true }).waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
    if (!ok) t.skip(true, 'WebGL is unavailable in this test environment.');
}

test('tiled basemap zooms to higher GIBS matrix levels without any ion or tokened service', async ({ page }) => {
    const forbidden: string[] = [];
    const matrices = new Set<number>();
    page.on('request', r => {
        const url = r.url();
        if (/cesium\.com|ion\.cesium|assets\.agi\.com|api\.mapbox|geocoder/i.test(url)) forbidden.push(url);
        const m = /wmts\/epsg3857\/best\/[^/]+\/default\/[^/]+\/(\d+)\//.exec(url);
        if (m) matrices.add(Number(m[1]));
    });
    await page.route('**/gibs.earthdata.nasa.gov/**', route => route.fulfill({ contentType: 'image/jpeg', headers: { 'Access-Control-Allow-Origin': '*' }, body: TILE_JPEG }));
    const ui = new VisualizationPage(page); await ui.open('/workspace/globe');
    await globeReady(page, test);
    await expect(page.locator('.viz-three-mount canvas')).toBeVisible();
    await expect.poll(() => matrices.size, { timeout: 20000 }).toBeGreaterThan(0);
    const base = Math.max(...matrices);
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect.poll(() => Math.max(...matrices), { timeout: 20000 }).toBeGreaterThan(base);
    await expect(page.locator('.viz-basemap-credit')).toContainText(/Blue Marble Shaded Relief/);
    await expect(page.locator('.viz-basemap-credit')).toContainText(/500 m\/px/);
    // Cesium's own credit overlay must also carry the provider attribution.
    await expect(page.locator('.cesium-credit-wrapper').first()).toContainText(/NASA EOSDIS GIBS/);
    expect(forbidden).toEqual([]);
});

test('exhausted tile failures degrade to the labelled local NASA image and recover on retry', async ({ page }) => {
    await page.route('**/gibs.earthdata.nasa.gov/**', route => route.abort('failed'));
    const ui = new VisualizationPage(page); await ui.open('/workspace/globe');
    await globeReady(page, test);
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(page.getByText(/local NASA Blue Marble image — degraded offline mode/)).toBeVisible({ timeout: 30000 });
    await page.unroute('**/gibs.earthdata.nasa.gov/**');
    await page.route('**/gibs.earthdata.nasa.gov/**', route => route.fulfill({ contentType: 'image/jpeg', headers: { 'Access-Control-Allow-Origin': '*' }, body: TILE_JPEG }));
    await page.getByRole('button', { name: 'Retry tiled imagery', exact: true }).click();
    await expect(page.getByText(/NASA EOSDIS GIBS WMTS/)).toBeVisible({ timeout: 30000 });
});

test('the Europe preset requests an aggregated overview and labels its true resolution', async ({ page }) => {
    await page.route('**/gibs.earthdata.nasa.gov/**', route => route.fulfill({ contentType: 'image/jpeg', headers: { 'Access-Control-Allow-Origin': '*' }, body: TILE_JPEG }));
    let requested = '';
    await page.route('**/api/v1/visualization/overview?*', route => { requested = route.request().url(); return route.fulfill({ json: overview }); });
    const ui = new VisualizationPage(page); await ui.open('/workspace/globe');
    await globeReady(page, test);
    await page.getByLabel('Spatial extent').selectOption('europe');
    await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
    await expect(page.locator('.viz-field-source')).toContainText('output cells contain values');
    await expect(page.locator('.viz-field-source')).toContainText('area-weighted mean');
    await expect(page.locator('.viz-field-source')).toContainText('34° to 72°');
    expect(requested).toContain('lat_min=34');
    expect(requested).toContain('lon_max=45');
    await expect(page.getByText(/coarser than the 0\.5° × 0\.6\d° source/)).toBeVisible();
});

test('repeated navigation disposes and recreates a single Cesium viewer', async ({ page }) => {
    await page.route('**/gibs.earthdata.nasa.gov/**', route => route.fulfill({ contentType: 'image/jpeg', headers: { 'Access-Control-Allow-Origin': '*' }, body: TILE_JPEG }));
    const ui = new VisualizationPage(page); await ui.open('/workspace/globe');
    await globeReady(page, test);
    for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: '2D map', exact: true }).click();
        await expect(page.getByRole('img', { name: 'Equirectangular world map with retrieved data only' })).toBeVisible();
        await page.getByRole('button', { name: '3D globe', exact: true }).click();
        await globeReady(page, test);
    }
    expect(await page.locator('.cesium-viewer').count()).toBe(1);
    expect(await page.locator('.viz-three-mount canvas').count()).toBe(1);
});
