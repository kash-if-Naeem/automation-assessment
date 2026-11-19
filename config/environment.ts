import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Non-secret runtime settings. Secrets (AI_API_KEY) are read only where needed and
 * come from env / CI secrets, never from this file.
 */
export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://automationexercise.com',
  apiUrl: process.env.API_URL ?? 'https://automationexercise.com/api',
  isCI: !!process.env.CI,
  // Low worker count: this is a public practice site (assessment section 13).
  workers: Number(process.env.PW_WORKERS ?? 2),
  retries: process.env.CI ? 1 : 0,
  // Fault suites run only when explicitly selected, e.g. FAULT_INJECTION=FI-02.
  faultInjection: process.env.FAULT_INJECTION ?? '',
} as const;
