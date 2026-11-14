import { expect, type Page } from '@playwright/test';

/** User-facing workspace actions shared by the integration journeys. */
export class WorkspacePage {
  constructor(readonly page: Page) {}

  async open(path = '/workspace'): Promise<void> {
    await this.page.goto(path);
    await expect(this.page.getByRole('status')).toHaveText('Local server connected');
  }

  async expectUnavailable(): Promise<void> {
    await expect(this.page.getByText('Analysis unavailable · Trend methods not validated', { exact: true })).toBeVisible();
  }

  async expectNoOverflow(): Promise<void> {
    expect(await this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
}
