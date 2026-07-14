import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/bddFixture';

const { Given, Then } = createBdd(test);

Given('I open the shopping bag', async ({ cartPage }) => {
  await cartPage.goto();
});

Then('I should see the shopping bag surface', async ({ cartPage }) => {
  await cartPage.expectCartSurface();
});
