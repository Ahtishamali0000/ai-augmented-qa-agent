import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GeneratedScript, JiraTicketSample, TicketAnalysisOutput } from '../types/ticket-analysis.types';

export class TestScriptGeneratorService {
  constructor(private readonly rootDir = process.cwd()) {}

  async generatePendingScript(ticket: JiraTicketSample, analysis: TicketAnalysisOutput): Promise<GeneratedScript> {
    const folder = this.resolveTargetFolder(analysis.recommended_existing_tags);
    const fileName = `${ticket.ticket_id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.spec.ts`;
    const pendingPath = join(this.rootDir, 'generated-tests', 'pending', fileName);
    const finalPath = join(this.rootDir, 'tests', 'e2e', folder, fileName);
    const content = this.createSpec(ticket, analysis);

    await mkdir(join(this.rootDir, 'generated-tests', 'pending'), { recursive: true });
    await writeFile(pendingPath, content, 'utf8');

    return {
      file_name: fileName,
      target_folder: folder,
      pending_path: pendingPath,
      final_path: finalPath,
      content,
    };
  }

  private resolveTargetFolder(tags: string[]) {
    if (tags.includes('@checkout') || tags.includes('@payment')) return 'checkout';
    if (tags.includes('@cart')) return 'cart';
    if (tags.includes('@search')) return 'search';
    if (tags.includes('@login') || tags.includes('@register') || tags.includes('@auth')) return 'auth';
    return 'smoke';
  }

  private createSpec(ticket: JiraTicketSample, analysis: TicketAnalysisOutput) {
    const tags = [...new Set(analysis.recommended_existing_tags)].join(' ');
    const title = ticket.title.replace(/'/g, "\\'");

    return `import { expect, test } from '../../../fixtures/testFixture';
import { SearchPage } from '../../../pages/SearchPage';
import { ProductPage } from '../../../pages/ProductPage';
import { CartPage } from '../../../pages/CartPage';

test('${tags} ${ticket.ticket_id} ${title}', async ({ homePage, page }) => {
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
`;
  }
}
