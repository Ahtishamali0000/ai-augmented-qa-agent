import { expect, type Page } from '@playwright/test';
import { FooterComponent } from '../components/FooterComponent';
import { PopupHandler } from '../components/PopupHandler';

export class FooterPage {
  readonly footer: FooterComponent;
  readonly popupHandler: PopupHandler;

  constructor(private readonly page: Page) {
    this.footer = new FooterComponent(page);
    this.popupHandler = new PopupHandler(page);
  }

  async goto() {
    await this.page.goto('/');
    await this.popupHandler.safeCloseAll();
    await this.footer.root.scrollIntoViewIfNeeded();
  }

  async verifyVisible() {
    await expect(this.footer.root).toBeVisible();
  }

  async verifyNavigationLinksPresent() {
    expect(await this.footer.links.count(), 'Expected the footer to contain navigation links').toBeGreaterThan(0);
  }
}
