import { expect, type Page } from '@playwright/test';
export class VisualizationPage {
 constructor(readonly page:Page){}
 async open(path='/workspace/visualize'){
  await this.page.addInitScript(()=>localStorage.setItem('iris-onboarding-complete','true'));
  await this.page.goto(path);await expect(this.page.getByRole('heading',{name:'Make the change visible.'})).toBeVisible();
 }
 async discover(){await this.page.getByLabel('Find a dataset').fill('temperature');await this.page.getByRole('button',{name:'Search',exact:true}).click();}
 async load(){await this.page.getByRole('button',{name:'Load selected datasets',exact:true}).click();await expect(this.page.getByText(/series loaded/)).toBeVisible();}
 async noOverflow(){expect(await this.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
}
