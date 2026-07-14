import { expect, type Locator, type Page } from '@playwright/test';

export class AuthPage {
  constructor(private readonly page: Page) {}

  private goto1() {
    return this.selfHealingLocator(() => this.page.getByRole('document'), () => this.page.getByRole('document'), 'step-01');
  }

  private click2() {
    return this.selfHealingLocator(() => this.page.getByRole('link', { name: /Login/i }), () => this.page.getByText(/Login/i), 'step-02');
  }

  private fill3() {
    return this.selfHealingLocator(() => this.page.getByLabel(/Email/i), () => this.page.locator('text=Email'), 'step-03');
  }

  private fill4() {
    return this.selfHealingLocator(() => this.page.getByLabel(/Password/i), () => this.page.locator('text=Password'), 'step-04');
  }

  private click5() {
    return this.selfHealingLocator(() => this.page.getByRole('button', { name: /Sign In/i }), () => this.page.getByText(/Sign In/i), 'step-05');
  }

  private fill6() {
    return this.selfHealingLocator(() => this.page.getByRole('searchbox', { name: /Search/i }), () => this.page.locator('text=Search'), 'step-06');
  }

  private click7() {
    return this.selfHealingLocator(() => this.page.locator('[data-product-card]:first-child'), () => this.page.locator('text=First product'), 'step-07');
  }

  private click8() {
    return this.selfHealingLocator(() => this.page.getByRole('button', { name: /Add to Cart/i }), () => this.page.getByText(/Add to Cart/i), 'step-08');
  }

  private assert9() {
    return this.selfHealingLocator(() => this.page.getByRole('status'), () => this.page.getByText(/Cart/i), 'step-09');
  }

  async openHomepage(url: string) {
    await this.page.goto(url);
  }

  async navigateToLoginPage() {
    await this.click2().click();
  }

  async enterValidEmail(value: string) {
    await this.fill3().fill(value);
  }

  async enterValidPassword(value: string) {
    await this.fill4().fill(value);
  }

  async submitLoginForm() {
    await this.click5().click();
  }

  async searchForShoes(value: string) {
    await this.fill6().fill(value);
  }

  async openFirstProduct() {
    await this.click7().click();
  }

  async addProductToCart() {
    await this.click8().click();
  }

  async verifyCartConfirmationAppears() {
    await expect(this.assert9()).toBeVisible();
  }

  private selfHealingLocator(primary: () => Locator, backup: () => Locator, stepId: string) {
    const locator = primary();
    return locator.or(backup()).first().describe(`AI recorder locator for ${stepId}`);
  }
}
