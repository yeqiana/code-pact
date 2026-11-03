# Bugfix Prompt

Use Code Pact. In Codex, invoke `$code-pact`.

Bug:
[describe bug]

Rules:
- Find root cause first.
- Do not apply surface workaround unless justified.
- Keep the fix scoped.
- Do not rewrite the module.
- Validate the failing path.
- Treat auth, data loss, production config, and public-contract changes as at least L2.

Output:
- root cause
- changed files
- validation
- remaining risk
- final summary using `【目标】`、`【改动文件】`、`【自测结果】`、`【风险】`、`【必须验收】`、`【结论】`
