# FI-01 — script fault: wrong expected cart total

Controlled fault-injection exercise, run on branch `fi/01-wrong-expected-total`.
Executed 2026-11-20 against the live site.

## Injected change

|                           |                                                                            |
| ------------------------- | -------------------------------------------------------------------------- |
| Branch                    | `fi/01-wrong-expected-total`                                               |
| Base commit (clean)       | `29e4209`                                                                  |
| **Injected-fault commit** | **`5931405`** — "FI-01 INJECTED FAULT: wrong expected cart total in AE-12" |
| File                      | `tests/ui/cart.spec.ts` (AE-12)                                            |
| Change                    | `expectedLineTotal(unitPrice, 4)` → `expectedLineTotal(unitPrice, 5)`      |

AE-12 adds quantity **4** to the cart, so asserting the total for quantity 5 makes the
expectation wrong while the site's arithmetic stays correct. This is a test defect wearing
the costume of a product defect — the point of the exercise.

## Before / after

| Stage                       | Command                          | Result                                      | Evidence         |
| --------------------------- | -------------------------------- | ------------------------------------------- | ---------------- |
| Baseline (before injection) | `npx playwright test -g "AE-12"` | 1 passed (6.9s)                             | run on `29e4209` |
| After injection             | `npx playwright test -g "AE-12"` | **1 failed** — Expected 2500, Received 2000 | `before-run.txt` |
| After minimal patch         | `npx playwright test -g "AE-12"` | **1 passed** (5.9s)                         | `after-run.txt`  |

The received value 2000 is the site's correct arithmetic (Rs. 500 × 4). The expected value
2500 is the injected mistake.

## RCA output

Produced by `npm run rca:collect && npm run rca:analyze`, model-free, no API key.
Full record in `before-rca-report.json`.

| Field                            | Value                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Scenario                         | AE-12 (the injection lives inside an existing scenario, so the record is filed there) |
| **Classification**               | **`TEST_SCRIPT_DEFECT`**                                                              |
| Confidence                       | 0.70                                                                                  |
| Rule                             | `assertion-mismatch-recent-spec-change`                                               |
| Evidence for                     | `ui/cart.spec.ts changed in 5931405 (git diff HEAD~1 HEAD)`                           |
| Ranked alternative               | `PRODUCT_DEFECT` (0.50) — rejected because the failing spec itself changed in HEAD    |
| Evidence against the alternative | "the failing spec changed in HEAD (see TEST_SCRIPT_DEFECT)"                           |
| Requires human approval          | `true`                                                                                |

The analyzer **located the changed commit** (`5931405`) from `git diff HEAD~1 HEAD` and used
it to rank a script defect above a product defect. Without that signal the two hypotheses
tie and the record would have been `UNKNOWN`, which is the designed behaviour.

### Automated grading

`npm run rca:verify` with the branch's declared expectation:

```
RCA_EXPECT='{"AE-12":{"accept":["TEST_SCRIPT_DEFECT"],"rationale":"FI-01: wrong expected cart total injected into AE-12 in HEAD"}}'
[RCA Verify] AE-12: TEST_SCRIPT_DEFECT (0.7) OK
[RCA Verify] accuracy 1/1
```

Recorded in `before-injection-accuracy.json`.

## A real defect this exercise uncovered

The first RCA run on the injected fault returned **`UNKNOWN` with zero hypotheses**. The
assertion rule had never matched a real failure, because Playwright colourises its error
text: the message is literally `expect(<esc>[2mreceived<esc>[22m).toBe(...)`, so the plain
`expect(received).toBe` pattern never fired.

Every earlier check of that rule had used hand-written sample input, which carries no escape
codes — so the rule looked correct and was not. Running a genuine injected fault is what
exposed it.

Fix: `tools/rca/collect.ts` now strips ANSI escapes once, where evidence is stored, so every
downstream consumer sees clean text. This is the substantive change in the repair PR.

## Minimal patch

```diff
-    expect(parsePrice(lines[0].lineTotal)).toBe(expectedLineTotal(unitPrice, 5));
+    expect(parsePrice(lines[0].lineTotal)).toBe(expectedLineTotal(unitPrice, 4));
```

One token. The patch reverts the expectation to the quantity the test actually adds; it does
not weaken the assertion, raise a timeout or delete a check.

## Clean-run summary

After the patch, `rca:collect` + `rca:analyze` on a passing run report
`status: ok, failures: 0` with no UNKNOWN cases — see `after-rca-summary.md` and
`after-collection-status.json`.

An earlier attempt at this step ran with `--reporter=list`, which overrides the configured
reporters so no `results.json` was written. The collector reported `results_missing` and the
summary said "no test outcome can be stated from this run" rather than implying a pass.
That is the required graceful handling of a missing report, observed rather than asserted.

## Human review

The injected commit `5931405` must never reach `main`. The repair PR carries both the
injection and its revert, so the **net diff against `main` is the ANSI fix alone**, with the
exercise preserved in history. Reviewer sign-off is recorded in
`docs/evidence/human-approvals.md`.
