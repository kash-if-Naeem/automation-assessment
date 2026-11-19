# Repair PR — ready to open

Open at:
<https://github.com/kash-if-Naeem/automation-assessment/compare/main...fi/01-wrong-expected-total?expand=1>

**Title**

```
FI-01 repair: strip ANSI escapes so RCA assertion rules match real failures
```

**Body**

```markdown
Repair proposal from the FI-01 controlled fault-injection exercise. Full write-up:
`docs/evidence/fi-01/README.md`.

## What the exercise found

The injected fault (a wrong expected cart total in AE-12) was supposed to classify as
`TEST_SCRIPT_DEFECT`. The first RCA run returned **`UNKNOWN` with zero hypotheses**.

Cause: Playwright colourises assertion text, so the error message is literally
`expect(<esc>[2mreceived<esc>[22m).toBe(...)`. The analyzer's assertion rule matched the
plain wording and therefore had never fired on a real failure. Every previous check of that
rule used hand-written sample input, which carries no escape codes — so the rule looked
correct and was not. Only a genuine injected fault exposed it.

## Changes

- `tools/rca/collect.ts`: strip ANSI escapes once, where evidence is stored, so the analyzer
  and the committed artifacts both see clean text.
- `tools/rca/verify-injections.ts`: use the merged expectation map rather than the base one,
  so a `RCA_EXPECT` override is actually applied.

The injected fault and its revert are both in this branch's history, so the **net diff
against `main` is only the two fixes above**. AE-12 is unchanged relative to `main`.

## Evidence

| Stage                      | Result                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Baseline, before injection | AE-12 passed (6.9s)                                                                                                                 |
| After injection `5931405`  | AE-12 **failed** — Expected 2500, Received 2000                                                                                     |
| RCA on the injected fault  | **`TEST_SCRIPT_DEFECT`, confidence 0.70**, citing `ui/cart.spec.ts changed in 5931405`; ranked and rejected `PRODUCT_DEFECT` (0.50) |
| Automated grading          | `[RCA Verify] AE-12: TEST_SCRIPT_DEFECT (0.7) OK — accuracy 1/1`                                                                    |
| After minimal patch        | AE-12 **passed** (5.9s)                                                                                                             |
| Clean-run RCA              | `status: ok, failures: 0`, no UNKNOWN cases                                                                                         |

Artifacts: `docs/evidence/fi-01/`.

## Review checklist (per `skills/review.md`)

- [ ] The patch is minimal: one token in the spec, plus the two tool fixes the exercise justified
- [ ] No assertion was weakened, deleted, or given a longer timeout
- [ ] No secrets, personal data or local paths in the committed artifacts
- [ ] The injected-fault commit `5931405` is **not** to be cherry-picked to `main` on its own
- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` pass
- [ ] The RCA classification was verified against the trace, not accepted on confidence alone

## Reviewer

Record the decision in `docs/evidence/human-approvals.md` before merging. An agent may not
merge this.
```
