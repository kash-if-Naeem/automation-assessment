# Controlled Fault-Injection Exercises

Injected failures test the framework and the RCA. They are never reported as product
defects, and each injected fault is labelled `injected: true` in its RCA record.

All three exercises have been executed. Accuracy: **3 / 3**.

| Exercise                         | Injected change                                           | Expected class           | Produced                 | Confidence | Evidence               |
| -------------------------------- | --------------------------------------------------------- | ------------------------ | ------------------------ | ---------- | ---------------------- |
| **FI-01** script fault           | Wrong expected cart total in AE-12, committed on a branch | `TEST_SCRIPT_DEFECT`     | `TEST_SCRIPT_DEFECT`     | 0.70       | `docs/evidence/fi-01/` |
| **FI-02** network fault          | `page.route` abort of the products document               | `ENVIRONMENT_OR_NETWORK` | `ENVIRONMENT_OR_NETWORK` | 0.90       | `docs/evidence/fi-02/` |
| **FI-03** timing fault (stretch) | Injected slow response, 3 attempts                        | `TIMING_OR_FLAKINESS`    | `TIMING_OR_FLAKINESS`    | 0.78       | `docs/evidence/fi-03/` |

Grading is automated: `npm run rca:verify` compares each injection against its known answer
and exits non-zero on a mismatch, so a classifier regression fails CI rather than surfacing
at defence time. The `fault-injection` job in `.github/workflows/playwright.yml` runs the
injected faults and that gate on every PR, dispatch and schedule, in a job separate from the
main suite so an injected failure never affects the real pass rate.

---

## FI-01 — script fault (executed)

Full write-up, before/after runs, commit ids and artifacts: **`docs/evidence/fi-01/README.md`**.

- Branch `repair/fi-01-ansi-strip`, injected commit `5931405`.
- AE-12 adds quantity 4; the injection asserts the total for quantity 5.
- Before: AE-12 passed. After injection: failed, `Expected 2500, Received 2000`
  (2000 is the site's correct arithmetic). After minimal patch: passed.
- RCA located the changed commit from `git diff HEAD~1 HEAD` and used it to rank
  `TEST_SCRIPT_DEFECT` (0.70) above `PRODUCT_DEFECT` (0.50). Without that signal the two tie
  and the record is `UNKNOWN`, which is the designed behaviour.
- The exercise exposed a real defect in the analyzer: ANSI escape codes in Playwright's
  assertion text meant the rule had never matched a genuine failure. That fix is the
  substance of the repair PR.

**Reproduce:**

```powershell
git checkout -b fi/01-wrong-expected-total
# change expectedLineTotal(unitPrice, 4) to (unitPrice, 5) in tests/ui/cart.spec.ts, then commit
npx playwright test -g "AE-12"
npm run rca:collect; npm run rca:analyze
$env:RCA_EXPECT = '{"AE-12":{"accept":["TEST_SCRIPT_DEFECT"],"rationale":"FI-01"}}'; npm run rca:verify
```

`RCA_EXPECT` exists because FI-01 injects into an existing scenario, so its record is filed
under `AE-12` rather than `FI-01`. The branch declares the mapping instead of hardcoding one
exercise into the tool.

## FI-02 — network fault (executed)

`tests/fault/fi-02-network.spec.ts`. A route abort scoped to one page in one test, so
nothing outside the test context is affected and no load is placed on the site.

```powershell
$env:FAULT_INJECTION = "FI-02"; npx playwright test tests/fault
npm run rca:collect; npm run rca:analyze; npm run rca:verify
Remove-Item Env:FAULT_INJECTION
```

Result: `page.goto: net::ERR_FAILED` → `ENVIRONMENT_OR_NETWORK` at 0.90, `injected: true`.

## FI-03 — timing fault (executed, stretch)

`tests/fault/fi-03-timing.spec.ts`. The delay lives inside the route interceptor; the
assessment bans arbitrary sleeps as a _synchronisation_ tool, but an injected slow response
is the fault under study.

Two design corrections were needed, both recorded in `docs/evidence/ai-interaction-log.md`:

1. The first version **passed**. Awaiting `page.goto` absorbed the injected delay, so the
   assertion then ran against a fully loaded page. The assertion now races the navigation,
   which makes the element genuinely late rather than absent.
2. It then classified as `LOCATOR_OR_UI_CHANGE` — plausible, and wrong. "Element missing"
   and "element late" are indistinguishable in the error text. The Collect stage now records
   response duration and flags responses over 2 s, and that evidence ranks
   `TIMING_OR_FLAKINESS` above the locator hypothesis. Observed: an 11,047 ms response.

Reproducibility: 3 of 3 attempts failed identically, so the fault is deterministic rather
than flaky-by-chance. `retries: 0` on the describe block, because a retry would mask the
reproducibility the exercise measures.

```powershell
$env:FAULT_INJECTION = "FI-03"; npx playwright test tests/fault
```

Use `FAULT_INJECTION=all` to run FI-02 and FI-03 together, as CI does.

## Evidence checklist

| Item                        | FI-01                                 | FI-02                               | FI-03                            |
| --------------------------- | ------------------------------------- | ----------------------------------- | -------------------------------- |
| Before / after runs         | Yes                                   | n/a (injection always fails)        | n/a                              |
| Commit ids                  | `29e4209` → `5931405` → `7745b08`     | —                                   | —                                |
| Trace / screenshot paths    | Yes                                   | Yes                                 | Yes                              |
| RCA JSON + Markdown         | Yes                                   | Yes                                 | Yes                              |
| Ranked alternative rejected | `PRODUCT_DEFECT`                      | `THIRD_PARTY_DEPENDENCY` considered | `LOCATOR_OR_UI_CHANGE` outranked |
| Automated grading           | 1/1                                   | 2/2 with FI-03                      | 2/2 with FI-02                   |
| Human decision              | **Pending — PR prepared, not opened** | Pending                             | Pending                          |
| Final validated fix         | Minimal one-token patch + ANSI fix    | n/a                                 | n/a                              |

No injected behaviour was reported as a product defect at any point.
