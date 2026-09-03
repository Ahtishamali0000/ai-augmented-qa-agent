import { createBdd } from 'playwright-bdd';
import { test } from '../../fixtures/bddFixture';
import { OrangeHRM01Page7 } from '../../pages/generated/OrangeHRM01Page7';
import { recordedHomepage7Data } from '../../utils/generated/homepage7.recorded-data';

const { Given, When, Then } = createBdd(test);

Given('for recording REC-20260903105238-381X homepage7 I open the website', async ({ page }) => {
  const recordedPage = new OrangeHRM01Page7(page);
  const recordedData = recordedHomepage7Data;
  await recordedPage.openTheWebsite(recordedData.websiteUrl);
});

When('for recording REC-20260903105238-381X homepage7 I navigate to the orangehrm page', async ({ page }) => {
  const recordedPage = new OrangeHRM01Page7(page);
  const recordedData = recordedHomepage7Data;
  await recordedPage.navigateToTheOrangeHRMPage(recordedData.websiteUrl);
});

When('for recording REC-20260903105238-381X homepage7 I navigate to the orangehrm page step 2', async ({ page }) => {
  const recordedPage = new OrangeHRM01Page7(page);
  const recordedData = recordedHomepage7Data;
  await recordedPage.navigateToTheOrangeHRMPage2(recordedData.websiteUrl);
});
