import { test } from '../../src/fixtures';
import { ProductsPage } from '../../src/pages/ProductsPage';
import { env } from '../../config/environment';

/**
 * FI-02: test-controlled network fault. Runs only with FAULT_INJECTION=FI-02 or =all.
 * The route abort is scoped to this page only and targets the products document, so
 * nothing outside this test context is affected and no load is placed on the site.
 *
 * Expected: the test fails with net::ERR_FAILED, and RCA must classify
 * ENVIRONMENT_OR_NETWORK (an injected fault), never PRODUCT_DEFECT.
 */
test.describe('Fault injection FI-02 (network)', () => {
  test.skip(!['FI-02', 'all'].includes(env.faultInjection), 'Set FAULT_INJECTION=FI-02 to run');

  test('FI-02: injected abort of the products page request @fault', async ({ page }) => {
    await page.route('**/products', (route) => route.abort('failed'));
    await new ProductsPage(page).open();
  });
});
