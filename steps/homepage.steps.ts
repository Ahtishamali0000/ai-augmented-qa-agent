import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/bddFixture';

const { Given, When, Then } = createBdd(test);

Given('I open the homepage', async ({ homePage }) => {
  await homePage.goto();
});

Given('I open the US storefront homepage', async ({ homePage }) => {
  await homePage.gotoUsStorefront();
});

Then('I should see the EGO logo', async ({ homePage }) => {
  await homePage.verifyLogoVisible();
});

Then('I should see the search bar', async ({ homePage }) => {
  await homePage.verifySearchBarVisible();
});

Then('I should see the account icon', async ({ homePage }) => {
  await homePage.verifyAccountIconVisible();
});

Then('I should see the wishlist icon', async ({ homePage }) => {
  await homePage.verifyWishlistIconVisible();
});

Then('I should see the bag icon', async ({ homePage }) => {
  await homePage.verifyBagIconVisible();
});

Then('I should see the homepage hero banner', async ({ homePage }) => {
  await homePage.verifyHeroBannerVisible();
});

Then('I should see the {string} trend category', async ({ homePage }, category) => {
  await homePage.verifyTrendCategoryVisible(category as 'Co-Ords' | 'Dresses' | 'Shoes' | 'Swimwear');
});

Then('I should see the Popular Categories section', async ({ homePage }) => {
  await homePage.verifyPopularCategoriesVisible();
});

Then("I should see the What's Hot section", async ({ homePage }) => {
  await homePage.verifyWhatsHotVisible();
});

When("I add a visible What's Hot product to the bag", async ({ homePage }) => {
  await homePage.addVisibleWhatsHotProductToBag();
});

Then('the product should be added to the bag', async ({ homePage }) => {
  await homePage.verifyProductAddedToBag();
});
