# Quality Scorecard

Measured 2026-11-19 / 2026-11-20 against the live public site. Re-measure before quoting: results depend on the
state of automationexercise.com at run time. Figures marked "not measured" need a run this build has not made.

## Execution

| Metric                      | Result                               | Evidence                                                            |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| Automated UI tests          | 20                                   | AE-01 to AE-21; AE-15, AE-16 and AE-17 are separate tests           |
| Automated API checks        | 14 endpoints and methods             | All 14 documented APIs; negative cases 405, 400, 404                |
| Total executable tests      | 33                                   | `npm run test:list`                                                 |
| Full run, local fresh clone | 33 of 33 passed (1.4 min, 2 workers) | Clean clone of `main`, Chromium                                     |
| Full run, CI                | 33 of 33 passed                      | Runs 44598064284 and 44598758208 (both green on `main` @ `491c9e6`) |
| Smoke subset, 3 consecutive | 6/6, 5/6, 6/6                        | The one failure was the site "queue full" page; triaged, see A8     |
| Typecheck                   | Pass                                 | `npm run typecheck`                                                 |
| Lint                        | 0 errors, 9 warnings                 | Warnings are `any` in the RCA tools                                 |
| Format check                | Pass                                 | `npm run format:check` on a clean clone                             |

## RCA accuracy on known injections

| Injection | Expected class         | Produced class         | Correct | Evidence                                    |
| --------- | ---------------------- | ---------------------- | ------- | ------------------------------------------- |
| FI-02     | ENVIRONMENT_OR_NETWORK | ENVIRONMENT_OR_NETWORK | Yes     | `docs/evidence/fi-02/`                      |
| FI-01     | TEST_SCRIPT_DEFECT     | not executed           | n/a     | `docs/fault-injection.md` has the procedure |

RCA accuracy on known injections: **1 of 2 exercises executed** (1 of 1 correct on the one that ran).

## Not measured

| Metric             | Why                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Flaky/retry rate   | Local runs disable retries; CI retries once. Read `attempts`/`retry_count` from a CI `results.json` to populate this. |
| Time-to-triage     | Collector and analyzer finish in seconds, but no triage-to-decision clock was kept.                                   |
| Maintenance effort | No hours-per-change record kept across the build.                                                                     |

## CI history

| Run         | Commit    | Trigger           | Result  | Note                                                               |
| ----------- | --------- | ----------------- | ------- | ------------------------------------------------------------------ |
| 44594790304 | `c8a0630` | workflow_dispatch | failure | All 33 failed: site returned HTTP 403 (WAF) to the runner. See A14 |
| 44598064284 | `491c9e6` | workflow_dispatch | success | All 33 passed; artifact uploaded                                   |
| 44598758208 | `491c9e6` | workflow_dispatch | success | All 33 passed; artifact uploaded                                   |

The 403 block was intermittent, not permanent: the same workflow and commit range passed twice afterwards.
The scheduled 00:00 UTC run is defined and the workflow is on the default branch, but no scheduled run has
elapsed yet, so it is not yet evidenced by a run record.

## Known limitations

- The public site is shared. It intermittently returns a queue page, a Cloudflare 52x page, or HTTP 403 to
  CI runners. Those failures are classified `THIRD_PARTY_DEPENDENCY` and are not product defects.
- The RCA is rule-based with no LLM adapter. `AI_API_KEY` is accepted but unused, and confidence values are
  fixed per rule rather than calibrated against outcomes.
- FI-01 and FI-03 have not been executed. One human-reviewed repair PR has not been done.
- `docs/evidence/ai-interaction-log.md` and `human-approvals.md` are templates, not filled records.
- Account cleanup uses the public delete endpoint; a failed delete is logged in `cleanup-status.json` and is
  not retried.
