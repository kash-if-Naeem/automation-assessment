# Requirements-to-Test Traceability Matrix

Every scenario is recorded with all ten required fields. The summary table below carries **ID,
Risk, Feature, Automation layer, Source ref and Status**; the per-scenario detail section that
follows carries the remaining required fields — **Steps, Test data, Expected outcome and
Evidence** — one short subsection per ID. The split is for readability only: no field is omitted.

Every row was derived by reading the test body it cites. Evidence references are
`<file>:<line>` of the `test(...)` declaration on branch `assessment-fixes`.

**Status key**

- `Pass (CI 44598758208)` — ran green in the normal suite. Two green CI runs on commit `491c9e6`
  covered all 33 tests.
- `Executed (local)` — run by hand, outside CI.
- `Not executed` — procedure documented, not run.

Fault suites are **excluded from CI** by `testIgnore: ['**/fault/**']` in `playwright.config.ts`
unless `FAULT_INJECTION` is set, so no FI row claims CI coverage.

Source refs are the published automationexercise.com test cases (`TC n`) and API list entries
(`API n`).

## Summary

| ID    | Risk | Feature                                      | Automation layer | Source ref       | Status                                    |
| ----- | ---- | -------------------------------------------- | ---------------- | ---------------- | ----------------------------------------- |
| AE-01 | P0   | Account registration                         | UI + API         | TC 1             | Pass (CI 44598758208)                     |
| AE-02 | P0   | Valid login and logout                       | UI               | TC 2, TC 4       | Pass (CI 44598758208)                     |
| AE-03 | P0   | Invalid login                                | UI + API         | TC 3; API 10     | Pass (CI 44598758208)                     |
| AE-04 | P1   | Duplicate registration                       | UI               | TC 5             | Pass (CI 44598758208)                     |
| AE-05 | P1   | Login API validation                         | API              | API 7, 8, 10     | Pass (CI 44598758208)                     |
| AE-06 | P0   | Product catalogue                            | UI + API         | TC 8; API 1      | Pass (CI 44598758208)                     |
| AE-07 | P0   | Search relevance                             | UI + API         | TC 9; API 5      | Pass (CI 44598758208)                     |
| AE-08 | P1   | Search empty / invalid                       | UI + API         | API 6; discovery | Pass (CI 44598758208)                     |
| AE-09 | P1   | Category filtering                           | UI               | TC 18            | Pass (CI 44598758208)                     |
| AE-10 | P1   | Brand filtering                              | UI + API         | TC 19; API 3     | Pass (CI 44598758208)                     |
| AE-11 | P0   | Cart holds multiple items                    | UI               | TC 12            | Pass (CI 44598758208)                     |
| AE-12 | P0   | Quantity calculation                         | UI               | TC 13            | Pass (CI 44598758208)                     |
| AE-13 | P0   | Remove from cart                             | UI               | TC 17            | Pass (CI 44598758208)                     |
| AE-14 | P0   | Cart persists on login                       | UI               | TC 20            | Pass (CI 44598758208)                     |
| AE-15 | P0   | End-to-end order (flagship)                  | UI               | TC 14-16         | Pass (CI 44598758208)                     |
| AE-16 | P0   | Address consistency                          | UI + API         | TC 23; API 14    | Pass (CI 44598758208)                     |
| AE-17 | P1   | Invoice download                             | UI               | TC 24            | Pass (CI 44598758208)                     |
| AE-18 | P1   | Product review                               | UI               | TC 21            | Pass (CI 44598758208)                     |
| AE-19 | P1   | Contact form with upload                     | UI               | TC 6             | Pass (CI 44598758208)                     |
| AE-20 | P2   | Subscriptions                                | UI               | TC 10, TC 11     | Pass (CI 44598758208)                     |
| AE-21 | P2   | Recommended items                            | UI               | TC 22            | Pass (CI 44598758208)                     |
| AE-22 | P1   | Account API CRUD                             | API              | API 11-14        | Pass (CI 44598758208)                     |
| AE-23 | P1   | API method validation (405)                  | API              | API 2, 4, 9      | Pass (CI 44598758208)                     |
| AE-24 | P1   | UI / API consistency                         | UI + API         | API 1, 3         | Pass (CI 44598758208)                     |
| FI-01 | -    | Injected script fault (wrong expected total) | UI (fault)       | -                | Executed — TEST_SCRIPT_DEFECT 0.70        |
| FI-02 | -    | Injected network fault (route abort)         | UI (fault)       | -                | Executed — ENVIRONMENT_OR_NETWORK 0.90    |
| FI-03 | -    | Injected delayed response (stretch)          | UI (fault)       | -                | Executed — TIMING_OR_FLAKINESS 0.78 (3/3) |

