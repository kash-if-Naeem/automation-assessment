import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ProductSummary {
  name: string;
  price: string;
  /** Stable id from the card's add-to-cart link; the reliable identity for cross-checks. */
  productId: string;
}

export class ProductsPage extends BasePage {
  readonly searchInput: Locator = this.page.locator('input#search_product');
  readonly searchButton: Locator = this.page.locator('button#submit_search');
  readonly searchedProductsHeading: Locator = this.page.getByRole('heading', { name: /searched products/i });
  readonly productCards: Locator = this.page.locator('.features_items .product-image-wrapper');
  readonly viewCartModalLink: Locator = this.page.getByRole('link', { name: /view cart/i });
  readonly continueShopping: Locator = this.page.getByRole('button', { name: /continue shopping/i });

  async open(): Promise<void> {
    await this.goto('/products');
  }

  protected async waitForReady(): Promise<void> {
    await this.page.locator('.features_items').waitFor({ state: 'visible' });
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.logAction(`searched "${term}"`);
  }

  async productCount(): Promise<number> {
    return this.productCards.count();
  }

  async summaryAt(index: number): Promise<ProductSummary> {
    const card = this.productCards.nth(index);
    // Visible text only (innerText): the card can carry hidden duplicates.
    const name = (await card.locator('.productinfo p').first().innerText()).trim();
    const price = (await card.locator('.productinfo h2').first().innerText()).trim();
    const productId = (await card.locator('a.add-to-cart').first().getAttribute('data-product-id')) ?? '';
    return { name, price, productId };
  }

  async firstProduct(): Promise<ProductSummary> {
    return this.summaryAt(0);
  }

  /** Hover to reveal the overlay "Add to cart" button, click it, and wait for the cart modal. */
  async addProductAt(index: number): Promise<ProductSummary> {
    const summary = await this.summaryAt(index);
    const card = this.productCards.nth(index);
    await card.hover();
    await card
      .getByText(/add to cart/i)
      .first()
      .click();
    await this.viewCartModalLink.waitFor({ state: 'visible' });
    await this.logAction(`added to cart: ${summary.name} (id ${summary.productId})`);
    return summary;
  }

  async addFirstProductToCart(): Promise<ProductSummary> {
    return this.addProductAt(0);
  }

  async viewCartFromModal(): Promise<void> {
    await this.viewCartModalLink.click();
  }

  async continueShoppingFromModal(): Promise<void> {
    await this.continueShopping.click();
  }

  async openFirstProductDetail(): Promise<void> {
    await this.productCards
      .first()
      .getByRole('link', { name: /view product/i })
      .click();
  }

  async openCategory(categoryName: string, subCategory?: string): Promise<void> {
    await this.page
      .getByRole('link', { name: new RegExp(categoryName, 'i') })
      .first()
      .click();
    if (subCategory) {
      await this.page
        .getByRole('link', { name: new RegExp(subCategory, 'i') })
        .first()
        .click();
    }
    await this.logAction(`opened category ${categoryName}${subCategory ? '/' + subCategory : ''}`);
  }

  async openBrand(brandName: string): Promise<void> {
    await this.page
      .locator('.brands_products')
      .getByRole('link', { name: new RegExp(brandName, 'i') })
      .first()
      .click();
    await this.logAction(`opened brand ${brandName}`);
  }
}
