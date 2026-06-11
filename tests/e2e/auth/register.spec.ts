import { test } from '../../../fixtures/testFixture';
import { generateRegistrationData } from '../../../utils/testData';

test('@register @auth @regression registration form accepts random yopmail customer data', async ({ homePage, authPage }) => {
  test.setTimeout(120_000);

  const data = generateRegistrationData();

  await homePage.goto();
  await homePage.openAccount();
  await authPage.goToRegistration();
  await authPage.verifyRegistrationFormVisible();
  await authPage.fillRegistrationForm(data);
  await authPage.verifyCreateAccountButtonEnabled();
  await authPage.submitRegistration();
});
