# Requirements-to-Test Traceability Matrix

Status key: **Pass (live)** = the test passed in the live run on 2026-11-19 against automationexercise.com with 2 workers. Live results change when the public site changes, so re-run before quoting them.

| ID    | Risk | Scenario / goal                                    | Layer    | Source ref              | Automation file                                           | Status                                               |
| ----- | ---- | -------------------------------------------------- | -------- | ----------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| AE-01 | P0   | Account registration                               | UI       | TC 1                    | `tests/ui/auth.spec.ts`                                   | Pass (live)                                          |
| AE-02 | P0   | Valid login / logout                               | UI       | TC 2, 4                 | `tests/ui/auth.spec.ts`                                   | Pass (live)                                          |
| AE-03 | P0   | Invalid login                                      | UI + API | TC 3; API 10            | `tests/ui/auth.spec.ts`, `tests/api/account.spec.ts`      | Pass (live)                                          |
| AE-04 | P1   | Duplicate registration                             | UI       | TC 5                    | `tests/ui/auth.spec.ts`                                   | Pass (live)                                          |
| AE-05 | P1   | Login API validation                               | API      | API 7, 8 (10 via AE-03) | `tests/api/account.spec.ts`                               | Pass (live)                                          |
| AE-06 | P0   | Product catalogue                                  | UI + API | TC 8; API 1             | `tests/ui/catalog.spec.ts`, `tests/api/products.spec.ts`  | Pass (live)                                          |
| AE-07 | P0   | Search relevance                                   | UI + API | TC 9; API 5             | `tests/ui/catalog.spec.ts`, `tests/api/products.spec.ts`  | Pass (live)                                          |
| AE-08 | P1   | Search with no matches / missing parameter         | UI + API | Discovery; API 6        | `tests/ui/catalog.spec.ts`, `tests/api/products.spec.ts`  | Pass (live)                                          |
| AE-09 | P1   | Category filtering                                 | UI       | TC 18                   | `tests/ui/catalog.spec.ts`                                | Pass (live)                                          |
| AE-10 | P1   | Brand filtering                                    | UI + API | TC 19; API 3            | `tests/ui/catalog.spec.ts`, `tests/api/products.spec.ts`  | Pass (live)                                          |
| AE-11 | P0   | Cart with multiple distinct items                  | UI       | TC 12                   | `tests/ui/cart.spec.ts`                                   | Pass (live)                                          |
| AE-12 | P0   | Quantity 4 line total                              | UI       | TC 13                   | `tests/ui/cart.spec.ts`                                   | Pass (live)                                          |
| AE-13 | P0   | Remove from cart                                   | UI       | TC 17                   | `tests/ui/cart.spec.ts`                                   | Pass (live)                                          |
| AE-14 | P0   | Cart persists on login                             | UI       | TC 20                   | `tests/ui/cart.spec.ts`                                   | Pass (live)                                          |
| AE-15 | P0   | End-to-end order (flagship)                        | UI       | TC 14-16                | `tests/ui/checkout.spec.ts`                               | Pass (live)                                          |
| AE-16 | P0   | Address consistency (delivery = billing = fixture) | UI       | TC 23                   | `tests/ui/checkout.spec.ts`                               | Pass (live). API 14 cross-check not added (see gaps) |
| AE-17 | P1   | Invoice download                                   | UI       | TC 24                   | `tests/ui/checkout.spec.ts`                               | Pass (live)                                          |
| AE-18 | P1   | Product review                                     | UI       | TC 21                   | `tests/ui/ancillary.spec.ts`                              | Pass (live)                                          |
| AE-19 | P1   | Contact form with upload                           | UI       | TC 6                    | `tests/ui/ancillary.spec.ts`                              | Pass (live)                                          |
| AE-20 | P2   | Subscriptions                                      | UI       | TC 10, 11               | `tests/ui/ancillary.spec.ts`                              | Pass (live)                                          |
| AE-21 | P2   | Recommended item added to cart                     | UI       | TC 22                   | `tests/ui/ancillary.spec.ts`                              | Pass (live)                                          |
| AE-22 | P1   | Account API create, read, update, delete           | API      | API 11-14               | `tests/api/account.spec.ts`                               | Pass (live)                                          |
| AE-23 | P1   | API method validation (405)                        | API      | API 2, 4, 9             | `tests/api/products.spec.ts`, `tests/api/account.spec.ts` | Pass (live)                                          |
| AE-24 | P1   | UI / API consistency                               | UI + API | API 1, 3                | `tests/integration/ui-api-consistency.spec.ts`            | Pass (live)                                          |
| FI-01 | -    | Script fault (injected wrong expected total)       | Fault    | -                       | Procedure in `docs/fault-injection.md`                    | Not executed here (needs a branch)                   |
| FI-02 | -    | Network fault (test-controlled route abort)        | Fault    | -                       | `tests/fault/fi-02-network.spec.ts`                       | Executed; RCA classified ENVIRONMENT_OR_NETWORK      |
| FI-03 | -    | Delayed response (stretch)                         | Fault    | -                       | Not implemented                                           | Not started                                          |

## Coverage summary

- UI scenario IDs automated: 20 tests covering AE-01 to AE-21 (AE-15, AE-16 and AE-17 are separate tests). The assessment requires 18.
- API checks: all 14 documented API endpoints and methods are covered. The assessment requires 8 distinct checks, including positive and negative cases.
- Negative and edge cases: AE-03, AE-04, AE-05 (API 8), AE-08, AE-23 (x3), API 6. The assessment requires 6.
- Live run: 33 of 33 tests passed (2 workers, 1.7 min).
