import { Page, TestInfo } from '@playwright/test';
import path from 'path';
import { log } from './logger';

/**
 * Attaches structured evidence to the current Playwright test result.
 * Every assertion/check should be tagged with a scenario ID and risk for traceability.
 */
export async function attachEvidence(
  testInfo: TestInfo,
  name: string,
  body: string | Buffer,
  contentType: 'text/plain' | 'application/json' | 'image/png' = 'text/plain',
): Promise<void> {
  await testInfo.attach(name, { body, contentType });
}

export async function captureScenarioScreenshot(page: Page, testInfo: TestInfo, scenarioId: string): Promise<void> {
  const safe = scenarioId.replace(/[^A-Za-z0-9_-]/g, '_');
  const buf = await page.screenshot({ fullPage: true });
  await testInfo.attach(`screenshot-${safe}`, { body: buf, contentType: 'image/png' });
}

export function evidencePath(testInfo: TestInfo, filename: string): string {
  const dir = testInfo.outputPath();
  return path.join(dir, filename);
}

export function logScenarioCheck(scenarioId: string, risk: string, check: string, passed: boolean): void {
  log.info(`[${scenarioId}][${risk}] ${passed ? 'PASS' : 'FAIL'} — ${check}`);
}