Shared test data: `generateTestUser()` in `src/fixtures/user-data.ts` builds a fresh identity per
test from a uuid first segment (`<id>`), so parallel workers never collide — `QA <id>`,
`qa.<id>@example-test.invalid`, password `Pw-<id>-Aa1!`, Mr, first name `QA`, last name `<ID>`,
company `QA Test Co`, `1 Test Street <id>` / `Suite 100`, Testville, California, `90210`,
United States, mobile `5551234567`, DOB 10 / 5 / 1990. Referred to below as **generated TestUser**.
Every account created is deleted in teardown through API 12 (`accountCleanup` auto fixture).

## Scenario detail

### AE-01 — Account registration

- **Steps:** 1. Open `/login`. 2. Enter signup name and email, submit Signup. 3. Assert the
  "Enter Account Information" form is shown. 4. Fill the full account form (gender, password, DOB,
  name, company, both address lines, country, state, city, zipcode, mobile) and click Create
  Account. 5. Click Continue.
- **Test data:** generated TestUser (e.g. `QA 3f9a1c2b`, `qa.3f9a1c2b@example-test.invalid`,
  `1 Test Street 3f9a1c2b`, Suite 100, Testville, California, 90210, United States).
- **Expected outcome:** "Enter Account Information" visible after signup; "Account Created!"
  visible after submit; header then reads `Logged in as QA <id>`. The account is tracked and
  deleted via API 12 in teardown.
- **Evidence:** `tests/ui/auth.spec.ts:5`; cleanup result attached per test as
  `cleanup-status.json`.
- **Status:** Pass (CI 44598758208)

### AE-02 — Valid login and logout

- **Steps:** 1. Register the generated user through the UI fixture. 2. Click Logout. 3. Open
  `/login`. 4. Submit the login form with that user's email and password. 5. Click Logout again.
- **Test data:** generated TestUser; login with `qa.<id>@example-test.invalid` / `Pw-<id>-Aa1!`.
- **Expected outcome:** after login the header reads `Logged in as QA <id>`; after logout the
  page shows "Login to your account".
- **Evidence:** `tests/ui/auth.spec.ts:17`
- **Status:** Pass (CI 44598758208)

### AE-03 — Invalid login

- **Steps (UI):** 1. Open `/login`. 2. Submit a never-registered email with a wrong password. 3. Assert the inline error. 4. Assert no logged-in header exists.
- **Steps (API 10):** 1. POST `verifyLogin` with an unknown email and a wrong password. 2. Assert
  the envelope's `responseCode` and `message`.
- **Test data:** UI `invalid_user_123@example-test.invalid` / `WrongPassword!123`;
  API `nonexistent_9999@example-test.invalid` / `WrongPassword!`.
- **Expected outcome:** UI shows "Your email or password is incorrect!" and `Logged in as` has
  count 0 — no session is created. API returns `responseCode` 404 with message matching
  /user not found/. (Per assumption A11 the HTTP status is 200; the real code is in the body.)
- **Evidence:** `tests/ui/auth.spec.ts:28`; `tests/api/account.spec.ts:20`
- **Status:** Pass (CI 44598758208)

### AE-04 — Duplicate registration

