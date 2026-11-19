import { test, expect } from '../../src/fixtures';
import { ProductsPage } from '../../src/pages/ProductsPage';
import { ProductDetailPage } from '../../src/pages/ProductDetailPage';
import { CartPage } from '../../src/pages/CartPage';
import { CheckoutPage } from '../../src/pages/CheckoutPage';
import { PaymentPage } from '../../src/pages/PaymentPage';
import { TestUser } from '../../src/fixtures/user-data';
import { expectedCartTotal, expectedLineTotal, norm, parsePrice } from '../../src/utils/calculations';
import { inspectInvoice } from '../../src/utils/invoice';

/** Address oracle: the checkout block must contain the key fields of the fixture user. */
function expectAddressMatchesFixture(text: string, u: TestUser): void {
  for (const value of [u.firstName, u.lastName, u.address1, u.city, u.zipcode, u.country]) {
    expect(text, `address should contain "${value}"`).toContain(value);
  }
}

test.describe('Checkout & Orders', () => {
  test('AE-15: Customer purchase journey (flagship) @p0 @smoke', async ({ page, newUser, registerUser }, testInfo) => {
    const products = new ProductsPage(page);
    const detail = new ProductDetailPage(page);
    const cart = new CartPage(page);
    const checkout = new CheckoutPage(page);
    const payment = new PaymentPage(page);
    let listing = { name: '', price: '' };

    await test.step('AE-15 | P0 | search known product; capture listing name and price', async () => {
      await products.open();
      await products.search('Top');
      listing = await products.firstProduct();
      expect(listing.name).not.toBe('');
      expect(listing.price).toMatch(/Rs\.\s*\d+/);
    });

    let unit1 = 0;
    await test.step('AE-15 | P0 | product detail: qty 4 added; name, qty and total verified', async () => {
      await products.openFirstProductDetail();
      expect(norm(await detail.getProductName()).toLowerCase()).toContain(norm(listing.name).toLowerCase());
      unit1 = parsePrice(await detail.getProductPrice());
      expect(unit1).toBe(parsePrice(listing.price));
      await detail.addToCart(4);
      await detail.viewCart();
      const lines = await cart.readLines();
      expect(lines).toHaveLength(1);
      expect(lines[0].quantity).toBe(4);
      expect(parsePrice(lines[0].lineTotal)).toBe(expectedLineTotal(unit1, 4));
    });

    await test.step('AE-15 | P0 | second distinct product added; both line totals verified', async () => {
      await products.open();
      const second = await products.addProductAt(1);
      await products.viewCartFromModal();
      const lines = await cart.readLines();
      expect(lines).toHaveLength(2);
      const line2 = lines.find((l) => norm(l.description) === norm(second.name));
      expect(line2, 'second product present in cart').toBeDefined();
      expect(line2!.quantity).toBe(1);
      expect(parsePrice(line2!.lineTotal)).toBe(expectedLineTotal(parsePrice(second.price), 1));
    });

    await test.step('AE-15 | P0 | overall arithmetic verified where the cart presents a total', async () => {
      const lines = await cart.readLines();
      const expected = expectedCartTotal(
        lines.map((l) => ({ unitPrice: parsePrice(l.unitPrice), quantity: l.quantity })),
      );
      const shown = await cart.grandTotalIfPresent();
      if (shown === null) {
        testInfo.annotations.push({
          type: 'observation',
          description: 'cart shows no grand total; line totals checked only',
        });
      } else {
        expect(shown).toBe(expected);
      }
    });

    await test.step('AE-15 | P0 | registration at checkout; cart contents survive', async () => {
      await cart.proceed();
      if (await checkout.needsLogin()) {
        await registerUser(newUser);
        await cart.open();
        expect(await cart.lineCount()).toBe(2);
        await cart.proceed();
      }
      await expect(checkout.deliveryAddress).toBeVisible();
    });

    await test.step('AE-16 | P0 | delivery and billing addresses match fixture', async () => {
      const delivery = (await checkout.readAddress('delivery')).join(' ');
      const billing = (await checkout.readAddress('billing')).join(' ');
      expectAddressMatchesFixture(delivery, newUser);
      expect(norm(billing)).toBe(norm(delivery));
    });

    await test.step('AE-15 | P0 | order comment, dummy payment, success confirmed', async () => {
      await checkout.fillComment('QA automated order comment');
      await checkout.submitOrder();
      await payment.payWithDummyCard(newUser.name);
      await payment.waitForOrderPlaced();
      await expect(payment.orderConfirmed).toBeVisible();
    });

    await test.step('AE-17 | P1 | invoice downloaded via download event and plausible', async () => {
      const { filePath, suggestedFilename } = await payment.downloadInvoiceTo(testInfo.outputPath());
      const check = inspectInvoice(filePath);
      await testInfo.attach(`invoice-${suggestedFilename}`, { path: filePath });
      expect(check.plausible, check.notes.join('; ')).toBe(true);
      expect(check.detectedType).not.toBe('other');
    });
  });

  test('AE-16: Address consistency on checkout (delivery = billing = fixture) @p0', async ({
    page,
    registerUser,
    newUser,
  }) => {
    await registerUser(newUser);
    const products = new ProductsPage(page);
    await products.open();
    await products.addFirstProductToCart();
    await products.viewCartFromModal();

    await new CartPage(page).proceed();
    const checkout = new CheckoutPage(page);
    await expect(checkout.deliveryAddress).toBeVisible();
    const delivery = (await checkout.readAddress('delivery')).join(' ');
    const billing = (await checkout.readAddress('billing')).join(' ');
    expectAddressMatchesFixture(delivery, newUser);
    expect(norm(billing)).toBe(norm(delivery));
  });

  test('AE-17: Invoice download after a completed order @p1', async ({ page, registerUser, newUser }, testInfo) => {
    await registerUser(newUser);
    const products = new ProductsPage(page);
    await products.open();
    await products.addFirstProductToCart();
    await products.viewCartFromModal();
    await new CartPage(page).proceed();

    await new CheckoutPage(page).submitOrder();
    const payment = new PaymentPage(page);
    await payment.payWithDummyCard(newUser.name);
    await payment.waitForOrderPlaced();

    const { filePath, suggestedFilename } = await payment.downloadInvoiceTo(testInfo.outputPath());
    const check = inspectInvoice(filePath);
    await testInfo.attach(`invoice-${suggestedFilename}`, { path: filePath });
    expect(check.plausible, check.notes.join('; ')).toBe(true);
  });
});
