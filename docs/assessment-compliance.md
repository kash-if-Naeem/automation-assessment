# Assessment Compliance Checklist

Maps each requirement of the AI Level-3 assessment handout (v1.0) to evidence in this repo.
"Done" means verified here; anything not done says so plainly.

## Mandatory gates (section 16)

| Gate                                            | Status              | Evidence                                                                                                                                                 |
| ----------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reproducible working repo                       | **Done**            | Fresh clone → `npm ci`, typecheck, lint, format, `--list` 33 tests, 33/33 passing                                                                        |
| ≥18 passing UI cases, ≥8 API assertions         | **Done**            | 20 UI + 2 integration, 14 API endpoint/method checks; 33/33 green in CI runs 44598064284 and 44598758208                                                 |
| Working CI artifact capture                     | **Done**            | Artifacts on all three runs, including the failed one (1.55 MB on 44598758208)                                                                           |
| Two properly labelled fault-injection RCAs      | **Done — three**    | FI-01 `TEST_SCRIPT_DEFECT`, FI-02 `ENVIRONMENT_OR_NETWORK`, FI-03 `TIMING_OR_FLAKINESS`; 3/3 graded by `npm run rca:verify`                              |
| One human-reviewed patch validation             | **Open for review** | Repair PR from `fi/01-wrong-expected-total`; body in `docs/evidence/fi-01/repair-pr.md`. **The merge decision is the engineer's and has not been made.** |
| Prompt/skill and security controls demonstrated | **Done**            | 8 challenge/correction records in `docs/evidence/ai-interaction-log.md`; 4 skills; `docs/ai-policy.md`; `skills/review.md` prompt-injection section      |

## Outcomes (section 2)

| Requirement                                                                       | Status                                                                                                                                 |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Functioning repo, repeatable local and CI execution                               | Done                                                                                                                                   |
| 18+ UI scenarios, 6+ negative, 8+ API checks                                      | Done — 22 UI, 9 negative, 14 API                                                                                                       |
| Requirements-to-test traceability and risk prioritisation                         | Done — `docs/traceability.md` carries ID, risk, feature, steps, test data, expected outcome, layer, source ref, evidence and status    |
| Critical journeys assert beyond visibility                                        | Done — cart arithmetic to the cent, address vs fixture vs API 14, invoice content inspection, UI/API price parity                      |
| Scheduled CI at 05:00 Asia/Karachi and on PRs                                     | Defined and on the default branch (`0 0 * * *`, `pull_request`, `workflow_dispatch`). No scheduled run has elapsed yet                 |
| Per-run RCA artifact even on failure                                              | Done — `if: always()` collect + analyze + upload; verified on the failed run 44594790304                                               |
| Two fault-injection exercises, genuine and non-product                            | Done — three, all correctly classified                                                                                                 |
| AI-agent design with tools, guardrails, structured output, thresholds, audit logs | Done — `agents/orchestrator.md`, `docs/rca-schema.json`, `docs/evidence/`                                                              |
| Three consecutive smoke runs without unexplained failures                         | 6/6, 5/6, 6/6. The one failure was the site's queue page, triaged (A8). Every failure is documented and triaged, which the gate allows |

## Framework and standards (sections 4, 7)

| Requirement                                                                                             | Status                                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript, @playwright/test, Node LTS, Actions, JSON/JUnit/HTML, trace viewer, typed data and fixtures | Done                                                                                                                                |
| Accessible locators preferred, exceptions explained                                                     | Done — 8 exceptions each with its reason, `skills/playwright.md`                                                                    |
| No fixed sleeps, no blanket force clicks                                                                | Done — 0 occurrences; ESLint rejects `waitForTimeout`                                                                               |
| Parallel-safe: unique users, per-worker fixtures, cleanup                                               | Done — per-test UUID identity; teardown deletes via API 12 and attaches `cleanup-status.json`                                       |
| No secrets, card or personal data committed                                                             | Done — `redact()` on all logs and artifacts; `.invalid` emails; published test PAN only; committed evidence stripped of local paths |
| Expected folder layout                                                                                  | Done — all paths present                                                                                                            |
| README with setup, commands, tags, config, limitations                                                  | Done                                                                                                                                |

## RCA specification (section 10)

| Stage       | Required                                                                                  | Status                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Detect      | JUnit/Playwright JSON, test id, error, stack, retry count, run URL, commit SHA            | **Done** — all seven, including JUnit XML cross-check                                                                         |
| Collect     | Trace, screenshot, DOM snapshot, console errors, sanitized request failures, code changes | **Done** — plus response timing; URLs stripped of query strings                                                               |
| Correlate   | Failing assertion and prior step; first failure vs downstream                             | Partial — the first failing assertion and the HEAD diff are captured; downstream-symptom suppression is not implemented       |
| Hypothesize | Rank competing causes with evidence for and against                                       | **Done** — every record ranks hypotheses with both                                                                            |
| Validate    | Re-run isolated test, inspect locator/response/diff, never silently edit                  | **Done** — each record carries the exact re-run command; no automatic edits                                                   |
| Recommend   | Category, confidence, severity, reproduction, fix, owner, next action                     | Partial — category, confidence, reproduction, action and approval flag are present; business severity and named owner are not |
| Publish     | Markdown + JSON + artifact URLs, including UNKNOWN                                        | **Done**                                                                                                                      |

Eight categories, 0.60 confidence floor, tie → UNKNOWN, missing trace lowers confidence,
`requires_human_approval: true` on every record, model-free with no API key required.

## Submission pack (section 14)

| Item                                                                                  | Status                                                                                                          |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Repo URL, commit history, README                                                      | Done                                                                                                            |
| Test strategy: risk matrix, assumptions, scope, catalogue, traceability, gaps         | Done — `docs/test-strategy-detailed.md`, `docs/traceability.md`, `docs/assumptions-log.md`                      |
| Architecture diagram with triggers, inputs, outputs, interfaces, stop conditions      | Done — `docs/architecture-detailed.md`                                                                          |
| Executable tests, config, fixtures, deterministic data, cleanup evidence              | Done                                                                                                            |
| CI evidence: artifacts, failure handling                                              | Done for dispatch runs. **No PR run yet** — the repair PR will produce one                                      |
| AI artifacts: prompts, skills, tool choice, interventions                             | Done — 8 records. Cost/latency not instrumented, and not claimed                                                |
| RCA package: schema, 2 injected reports, normal-run summary, alternatives, confidence | Done — schema 1.1, three injected reports, clean-run summary in `docs/evidence/fi-01/`                          |
| Quality scorecard                                                                     | Done — pass rate, flaky rate, duration, injection accuracy, time-to-triage (3.2 s measured), maintenance effort |
| Presentation and 20-minute live defence                                               | **Not performed** — the engineer's to deliver                                                                   |

## Honest gaps

1. **The repair PR is not merged.** The human-review gate is genuinely open, by design.
2. **No PR-triggered CI run** exists yet; opening the repair PR produces one.
3. **No LLM adapter.** `AI_API_KEY` is accepted but unused; the classifier is rule-based and
   its confidences are fixed per rule, not calibrated against outcome frequencies.
4. **Downstream-symptom suppression** and **business severity / owner** fields are not
   implemented in the RCA.
5. **CI per-test retry counts** have not been read back from an artifact, so the CI flaky
   rate is given as a method, not a number.
6. **No scheduled run has elapsed**, so the cron is shown by definition, not by a run record.
7. **The live defence has not happened.** Six rubric points depend on it.
