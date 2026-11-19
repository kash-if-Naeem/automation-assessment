import path from 'path';
import fs from 'fs';
import { test, expect } from '../../src/fixtures';
import { ProductsPage } from '../../src/pages/ProductsPage';
import { ProductDetailPage } from '../../src/pages/ProductDetailPage';
import { ContactPage } from '../../src/pages/ContactPage';
import { HomePage } from '../../src/pages/HomePage';
import { CartPage } from '../../src/pages/CartPage';
import { norm } from '../../src/utils/calculations';

test.describe('Ancillary Features (Reviews, Contact, Subscriptions)', () => {
  test('AE-18: Product review @p1', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.open();
    await products.openFirstProductDetail();
    await new ProductDetailPage(page).submitReview(
      'QA Reviewer',
      'reviewer@example-test.invalid',
      'Automated test review.',
    );
    await expect(page.getByText(/thank you for your review/i)).toBeVisible();
  });

  test('AE-19: Contact form with file upload @p1', async ({ page }, testInfo) => {
    const dummyFile = path.join(testInfo.outputPath(), 'dummy-upload.txt');
    fs.mkdirSync(path.dirname(dummyFile), { recursive: true });
    fs.writeFileSync(dummyFile, 'Invented dummy content for upload testing.');

    const contact = new ContactPage(page);
    await contact.open();
    await contact.submitContactForm(
      'QA Contact',
      'contact@example-test.invalid',
      'Test Subject',
      'Automated test message.',
      dummyFile,
    );
    await expect(contact.successAlert).toBeVisible();
  });

  test('AE-20: Footer subscription @p2', async ({ page }) => {
    const home = new HomePage(page);
    await home.open();
    await home.subscribe('subscribe@example-test.invalid');
    await expect(page.getByText(/you have been successfully subscribed!/i)).toBeVisible();
  });

  test('AE-21: Recommended item added to cart appears in cart @p2', async ({ page }) => {
    const home = new HomePage(page);
    await home.open();
    await home.recommendedHeading.scrollIntoViewIfNeeded();
    await expect(home.recommendedHeading).toBeVisible();
    const itemName = norm((await home.recommendedCarousel.locator('.productinfo p').first().textContent()) ?? '');
    expect(itemName).not.toBe('');
    await home.recommendedCarousel
      .getByText(/add to cart/i)
      .first()
      .click();
    await page.getByRole('link', { name: /view cart/i }).click();
    const lines = await new CartPage(page).readLines();
    expect(lines.map((l) => norm(l.description))).toContain(itemName);
  });
});
