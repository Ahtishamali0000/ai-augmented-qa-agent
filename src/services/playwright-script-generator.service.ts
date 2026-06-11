import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { JiraAssistantTicket, PlaywrightScriptSuggestion, QaAssistantAnalysis } from '../types/qa-assistant.types';

export class PlaywrightScriptGeneratorService {
  constructor(private readonly rootDir = process.cwd()) {}

  async generate(ticket: JiraAssistantTicket, analysis: QaAssistantAnalysis): Promise<PlaywrightScriptSuggestion> {
    const module = analysis.suggested_playwright_script.module;
    const fileName = `${ticket.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.spec.ts`;
    const pendingPath = join(this.rootDir, 'generated-tests', 'pending', fileName);
    const generatedCode = this.createCode(ticket, analysis);

    await mkdir(join(this.rootDir, 'generated-tests', 'pending'), { recursive: true });
    await writeFile(pendingPath, generatedCode, 'utf8');

    return {
      suggested_file_path: `generated-tests/pending/${fileName}`,
      module,
      tags: analysis.suggested_playwright_script.tags,
      risk_level: analysis.risk_level,
      generated_code: generatedCode,
      requires_human_review: true,
      assumptions: ['Review selectors against the current storefront before approving.', 'Generated script stays in pending until approved.'],
    };
  }

  private createCode(ticket: JiraAssistantTicket, analysis: QaAssistantAnalysis) {
    const tags = analysis.suggested_playwright_script.tags.join(' ');
    const title = ticket.title.replace(/'/g, "\\'");

    return `import { expect, test } from '../../../fixtures/testFixture';
import { SearchPage } from '../../../pages/SearchPage';
import { ProductPage } from '../../../pages/ProductPage';
import { CartPage } from '../../../pages/CartPage';

test.describe('${ticket.key} ${title}', () => {
  test('${tags} validates Jira ticket acceptance criteria', async ({ homePage, page }) => {
    await homePage.goto();

    const searchPage = new SearchPage(page);
    await searchPage.search('heels');
    await searchPage.expectResults();

    await page.getByRole('link').filter({ hasText: /heel|shoe|sandal|boot/i }).first().click();

    const productPage = new ProductPage(page);
    await productPage.expectProductVisible();

    const sizeOption = page.getByRole('button', { name: /3|4|5|6|7|8|small|medium|large/i }).first();
    if (await sizeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sizeOption.click();
    }

    await page.getByRole('button', { name: /add to bag|add to basket|add to cart/i }).click();

    const cartPage = new CartPage(page);
    await cartPage.expectCartSurface();
    await expect(page.locator('body')).toContainText(/bag|basket|cart|added|checkout/i);
  });
});
`;
  }
}
