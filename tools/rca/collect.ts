import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { redact } from '../../src/utils/logger';

/**
 * Deterministic failure collector. Reads Playwright's JSON report and writes one record per
 * failed or flaky test. Runs with no AI and no network. If the report is missing, it still
 * writes collection-status.json so the analyzer can report the gap instead of going silent.
 */

export interface FailureRecord {
  schema_version: '1.0';
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
  artifacts: { trace?: string; screenshot?: string; video?: string };
  detect: { run_url: string; commit_sha: string; collected_at: string };
}

export interface CollectionStatus {
  schema_version: '1.0';
  status: 'ok' | 'results_missing' | 'results_unreadable';
  reason: string;
  results_path: string;
  failure_count: number;
}

const ROOT = process.cwd();
const RESULTS = path.join(ROOT, 'test-results', 'results.json');
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

function scenarioIdOf(title: string): string {
  const m = title.match(/\b(AE|FI)-\d+\b/);
  return m ? m[0] : 'UNKNOWN';
}

/** Page-snapshot marker from Playwright's error-context.md, written next to the trace. */
function snapshotMarker(tracePath?: string): string {
  if (!tracePath) return '';
  const ctxFile = path.join(path.dirname(tracePath), 'error-context.md');
  if (!fs.existsSync(ctxFile)) return '';
  const text = fs.readFileSync(ctxFile, 'utf-8');
  if (/SSL handshake failed|error code 52\d/i.test(text)) {
    return ' [page-snapshot: site error page (SSL handshake failed, error code 52x)]';
  }
  if (/attention required|cloudflare|403 forbidden|access denied/i.test(text)) {
    return ' [page-snapshot: site access block (WAF/403)]';
  }
  if (/queue full|under heavy load/i.test(text)) return ' [page-snapshot: site queue page (queue full)]';
  return '';
}

/** Walks nested suites; Playwright JSON keeps specs inside suites. */
function* walkSpecs(suites: any[] = []): Generator<{ spec: any; file: string }> {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) yield { spec, file: spec.file ?? suite.file ?? '' };
    yield* walkSpecs(suite.suites);
  }
}

function write(name: string, data: unknown): void {
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2));
}

function collect(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const detect = { run_url: runUrl(), commit_sha: commitSha(), collected_at: new Date().toISOString() };
  const failures: FailureRecord[] = [];

  let json: any;
  let status: CollectionStatus;
  if (!fs.existsSync(RESULTS)) {
    status = {
      schema_version: '1.0',
      status: 'results_missing',
      reason: `${RESULTS} not found`,
      results_path: RESULTS,
      failure_count: 0,
    };
  } else {
    try {
      json = JSON.parse(fs.readFileSync(RESULTS, 'utf-8'));
      status = {
        schema_version: '1.0',
        status: 'ok',
        reason: 'results parsed',
        results_path: RESULTS,
        failure_count: 0,
      };
    } catch (e) {
      status = {
        schema_version: '1.0',
        status: 'results_unreadable',
        reason: redact((e as Error).message),
        results_path: RESULTS,
        failure_count: 0,
      };
    }
  }

  if (json) {
    for (const { spec, file } of walkSpecs(json.suites)) {
      for (const test of spec.tests ?? []) {
        if (test.status !== 'unexpected' && test.status !== 'flaky') continue;
        const results: any[] = test.results ?? [];
        const last = results[results.length - 1] ?? {};
        const error = results.find((r) => r.error)?.error ?? last.error ?? {};
        const trace: string | undefined = last.attachments?.find((a: any) => a.name === 'trace')?.path;
        const shot: string | undefined = last.attachments?.find((a: any) => a.name === 'screenshot')?.path;
        const video: string | undefined = last.attachments?.find((a: any) => a.name === 'video')?.path;
        const stderr: string[] = (last.stderr ?? []).map((s: any) => (typeof s === 'string' ? s : (s.text ?? '')));
        const message = String(error.message ?? 'No error message provided');
        failures.push({
          schema_version: '1.0',
          scenario_id: scenarioIdOf(spec.title),
          test_title: redact(spec.title),
          file,
          outcome: test.status,
          injected: /@fault|FI-\d+/.test(spec.title),
          attempts: results.length,
          retry_count: Math.max(results.length - 1, 0),
          error_message: redact(message) + snapshotMarker(trace),
          stack_top: redact(String(error.stack ?? ''))
            .split('\n')
            .slice(0, 3),
          stderr_tail: redact(stderr.join('')).split('\n').slice(-20),
          artifacts: { trace, screenshot: shot, video },
          detect,
        });
      }
    }
    status.failure_count = failures.length;
  }

  write('failures.json', failures);
  write('collection-status.json', status);
  console.log(`[RCA Collector] status=${status.status} failures=${failures.length} -> ${OUT_DIR}`);
}

try {
  collect();
} catch (e) {
  // Never fail the pipeline from the reporting stage; the analyzer reports the gap.
  console.error('[RCA Collector] error:', redact((e as Error).message));
}
