import { test, expect } from '../../src/fixtures';
import { env } from '../../config/environment';

/**
 * FI-03 (stretch): controlled timing fault. Runs only with FAULT_INJECTION=FI-03 or =all.
 *
 * The delay lives inside the route interceptor, not in the test body: the assessment bans
 * arbitrary sleeps as a synchronisation tool, but an injected slow response is the fault
 * under study.
 *
 * The assertion deliberately races the navigation instead of following it. Awaiting goto
 * first would simply absorb the delay and the test would pass, which is what happened on
 * the first attempt at this exercise. Racing it means the element is genuinely late rather
 * than absent — exactly the distinction the RCA has to make.
 *
 * Three identical attempts establish the repeat count: a timing fault that reproduces 3/3
 * is deterministic, not flaky-by-chance.
 *
 * Expected RCA: TIMING_OR_FLAKINESS (via the slow-response discriminator), never
 * PRODUCT_DEFECT and not LOCATOR_OR_UI_CHANGE.
 */
const INJECTED_DELAY_MS = 5_000;
const ASSERTION_BUDGET_MS = 1_000;
const ATTEMPTS = 3;

test.describe('Fault injection FI-03 (timing)', () => {
  test.skip(!['FI-03', 'all'].includes(env.faultInjection), 'Set FAULT_INJECTION=FI-03 to run');
  // No retries: a retry would mask the very reproducibility this exercise measures.
  test.describe.configure({ retries: 0 });

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    test(`FI-03: delayed products response breaks a short synchronisation budget (attempt ${attempt}/${ATTEMPTS}) @fault`, async ({
      page,
    }) => {
      await page.route('**/products', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, INJECTED_DELAY_MS));
        await route.continue();
      });

      // Start navigating, then assert against a budget shorter than the injected delay.
      const navigation = page.goto('/products').catch(() => undefined);
      try {
        await expect(page.locator('.features_items')).toBeVisible({ timeout: ASSERTION_BUDGET_MS });
      } finally {
        // Let the delayed response land so the slow timing is recorded as evidence.
        await navigation;
      }
    });
  }
});
