# Human Approval Decisions

Only decisions the engineer actually made are recorded as approved. Rows marked **pending**
are awaiting review and must not be read as approved. An agent may not fill a row on the
reviewer's behalf.

## Recorded decisions

| Date       | Item                                                                                         | Decision                                               | Reviewer      | Evidence                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------- |
| 2026-11-19 | Merge upstream docs without overwriting a teammate's files; keep both versions               | Approved — "do the docs merge and the RCA fix locally" | kash-if-Naeem | `docs/strategy.md`, `docs/architecture.md` kept verbatim; fuller versions renamed to `*-detailed.md` |
| 2026-11-19 | RCA: classify WAF 403 blocks as `THIRD_PARTY_DEPENDENCY`                                     | Approved — "commit and push the RCA fix"               | kash-if-Naeem | commit `491c9e6`                                                                                     |
| 2026-11-19 | Publish `assessment-fixes` as the default branch rather than opening a PR into an empty repo | Approved — chose option 1                              | kash-if-Naeem | `main` created at `c8a0630`; default branch switched by the engineer                                 |
| 2026-11-20 | Commit the FI-02 RCA artifacts and correct the stale scorecard                               | Approved — "Push the fixes"                            | kash-if-Naeem | commit `d701dfd`; verified live via `raw.githubusercontent.com`                                      |

## Pending review

| Item                                                         | Status                                 | Where to review                                                                          |
| ------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Repair PR from FI-01** (ANSI-strip fix + `RCA_EXPECT` fix) | **Pending**                            | branch `fi/01-wrong-expected-total`; body prepared in `docs/evidence/fi-01/repair-pr.md` |
| FI-01 classification (`TEST_SCRIPT_DEFECT`, 0.70)            | Pending verification against the trace | `docs/evidence/fi-01/before-rca-report.json`                                             |
| FI-02 classification (`ENVIRONMENT_OR_NETWORK`, 0.90)        | Pending                                | `docs/evidence/fi-02/rca-report.json`                                                    |
| FI-03 classification (`TIMING_OR_FLAKINESS`, 0.78)           | Pending                                | `docs/evidence/fi-03/rca-report.json`                                                    |
| Test coverage and priorities                                 | Pending                                | `docs/test-strategy-detailed.md`, `docs/traceability.md`                                 |
| Release go/no-go                                             | Pending                                | `docs/quality-scorecard.md`                                                              |

## Standing constraints

- No agent merges to `main`, changes CI secrets, or deletes data outside disposable test
  fixtures (`docs/ai-policy.md`).
- The injected-fault commit `5931405` must never reach `main` on its own. The repair PR
  carries the injection and its revert together, so the net diff is the fix alone.
- Every RCA record carries `requires_human_approval: true`. A classification is a hypothesis
  until a reviewer verifies the cited artifacts.