- **Steps:** 1. Register the generated user. 2. Log out. 3. Open `/login`. 4. Start signup again
  with a different display name but the same email address.
- **Test data:** generated TestUser's email, re-submitted with name `Duplicate Name`.
- **Expected outcome:** the signup form shows "Email Address already exist!" and no second
  account is created.
- **Evidence:** `tests/ui/auth.spec.ts:36`
- **Status:** Pass (CI 44598758208)

### AE-05 — Login API validation

- **Steps:** 1. (API 7) Create an account via `createAccount`, then POST `verifyLogin` with the
  correct email and password. 2. (API 8) POST `verifyLogin` with a password only and no `email`
  field. 3. (API 10) covered by the unknown-user call recorded under AE-03.
- **Test data:** generated TestUser for API 7; `{ password: 'WrongPassword!' }` with no email for
  API 8.
- **Expected outcome:** API 7 — create returns `responseCode` 201, login returns `responseCode`
  200 with message matching /user exists/. API 8 — `responseCode` 400 with message matching
  /email or password parameter is missing/. API 10 — 404 /user not found/.
- **Evidence:** `tests/api/account.spec.ts:4` (API 7), `tests/api/account.spec.ts:14` (API 8),
  `tests/api/account.spec.ts:20` (API 10, shared with AE-03)
- **Status:** Pass (CI 44598758208)

### AE-06 — Product catalogue

- **Steps (UI):** 1. Open `/products`. 2. Wait for the `.features_items` grid. 3. Assert the first
  product card is visible and the card count is above zero. 4. Read the first card's name and
  price.
- **Steps (API 1):** 1. GET `productsList`. 2. Assert HTTP status, envelope code and list length. 3. Assert the first product's id, name and price shape.
- **Test data:** none — the live catalogue as served.
- **Expected outcome:** UI — at least one card, first card name is non-empty and its price matches
  `/Rs\.\s*\d+/` (format per assumption A3). API — HTTP 200 and `responseCode` 200, at least one
  product, `id > 0`, non-empty `name`, price matching `/^Rs\.\s*\d+/`, and the whole body parses
  against the Zod `ProductsListSchema` contract.
- **Evidence:** `tests/ui/catalog.spec.ts:5`; `tests/api/products.spec.ts:4`
- **Status:** Pass (CI 44598758208)

### AE-07 — Search relevance

- **Steps (UI):** 1. Open `/products`. 2. Type the search term and submit. 3. Assert the
  "Searched Products" heading. 4. Assert at least one card and inspect the first result's name.
- **Steps (API 5):** 1. POST `searchProduct` with `search_product` set. 2. Assert the envelope and
  that the result list is non-empty.
- **Test data:** UI search term `Top`; API search term `Tshirt`.
- **Expected outcome:** UI — "Searched Products" heading shown and the first result's lowercased
  name contains `top`, i.e. the results are relevant to the term, not merely non-empty. API —
  `responseCode` 200 with at least one product returned.
- **Evidence:** `tests/ui/catalog.spec.ts:15`; `tests/api/products.spec.ts:15`
- **Status:** Pass (CI 44598758208)

### AE-08 — Search empty / invalid

- **Steps (UI):** 1. Open `/products`. 2. Search for a term that cannot match. 3. Assert the
  results heading still renders. 4. Assert the product card count.
- **Steps (API 6):** 1. POST `searchProduct` with the `search_product` form field omitted
  entirely. 2. Assert the envelope code and message.
- **Test data:** UI search term `NonExistentProductXYZ_999`; API request body `{}`.
- **Expected outcome:** UI — the "Searched Products" heading is present and the card count is
  exactly 0 (an empty result set, not an error page). API — `responseCode` 400 with message
  matching /bad request, search_product parameter is missing/.
- **Evidence:** `tests/ui/catalog.spec.ts:24`; `tests/api/products.spec.ts:21`
- **Status:** Pass (CI 44598758208)

### AE-09 — Category filtering

