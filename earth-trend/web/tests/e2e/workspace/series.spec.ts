import { expect, test } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage';

const live = process.env.EARTH_TREND_LIVE === '1';

test.describe('Real NASA POWER series in Data preview', () => {
  test.beforeEach(async ({ page }) => { page.on('pageerror', error => { throw error; }); });

  test('live: V01 and V12 load real months through Next and FastAPI, and chart, readout and table agree', async ({ page }) => {
    test.skip(!live, 'Set EARTH_TREND_LIVE=1 to contact NASA POWER; ordinary checks use no external APIs.');
    test.setTimeout(180_000);
    const workspace = new WorkspacePage(page);
    for (const [variable, first, units] of [['V01', '1981-01', '°C'], ['V12', '2001-01', 'W/m²']] as const) {
      await workspace.open(`/workspace/data-preview?variable=${variable}`);
      const chart = page.getByRole('img', { name: /monthly/ });
      await expect(chart).toBeVisible({ timeout: 120_000 });
      await expect(page.getByText('Real NASA POWER data')).toBeVisible();
      const points = Number(await chart.getAttribute('data-points'));
      expect(points).toBeGreaterThan(250);
      await expect(page.getByLabel('Series summary')).toContainText(units);
      await page.getByText(/Show all \d+ monthly values/).click();
      const rows = page.getByRole('table', { name: /Monthly observations/ }).locator('tbody tr');
      await expect(rows.first().getByRole('rowheader')).toHaveText(first);
      expect(await rows.count()).toBe(points + Number(await chart.getAttribute('data-gaps')));
      const slider = page.getByRole('slider', { name: 'Inspect month' });
      await slider.fill('0');
      const firstValue = (await rows.first().getByRole('cell').first().textContent())!;
      await expect(page.locator('.series-readout')).toHaveText(`${first} · ${firstValue} ${units}`);
      await page.getByRole('combobox', { name: 'Example place' }).selectOption({ label: 'Manaus, Brazil (rain forest)' });
      await expect(page.getByText(/native cell centred at -3/)).toBeVisible({ timeout: 120_000 });
    }
  });

  test('a mocked response drives the same journey without any external request', async ({ page }) => {
    const months = Array.from({ length: 24 }, (_, i) => `${2000 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
    const value = months.map((_, i) => (i === 7 ? null : 20 + Math.sin(i / 3)));
    const body = {
      schema_version: '1.0',
      series: {
        schema_version: '1.0', series_id: 'retrieved:V01:7:80', variable_id: 'V01', binding_id: 'unadmitted-power-T2M', branch_id: 'raw_monthly',
        frequency: 'monthly', time: months, value, coverage: value.map(v => (v === null ? null : 1)), valid: value.map(v => v !== null),
        reason: value.map(v => (v === null ? 'missing_observation' : null)), units: '°C',
        transform: { transform_id: 'identity-power', version: '1', kind: 'identity', input_units: 'C', output_units: '°C', scale: 1, offset: 0, order: ['decode_fill'] },
        grid_id: 'power-native-0.5x0.625', provenance_id: 'retrieval:test',
      },
      location: { requested_lat: 6.93, requested_lon: 79.85, cell_lat: 7, cell_lon: 80, cell_lat_step: 0.5, cell_lon_step: 0.625, selection: 'nearest_native_cell' },
      source: {
        variable_id: 'V01', store_title: 'Mocked test store', store_version: 'TEST', field: 'T2M', source_units: 'C', units: '°C', time_standard: 'UTC',
        data_kind: 'model', first_month: months[0], last_finite_month: months[23], declared_end: '2029-12-31T00:00:00', missing_months: 1,
        retrieved_at: '2026-11-14T10:00:00Z', served_from_cache: true, stale_cache: false, artifact_sha256: { 'T2M/0.1.1': 'a'.repeat(64) },
        acknowledgement: 'Test acknowledgement', caveats: ['Value of the nearest native grid cell, not an area-weighted regional mean.'], scientifically_validated: false,
      },
    };
    const requested: string[] = [];
    await page.route('**/api/v1/series/V01?**', route => { requested.push(new URL(route.request().url()).search); return route.fulfill({ json: body }); });
    await new WorkspacePage(page).open('/workspace/data-preview?variable=V01');
    const chart = page.getByRole('img', { name: /monthly/ });
    await expect(chart).toHaveAttribute('data-points', '23');
    await expect(chart).toHaveAttribute('data-gaps', '1');
    await expect(page.locator('polyline')).toHaveCount(2);
    await page.getByRole('slider', { name: 'Inspect month' }).fill('7');
    await expect(page.locator('.series-readout')).toHaveText('2000-08 · Missing (missing observation)');
    expect(new Set(requested)).toEqual(new Set(['?lat=6.93&lon=79.85']));
    const before = requested.length;
    await page.getByRole('textbox', { name: 'Latitude' }).fill('120');
    await page.getByRole('button', { name: 'Load series' }).click();
    await expect(page.locator('.si-error')).toContainText('Enter a latitude');
    expect(requested).toHaveLength(before);
  });

  test('an unconnected variable still says no observations are loaded', async ({ page }) => {
    await new WorkspacePage(page).open('/workspace/data-preview?variable=V05');
    await expect(page.getByRole('heading', { name: 'No observations loaded' })).toBeVisible();
    await expect(page.getByRole('img', { name: /monthly/ })).toHaveCount(0);
  });

  test('the series proxy rejects bad input without contacting the backend', async ({ request }) => {
    for (const path of ['/api/v1/series/V01?lat=95&lon=1', '/api/v1/series/V01?lat=abc&lon=1', '/api/v1/series/V01?lat=1']) {
      const response = await request.get(path);
      expect(response.status()).toBe(422);
      expect((await response.json()).code).toBe('INVALID_PARAMETERS');
    }
    expect((await request.get('/api/v1/series/X1?lat=1&lon=1')).status()).toBe(404);
  });
});
