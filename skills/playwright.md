# Skill: Playwright Automation

## Purpose

Write stable, isolated, reviewable Playwright TypeScript: page objects, typed API clients, fixtures, and assertions that check values.

## Inputs

- Approved scenarios from `skills/test-design.md`.
- The current page object and fixture code in `src/`.

## Output

- Specs in `tests/ui`, `tests/api`, `tests/integration`.
- Page methods in `src/pages`, API methods in `src/api`, fixtures in `src/fixtures`.

## Locator policy

1. `getByRole` with an accessible name (preferred).
2. `getByLabel` or `getByText` where role is not useful.
3. Stable attributes (`data-qa`, `id`) only when roles are ambiguous or absent. Explain it in a comment.
4. Never use XPath or brittle nth-child chains. `nth()` is allowed when the list position is the scenario itself, such as the second product.

### Documented exceptions in this repo

Each non-accessible locator below is a deliberate exception with its reason. Anything not on this list should use a
role, label or text locator; adding a row requires the same justification in review.

| Locator                                                          | Where                                    | Why a role/label/text locator does not work                                                                                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input[data-qa="..."]` (signup, login, address, card fields)     | `AuthPage`, `ContactPage`, `PaymentPage` | The site ships `data-qa` hooks for exactly these inputs and most carry no `<label for>`, so there is no accessible name to target. A purpose-built test attribute is the next-best choice after a role. |
| `getByText(/proceed to checkout/i)`                              | `CartPage.proceedToCheckout`             | Verified in a page snapshot: the control is not exposed as a link or button role, so `getByRole` never matches. Text is the most stable remaining handle.                                               |
| `#address_delivery`, `#address_invoice`                          | `CheckoutPage`                           | Two address blocks with identical inner text; only the ids distinguish delivery from billing.                                                                                                           |
| `.features_items .product-image-wrapper`                         | `ProductsPage.productCards`              | A product grid has no list/listitem roles on this site; the card wrapper is the only per-product boundary.                                                                                              |
| `a.add-to-cart[data-product-id]`, `a[href*="/product_details/"]` | `ProductsPage`, `CartPage`               | Used to read the **product id**, which is identity rather than presentation. Display text proved unstable (see A4 and the listing/cart text mismatch), so ids are the correct oracle.                   |
| `#cart_info_table tbody tr` filtered by `.cart_quantity`         | `CartPage.cartRows`                      | The table mixes item rows with layout rows; the quantity cell is what makes a row an item.                                                                                                              |
| `#susbscribe_email`, `#subscribe`                                | `HomePage`                               | Site ids (including the site's own typo). The field has no label and no accessible name.                                                                                                                |
| `#recommended-item-carousel .item.active`                        | `HomePage`                               | Inactive carousel slides hold hidden duplicates; `.active` is the only marker of the visible slide.                                                                                                     |

Where a role locator does work, it is used: navigation links, headings, buttons (`Signup`, `Login`, `Create Account`,
`Pay and Confirm Order`), `View Cart`, `Continue`, and every success/error message assertion.

## Waiting and assertions

- Use web-first assertions (`expect(locator).toBeVisible()`, `toHaveCount`), which retry.
- No `page.waitForTimeout`. ESLint rejects it.
- Use `expect.poll` only when no locator-based condition exists (for example, the cart may show items or the empty message).
- No `{ force: true }` unless justified in a comment and approved in review.

## Isolation

- Every test gets its own user from `generateTestUser()`. No shared account.
- Accounts created in a test are tracked with the `accountCleanup` fixture (or deleted in `finally`). The cleanup status is attached as evidence.
- Workers stay at 2 for the public site.

## API patterns

- Endpoints are relative (no leading slash). Base URL ends with `/api/`.
- Responses are validated against zod schemas in `src/api/schemas.ts`. A non-JSON body raises `ApiContractError`.
- Assert `responseCode` and `message` from the body, as documented in the API list.

## Tracing and evidence

- Traces, screenshots and video are kept on failure (`playwright.config.ts`).
- Attach evidence with `testInfo.attach`. Redact anything personal (`redact()` in `src/utils/logger.ts`).

## Review checklist

- [ ] Typecheck and lint pass
- [ ] Every new assertion checks a value, not only presence
- [ ] No fixed waits, no blanket force clicks
- [ ] Test data is generated, disposable and uses the `.invalid` domain
- [ ] Cleanup runs on failure too
- [ ] Traceability row added or updated
