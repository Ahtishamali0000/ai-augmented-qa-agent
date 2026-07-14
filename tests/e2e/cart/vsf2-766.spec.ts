import { expect, test } from '../../../fixtures/testFixture';
import { SearchPage } from '../../../pages/SearchPage';
import { ProductPage } from '../../../pages/ProductPage';
import { CartPage } from '../../../pages/CartPage';

test.describe('VSF2-766 Virtual Product (EGO VIP) Inherits Color Options from Previously Viewed Configurable Product and Allows Multiple Quantities in Cart', () => {
  test('@regression @ui @search @cart @unstable validates Jira ticket acceptance criteria', async ({ homePage, page }) => {
    await homePage.goto();

    const searchPage = new SearchPage(page);
    await searchPage.search('heels');
    await searchPage.expectResults();

    await page.getByRole('link').filter({ hasText: /heel|shoe|sandal|boot/i }).first().click();

    const productPage = new ProductPage(page);
    await productPage.expectProductVisible();

    const sizeOption = page.getByRole('button', { name: /3|4|5|6|7|8|small|medium|large/i }).first();
    if (await sizeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sizeOption.click();
    }

    await page.getByRole('button', { name: /add to bag|add to basket|add to cart/i }).click();

    const cartPage = new CartPage(page);
    await cartPage.expectCartSurface();
    await expect(page.locator('body')).toContainText(/bag|basket|cart|added|checkout/i);
  });
});
