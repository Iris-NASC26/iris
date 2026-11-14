import { test,expect } from '@playwright/test';
import { VisualizationPage } from './VisualizationPage';
import { product,fixture,field } from './fixtures';

test.beforeEach(async({page})=>{
 await page.route('**/api/v1/si/discover',route=>route.fulfill({json:{products:[product],query:'test',queried_sources:['NASA POWER']}}));
 await page.route('**/api/v1/timeseries/jobs/*/preview?*',route=>route.fulfill({json:fixture()}));
});

test('does not fetch data on mount and discovers, selects and retrieves on explicit actions',async({page})=>{
 const calls:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))calls.push(new URL(r.url()).pathname);});
 const ui=new VisualizationPage(page);await ui.open();expect(calls).toEqual([]);
 await expect(page.getByText('No demonstration values are loaded.').first()).toBeVisible();
 await ui.discover();await page.getByLabel('Datasets').getByRole('checkbox',{name:/Test air temperature/}).check();
 let requested:Record<string,unknown>|undefined;
 await page.route('**/api/v1/timeseries/extract',route=>{requested=route.request().postDataJSON();return route.fulfill({json:fixture()});});
 await ui.load();expect(requested?.variable_id).toBe('T2M');expect(requested?.spatial_Submode).toBe('point');
 await page.getByRole('tab',{name:'Time series',exact:true}).click();
 await expect(page.getByRole('img',{name:/Time series for Test air temperature/})).toBeVisible();
 for(const name of ['Area','Bars']){
  await page.getByRole('button',{name,exact:true}).click();await expect(page.getByRole('img',{name:/Exact values are available in CSV and JSON exports/}).first()).toBeVisible();
 }
 await page.getByRole('tab',{name:'Seasonal cycles',exact:true}).click();await expect(page.getByRole('img',{name:/Monthly heatmap/})).toBeVisible();
 await page.getByRole('button',{name:'Seasonal profile',exact:true}).click();await expect(page.getByRole('img',{name:/Seasonal profile for/})).toBeVisible();
 await page.getByRole('tab',{name:'Source & selection',exact:true}).click();
 await expect(page.getByText('4 (2 missing/excluded)',{exact:true})).toBeVisible();
 await page.getByRole('checkbox',{name:'Include provider-flagged values'}).check();
 await expect(page.getByText('5 (1 missing/excluded)',{exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('toolbar',{name:'Studio controls'}).getByRole('button',{name:'Export JSON',exact:true}).click();expect((await download).suggestedFilename()).toBe('iris-T2M.json');
 await ui.noOverflow();
});

test('direct job links restore the real source and scientific analysis remains opt-in',async({page})=>{
 let analysis=0;page.on('request',r=>{if(r.url().includes('/analyze/'))analysis++;});
 await new VisualizationPage(page).open('/workspace/visualize?jobId=job-test');
 await expect(page.getByRole('button',{name:'Export CSV',exact:true})).toBeVisible();expect(analysis).toBe(0);
 await page.reload();await expect(page.getByRole('button',{name:'Export CSV',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Data Analysis',exact:true}).click();
 await expect(page).toHaveURL(/\/workspace\/data-analysis/);
 await expect(page.getByRole('heading',{name:'Scientific Case File',exact:true})).toBeVisible();expect(analysis).toBe(0);
});

test('keeps two locations and pairs comparisons without asking SI to generate observations',async({page})=>{
 const ui=new VisualizationPage(page);await ui.open('/workspace/visualize?jobId=job-test');
 await ui.discover();await page.getByLabel('Datasets').getByRole('checkbox',{name:/Test air temperature/}).check();
 await page.getByRole('spinbutton',{name:'Latitude',exact:true}).fill('-1.29');
 await page.getByRole('spinbutton',{name:'Longitude',exact:true}).fill('36.82');
 await page.route('**/api/v1/timeseries/extract',route=>route.fulfill({json:fixture('job-second',-1.29,36.82)}));
 await ui.load();await page.getByRole('tab',{name:'Time series',exact:true}).click();await expect(page.getByLabel('Primary series').getByRole('option')).toHaveCount(2);
 await page.getByRole('tab',{name:'Relationship',exact:true}).click();await expect(page.getByRole('img',{name:/Aligned pairs/})).toBeVisible();
 await expect(page.getByRole('tab',{name:'Living Earth',exact:true})).toHaveCount(0);
 await expect(page.locator('.viz-three-mount')).toHaveCount(0);
});

test('real WebGL globe accepts only a loaded native field and clears stale selection',async({page})=>{
 const ui=new VisualizationPage(page);await ui.open('/workspace/globe');
 await expect(page.locator('.viz-three-mount canvas')).toBeVisible();
 await expect(page.getByText('3D globe ready',{exact:true})).toBeVisible();
 let requests=0;await page.route('**/api/v1/visualization/field?*',route=>{requests++;return route.fulfill({json:field});});
 expect(requests).toBe(0);await page.getByRole('button',{name:'Load spatial field',exact:true}).click();
 await expect(page.getByText('3 of 4 native cells contain values',{exact:false})).toBeVisible();
 await expect(page.getByText(/Raw monthly model data/)).toBeVisible();
 await page.getByRole('button',{name:'2D map',exact:true}).click();await expect(page.locator('.viz-flat-map rect:not(.viz-extent-outline)')).toHaveCount(3);
 await page.getByLabel('Spatial month').fill('2024-02');await expect(page.locator('.viz-flat-map rect:not(.viz-extent-outline)')).toHaveCount(0);expect(requests).toBe(1);
 await page.getByRole('button',{name:'3D globe',exact:true}).click();await expect(page.locator('.viz-three-mount canvas')).toBeVisible();
});

test('provider failure shows an actionable error and never a fabricated field',async({page})=>{
 const ui=new VisualizationPage(page);await ui.open('/workspace/globe');
 await page.route('**/api/v1/visualization/field?*',route=>route.fulfill({status:503,json:{detail:'NASA source unavailable'}}));
 await page.getByRole('button',{name:'Load spatial field',exact:true}).click();await expect(page.getByRole('region',{name:'Visualization results'}).getByRole('alert')).toContainText('NASA source unavailable');
 await expect(page.locator('.viz-field-legend')).toHaveCount(0);
});

test('WebGL fallback, mobile sizing and keyboard controls remain usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind:string,...args:unknown[]){return kind==='webgl2'?null:(original as (...p:unknown[])=>unknown).call(this,kind,...args);} as typeof original;});
 const ui=new VisualizationPage(page);await ui.open('/workspace/globe');await expect(page.getByRole('img',{name:'Equirectangular world map with retrieved data only'})).toBeVisible();
 await ui.noOverflow();await page.getByLabel('South latitude').fill('30');await page.getByLabel('North latitude').fill('20');
 await page.getByRole('button',{name:'Load spatial field',exact:true}).click();await expect(page.getByRole('region',{name:'Visualization results'}).getByRole('alert')).toContainText('ordered region box');
});

test('late responses cannot replace a newly selected field month',async({page})=>{
 const ui=new VisualizationPage(page);await ui.open('/workspace/globe');
 let release!:()=>void;const pending=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/v1/visualization/field?*',async route=>{await pending;await route.fulfill({json:field}).catch(()=>{});});
 const requested=page.waitForRequest('**/api/v1/visualization/field?*');
 await page.getByRole('button',{name:'Load spatial field',exact:true}).click();await requested;
 await page.getByLabel('Spatial month').fill('2024-02');release();
 await expect(page.getByText('Native grid cells. No spatial smoothing.')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Load spatial field',exact:true})).toBeEnabled();
});
