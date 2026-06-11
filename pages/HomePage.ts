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
    await this.handleInitialPopups();
  }

  async handleInitialPopups() {
    await this.popupHandler.safeCloseAll();
  }

  async removeBlockingPopups() {
    await this.popupHandler.safeCloseAll();
  }

  async openAccount() {
    await this.removeBlockingPopups();
    try {
      await this.header.openAccount();
    } catch (error) {
      if (!this.isOverlayInterception(error)) {
        throw error;
      }

      await this.removeBlockingPopups();
      await this.header.openAccount();
    }
  }

  async verifyLogoVisible() {
    await expect(this.header.logo).toBeVisible();
  }

  async verifySearchBarVisible() {
    await expect(this.header.searchBar).toBeVisible();
  }

  async verifyAccountIconVisible() {
    await expect(this.header.accountIcon).toBeVisible();
  }

  async verifyWishlistIconVisible() {
    await expect(this.header.wishlistIcon).toBeVisible();
  }

  async verifyBagIconVisible() {
    await expect(this.header.bagIcon).toBeVisible();
  }

  async verifyCountrySelectorVisible() {
    await expect(this.header.countrySelector).toBeVisible();
    await expect(this.header.countrySelector).toContainText(this.expectedLocaleText());
  }

  async verifyHeaderElementsVisible() {
    await this.verifyLogoVisible();
    await this.verifySearchBarVisible();
    await this.verifyAccountIconVisible();
    await this.verifyWishlistIconVisible();
    await this.verifyBagIconVisible();
    await this.verifyCountrySelectorVisible();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/ego|egoshoes|cfstaging/i);
    await this.verifyHeaderElementsVisible();
  }

  private expectedLocaleText() {
    const url = this.page.url().toLowerCase();

    if (url.includes('/us') || url.includes('egoshoes.com/us')) {
      return /usd|united states|us/i;
    }

    return /gbp|united kingdom|uk/i;
  }

  private isOverlayInterception(error: unknown) {
    return error instanceof Error && /intercepts pointer events|Timeout.*click|locator\.click/i.test(error.message);
  }
}
