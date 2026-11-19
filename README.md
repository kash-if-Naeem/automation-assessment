# QA AI Level-3: Playwright + Agentic RCA

Playwright and TypeScript automation for [automationexercise.com](https://automationexercise.com), with a rule-based root-cause analyzer and the governance documents the AI Level-3 assessment asks for.

See `docs/assessment-compliance.md` for what is done and what still needs a run.

## Setup

Requirements: Node.js 22 (`.nvmrc`), Git.

```powershell
npm ci
npx playwright install chromium
Copy-Item .env.example .env   # optional; defaults point at the public site
```

## Commands

| Task                                  | Command                                                           |
| ------------------------------------- | ----------------------------------------------------------------- |
| Typecheck                             | `npm run typecheck`                                               |
| Lint                                  | `npm run lint`                                                    |
| Format check                          | `npm run format:check`                                            |
| List tests                            | `npm run test:list`                                               |
| All tests                             | `npm test`                                                        |
| Smoke tests                           | `npm run test:smoke`                                              |
| P0 tests                              | `npm run test:p0`                                                 |
| UI only / API only / integration only | `npm run test:ui`, `npm run test:api`, `npm run test:integration` |
| One scenario                          | `npx playwright test -g "AE-12"`                                  |
| Headed run                            | `npm run test:headed`                                             |
| HTML report                           | `npm run report:html`                                             |
| Fault injection (one)                 | `$env:FAULT_INJECTION='FI-02'; npx playwright test tests/fault`   |
| Fault injection (all)                 | `$env:FAULT_INJECTION='all'; npx playwright test tests/fault`     |
| RCA collect and analyze               | `npm run rca:collect; npm run rca:analyze`                        |
| Grade RCA against known faults        | `npm run rca:verify`                                              |

Keep `PW_WORKERS` at 2 or lower. The site is public and shared.

## Test tags

- `@smoke`: a quick health check. Includes AE-01, AE-02, AE-06, AE-11, AE-15 and API AE-06.
- `@p0`, `@p1`, `@p2`: priority from `docs/strategy.md`.
- `@fault`: fault-injection tests. Excluded unless `FAULT_INJECTION` is set.

## Layout

```
config/            environment settings (non-secret)
docs/              strategy, traceability, architecture, AI policy, assessment compliance,
                   assumptions, fault injection, RCA schema, evidence templates
skills/            test-design, playwright, rca, review contracts
agents/            orchestrator contract (tools, budgets, handoffs, stop conditions)
src/api/           typed API client and zod response schemas
src/fixtures/      user generation, account cleanup, UI registration
src/pages/         page objects
src/utils/         price maths, logging and redaction, cleanup registry, invoice check
tests/ui/          UI scenarios
tests/api/         API scenarios (all 14 documented endpoints)
tests/integration/ UI and API consistency (AE-24)
tests/fault/       injected faults, opt-in only
tools/rca/         failure collector and rule-based analyzer
.github/workflows/ PR, schedule and manual CI with RCA
```

## Test data and cleanup

- Each test gets a new user with a unique id and an `example-test.invalid` email.
- Accounts created in a test are deleted in teardown through the public `deleteAccount` endpoint. The result is attached as `cleanup-status.json`. Teardown runs on failure too.
- Payment uses the site's dummy card values. No real card data is used.

## CI

`.github/workflows/playwright.yml` runs on pull requests, on a daily schedule at 00:00 UTC (05:00 Asia/Karachi, Pakistan has no DST), and on manual dispatch.

1. Install, typecheck and run tests. Each step continues on error.
2. Collect failures and run the RCA analyzer (`if: always()`). No AI key is required.
3. Upload reports, traces and RCA output (14-day retention).
4. A final step fails the job if typecheck or tests failed. This happens after artifacts are uploaded.

Secrets are not available to fork pull requests.

## RCA

`npm run rca:collect` reads `test-results/results.json` and writes `reports/rca/failures.json` and `collection-status.json`. If results are missing, it says so rather than reporting a pass.

`npm run rca:analyze` writes `rca-report.json` (schema in `docs/rca-schema.json`) and `rca-summary.md`. It ranks hypotheses by rule, records evidence for and against each, and returns UNKNOWN below 0.60 confidence or on a tie. Every record requires human approval.

The Collect stage gathers console errors, page exceptions, failed and 4xx/5xx responses, response timing, and a DOM snapshot — all redacted, with query strings stripped from URLs. Response timing is what lets the analyzer tell "the element was late" (timing) from "the element is missing" (locator or UI change).

`npm run rca:verify` grades the RCA against the known answer for each injected fault and exits non-zero on a wrong classification, so a classifier regression fails CI. Current accuracy: **3/3** (see `docs/fault-injection.md`).

## Limitations

- The public site intermittently returns a queue page, a Cloudflare 52x page, or HTTP 403 to CI runners. Those are classified THIRD_PARTY_DEPENDENCY, never product defects, and were recorded rather than worked around — evading an anti-bot control is out of scope.
- The RCA is rule-based. No LLM adapter is implemented; `AI_API_KEY` is accepted but unused, and confidence values are fixed per rule rather than calibrated against outcome frequencies.
- The repair PR from FI-01 is open and awaiting human review. Until it is merged, `main` still carries the ANSI-escape bug it fixes, which affects the assertion-mismatch rule only.
- No PR-triggered CI run exists yet; opening the repair PR produces one.
- The scheduled 00:00 UTC run is defined and on the default branch, but no scheduled run has elapsed, so the cron is shown by definition rather than by a run record.
- CI per-test retry counts have not been read back from a run artifact, so the CI flaky rate is stated as a method rather than a number.
- RCA does not suppress downstream symptoms, and records carry no business-severity or owner field.
- The 20-minute live defence has not been performed.

Full status, including what is deliberately not done: `docs/assessment-compliance.md`.
