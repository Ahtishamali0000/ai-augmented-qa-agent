import { testEnv } from '../../../utils/env';
import { expect, test } from '../../../fixtures/testFixture';

test('@auth @login @regression @ui login with configured customer credentials', async ({ authPage, page }) => {
  test.skip(!testEnv.loginEmail || !testEnv.loginPassword, 'LOGIN_EMAIL and LOGIN_PASSWORD are required for login tests.');

  await authPage.login(testEnv.loginEmail, testEnv.loginPassword);
  await expect(page.locator('body')).toContainText(/account|logout|sign out|my details|welcome/i);
});
