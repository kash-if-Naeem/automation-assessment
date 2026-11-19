import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { redact } from '../../src/utils/logger';

/**
 * Deterministic failure collector (RCA Detect + Collect stages). Reads Playwright's JSON
 * report and the JUnit XML, and gathers the per-test evidence the RCA specification asks
 * for: error and stack, retry count, run URL, commit SHA, trace/screenshot/video, console
 * errors, sanitized request failures, a DOM snapshot, and the files changed in HEAD.
 *
 * Runs with no AI and no network. If a report is missing it still writes
 * collection-status.json, so a reporting gap is visible instead of silent.
 */

export interface FailureRecord {
  schema_version: '1.1';
  scenario_id: string;
  test_title: string;
  file: string;
  outcome: 'unexpected' | 'flaky';
  injected: boolean;
  attempts: number;
  retry_count: number;
  error_message: string;
  stack_top: string[];
  stderr_tail: string[];
  console_errors: Array<Record<string, unknown>>;
  network_failures: Array<Record<string, unknown>>;
  artifacts: { trace?: string; screenshot?: string; video?: string; dom_snapshot?: string };
  changed_files_in_head: string[];
  detect: { run_url: string; commit_sha: string; collected_at: string; junit_path?: string };
}

export interface CollectionStatus {
  schema_version: '1.1';
  status: 'ok' | 'results_missing' | 'results_unreadable';
  reason: string;
  results_path: string;
  junit: { present: boolean; tests?: number; failures?: number; errors?: number; reason?: string };
  failure_count: number;
  run_summary: { total: number; passed: number; failed: number; flaky: number; skipped: number };
}

const ROOT = process.cwd();
const RESULTS = path.join(ROOT, 'test-results', 'results.json');
const JUNIT = path.join(ROOT, 'test-results', 'junit.xml');
const OUT_DIR = path.join(ROOT, 'reports', 'rca');

function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

function runUrl(): string {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  return GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : 'local';
}

/** Files touched by the newest commit: the Correlate stage uses this to spot a recent edit. */
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

function scenarioIdOf(title: string): string {
  const m = title.match(/\b(AE|FI)-\d+\b/);
  return m ? m[0] : 'UNKNOWN';
}

/**
 * Playwright colourises assertion messages, so the raw text reads
 * `expect(<esc>[2mreceived<esc>[22m).toBe(...)`. Any analyzer rule matching on the plain
 * wording silently never fires, and the stored evidence is unreadable. Strip the codes
 * once, here, so every downstream consumer sees clean text.
 */
// eslint-disable-next-line no-control-regex -- matching ANSI escapes is the point
const ANSI = /\u001b\[[0-9;]*m/g;

function clean(text: string): string {
  return redact(text.replace(ANSI, ''));
}

/** Attribute counts from the JUnit XML, used as a cross-check on the JSON report. */
function readJunit(): CollectionStatus['junit'] {
  if (!fs.existsSync(JUNIT)) return { present: false, reason: 'junit.xml not found' };
  try {
    const xml = fs.readFileSync(JUNIT, 'utf-8');
    const head = xml.slice(0, 4000);
    const num = (attr: string): number | undefined => {
      const m = head.match(new RegExp(`<testsuites[^>]*\\b${attr}="(\\d+)"`));
      return m ? Number(m[1]) : undefined;
    };
    return { present: true, tests: num('tests'), failures: num('failures'), errors: num('errors') };
  } catch (e) {
    return { present: true, reason: redact((e as Error).message) };
  }
}

/** Page-snapshot markers from Playwright's error-context.md, written next to the trace. */
function snapshotMarker(tracePath?: string): string {
  if (!tracePath) return '';
  const ctxFile = path.join(path.dirname(tracePath), 'error-context.md');
  if (!fs.existsSync(ctxFile)) return '';
  const text = fs.readFileSync(ctxFile, 'utf-8');
  if (/attention required|cloudflare|403 forbidden|access denied/i.test(text)) {
    return ' [page-snapshot: site access block (WAF/403)]';
  }
  if (/SSL handshake failed|error code 52\d/i.test(text)) {
    return ' [page-snapshot: site error page (SSL handshake failed, error code 52x)]';
  }
  if (/queue full|under heavy load/i.test(text)) return ' [page-snapshot: site queue page (queue full)]';
  return '';
}

/**
 * Attachments appear two ways in the JSON report: file-backed ones carry `path`, while
 * ones created from a body are inlined as base64 with no path at all. Reading only `path`
 * silently loses the console, network and DOM evidence, so both forms are handled.
 */
type Attachment = { name?: string; path?: string; body?: string };

function findAttachment(attachments: unknown[], name: string): Attachment | undefined {
  return (attachments as Attachment[]).find((a) => a?.name === name);
}

function attachmentText(attachments: unknown[], name: string): string | undefined {
  const found = findAttachment(attachments, name);
  if (!found) return undefined;
  if (found.path && fs.existsSync(found.path)) return fs.readFileSync(found.path, 'utf-8');
  if (found.body) return Buffer.from(found.body, 'base64').toString('utf-8');
  return undefined;
}

/** Reads a JSON attachment the diagnostics fixture wrote, e.g. console-errors.json. */
function readJsonAttachment(attachments: unknown[], name: string): Array<Record<string, unknown>> {
  const text = attachmentText(attachments, name);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/** Where the artifact lives. Inline attachments have no file, so name the report instead. */
function attachmentPath(attachments: unknown[], name: string): string | undefined {
  const found = findAttachment(attachments, name);
  if (!found) return undefined;
  return found.path ?? (found.body ? `inline attachment "${name}" in test-results/results.json` : undefined);
}

/** Walks nested suites; Playwright JSON keeps specs inside suites. */
function* walkSpecs(suites: unknown[] = []): Generator<{ spec: Record<string, any>; file: string }> {
  for (const suite of suites as Array<Record<string, any>>) {
    for (const spec of suite.specs ?? []) yield { spec, file: spec.file ?? suite.file ?? '' };
    yield* walkSpecs(suite.suites);
  }
}

function write(name: string, data: unknown): void {
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2));
}