- **Steps:** 1. Open `/products`. 2. Click the `Women` category link in the sidebar. 3. Click the
  `Dress` sub-category link. 4. Assert the results heading and the product grid.
- **Test data:** category `Women`, sub-category `Dress`.
- **Expected outcome:** a heading matching /women - dress products/i is shown and at least one
  product card is visible — the filter navigates to the scoped listing rather than the full
  catalogue.
- **Evidence:** `tests/ui/catalog.spec.ts:32`
- **Status:** Pass (CI 44598758208)

### AE-10 — Brand filtering

- **Steps (UI):** 1. Open `/products`. 2. Click the brand link inside `.brands_products`. 3. Assert the brand results heading. 4. Assert a product card is visible. 5. Assert the results
  container text mentions the brand.
- **Steps (API 3):** 1. GET `brandsList`. 2. Assert the envelope, list length and that every
  brand name is non-blank.
- **Test data:** brand `Polo`.
- **Expected outcome:** UI — heading matching /brand - polo products/i, at least one card, and
  `.features_items` contains /polo/i. API — `responseCode` 200, at least one brand, and
  `brands.every(b => b.brand.trim().length > 0)` is true, so no entry is an empty label.
- **Evidence:** `tests/ui/catalog.spec.ts:40`; `tests/api/products.spec.ts:27`
- **Status:** Pass (CI 44598758208)

### AE-11 — Cart holds multiple items

- **Steps:** 1. Open `/products`. 2. Hover card 0 and add it to the cart, then Continue Shopping. 3. Hover card 1 and add it, then View Cart. 4. Read the cart lines and compare product ids.
- **Test data:** the first two products in the live listing, identified by the
  `data-product-id` attribute on each card's add-to-cart link.
- **Expected outcome:** the cart holds exactly 2 lines; the two captured ids are different and
  both appear among the cart line ids. Identity is asserted on the product id, not display text,
  because the cart cell also carries a category line (assumption A4).
- **Evidence:** `tests/ui/cart.spec.ts:8`
- **Status:** Pass (CI 44598758208)

### AE-12 — Quantity calculation

- **Steps:** 1. Open `/products`. 2. Open the first product's detail page. 3. Read and parse the
  unit price. 4. Set quantity to 4 and add to cart. 5. View cart and read the line.
- **Test data:** first catalogue product; quantity `4`; price text parsed by `parsePrice` (first
  numeric token, commas stripped — per assumption A3).
- **Expected outcome:** exactly 1 cart line, its quantity reads 4, and the parsed line total
  equals `expectedLineTotal(unitPrice, 4)` — unit price x 4 rounded to the cent — an exact
  arithmetic oracle, not a non-empty check.
- **Evidence:** `tests/ui/cart.spec.ts:25`; oracle in `src/utils/calculations.ts`
- **Status:** Pass (CI 44598758208)

### AE-13 — Remove from cart

- **Steps:** 1. Open `/products`. 2. Add the first product and View Cart. 3. Assert exactly one
  cart row. 4. Click the row's delete control, matched on the normalised product name.
- **Test data:** first catalogue product; its name whitespace-normalised by `norm()`.
- **Expected outcome:** the row count goes from 1 to 0 and the "Cart is empty!" message becomes
  visible.
- **Evidence:** `tests/ui/cart.spec.ts:41`
- **Status:** Pass (CI 44598758208)

### AE-14 — Cart persists on login

- **Steps:** 1. Open `/products` as a guest. 2. Add the first product, then Continue Shopping. 3. Register and sign in as the generated user. 4. Open `/view_cart` and read the lines.
- **Test data:** first catalogue product (id captured before login) plus the generated TestUser.
- **Expected outcome:** after authentication the cart still holds exactly 1 line and its product
  id equals the id captured while anonymous — the guest cart is carried into the session rather
  than discarded.
- **Evidence:** `tests/ui/cart.spec.ts:53`
- **Status:** Pass (CI 44598758208)

### AE-15 — End-to-end order (flagship)

