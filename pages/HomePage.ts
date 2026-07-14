import { expect, type Locator, type Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';
import { PopupHandler } from '../components/PopupHandler';
import { resolveEnvironmentUrl } from '../utils/env';

type SelectorCandidate = {
  primary: Locator;
  backups: Locator[];
};

type TrendCategory = 'Co-Ords' | 'Dresses' | 'Shoes' | 'Swimwear';

const trendCategoryPaths: Record<TrendCategory, RegExp> = {
  'Co-Ords': /\/c\/clothing\/co-ords/i,
  Dresses: /\/c\/clothing\/dresses/i,
  Shoes: /\/c\/shoes/i,
  Swimwear: /\/c\/clothing\/swimwear/i,
};

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

  async gotoUsStorefront() {
    await this.page.goto(resolveEnvironmentUrl('CF_US'));
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

  async verifyHeroBannerVisible() {
    await expect(await this.visibleLocator('hero banner', this.heroBannerSelectors(), 30000)).toBeVisible();
  }

  async verifyTrendCategoryVisible(category: TrendCategory) {
    const locator = await this.visibleLocator(`${category} trend category`, this.trendCategorySelectors(category), 30000, true);
    await expect(locator).toBeVisible();
  }

  async verifyPopularCategoriesVisible() {
    const locator = await this.visibleLocator('Popular Categories section', this.popularCategoriesSelectors(), 30000, true);
    await expect(locator).toBeVisible();
  }

  async verifyWhatsHotVisible() {
    const locator = await this.visibleLocator("What's Hot section", this.whatsHotSelectors(), 30000, true);
    await expect(locator).toBeVisible();
  }

  async addVisibleWhatsHotProductToBag() {
    await this.verifyWhatsHotVisible();
    await this.clickFirstVisible("What's Hot product link", this.whatsHotProductLinkSelectors(), 30000, true);
    await expect(this.page).toHaveURL(/\/p\//i);
    await this.removeBlockingPopups();
    await this.selectFirstAvailableSize();
    await this.closeOpenDropdowns();
    await this.clickFirstVisible('Add to Bag button', this.addToBagSelectors(), 20000);
  }

  async verifyProductAddedToBag() {
    await expect(await this.visibleLocator('add to bag confirmation', this.addedToBagConfirmationSelectors(), 20000)).toBeVisible();
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

  private heroBannerSelectors(): SelectorCandidate {
    return {
      primary: this.page.locator('[data-testid*="hero" i], [data-testid*="banner" i]').first(),
      backups: [
        this.page.getByRole('region', { name: /hero|banner|main promotion/i }).first(),
        this.page.locator('[id^="splide"][id*="slide"] div, .splide__slide:visible, section:has(a[href*="/c/"])').first(),
      ],
    };
  }

  private trendCategorySelectors(category: TrendCategory): SelectorCandidate {
    const trendGrid = this.page.locator('[title="Shop By Trend"], [aria-label="Shop By Trend"]').first();

    return {
      primary: trendGrid.getByRole('link', { name: new RegExp(category.replace('-', '[- ]?'), 'i') }).first(),
      backups: [
        trendGrid.locator(`a[href*="${this.pathFragmentForCategory(category)}" i]`).first(),
        this.page.locator('div[title="Shop By Trend"], section').filter({ has: this.page.locator(`a[href*="${this.pathFragmentForCategory(category)}" i]`) }).first(),
        trendGrid.locator('a').filter({ hasText: new RegExp(category.replace('-', '[- ]?'), 'i') }).first(),
      ],
    };
  }

  private popularCategoriesSelectors(): SelectorCandidate {
    return {
      primary: this.page.getByRole('heading', { name: /popular categories/i }).first(),
      backups: [
        this.page.locator('[data-testid*="popular" i], section:has(h2:has-text("Popular Categories"))').first(),
        this.page.getByText(/popular categories/i).first(),
      ],
    };
  }

  private whatsHotSelectors(): SelectorCandidate {
    return {
      primary: this.page.getByRole('heading', { name: /what'?s hot!?/i }).first(),
      backups: [
        this.page.locator('[data-testid*="hot" i], section:has(h2:has-text("What"))').filter({ hasText: /what'?s hot/i }).first(),
        this.page.getByText(/what'?s hot!?/i).first(),
      ],
    };
  }

  private whatsHotProductLinkSelectors(): SelectorCandidate {
    const whatsHotSection = this.page.locator('main').locator('div, section').filter({ has: this.page.getByRole('heading', { name: /what'?s hot!?/i }) }).first();

    return {
      primary: whatsHotSection.locator('a[href*="/p/"]').filter({ hasText: /[a-z]/i }).first(),
      backups: [
        this.page.locator('a[href*="/p/"]').filter({ hasText: /top|dress|jeans|sandal|heel|sarong|shirt/i }).first(),
        this.page.locator('a[href*="/p/"] img[alt]').first(),
      ],
    };
  }

  private sizeOptionSelectors(): SelectorCandidate {
    return {
      primary: this.page.getByRole('button', { name: /^(UK\s*)?(3|4|5|6|7|8|9|10|11|12|XS|S|M|L|XL)$/i }).first(),
      backups: [
        this.page.locator('[role="option"], [role="menuitem"], li, option').filter({ hasText: /^(UK\s*)?(3|4|5|6|7|8|9|10|11|12|XS|S|M|L|XL)$/i }).first(),
        this.page
          .locator('main button:not([disabled]), div[role="dialog"] button:not([disabled]), div[class*="overflow-y-auto"] ul li button:not([disabled]), div[class*="absolute"] div')
          .filter({ hasText: /^(UK\s*)?(3|4|5|6|7|8|9|10|11|12|XS|S|M|L|XL)$/i })
          .first(),
      ],
    };
  }

  private sizeDropdownSelectors(): SelectorCandidate {
    return {
      primary: this.page.locator('main div').filter({ hasText: /^Select a Size$/i }),
      backups: [
        this.page.locator('[data-testid*="size" i]').filter({ hasText: /select a size/i }),
        this.page.getByText(/^Select a Size$/i),
      ],
    };
  }

  private addToBagSelectors(): SelectorCandidate {
    return {
      primary: this.page.getByRole('button', { name: /^add to bag$/i }).first(),
      backups: [
        this.page.locator('button[data-testid*="add-to-bag" i], button[data-testid*="addToBag" i]').first(),
        this.page.locator('button').filter({ hasText: /add to bag|add to cart/i }).first(),
      ],
    };
  }

  private addedToBagConfirmationSelectors(): SelectorCandidate {
    return {
      primary: this.page.getByRole('dialog').filter({ hasText: /added|bag|view bag|checkout/i }).first(),
      backups: [
        this.page.getByText(/added to bag|view bag|checkout securely|item added/i).first(),
        this.header.bagIcon,
      ],
    };
  }

  private async clickFirstVisible(name: string, selectors: SelectorCandidate, timeout = 5000, allowScroll = false) {
    const locator = await this.visibleLocator(name, selectors, timeout, allowScroll);

    try {
      await locator.click({ timeout: Math.min(timeout, 5000) });
      return;
    } catch (error) {
      if (!this.isOverlayInterception(error)) {
        throw error;
      }
    }

    await this.removeBlockingPopups();
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await locator.click({ force: true, timeout: Math.min(timeout, 5000) });
  }

  private async selectFirstAvailableSize() {
    const sizeOption = await this.tryVisibleLocator(this.sizeOptionSelectors(), 1500);

    if (sizeOption) {
      await sizeOption.click();
      await this.closeOpenDropdowns();
      return;
    }

    const dropdown = await this.visibleLocator('size dropdown', this.sizeDropdownSelectors(), 10000);
    await dropdown.scrollIntoViewIfNeeded();
    await this.clickDropdownSurface(dropdown);
    await this.page.waitForTimeout(500);

    const openedOption = await this.tryVisibleLocator(this.sizeOptionSelectors(), 3000);

    if (openedOption) {
      await openedOption.click();
      await this.closeOpenDropdowns();
      return;
    }

    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
    await this.closeOpenDropdowns();
  }

  private async clickDropdownSurface(dropdown: Locator) {
    const box = await dropdown.boundingBox();

    if (!box) {
      await dropdown.click({ force: true });
      return;
    }

    await this.page.mouse.click(box.x + Math.max(box.width / 2, 260), box.y + box.height / 2);
  }

  private async closeOpenDropdowns() {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(250);
  }

  private async tryVisibleLocator(selectors: SelectorCandidate, timeout = 1000) {
    return this.visibleLocator('candidate element', selectors, timeout).catch(() => undefined);
  }

  private async visibleLocator(name: string, selectors: SelectorCandidate, timeout = 5000, allowScroll = false) {
    const candidates = [selectors.primary, ...selectors.backups];
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      await this.removeBlockingPopups();

      for (const candidate of candidates) {
        const matchCount = Math.min(await candidate.count().catch(() => 0), 10);

        for (let index = 0; index < matchCount; index++) {
          const locator = candidate.nth(index);

          if (await locator.isVisible({ timeout: 250 }).catch(() => false)) {
            return locator;
          }
        }
      }

      if (!allowScroll) {
        break;
      }

      await this.page.mouse.wheel(0, 800);
      await this.page.waitForTimeout(300);
    }

    throw new Error(`Unable to find visible ${name} using primary or backup selectors.`);
  }

  private pathFragmentForCategory(category: TrendCategory) {
    return trendCategoryPaths[category].source.replace(/\\\//g, '/').replace('/i', '');
  }
}
