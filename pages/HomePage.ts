import { expect, type Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';
import { PopupHandler } from '../components/PopupHandler';

export class HomePage {
  readonly header: HeaderComponent;
  readonly popupHandler: PopupHandler;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.popupHandler = new PopupHandler(page);
  }

  async goto() {
    await this.page.goto('/');
    await this.popupHandler.closeNonAuthPopups();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/ego|egoshoes|cfstaging/i);
    await expect(this.page.locator('body')).toBeVisible();
  }
}
