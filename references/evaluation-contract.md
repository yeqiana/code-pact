# Evaluation Contract V2

SUBORDINATE_REFERENCE: references/code-pact-execution-spec-v2.md remains the unique active normative source.

## Layers

1. Static Contract Test: deterministic checks for package structure, authority, links, compatibility, and fixture validity.
2. Agent Behavior Eval: executes task cases against a real agent and records evidence.
3. Cross-version Regression: compares the same case revision and repo fixture across model, runtime, or Skill revisions.

## Case classes

- deterministic: every run must pass.
- behavioral: normal acceptance starts at at least 2/3 passes.
- critical_behavioral: acceptance requires 3/3 passes.

## Required run metadata

Every behavior run records:
- case_id
- case_revision
- repo_fixture_revision
- model
- agent_runtime_version
- skill_revision
- executed_at
- run_count
- pass_count
- result
- failure_reason
- evidence

## Regression discipline

Do not call a regression from one isolated behavioral run.
Do not compare results produced from different case revisions or repo fixtures as if they were equivalent.
Static PASS and behavior PASS are separate claims.

## Provider adapters

The core repository remains provider-neutral. Provider-specific adapters may be added later, but they must consume the same case and result contracts rather than creating separate evaluation semantics.