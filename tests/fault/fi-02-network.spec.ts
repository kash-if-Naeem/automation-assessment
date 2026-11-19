import { test } from '../../src/fixtures';
import { ProductsPage } from '../../src/pages/ProductsPage';
import { env } from '../../config/environment';

/**
 * FI-02: test-controlled network fault. Runs only with FAULT_INJECTION=FI-02.
 * The route abort is scoped to this page only and targets the products document.
 * Expected: the test fails with net::ERR_FAILED, and RCA must classify
 * ENVIRONMENT_OR_NETWORK (an injected fault), not PRODUCT_DEFECT.
 */
test.describe('Fault injection', () => {
  test.skip(env.faultInjection !== 'FI-02', 'Set FAULT_INJECTION=FI-02 to run');

  test('FI-02: injected abort of the products page request @fault', async ({ page }) => {
    await page.route('**/products', (route) => route.abort('failed'));
    await new ProductsPage(page).open();
  });
});
