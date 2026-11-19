# Quality Scorecard

Measured on 2026-11-19 against the live site. Re-measure before quoting. Figures marked "not measured" need a run this build has not made.

| Metric                    | Result                                  | Notes                                                                                    |
| ------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Automated UI tests        | 20                                      | AE-01 to AE-21 (AE-15, AE-16 and AE-17 are separate tests)                               |
| Automated API checks      | 14 endpoints and methods                | Includes negative cases (405, 400, 404)                                                  |
| Full live run             | 33 of 33 passed                         | 2 workers, 1.7 min, Chromium                                                             |
| Smoke subset, runs 1 to 3 | 6 of 6, 6 of 6, 5 of 6                  | Run 3 failure: site "queue full" page. See `docs/assumptions-log.md` A8                  |
| Flaky or retry rate       | Not measured in CI                      | Local runs with retries disabled. CI retries once; collect the count from `results.json` |
| Typecheck                 | Pass                                    | `npm run typecheck`                                                                      |
| Lint                      | 0 errors, 9 warnings                    | Warnings are `any` in RCA tools                                                          |
| Format check              | Not run                                 | Run `npm run format:check` before the PR                                                 |
| RCA on injected FI-02     | 1 of 1 correct (ENVIRONMENT_OR_NETWORK) | `docs/evidence/fi-02/`                                                                   |
| RCA on injected FI-01     | Not executed                            | See `docs/fault-injection.md`                                                            |
| Time-to-triage            | Not measured                            | Collector and analyzer run in seconds on a local run                                     |
| Maintenance effort        | Not measured                            | Track hours per locator or flow change                                                   |

## Known limitations

- The public site is shared and can show a queue page. Results depend on its state at run time.
- The RCA is rule-based. It has no LLM adapter. Confidence values are fixed per rule, not calibrated against outcomes.
- No CI run has been produced from this branch yet. The schedule cannot be shown to fire until the workflow is on `main`.
- Account cleanup uses the public delete endpoint. A failed delete is logged in `cleanup-status.json` and is not retried.
