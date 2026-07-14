import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/bddFixture';
import { testEnv } from '../utils/env';

const { Given, When, Then } = createBdd(test);

Given('configured customer credentials are available', async () => {
  if (!testEnv.loginEmail || !testEnv.loginPassword) {
    throw new Error('LOGIN_EMAIL and LOGIN_PASSWORD are required for the login feature.');
  }
});

When('I sign in with the configured customer credentials', async ({ authPage }) => {
  await authPage.login(testEnv.loginEmail, testEnv.loginPassword);
});

Then('I should reach the authenticated customer area', async ({ authPage }) => {
  await authPage.verifyLoginSubmitted();
});

Given('I open the customer registration form', async ({ authPage }) => {
  await authPage.openFromHome();
  await authPage.goToRegistration();
});

Then('I should see the registration form', async ({ authPage }) => {
  await authPage.verifyRegistrationFormVisible();
});
