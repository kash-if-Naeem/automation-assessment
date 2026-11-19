import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { TestUser } from '../fixtures/user-data';

export class AuthPage extends BasePage {
  readonly loginEmail: Locator = this.page.locator('input[data-qa="login-email"]');
  readonly loginPassword: Locator = this.page.locator('input[data-qa="login-password"]');
  readonly loginButton: Locator = this.page.getByRole('button', { name: /^login$/i });

  readonly signupName: Locator = this.page.locator('input[data-qa="signup-name"]');
  readonly signupEmail: Locator = this.page.locator('input[data-qa="signup-email"]');
  readonly signupButton: Locator = this.page.getByRole('button', { name: /^signup$/i });

  // Exposed as locators so tests can use auto-retrying web-first assertions.
  readonly loginError: Locator = this.page.getByText(/your email or password is incorrect/i);
  readonly signupError: Locator = this.page.getByText(/email address already exist/i);

  async open(): Promise<void> {
    await this.goto('/login');
    await this.logAction('opened login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);
    await this.loginButton.click();
    await this.logAction('submitted login');
  }

  async startSignup(name: string, email: string): Promise<void> {
    await this.signupName.fill(name);
    await this.signupEmail.fill(email);
    await this.signupButton.click();
    await this.logAction('started signup');
  }

  /** Account-information form. Used by the registerUser fixture and by AE-01 directly. */
  async completeRegistration(u: TestUser): Promise<void> {
    await this.page.locator(u.title === 'Mr' ? '#id_gender1' : '#id_gender2').check();
    await this.page.locator('input[data-qa="password"]').fill(u.password);
    await this.page.locator('select[data-qa="days"]').selectOption(u.birthDay);
    await this.page.locator('select[data-qa="months"]').selectOption(u.birthMonth);
    await this.page.locator('select[data-qa="years"]').selectOption(u.birthYear);
    await this.page.locator('input[data-qa="first_name"]').fill(u.firstName);
    await this.page.locator('input[data-qa="last_name"]').fill(u.lastName);
    await this.page.locator('input[data-qa="company"]').fill(u.company);
    await this.page.locator('input[data-qa="address"]').fill(u.address1);
    await this.page.locator('input[data-qa="address2"]').fill(u.address2);
    await this.page.locator('select[data-qa="country"]').selectOption(u.country);
    await this.page.locator('input[data-qa="state"]').fill(u.state);
    await this.page.locator('input[data-qa="city"]').fill(u.city);
    await this.page.locator('input[data-qa="zipcode"]').fill(u.zipcode);
    await this.page.locator('input[data-qa="mobile_number"]').fill(u.mobileNumber);
    await this.page.getByRole('button', { name: /create account/i }).click();
    await this.logAction('completed registration');
  }
}
