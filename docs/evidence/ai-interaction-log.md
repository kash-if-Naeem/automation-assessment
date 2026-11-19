# AI Interaction Log

Records of AI-proposed work that was challenged and corrected during this build, with the
evidence that forced each correction. The assessment asks for at least five; there are eight.

**How to read this.** The AI (Claude, via Claude Code) proposed the code and the RCA rules.
What challenged each proposal was concrete evidence — a live run, a CI run, a page snapshot
or an injected fault — not an opinion. Each entry names that evidence so a reviewer can
re-check it. Entries 1–3 are test-code defects, 4–6 are RCA and governance defects, 7–8 are
process defects.

The **Human decision** column records only decisions the engineer actually made. Where it
says _pending_, the change is in the repo awaiting review and must not be read as approved;
sign-off belongs in `docs/evidence/human-approvals.md`.

No model was called from CI. Cost and latency were not instrumented, so they are not claimed.

---

### Entry 1 — `parsePrice` silently returned a 1000× wrong number

- **Skill:** `skills/playwright.md` (oracles and calculations)
- **AI proposal:** `parsePrice` stripped every non-digit except `.`:
  `raw.replace(/[^\d.]/g, '')`.
- **Challenge:** the first live run of AE-12 failed with `Expected: 2, Received: 0.2`. The
  site renders `Rs. 2000`, and the kept period from `Rs.` turned it into `.2000`.
- **Why it mattered:** AE-12 is a P0 arithmetic oracle. The same bug was present in the
  original repo, so AE-12 could never have passed there — the test existed but could not
  have been green.
- **Correction:** parse the first numeric token instead —
  `raw.replace(/,/g, '').match(/\d+(\.\d+)?/)`.
- **Evidence:** `src/utils/calculations.ts`; AE-12 passing in CI run 44598758208.
- **Human decision:** accepted implicitly by the engineer's instruction to fix the failing
  suite; _reviewer sign-off pending_.

### Entry 2 — a web-first assertion that could never pass

- **Skill:** `skills/playwright.md` (no fixed sleeps)
- **AI proposal:** to wait for the cart to settle without a sleep:
  `await expect(cartRows.first().or(emptyCart)).toBeVisible()`.
- **Challenge:** the run failed with `strict mode violation: ... resolved to 2 elements`.
  The site keeps a hidden `Cart is empty!` node in the DOM even when the cart has items, so
  the `.or()` matched both branches at once.
- **Correction:** `expect.poll` over an explicit predicate — rows present **or** the empty
  message _visible_ — which retries without a sleep and tolerates the hidden node.
- **Evidence:** `CartPage.waitForSettled`; the failing run is recorded in the assumptions
  log as A10.
- **Human decision:** _pending_.

### Entry 3 — matching cart items by display text

- **Skill:** `skills/test-design.md` (oracles)
- **AI proposal:** assert cart contents by comparing the listing name to the cart row text.
- **Challenge:** a fresh-clone run failed with
  `Expected "Men TshirtMen's T-shirts", Received ["Blue Top", "Men Tshirt"]`. The listing
  text acquires extra content at runtime that is absent from the served HTML (checked with
  `curl`), so the two layers legitimately disagree.
- **Challenge to the first fix:** switching to `innerText` did **not** fix it. That proved
  the problem was the choice of oracle, not how the text was read.
- **Correction:** compare **product identity**, not presentation — `data-product-id` on the
  add-to-cart control and the `/product_details/<id>` link in the cart row. Display text is
  still asserted where the text itself is the requirement.
- **Evidence:** `ProductsPage.summaryAt`, `CartPage.readLines`, `tests/ui/cart.spec.ts`
  (AE-11, AE-14); assumptions log A4.
- **Human decision:** _pending_.

### Entry 4 — RCA blamed the tests for a site block

- **Skill:** `skills/rca.md` (classification policy)
- **AI proposal:** classify a non-JSON API body with a 4xx status as `TEST_SCRIPT_DEFECT`.
- **Challenge:** CI run **44594790304** failed all 33 tests with `HTTP 403` and an empty
  body on every endpoint. A test defect cannot make every endpoint return 403 at once, and
  the repo's own earlier note already recorded the runner being blocked by Cloudflare.
- **Correction:** 403 and 429 are site-side blockers (`THIRD_PARTY_DEPENDENCY`); the
  non-JSON client-error rule now explicitly excludes them. The collector also labels
  Cloudflare and access-denied page snapshots.
- **Deliberate non-action:** the block was **not** worked around. Changing headers or retry
  behaviour to evade a WAF is prohibited by section 13. It was recorded as A14 instead.
