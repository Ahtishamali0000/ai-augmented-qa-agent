import { createBdd } from 'playwright-bdd';
import { test } from '../../fixtures/bddFixture';
import { AuthPage } from '../../pages/generated/AuthPage';
import { recordedAuthData } from '../../utils/generated/auth.recorded-data';

const { Given, When, Then } = createBdd(test);

Given('I open homepage', async ({ page }) => {
  const recordedPage = new AuthPage(page);
  const recordedData = recordedAuthData;
  await recordedPage.openHomepage(recordedData.websiteUrl);
});

When('I navigate to login page', async ({ page }) => {
  const recordedPage = new AuthPage(page);
  const recordedData = recordedAuthData;
  await recordedPage.navigateToLoginPage();
});

When('I enter valid email', async ({ page }) => {
  const recordedPage = new AuthPage(page);
  const recordedData = recordedAuthData;
  await recordedPage.enterValidEmail(recordedData.values['step-03'] || '');
});

When('I enter valid password', async ({ page }) => {
  const recordedPage = new AuthPage(page);
  const recordedData = recordedAuthData;
  await recordedPage.enterValidPassword(recordedData.values['step-04'] || '');
});

When('I submit login form', async ({ page }) => {
  const recordedPage = new AuthPage(page);
  const recordedData = recordedAuthData;
  await recordedPage.submitLoginForm();
});

When('I search for shoes', async ({ page }) => {
  const recordedPage = new AuthPage(page);
  const recordedData = recordedAuthData;
  await recordedPage.searchForShoes(recordedData.values['step-06'] || '');
});

When('I open first product', async ({ page }) => {
  const recordedPage = new AuthPage(page);
  const recordedData = recordedAuthData;
  await recordedPage.openFirstProduct();
});

When('I add product to cart', async ({ page }) => {
  const recordedPage = new AuthPage(page);
  const recordedData = recordedAuthData;
  await recordedPage.addProductToCart();
});

Then('I verify cart confirmation appears', async ({ page }) => {
  const recordedPage = new AuthPage(page);
  const recordedData = recordedAuthData;
  await recordedPage.verifyCartConfirmationAppears();
});
