import { expect, test } from '../../../fixtures/testFixture';

test('@smoke @homepage @ui homepage loads successfully', async ({ homePage, page }) => {
  await homePage.goto();
  await homePage.expectLoaded();
  await expect(page.locator('body')).toContainText(/ego|shoes|sale|new/i);
});
