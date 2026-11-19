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

/** One console error or uncaught page exception. */
interface ConsoleEntry {
  type: string;
  text: string;
  location?: string;
}

/** One failed, error-status or unusually slow request, with query strings stripped. */
interface NetworkEntry {
  method: string;
  url: string;
  status?: number;
  failure?: string;
  duration_ms?: number;
  slow?: boolean;
}

/** A response slower than this is recorded so RCA can tell "late" from "missing". */
const SLOW_RESPONSE_MS = 2_000;

/** Query strings can carry test data, so only the path is retained. */
function sanitiseUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return redact(raw.split('?')[0]);
  }
}

export const test = base.extend<AccountFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires an object pattern here
  newUser: async ({}, use) => {
    await use(generateTestUser());
  },

  /**
   * Overrides the built-in page to record RCA Collect-stage evidence: console errors,
   * uncaught exceptions, failed and 4xx/5xx requests, and a DOM snapshot. Attached only
   * when the test did not reach its expected status, so passing runs stay small.
   * API-only tests never resolve `page`, so they pay nothing for this.
   */
  page: async ({ page }, use, testInfo) => {
    const consoleEntries: ConsoleEntry[] = [];
    const networkEntries: NetworkEntry[] = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error' && msg.type() !== 'warning') return;
      consoleEntries.push({
        type: msg.type(),
        text: redact(msg.text()).slice(0, 500),
        location: msg.location()?.url ? sanitiseUrl(msg.location().url) : undefined,
      });
    });
    page.on('pageerror', (err) => {
      consoleEntries.push({ type: 'pageerror', text: redact(err.message).slice(0, 500) });
    });
    // Request start times, so a slow response can be distinguished from a missing element.
    const startedAt = new Map<unknown, number>();
    page.on('request', (req) => startedAt.set(req, Date.now()));
    page.on('requestfailed', (req) => {
      startedAt.delete(req);
      networkEntries.push({
        method: req.method(),
        url: sanitiseUrl(req.url()),
        failure: req.failure()?.errorText,
      });
    });
    page.on('response', (res) => {
      const req = res.request();
      const began = startedAt.get(req);
      startedAt.delete(req);
      const duration = began ? Date.now() - began : undefined;
      const slow = duration !== undefined && duration >= SLOW_RESPONSE_MS;
      if (res.status() < 400 && !slow) return;
      networkEntries.push({
        method: req.method(),
        url: sanitiseUrl(res.url()),
        status: res.status(),
        duration_ms: duration,
        slow: slow || undefined,
      });
    });

    await use(page);

    if (testInfo.status === testInfo.expectedStatus) return;

    // Evidence capture must never mask the original failure.
    try {
      await testInfo.attach('console-errors.json', {
        body: JSON.stringify(consoleEntries.slice(-50), null, 2),
        contentType: 'application/json',
      });
      await testInfo.attach('network-failures.json', {
        body: JSON.stringify(networkEntries.slice(-50), null, 2),
        contentType: 'application/json',
      });
      if (!page.isClosed()) {
        await testInfo.attach('dom-snapshot.html', {
          body: redact(await page.content()).slice(0, 500_000),
          contentType: 'text/html',
        });
      }
    } catch {
      // Ignore: the page may already be gone when the test failed hard.
    }
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
