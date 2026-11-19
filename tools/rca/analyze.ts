import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { redact } from '../../src/utils/logger';
import type { FailureRecord } from './collect';

/**
 * Model-free RCA. Ranks competing hypotheses with rules, records evidence for and against
 * each one, and applies the decision threshold from skills/rca.md. No output is applied
 * to code. An LLM adapter is NOT implemented; AI_API_KEY is accepted but unused.
 *
 * Stop condition: confidence below 0.60 becomes UNKNOWN.
 */

export type Classification =
  | 'PRODUCT_DEFECT'
  | 'TEST_SCRIPT_DEFECT'
  | 'LOCATOR_OR_UI_CHANGE'
  | 'TEST_DATA_OR_STATE'
  | 'ENVIRONMENT_OR_NETWORK'
  | 'TIMING_OR_FLAKINESS'
  | 'THIRD_PARTY_DEPENDENCY'
  | 'UNKNOWN';

interface Hypothesis {
  classification: Classification;
  confidence: number;
  rule: string;
  evidence_for: string[];
  evidence_against: string[];
}

export interface RcaRecord {
  schema_version: '1.0';
  scenario_id: string;
  test_title: string;
  classification: Classification;
  confidence: number;
  status: 'HYPOTHESIS_PENDING_REVIEW';
  symptom: string;
  hypotheses: Hypothesis[];
  evidence: Array<{ type: string; path?: string; detail?: string }>;
  validation: string;
  recommended_action: string;
  requires_human_approval: true;
  detect: FailureRecord['detect'];
}

const CONFIDENCE_FLOOR = 0.6;
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'reports', 'rca');

