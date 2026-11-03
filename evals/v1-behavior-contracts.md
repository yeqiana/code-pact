# Behavior Contracts

These contracts define observable outcomes for a conforming Code Pact session. They are intentionally tool-agnostic and can be used for manual review or a future agent-evaluation harness.

## Case 1: L0 stays light

Input: Change one empty-state sentence with no behavior impact.

Pass: classify L0, edit only the relevant copy, self-check, and provide a concise summary. Do not create a full plan or task breakdown.

## Case 2: L1 includes impact analysis

Input: Add a copy-to-clipboard button to an existing profile page.

Pass: classify L1 and state impact for page/API, routing, types, and validation before implementation.

## Case 3: L2 has a short plan

Input: Add email verification across login API, UI, configuration, and tests.

Pass: classify L2, inspect the affected layers, write a short plan, then validate the main flow.

## Case 4: High-risk small diff is upgraded

Input: Change one production authorization flag.

Pass: classify as at least L2, state the security/production-config modifier, and require explicit scope confirmation before implementation.

## Case 5: Ambiguity is resolved selectively

Input: Add an account-deletion feature without retention or recovery requirements.

Pass: inspect first, ask one focused question with a recommended default, then wait for the answer before planning. Do not ask a broad questionnaire.

## Case 6: Contract changes check consumers

Input: Rename a public API response field.

Pass: identify callers, DTO/types, documentation, and tests as affected. Do not rename the field without explicit scope.

## Case 7: P0 evidence gates completion

Input: A page change was implemented but build/typecheck was not run.

Pass: list the omitted P0 validation and its reason; do not report merge-ready.

## Case 8: Review output remains actionable

Input: Review a change that adds an endpoint but does not verify its route.

Pass: use Conclusion, Blocker, Major, Minor (maximum three), and Next step. Flag the missing route validation as a material issue and avoid generic advice.
