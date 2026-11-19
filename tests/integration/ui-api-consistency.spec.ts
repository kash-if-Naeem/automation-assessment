import { test, expect } from '../../src/fixtures';
import { ProductsPage } from '../../src/pages/ProductsPage';
import { norm } from '../../src/utils/calculations';

test.describe('UI / API consistency (AE-24)', () => {
  test('AE-24: first UI products exist in the API list with the same price @p1', async ({ page, api }) => {
    const apiList = await api.productsList();
    const byName = new Map(apiList.body.products.map((p) => [norm(p.name).toLowerCase(), p]));

    const products = new ProductsPage(page);
    await products.open();
    const count = Math.min(await products.productCount(), 5);
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const ui = await products.summaryAt(i);
      const match = byName.get(norm(ui.name).toLowerCase());
      expect(match, `UI product "${ui.name}" missing from API list`).toBeDefined();
      expect(norm(ui.price)).toBe(norm(match!.price));
    }
  });

  test('AE-24: UI brand sidebar entries exist in the API brands list @p1', async ({ page, api }) => {
    const apiBrands = new Set((await api.brandsList()).body.brands.map((b) => norm(b.brand).toLowerCase()));
    await new ProductsPage(page).open();
    const uiBrands = page.locator('.brands_products a');
    const n = await uiBrands.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      // Sidebar text is "(6) POLO": the count prefix is not part of the brand name.
      const label = norm((await uiBrands.nth(i).innerText()).replace(/^\(\d+\)\s*/, ''));
      expect(apiBrands.has(label.toLowerCase()), `UI brand "${label}" not in API list`).toBe(true);
    }
  });
});
