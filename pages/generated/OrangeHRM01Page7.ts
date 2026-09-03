import { expect, type Locator, type Page } from '@playwright/test';

export class OrangeHRM01Page7 {
  constructor(private readonly page: Page) {}

  private goto1() {
    return this.selfHealingLocator(
      'STEP-001',
      () => this.page.getByRole('document', { name: /OrangeHRM/i }),
      [() => this.page.getByText(/OrangeHRM/i), () => this.page.locator('[name="OrangeHRM"]')],
    );
  }

  private goto2() {
    return this.selfHealingLocator(
      'STEP-002',
      () => this.page.getByRole('document', { name: /OrangeHRM/i }),
      [() => this.page.getByText(/OrangeHRM/i), () => this.page.locator('[name="OrangeHRM"]')],
    );
  }

  private goto3() {
    return this.selfHealingLocator(
      'STEP-003',
      () => this.page.getByRole('document', { name: /OrangeHRM/i }),
      [() => this.page.getByText(/OrangeHRM/i), () => this.page.locator('[name="OrangeHRM"]')],
    );
  }

  async openTheWebsite(url: string) {
    await this.page.goto(url);
  }

  async navigateToTheOrangeHRMPage(url: string) {
    await this.page.goto(url);
  }

  async navigateToTheOrangeHRMPage2(url: string) {
    await this.page.goto(url);
  }

  private selfHealingLocator(stepId: string, primary: () => Locator, backups: Array<() => Locator>) {
    return backups.reduce((locator, backup) => locator.or(backup()), primary()).first().describe(`AI recorder locator for ${stepId}`);
  }
}
