# Code Pact V2.2 多轮评审状态回放演练

- 日期：2026-11-10
- 目的：验证 Review Lifecycle 从真实方案 MD 建立评审基线、逐轮记账、追溯需求与生成报告的执行链路。
- 状态：**自动化演练通过；真实 Coding Agent 行为验收尚未完成。**
- 方案来源：`docs/roadmap/code-pact-v2.2-direction.md`
- 证据位置：`scripts/tests/review-lifecycle.test.cjs`，用例 `real V2.2 plan MD can drive a three-round rehearsal and stays BLOCKED when Agent tests are unrun`
- 数据隔离：测试在系统临时目录内复制方案文档并生成演练台账，测试结束后清理自身临时数据，不写入现有 `evals/results/` 或用户原有评审会话。

## 演练过程

| 步骤 | 输入/动作 | 验证目标 | 测试结果 |
|---|---|---|---|
| R0 | 复制仓库实际 V2.2 方案 MD，执行 `init` | 自动记录原始 SHA-256、评审范围和 Session ID | 通过 |
| R01 | 记录两项从方案中提取的示例需求 | 保留 REQ ID，区分“有文档证据”和“未通过真实评测” | 通过 |
| R02 | 增加独立挑战轮次的**模拟事件**与 F-001 测试缺口 | 持续复用问题 ID，保留历史变化 | 通过 |
| R03 | 生成模拟 Final，真实 Agent 测试仍为 `not_run` | 不允许最后一轮没有新问题就自动 PASS | 通过 |
| 报告 | 运行 `report` CLI | 报告包括完整需求矩阵、Finding、验证证据、轮次和阻断理由 | 通过 |

### 方案驱动的演练需求

| 需求 ID | 方案目标 | 演练状态 | 验证连接 |
|---|---|---|---|
| REQ-001 | Review Lifecycle 具有稳定 ID 和连续评审轮次 | satisfied（以源码/文档引用模拟记录） | 刻意留空，以验证缺少测试链接的门禁 |
| REQ-002 | 真实 Agent 行为评测覆盖多轮评审 | blocked | VAL-001 = not_run |
| F-001 | 缺少独立 Agent 执行结果 | open / test_gap | R02 提出，R03 仍保留 |

**演练最终结论：`BLOCKED`**。它说明验证器能拒绝将未执行的评测写成完成；不代表 V2.2 的真实功能已经由独立 Agent 全面评审通过。

## 实际新增能力

1. 在 Requirement 中支持 `validation_ids`（指向 VAL 记录）和 `implementation_refs`（对应设计/代码位置）。
2. 最终 `PASS` 要求每项 `must + satisfied` 需求至少关联一项当前修订版已通过的验证；不存在、过期或未通过则阻断。
3. `report` 从经过校验的台账生成 Markdown，列出 REQ → 实现 → VAL → Evidence 的逐项对应关系，以及问题、根因、轮次和风险决策。
4. `report --write` 仅在最终台账有效时新建 `final-report.md`，不会覆盖已有报告；默认 `report` 仅输出至 stdout。
5. 保留原先的禁行机制：必需需求延期不可放行、风险接受需明确批准、严重/高风险不可走普通接受流程、修复必须验证、基线漂移需重新复核。

## 尚未完成

- 用实际 Codex、Claude Code 等运行 V2-C21～V2-C27，记录完整行为结果与原始证据。
- 对真实业务项目执行独立的多轮语义评审，确认遗漏识别与根因判断有效性。
- 对已有台账扩展的权限真实性、对抗性输入与范围边界进行后续专项安全评审。
- V2.2 其余 Task Router/Context Engine/Harness 适配阶段尚未验收。

## 复现

在仓库根目录运行：

```powershell
node --test scripts/tests/review-lifecycle.test.cjs
./scripts/test-skill.ps1
```

该演练是**真实方案 MD + 模拟评审状态 + 真实 CLI/自动化测试**，不是对外宣称真实 Agent 行为评测已通过。