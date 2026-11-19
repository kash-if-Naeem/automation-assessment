# Skill: Root Cause Analysis (RCA)

## Purpose

Classify each failed or flaky test from evidence, rank competing causes, and hand the reviewer something they can check. A classification is a hypothesis until a human approves it.

## Evidence hierarchy (strongest first)

1. Reproduction: an isolated re-run that fails the same way, or passes after a verified change.
2. Trace, screenshot and DOM snapshot (`error-context.md`) from the failing run.
3. Error message, stack and the failing assertion (expected vs received).
4. Console and network output (sanitised).
5. Recent diff (`git diff HEAD~1 HEAD`) touching the failing spec or page object.
6. Prior-run history. Not used by the current build.

A claim above level 3 must cite a file or run ID.

## Stages

Detect → Collect → Correlate → Hypothesize → Validate → Recommend → Publish (see `docs/rca-schema.json`).

- Detect: test ID, error, retry count, run URL, commit SHA.
- Correlate: find the failing assertion and the step before it. Separate the first failure from downstream symptoms.
- Hypothesize: rank causes; list evidence for and against each.
- Validate: re-run the isolated test or inspect the locator, response or diff. Never edit silently.

## Classification policy

| Category               | Use when                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| PRODUCT_DEFECT         | Assertion fails and the spec is unchanged, and the trace shows the product behaving outside the documented behaviour |
| TEST_SCRIPT_DEFECT     | The failing spec or page object changed recently, or the expectation is wrong                                        |
| LOCATOR_OR_UI_CHANGE   | Locator not found while the element is present under another selector                                                |
| TEST_DATA_OR_STATE     | Data or account state from another test or a previous run                                                            |
| ENVIRONMENT_OR_NETWORK | Browser network error (`net::ERR_*`), including test-controlled route aborts                                         |
| TIMING_OR_FLAKINESS    | Passes on retry without a code change                                                                                |
| THIRD_PARTY_DEPENDENCY | Site queue page, 5xx or 429 from the public site                                                                     |
| UNKNOWN                | Evidence is missing or hypotheses are tied                                                                           |

Rule: a classification must name at least one artifact and one rejected alternative.

## Confidence rubric

- Start from the top rule's confidence (0.50 to 0.90 in `tools/rca/analyze.ts`).
- Subtract 0.15 when no trace is attached.
- Below 0.60: classify as UNKNOWN.
- Confidence is a judgement, not proof. Injected faults are labelled `injected: true` and never reported as product defects.

## Uncertainty policy

- If the trace is missing, say so in `evidence`.
- If two hypotheses tie, output UNKNOWN and list both.
- Never claim a product defect from an injected fault.

## Business severity and owner (Recommend stage)

Severity starts from the scenario's risk tag (`@p0` → BLOCKER, `@p1` → HIGH, `@p2` → MEDIUM)
and is reduced when the cause is not the product: a P0 journey blocked by the site is HIGH
for the run but is not a release blocker, and anything else environmental is LOW. An
`UNKNOWN` classification is always `UNTRIAGED` — an untriaged failure must not look benign.

Suggested owner follows the category: product defects to product engineering, test and
timing defects to QA automation, environment and third-party to CI/infrastructure. It is
advisory; the reviewer owns the final assignment.

## Correlating downstream symptoms

One environmental event routinely fails many tests at once. Records are grouped on
classification plus a digit-normalised error signature: the first failure of a signature is
`primary`, the rest carry `downstream_of` and the group size. A reviewer then triages the
event once rather than reading N near-identical records. Grouping never changes a
classification — it only orders the reading.

## Output

- `reports/rca/rca-report.json` (schema in `docs/rca-schema.json`)
- `reports/rca/rca-summary.md` (human-readable, includes UNKNOWN cases)
- `reports/rca/collection-status.json` (shows when results were missing)

## Model-free fallback

When no AI key is configured, the rule-based analyzer runs. It must still produce the full report. The AI path is not implemented in this build.

## Human checkpoint

A reviewer verifies the cited evidence and approves the classification. `requires_human_approval` is always true.