function collect(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const junit = readJunit();
  const detect = {
    run_url: runUrl(),
    commit_sha: commitSha(),
    collected_at: new Date().toISOString(),
    junit_path: junit.present ? 'test-results/junit.xml' : undefined,
  };
  const changed = changedFilesInHead();
  const failures: FailureRecord[] = [];
  const summary = { total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 };

  let json: Record<string, any> | undefined;
  let status: CollectionStatus;
  const base = { schema_version: '1.1' as const, results_path: RESULTS, junit, failure_count: 0, run_summary: summary };

  if (!fs.existsSync(RESULTS)) {
    status = { ...base, status: 'results_missing', reason: `${RESULTS} not found` };
  } else {
    try {
      json = JSON.parse(fs.readFileSync(RESULTS, 'utf-8'));
      status = { ...base, status: 'ok', reason: 'results parsed' };
    } catch (e) {
      status = { ...base, status: 'results_unreadable', reason: redact((e as Error).message) };
    }
  }

  if (json) {
    for (const { spec, file } of walkSpecs(json.suites)) {
      for (const test of spec.tests ?? []) {
        summary.total += 1;
        if (test.status === 'expected') summary.passed += 1;
        else if (test.status === 'skipped') summary.skipped += 1;
        else if (test.status === 'flaky') summary.flaky += 1;
        else summary.failed += 1;

        if (test.status !== 'unexpected' && test.status !== 'flaky') continue;
        const results: Array<Record<string, any>> = test.results ?? [];
        const last = results[results.length - 1] ?? {};
        const error = results.find((r) => r.error)?.error ?? last.error ?? {};
        const attachments: unknown[] = last.attachments ?? [];
        const trace = attachmentPath(attachments, 'trace');
        const stderr: string[] = (last.stderr ?? []).map((s: unknown) =>
          typeof s === 'string' ? s : ((s as { text?: string })?.text ?? ''),
        );
        const message = String(error.message ?? 'No error message provided');

        failures.push({
          schema_version: '1.1',
          scenario_id: scenarioIdOf(spec.title),
          test_title: clean(spec.title),
          file,
          outcome: test.status,
          injected: /@fault|FI-\d+/.test(spec.title),
          attempts: results.length,
          retry_count: Math.max(results.length - 1, 0),
          error_message: clean(message) + snapshotMarker(trace),
          stack_top: clean(String(error.stack ?? ''))
            .split('\n')
            .slice(0, 3),
          stderr_tail: clean(stderr.join('')).split('\n').slice(-20),
          console_errors: readJsonAttachment(attachments, 'console-errors.json'),
          network_failures: readJsonAttachment(attachments, 'network-failures.json'),
          artifacts: {
            trace,
            screenshot: attachmentPath(attachments, 'screenshot'),
            video: attachmentPath(attachments, 'video'),
            dom_snapshot: attachmentPath(attachments, 'dom-snapshot.html'),
          },
          changed_files_in_head: changed,
          detect,
        });
      }
    }
    status.failure_count = failures.length;
    status.run_summary = summary;
  }

  write('failures.json', failures);
  write('collection-status.json', status);
  console.log(
    `[RCA Collector] status=${status.status} failures=${failures.length} ` +
      `(of ${summary.total} tests; junit=${junit.present ? 'present' : 'missing'}) -> ${OUT_DIR}`,
  );
}

try {
  collect();
} catch (e) {
  // Never fail the pipeline from the reporting stage; the analyzer reports the gap.
  console.error('[RCA Collector] error:', redact((e as Error).message));
}
