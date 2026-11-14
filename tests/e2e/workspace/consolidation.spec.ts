import { expect, test } from '@playwright/test';
import { WorkspacePage } from '../../pages/WorkspacePage';

test('Navida public navigation reaches the integrated metadata and workspace', async ({ page }) => {
 const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto('/');
 await expect(page.getByRole('heading', {name: /Detect environmental trends/})).toBeVisible();
 await expect(page.getByText(/Design preview: static charts/)).toBeVisible();
 await page.getByRole('navigation', {name:'Product navigation'}).getByRole('link',{name:'Methodology'}).click();
 await expect(page.getByRole('heading',{name:'Current scientific availability'})).toBeVisible();
 await expect(page.getByRole('link',{name:'CC-BY-4.0',exact:true})).toBeVisible();
 await page.getByRole('navigation', {name:'Product navigation'}).getByRole('link',{name:'Our data'}).click();
 await expect(page.getByRole('region',{name:'Planned NASA sources'}).getByRole('article')).toHaveCount(13);
 await new WorkspacePage(page).open('/workspace/data-preview');
 await expect(page.getByRole('button',{name:'Load series',exact:true})).toBeVisible();
 await expect(page.getByRole('table')).toHaveCount(0);
 await page.reload(); await expect(page.getByRole('button',{name:'Load series',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/consolidated-workspace.png',fullPage:true});
});

test('catalog selection and explanation level persist without retrieving observations', async ({page}) => {
 const calls:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))calls.push(new URL(r.url()).pathname);});
 const workspace = new WorkspacePage(page);await workspace.open('/workspace/data-selection');
 await page.getByRole('textbox',{name:'Search variables'}).fill('NDVI');
 await page.getByRole('button',{name:/Vegetation greenness/}).click();
 await page.getByRole('combobox',{name:'Explanation level'}).selectOption('scientist');
 await expect(page.getByText('_1_km_monthly_NDVI',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Open data preview'}).click();
 await expect(page.getByRole('heading',{name:'No observations loaded'})).toBeVisible();
 await page.reload();await expect(page.getByRole('combobox',{name:'Explanation level'})).toHaveValue('scientist');
 await workspace.expectUnavailable();expect(calls.every(p=>p==='/api/v1/health')).toBe(true);
});

test('rule-based discovery confirms before suggesting and links to the catalog', async ({page})=>{
 const workspace=new WorkspacePage(page);await workspace.open('/workspace/intelligence');
 await page.getByRole('textbox',{name:'Describe a research topic'}).fill('Heatwave and rainfall in California since 2010');
 await page.getByRole('button',{name:'Send',exact:true}).click();
 const review=page.getByRole('region',{name:'Review search terms'});await expect(review).toBeVisible();
 await expect(page.getByRole('region',{name:'Suggested variables'})).toHaveCount(0);
 await review.getByRole('button',{name:'Confirm and search'}).click();
 await page.getByRole('link',{name:/Inspect V01/}).click();
 await expect(page).toHaveURL(/data-selection\?variable=V01$/);
 await expect(page.getByRole('heading',{name:'Air temperature near the ground'})).toBeVisible();
});

test('mobile dashboard navigation, theme and motion preferences work',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 const workspace=new WorkspacePage(page);await workspace.open('/workspace/data-selection');
 await page.getByRole('button',{name:'Open dashboard navigation'}).click();
 await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
 await page.getByRole('navigation',{name:'Dashboard navigation'}).getByRole('link',{name:'Data Preview',exact:true}).click();
 await expect(page.getByRole('button',{name:'Load series',exact:true})).toBeVisible();
 await expect(page.locator('.dashboard-shell')).toHaveClass(/dark/);
 await page.getByRole('checkbox',{name:'Reduce motion',exact:true}).check();await page.reload();
 await expect(page.locator('.dashboard-shell')).toHaveClass(/dark/);
 await expect(page.getByRole('checkbox',{name:'Reduce motion',exact:true})).toBeChecked();await workspace.expectNoOverflow();
});

test('Navida onboarding remains keyboard accessible and restores focus',async({page})=>{
 await new WorkspacePage(page).open('/workspace/data-selection');
 const trigger=page.getByRole('button',{name:'Replay tour'});await trigger.click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Next',exact:true}).click();
 await expect(dialog.getByRole('heading')).toHaveText('Begin with System Intelligence');
 await dialog.getByRole('button',{name:'Skip onboarding'}).focus();await page.keyboard.press('Shift+Tab');
 await expect(dialog.getByRole('button',{name:'Next',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
});

test('server boundaries and review gates prevent synthetic fallbacks',async({request})=>{
 expect((await request.get('/api/v1/health')).ok()).toBe(true);
 expect((await request.get('/api/v1/health',{headers:{Origin:'https://attacker.test'}})).status()).toBe(403);
 expect((await request.get('/api/v1/health',{headers:{Host:'attacker.test:5173'}})).status()).toBe(403);
 expect((await request.get('/.env')).status()).toBe(404);
 for(const path of ['cube/globe','cube/manifest','evidence/registry']) {
  const response=await request.get('/api/v1/'+path);expect(response.status()).toBe(503);expect((await response.json()).code).toBe('INTEGRATION_REVIEW_REQUIRED');
 }
 expect((await request.post('/api/v1/cube/case-board',{data:{}})).status()).toBe(503);
 const response=await request.post('/api/v1/analyze/case-file',{data:{}});expect(response.status()).toBe(503);
 expect((await request.get('/workspace/no-such-page')).status()).toBe(404);
});
