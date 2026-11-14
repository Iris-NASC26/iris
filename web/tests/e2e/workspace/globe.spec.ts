import { expect, test } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage';

const gpuObjects = (page: import('@playwright/test').Page) => page.getByLabel('GPU objects');

test.describe('Living Globe renderer (U03)', () => {
  test.beforeEach(async ({ page }) => { page.on('pageerror', error => { throw error; }); });

  test('renders an attributed local basemap with no scientific layer and no external request', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await new WorkspacePage(page).open('/workspace/globe');
    await expect(page.locator('.globe-canvas canvas')).toBeVisible();
    await expect(page.getByText(/NASA EOSDIS Global Imagery Browse Services \(GIBS\)/)).toBeVisible();
    await expect(page.getByRole('img', { name: /No scientific data layer is loaded/ })).toBeVisible();
    await expect(gpuObjects(page)).toContainText('1 textures');
    expect(requests.some(url => new URL(url).pathname === '/globe/basemap-2048x1024.jpg')).toBe(true);
    expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:5173')).toBe(true);
    await new WorkspacePage(page).expectUnavailable();
  });

  test('maps a click to the 1° cell under the camera and labels the synthetic cells as test-only', async ({ page }) => {
    await new WorkspacePage(page).open('/workspace/globe');
    const canvas = page.locator('.globe-canvas canvas');
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1500);
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2 - 5, box.y + box.height / 2 - 5);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.mouse.down(); await page.mouse.up();
    const text = await page.getByText(/^Cell \d+ ·/).textContent();
    const [, lat, lon] = text!.match(/·\s(-?[\d.]+)°, (-?[\d.]+)°/)!.map(Number);
    expect(lat).toBeGreaterThan(13); expect(lat).toBeLessThan(17);
    expect(lon).toBeGreaterThan(8); expect(lon).toBeLessThan(12);
    await expect(page.getByRole('note')).toHaveCount(0);
    await page.getByRole('checkbox', { name: /64,800 test-only cells/ }).check();
    await expect(page.getByRole('note')).toHaveText('Test-only synthetic pattern: not Earth observations');
    await expect(gpuObjects(page)).toContainText('145,440 triangles');
  });

  test('releases GPU objects when cells are toggled and when the page is left and revisited', async ({ page }) => {
    const workspace = new WorkspacePage(page);
    await workspace.open('/workspace/globe');
    await expect(gpuObjects(page)).toContainText('GPU objects: 2 geometries, 1 textures');
    const baseline = await gpuObjects(page).textContent();
    const cells = page.getByRole('checkbox', { name: /64,800 test-only cells/ });
    for (let round = 0; round < 3; round++) {
      await cells.check();
      await expect(gpuObjects(page)).toContainText('3 geometries');
      await cells.uncheck();
      await expect(gpuObjects(page)).toContainText('2 geometries');
    }
    for (let round = 0; round < 3; round++) {
      await page.getByRole('link', { name: 'Data selection' }).click();
      await expect(page).toHaveURL(/data-selection/);
      await page.getByRole('link', { name: 'Living Globe' }).click();
      await expect(gpuObjects(page)).toContainText('GPU objects: 2 geometries, 1 textures');
    }
    expect((await gpuObjects(page).textContent())!.replace(/ · .*/, '')).toBe(baseline!.replace(/ · .*/, ''));
  });

  test('runs the ten-second spin benchmark and reports a device-specific reading', async ({ page }) => {
    test.setTimeout(45000);
    await new WorkspacePage(page).open('/workspace/globe');
    await expect(gpuObjects(page)).toContainText('geometries');
    await page.getByRole('button', { name: /Run 10-second spin benchmark/ }).click();
    const result = page.getByLabel('Benchmark result');
    await expect(result).toContainText(/Median [\d.]+ fps/, { timeout: 30000 });
    await expect(result).toContainText('applies only to this device');
    await expect(page.getByRole('note')).toBeVisible();
    console.log(`BENCHMARK: ${await result.textContent()}`);
  });

  test('keeps auto-rotate off under reduced motion and offers keyboard camera controls', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const workspace = new WorkspacePage(page);
    await workspace.open('/workspace/globe');
    await page.getByRole('checkbox', { name: 'Reduce motion' }).check();
    await expect(page.getByRole('checkbox', { name: /Auto-rotate/ })).toBeDisabled();
    for (const name of ['Rotate west', 'Rotate east', 'Tilt north', 'Tilt south', 'Zoom in', 'Zoom out', 'Reset view']) {
      await page.getByRole('button', { name }).click();
    }
    await expect(page.locator('.globe-canvas canvas')).toBeVisible();
  });

  test('shows an accessible fallback without WebGL 2 and stays within a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        return kind === 'webgl2' ? null : (original as (...args: unknown[]) => unknown).call(this, kind, ...rest);
      } as typeof original;
    });
    const workspace = new WorkspacePage(page);
    await workspace.open('/workspace/globe');
    await expect(page.locator('.globe-fallback')).toContainText('WebGL 2 is not available');
    await expect(page.getByRole('checkbox', { name: /test-only cells/ })).toBeDisabled();
    await workspace.expectNoOverflow();
  });
});
