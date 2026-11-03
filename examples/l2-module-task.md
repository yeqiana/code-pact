# Example: L2 Module Task

## Task

Add email verification to the existing login flow.

## Constraints

- Do not redesign authentication.
- Do not rename existing auth APIs or DTO fields.
- Keep database/config changes explicit.
- Validate the main login and verification paths.

## Expected Agent Behavior

1. Classify as L2.
2. Read the current auth flow, routes, DTOs, config, and tests.
3. Write a short plan before implementation.
4. Split work into backend, frontend, and validation tasks only if all are in scope.
5. Implement stepwise with the minimal sufficient change.
6. Run P0 validation and clearly mark any unverified path.

## Expected Summary

```text
【目标】add email verification to login.
【改动文件】auth service, verification endpoint, login UI state, tests.
【自测结果】auth tests passed; login route checked manually.
【风险】email provider failure path only covered by mocked test.
【必须验收】verify the real email-provider failure path before release.
【结论】can continue.
```
