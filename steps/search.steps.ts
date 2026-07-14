import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/bddFixture';

const { Given, When, Then } = createBdd(test);

Given('I open the homepage for search', async ({ homePage }) => {
  await homePage.goto();
});

When('I search for {string}', async ({ searchPage }, term: string) => {
  await searchPage.search(term);
});

Then('I should see product search results', async ({ searchPage }) => {
  await searchPage.expectResults();
});
