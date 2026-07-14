import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/bddFixture';

const { Given, Then } = createBdd(test);

Given('I open the storefront footer', async ({ footerPage }) => {
  await footerPage.goto();
});

Then('I should see the footer', async ({ footerPage }) => {
  await footerPage.verifyVisible();
});

Then('the footer should contain navigation links', async ({ footerPage }) => {
  await footerPage.verifyNavigationLinksPresent();
});