function changedFilesInHead(): string[] {
  try {
    return execSync('git diff --name-only HEAD~1 HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function classify(f: FailureRecord, changed: string[]): RcaRecord {
  const msg = f.error_message;
  const hyps: Hypothesis[] = [];
  const hasTrace = !!f.artifacts.trace;

  // Rule 1: browser-level network failure (includes test-controlled route aborts).
  if (/net::ERR_(FAILED|CONNECTION|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|ABORTED)/.test(msg)) {
    hyps.push({
      classification: 'ENVIRONMENT_OR_NETWORK',
      confidence: f.injected ? 0.9 : 0.8,
      rule: 'network-error-code',
      evidence_for: [
        'error message contains net::ERR_*',
        f.injected ? 'test is an injected fault (@fault)' : '',
      ].filter(Boolean),
      evidence_against: ['no product assertion reached'],
    });
  }

  // Rule 2: site unavailable (5xx/429 or queue page). Word boundaries avoid matching digits in other numbers.
  if (
    /\b(503|429)\b|queue full|service unavailable|non-json body \(http 5\d\d\)|page-snapshot: site|ssl handshake|error code 52\d/i.test(
      msg,
    )
  ) {
    hyps.push({
      classification: 'THIRD_PARTY_DEPENDENCY',
      confidence: 0.8,
      rule: 'site-unavailable',
      evidence_for: ['error reports 5xx/429 or a queue page'],
      evidence_against: ['no assertion against product behaviour was evaluated'],
    });
  }

  // Rule 3: non-JSON body with a non-5xx status, e.g. a wrong endpoint path returns an HTML 404.
  if (/non-json body \(http (?!5)\d{3}\)/i.test(msg)) {
    hyps.push({
      classification: 'TEST_SCRIPT_DEFECT',
      confidence: 0.55,
      rule: 'non-json-client-error',
      evidence_for: ['API returned HTML instead of the documented JSON with a client-error status'],
      evidence_against: ['could be a site change to the endpoint (PRODUCT_DEFECT / THIRD_PARTY)'],
    });
  }

  // Rule 4: locator could not be resolved in time.
  if (/waiting for (locator|getBy)|locator\.\w+: Timeout|element\(s\) not found/i.test(msg)) {
    hyps.push({
      classification: 'LOCATOR_OR_UI_CHANGE',
      confidence: hasTrace ? 0.7 : 0.55,
      rule: 'locator-timeout',
      evidence_for: ['Playwright reported an unresolved locator'],
      evidence_against: [hasTrace ? 'trace attached; DOM not yet inspected by the analyzer' : 'no trace attached'],
    });
    hyps.push({
      classification: 'TIMING_OR_FLAKINESS',
      confidence: 0.4,
      rule: 'locator-timeout-alt',
      evidence_for: ['timeouts can also come from slow responses'],
      evidence_against: ['locator timeout is the reported failure'],
    });
  }

  // Rule 5: expected-vs-received assertion mismatch.
  if (/expect\(received\)\.(toBe|toEqual|toContain|toHaveText|toBeCloseTo|toHaveCount|toMatch)/.test(msg)) {
    const specChanged = changed.some((c) => c && f.file && f.file.endsWith(c.split('/').slice(-2).join('/')));
    hyps.push({
      classification: 'PRODUCT_DEFECT',
      confidence: 0.5,
      rule: 'assertion-mismatch',
      evidence_for: ['assertion compared expected and received values'],
      evidence_against: specChanged
        ? ['the failing spec changed in HEAD (see TEST_SCRIPT_DEFECT)']
        : ['no recent change to the spec'],
    });
    if (specChanged) {
      hyps.push({
        classification: 'TEST_SCRIPT_DEFECT',
        confidence: 0.7,
        rule: 'assertion-mismatch-recent-spec-change',
        evidence_for: [`${f.file} changed in ${f.detect.commit_sha.slice(0, 7)} (git diff HEAD~1 HEAD)`],
        evidence_against: ['product behaviour may also have changed; re-run isolated test to confirm'],
      });
    }
  }

  hyps.sort((a, b) => b.confidence - a.confidence);
  const top = hyps[0];
  const tie = hyps.length > 1 && hyps[1].confidence === top?.confidence;
  let classification: Classification = 'UNKNOWN';
  let confidence = 0;
  if (top && !tie && top.confidence >= CONFIDENCE_FLOOR) {
    classification = top.classification;
    confidence = top.confidence;
  } else if (top) {
    confidence = top.confidence;
  }
  // Missing artifacts lower confidence (assessment section 10).
  if (!hasTrace) confidence = Math.max(0, confidence - 0.15);
  if (classification !== 'UNKNOWN' && confidence < CONFIDENCE_FLOOR) classification = 'UNKNOWN';

  return {
    schema_version: '1.0',
    scenario_id: f.scenario_id,
    test_title: f.test_title,
    classification,
    confidence: Math.round(confidence * 100) / 100,
    status: 'HYPOTHESIS_PENDING_REVIEW',
    symptom: msg.split('\n')[0].slice(0, 300),
    hypotheses: hyps,
    evidence: [
      { type: 'error', detail: msg.split('\n')[0].slice(0, 300) },
      { type: 'stack', detail: f.stack_top.join('\n') },
      { type: 'trace', path: f.artifacts.trace ?? 'not available' },
      { type: 'run', detail: `${f.detect.run_url} @ ${f.detect.commit_sha}` },
    ],
    validation: `Re-run isolated test: npx playwright test -g "${f.scenario_id}". Inspect the trace before any code change.`,
    recommended_action:
      classification === 'UNKNOWN'
        ? 'Insufficient evidence. Human triage required; do not change code.'
        : 'Reviewer verifies evidence, then decides. Any patch goes to a separate branch.',
    requires_human_approval: true,
    detect: f.detect,
  };
}

function summarize(status: any, records: RcaRecord[]): string {
  const lines: string[] = ['# AI Root Cause Analysis Report', ''];
  lines.push(`**Collection status:** \`${status?.status ?? 'unknown'}\` - ${status?.reason ?? ''}`, '');
  if (!status || status.status !== 'ok') {
    lines.push('Results were not collected, so no test outcome can be stated from this run.', '');
    return lines.join('\n');
  }
  lines.push(`**Failures analysed:** ${records.length}`, '');
  for (const r of records) {
    lines.push(`## ${r.scenario_id}: ${r.test_title}`);
    lines.push(`- Classification: \`${r.classification}\` (confidence ${r.confidence})`);
    lines.push(`- Symptom: ${r.symptom}`);
    lines.push(
      `- Alternatives: ${
        r.hypotheses
          .slice(1)
          .map((h) => h.classification)
          .join(', ') || 'none ranked'
      }`,
    );
    lines.push(`- Validation: ${r.validation}`);
    lines.push(`- Recommended action: ${r.recommended_action}`);
    lines.push(`- Human approval required: YES`, '');
  }
  const unknown = records.filter((r) => r.classification === 'UNKNOWN').length;
  lines.push(`UNKNOWN cases: ${unknown}`);
  return lines.join('\n');
}

function analyze(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const statusPath = path.join(OUT_DIR, 'collection-status.json');
  const failuresPath = path.join(OUT_DIR, 'failures.json');
  const status = fs.existsSync(statusPath) ? JSON.parse(fs.readFileSync(statusPath, 'utf-8')) : null;
  const failures: FailureRecord[] = fs.existsSync(failuresPath)
    ? JSON.parse(fs.readFileSync(failuresPath, 'utf-8'))
    : [];

  const changed = changedFilesInHead();
  const records = failures.map((f) => classify(f, changed));

  fs.writeFileSync(path.join(OUT_DIR, 'rca-report.json'), JSON.stringify(records, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'rca-summary.md'), redact(summarize(status, records)));
  console.log(`[RCA Analyzer] ${records.length} record(s) written to ${OUT_DIR} (model-free)`);
}

try {
  analyze();
} catch (e) {
  // Reporting must never hide the test result: write an error note and exit 0.
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'rca-summary.md'),
    `# AI Root Cause Analysis Report\n\nAnalyzer error: ${redact((e as Error).message)}\n`,
  );
  console.error('[RCA Analyzer] error:', redact((e as Error).message));
}
