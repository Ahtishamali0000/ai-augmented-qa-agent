import type { Locator, Page } from '@playwright/test';
import { logger } from '../utils/logger';

export class PopupHandler {
  constructor(private readonly page: Page) {}

  async closeNonAuthPopups() {
    await this.handleCloudflareIfVisible();
    await this.closeCookieBanner();
    await this.closeNewsletterPopup();
    await this.closeMarketingLightbox();
    await this.closeGenericNonAuthModal();
    await this.page.waitForTimeout(300);
  }

  async handleCloudflareIfVisible() {
    const challenge = this.page.getByText(/checking if the site connection is secure|verify you are human|cloudflare/i).first();

    if (await challenge.isVisible({ timeout: 1500 }).catch(() => false)) {
      logger.warn('Cloudflare challenge detected. Test will not bypass it. Saving screenshot for review.');
      await this.page.screenshot({ path: `reports/playwright/artifacts/cloudflare-${Date.now()}.png`, fullPage: true });
    }
  }

  private async closeCookieBanner() {
    await this.clickFirstVisible([
      this.page.getByRole('button', { name: /accept all|accept cookies|allow all|agree/i }),
      this.page.getByRole('button', { name: /got it|ok/i }),
      this.page.locator('[data-testid*="cookie" i] button').filter({ hasText: /accept|agree|ok/i }),
    ]);
  }

  private async closeNewsletterPopup() {
    await this.clickFirstVisible([
      this.page.getByRole('button', { name: /close newsletter|no thanks|not now/i }),
      this.page.locator('[aria-label*="newsletter" i] button[aria-label*="close" i]'),
      this.page.locator('[data-testid*="newsletter" i] button[aria-label*="close" i]'),
    ]);
  }

  private async closeMarketingLightbox() {
    await this.clickFirstVisible([
      this.page.getByRole('button', { name: /close offer|close popup|dismiss/i }),
      this.page.locator('[aria-label*="marketing" i] button[aria-label*="close" i]'),
      this.page.locator('[data-testid*="marketing" i] button[aria-label*="close" i]'),
    ]);
  }

  private async closeGenericNonAuthModal() {
    const authModal = this.page.getByRole('dialog').filter({ hasText: /login|sign in|register|create account/i });

    if (await authModal.first().isVisible({ timeout: 500 }).catch(() => false)) {
      return;
    }

    await this.clickFirstVisible([
      this.page.getByRole('button', { name: /^close$/i }),
      this.page.locator('button[aria-label="Close"], button[title="Close"]').first(),
      this.page.locator('[data-testid*="modal" i] button[aria-label*="close" i]').first(),
    ]);
  }

  private async clickFirstVisible(locators: Locator[]) {
    for (const locator of locators) {
      const target = locator.first();

      if (await target.isVisible({ timeout: 750 }).catch(() => false)) {
        await target.click({ timeout: 5000 }).catch(() => undefined);
        return true;
      }
    }

    return false;
  }
}
