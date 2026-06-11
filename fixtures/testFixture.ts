import { test as base } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';

export type QaFixtures = {
  homePage: HomePage;
  authPage: AuthPage;
};

export const test = base.extend<QaFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
});

export { expect } from '@playwright/test';
