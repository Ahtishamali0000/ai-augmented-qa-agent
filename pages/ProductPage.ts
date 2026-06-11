import { expect, type Page } from '@playwright/test';
import { PopupHandler } from '../components/PopupHandler';

export class ProductPage {
  readonly popupHandler: PopupHandler;

  constructor(private readonly page: Page) {
    this.popupHandler = new PopupHandler(page);
  }

  async expectProductVisible() {
    await this.popupHandler.closeNonAuthPopups();
    await expect(this.page.locator('body')).toContainText(/add to bag|size|product|colour|color/i);
  }
}
