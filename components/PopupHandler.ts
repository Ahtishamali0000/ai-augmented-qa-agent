import type { Locator, Page } from '@playwright/test';
import { logger } from '../utils/logger';

export class PopupHandler {
  constructor(private readonly page: Page) {}

  async safeCloseAll() {
    await this.closeNonAuthPopups();
  }

  async closeNonAuthPopups() {
    await this.handleCloudflareIfVisible();
    await this.closeCookieBanner();
    await this.closeLocationStoreModal();
    await this.closeCookieBanner();
    await this.closeLocationStoreModal();
    await this.closeEmailCaptureLightbox();
    await this.closeNewsletterPopup();
    await this.closeMarketingLightbox();
    await this.closeGenericNonAuthModal();
    await this.closeVisibleNonAuthModalIfBackdropPresent();
  }

  async handleCloudflareIfVisible() {
    const challenge = this.page.getByText(/checking if the site connection is secure|verify you are human|cloudflare/i).first();

    if (await challenge.isVisible({ timeout: 1500 }).catch(() => false)) {
      logger.warn('Cloudflare challenge detected. Test will not bypass it. Saving screenshot for review.');
      await this.page.screenshot({ path: `reports/playwright/artifacts/cloudflare-${Date.now()}.png`, fullPage: true });
      throw new Error('Cloudflare challenge detected. The framework does not bypass Cloudflare; screenshot saved for review.');
    }
  }

  private async closeCookieBanner() {
    const clicked = await this.clickFirstVisible([
      this.page.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll'),
      this.page.locator('#CybotCookiebotDialog button').filter({ hasText: /accept all/i }),
      this.page.getByRole('button', { name: /accept all|accept cookies|allow all|agree/i }),
      this.page.locator('[id*="Cookiebot" i] button').filter({ hasText: /accept all|allow selection|allow all/i }),
      this.page.getByRole('button', { name: /got it|ok/i }),
      this.page.locator('[data-testid*="cookie" i] button').filter({ hasText: /accept|agree|ok/i }),
    ]);

    if (clicked) {
      await this.page.locator('#CybotCookiebotDialogBodyUnderlay, #CybotCookiebotDialog').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
    }
  }

  private async closeNewsletterPopup() {
    await this.clickFirstVisible([
      this.page.getByRole('button', { name: /close newsletter|no thanks|not now/i }),
      this.page.locator('[aria-label*="newsletter" i] button[aria-label*="close" i]'),
      this.page.locator('[data-testid*="newsletter" i] button[aria-label*="close" i]'),
    ]);
  }

