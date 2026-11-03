# Code Pact

**简体中文** | [English](README.md)

> 让 Codex / Claude Code / Cursor 写代码时，不乱改、不漏测、不写废话。

这是一个面向日常开发的 AI Coding Skill。

它不是重型 PRD 流程，也不是完整项目管理系统。  
它的目标很简单：

- 小任务不要走完整 SOP
- 大任务不要跳过分析
- AI 不要顺手重构
- 写完代码必须做漏项自检
- 没验证不能说可合并
- 最后用一屏 Executive Summary 交付

## 为什么需要它

AI 写代码很快，但经常出现这些问题：

- 一个小按钮也生成一堆文档
- 顺手改了无关文件
- 接口写了，前端没接
- DTO 改了，调用方没改
- 页面写了，路由没加
- 没跑测试，却说完成
- Review 输出几十条，看着很累

这个 Skill 用一套轻量规则解决这些问题。

## 核心机制

### 1. 任务分级

| 等级 | 适用场景 | 流程 |
|---|---|---|
| L0 微任务 | 改文案、改颜色、小 Bug | 直接改 + 自测 + 摘要 |
| L1 小功能 | 按钮、简单接口、表单校验 | Task Card + 影响分析 + Checklist |
| L2 模块任务 | 登录、权限、上传、多层联动 | 简版方案 + 任务拆分 + Review + 测试 |
| L3 项目级任务 | 新项目、大重构、架构变更 | PRD + 架构 + Backlog + Release |

关键原则：

> 不要把 L0 / L1 当 L3 做。

V2 任务分级依据改动范围、不确定性、影响范围、可回滚性、验证成本和共享状态敏感度判断，而不是以人类预计工时为主。

### 2. 最小充分改动原则

AI 必须：

- 改最少文件
- 改最少代码
- 不做无关格式化
- 不顺手优化
- 不顺手重构
- 不随意改接口、DTO、路由、数据库字段、配置项

### 3. 影响分析

L1 以上任务，实施前必须说明是否涉及：

```text
后端接口
Service 逻辑
DTO / 类型
数据库 / 配置
前端页面 / API 调用
路由 / 导航
测试 / 验证
```

### 4. 测试分级

不用输出几十条测试点，只按 P0 / P1 / P2 分级。

| 等级 | 含义 |
|---|---|
| P0 | 必须验收：核心流程、数据正确、接口/页面入口、构建/类型检查 |
| P1 | 建议验收：空数据、异常参数、重复提交、网络异常 |
| P2 | 可选验收：性能、大数据量、极端 UI 边界 |

### 5. 漏项自检

写完代码后，AI 必须检查：

```text
1. 是否有需求未实现？
2. 是否有代码改了但没验证？
3. 是否有接口、路由、DTO、配置、数据库遗漏？
4. 是否有测试未执行？
5. 当前是否可以进入 Review？
```

### 6. Executive Summary

每轮结束必须输出：

```text
【目标】
【改动文件】
【自测结果】
【风险】
【必须验收】
【结论】
```

如果没有验证核心路径，不能写“merge-ready / 可合并”。

## 快速使用

将仓库克隆到 Codex 的 skills 目录：

```powershell
git clone git@github.com:yeqiana/code-pact.git "$env:USERPROFILE\.codex\skills\code-pact"
```

也可以把 `SKILL.md` 放到你的 AI 工具 skills 目录，例如 Claude Code：

```text
~/.claude/skills/code-pact/SKILL.md
```

然后这样使用：

```text
使用 Code Pact。

任务：
给用户列表新增导出按钮。

限制：
- 不改后端接口
- 不重构组件
- 采用最小充分改动
- 做漏项自检
- 没有 P0 验证不要写可合并
```

Codex 用户也可以继续使用当前仓库 Skill 名：

```text
使用 $code-pact。
```

V2 区分范围确认（Scope Confirmation）与执行批准（Execution Approval）：Agent 可以先阅读资料、在沙箱中修改并进行本地验证；不可逆操作或外部副作用仍需在执行前获批。

## 示例：使用前后

未使用时，Agent 可能写很长的计划、修改无关文件、增加不必要的抽象、遗漏页面入口验证，最后列出几十条测试建议。

使用后，应给出类似这样的简短交付：

```text
任务等级：L1 小功能

影响：
后端接口：否
前端页面 / API 调用：是
路由：否
测试 / 验证：是
风险：低

计划：
1. 定位用户列表页面
2. 在现有操作区新增导出按钮
3. 优先复用已有导出处理逻辑
4. 按项目条件运行构建 / 类型检查

Executive Summary：
【目标】为用户列表新增导出按钮。
【改动文件】用户列表页面操作区。
【自测结果】已检查页面渲染路径；未运行构建，原因是……
【风险】导出接口行为未改动。
【必须验收】验证页面入口，并在环境允许时运行构建 / 类型检查。
【结论】可继续 / 需要小修 / 可合并。
```

## 适合场景

- 日常功能开发
- Bug 修复
- 代码 Review
- 测试验收规划
- Codex / Claude Code 执行约束
- 生成项目级 AGENTS.md / CLAUDE.md / PROJECT_RULES.md

## 不适合场景

- 法务合规最终审查
- 完整产品 PRD
- 深度安全审计
- 复杂架构委员会评审

## 一句话

> 让 AI Coding 从“看起来完成了”变成“有证据地完成了”。

## 调用兼容性

**Code Pact** 是产品与仓库名称，`code-pact` 是新的 Skill 标识。

- Codex：使用 `$code-pact` 调用。
- 其他工具：按其 Skill 发现方式安装后，要求 Agent 应用 Code Pact。

它不提供 Agent 运行时、长期记忆或项目规格库。L2/L3 任务需要持久化变更规格时，可与现有 OpenSpec 工作流配合使用。

## 发布校验

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-skill.ps1
```

PowerShell 7、macOS 或 Linux 使用：

```powershell
pwsh -NoProfile -File scripts/test-skill.ps1
pwsh -NoProfile -File scripts/test-eval-fixtures.ps1
```

主命令 `test-skill.ps1` 已包含评测样例校验；`test-eval-fixtures.ps1` 可用于单独检查评测样例。静态检查覆盖 UTF-8、关键规则、调用名、本地 Markdown 链接和行为契约覆盖，不会执行 AI Agent 或证明模型行为。声称行为契约通过前，必须按[人工行为评测](evals/manual-evaluation.md)执行。补强范围与验收标准见 [项目补强实施方案](docs/项目补强实施方案.md)。

## V2 执行模型

V2 按改动范围、不确定性、影响范围、可回滚性、验证成本和共享状态敏感度判断任务等级。默认采用最小充分改动，并区分范围确认与不可逆动作前的执行批准。

稳定调用名保持不变：`$code-pact`。

## V2 合同层

V2 新增以下执行契约：

- 上下文契约（Context Contract）
- 状态 / 恢复契约（State / Resume Contract）
- 评测契约（Evaluation Contract）
- 并行 / 委派契约（Parallelism / Delegation Contract）

这些契约定义 Coding Agent 的执行边界，不引入新的运行时、调度器、记忆服务或工作流引擎。

## 文件说明

```text
SKILL.md
README.md
README.zh-CN.md
references/code-pact-execution-spec-v2.md
examples/
prompts/
```

推广与落地说明位于 `docs/` 目录。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
