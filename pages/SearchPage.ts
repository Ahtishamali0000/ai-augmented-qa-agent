import { expect, type Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';
import { PopupHandler } from '../components/PopupHandler';

export class SearchPage {
  readonly header: HeaderComponent;
  readonly popupHandler: PopupHandler;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.popupHandler = new PopupHandler(page);
  }

  async search(term: string) {
    await this.popupHandler.closeNonAuthPopups();
    try {
      await this.header.search(term);
    } catch (error) {
      if (!this.isOverlayInterception(error)) throw error;
      await this.popupHandler.closeNonAuthPopups();
      await this.header.search(term);
    }
  }

  async expectResults() {
    await expect(this.page.locator('body')).toContainText(/results|products|sort|filter/i);
  }

  private isOverlayInterception(error: unknown) {
    return error instanceof Error && /intercepts pointer events|Timeout.*click|locator\.click/i.test(error.message);
  }
}