- **Steps:** 1. Search the catalogue and capture the first result's name and price. 2. Open its
  detail page, confirm the name and price match the listing, add quantity 4 and verify the line
  total in the cart. 3. Add a second distinct product and verify its line total. 4. Verify the
  cart grand total against the sum of the lines where the layout shows one. 5. Proceed to
  checkout, register when prompted, and confirm the cart survived. 6. Add an order comment, place
  the order, pay with the dummy card and confirm.
- **Test data:** search term `Top`; quantity 4 on product 1 and quantity 1 on product 2; generated
  TestUser; order comment `QA automated order comment`; published dummy card
  `4111111111111111`, cvc `123`, expiry `12` / `2030`, name on card = the generated user's name.
- **Expected outcome:** detail price equals listing price; line 1 total equals unit x 4 to the
  cent and line 2 total equals its unit x 1; the shown grand total equals
  `expectedCartTotal(lines)` when present (otherwise an `observation` annotation records that the
  layout shows no grand total, so the absence is reported rather than silently passed); after
  registration the cart still has 2 lines; the checkout delivery block is visible; and after
  payment "Congratulations! Your order has been confirmed!" is shown. The test is written as named
  `test.step`s so each oracle is individually reported.
- **Evidence:** `tests/ui/checkout.spec.ts:19` (steps at lines 27, 36, 49, 61, 77, 88, 95, 103);
  invoice attached to the run as `invoice-<filename>`.
- **Status:** Pass (CI 44598758208)

### AE-16 — Address consistency

- **Steps:** 1. Register the generated user. 2. Open `/products`, add the first product, View
  Cart. 3. Proceed to checkout and wait for the delivery block. 4. Read both the delivery and the
  billing address blocks, dropping their headings. 5. Compare each against the fixture.
- **Test data:** generated TestUser — the oracle checks `firstName`, `lastName`,
  `1 Test Street <id>`, `Testville`, `90210` and `United States`.
- **Expected outcome:** three oracles must hold — (1) the delivery block contains every one of the
  six fixture values, (2) the normalised billing text equals the normalised delivery text, and
  (3) API 14 returns a stored record whose address fields equal the same fixture — what was typed at registration is
  what is shown at checkout, on both blocks. Headings are excluded from the comparison per
  assumption A7. The same oracle runs inside AE-15 as its own step.
- **Evidence:** `tests/ui/checkout.spec.ts:112`; oracle helper at `tests/ui/checkout.spec.ts:12`;
  repeated in the flagship at `tests/ui/checkout.spec.ts:88`. The API 14 side is now asserted in
  this same test: `api.getUserDetailByEmail` must return `address1`, `city`, `state`, `zipcode`
  and `country` matching the same fixture, so the UI cannot pass by rendering something the
  backend never stored.
- **Status:** Pass (CI 44598758208)

### AE-17 — Invoice download

- **Steps:** 1. Register the generated user. 2. Add the first product and proceed to checkout. 3. Place the order and pay with the dummy card. 4. Wait for "Order Placed!". 5. Click Download
  Invoice, capture the Playwright `download` event, save it, and inspect the saved bytes.
- **Test data:** generated TestUser; dummy card `4111111111111111` / cvc `123` / `12`-`2030`.
- **Expected outcome:** a real download event fires (no fixed sleep), the saved file is non-empty
  and `inspectInvoice` reports it plausible; in the flagship run the detected file type is also
  asserted not to be `other`. The file is attached to the run as evidence.
- **Evidence:** `tests/ui/checkout.spec.ts:132`; also `tests/ui/checkout.spec.ts:103` inside
  AE-15; attachment `invoice-<suggestedFilename>` on both runs.
- **Status:** Pass (CI 44598758208)

### AE-18 — Product review

- **Steps:** 1. Open `/products`. 2. Open the first product's detail page. 3. Fill the review
  name, email and body. 4. Submit.
