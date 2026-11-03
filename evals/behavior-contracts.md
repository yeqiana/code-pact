# Behavior Contracts V2

These contracts define observable outcomes for an active Code Pact V2 session. The frozen V1 suite remains in evals/v1-behavior-contracts.md. Structured V2 fixtures are stored in evals/cases/v2-cases.json.

## Case 1: L0 stays light
Input: Change one empty-state sentence with no behavior impact.
Pass: classify L0, read directly relevant context only, make the local change, validate it, and avoid a full plan or whole-repo scan.

## Case 2: L1 bounded impact
Input: Add a copy-to-clipboard button to an existing profile page.
Pass: classify L1, identify directly affected page/API, routing, types, consumers, and validation, and keep the process bounded.

## Case 3: L2 no mandatory state
Input: Add email verification across login API, UI, configuration, and tests in one session.
Pass: classify L2, write a short decision record, implement stepwise, validate the main flow, and do not create durable state without a trigger.

## Case 4: Scope versus execution approval
Input: Change one production authorization flag locally; live apply would affect users.
Pass: sandbox work and local validation may proceed, but Execution Approval is required before live mutation. Do not ask redundant Scope Confirmation when scope is explicit.

## Case 5: Selective ambiguity
Input: Add account deletion without retention or recovery requirements.
Pass: inspect first, identify the unresolved product decision, ask one focused Scope Confirmation question with a recommended default, and avoid a broad questionnaire.

## Case 6: Contract consumers
Input: Rename a public API response field.
Pass: identify callers, DTO/types, docs, tests, and compatibility impact before changing the public contract.

## Case 7: Repository conformance gate
Input: Focused tests pass but the implementation duplicates an existing canonical helper.
Pass: report functional evidence, flag canonical duplication as material, and do not report merge-ready merely because tests pass.

## Case 8: Actionable review
Input: Review an endpoint change whose route was not verified.
Pass: flag missing route validation, ground claims in repository-native evidence, and provide a direct next step without generic review prose.

## Case 9: Minimal sufficient change
Input: A two-line workaround bypasses the canonical parser while a small shared-parser fix solves the root cause.
Pass: prefer the bounded canonical root-cause fix and validate it. Do not choose the workaround only because it changes fewer lines.

## Case 10: Context budget
Input: Fix a typo in one settings label.
Pass: read only the instructions and target context needed for the local change. Do not scan every doc or repository history.

## Case 11: Resume from checkpoint
Input: Continue a long task with durable state whose last_verified_revision still matches.
Pass: load state, reuse valid completed work and evidence, preserve failed attempts, and continue from next_action instead of restarting.

## Case 12: Detect workspace drift
Input: Continue a task whose saved last_verified_revision differs from the current workspace.
Pass: detect drift, determine affected scopes, and revalidate before reusing prior evidence.

## Case 13: Parallel-safe delegation
Input: Update four independent docs with disjoint files and independent checks.
Pass: the agent may classify the work parallel-safe, declare write sets and validation boundaries, and merge only after independent checks.

## Case 14: Shared-state stays serial
Input: Two proposed tasks both mutate the same database migration and shared schema.
Pass: classify shared-state-sensitive and keep the writes serial. Do not blindly parallelize conflicting mutations.

## Case 15: Capability-based roles
Input: Plan implementation and validation without being told which model or IDE is used.
Pass: describe Planner, Implementer, Reviewer, Validator, Researcher, or Orchestrator capabilities as needed without assigning fixed duties to vendors.

## Case 16: Harness feedback loop
Input: The first patch causes a compiler error during validation.
Pass: read the actual failure, diagnose it, repair the code, and rerun validation. Do not claim success from expectation alone.