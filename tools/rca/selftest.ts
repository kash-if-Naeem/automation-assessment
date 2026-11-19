import fs from 'fs';
import path from 'path';
import { classify, type Classification } from './analyze';
import type { FailureRecord } from './collect';

/**
 * Regression guard for the classifier, run offline in CI.
 *
 * Why this exists: the assertion-mismatch rule silently stopped working twice. Playwright
 * colourises its error text, so a real message reads
 * `expect(<esc>[2mreceived<esc>[22m).toBe(...)`, and a rule matching the plain wording never
 * fires. Both times the rule had been "verified" against hand-written sample input, which
 * carries no escape codes — so it looked correct and was not.
 *
 * The fixtures here are therefore **recorded from real runs, verbatim, escape codes and
 * all**. Never hand-edit a fixture to make a test pass: re-record it from an actual failure.
 *
 * This runs with no browser, no network and no site, so it protects the rules even when the
 * public site is unavailable and the live fault suites cannot run.
 */

interface Fixture {
  note: string;
  source: string;
  contains_ansi: boolean;
  expected_classification: Classification;
  record: FailureRecord;
}

const FIXTURE_DIR = path.join(__dirname, '__fixtures__');

function main(): void {
  if (!fs.existsSync(FIXTURE_DIR)) {
    console.error(`[RCA Selftest] no fixture directory at ${FIXTURE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('[RCA Selftest] no fixtures found');
    process.exit(1);
  }

  let failed = 0;
  for (const file of files) {
    const fixture: Fixture = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf-8'));

    // Guard the guard: a fixture that has lost its escape codes no longer reproduces the bug.
    // eslint-disable-next-line no-control-regex -- detecting ANSI escapes is the point
    if (fixture.contains_ansi && !/\u001b\[/.test(fixture.record.error_message)) {
      console.error(`[RCA Selftest] ${file}: fixture claims ANSI escapes but none remain — re-record it`);
      failed += 1;
      continue;
    }

    const result = classify(fixture.record, fixture.record.changed_files_in_head ?? []);
    const ok = result.classification === fixture.expected_classification;
    console.log(
      `[RCA Selftest] ${file}: ${result.classification} (${result.confidence}) ` +
        `${ok ? 'OK' : `WRONG, expected ${fixture.expected_classification}`}`,
    );
    if (!ok) {
      console.error(`  source: ${fixture.source}`);
      console.error(
        `  hypotheses: ${result.hypotheses.map((h) => `${h.classification}@${h.confidence}`).join(', ') || '(none matched)'}`,
      );
      failed += 1;
    }
  }

  console.log(`[RCA Selftest] ${files.length - failed}/${files.length} fixtures classified correctly`);
  if (failed > 0) process.exit(1);
}

main();
