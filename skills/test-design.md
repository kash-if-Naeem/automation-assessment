# Skill: Test Design

## Purpose

Turn requirements, risks and reference mappings into traceable, risk-based test cases with explicit oracles.

## Inputs

- Requirements and scenario IDs from `docs/assessment-compliance.md` and `docs/traceability.md`.
- The risk matrix in `docs/strategy.md`.
- Reference cases (the 26 published UI cases and 14 published API cases). Use them as a map, not as a copy.

## Output (JSON-shaped, one object per scenario)

```json
{
  "scenario_id": "AE-12",
  "priority": "P0",
  "feature": "cart",
  "layer": "UI",
  "source_ref": "TC 13",
  "steps": ["add product", "set quantity 4", "view cart"],
  "test_data": "generated user; first product on /products",
  "oracle": "line total equals unit price x 4 (cents)",
  "missing_oracle_questions": []
}
```

If an oracle is unknown, output `missing_oracle_questions` and do not guess. Use `[MISSING ORACLE]` in the scenario.

## Rules and guardrails

- Do not invent requirements. A site behaviour that is not documented goes to `docs/assumptions-log.md` first.
- Do not copy published steps verbatim. Add a boundary or a negative case where the site allows it.
- Every P0 scenario needs an automated test ID and at least one assertion beyond page visibility.
- Negative cases must state the intended oracle and the observed site behaviour.

## Human checkpoint

A QA lead approves coverage and priorities before automation starts. Record the approval in `docs/evidence/human-approvals.md`.
