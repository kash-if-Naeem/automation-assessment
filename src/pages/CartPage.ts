import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { parsePrice } from '../utils/calculations';

export interface CartLine {
  /** Product name only (the category line in the same cell is excluded). */
  description: string;
  /** Id from the product link (/product_details/<id>). */
  productId: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export class CartPage extends BasePage {
  /** Item rows only: the table also has layout rows without a quantity cell. */
  readonly cartRows: Locator = this.page
    .locator('#cart_info_table tbody tr')
    .filter({ has: this.page.locator('.cart_quantity') });
  // Rendered as a non-link element on this site, so match by text rather than role.
  readonly proceedToCheckout: Locator = this.page.getByText(/proceed to checkout/i).first();
  readonly emptyCart: Locator = this.page.getByText(/cart is empty/i);
  readonly totalAmount: Locator = this.page
    .locator('.total-area tr')
    .filter({ hasText: /total amount/i })
    .locator('td')
    .last();

  async open(): Promise<void> {
    await this.goto('/view_cart');
  }

  /**
   * Waits until the cart has rendered items or the empty message. The empty text can exist
   * hidden in the DOM, so the check is on visibility of the first match, retried by expect.poll.
   */
  async waitForSettled(): Promise<void> {
    await expect
      .poll(
        async () =>
          (await this.cartRows.count()) > 0 ||
          (await this.emptyCart
            .first()
            .isVisible()
            .catch(() => false)),
      )
      .toBe(true);
  }

  async readLines(): Promise<CartLine[]> {
    await this.waitForSettled();
    const n = await this.cartRows.count();
    const out: CartLine[] = [];
    for (let i = 0; i < n; i++) {
      const row = this.cartRows.nth(i);
      const href = (await row.locator('a[href*="/product_details/"]').first().getAttribute('href')) ?? '';
      out.push({
        description: (await row.locator('.cart_description h4, .cart_description a').first().innerText()).trim(),
        productId: href.match(/(\d+)\/?$/)?.[1] ?? '',
        unitPrice: (await row.locator('.cart_price').innerText()).trim(),
        quantity: Number((await row.locator('.cart_quantity').innerText()).trim()),
        lineTotal: (await row.locator('.cart_total').innerText()).trim(),
      });
    }
    return out;
  }

  async lineCount(): Promise<number> {
    await this.waitForSettled();
    return this.cartRows.count();
  }

  /** The grand total is shown on some cart layouts only; returns null when absent. */
  async grandTotalIfPresent(): Promise<number | null> {
    if (!(await this.totalAmount.isVisible())) return null;
    return parsePrice((await this.totalAmount.innerText()).trim());
  }

  async removeByDescription(description: string): Promise<void> {
    await this.cartRows.filter({ hasText: description }).first().locator('a.cart_quantity_delete').click();
    await this.logAction(`removed ${description}`);
  }

  async proceed(): Promise<void> {
    await this.proceedToCheckout.click();
  }
}
