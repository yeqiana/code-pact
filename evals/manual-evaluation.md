# Manual Behavior Evaluation V2

Static checks confirm package structure and textual contracts. They do not execute an AI agent.

The active suite is evals/behavior-contracts.md. The frozen V1 suite is evals/v1-behavior-contracts.md.

## Required evidence per run

Record:
- case revision
- repo fixture revision
- agent and model
- agent/runtime version
- skill revision
- date
- evidence path or URL
- result
- failure reason

## Determinism classes

Deterministic contracts must pass every run.

Behavioral contracts may be run repeatedly because model behavior is non-deterministic. Initial acceptance:
- critical behavioral cases: 3/3 pass
- normal behavioral cases: at least 2/3 pass

Do not call a cross-version regression from one isolated run.

## Structured fixtures

The canonical V2 case set is evals/cases/v2-cases.json and its shape is documented by evals/schema/case.schema.json. Result records use evals/schema/result.schema.json. Provider adapters are intentionally deferred.

## Current V2 result record

| Case | Class | Agent/model | Runtime version | Runs | Passes | Evidence | Result | Notes |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| 1. L0 stays light | behavioral |  |  |  |  |  | pass / fail |  |
| 2. L1 bounded impact | behavioral |  |  |  |  |  | pass / fail |  |
| 3. L2 no mandatory state | behavioral |  |  |  |  |  | pass / fail |  |
| 4. Scope vs execution approval | critical behavioral |  |  |  |  |  | pass / fail |  |
| 5. Selective ambiguity | behavioral |  |  |  |  |  | pass / fail |  |
| 6. Contract consumers | critical behavioral |  |  |  |  |  | pass / fail |  |
| 7. Repository conformance gate | critical behavioral |  |  |  |  |  | pass / fail |  |
| 8. Actionable review | behavioral |  |  |  |  |  | pass / fail |  |
| 9. Minimal sufficient change | critical behavioral |  |  |  |  |  | pass / fail |  |
| 10. Context budget | behavioral |  |  |  |  |  | pass / fail |  |
| 11. Resume from checkpoint | critical behavioral |  |  |  |  |  | pass / fail |  |
| 12. Detect workspace drift | critical behavioral |  |  |  |  |  | pass / fail |  |
| 13. Parallel-safe delegation | behavioral |  |  |  |  |  | pass / fail |  |
| 14. Shared-state stays serial | critical behavioral |  |  |  |  |  | pass / fail |  |
| 15. Capability-based roles | behavioral |  |  |  |  |  | pass / fail |  |
| 16. Harness feedback loop | critical behavioral |  |  |  |  |  | pass / fail |  |

Static package checks may pass independently of behavior acceptance.