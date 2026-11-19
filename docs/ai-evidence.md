# AI Prompt & Correction Evidence

## Evidence 1: Correcting Locators (AE-01)

- **Initial AI Output:** `page.getByRole('radio', { name: 'Mr' })`
- **Human Challenge:** "This fails in strict mode because it matches both 'Mr.' and 'Mrs.'."
- **Correction Applied:** Changed to `page.locator('#id_gender1')`.
- **Decision:** Approved because ID locators are stable and unique.

## Evidence 2: Handling CI Environment Failures

- **Initial AI Output:** Suggested `page.waitForTimeout(5000)` to fix API failures.
- **Human Challenge:** "The rubric strictly forbids fixed sleeps. The GitHub runner is being blocked by Cloudflare (403)."
- **Correction Applied:** Implemented `safeJson()` to parse HTML errors and fail gracefully, and added the RCA rule for `THIRD_PARTY_DEPENDENCY`.
- **Decision:** Approved. The pipeline now diagnoses the WAF block instead of hiding it with timeouts.

This file holds two correction examples from the team. The template for further entries is [ai-interaction-log.md](evidence/ai-interaction-log.md).
