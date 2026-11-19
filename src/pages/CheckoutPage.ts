import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface AddressBlock {
  heading: string;
  lines: string[];
}

export class CheckoutPage extends BasePage {
  readonly deliveryAddress: Locator = this.page.locator('#address_delivery');
  readonly billingAddress: Locator = this.page.locator('#address_invoice');
  readonly orderComment: Locator = this.page.locator('textarea[name="message"]');
  readonly placeOrder: Locator = this.page.getByRole('link', { name: /place order/i });
  readonly registerLoginLink: Locator = this.page.getByRole('link', { name: /register \/ login/i });
  readonly orderRows: Locator = this.page.locator('#cart_info tbody tr');

  async isOnCheckout(): Promise<boolean> {
    return this.deliveryAddress.isVisible().catch(() => false);
  }

  async needsLogin(): Promise<boolean> {
    return this.registerLoginLink.isVisible().catch(() => false);
  }

  async readAddress(which: 'delivery' | 'billing'): Promise<string[]> {
    const block = which === 'delivery' ? this.deliveryAddress : this.billingAddress;
    const text = await block.innerText();
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/your (delivery|billing) address/i.test(l));
  }

  async fillComment(text: string): Promise<void> {
    await this.orderComment.fill(text);
  }

  async submitOrder(): Promise<void> {
    await this.placeOrder.click();
    await this.logAction('submitted order');
  }

  async lineCount(): Promise<number> {
    return this.orderRows.count();
  }
}
