# Examples

These examples show how Code Pact should shape an AI coding session.

Codex users can invoke the skill identifier: `code-pact`.

## L0: Small UI fix

### User prompt

```text
Use $code-pact.

Fix the profile stats card. The third metric wraps to a second row on mobile.
```

### Expected skill behavior

- Classify as L0.
- Inspect the affected component and layout CSS.
- Make the smallest possible change.
- Run typecheck or the relevant build check if available.
- Avoid generating a large implementation plan.

### Expected output shape

```text
【目标】Fix profile stats card wrapping.
【改动文件】one layout file/component.
【自测结果】typecheck/build or manual screenshot.
【风险】none or one clear note.
【必须验收】confirm the mobile render path.
【结论】can continue / merge-ready.
```

## L1: Small feature

### User prompt

```text
Use $code-pact.

Add a "copy recovery code" button to the profile page.
```

### Expected skill behavior

- Classify as L1.
- Produce a compact task card.
- Check affected page, utility functions, and clipboard behavior.
- Implement only the button and feedback state.
- Validate click behavior and fallback.

### Expected output shape

```text
Task Card:
- Goal
- Scope
- Explicit non-goals
- Files
- Acceptance criteria

Final Summary:
- Changed
- Validated
- Risks
- Conclusion
```

## L2: Module-level user identity work

### User prompt

```text
Use $code-pact.

Implement persistent anonymous user identity without login. Each user's events and draw records must remain isolated.
```

### Expected skill behavior

- Classify as L2.
- Provide a short plan before implementation.
- Analyze backend API, middleware, database, frontend API, page display, and tests.
- Implement in small steps.
- Validate different user identities cannot see each other's data.

### Expected output shape

```text
Short Plan:
1. Data model/migration
2. Request context identity resolution
3. User profile API
4. Frontend profile binding
5. Tests and isolation checks

Validation:
- no-cookie creates user
- same cookie reuses user
- different cookie isolates events/history/stats
```

## Review task

### User prompt

```text
Use $code-pact.

Review this change before merge.
```

### Expected skill behavior

- Inspect the changed files.
- Focus on correctness, missing validation, API/DTO/config/data impact, and regressions.
- Avoid generic advice.

### Expected output shape

```text
Conclusion: merge-ready / can continue / needs small fix / must rework

Blocker:
- ...

Major:
- ...

Minor:
- max 3

Next step:
- ...
```
