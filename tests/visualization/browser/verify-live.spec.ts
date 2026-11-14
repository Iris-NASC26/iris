import { test, expect } from '@playwright/test';
import { VisualizationPage } from './VisualizationPage';

// Explicitly opt-in live verification (IRIS_VISUALIZATION_LIVE=1): real NASA
// GIBS tiles and real NASA POWER spatial data. Captures screenshot evidence
// and records measured loading/frame-rate/memory observations on this machine.
test('live globe: progressive GIBS imagery, real global field, Europe subset, cell pick', async ({ page }) => {
    test.skip(process.env.IRIS_VISUALIZATION_LIVE !== '1', 'Opt in explicitly; ordinary browser checks use no external services.');
    test.setTimeout(240000);
    const tileUrls: string[] = [];
    let tileBytes = 0;
    page.on('response', async r => {
        if (/wmts\/epsg3857/.test(r.url())) {
            tileUrls.push(r.url());
            tileBytes += Number((await r.allHeaders())['content-length'] ?? 0);
        }
    });
    const t0 = Date.now();
    const ui = new VisualizationPage(page); await ui.open('/workspace/globe');
    await expect(page.getByText('3D globe ready', { exact: true })).toBeVisible({ timeout: 60000 });
    const readyMs = Date.now() - t0;
    await page.waitForTimeout(4000);
    const matrices = new Set(tileUrls.map(u => Number(/\/(\d+)\/\d+\/\d+\.jpeg/.exec(u)?.[1])));

    const memory = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);
    const fps = await page.evaluate(() => new Promise<number>(resolve => {
        let frames = 0; const start = performance.now();
        const tick = () => { frames++; if (performance.now() - start < 3000) requestAnimationFrame(tick); else resolve(frames / ((performance.now() - start) / 1000)); };
        requestAnimationFrame(tick);
    }));
    console.log(`MEASURED ready=${readyMs}ms tiles=${tileUrls.length} (~${Math.round(tileBytes / 1024)}KB) levels=${[...matrices].sort().join(',')} fps=${fps.toFixed(1)} heap=${Math.round(memory / 1048576)}MB`);

    await page.screenshot({ path: 'artifacts/visualization/cesium-world-tiles.png', fullPage: false });

    // Genuine global temperature overview through the real backend.
    await page.getByLabel('Spatial extent').selectOption('global');
    const globalLoad = page.waitForResponse('**/api/v1/visualization/overview?*', { timeout: 120000 });
    const t1 = Date.now();
    await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
    const gres = await globalLoad;
    console.log(`MEASURED global overview load=${Date.now() - t1}ms status=${gres.status()}`);
    await expect(page.locator('.viz-field-source')).toContainText('area-weighted mean', { timeout: 120000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'artifacts/visualization/cesium-global-temperature.png', fullPage: false });

    // Europe subset at native source resolution.
    await page.getByLabel('Spatial extent').selectOption('europe');
    const euLoad = page.waitForResponse('**/api/v1/visualization/overview?*', { timeout: 120000 });
    const t2 = Date.now();
    await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
    const eres = await euLoad;
    const body = await eres.json();
    console.log(`MEASURED europe overview load=${Date.now() - t2}ms cells=${body.values?.length} aggregation=${body.resolution?.aggregation}`);
    await page.locator('.viz-layer-controls').getByRole('button', { name: 'Frame selected extent' }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'artifacts/visualization/cesium-europe-temperature.png', fullPage: false });

    // Cell inspection on the accessible 2D map — coordinates + numeric value.
    await page.getByRole('button', { name: '2D map', exact: true }).click();
    const map = page.locator('.viz-flat-map');
    const box = await map.boundingBox();
    // Aim for ~45°N, ~10°E — inside the Europe extent's loaded cells.
    await map.click({ position: { x: box!.width * (190 / 360), y: box!.height * (45 / 180) } });
    await expect(page.locator('.viz-readout')).toContainText(/Picked/);
    await expect(page.locator('.viz-readout')).toContainText(/°C/);
    await page.screenshot({ path: 'artifacts/visualization/map-cell-inspection.png', fullPage: true });

    // Mobile layout evidence.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'artifacts/visualization/cesium-mobile.png', fullPage: false });
});
