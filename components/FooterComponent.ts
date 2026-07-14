import type { Locator, Page } from '@playwright/test';

export class FooterComponent {
  readonly root: Locator;
  readonly links: Locator;
  readonly paymentLogos: Locator;

  constructor(page: Page) {
    this.root = page.locator('footer').first();
    this.links = this.root.getByRole('link');
    this.paymentLogos = this.root.locator('img[alt*="visa" i], img[alt*="master" i], img[alt*="payment" i], [data-testid*="payment" i] img');
  }
}
