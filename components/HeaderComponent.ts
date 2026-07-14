import type { Locator, Page } from '@playwright/test';

export class HeaderComponent {
  readonly logo: Locator;
  readonly searchBar: Locator;
  readonly accountIcon: Locator;
  readonly wishlistIcon: Locator;
  readonly bagIcon: Locator;
  readonly countrySelector: Locator;

  constructor(private readonly page: Page) {
    const header = page.locator('header').first();

    this.logo = header.locator('a[href="/"]:visible, a[href*="ego" i]:visible').or(page.getByRole('link', { name: /ego|home/i })).first();
    this.searchBar = header.locator('input[type="search"]:visible, input[placeholder*="search" i]:visible').or(page.getByRole('searchbox')).or(page.getByPlaceholder(/search/i)).first();
    this.accountIcon = header
      .locator('a[href*="account" i]:visible, a[href*="login" i]:visible, button[aria-label*="account" i]:visible')
      .or(page.getByRole('link', { name: /account|login|sign in|my account/i }))
      .or(page.getByRole('button', { name: /account|login|sign in|my account/i }))
      .first();
    this.wishlistIcon = header
      .locator('a[href*="wishlist" i]:visible, a[href*="favourite" i]:visible, a[href*="favorite" i]:visible, button[aria-label*="wishlist" i]:visible')
      .or(page.getByRole('link', { name: /wishlist|favourites|favorites/i }))
      .or(page.getByRole('button', { name: /wishlist|favourites|favorites/i }))
      .first();
    this.bagIcon = header
      .locator('a[href*="bag" i]:visible, a[href*="basket" i]:visible, a[href*="cart" i]:visible, button[aria-label*="bag" i]:visible, button[aria-label*="cart" i]:visible')
      .or(page.getByRole('link', { name: /bag|basket|cart/i }))
      .or(page.getByRole('button', { name: /bag|basket|cart/i }))
      .first();
    this.countrySelector = header
      .locator('[data-testid*="country" i], [data-testid*="currency" i], [data-testid*="locale" i]')
      .or(header.getByRole('button', { name: /^(gbp|usd|eur|cad|aud|aed)\b|united kingdom|united states|european union/i }))
      .first();
  }

  async openAccount() {
    await this.accountIcon.click();
  }

  async search(term: string) {
    await this.searchBar.click();
    await this.searchBar.fill(term);
    await this.searchBar.press('Enter');
  }
}
