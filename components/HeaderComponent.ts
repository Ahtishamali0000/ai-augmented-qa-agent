import type { Locator, Page } from '@playwright/test';

export class HeaderComponent {
  readonly logo: Locator;
  readonly searchBar: Locator;
  readonly accountIcon: Locator;
  readonly wishlistIcon: Locator;
  readonly bagIcon: Locator;
  readonly countrySelector: Locator;

  constructor(private readonly page: Page) {
    this.logo = page.getByRole('link', { name: /ego|home/i }).first();
    this.searchBar = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first();
    this.accountIcon = page.getByRole('link', { name: /account|login|sign in|my account/i }).or(page.getByRole('button', { name: /account|login|sign in|my account/i })).first();
    this.wishlistIcon = page.getByRole('link', { name: /wishlist|favourites|favorites/i }).first();
    this.bagIcon = page.getByRole('link', { name: /bag|basket|cart/i }).or(page.getByRole('button', { name: /bag|basket|cart/i })).first();
    this.countrySelector = page.getByRole('button', { name: /country|region|currency|gb|uk|us|eu/i }).first();
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
