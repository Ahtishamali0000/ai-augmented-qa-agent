import { createBdd } from 'playwright-bdd';
import { test } from '../../fixtures/bddFixture';
import { SauceDemo01Page2 } from '../../pages/generated/SauceDemo01Page2';
import { recordedGenerated2Data } from '../../utils/generated/generated2.recorded-data';

const { Given, When, Then } = createBdd(test);

Given('for recording REC-20260904070725-MJL5 generated2 I open the website', async ({ page }) => {
  const recordedPage = new SauceDemo01Page2(page);
  const recordedData = recordedGenerated2Data;
  await recordedPage.openTheWebsite(recordedData.websiteUrl);
});

When('for recording REC-20260904070725-MJL5 generated2 I navigate to the swag labs page', async ({ page }) => {
  const recordedPage = new SauceDemo01Page2(page);
  const recordedData = recordedGenerated2Data;
  await recordedPage.navigateToTheSwagLabsPage(recordedData.websiteUrl);
});

When('for recording REC-20260904070725-MJL5 generated2 I navigate to the swag labs page step 2', async ({ page }) => {
  const recordedPage = new SauceDemo01Page2(page);
  const recordedData = recordedGenerated2Data;
  await recordedPage.navigateToTheSwagLabsPage2(recordedData.websiteUrl);
});

When('for recording REC-20260904070725-MJL5 generated2 I navigate to the swag labs page step 3', async ({ page }) => {
  const recordedPage = new SauceDemo01Page2(page);
  const recordedData = recordedGenerated2Data;
  await recordedPage.navigateToTheSwagLabsPage3(recordedData.websiteUrl);
});

When('for recording REC-20260904070725-MJL5 generated2 I navigate to the swag labs page step 4', async ({ page }) => {
  const recordedPage = new SauceDemo01Page2(page);
  const recordedData = recordedGenerated2Data;
  await recordedPage.navigateToTheSwagLabsPage4(recordedData.websiteUrl);
});

When('for recording REC-20260904070725-MJL5 generated2 I navigate to the swag labs page step 5', async ({ page }) => {
  const recordedPage = new SauceDemo01Page2(page);
  const recordedData = recordedGenerated2Data;
  await recordedPage.navigateToTheSwagLabsPage5(recordedData.websiteUrl);
});

When('for recording REC-20260904070725-MJL5 generated2 I navigate to the swag labs page step 6', async ({ page }) => {
  const recordedPage = new SauceDemo01Page2(page);
  const recordedData = recordedGenerated2Data;
  await recordedPage.navigateToTheSwagLabsPage6(recordedData.websiteUrl);
});

When('for recording REC-20260904070725-MJL5 generated2 I navigate to the swag labs page step 7', async ({ page }) => {
  const recordedPage = new SauceDemo01Page2(page);
  const recordedData = recordedGenerated2Data;
  await recordedPage.navigateToTheSwagLabsPage7(recordedData.websiteUrl);
});
