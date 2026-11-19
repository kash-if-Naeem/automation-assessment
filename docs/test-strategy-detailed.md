# Test Strategy

> Full details (risk matrix, oracles, coverage gaps): see [test-strategy-detailed.md](test-strategy-detailed.md).

## Scope

- In scope: the public practice site automationexercise.com. UI flows for account, catalogue, cart, checkout, invoice, review, contact and subscription. The documented API endpoints (API list, 14 items).
- Out of scope: security testing, load or stress testing, real payments, anti-bot bypass, any site data not created by the tests.

## Risk matrix

| Priority | Meaning                                             | Scenarios                                     |
| -------- | --------------------------------------------------- | --------------------------------------------- |
| P0       | Revenue or access path. A failure blocks a customer | AE-01, 02, 03, 06, 07, 11, 12, 13, 14, 15, 16 |
| P1       | Important secondary path                            | AE-04, 05, 08, 09, 10, 17, 18, 19, 22, 23, 24 |
| P2       | Convenience feature                                 | AE-20, 21                                     |

## Assumptions

- The site is a third-party public practice site. Behaviour can change without notice. Observed behaviour is recorded in `docs/assumptions-log.md`.
- The site may show a "queue full" page under load. Such failures are external and classified THIRD_PARTY_DEPENDENCY.
- Payments are simulated. Test card data is invented or publicly published test data.

## Oracles

- UI: text, element and URL assertions that check values, not just visibility. Calculations use the price parser and the line-total helper.
- API: response code and message as documented in the API list, plus a zod schema check on each response.
- Cross-layer: UI product names and prices must match the API product list (AE-24).
- Where the site presents no oracle, the test records an annotation and does not invent one (for example, no grand total on some cart layouts).

## Prioritisation and execution

- `@smoke` = AE-01, AE-02, AE-06, AE-11, AE-15, API AE-06. Run first on PRs.
- `@p0` runs on every PR. `@p1` and `@p2` run on the daily schedule.
- Workers: 2 locally and in CI, to limit load on the public site. Retries: 1 in CI only, and the retry count is recorded for RCA.

## Coverage gaps

- AE-16 has no API cross-check.
- Contact-form upload checks only the success alert, not the stored file.
- No visual or accessibility testing.
- FI-01 and FI-03 are not executed.
