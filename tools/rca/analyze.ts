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
  schema_version: '1.2';
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
  /** Business severity and suggested first owner (Recommend stage). */
  business_severity: string;
  suggested_owner: string;
  /** Correlate stage: is this the first failure of its kind, or a downstream symptom? */
  correlation?: { signature: string; primary: boolean; downstream_of?: string; group_size: number };
  detect: FailureRecord['detect'];
}

const CONFIDENCE_FLOOR = 0.6;

/** Business severity: the scenario's risk tier, reduced when the cause is not the product. */
function severityOf(risk: FailureRecord['risk'], classification: Classification): string {
  const base: Record<string, string> = { P0: 'BLOCKER', P1: 'HIGH', P2: 'MEDIUM', UNKNOWN: 'UNTRIAGED' };
  const notProduct: Classification[] = ['ENVIRONMENT_OR_NETWORK', 'THIRD_PARTY_DEPENDENCY', 'TIMING_OR_FLAKINESS'];
  if (classification === 'UNKNOWN') return 'UNTRIAGED';
  // A P0 journey blocked by the site is urgent to the run, but it is not a release blocker.
  if (notProduct.includes(classification)) return risk === 'P0' ? 'HIGH' : 'LOW';
  return base[risk] ?? 'UNTRIAGED';
}

/** Who should pick it up first. Advisory: the reviewer owns the final assignment. */
function ownerOf(classification: Classification): string {
  switch (classification) {
    case 'PRODUCT_DEFECT':
      return 'Product engineering';
    case 'TEST_SCRIPT_DEFECT':
    case 'LOCATOR_OR_UI_CHANGE':
    case 'TEST_DATA_OR_STATE':
    case 'TIMING_OR_FLAKINESS':
      return 'QA automation';
    case 'ENVIRONMENT_OR_NETWORK':
    case 'THIRD_PARTY_DEPENDENCY':
      return 'CI / infrastructure';
    default:
      return 'Unassigned (needs human triage)';
  }
}

/**
 * Correlate stage: one environmental event commonly fails many tests at once. Grouping on
 * the classification plus a normalised error signature lets the report name one primary
 * failure and mark the rest as downstream symptoms of it, so a reviewer triages the event
 * once instead of reading N near-identical records.
 */
function signatureOf(r: RcaRecord): string {
  const normalised = r.symptom.replace(/\d+/g, '#').replace(/\s+/g, ' ').slice(0, 120).trim();
  return `${r.classification}::${normalised}`;
}

function markDownstream(records: RcaRecord[]): void {
  const firstBySignature = new Map<string, RcaRecord>();
  for (const r of records) {
    const sig = signatureOf(r);
    const primary = firstBySignature.get(sig);
    if (!primary) {
      firstBySignature.set(sig, r);
      r.correlation = { signature: sig, primary: true, group_size: 1 };
    } else {
      r.correlation = {
        signature: sig,
        primary: false,
        downstream_of: primary.scenario_id,
        group_size: 0,
      };
    }
  }
  // Fill in group sizes once every member is known.
  for (const [sig, primary] of firstBySignature) {
    const size = records.filter((r) => r.correlation?.signature === sig).length;
    primary.correlation!.group_size = size;
    for (const r of records) if (r.correlation?.signature === sig) r.correlation.group_size = size;
  }
}
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

