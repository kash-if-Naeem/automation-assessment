import { test, expect } from '../../src/fixtures';
import { AuthPage } from '../../src/pages/AuthPage';

test.describe('Authentication & Registration', () => {
  test('AE-01: Account registration @p0 @smoke', async ({ page, newUser, accountCleanup }) => {
    const authPage = new AuthPage(page);
    await authPage.open();
    await authPage.startSignup(newUser.name, newUser.email);
    await expect(page.getByText(/enter account information/i)).toBeVisible();
    await authPage.completeRegistration(newUser);
    await expect(page.getByText(/account created!/i)).toBeVisible();
    accountCleanup.track(newUser);
    await page.getByRole('link', { name: /continue/i }).click();
    await expect(page.getByText(new RegExp(`Logged in as ${newUser.name}`, 'i'))).toBeVisible();
  });

  test('AE-02: Valid login and logout @p0 @smoke', async ({ page, registerUser, newUser }) => {
    await registerUser(newUser);
    await page.getByRole('link', { name: /logout/i }).click();
    const authPage = new AuthPage(page);
    await authPage.open();
    await authPage.login(newUser.email, newUser.password);
    await expect(page.getByText(new RegExp(`Logged in as ${newUser.name}`, 'i'))).toBeVisible();
    await page.getByRole('link', { name: /logout/i }).click();
    await expect(page.getByText(/login to your account/i)).toBeVisible();
  });

  test('AE-03: Invalid login (negative) @p0', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.open();
    await authPage.login('invalid_user_123@example-test.invalid', 'WrongPassword!123');
    await expect(authPage.loginError).toBeVisible();
    await expect(page.getByText(/logged in as/i)).toHaveCount(0);
  });

  test('AE-04: Duplicate registration (negative) @p1', async ({ page, registerUser, newUser }) => {
    await registerUser(newUser);
    await page.getByRole('link', { name: /logout/i }).click();
    const authPage = new AuthPage(page);
    await authPage.open();
    await authPage.startSignup('Duplicate Name', newUser.email);
    await expect(authPage.signupError).toBeVisible();
  });
});
