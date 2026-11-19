import { test, expect } from '../../src/fixtures';
import { ProductsPage } from '../../src/pages/ProductsPage';
import { ProductDetailPage } from '../../src/pages/ProductDetailPage';
import { CartPage } from '../../src/pages/CartPage';
import { expectedLineTotal, norm, parsePrice } from '../../src/utils/calculations';

test.describe('Shopping Cart', () => {
  test('AE-11: Cart holds multiple distinct items @p0 @smoke', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.open();
    const first = await productsPage.addProductAt(0);
    await productsPage.continueShoppingFromModal();
    const second = await productsPage.addProductAt(1);
    await productsPage.viewCartFromModal();

    const lines = await new CartPage(page).readLines();
    expect(lines).toHaveLength(2);
    const descriptions = lines.map((l) => norm(l.description));
    expect(descriptions).toContain(norm(first.name));
    expect(descriptions).toContain(norm(second.name));
  });

  test('AE-12: Quantity 4 gives the correct line total @p0', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.open();
    await productsPage.openFirstProductDetail();

    const detail = new ProductDetailPage(page);
    const unitPrice = parsePrice(await detail.getProductPrice());
    await detail.addToCart(4);
    await detail.viewCart();

    const lines = await new CartPage(page).readLines();
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(4);
    expect(parsePrice(lines[0].lineTotal)).toBe(expectedLineTotal(unitPrice, 4));
  });

  test('AE-13: Remove item from cart @p0', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.open();
    const item = await productsPage.addFirstProductToCart();
    await productsPage.viewCartFromModal();

    const cart = new CartPage(page);
    await expect(cart.cartRows).toHaveCount(1);
    await cart.removeByDescription(norm(item.name));
    await expect(cart.emptyCart).toBeVisible();
  });

  test('AE-14: Cart persists after login @p0', async ({ page, registerUser, newUser }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.open();
    const item = await productsPage.addFirstProductToCart();
    await productsPage.continueShoppingFromModal();

    await registerUser(newUser);
    const cart = new CartPage(page);
    await cart.open();
    const lines = await cart.readLines();
    expect(lines).toHaveLength(1);
    expect(norm(lines[0].description)).toBe(norm(item.name));
  });
});
