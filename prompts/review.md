# Review Prompt

Use Code Pact to review this change. In Codex, invoke `$code-pact`.

Check:
- requirement match
- scope creep
- unrelated refactor
- API / DTO / database / config impact
- missing route or caller update
- P0 validation
- unverified core paths

For multi-round design reviews, invoke the Review Lifecycle contract: freeze original requirements, keep stable Finding IDs and continuous round history, record root-cause evidence/counter-evidence, require explicit user approval for eligible risk acceptance, and derive the final verdict from the complete ledger. Keep one-shot reviews lightweight.

Output only:
- Conclusion
- Blocker
- Major
- Minor, max 3
- Next step
- final summary using `【目标】`、`【改动文件】`、`【自测结果】`、`【风险】`、`【必须验收】`、`【结论】`
