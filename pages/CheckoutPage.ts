import { expect, type Page } from '@playwright/test';
import { PopupHandler } from '../components/PopupHandler';

export class CheckoutPage {
  readonly popupHandler: PopupHandler;

  constructor(private readonly page: Page) {
    this.popupHandler = new PopupHandler(page);
  }

  async goto() {
    await this.page.goto('/checkout');
    await this.popupHandler.closeNonAuthPopups();
  }

  async verifyCheckoutSurface() {
    await expect(this.page.locator('body')).toContainText(/checkout|delivery|shipping|payment|bag is empty|basket is empty/i);
  }
}
