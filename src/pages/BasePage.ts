import { Page, Locator } from '@playwright/test';
import { log } from '../utils/logger';

/**
 * Base class for all page objects.
 * Locator policy: prefer role / label / text; use stable attributes only when roles are ambiguous.
 * No fixed sleeps. No blanket force clicks.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to a path relative to baseURL. */
  async goto(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  /** Override in subclasses to wait for a page-specific ready marker. */
  protected async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Top navigation link by accessible name. */
  nav(linkName: RegExp | string): Locator {
    return this.page.getByRole('link', { name: linkName }).first();
  }

  async clickNav(linkName: RegExp | string): Promise<void> {
    await this.nav(linkName).click();
    await this.waitForReady();
  }

  /** Dismiss a modal if present (site occasionally shows overlays). */
  async dismissOverlayIfPresent(): Promise<void> {
    const closeBtn = this.page.getByRole('button', { name: /close|dismiss/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click().catch(() => undefined);
    }
  }

  /** Assert on-page heading text without relying on visibility alone. */
  async headingText(): Promise<string> {
    const h = this.page.getByRole('heading').first();
    return (await h.textContent())?.trim() ?? '';
  }

  async logAction(action: string): Promise<void> {
    log.info(`[${this.constructor.name}] ${action}`);
  }
}
