import { expect, type Page } from '@playwright/test';
import { PopupHandler } from '../components/PopupHandler';

export class CartPage {
  readonly popupHandler: PopupHandler;

  constructor(private readonly page: Page) {
    this.popupHandler = new PopupHandler(page);
  }

  async goto() {
    await this.page.goto('/cart');
    await this.popupHandler.closeNonAuthPopups();
  }

  async expectCartSurface() {
    await expect(this.page.locator('body')).toContainText(/bag|basket|cart|checkout/i);
  }
}
