import { test, expect } from '../../src/fixtures';
import { ProductsPage } from '../../src/pages/ProductsPage';

test.describe('Catalogue & Search', () => {
  test('AE-06: Product catalogue @p0 @smoke', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.open();
    await expect(productsPage.productCards.first()).toBeVisible();
    expect(await productsPage.productCount()).toBeGreaterThan(0);
    const first = await productsPage.firstProduct();
    expect(first.name).not.toBe('');
    expect(first.price).toMatch(/Rs\.\s*\d+/);
  });

  test('AE-07: Search relevance @p0', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.open();
    await productsPage.search('Top');
    await expect(productsPage.searchedProductsHeading).toBeVisible();
    await expect(productsPage.productCards.first()).toBeVisible();
    expect((await productsPage.firstProduct()).name.toLowerCase()).toContain('top');
  });

  test('AE-08: Search with no matches (negative) @p1', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.open();
    await productsPage.search('NonExistentProductXYZ_999');
    await expect(productsPage.searchedProductsHeading).toBeVisible();
    await expect(productsPage.productCards).toHaveCount(0);
  });

  test('AE-09: Category filtering @p1', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.open();
    await productsPage.openCategory('Women', 'Dress');
    await expect(page.getByRole('heading', { name: /women - dress products/i })).toBeVisible();
    await expect(productsPage.productCards.first()).toBeVisible();
  });

  test('AE-10: Brand filtering @p1', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.open();
    await productsPage.openBrand('Polo');
    await expect(page.getByRole('heading', { name: /brand - polo products/i })).toBeVisible();
    await expect(productsPage.productCards.first()).toBeVisible();
    await expect(page.locator('.features_items')).toContainText(/polo/i);
  });
});
