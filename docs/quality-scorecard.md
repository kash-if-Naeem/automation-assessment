# Quality Scorecard

All figures below were measured, not estimated. Where something was not measured it says so
and names the method to obtain it. Measured 2026-11-19 / 2026-11-20 against the live public
site; results depend on the state of automationexercise.com at run time.

## Coverage

| Metric                          | Result                                                                                   | Source                 |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| Executable tests (normal suite) | **33**                                                                                   | `npm run test:list`    |
| UI tests                        | 20 in `tests/ui/` (+2 integration tests that drive a browser)                            | spec files             |
| API checks                      | **14 distinct endpoint/method checks** across 11 tests                                   | all 14 documented APIs |
| Negative / edge cases           | **9** — AE-03 (UI, API 10), AE-04, AE-05 (API 8), AE-08 (UI, API 6), AE-23 (API 2, 4, 9) | `docs/traceability.md` |
| Fault-injection tests           | 4 (FI-02 ×1, FI-03 ×3), excluded from the normal suite                                   | `tests/fault/`         |
| Assessment minimums             | 18 UI / 8 API / 6 negative — **all met**                                                 |                        |

## Execution pass rate

Nine full-suite runs are on record (297 test executions).

| Run                        | Code      | Result    | Cause of failures                                             |
| -------------------------- | --------- | --------- | ------------------------------------------------------------- |
| Local (earlier code)       | pre-fix   | 30/33     | 2× Cloudflare 525, 1× queue page — **site**                   |
| Fresh clone (earlier code) | pre-fix   | 32/33     | AE-11 display-text mismatch — **code defect, fixed**          |
| Local (earlier code)       | pre-fix   | 31/33     | 1× queue page (site), AE-21 carousel — **code defect, fixed** |
| CI 44594790304             | `c8a0630` | 0/33      | HTTP 403 WAF block on every request — **site**                |
| Fresh clone                | `c8a0630` | **33/33** | —                                                             |
| CI 44598064284             | `491c9e6` | **33/33** | —                                                             |
| CI 44598758208             | `491c9e6` | **33/33** | —                                                             |
| Fresh clone of `main`      | `491c9e6` | **33/33** | —                                                             |
| Local after RCA/FI work    | `29e4209` | **33/33** | —                                                             |

- **Overall:** 258 / 297 = **86.9%**
- **On current code (last 5 runs, 165 executions):** **100%**
- **Failures attributable to the framework:** 2 of 39 (**5.1%**); the other 37 were the public
  site returning 403, 52x or a queue page.

## Reliability

| Metric                                                     | Result                                          | Method                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Smoke subset, 3 consecutive                                | 6/6, 5/6, 6/6                                   | The one failure was the site's queue page, triaged to A8                                            |
| Flaky rate (passed on an identical re-run, no code change) | **3 / 297 = 1.0%**                              | The 3 site-induced failures in run 1 all passed on `--last-failed`; recorded in `rerun-last-failed` |
| Retry rate                                                 | 0 locally (retries disabled); CI allows 1 retry | CI per-test retry counts are in `attempts`/`retry_count` in the run artifact's `failures.json`      |
| Duration, full suite                                       | 1.4–2.0 min at 2 workers                        | run logs above                                                                                      |
| Duration, smoke subset                                     | ~36 s                                           | smoke run logs                                                                                      |

## RCA accuracy on known injections

Graded automatically by `npm run rca:verify`, which fails CI on a wrong classification.

| Injection           | Expected                 | Produced                 | Confidence | Correct | Evidence               |
| ------------------- | ------------------------ | ------------------------ | ---------- | ------- | ---------------------- |
| FI-01 script fault  | `TEST_SCRIPT_DEFECT`     | `TEST_SCRIPT_DEFECT`     | 0.70       | **Yes** | `docs/evidence/fi-01/` |
| FI-02 network fault | `ENVIRONMENT_OR_NETWORK` | `ENVIRONMENT_OR_NETWORK` | 0.90       | **Yes** | `docs/evidence/fi-02/` |
| FI-03 timing fault  | `TIMING_OR_FLAKINESS`    | `TIMING_OR_FLAKINESS`    | 0.78       | **Yes** | `docs/evidence/fi-03/` |

**Accuracy: 3 / 3.** FI-03 reproduced 3/3 attempts, so the timing fault is deterministic
rather than flaky-by-chance.

Both wrong classifications found during the build were caught by this gate, not by review:
FI-01 initially returned `UNKNOWN` (ANSI escapes defeated the assertion rule) and FI-03
initially returned `LOCATOR_OR_UI_CHANGE` (no response-timing evidence). See
`docs/evidence/ai-interaction-log.md` entries 5 and 8.

## Time-to-triage

**3.2 s** from a finished failing run to a classified, human-readable report — mean of 3
samples (3227, 3182, 3215 ms) over a 4-failure bundle, running
`npm run rca:collect && npm run rca:analyze`. No network and no model call, so this figure
does not vary with API latency or availability.

## Maintenance effort

Measured over this build rather than estimated.

| Signal                                            | Count            | Detail                                                                                                                                                           |
| ------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site-driven adaptations                           | **6**            | A3 price format, A4 cart description, A5 non-link checkout control, A6 brand count prefix, A7 address headings, A10 cart render race (`docs/assumptions-log.md`) |
| Framework defects found after the first green run | **2**            | AE-11 display-text identity, AE-21 inactive carousel slide                                                                                                       |
| Oracle changes needed                             | **1 structural** | Cart identity moved from display text to product id, which removed a whole class of text drift                                                                   |
| Locator policy exceptions                         | **8 documented** | `skills/playwright.md`; each with the reason a role locator does not work                                                                                        |

The dominant maintenance cost was the public site changing its rendered text between the
served HTML and the live DOM, not Playwright or the framework. Switching the cart oracle
from text to product id eliminated that cost for cart scenarios.

## Build quality gates

| Gate                                | Result                                            |
| ----------------------------------- | ------------------------------------------------- |
| `npm run typecheck`                 | Pass                                              |
| `npm run lint`                      | 0 errors, 5 warnings (all `any` in the RCA tools) |
| `npm run format:check`              | Pass                                              |
| Fixed sleeps / blanket force clicks | 0 (ESLint rejects `waitForTimeout`)               |

## CI history

| Run         | Commit    | Trigger  | Result  | Note                                                      |
| ----------- | --------- | -------- | ------- | --------------------------------------------------------- |
| 44594790304 | `c8a0630` | dispatch | failure | All 33 failed: site returned HTTP 403 to the runner (A14) |
| 44598064284 | `491c9e6` | dispatch | success | 33/33; artifact uploaded                                  |
| 44598758208 | `491c9e6` | dispatch | success | 33/33; artifact 1.55 MB                                   |

The 403 block was intermittent, not permanent: the same workflow passed twice afterwards.
It was recorded, not worked around — evading a WAF is prohibited by section 13.

The scheduled 00:00 UTC run is defined and the workflow is on the default branch, but no
scheduled run has elapsed yet, so it is not yet evidenced by a run record.

## Known limitations

- The public site intermittently returns a queue page, a Cloudflare 52x page, or HTTP 403 to
  CI runners. Those are classified `THIRD_PARTY_DEPENDENCY`, never product defects.
- The RCA is rule-based. No LLM adapter is implemented; `AI_API_KEY` is accepted but unused.
  Confidence values are fixed per rule, not calibrated against outcome frequencies.
- CI per-test retry counts have not been read back from a run artifact, so the CI flaky rate
  is stated as a method rather than a number.
- The repair PR from FI-01 is open and awaiting human review; it has not been merged.
- The 20-minute live defence has not been performed.
