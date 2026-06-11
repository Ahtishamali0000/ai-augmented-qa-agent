import { expect, type Locator, type Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';
import { PopupHandler } from '../components/PopupHandler';
import { generateRegistrationData, type RegistrationData } from '../utils/testData';

export class AuthPage {
  readonly header: HeaderComponent;
  readonly popupHandler: PopupHandler;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.popupHandler = new PopupHandler(page);
  }

  async openFromHome() {
    await this.page.goto('/');
    await this.popupHandler.safeCloseAll();
    try {
      await this.header.openAccount();
    } catch (error) {
      if (!this.isOverlayInterception(error)) {
        throw error;
      }

      await this.popupHandler.safeCloseAll();
      await this.header.openAccount();
    }
  }

  async verifyLoginFormVisible() {
    await expect(await this.visibleEmailField()).toBeVisible();
    await expect(await this.visiblePasswordField()).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.openFromHome();
    await this.verifyLoginFormVisible();

    const emailField = await this.visibleEmailField();
    const passwordField = await this.visiblePasswordField();

    await this.fillLoginField(emailField, email);
    await this.fillLoginField(passwordField, password);
    await passwordField.press('Tab');

    const submit = this.loginButton();
    if (!(await submit.isEnabled({ timeout: 3000 }).catch(() => false))) {
      await this.page.getByRole('checkbox', { name: /remember me/i }).click({ timeout: 1000 }).catch(() => undefined);
    }

    await expect(submit, 'Expected sign-in button to be enabled after email and password are entered').toBeEnabled({ timeout: 5000 });
    await submit.click();
  }

  async verifyLoginSubmitted() {
    await expect(this.page.locator('body')).toContainText(/account|logout|sign out|my details|welcome/i);
  }

  async goToRegistration() {
    await this.popupHandler.safeCloseAll();
    await this.registrationEntryPoint().click();
    await this.popupHandler.safeCloseAll();
    await this.page.screenshot({ path: 'reports/after-signup-click.png', fullPage: true });
  }

  async verifyRegistrationFormVisible() {
    const emailFirstVisible = await this.registrationEmailField().isVisible({ timeout: 5000 }).catch(() => false);
    const firstNameVisible = await this.firstNameField().isVisible({ timeout: 1000 }).catch(() => false);
    const passwordVisible = await this.registrationPasswordField().isVisible({ timeout: 1000 }).catch(() => false);

    expect(emailFirstVisible || firstNameVisible || passwordVisible, 'Expected registration form or email-first signup step to be visible').toBeTruthy();
  }

  async fillRegistrationForm(data: RegistrationData = generateRegistrationData()) {
    await this.completeEmailFirstStepIfNeeded(data.email);

    await this.fillVisibleField(this.firstNameField(), data.firstName);
    await this.fillVisibleField(this.lastNameField(), data.lastName);
    await this.fillVisibleField(this.registrationEmailField(), data.email, true);
    await this.fillVisibleField(this.registrationPasswordField(), data.password, true);
    await this.fillVisibleField(this.confirmPasswordField(), data.password, true, false);
    await this.fillVisibleField(this.phoneField(), data.phone, false, false);

    await this.selectDateOfBirth(data.day, data.month, data.year);
    await this.selectCountry(data.country);
    await this.selectAddress(data.address);
    await this.page.screenshot({ path: 'reports/registration-before-submit.png', fullPage: true });

    return data;
  }

  async selectDateOfBirth(day: string, month: string, year: string) {
    await this.selectOptionIfVisible(this.daySelect(), day);
    await this.selectOptionIfVisible(this.monthSelect(), month);
    await this.selectOptionIfVisible(this.yearSelect(), year);
  }

  async selectCountry(countryValue: string) {
    await this.selectOptionIfVisible(this.countrySelect(), countryValue);
  }

  async selectAddress(addressText: string) {
    const address = this.addressField();

    if (await address.isVisible({ timeout: 1000 }).catch(() => false)) {
      await address.click();
      await address.pressSequentially(addressText);
    }
  }

  async verifyCreateAccountButtonEnabled() {
    await expect(this.createAccountButton()).toBeEnabled();
  }

  async submitRegistration() {
    await this.createAccountButton().click();
  }

  async expectAuthSurfaceVisible() {
    await this.verifyLoginFormVisible();
  }

  private async completeEmailFirstStepIfNeeded(email: string) {
    const firstNameVisible = await this.firstNameField().isVisible({ timeout: 1500 }).catch(() => false);

    if (firstNameVisible) {
      return;
    }

    const emailField = this.registrationEmailField();

    if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailField.click();
      await emailField.fill(email);
      await this.page.keyboard.press('Tab');
      await this.page.screenshot({ path: 'reports/registration-after-email.png', fullPage: true });

      if (await this.continueButton().isVisible({ timeout: 1500 }).catch(() => false)) {
        await this.continueButton().click();
      }

      await expect(this.firstNameField().or(this.registrationPasswordField()).first()).toBeVisible({ timeout: 15000 });
    }
  }

  private async fillVisibleField(locator: Locator, value: string, sequential = false, required = true) {
    if (!(await locator.isVisible({ timeout: required ? 5000 : 1000 }).catch(() => false))) {
      if (required) {
        throw new Error(`Required registration field was not visible for value: ${value}`);
      }

      return;
    }

    const currentValue = await locator.inputValue().catch(() => '');
    if (currentValue) {
      return;
    }

    await locator.click();
    if (sequential) {
      await locator.pressSequentially(value);
    } else {
      await locator.fill(value);
    }
  }

  private async fillLoginField(locator: Locator, value: string) {
    await locator.click();
    await locator.fill('');
    await locator.fill(value);
    await locator.evaluate((element) => {
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  private async selectOptionIfVisible(locator: Locator, value: string) {
    if (!(await locator.isVisible({ timeout: 1000 }).catch(() => false))) {
      return;
    }

    await locator.selectOption({ label: value }).catch(async () => {
      await locator.selectOption(value).catch(() => undefined);
    });
  }

  private async visibleEmailField() {
    return this.firstVisible([
      this.page.getByTestId(/login-email|email/i),
      this.page.getByLabel(/^email/i),
      this.page.getByPlaceholder(/^email/i),
      this.page.getByRole('textbox', { name: /^email/i }),
    ]);
  }

  private async visiblePasswordField() {
    return this.firstVisible([
      this.page.getByTestId(/login-password|password/i),
      this.page.getByLabel(/^password/i),
      this.page.getByPlaceholder(/^password/i),
    ]);
  }

  private async firstVisible(locators: Locator[]) {
    for (const locator of locators) {
      const target = locator.first();

      if (await target.isVisible({ timeout: 1500 }).catch(() => false)) {
        return target;
      }
    }

    return locators[0].first();
  }

  private loginButton() {
    return this.page.getByRole('button', { name: /sign in|login|log in/i }).first();
  }

  private registrationEntryPoint() {
    const surface = this.authSurface();

    return surface
      .getByRole('link', { name: /register|create account|join|sign up/i })
      .or(surface.getByRole('button', { name: /register|create account|join|sign up/i }))
      .first();
  }

  private registrationEmailField() {
    const surface = this.authSurface();

    return surface
      .getByTestId(/register-email|signup-email|email/i)
      .or(surface.getByLabel(/^email/i))
      .or(surface.getByPlaceholder(/^email/i))
      .or(surface.getByRole('textbox', { name: /^email/i }))
      .first();
  }

  private firstNameField() {
    const surface = this.authSurface();

    return surface
      .getByTestId(/first-name|firstname/i)
      .or(surface.getByLabel(/first name/i))
      .or(surface.getByPlaceholder(/first name/i))
      .first();
  }

  private lastNameField() {
    const surface = this.authSurface();

    return surface
      .getByTestId(/last-name|lastname/i)
      .or(surface.getByLabel(/last name/i))
      .or(surface.getByPlaceholder(/last name/i))
      .first();
  }

  private registrationPasswordField() {
    const surface = this.authSurface();

    return surface
      .getByTestId(/register-password|signup-password|password/i)
      .or(surface.getByLabel(/^password/i))
      .or(surface.getByPlaceholder(/^password/i))
      .first();
  }

  private confirmPasswordField() {
    const surface = this.authSurface();

    return surface
      .getByTestId(/confirm-password|password-confirmation/i)
      .or(surface.getByLabel(/confirm password|re-enter password/i))
      .or(surface.getByPlaceholder(/confirm password|re-enter password/i))
      .first();
  }

  private phoneField() {
    const surface = this.authSurface();

    return surface
      .getByTestId(/phone|mobile/i)
      .or(surface.getByLabel(/phone|mobile/i))
      .or(surface.getByPlaceholder(/phone|mobile/i))
      .first();
  }

  private daySelect() {
    const surface = this.authSurface();

    return surface.getByLabel(/day/i).or(surface.locator('select[name*="day" i]')).first();
  }

  private monthSelect() {
    const surface = this.authSurface();

    return surface.getByLabel(/month/i).or(surface.locator('select[name*="month" i]')).first();
  }

  private yearSelect() {
    const surface = this.authSurface();

    return surface.getByLabel(/year/i).or(surface.locator('select[name*="year" i]')).first();
  }

  private countrySelect() {
    const surface = this.authSurface();

    return surface.getByLabel(/country/i).or(surface.locator('select[name*="country" i]')).first();
  }

  private addressField() {
    const surface = this.authSurface();

    return surface
      .getByTestId(/address/i)
      .or(surface.getByLabel(/address/i))
      .or(surface.getByPlaceholder(/address/i))
      .first();
  }

  private continueButton() {
    return this.authSurface().getByRole('button', { name: /continue|next|create account|sign up/i }).first();
  }

  private createAccountButton() {
    return this.authSurface().getByRole('button', { name: /create account|register|join|sign up|submit/i }).last();
  }

  private isOverlayInterception(error: unknown) {
    return error instanceof Error && /intercepts pointer events|Timeout.*click|locator\.click/i.test(error.message);
  }

  private authSurface() {
    return this.page
      .getByRole('complementary')
      .or(this.page.getByRole('dialog').filter({ hasText: /sign in|sign up|register|create account/i }))
      .filter({ hasText: /sign in|sign up|register|create account|email/i })
      .first();
  }
}
