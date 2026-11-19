import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductDetailPage extends BasePage {
  readonly productName: Locator = this.page.locator('.product-information h2');
  readonly productPrice: Locator = this.page.locator('.product-information span span');
  readonly quantityInput: Locator = this.page.locator('input#quantity');
  readonly addToCartButton: Locator = this.page.getByRole('button', { name: /add to cart/i });
  readonly viewCartModalLink: Locator = this.page.getByRole('link', { name: /view cart/i });
  readonly reviewName: Locator = this.page.locator('input#name');
  readonly reviewEmail: Locator = this.page.locator('input#email');
  readonly reviewText: Locator = this.page.locator('textarea#review');
  readonly reviewSubmit: Locator = this.page.getByRole('button', { name: /submit/i });

  async setQuantity(qty: number): Promise<void> {
    await this.quantityInput.fill(String(qty));
  }

  async addToCart(qty = 1): Promise<void> {
    await this.setQuantity(qty);
    await this.addToCartButton.click();
    await this.viewCartModalLink.waitFor({ state: 'visible' });
    await this.logAction(`added qty ${qty}`);
  }

  async viewCart(): Promise<void> {
    await this.viewCartModalLink.click();
  }

  async submitReview(name: string, email: string, text: string): Promise<void> {
    await this.reviewName.fill(name);
    await this.reviewEmail.fill(email);
    await this.reviewText.fill(text);
    await this.reviewSubmit.click();
    await this.logAction('submitted review');
  }

  async getProductName(): Promise<string> {
    return (await this.productName.textContent())?.trim() ?? '';
  }

  async getProductPrice(): Promise<string> {
    return (await this.productPrice.first().textContent())?.trim() ?? '';
  }
}
