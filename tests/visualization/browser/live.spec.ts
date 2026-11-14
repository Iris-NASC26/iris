import {test,expect} from '@playwright/test';
import {VisualizationPage} from './VisualizationPage';

test('live NASA discovery, point observations and native grids reach the visualization UI',async({page})=>{
 test.skip(process.env.IRIS_VISUALIZATION_LIVE!=='1','Opt in explicitly; ordinary browser checks use no external services.');
 test.setTimeout(180000);
 const ui=new VisualizationPage(page);await ui.open();
 await page.getByLabel('Find a dataset').fill('Air temperature in Colombo from 2020 to 2021');
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.getByLabel('Datasets').getByRole('checkbox',{name:/^Temperature at 2 Meters NASA POWER/}).check({timeout:60000});
 await page.getByLabel('Observation start').fill('2020-01-01');await page.getByLabel('Observation end').fill('2021-12-31');
 const extraction=page.waitForResponse('**/api/v1/timeseries/extract',{timeout:100000});
 await page.getByRole('button',{name:'Load selected datasets',exact:true}).click();
 const response=await extraction;expect(response.ok()).toBe(true);
 const result=await response.json();expect(result.upstream_live_fetched).toBe(true);expect(result.chart_series.length).toBe(24);
 await page.locator('.viz-chart-canvas canvas').waitFor();
 await page.getByRole('tab',{name:'Time series',exact:true}).click();
 await expect(page.getByRole('img',{name:/Time series for Temperature at 2 Meters/})).toBeVisible();
 await page.screenshot({path:'artifacts/visualization/live-series.png',fullPage:true});
 await page.getByRole('button',{name:'Living globe',exact:true}).click();
 await expect(page.locator('.viz-three-mount canvas')).toBeVisible();
 await page.getByLabel('South latitude').fill('6');await page.getByLabel('North latitude').fill('7');
 await page.getByLabel('West longitude').fill('79');await page.getByLabel('East longitude').fill('80');
 for(const variable of ['V01','V12']){
  await page.getByLabel('Spatial variable').selectOption(variable);
  const pending=page.waitForResponse('**/api/v1/visualization/field?*',{timeout:100000});
  await page.getByRole('button',{name:'Load spatial field',exact:true}).click();
  const fieldResponse=await pending;expect(fieldResponse.ok()).toBe(true);const body=await fieldResponse.json();
  expect(body.variable_id).toBe(variable);expect(body.values.some((v:unknown)=>typeof v==='number')).toBe(true);
  expect(body.source.scientifically_validated).toBe(false);
  await expect(page.locator('.viz-field-source')).toContainText('native cells contain values');
 }
 await page.getByRole('button',{name:'Focus on spatial field',exact:true}).click();
 await page.screenshot({path:'artifacts/visualization/live-globe.png',fullPage:true});
});
