import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly subscriptionEmail: Locator = this.page.locator('#susbscribe_email');
  readonly subscriptionSubmit: Locator = this.page.locator('#subscribe');
  readonly recommendedHeading: Locator = this.page.getByRole('heading', { name: /recommended items/i });
  readonly recommendedCarousel: Locator = this.page.locator('#recommended-item-carousel');

  async open(): Promise<void> {
    await this.goto('/');
  }

  async subscribe(email: string): Promise<void> {
    await this.subscriptionEmail.fill(email);
    await this.subscriptionSubmit.click();
    await this.logAction(`subscribed ${email}`);
  }
}
