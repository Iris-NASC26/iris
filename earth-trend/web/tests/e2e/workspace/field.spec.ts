import { expect, test } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage';

const live = process.env.EARTH_TREND_LIVE === '1';

const FIELD_BODY = {
  schema_version: '1.0', variable_id: 'V01', month: '2024-01',
  box: { lat_min: 3.75, lat_max: 16.25, lon_min: 75.6875, lon_max: 86.3125, cell_lat_step: 0.5, cell_lon_step: 0.625, selection: 'native_cells_in_box' },
  cell_lats: [5.0, 5.5, 6.0, 6.5], cell_lons: [78.0, 78.625],
  values: [27.1, 27.4, null, 26.2, 25.9, 26.0, 24.8, 25.1],
  source: {
    variable_id: 'V01', store_title: 'Mocked test store', store_version: 'TEST', field: 'T2M', source_units: 'C', units: '°C',
    time_standard: 'UTC', data_kind: 'model', retrieved_at: '2026-11-14T10:00:00Z', served_from_cache: true, stale_cache: false,
    artifact_sha256: { 'T2M/0.1.1': 'a'.repeat(64) }, acknowledgement: 'Test acknowledgement',
    caveats: ['Raw monthly native-cell values in the box; not aggregated and not a trend.'], scientifically_validated: false,
  },
};

test.describe('Real NASA POWER field on the globe', () => {
  test.beforeEach(async ({ page }) => { page.on('pageerror', error => { throw error; }); });

  test('a mocked field paints native cells, reports gaps and feeds the picked readout', async ({ page }) => {
    const requested: string[] = [];
    await page.route('**/api/v1/field/V01?**', route => { requested.push(new URL(route.request().url()).search); return route.fulfill({ json: FIELD_BODY }); });
    const workspace = new WorkspacePage(page);
    await workspace.open('/workspace/globe');
    await page.getByRole('button', { name: 'Load field' }).click();
    const status = page.getByLabel('Field status');
    await expect(status).toContainText('7 of 8 cells have values');
    await expect(status).toContainText('empty cells are missing, not zero');
    await expect(status).toContainText('Not a trend scale');
    expect(requested).toEqual(['?month=2024-01&lat_min=4&lat_max=16&lon_min=76&lon_max=86']);
    await page.getByRole('button', { name: 'Clear field' }).click();
    await expect(status).toHaveText('No field loaded.');
  });

  test('the field proxy rejects bad input without contacting the backend', async ({ request }) => {
    const good = 'month=2024-01&lat_min=4&lat_max=16&lon_min=76&lon_max=86';
    for (const query of ['month=2024-1&lat_min=4&lat_max=16&lon_min=76&lon_max=86',
      'month=2024-01&lat_min=16&lat_max=4&lon_min=76&lon_max=86',
      'month=2024-01&lat_min=4&lat_max=16&lon_min=86&lon_max=86',
      'month=2024-01&lat_min=4&lat_max=96&lon_min=76&lon_max=86']) {
      const response = await request.get(`/api/v1/field/V01?${query}`);
      expect(response.status()).toBe(422);
      expect((await response.json()).code).toBe('INVALID_PARAMETERS');
    }
    expect((await request.get(`/api/v1/field/X1?${good}`)).status()).toBe(404);
  });

  test('live: a real V01 field paints real cells through Next and FastAPI', async ({ page }) => {
    test.skip(!live, 'Set EARTH_TREND_LIVE=1 to contact NASA POWER; ordinary checks use no external APIs.');
    test.setTimeout(180_000);
    await new WorkspacePage(page).open('/workspace/globe');
    await page.getByRole('button', { name: 'Load field' }).click();
    const status = page.getByLabel('Field status');
    await expect(status).toContainText('V01 2024-01', { timeout: 120_000 });
    await expect(status).toContainText(/of \d+ cells have values/);
    await expect(status).toContainText('Not a trend scale');
  });
});
