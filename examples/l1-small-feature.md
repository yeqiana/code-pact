# Example: L1 Small Feature

## Task

Add an export button to the user list page.

## Constraints

- Do not change backend APIs.
- Do not refactor the table component.
- Reuse existing button styles.
- Make the minimal sufficient change.

## Expected Agent Behavior

1. Classify as L1.
2. Perform impact analysis.
3. Locate the user list page.
4. Add the button near existing actions.
5. Verify page entry and build/typecheck if available.
6. Output Executive Summary.

## Expected Summary

```text
【目标】add export button to user list.
【改动文件】user list page action area.
【自测结果】checked render path; build not run because ...
【风险】export API behavior not changed.
【必须验收】verify the page entry and run build/typecheck when available.
【结论】can continue.
```
