import { test } from '../../../fixtures/testFixture';

test('@smoke @homepage @ui homepage header loads successfully', async ({ homePage }) => {
  await homePage.goto();
  await homePage.expectLoaded();
});
