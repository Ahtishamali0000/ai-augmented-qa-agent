import { expect, type Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';
import { PopupHandler } from '../components/PopupHandler';
import { createRegistrationUser, type RegistrationUser } from '../utils/testData';

export class AuthPage {
  readonly header: HeaderComponent;
  readonly popupHandler: PopupHandler;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.popupHandler = new PopupHandler(page);
  }

  async openFromHome() {
    await this.page.goto('/');
    await this.popupHandler.closeNonAuthPopups();
    await this.header.openAccount();
  }

  async login(email: string, password: string) {
    await this.openFromHome();
    const emailField = this.page.getByLabel(/email/i).or(this.page.getByPlaceholder(/email/i)).first();
    const passwordField = this.page.getByLabel(/password/i).or(this.page.getByPlaceholder(/password/i)).first();

    await emailField.click();
    await emailField.pressSequentially(email);
    await passwordField.click();
    await passwordField.pressSequentially(password);
    await this.page.getByRole('button', { name: /sign in|login|log in/i }).click();
  }

  async goToRegistration() {
    await this.openFromHome();
    await this.page.getByRole('link', { name: /register|create account|join/i }).or(this.page.getByRole('button', { name: /register|create account|join/i })).first().click();
  }

  async fillRegistrationForm(user: RegistrationUser = createRegistrationUser()) {
    const firstName = this.page.getByLabel(/first name/i).or(this.page.getByPlaceholder(/first name/i)).first();
    const lastName = this.page.getByLabel(/last name/i).or(this.page.getByPlaceholder(/last name/i)).first();
    const email = this.page.getByLabel(/^email/i).or(this.page.getByPlaceholder(/^email/i)).first();
    const password = this.page.getByLabel(/^password/i).or(this.page.getByPlaceholder(/^password/i)).first();
    const phone = this.page.getByLabel(/phone|mobile/i).or(this.page.getByPlaceholder(/phone|mobile/i)).first();

    await firstName.fill(user.firstName);
    await lastName.fill(user.lastName);
    await email.click();
    await email.pressSequentially(user.email);
    await password.click();
    await password.pressSequentially(user.password);

    if (await phone.isVisible({ timeout: 1000 }).catch(() => false)) {
      await phone.fill(user.phone);
    }

    return user;
  }

  async submitRegistration() {
    await this.page.getByRole('button', { name: /register|create account|join|submit/i }).click();
  }

  async expectAuthSurfaceVisible() {
    await expect(this.page.getByLabel(/email/i).or(this.page.getByPlaceholder(/email/i)).first()).toBeVisible();
  }
}
