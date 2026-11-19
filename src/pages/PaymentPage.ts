import { Locator } from '@playwright/test';
import path from 'path';
import { BasePage } from './BasePage';

export class PaymentPage extends BasePage {
  readonly nameOnCard: Locator = this.page.locator('input[data-qa="name-on-card"]');
  readonly cardNumber: Locator = this.page.locator('input[data-qa="card-number"]');
  readonly cvc: Locator = this.page.locator('input[data-qa="cvc"]');
  readonly expiryMonth: Locator = this.page.locator('input[data-qa="expiry-month"]');
  readonly expiryYear: Locator = this.page.locator('input[data-qa="expiry-year"]');
  readonly payButton: Locator = this.page.getByRole('button', { name: /pay and confirm order/i });
  readonly orderPlacedHeading: Locator = this.page.getByText(/order placed!/i);
  readonly orderConfirmed: Locator = this.page.getByText(/congratulations! your order has been confirmed!/i);
  readonly downloadInvoice: Locator = this.page.getByRole('link', { name: /download invoice/i });

  /**
   * Fills ONLY invented dummy card details for this practice site (no real card data).
   * 4111 1111 1111 1111 is a widely published test number, not a real account.
   */
  async payWithDummyCard(nameOnCard: string): Promise<void> {
    await this.nameOnCard.fill(nameOnCard);
    await this.cardNumber.fill('4111111111111111');
    await this.cvc.fill('123');
    await this.expiryMonth.fill('12');
    await this.expiryYear.fill('2030');
    await this.payButton.click();
    await this.logAction('paid with dummy card');
  }

  async waitForOrderPlaced(): Promise<void> {
    await this.orderPlacedHeading.waitFor({ state: 'visible' });
  }

  /** Saves the invoice into dir via the Playwright download event. */
  async downloadInvoiceTo(dir: string): Promise<{ filePath: string; suggestedFilename: string }> {
    const [download] = await Promise.all([this.page.waitForEvent('download'), this.downloadInvoice.click()]);
    const suggestedFilename = download.suggestedFilename();
    const filePath = path.join(dir, suggestedFilename);
    await download.saveAs(filePath);
    await this.logAction(`saved invoice ${suggestedFilename}`);
    return { filePath, suggestedFilename };
  }
}
