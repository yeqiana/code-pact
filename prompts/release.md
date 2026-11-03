# Release Prompt

Use Code Pact to prepare release validation. In Codex, invoke `$code-pact`.

Release scope:
[describe release scope]

Check:
- included changes match the release scope
- P0 flows have validation evidence
- known unverified paths are listed
- rollback or follow-up items are explicit
- no unrelated refactors are bundled into the release

Output:
- Release conclusion: can release / needs small fix / must rework
- P0 validation checklist
- Known risks, max 3
- Follow-ups, max 3
- final summary using `【目标】`、`【改动文件】`、`【自测结果】`、`【风险】`、`【必须验收】`、`【结论】`
