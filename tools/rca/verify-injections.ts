import fs from 'fs';
import path from 'path';

/**
 * Scores the RCA against the known answer for each injected fault and writes
 * reports/rca/injection-accuracy.json. Exits non-zero on a wrong classification, so a
 * regression in the classifier fails CI rather than being discovered at defence time.
 *
 * This is the only place a classification is graded automatically: everywhere else the
 * RCA output is a hypothesis for a human, never a verdict.
 */

/** Accepted classifications per injected fault, most-correct first. */
const EXPECTED: Record<string, { accept: string[]; rationale: string }> = {
  'FI-01': {
    accept: ['TEST_SCRIPT_DEFECT'],
    rationale: 'A wrong expected value committed to the spec in HEAD is a script defect.',
  },
  'FI-02': {
    accept: ['ENVIRONMENT_OR_NETWORK'],
    rationale: 'A route abort is a test-controlled transport failure, not a product fault.',
  },
  'FI-03': {
    accept: ['TIMING_OR_FLAKINESS', 'ENVIRONMENT_OR_NETWORK'],
    rationale: 'An injected slow response is a synchronisation fault, not a missing element.',
  },
};

const OUT_DIR = path.join(process.cwd(), 'reports', 'rca');
const REPORT = path.join(OUT_DIR, 'rca-report.json');

interface Row {
  scenario_id: string;
  classification: string;
  confidence: number;
  expected: string[];
  correct: boolean;
  rationale: string;
}

function main(): void {
  if (!fs.existsSync(REPORT)) {
    console.error(`[RCA Verify] ${REPORT} not found. Run rca:collect and rca:analyze first.`);
    process.exit(1);
  }

  const records: Array<{ scenario_id: string; classification: string; confidence: number }> = JSON.parse(
    fs.readFileSync(REPORT, 'utf-8'),
  );
  const seen = new Map<string, (typeof records)[number]>();
  for (const r of records) if (EXPECTED[r.scenario_id] && !seen.has(r.scenario_id)) seen.set(r.scenario_id, r);

  if (seen.size === 0) {
    console.error('[RCA Verify] No injected-fault records found. Run with FAULT_INJECTION set.');
    process.exit(1);
  }

  const rows: Row[] = [...seen.entries()].map(([id, rec]) => ({
    scenario_id: id,
    classification: rec.classification,
    confidence: rec.confidence,
    expected: EXPECTED[id].accept,
    correct: EXPECTED[id].accept.includes(rec.classification),
    rationale: EXPECTED[id].rationale,
  }));

  const correct = rows.filter((r) => r.correct).length;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'injection-accuracy.json'),
    JSON.stringify(
      { schema_version: '1.0', evaluated_at: new Date().toISOString(), correct, total: rows.length, rows },
      null,
      2,
    ),
  );

  for (const r of rows) {
    console.log(
      `[RCA Verify] ${r.scenario_id}: ${r.classification} (${r.confidence}) ` +
        `${r.correct ? 'OK' : `WRONG, expected one of ${r.expected.join(' | ')}`}`,
    );
  }
  console.log(`[RCA Verify] accuracy ${correct}/${rows.length}`);
  if (correct !== rows.length) process.exit(1);
}

main();
