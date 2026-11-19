import { test as base, expect } from '@playwright/test';
import { AutomationExerciseApi } from '../api/client';
import { env } from '../../config/environment';
import { AuthPage } from '../pages/AuthPage';
import { CleanupRegistry } from '../utils/cleanup';
import { redact } from '../utils/logger';
import { TestUser, generateTestUser } from './user-data';

export interface AccountFixtures {
  newUser: TestUser;
  api: AutomationExerciseApi;
  /** Registers through the UI, tracks the account for teardown, and returns it. */
  registerUser: (user?: TestUser) => Promise<TestUser>;
  /** Teardown registry: tests call track() for accounts they create themselves. */
  accountCleanup: { track: (u: TestUser) => void };
}

export const test = base.extend<AccountFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires an object pattern here
  newUser: async ({}, use) => {
    await use(generateTestUser());
  },

  api: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: env.apiUrl.endsWith('/') ? env.apiUrl : `${env.apiUrl}/`,
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    await use(new AutomationExerciseApi(ctx));
    await ctx.dispose();
  },

  // Auto fixture: teardown runs on pass AND fail. Each tracked account is deleted through
  // the public deleteAccount endpoint (API 12), and the status is attached as evidence.
  accountCleanup: [
    async ({ api }, use, testInfo) => {
      const registry = new CleanupRegistry();
      await use({
        track: (u: TestUser) =>
          registry.register(`deleteAccount ${u.email}`, async () => {
            const { body } = await api.deleteAccount(u.email, u.password);
            if (body.responseCode !== 200) throw new Error(`responseCode ${body.responseCode}`);
          }),
      });
      const status = await registry.runAll();
      await testInfo.attach('cleanup-status.json', {
        body: redact(JSON.stringify(status, null, 2)),
        contentType: 'application/json',
      });
      if (status.failed.length > 0) {
        testInfo.annotations.push({ type: 'cleanup-failed', description: `${status.failed.length} account(s)` });
      }
    },
    { auto: true },
  ],

  registerUser: async ({ page, newUser, accountCleanup }, use) => {
    await use(async (user?: TestUser) => {
      const u = user ?? newUser;
      const auth = new AuthPage(page);
      await auth.open();
      await auth.startSignup(u.name, u.email);
      await auth.completeRegistration(u);
      await expect(page.getByText('Account Created!')).toBeVisible();
      accountCleanup.track(u);
      await page.getByRole('link', { name: /continue/i }).click();
      return u;
    });
  },
});

export { expect } from '@playwright/test';
