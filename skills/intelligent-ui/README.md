# Intelligent UI Skill · 本地 Agent 版

用于让本地 Codex、Claude Code、DeepSeek 等 Coding Agent 输出更易阅读的 Markdown；有独立 Renderer 的 Web / IDE 客户端还可以提供类似交互表单的体验。

**限制：** Skill 本身不会使纯 CLI 或普通 Markdown 阅读器出现滑块、图表控件。ChatGPT 的原生 Intelligent UI 运行时也不包含在这里。

## 目录

| 文件 | 内容 |
| --- | --- |
| SKILL.md | Agent 输出规范与媒介分级 |
| references/renderer-contract.md | 演示 JSON 协议及安全边界 |
| examples/thread-pool.md | 无交互环境下的 Markdown 回退 |
| examples/thread-pool.ui.json | 交互数据示例 |
| demo/index.html + renderer.js | 离线浏览器交互 Demo |
| scripts/validate.ps1 | 静态验证 |

## 安装

在仓库根目录打开 PowerShell：

~~~powershell
# Codex 用户级 Skill
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
Copy-Item -Recurse -Force ".\skills\intelligent-ui" "$HOME\.codex\skills\intelligent-ui"
~~~

Claude Code 项目内可把此目录复制到 .claude/skills/intelligent-ui。没有 Skill 自动加载能力的 DeepSeek / 本地 Agent，需要将 SKILL.md 加入其系统提示词，并按需提供示例文件。

使用提示词示例：

> 遵循 intelligent-ui Skill，生成一份 Java 线程池分析与测试验收 Markdown。当前宿主只是 GitHub Markdown 阅读器，不支持交互式控件。

## 浏览器演示

1. 用浏览器直接打开 demo/index.html（无需服务、无需联网）。
2. 调节核心线程数滑块，观察只读指标即时变化。
3. 可以将 examples/thread-pool.ui.json 内容粘贴到页面的 JSON 输入区，重新渲染。
4. 对接 WebCodex 真正聊天界面还需额外改造其消息渲染层，**本 Skill 未修改 WebCodex 应用源码**。

本地验证：

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\skills\intelligent-ui\scripts\validate.ps1"
~~~

此验证覆盖目录与协议静态检查、Node 可用时的 JS 语法检查；浏览器交互需手动验收。

## 安全原则

- 未识别的协议或越界数据必须拒绝渲染，回退为 Markdown。
- 模型输出永远是**数据**，不执行模型生成的脚本/HTML/CSS。
- 业务上的真实写操作只能由宿主的白名单事件、权限和审计流程发起。
