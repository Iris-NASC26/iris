import { test, expect } from '@playwright/test';
import { VisualizationPage } from './VisualizationPage';
import { field } from './fixtures';
import { SPATIAL_VARIABLES } from '../../../src/features/visualization/spatialVariables';

// TEST-ONLY numeric transport fixtures; no production data is synthesized.
test('all spatial variables load genuine-shaped grids without a point extraction UI', async ({ page }) => {
    const requests: string[] = [];
    await page.route('**/api/v1/visualization/field?*', route => {
        const params = new URL(route.request().url()).searchParams;
        const variable = SPATIAL_VARIABLES.find(item => item.id === params.get('variable'))!;
        requests.push(variable.id);
        return route.fulfill({ json: { ...field, variable_id: variable.id, field: variable.field,
            units: variable.units, source_units: variable.source_units,
            time_standard: variable.family === 'syn1deg' ? 'LST' : 'UTC' } });
    });
    const ui = new VisualizationPage(page);
    await ui.open('/workspace/globe');
    await expect(page.getByLabel('Find a dataset')).toHaveCount(0);
    await expect(page.getByLabel('Spatial variable').locator('option')).toHaveCount(11);
    await page.getByRole('button', { name: '2D map', exact: true }).click();
    for (const variable of SPATIAL_VARIABLES) {
        const count = requests.length;
        await page.getByLabel('Spatial variable').selectOption(variable.id);
        expect(requests).toHaveLength(count); // selection alone does not fetch
        await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
        await expect(page.locator('.viz-map-applied')).toContainText(`Loaded: ${variable.id} / 2024-01`);
        await expect(page.locator('.viz-flat-map rect:not(.viz-extent-outline)')).toHaveCount(3);
        await expect(page.locator('.viz-field-source')).toContainText(variable.units);
        if (variable.id === 'SNODP') await expect(page.getByLabel('Colour ramp')).toHaveValue('snow');
    }
    expect(requests).toHaveLength(11);
});

test('a new precipitation layer supports the entire globe and Europe overview', async ({ page }) => {
    const extents: string[] = [];
    await page.route('**/api/v1/visualization/overview?*', route => {
        const params = new URL(route.request().url()).searchParams;
        extents.push(params.get('lat_min')!);
        return route.fulfill({ json: { ...field, schema_version: 'visualization.overview.v1',
            variable_id: 'PRECTOTCORR', field: 'PRECTOTCORR', units: 'mm/day', source_units: 'mm/day',
            extent: Object.fromEntries(['lat_min', 'lat_max', 'lon_min', 'lon_max'].map(key => [key, Number(params.get(key))])),
            resolution: { source_lat_step: 0.5, source_lon_step: 0.625, aggregation: 'none',
                factor_lat: 1, factor_lon: 1, output_cells: 4 } } });
    });
    const ui = new VisualizationPage(page);
    await ui.open('/workspace/globe');
    await page.getByRole('button', { name: '2D map', exact: true }).click();
    await page.getByLabel('Spatial variable').selectOption('PRECTOTCORR');
    for (const extent of ['global', 'europe']) {
        await page.getByLabel('Spatial extent').selectOption(extent);
        await page.getByRole('button', { name: 'Load spatial field', exact: true }).click();
        await expect(page.locator('.viz-field-source')).toContainText('output cells contain values');
        await expect(page.locator('.viz-flat-map rect:not(.viz-extent-outline)')).toHaveCount(3);
    }
    expect(extents).toEqual(['-90', '34']);
});

test('legacy saved globe layouts cannot bring a globe back into the studio', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('iris-onboarding-complete', 'true');
        localStorage.setItem('iris.studio.layout.v1', JSON.stringify({ version: 1, preset: 'earth-time',
            layout: { grid: { root: {} }, panels: { map: { id: 'map', contentComponent: 'map' } } }, hidden: [] }));
    });
    await page.goto('/workspace/visualize');
    await expect(page.getByRole('tab', { name: 'Time series', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Living Earth' })).toHaveCount(0);
    await expect(page.locator('.viz-map-workspace, .viz-three-mount')).toHaveCount(0);
    await expect(page.getByLabel('Find a dataset')).toBeVisible();
});
