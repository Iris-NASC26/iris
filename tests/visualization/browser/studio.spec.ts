import { test,expect } from '@playwright/test';
import { VisualizationPage } from './VisualizationPage';
import { product,fixture } from './fixtures';

test.beforeEach(async({page})=>{
 await page.route('**/api/v1/si/discover',route=>route.fulfill({json:{products:[product],query:'test',queried_sources:['NASA POWER']}}));
 await page.route('**/api/v1/timeseries/jobs/*/preview?*',route=>route.fulfill({json:fixture()}));
 await page.route('**/api/v1/timeseries/extract',route=>route.fulfill({json:fixture()}));
});

test('presets rearrange without losing loaded series and panels close and reopen',async({page})=>{
 const ui=new VisualizationPage(page);await ui.open();
 await ui.discover();await page.getByLabel('Datasets').getByRole('checkbox',{name:/Test air temperature/}).check();
 await ui.load();
 await expect(page.getByRole('img',{name:/Time series for Test air temperature/})).toBeVisible();
 await page.locator('.viz-studio-toolbar select').first().selectOption('seasonal');
 await expect(page.getByRole('tab',{name:'Seasonal cycles'}).first()).toBeVisible();
 await expect(page.getByRole('img',{name:/Monthly heatmap for Test air temperature/})).toBeVisible(); // loaded data survived the layout switch
 await expect(page.locator('.viz-studio-toolbar select').first().getByRole('option', { name: 'Earth + Time' })).toHaveCount(0);
 await expect(page.getByRole('tab', { name: 'Living Earth', exact: true })).toHaveCount(0);
 await expect(page.locator('.viz-three-mount')).toHaveCount(0);
 await page.locator('.viz-studio-toolbar select').first().selectOption('explore');
 await expect(page.getByRole('img',{name:/Time series for Test air temperature/})).toBeVisible();
 // close a tab and reopen it via the toolbar control
 await page.getByRole('tab',{name:'Seasonal cycles',exact:true}).click();
 await page.getByRole('button',{name:'Close Seasonal cycles',exact:true}).click();
 await page.locator('.viz-studio-toolbar select').nth(1).selectOption({label:'Seasonal cycles'});
 await page.getByRole('button',{name:'Reopen',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Seasonal cycles'})).toBeVisible();
});

test('corrupt persisted layout recovers to a preset and reset clears preferences',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('iris-onboarding-complete','true');localStorage.setItem('iris.studio.layout.v2','{broken');});
 const ui=new VisualizationPage(page);await page.goto('/workspace/visualize');
 await expect(page.getByText(/unreadable|restored/i)).toBeVisible();
 await expect(page.getByRole('tab',{name:'Time series'})).toBeVisible();
 await page.getByRole('button',{name:'Reset workspace',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Time series'})).toBeVisible();
});

test('narrow screens use the deliberate tabbed layout, not the dock',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const ui=new VisualizationPage(page);await ui.open();
 await expect(page.locator('.viz-studio-mobile')).toBeVisible();
 await expect(page.locator('.dv-dockview')).toHaveCount(0);
 await expect(page.locator('.viz-studio-mobile select').getByRole('option', { name: 'Living Earth' })).toHaveCount(0);
 await page.locator('.viz-studio-mobile select').selectOption('table');
 await expect(page.getByLabel('Map-centred investigation workspace')).toHaveCount(0);
 await ui.noOverflow();
});

test('focus mode hides the data drawer reversibly within the route',async({page})=>{
 const ui=new VisualizationPage(page);await ui.open();
 await expect(page.getByLabel('Visualization controls')).toBeVisible();
 await page.getByRole('button',{name:'Focus',exact:true}).click();
 await expect(page.getByLabel('Visualization controls')).toHaveCount(0);
 await page.getByRole('button',{name:'Exit focus',exact:true}).click();
 await expect(page.getByLabel('Visualization controls')).toBeVisible();
});
