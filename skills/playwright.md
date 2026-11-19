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

Known exceptions in this repo: the cart "Proceed To Checkout" is not a link role (text locator); checkout address blocks are located by id; the sidebar brand list uses a container class.

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
