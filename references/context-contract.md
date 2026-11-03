# Context Contract V2

SUBORDINATE_REFERENCE: references/code-pact-execution-spec-v2.md remains the unique active normative source.

## Purpose

Give coding agents the smallest context set that reduces uncertainty or supports validation.

## Loading order

1. User task.
2. Repository instructions, AGENTS, and active Skill.
3. Canonical spec or public contract.
4. Directly affected code.
5. Direct tests.
6. Callers and consumers.
7. Relevant config or schema.
8. Prior failure evidence.
9. External research only when current or external facts matter.

## Context budget

Do not scan the whole repository for a local task by default.
Do not read every document because it exists.
Do not load unrelated history.
Add context only when it changes a decision, reduces uncertainty, or supports validation.

## Evidence priority

Prefer repository-native evidence over generic assumptions:
- project instructions
- canonical code paths
- tests
- schemas and APIs
- existing patterns
- actual command output

## External research

Use external research when the task depends on changing APIs, standards, security guidance, product behavior, or current ecosystem facts. External research does not override repository authority unless the task explicitly changes that authority.