# Manual Behavior Evaluation

Static checks confirm that the skill package and its contracts are present. They do not execute an AI agent. Use this procedure before claiming that behavior contracts pass for a specific agent and version.

## Procedure

1. Start a fresh session for each case in `behavior-contracts.md`.
2. Invoke Code Pact and paste the case input without adding guidance that supplies the expected answer.
3. Save the complete agent output, model/agent version, date, and skill revision.
4. Score the output against the case's `Pass` statement. Mark a case failed when a required behavior is absent or a prohibited behavior occurs.
5. Record failures, remediation, and rerun evidence. The suite passes only when all eight cases pass.

## Result Record

| Case | Agent and version | Evidence path or URL | Result | Reviewer | Notes |
| --- | --- | --- | --- | --- | --- |
| 1. L0 stays light |  |  | pass / fail |  |  |
| 2. L1 includes impact analysis |  |  | pass / fail |  |  |
| 3. L2 has a short plan |  |  | pass / fail |  |  |
| 4. High-risk small diff is upgraded |  |  | pass / fail |  |  |
| 5. Ambiguity is resolved selectively |  |  | pass / fail |  |  |
| 6. Contract changes check consumers |  |  | pass / fail |  |  |
| 7. P0 evidence gates completion |  |  | pass / fail |  |  |
| 8. Review output remains actionable |  |  | pass / fail |  |  |

## Acceptance

Do not label the behavior suite passed when any row is empty, failed, or lacks output evidence. Static package checks may pass independently of this manual evaluation.