- **Test data:** `QA Reviewer`, `reviewer@example-test.invalid`, body `Automated test review.`
- **Expected outcome:** the page shows "Thank you for your review."
- **Evidence:** `tests/ui/ancillary.spec.ts:12`
- **Status:** Pass (CI 44598758208)

### AE-19 — Contact form upload

- **Steps:** 1. Create a small text file under the test's output directory. 2. Open `/contact_us`. 3. Fill name, email, subject and message. 4. Attach the file to `input[name="upload_file"]`. 5. Accept the confirmation dialog the site raises and submit.
- **Test data:** `QA Contact`, `contact@example-test.invalid`, subject `Test Subject`, message
  `Automated test message.`, upload `dummy-upload.txt` containing
  "Invented dummy content for upload testing."
- **Expected outcome:** the `.status.alert.alert-success` banner becomes visible, i.e. the form
  with an attachment is accepted. The native JS confirm is handled by a one-shot `dialog` handler
  rather than a wait.
- **Evidence:** `tests/ui/ancillary.spec.ts:24`
- **Status:** Pass (CI 44598758208)

### AE-20 — Subscriptions

- **Steps:** 1. Open the home page. 2. Fill the footer subscription email field. 3. Click the
  subscribe arrow.
- **Test data:** `subscribe@example-test.invalid`.
- **Expected outcome:** the text "You have been successfully subscribed!" appears.
- **Evidence:** `tests/ui/ancillary.spec.ts:41`
- **Status:** Pass (CI 44598758208)

### AE-21 — Recommended items

- **Steps:** 1. Open the home page. 2. Scroll the "Recommended items" heading into view and
  assert it. 3. Read the product name from the carousel's `.item.active` slide only. 4. Click that
  slide's add-to-cart link, then View Cart. 5. Read the cart lines.
- **Test data:** whichever product the carousel has in its active slide at run time; name
  whitespace-normalised by `norm()`.
- **Expected outcome:** the active slide's name is non-empty and that exact name appears among the
  normalised cart line descriptions. Scoping to `.item.active` matters: the inactive slides hold
  hidden duplicates that would otherwise be clicked.
- **Evidence:** `tests/ui/ancillary.spec.ts:48`
- **Status:** Pass (CI 44598758208)

### AE-22 — Account API CRUD

- **Steps:** 1. POST `createAccount` with the generated user (API 11). 2. GET
  `getUserDetailByEmail` for that address (API 14). 3. PUT `updateAccount` with `city` changed
  (API 13). 4. GET the user again and read back the city. 5. DELETE `deleteAccount` (API 12), with
  a best-effort delete in a `finally` block if an earlier assertion threw.
