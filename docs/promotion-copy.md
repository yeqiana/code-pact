# Promotion Copy

## 50-character version

Code Pact: keep AI coding scoped, validated, and concise.

## 200-character version

Code Pact is a practical skill for Codex, Claude Code, and Cursor. It classifies tasks into L0/L1/L2/L3, keeps diffs small, checks missing impacts, validates P0 paths, and ends with an evidence-based executive summary.

Repository: https://github.com/yeqiana/code-pact

## Chinese short post

我做了一个 AI 编程防跑偏 Skill：Code Pact。

它主要解决几个问题：

- 小任务被 AI 做成大重构 / 大方案
- 改动范围失控
- 接口 / DTO / 数据库 / 测试影响漏掉
- 没跑测试却说“完成了”
- Review 和交付总结太长、太空

这个 Skill 会让 AI 先判断任务属于 L0/L1/L2/L3，再选择对应流程，按最小 Diff 实施，做漏项自检，并用 P0/P1/P2 做验证分级。

仓库： https://github.com/yeqiana/code-pact

## Long-form outline

Title:

```text
我做了一个 AI Coding 防跑偏 Skill
```

Structure:

```text
1. 为什么需要这个 Skill
   - AI 容易过度设计
   - 小任务输出大方案
   - 顺手改无关文件
   - 改代码但不验证
   - 总结缺少证据链

2. 它怎么工作
   - L0/L1/L2/L3 任务分级
   - 最小 Diff 原则
   - 影响分析
   - P0/P1/P2 测试分级
   - Executive Summary

3. 适合什么场景
   - Bug fix
   - 小功能
   - 模块级改造
   - Code review

4. 不适合什么场景
   - 不替代领域知识
   - 不保证自动写出正确代码
   - 不解决所有项目管理问题

5. 如何安装和使用
   - git clone 到 ~/.codex/skills
   - Use code-pact.
   - Codex 当前也可以用 Use $code-pact.

6. 后续计划
   - 更多示例
   - Release v0.1.0
   - 提交到 awesome-agent-skills / awesome-codex-skills
```

Repository:

```text
https://github.com/yeqiana/code-pact
```
