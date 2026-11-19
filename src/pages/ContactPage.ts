import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ContactPage extends BasePage {
  readonly name: Locator = this.page.locator('input[data-qa="name"]');
  readonly email: Locator = this.page.locator('input[data-qa="email"]');
  readonly subject: Locator = this.page.locator('input[data-qa="subject"]');
  readonly message: Locator = this.page.locator('textarea[data-qa="message"]');
  readonly file: Locator = this.page.locator('input[name="upload_file"]');
  readonly submit: Locator = this.page.getByRole('button', { name: /submit/i });
  readonly successAlert: Locator = this.page.locator('.status.alert.alert-success');

  async open(): Promise<void> {
    await this.goto('/contact_us');
  }

  async submitContactForm(
    name: string,
    email: string,
    subject: string,
    message: string,
    uploadPath?: string,
  ): Promise<void> {
    await this.name.fill(name);
    await this.email.fill(email);
    await this.subject.fill(subject);
    await this.message.fill(message);
    if (uploadPath) await this.file.setInputFiles(uploadPath);
    // The site confirms with a JavaScript alert before submitting.
    this.page.once('dialog', (d) => void d.accept());
    await this.submit.click();
    await this.logAction('submitted contact form');
  }
}
