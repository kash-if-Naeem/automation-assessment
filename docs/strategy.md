# Test Strategy (summary)

## 1. Scope & Assumptions

- **In Scope:** UI flows (Auth, Catalog, Cart, Checkout, Contact), API flows (Auth, Products, Brands), and AI RCA failure analysis.
- **Out of Scope:** Load testing, security penetration testing, real monetary transactions.
- **Assumptions:** The target site (`automationexercise.com`) is a public practice site and may be subject to rate-limiting (WAF 403/503 blocks) during CI runs. Payment data is strictly dummy.

## 2. Risk Matrix

- **P0 (Critical):** Registration, Login, Cart Math, Checkout. (Must be automated, must have negative cases).
- **P1 (High):** Search, Brand filtering, Contact Form, API CRUD.
- **P2 (Medium):** Subscriptions, Recommended items.

## 3. Test Design Approach

We utilize the Page Object Model (POM) for UI isolation and typed fixtures for API data. Every test generates a unique user (UUID) to prevent data pollution. Assertions go beyond visibility (e.g., checking cart arithmetic, verifying API JSON schemas).

## 4. AI & RCA Strategy

Failures are not just logged; they are triaged by a model-free RCA script. The script maps error signatures and
collected evidence to the 8 categories. **Every** record carries `requires_human_approval: true` — no classification
is ever treated as a verdict, and no patch is applied automatically. Confidence below **0.60**, or a tie between the
two leading hypotheses, is reported as `UNKNOWN` instead of a category. The threshold and the rubric live in
`skills/rca.md` and are enforced by `CONFIDENCE_FLOOR` in `tools/rca/analyze.ts`.

The fuller, live-run-backed version is in [test-strategy-detailed.md](test-strategy-detailed.md).
