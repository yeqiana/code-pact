# Coding Prompt

Use Code Pact. In Codex, invoke `$code-pact`.

Task:
[describe task]

Constraints:
- Make the minimal sufficient change.
- Do not refactor unrelated code.
- Do not add dependencies unless explicitly required.
- Do not rename public APIs, routes, DTOs, database fields, or config keys.

Required output:
1. Task level: L0 / L1 / L2 / L3
2. Impact analysis
3. Implementation plan
4. Changes made
5. Validation result
6. Final summary using `【目标】`、`【改动文件】`、`【自测结果】`、`【风险】`、`【必须验收】`、`【结论】`

Do not mark the work as merge-ready if P0 validation was not run or failed.

For L2/L3 work, first check risk modifiers and unresolved decisions. Use an existing OpenSpec workflow when the repository requires a persistent change record.
