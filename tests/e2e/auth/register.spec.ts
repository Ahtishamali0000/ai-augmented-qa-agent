import { expect, test } from '../../../fixtures/testFixture';
import { createRegistrationUser } from '../../../utils/testData';

test('@auth @register @regression @ui registration form accepts random yopmail email', async ({ authPage, page }) => {
  await authPage.goToRegistration();
  const user = await authPage.fillRegistrationForm(createRegistrationUser());

  await expect(page.getByDisplayValue(user.email)).toBeVisible();
});
