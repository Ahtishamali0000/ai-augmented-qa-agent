import { testEnv } from '../../../utils/env';
import { test } from '../../../fixtures/testFixture';

test('@auth @login @regression @ui @unstable login with configured customer credentials', async ({ authPage }) => {
  if (!testEnv.loginEmail || !testEnv.loginPassword) {
    throw new Error('LOGIN_EMAIL and LOGIN_PASSWORD are required for @login tests. Add them to .env before running this spec.');
  }

  await authPage.login(testEnv.loginEmail, testEnv.loginPassword);
  await authPage.verifyLoginSubmitted();
});
