# State / Resume Contract V2

SUBORDINATE_REFERENCE: references/code-pact-execution-spec-v2.md remains the unique active normative source.

## Trigger

Durable state is not mandatory for every L2 or L3 task. Enable it only when one or more conditions apply:
- cross-session execution
- background or asynchronous job
- agent handoff
- long-running work with likely context loss
- material workspace drift risk
- multi-agent or multi-slot work
- explicit user request for continued or resumable execution

## Minimum logical state

A host may store the state in its own format. The logical fields are:
- task_id
- goal
- scope
- last_verified_revision
- completed
- remaining
- blocked
- failed_attempts
- validation_evidence
- next_action

## Resume algorithm

1. Load durable state.
2. Verify last_verified_revision against the current workspace.
3. Detect source or workspace drift before editing.
4. Reuse completed work and validation evidence when still valid.
5. Preserve failed attempts so the next execution does not repeat them blindly.
6. Continue from next_action.

## Drift

If the repository changed after last_verified_revision, do not silently assume prior validation still applies. Revalidate affected scopes and update the state.

## Anti-ceremony rule

A task that can safely finish in one session must not create state artifacts merely because it is classified L2 or L3.