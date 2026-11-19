import { defineConfig, devices } from '@playwright/test';
import { env } from './config/environment';

export default defineConfig({
  testDir: './tests',
  // Fault suites are excluded unless explicitly selected with FAULT_INJECTION.
  testIgnore: env.faultInjection ? [] : ['**/fault/**'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.retries,
  workers: env.workers,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: env.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    testIdAttribute: 'data-qa',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  metadata: { baseUrl: env.baseUrl, apiUrl: env.apiUrl },
});
