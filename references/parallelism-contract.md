# Parallelism / Delegation Contract V2

SUBORDINATE_REFERENCE: references/code-pact-execution-spec-v2.md remains the unique active normative source.

## Default

Do not parallelize by default.

## Eligible parallel work

Parallel execution is appropriate only when:
- subtask input and output boundaries are explicit
- write sets are disjoint or low-conflict
- mutable state is not shared
- each result can be independently validated
- merge dependencies are known

## Labels

- single-agent
- parallel-safe
- delegateable
- shared-state-sensitive

## Required delegation record

For delegated work identify:
- owner
- scope
- write_set
- read_dependencies
- expected_output
- validation
- merge_dependency

## Serial default

Shared-state-sensitive work defaults to serial execution. Examples include concurrent edits to one migration, one state machine authority, one shared schema, or the same high-conflict file.

## Scope

This contract does not create or require a scheduler. It only defines when a host that already supports multiple agents or slots may use them safely.