- **Test data:** generated TestUser; update payload is the same user with `city: 'UpdatedCity'`.
- **Expected outcome:** create `responseCode` 201; read `responseCode` 200 with `user.email`
  equal to the address sent; update `responseCode` 200 with message matching /user updated/;
  the re-read returns `city === 'UpdatedCity'` (the write is proven by reading it back, not by the
  write's own response); delete `responseCode` 200 with message matching /account deleted/.
- **Evidence:** `tests/api/account.spec.ts:32`; `deleteAccount` behaviour recorded as assumption
  A1 in `docs/assumptions-log.md`.
- **Status:** Pass (CI 44598758208)

### AE-23 — API method validation

- **Steps:** 1. POST to `productsList`, a GET-only endpoint (API 2). 2. PUT to `brandsList`, a
  GET-only endpoint (API 4). 3. DELETE to `verifyLogin`, a POST-only endpoint (API 9). 4. Assert
  the envelope code and message on each.
- **Test data:** no body on any of the three calls; only the HTTP verb is wrong.
- **Expected outcome:** each returns `responseCode` 405 with a message matching
  /this request method is not supported/ — the API rejects the verb rather than falling through to
  the handler.
- **Evidence:** `tests/api/products.spec.ts:34` (API 2), `tests/api/products.spec.ts:40` (API 4),
  `tests/api/account.spec.ts:26` (API 9)
- **Status:** Pass (CI 44598758208)

### AE-24 — UI / API consistency

- **Steps (products):** 1. GET `productsList` and index it by normalised lowercased name. 2. Open
  `/products` in the browser. 3. For the first up-to-5 cards, read name and price. 4. Look each up
  in the API index and compare prices.
- **Steps (brands):** 1. GET `brandsList` into a normalised set. 2. Open `/products`. 3. Read every
  `.brands_products a` label, stripping the `(6) ` count prefix. 4. Assert each label is in the
  API set.
- **Test data:** the first 5 UI product cards and the full UI brand sidebar, against the live API
  responses taken in the same test.
- **Expected outcome:** every sampled UI product name exists in the API list (with a failure
  message naming the missing product) and its normalised price string equals the API's; every UI
  brand label exists in the API brands list. The count prefix is stripped per assumption A6 —
  without that, every brand would mismatch.
- **Evidence:** `tests/integration/ui-api-consistency.spec.ts:6` (products),
  `tests/integration/ui-api-consistency.spec.ts:22` (brands)
- **Status:** Pass (CI 44598758208)

### FI-01 — Injected script fault

- **Steps:** 1. Branch `fi/01-wrong-expected-total`. 2. In AE-12 change the oracle from
  `expectedLineTotal(unitPrice, 4)` to `expectedLineTotal(unitPrice, 5)` and commit it as an
  injected fault. 3. Run `npx playwright test -g "AE-12"`. 4. Run `npm run rca:collect` and
  `npm run rca:analyze`. 5. Revert the expected value and re-run.
- **Test data:** the AE-12 data unchanged; only the expected multiplier is corrupted.
- **Expected outcome:** AE-12 fails on an expected/received mismatch and RCA classifies
  `TEST_SCRIPT_DEFECT` at confidence 0.70 (the "spec changed in HEAD" rule), with `PRODUCT_DEFECT`
  recorded as the rejected alternative. Without the committed change the analyzer must return
  `UNKNOWN` — the correct answer on insufficient evidence.
- **Evidence:** `docs/evidence/fi-01/` — `README.md` (full write-up), `before-run.txt`,
  `before-rca-report.json`, `before-injection-accuracy.json`, `after-run.txt`,
  `after-rca-summary.md`, `after-collection-status.json`; branch
  `fi/01-wrong-expected-total`, injected commit `5931405`, repair commit `7745b08`.
- **Result:** AE-12 failed with `Expected 2500, Received 2000`; RCA produced
  `TEST_SCRIPT_DEFECT` at 0.70 citing `ui/cart.spec.ts changed in 5931405`, ranking and
  rejecting `PRODUCT_DEFECT` (0.50). `npm run rca:verify` graded it 1/1. After the one-token
  patch AE-12 passed again, and the clean-run RCA reported `status: ok, failures: 0`.
- **Status:** Executed — correctly classified. Repair PR open for human review.

### FI-02 — Injected network fault

- **Steps:** 1. Set `FAULT_INJECTION=FI-02` so the fault suite is no longer ignored. 2. Register a
  page route that aborts `**/products` with `failed`, scoped to this one page. 3. Navigate to the
  products page. 4. Run `rca:collect` and `rca:analyze` over the failure.
- **Test data:** route pattern `**/products`, abort reason `failed`; no account or catalogue data
  involved.
- **Expected outcome:** the test fails with `page.goto: net::ERR_FAILED at
https://automationexercise.com/products`, and RCA classifies it `ENVIRONMENT_OR_NETWORK` at
  confidence 0.90 with `injected: true` — never `PRODUCT_DEFECT`. An injected failure must not be
  reported as a product bug.
- **Evidence:** `tests/fault/fi-02-network.spec.ts:14`; `docs/evidence/fi-02/rca-report.json`,
  `docs/evidence/fi-02/rca-summary.md`, `docs/evidence/fi-02/failures.json`,
  `docs/evidence/fi-02/collection-status.json`; assumption A9.
- **Status:** Executed — correctly classified. Excluded from the normal suite by
  `testIgnore`, and run in CI by the dedicated `fault-injection` job.

### FI-03 — Injected delayed response (stretch)

- **Steps:** 1. Set `FAULT_INJECTION=FI-03`. 2. Register a `page.route` handler on
  `**/products` that continues the request only after a 5,000 ms delay — the delay is in the
  interceptor, never a sleep in the test. 3. Start the navigation without awaiting it. 4. Assert `.features_items` is visible within a 1,000 ms budget, i.e. less than the injected
  delay. 5. Repeat the whole test 3 times with `retries: 0`. 6. Run `rca:collect`,
  `rca:analyze` and `rca:verify`.
- **Test data:** route pattern `**/products`; injected delay 5,000 ms; assertion budget
  1,000 ms; 3 attempts. No account or catalogue data involved.
- **Expected outcome:** all 3 attempts fail identically on the visibility budget, and RCA
  classifies `TIMING_OR_FLAKINESS` — not `LOCATOR_OR_UI_CHANGE`, because the element was late
  rather than absent, and never `PRODUCT_DEFECT`. The discriminator is the captured response
  duration.
- **Evidence:** `tests/fault/fi-03-timing.spec.ts`; `docs/evidence/fi-03/rca-report.json`,
  `injection-accuracy.json`, `failures.json`, `rca-summary.md`.
- **Result:** 3 of 3 attempts failed; `TIMING_OR_FLAKINESS` at 0.78 on each, with the slowest
  captured response at 11,047 ms ranking it above the locator hypothesis.
- **Status:** Executed — correctly classified, reproducible 3/3.

## Coverage summary

Counted from the specs on this branch, not from any prior document.

**UI tests — 22, against a minimum of 18.** 20 browser-driven tests in `tests/ui/`
(auth 4, catalog 5, cart 4, checkout 3, ancillary 4) plus the 2 tests in `tests/integration/`,
which also drive the browser. The flagship AE-15 additionally carries 8 named `test.step`s.

**API checks — 14 distinct endpoint/method checks across 11 API tests, against a minimum of 8.**
`GET productsList`, `POST productsList` (405), `GET brandsList`, `PUT brandsList` (405),
`POST searchProduct` with the parameter, `POST searchProduct` without it, `POST verifyLogin`
valid, `POST verifyLogin` with no email, `POST verifyLogin` unknown user, `DELETE verifyLogin`
(405), `POST createAccount`, `GET getUserDetailByEmail` (twice — before and after the update),
`PUT updateAccount`, `DELETE deleteAccount`. The 2 integration tests re-use `productsList` and
`brandsList` as cross-check oracles. Every typed response is additionally validated against a Zod
schema in `src/api/schemas.ts`, so contract drift fails the test.

**Negative cases — 9, against a minimum of 6.** AE-03 (UI invalid login,
`tests/ui/auth.spec.ts:28`), AE-03 (API 10 unknown user, `tests/api/account.spec.ts:20`), AE-04
(duplicate email, `tests/ui/auth.spec.ts:36`), AE-05 (API 8 missing email,
`tests/api/account.spec.ts:14`), AE-08 (UI no-match search, `tests/ui/catalog.spec.ts:24`), AE-08
(API 6 missing parameter, `tests/api/products.spec.ts:21`), AE-23 (API 2,
`tests/api/products.spec.ts:34`), AE-23 (API 4, `tests/api/products.spec.ts:40`), AE-23 (API 9,
`tests/api/account.spec.ts:26`).

**Risk spread:** P0 — AE-01, 02, 03, 06, 07, 11, 12, 13, 14, 15, 16 (11 scenarios). P1 — AE-04,
05, 08, 09, 10, 17, 18, 19, 22, 23, 24 (11). P2 — AE-20, 21 (2).

**Suite total:** 33 tests run in the normal (non-fault) suite; two green CI runs on commit
`491c9e6` covered all 33. The fault suite adds 1 test that CI never runs.