- **Evidence:** `tools/rca/analyze.ts` rule `site-unavailable`; assumptions log A14.
- **Human decision:** engineer instructed "commit and push the RCA fix" — **approved**,
  commit `491c9e6`.

### Entry 5 — an assertion rule that had never once fired

- **Skill:** `skills/rca.md` (evidence hierarchy)
- **AI proposal:** detect expectation mismatches with `/expect\(received\)\.(toBe|...)/`,
  verified against hand-written sample failures where it matched correctly.
- **Challenge:** the **FI-01 injected fault** — a known `TEST_SCRIPT_DEFECT` — came back
  `UNKNOWN` with zero hypotheses. The stored message was
  `expect(<esc>[2mreceived<esc>[22m).toBe(...)`: Playwright colourises its output, so the
  rule had never matched a real failure. The synthetic checks were the problem, because
  hand-written input carries no escape codes.
- **Correction:** strip ANSI escapes in `collect.ts`, where evidence is stored, so the
  analyzer and the committed artifacts both see clean text.
- **Lesson recorded:** a rule validated only against synthetic input is unverified. Known
  faults are now injected and graded in CI by `tools/rca/verify-injections.ts`.
- **Evidence:** `docs/evidence/fi-01/`; branch `fi/01-wrong-expected-total`.
- **Human decision:** _pending — this is the repair PR awaiting review._

### Entry 6 — documents citing evidence that was not in the repo

- **Skill:** `skills/review.md` (governance)
- **AI proposal:** the FI-02 write-up cited `docs/evidence/fi-02/` across five documents.
- **Challenge:** an independent review of the pushed repo found the directory had **never
  existed in any commit** (`git log --all --diff-filter=A`). The RCA run was genuine, but
  its output had stayed on a local machine, so nothing in the submission supported the
  claim. Section 16 treats fabricated evidence as an automatic fail — the gap mattered far
  more than its score weight.
- **Correction:** commit the real artifacts, with local paths and ANSI codes stripped; the
  scorecard now records actual CI run IDs instead of the stale "no CI run yet".
- **Lesson recorded:** a claim is only evidence if it is committed. Verified by fetching the
  path from `raw.githubusercontent.com` after pushing.
- **Evidence:** commit `d701dfd`; `docs/evidence/fi-02/`.
- **Human decision:** engineer instructed "Push the fixes" — **approved**.

### Entry 7 — an invented dependency

- **Skill:** `skills/review.md` (code review)
- **AI proposal:** an npm script `"test:fault": "cross-env-shim playwright test tests/fault"`.
- **Challenge:** `cross-env-shim` is not a real package; it was invented to paper over the
  fact that setting an environment variable in an npm script is not portable across shells.
  It would have broken `npm run test:fault` for anyone who tried it.
- **Correction:** script removed. The per-shell invocation is documented in `README.md`
  instead, and CI sets the variable at the job level.
- **Evidence:** `package.json`; `.github/workflows/playwright.yml` job `fault-injection`.
- **Human decision:** _pending_.

### Entry 8 — a fault injection that did not inject anything

- **Skill:** `skills/test-design.md` (boundaries and oracles)
- **AI proposal:** FI-03 delays the products response by 4s inside a route interceptor, then
  asserts with a 1s budget after `page.goto`.
- **Challenge:** the test **passed**. `goto` waits for the response, so it absorbed the
  injected delay and the assertion then ran against a fully loaded page. The fault was real
  but unobservable, which is worse than no test: it would have reported a green timing
  exercise that never happened.
- **Correction:** race the assertion against the navigation instead of sequencing after it,
  and repeat three times to establish reproducibility (3/3).
- **Second correction, same exercise:** FI-03 then classified as `LOCATOR_OR_UI_CHANGE` —
  plausible, and wrong. "Element missing" and "element late" look identical in the error
  text. The Collect stage now records response timing, and a slow response (11,047 ms
  observed) ranks `TIMING_OR_FLAKINESS` above the locator hypothesis.
- **Evidence:** `tests/fault/fi-03-timing.spec.ts`; `docs/evidence/fi-03/`.
- **Human decision:** _pending_.

---

## Pattern across these entries

Six of the eight defects were invisible to type checking, linting and code review, and were
exposed only by running something real — a live run, a CI run, or an injected fault. Two of
them (entries 5 and 8) were specifically hidden _by_ synthetic verification that looked
convincing. That is the argument for the injection gate in CI: it re-runs known faults on
every change and fails when a classification regresses.
