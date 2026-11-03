# Renderer Contract · 仅为本仓库演示协议

> 非 OpenAI DIL、OpenUI Lang、Google A2UI 的官方 Schema；不可将本 JSON 原样提交给那些产品的 Renderer。

## 设计原则

**Agent 负责描述，宿主负责验证与渲染。**

AI 模型输出（Markdown + 可选 JSON）→ 数据传输（可使用 SSE）→ Schema 校验 → 组件白名单 Renderer → 用户本地交互。任何外部工具或写操作仍须通过宿主自己的权限、确认和审计。

- 文本只用 DOM 的 textContent 展示；禁止将模型文本拼接成 innerHTML。
- 禁止执行模型返回的 JavaScript、HTML、CSS、事件表达式或任意 URL。
- 本演示无网络、无数据库、无持久化，不允许模型定义工具调用。
- 未接入支持该协议的 Renderer 时，必须显示 Markdown 回退。

## 示例协议

~~~json
{
  "version": "intelligent-ui-demo/v1",
  "title": "线程池配置器",
  "description": "演示公式：最大线程数 = 核心线程数 × 2，非生产通用建议。",
  "controls": [
    { "id": "core", "type": "slider", "label": "核心线程数", "min": 1, "max": 16, "step": 1, "value": 4 }
  ],
  "metrics": [
    { "label": "最大线程数（示例）", "source": "core", "multiplier": 2, "suffix": " 线程" }
  ],
  "note": "实际线程池参数需要结合 CPU/IO 类型、请求量和压测确定。"
}
~~~

| 字段 | 强制条件 |
| --- | --- |
| version | 只能是 intelligent-ui-demo/v1 |
| title/description/note | 限长纯文本 |
| controls | 数组，最多 8；只接受 type=slider |
| slider | id 唯一，min/max/step/value 为有限数，step > 0，min <= value <= max |
| metrics | 数组，最多 12；source 指向现有 slider id，multiplier 为有限且有界数 |
| label/suffix | 纯文本，无事件处理逻辑 |
| 额外属性 | demo 默认拒绝不认识的顶层与组件字段，避免误用 |

交互计算仅为 source × multiplier，不做服务端操作。默认值及公式必须有文字说明。

## 错误处理与降级

- 不认识的协议版本、字段、组件或数值越界：拒绝渲染并提供明确的错误文本。
- 无 Renderer / 渲染错误：回退到 examples/thread-pool.md 这样的 Markdown 静态内容。
- 可选 Mermaid 不支持：保持同等可理解的纯文字步骤。
- 真正的工具操作、删除、转账、部署等副作用：本协议**不支持**，不可在渲染器中“顺手实现”。

## WebCodex 集成建议

1. 在聊天消息协议层区分普通 Markdown 与受控 UI JSON 数据。
2. 消息流完成后校验 JSON，不要对不完整片段直接执行或拼接 HTML。
3. 在 Webview / 前端注册 Renderer；将组件与本地状态绑定。
4. 提供“查看 Markdown 原文”回退。
5. 若未来采用 OpenUI/A2UI，先核实对应版本的真实 Schema，再做字段映射和测试。

**范围声明：** demo 是可执行示例，并非已经嵌入 WebCodex 聊天界面。
