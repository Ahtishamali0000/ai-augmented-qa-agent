import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/bddFixture';

const { Given, Then } = createBdd(test);

Given('I open checkout', async ({ checkoutPage }) => {
  await checkoutPage.goto();
});

Then('I should see the checkout surface', async ({ checkoutPage }) => {
  await checkoutPage.verifyCheckoutSurface();
});

Given('an approved destructive checkout test is prepared', async () => {
  throw new Error('Implement only against a non-production payment sandbox after explicit approval.');
});

Then('a human must approve payment completion', async () => {
  throw new Error('Payment completion is intentionally manual until approved.');
});
