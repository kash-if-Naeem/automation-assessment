# Assessment Compliance Checklist

Maps each requirement in the AI Level-3 assessment handout (v1.0) to evidence in this repo. "Done" means checked in this repo; "Needs your run" means it requires a push, a GitHub Actions run or a human step.

## Mandatory gates (section 16)

| Gate                                                | Status         | Evidence / what is left                                                                                        |
| --------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| Reproducible working repo                           | Done (local)   | `npm ci`, `npm run typecheck`, `npx playwright test --list` (33 tests), live run 33/33                         |
| At least 18 passing executable UI cases             | Done (live)    | 20 UI tests passed in the live run                                                                             |
| At least 8 API assertions                           | Done (live)    | 14 distinct API endpoints/methods, all passing                                                                 |
| Working CI artifact capture                         | Needs your run | Workflow updated. Push a branch and open a PR to produce a run and artifact                                    |
| Two properly labelled fault-injection RCAs          | Partial        | FI-02 executed with RCA output in `docs/evidence/fi-02/`. FI-01 needs a branch (see `docs/fault-injection.md`) |
| One human-reviewed patch validation                 | Needs your run | Repair PR is a human step. Not created by the agent                                                            |
| Demonstration of prompt/skill and security controls | Partial        | Skills and policy written. Prompt log has placeholders (see below)                                             |

## Outcomes (section 2)

| Requirement                                                                        | Status                                                                                                                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functioning Git repo, local and CI execution                                       | Done locally; CI needs a run                                                                                                                                  |
| 18+ UI scenarios across six functional areas, 6+ negative cases, 8+ API checks     | Done (20 UI, 14 API, 6+ negative)                                                                                                                             |
| Requirements-to-test traceability and risk prioritisation                          | Done: `docs/traceability.md`, `docs/strategy.md`                                                                                                              |
| Critical journeys have assertions beyond visibility                                | Done: flagship checks calculations, addresses and invoice content                                                                                             |
| Scheduled CI at 05:00 Asia/Karachi and on PRs                                      | Done: cron `0 0 * * *` (00:00 UTC) on `main`, plus `pull_request` and `workflow_dispatch`                                                                     |
| Per-run RCA artifact even if tests fail                                            | Done in workflow: `if: always()` collect, analyze and upload                                                                                                  |
| Two fault-injection exercises (one genuine, one non-product)                       | Partial, see above                                                                                                                                            |
| AI-agent design with tools, guardrails, RCA output, thresholds, audit logs         | Done: `agents/orchestrator.md`, `skills/*.md`, `docs/rca-schema.json`                                                                                         |
| Three consecutive smoke runs without unexplained failures, or triage every failure | Triaged: runs 1 and 2 passed (6/6). Run 3 had 1 failure caused by the site's "queue full" page, recorded with its snapshot. Repeat the run for a clean series |

## Scenario and layer requirements (section 5)

| Requirement                                                                                                                      | Status                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Each scenario in a traceability matrix with ID, priority, feature, steps, data, outcome, layer, source mapping, evidence, status | Partly: ID, priority, feature, layer, source ref, file and status are in `docs/traceability.md`. Steps and data are in the spec files |
| Independent boundary design, not copies of the 26 published cases                                                                | Partly: negative cases and boundaries added; several cases follow the published steps                                                 |

## Framework and standards (sections 4, 7)

| Requirement                                                                                                                | Status                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| TypeScript, @playwright/test, Node LTS, GitHub Actions, JSON/JUnit/HTML, trace viewer, typed data, fixtures                | Done                                                                                            |
| Accessible locators with documented exceptions                                                                             | Done: `data-qa` and ids used where roles are not available; rationale in `skills/playwright.md` |
| No fixed sleeps or blanket force clicks                                                                                    | Done: ESLint rule bans `waitForTimeout`; no `force: true`                                       |
| Parallel-safe: unique users, per-worker fixtures, cleanup                                                                  | Done: `generateTestUser()` per test; teardown deletes accounts through API 12                   |
| No secrets or personal data in commits, prompts, traces, reports                                                           | Done: `redact()` on logs, cleanup status and RCA text; invented data only                       |
| Expected folders: `config/`, `docs/`, `skills/`, `agents/`, `src/pages`, `src/api`, `src/fixtures`, `src/utils`, `tests/ui | api                                                                                             | integration`, `tools/rca` | Done |
| `.env.example`, README with setup, commands, tags, CI and limitations                                                      | Done                                                                                            |

## Still open (be explicit in the defence)

- AE-16 does not cross-check the address through API 14. The API address check is not implemented.
- FI-01 has not been executed. It needs a branch and a commit so the "changed in HEAD" rule can fire.
- FI-03 (stretch) is not implemented.
- No LLM adapter is implemented. AI_API_KEY is accepted but unused. The model-free fallback is the only classifier.
- Prompt and approval logs in `docs/evidence/` are templates. They must be filled from the candidate's real sessions. They were not invented here.
