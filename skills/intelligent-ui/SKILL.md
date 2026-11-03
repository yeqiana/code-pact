---
name: intelligent-ui
description: 使 Codex、Claude Code、DeepSeek 等 Coding Agent 按客户端渲染能力输出高可读性 Markdown；仅在宿主具备受控组件 Renderer 时输出结构化 UI。适用于技术方案、代码审查、实施测试验收与工程汇报。
---

# Intelligent UI · Coding Agent 输出 Skill

## 目标

在当前输出媒介中，优先提供清晰、紧凑、可验证的用户体验，避免纯文字墙；不改变 Agent 的任务执行规则。

**重要边界：** Markdown 美化与真正可交互 UI 是两回事。本 Skill 不是 ChatGPT 原生 Intelligent UI / DIL 的官方实现，也不能靠 Prompt 使 CLI、VSCode 终端出现按钮或滑块。真实交互需要宿主提供 Renderer / Webview。

## 能力分级（输出前必须判断）

| 媒介 | 可安全假定的能力 | 输出 |
| --- | --- | --- |
| 终端、CLI、日志 | 普通文本、有限 Markdown | 纯 Markdown；所有结论有文本说明 |
| GitHub / Markdown 阅读器 | GFM 表格、清单；Mermaid 因平台而异 | GFM 优先；图表附文本解释 |
| IDE Markdown 预览 | 因插件而异 | 渐进增强，不依赖内联 JS/CSS |
| 自有 Web / Webview + 已声明的 UI Renderer | 特定组件白名单、数据绑定 | 受控 UI JSON + 完整 Markdown 降级 |

宿主能力未知时，只输出标准 Markdown。**禁止伪造可点击控件**；不要将一段 UI JSON 声称为已渲染界面。

## 结构与排版

1. **先结论再展开**：复杂回答先写结论、约束、当前结果，再给方案、验证、风险。
2. **选择合适结构**：对比用短表格；流程用有序步骤；状态用 checklist；命令用代码围栏；可选 Mermaid 必有文字回退。
3. **避免装饰性卡片堆砌**：标题通常从二级开始，层级不超过三级；表格最多约 5 列，过宽则拆分。
4. **有限视觉强调**：用加粗标记真正关键的结论；颜色和 emoji 不能单独表示成功、失败或警告。
5. **可访问性**：图片有替代文字；链接文字说明目标；图表必须配文字结论。
6. **事实与验证**：未执行的命令不得写成已验证；未观察的 Git 推送不得写成成功；不编造数据、链接和工具结果。

## 工作步骤

### 对技术方案或评审

- 结论与边界（1 段）
- 现状 / 差距（必要时表格）
- 变更范围与步骤（编号）
- 风险与回退（简短）
- 测试验收（逐项可执行）

### 对代码修改

输出简短的实际证据：

- 【目标】本次完成的内容
- 【改动文件】真实路径
- 【自测结果】实际命令与观察结果；区分执行检查与静态检查
- 【风险】最多 3 条
- 【必须验收】最多 5 项
- 【结论】验证通过 / 需补强 / 未验证

### 对支持交互的客户端

只有宿主**显式启用本仓库示例 Renderer**，才能使用 references/renderer-contract.md 定义的演示 JSON 协议：

- 组件白名单：纯文本、slider、只读指标、note。
- JSON 只能作为**数据**传递；严禁模型提供可执行 JS、HTML、CSS、任意事件或网络地址。
- 输出时另附等价 Markdown，明确静态默认值和演示公式。
- 状态只能由宿主 Renderer 更新；有副作用的操作必须走宿主授权、审计和确认机制。
- 如果要接入 OpenUI/A2UI，需单独针对其正式 Schema 开发适配，不得把示例协议改名冒充兼容。

## 输出前检查

- 没有 Renderer 时，读者能否完整理解结果？
- 是否把“计划中、已执行、已测试、未验证”区分清楚？
- 每个图表、表格、交互是否适配目标宿主？
- 文档是否清楚、紧凑且没有大量无意义布局？
- 所有关键结论和外部行为是否有真实证据？

## 参考文件

- README.md：安装与使用
- references/renderer-contract.md：演示协议与安全边界
- examples/thread-pool.md：Markdown 回退
- examples/thread-pool.ui.json：示例结构化 UI 数据
- demo/index.html：交互式浏览器演示
- scripts/validate.ps1：静态检查

本 Skill 只规范**回答呈现**，不能替代 code-pact 的实施与验收规则。