  private async closeLocationStoreModal() {
    const modal = this.page
      .getByRole('alertdialog')
      .filter({ hasText: /looks like you're in|switch and browse|select another store|save changes/i })
      .or(
        this.page
          .getByRole('dialog')
          .filter({ hasText: /looks like you're in|switch and browse|select another store|save changes/i }),
      )
      .first();

    if (!(await modal.isVisible({ timeout: 1000 }).catch(() => false))) {
      return;
    }

    const clicked = await this.clickFirstVisible([
      modal.getByRole('button', { name: /close|dismiss/i }),
      modal.locator('button[aria-label*="close" i], button[title*="close" i]'),
      modal.locator('button').first(),
    ]);

    if (clicked) {
      await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
    }
  }

  private async closeMarketingLightbox() {
    await this.clickFirstVisible([
      this.page.getByRole('button', { name: /close offer|close popup|dismiss/i }),
      this.page.locator('[aria-label*="marketing" i] button[aria-label*="close" i]'),
      this.page.locator('[data-testid*="marketing" i] button[aria-label*="close" i]'),
    ]);
  }

  private async closeEmailCaptureLightbox() {
    const lightbox = this.page
      .getByRole('dialog', { name: /modal overlay box/i })
      .or(this.page.locator('[role="dialog"].preloaded_lightbox, [role="dialog"][aria-label*="Modal Overlay Box" i], iframe[title*="Email Capture" i]'))
      .first();

    if (!(await lightbox.isVisible({ timeout: 1000 }).catch(() => false))) {
      return;
    }

    const authModal = this.page.getByRole('dialog').filter({ hasText: /login|sign in|register|create account/i }).first();

    if (await authModal.isVisible({ timeout: 500 }).catch(() => false)) {
      return;
    }

    await this.page.keyboard.press('Escape').catch(() => undefined);

    if (await lightbox.isHidden({ timeout: 1500 }).catch(() => false)) {
      return;
    }

    const clickedOuterClose = await this.clickFirstVisible([
      this.page.locator('[role="dialog"].preloaded_lightbox button[aria-label*="close" i]').first(),
      this.page.locator('[role="dialog"].preloaded_lightbox [aria-label*="close" i]').first(),
      this.page.locator('[role="dialog"][aria-label*="Modal Overlay Box" i] button[aria-label*="close" i]').first(),
      this.page.locator('[role="dialog"][aria-label*="Modal Overlay Box" i] [aria-label*="close" i]').first(),
      this.page.locator('[id^="lightbox-"] button[aria-label*="close" i]').first(),
      this.page.locator('[id^="lightbox-"] [class*="close" i]').first(),
      this.page.locator('.fr-close, .fb-close, .close').first(),
    ]);

    if (!clickedOuterClose) {
      await this.page
        .frameLocator('div[role="dialog"][aria-label*="Modal Overlay Box" i] iframe, iframe[title*="Email Capture" i], iframe[aria-label*="Modal Overlay Box Frame" i]')
        .getByRole('button', { name: /close modal|decline offer|no thanks|not now|close/i })
        .first()
        .click({ force: true, timeout: 2000 })
        .catch(() => undefined);

      for (const frame of this.page.frames()) {
        await frame
          .getByRole('button', { name: /close modal|decline offer|^close$|no thanks|not now/i })
          .first()
          .click({ force: true, timeout: 1500 })
          .catch(() => undefined);

        await frame
          .getByText(/decline offer|close modal|no thanks|not now/i)
          .first()
          .click({ force: true, timeout: 1000 })
          .catch(() => undefined);
      }
    }

    if (await lightbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      const box = await lightbox.boundingBox().catch(() => null);

      if (box) {
        await this.page.mouse.click(box.x + box.width - 28, box.y + 18).catch(() => undefined);
      }
    }

    await this.page
      .locator('[role="dialog"].preloaded_lightbox, [role="dialog"][aria-label*="Modal Overlay Box" i], .fb_lightbox-overlay-fixed, [id^="sidebar-overlay-lightbox"]')
      .first()
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => undefined);
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

  private async closeVisibleNonAuthModalIfBackdropPresent() {
    const backdrop = this.page.locator('.fixed.inset-0.bg-neutral-700, .fixed.inset-0[class*="bg-opacity"]').first();

    if (!(await backdrop.isVisible({ timeout: 500 }).catch(() => false))) {
      return;
    }

    const authModal = this.page.getByRole('dialog').filter({ hasText: /login|sign in|register|create account/i }).first();

    if (await authModal.isVisible({ timeout: 500 }).catch(() => false)) {
      return;
    }

    await this.clickFirstVisible([
      this.page.locator('[role="dialog"]:visible button[aria-label*="close" i]').first(),
      this.page.locator('[role="dialog"]:visible button[title*="close" i]').first(),
      this.page.locator('[role="dialog"]:visible button').filter({ hasText: /^close$/i }).first(),
      this.page.locator('button[aria-label*="close" i]:visible, button[title*="close" i]:visible').first(),
    ]);
  }

  private async clickFirstVisible(locators: Locator[]) {
    const candidates = locators.reduce((combined, locator) => combined.or(locator));
    const target = candidates.filter({ visible: true }).first();

    if (await target.isVisible({ timeout: 1000 }).catch(() => false)) {
      try {
        await target.click({ timeout: 2000 });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}
