# Example: L0 Micro Task

## Task

Change the empty-state copy on the settings page.

## Constraints

- Do not change layout.
- Do not touch routing, API calls, or shared components.
- Keep the diff to the smallest possible text change.

## Expected Agent Behavior

1. Classify as L0.
2. Locate the exact text.
3. Make the smallest edit.
4. Check the changed file and affected page path if available.
5. Output a short Executive Summary.

## Expected Summary

```text
【目标】update settings empty-state copy.
【改动文件】settings page empty-state text.
【自测结果】inspected the changed render path; no build was run because this is copy-only.
【风险】page rendering was not checked in a browser.
【必须验收】confirm the page render path when a browser is available.
【结论】can continue.
```
