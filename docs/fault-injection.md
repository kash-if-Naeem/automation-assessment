# Controlled Fault-Injection Exercises

Injected failures are for testing the framework. They are never reported as product defects.

## FI-02: network fault (executed)

- **Injected change:** `page.route('**/products', route => route.abort('failed'))` in `tests/fault/fi-02-network.spec.ts`. It applies to one page in one test only.
- **Run:** `FAULT_INJECTION=FI-02 npx playwright test tests/fault` (PowerShell: `$env:FAULT_INJECTION='FI-02'; npx playwright test tests/fault`).
- **Result:** `page.goto: net::ERR_FAILED at https://automationexercise.com/products`.
- **RCA:** `ENVIRONMENT_OR_NETWORK`, confidence 0.90, `injected: true`. Evidence in `docs/evidence/fi-02/`.
- **Expected by the assessment:** ENVIRONMENT_OR_NETWORK or a test-controlled fault, with no false product-defect claim. Met.

## FI-01: script fault (procedure, not yet executed)

The injected change must be committed on a dedicated branch so the "changed in HEAD" rule can fire.

1. Create a branch, for example `fi/01-wrong-expected-total`.
2. In `tests/ui/cart.spec.ts` (AE-12), change `expectedLineTotal(unitPrice, 4)` to `expectedLineTotal(unitPrice, 5)`. Commit the change with a message that says it is an injected fault.
3. Run `npx playwright test -g "AE-12"`. It should fail with an expected/received mismatch.
4. Run `npm run rca:collect` and `npm run rca:analyze`.
5. Expected: TEST_SCRIPT_DEFECT (confidence 0.70, the spec changed in HEAD), with PRODUCT_DEFECT as the rejected alternative.
6. Propose the minimal patch (revert the expected value) on the same branch, re-run AE-12 and confirm it passes.
7. Record the before and after runs, the commit IDs, the RCA output, the human decision and the final validated fix in `docs/evidence/fi-01/`.

Without step 2 (a committed change), the analyzer returns UNKNOWN. That is the correct outcome for insufficient evidence.

## FI-03: delayed response (stretch, not implemented)

Would use `page.route` with a controlled `route.fulfill` delay and no fixed sleeps. Not started.

## Evidence checklist for each exercise

- [ ] Before and after run output
- [ ] Commit IDs
- [ ] Screenshot or trace path
- [ ] AI hypothesis (from `rca-report.json`)
- [ ] Rebuttal, if any (written by the engineer)
- [ ] Human decision (date, reviewer)
- [ ] Final validated fix