export function classify(f: FailureRecord, changedFallback: string[]): RcaRecord {
  const msg = f.error_message;
  const hyps: Hypothesis[] = [];
  const hasTrace = !!f.artifacts.trace;
  const changed = f.changed_files_in_head?.length ? f.changed_files_in_head : changedFallback;
  const blocked = (f.network_failures ?? []).filter((n) => typeof n.status === 'number' && (n.status as number) >= 400);

  // Rule 0: the test passed on retry. That is evidence of non-determinism, not of a product fault.
  if (f.outcome === 'flaky') {
    hyps.push({
      classification: 'TIMING_OR_FLAKINESS',
      confidence: 0.8,
      rule: 'passed-on-retry',
      evidence_for: [`test passed on retry (${f.retry_count} retry/retries over ${f.attempts} attempts)`],
      evidence_against: ['an intermittent product or site fault can also pass on retry'],
    });
  }

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
    /\b(403|429|503)\b|queue full|service unavailable|non-json body \(http 5\d\d\)|page-snapshot: site|ssl handshake|error code 52\d/i.test(
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

  // Rule 2b: captured responses show the site refused requests, independent of the assertion text.
  if (blocked.length > 0) {
    const codes = [...new Set(blocked.map((n) => n.status))].join(', ');
    hyps.push({
      classification: 'THIRD_PARTY_DEPENDENCY',
      confidence: 0.75,
      rule: 'captured-error-responses',
      evidence_for: [`${blocked.length} captured response(s) with status ${codes} (network-failures.json)`],
      evidence_against: ['a 4xx can also follow a bad request built by the test'],
    });
  }

  // Rule 3: non-JSON body with a non-5xx status, e.g. a wrong endpoint path returns an HTML 404.
  if (/non-json body \(http (?!5|403|429)\d{3}\)/i.test(msg)) {
    hyps.push({
      classification: 'TEST_SCRIPT_DEFECT',
      confidence: 0.55,
      rule: 'non-json-client-error',
      evidence_for: ['API returned HTML instead of the documented JSON with a client-error status'],
      evidence_against: ['could be a site change to the endpoint (PRODUCT_DEFECT / THIRD_PARTY)'],
    });
  }

  // Rule 4: an element did not resolve in time. Two causes look identical in the error text,
  // so captured response timing is what separates "the element is missing" (locator or UI
  // change) from "the element was late" (timing). Without that evidence, neither wins
  // outright and the tie rule sends it to UNKNOWN for a human.
  if (/waiting for (locator|getBy)|locator\.\w+: Timeout|toBeVisible|element\(s\) not found/i.test(msg)) {
    const slow = (f.network_failures ?? []).filter((n) => n.slow === true);
    const slowest = slow.sort((a, b) => Number(b.duration_ms ?? 0) - Number(a.duration_ms ?? 0))[0];

    hyps.push({
      classification: 'LOCATOR_OR_UI_CHANGE',
      confidence: slow.length ? 0.45 : hasTrace ? 0.7 : 0.55,
      rule: 'locator-timeout',
      evidence_for: ['Playwright reported an unresolved locator'],
      evidence_against: [
        slow.length
          ? `${slow.length} slow response(s) captured, so the element may have been late rather than absent`
          : hasTrace
            ? 'trace attached; DOM not yet inspected by the analyzer'
            : 'no trace attached',
      ],
    });

    hyps.push({
      classification: 'TIMING_OR_FLAKINESS',
      confidence: slow.length ? 0.78 : 0.4,
      rule: slow.length ? 'locator-timeout-with-slow-response' : 'locator-timeout-alt',
      evidence_for: slow.length
        ? [`slowest captured response ${slowest?.duration_ms}ms on ${slowest?.url}`, 'element was awaited, not absent']
        : ['timeouts can also come from slow responses'],
      evidence_against: slow.length
        ? ['a missing element would also time out; confirm in the trace']
        : ['no slow responses were captured for this test'],
    });
  }

  // Rule 5: expected-vs-received assertion mismatch.
  if (/expect\(received\)\.(toBe|toEqual|toContain|toHaveText|toBeCloseTo|toHaveCount|toMatch)/.test(msg)) {
    // The JSON report's file is repo-relative to testDir ("ui/cart.spec.ts"); git lists
    // "tests/ui/cart.spec.ts". Compare on the normalised tail so the match is reliable.
    const tail = (p: string) => p.replace(/\\/g, '/').split('/').slice(-2).join('/');
    const specChanged = changed.some((c) => c && f.file && tail(c) === tail(f.file));
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
    schema_version: '1.2',
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
      { type: 'screenshot', path: f.artifacts.screenshot ?? 'not available' },
      { type: 'dom', path: f.artifacts.dom_snapshot ?? 'not captured' },
      {
        type: 'console',
        detail: (f.console_errors ?? []).length
          ? `${f.console_errors.length} entry/entries: ${f.console_errors
              .slice(0, 3)
              .map((c) => String(c.text ?? '').slice(0, 120))
              .join(' | ')}`
          : 'none captured',
      },
      {
        type: 'network',
        detail: (f.network_failures ?? []).length
          ? `${f.network_failures.length} failed/error response(s): ${f.network_failures
              .slice(0, 3)
              .map((n) => `${n.status ?? n.failure} ${n.url}`)
              .join(' | ')}`
          : 'none captured',
      },
      {
        type: 'diff',
        detail: (f.changed_files_in_head ?? []).length
          ? `HEAD touched: ${f.changed_files_in_head.slice(0, 10).join(', ')}`
          : 'no file list available for HEAD',
      },
      { type: 'run', detail: `${f.detect.run_url} @ ${f.detect.commit_sha}` },
    ],
    validation: `Re-run isolated test: npx playwright test -g "${f.scenario_id}". Inspect the trace before any code change.`,
    recommended_action:
      classification === 'UNKNOWN'
        ? 'Insufficient evidence. Human triage required; do not change code.'
        : 'Reviewer verifies evidence, then decides. Any patch goes to a separate branch.',
    requires_human_approval: true,
    business_severity: severityOf(f.risk, classification),
    suggested_owner: ownerOf(classification),
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
    lines.push(`- Business severity: ${r.business_severity} | Suggested owner: ${r.suggested_owner}`);
    if (r.correlation && !r.correlation.primary) {
      lines.push(
        `- Downstream symptom of ${r.correlation.downstream_of} (${r.correlation.group_size} failures share this signature)`,
      );
    } else if (r.correlation && r.correlation.group_size > 1) {
      lines.push(`- Primary failure for ${r.correlation.group_size} failures sharing this signature`);
    }
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
  markDownstream(records);

  fs.writeFileSync(path.join(OUT_DIR, 'rca-report.json'), JSON.stringify(records, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'rca-summary.md'), redact(summarize(status, records)));
  console.log(`[RCA Analyzer] ${records.length} record(s) written to ${OUT_DIR} (model-free)`);
}

if (require.main === module) {
  try {
    analyze();
  } catch (e) {
    // Reporting must never hide the test result: write an error note and exit 0.
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(OUT_DIR, 'rca-summary.md'),
      `# AI Root Cause Analysis Report

Analyzer error: ${redact((e as Error).message)}
`,
    );
    console.error('[RCA Analyzer] error:', redact((e as Error).message));
  }
}
