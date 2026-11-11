# Task Routing Contract V2.2

SUBORDINATE_REFERENCE: \`references/code-pact-execution-spec-v2.md\` is the single active normative source.

## 1. Purpose

Code Pact is a universal AI Coding workflow entrypoint, not seven separately installed Skills. The task's **mode** answers "What kind of work does the user want?"; its **L0–L3 level** answers "How much risk, uncertainty and coordination does the job require?". Keep them independent.

The primary routing authority is the user's explicit intent interpreted by the Coding Agent in the actual project context. A deterministic keyword helper is available for reproducible suggestions; its result is **advisory** and never overrides direct user instructions, repository constraints, host policies, or execution approval.

## 2. Seven modes

| Mode | Meaning | Typical action | Default boundary |
| --- | --- | --- | --- |
| Analyze | Understand the project, architecture, module and evidence | Inspect files, dependencies and flows | Source read-only |
| Plan | Define requirements, options, design and acceptance | Inspect, compare, produce a requested plan | Read-only unless creating a requested document |
| Implement | Implement or refactor within scope | Change authorized local files, execute tests | Local edits within user-authorized scope |
| Debug | Reproduce, diagnose and fix with evidence | Observe → root-cause hypothesis → counter-evidence → fix/verify | Diagnose first; edits need task authorization |
| Review | Review design, implementation, security and regressions | Identify Findings and evidence; assess decisions | Read-only source by default; review-ledger writing only when requested |
| Verify | Test requirements and produce acceptance evidence | Execute allowed checks, reconcile coverage | Tests under allowed scope; do not assume their side effects are safe |
| Release | Prepare/commit/push/tag/publish/deploy | Inspect status, validate release, perform explicitly authorized writes | External mutation and destructive work need matching authorization |

Mode labels are stable identifiers, not command-line switches that bypass policy. A command such as \`/code-pact\` requires the host to have installed and recognized the Skill. If the host has no slash-command integration, invoke \`$code-pact\` by its installed name or naturally ask the host agent to follow Code Pact; the repo does not register system-wide slash commands.

## 3. Intent and mixed-mode orchestration

- Respect a user-selected mode. Otherwise infer from **requested action**, not from a noun inside a file title (e.g., "review implementation plan" is Review, not Plan + Implement).
- The request \`分析项目\` selects Analyze and stays read-only.
- \`评审当前方案\` selects Review; a single pass uses Quick Review, without creating durable files.
- \`根据 docs/实施方案.md 实施、测试和验收\` selects Implement → Verify. Read and validate the supplied MD and its acceptance criteria **before** changing code, then check each requirement against the implementation and tests.
- \`修复 Bug\` selects Debug → Implement. Root-cause evidence comes before repair.
- \`持续多轮评审直至达到验收标准\` selects Review with the durable Review Lifecycle; stable REQ/Finding/Decision/Validation IDs and R01…Rn apply.
- \`完成发布前的测试，再推送\` selects Verify → Release. External publication is separately approval-gated.
- A request may activate more than one mode; order the stages by meaningful dependencies rather than interpreting every matched keyword as a mandate to do everything.
- When a mode is ambiguous or unrecognized, inspect authorized project context, follow clear user intent, and ask one scoped question only if a material choice truly blocks progress. Never guess permission to modify or publish.

## 4. Context loading and workflows

Context loads on demand, not all at once. Begin with user request, repository instructions, canonical standard, then direct code or source MD, relevant tests, affected callers and actual failure evidence.

| Route | Mandatory context | Enable as needed | Avoid by default |
| --- | --- | --- | --- |
| Analyze | Repo entrypoints, architecture boundaries, affected code, project instructions | Dependency maps, tests, source risks | Writes and full project-wide scans without purpose |
| Plan | User constraints, existing architecture, original requirements, acceptance criteria | OpenSpec, decision record | Creating a redundant specification system |
| Implement | Actual code, tests and consumers, reference MD when provided | Traceability ledger, TDD, design decision | Large PRDs for one-file changes |
| Debug | Real symptom, repro, logs, call path, failure tests | Root-cause evidence chain and regression tests | Unverified root-cause claims |
| Review | Scope, constraints, code/plan, current validation evidence | Durable Review Session only for repeated/long reviews | Forcing every quick review into R01…Rn |
| Verify | Original acceptance criteria, changed code, test commands/results | Requirement-to-Validation matrix, final report | Claiming PASS from missing real execution |
| Release | Branch/revision, Git diff, release target, approved scope | Rollback and post-deployment checks | Secret discovery or unapproved push/force/reset |

Requirement traceability is enabled for complex plan-driven Implement + Verify, explicit "逐项验收", or multi-round Review. The reusable Review Lifecycle ledger is enabled only for multi-round/repeated reviews or explicit durable review state, not because any task mentioned "方案" or "评审".

## 5. Optional deterministic helper

From the target repository (or a workspace that can run Node.js), call the helper by path to the installed Skill:

\`\`\`powershell
node <code-pact-skill-root>/scripts/task-router.cjs "/code-pact 分析项目"
node <code-pact-skill-root>/scripts/task-router.cjs "根据 docs/实施方案.md 实施、测试和验收"
node <code-pact-skill-root>/scripts/task-router.cjs --mode review "持续多轮评审方案"
\`\`\`

The helper emits machine-readable JSON with:
- \`status\`, \`primary_mode\`, \`modes\`;
- \`task_level: assess_from_repository\` (L0–L3 requires actual change/risk inspection);
- \`review_lifecycle\`, \`requirement_traceability\`, \`source_document_mentioned\`;
- \`approval_required_for_external_mutation\`, \`mode_info\`, \`caveats\`.

It does not read repositories, parse Markdown, issue tool calls, grant authorization, select secrets, execute tasks, or create artifacts. Its keyword matching is a convenience for known task phrases; unfamiliar phrasing, negation and nuance require Agent judgement. A \`needs_intent\` return means the helper cannot determine a route, not that the user has no valid task.

## 6. Evidence and behavior acceptance

For each mixed-mode task, preserve the phase boundary and the original user goal in the result:
- Analyze ends with grounded findings, not surprise code changes.
- Plan ends with decision/acceptance criteria, not automatically implemented code.
- Implement ends with actual changed files and test results.
- Verify independently checks the requested requirements, including all missing or unexecuted validations.
- Review keeps earlier findings and original requirements visible across rounds.
- Release reports the exact destination, SHA and remote verification when actually authorized and executed.

Routing helper unit tests are **not** proof that a real Coding Agent will follow the Skill or correctly interpret all natural language. Those behaviors require instrumented real-agent runs recorded in \`evals/results/\` per the Evaluation Contract; unexecuted cases remain \`not_run\`.
