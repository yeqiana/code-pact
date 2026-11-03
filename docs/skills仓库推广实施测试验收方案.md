> HISTORICAL V1 DOCUMENT: this plan records the V1-era repository state. The current active normative source is references/code-pact-execution-spec-v2.md.

# Skills 仓库推广实施测试验收方案

## 1. 背景与目标

当前仓库 `code-pact` 已经具备 Codex skill 的核心文件：`SKILL.md`、`agents/openai.yaml`、`references/code-pact-execution-spec-v1.md`。但如果希望在 GitHub 上获得更多 star，不能只把它当作“文件仓库”，需要把它包装成“开发者一眼能理解、愿意试用、方便传播的开源工具”。

目标：

- 让访问者 30 秒内理解这个 skill 解决什么问题。
- 让开发者 3 分钟内完成复制/安装/试用。
- 让仓库具备 GitHub 搜索、Topics、README、社交分享、版本发布等基础传播能力。
- 用数据验证推广动作是否有效，而不是只看主观感觉。

## 2. 为什么别人的 skill 仓库 star 多

常见原因不是“功能一定更强”，而是传播闭环更完整：

1. **定位清楚**：README 第一屏直接说清楚解决的痛点。
2. **安装简单**：提供复制目录、GitHub 安装、使用示例。
3. **有可视化示例**：截图、Before/After、真实任务输出。
4. **关键词覆盖好**：仓库描述、Topics、README 标题覆盖用户搜索词。
5. **持续更新**：Release、版本号、Issue 反馈让用户觉得项目活着。
6. **分发渠道多**：GitHub Topics、社群、X、Reddit、掘金、V2EX、即刻等同步触达。
7. **作者背书明确**：GitHub Profile、Pinned Repo、长期维护说明增强信任。

参考依据：

- GitHub 官方建议每个仓库提供 README，方便用户理解和导航项目。
- GitHub Topics 可帮助用户按主题发现仓库。
- GitHub Social Preview 会影响链接在社交平台上的展示效果。

## 3. 当前仓库差距

| 项目 | 当前状态 | 问题 |
| --- | --- | --- |
| Skill 文件 | 已有 | 可用 |
| README | 缺失 | GitHub 首页不够像“产品落地页” |
| License | 缺失 | 其他人不敢放心复用 |
| Topics | 未配置 | 搜索和关联发现弱 |
| Social Preview | 未配置 | 分享链接时吸引力弱 |
| 示例任务 | 缺少 | 用户不知道实际效果 |
| 安装说明 | 缺少 | 用户需要自己猜怎么用 |
| Release | 缺少 | 没有版本感 |
| 推广素材 | 缺少 | 每次分享都要重新组织语言 |

## 4. 实施方案

### 4.1 仓库基础包装

新增或配置：

```text
README.md
LICENSE
docs/examples.md
docs/promotion-copy.md
docs/skills仓库推广实施测试验收方案.md
```

说明：

- `SKILL.md` 仍然是 Codex skill 主入口。
- `README.md` 是 GitHub 展示页，用来介绍、安装、示例和引导 star。
- `docs/examples.md` 放真实任务示例，避免 README 过长。
- `docs/promotion-copy.md` 放不同平台的推广文案。

### 4.2 README 结构

README 建议结构：

```text
# AI Coding Collaboration

一句话定位：
让 AI 编程任务自动分级，按最小 Diff 实施，并用验证结果收尾。

## Why
解决 AI 写代码时过度设计、漏测、改太多、总结不清的问题。

## What it does
- L0/L1/L2/L3 任务分级
- 影响分析
- 最小 Diff
- P0/P1/P2 测试分级
- 漏项自检
- Executive Summary

## Install
复制到 ~/.codex/skills/code-pact

## Usage
Use $code-pact to classify this coding task...

## Examples
链接到 docs/examples.md

## License
MIT
```

README 第一屏必须出现：

- 它是什么。
- 解决什么痛点。
- 怎么安装。
- 怎么调用。

### 4.3 Topics 配置

建议设置 GitHub Topics：

```text
codex
codex-skill
ai-coding
coding-agent
developer-tools
software-engineering
prompt-engineering
agent-workflow
code-review
testing
```

Topics 的价值是让仓库进入 GitHub 主题发现链路，GitHub 官方说明 Topics 会把仓库连接到相同主题下的项目，帮助用户发现相关项目。

### 4.4 示例内容

`docs/examples.md` 至少放 4 个例子：

1. L0：修一个小样式问题。
2. L1：新增一个按钮或简单接口。
3. L2：实现匿名用户识别。
4. Review：审查一次 PR 或变更。

每个例子固定格式：

```text
User Prompt
Expected Skill Behavior
Expected Output Shape
```

目标是让用户知道“装了以后能怎么用”。

### 4.5 推广素材

`docs/promotion-copy.md` 准备三档文案：

1. 50 字：适合 GitHub 简介、社交平台短帖。
2. 200 字：适合 X、即刻、V2EX。
3. 600 字：适合掘金、公众号、小红书技术笔记。

文案重点不要说“求 star”，而是说：

```text
我把自己平时约束 AI 写代码的流程沉淀成了一个 Codex skill。
它解决的是：AI 改太多、漏测、总结不清、任务不分级。
```

### 4.6 GitHub 仓库设置

需要配置：

- Repository description：`Codex skill for task grading, minimal-diff coding, validation, and concise handoff summaries.`
- Website：可以先不填。
- Social Preview：制作一张 1280x640 图片。
- Pinned repository：把该仓库 pin 到 GitHub Profile。
- Release：发布 `v1.0.0`。

### 4.7 推广渠道

优先渠道：

| 渠道 | 动作 | 目的 |
| --- | --- | --- |
| GitHub Profile | Pin 仓库 | 提高个人主页转化 |
| GitHub Topics | 配置关键词 | 提高自然发现 |
| V2EX | 发“我做了一个 Codex skill” | 获取开发者反馈 |
| 掘金 | 发长文介绍方法论 | 建立可信度 |
| 即刻 / X | 发短帖和截图 | 扩散 |
| Reddit / Hacker News | 谨慎发，强调实际案例 | 获取海外反馈 |
| Codex/AI 编程相关社群 | 分享具体使用场景 | 精准触达 |

节奏建议：

```text
第 1 天：完善 README、License、Examples、Topics
第 2 天：发 v1.0.0 Release，Pin 到 GitHub Profile
第 3 天：发中文长文
第 4-7 天：社群小范围分享，收集反馈
第 8-14 天：根据反馈发 v1.1.0
```

## 5. 测试方案

### 5.1 仓库可用性测试

检查项：

- `SKILL.md` frontmatter 包含 `name` 和 `description`。
- skill 名称只包含小写字母、数字和连字符。
- `agents/openai.yaml` 字段合法。
- `references/code-pact-execution-spec-v1.md` 可正常打开。
- README 中的安装路径和命令可执行。

### 5.2 安装测试

在本机模拟安装：

```powershell
Copy-Item -Recurse . "$env:USERPROFILE\.codex\skills\code-pact"
```

验证：

- 新会话能看到该 skill。
- 使用 `$code-pact` 能触发。
- 能按 L0/L1/L2/L3 输出不同流程。

### 5.3 示例测试

使用 `docs/examples.md` 中的 4 个示例逐个验证：

| 示例 | 预期 |
| --- | --- |
| L0 小改动 | 不输出复杂方案，不走 L2/L3 |
| L1 小功能 | 有 Task Card、影响分析、验证 |
| L2 模块任务 | 有简版方案和任务拆分 |
| Review | 输出 Conclusion / Blocker / Major / Minor / Next Step |

### 5.4 README 转化测试

找 3 个没有看过项目的人做快速测试：

```text
30 秒内能否说出这个仓库解决什么问题？
3 分钟内能否知道怎么安装？
是否能找到一个自己会使用的场景？
是否愿意 star 或收藏？
```

只要有 2 人以上看不懂，就修改 README 第一屏。

### 5.5 推广效果测试

上线后记录 14 天数据：

| 指标 | 目标 |
| --- | --- |
| GitHub stars | 第 1 周 10+，第 1 月 50+ |
| Repo views | 第 1 周 100+ |
| Unique visitors | 第 1 周 30+ |
| Clones | 第 1 周 5+ |
| Issues / Discussions | 第 1 月 3+ 有效反馈 |
| 外部链接点击 | 每个平台至少有点击 |

GitHub Traffic 数据只有仓库 owner 可见，每周固定记录一次。

## 6. 验收标准

### 6.1 P0 必须验收

- README 存在，且第一屏说明清楚定位、痛点、安装方式。
- LICENSE 存在。
- Topics 已配置。
- `SKILL.md` 可被 Codex skill 机制识别。
- 至少 4 个示例场景可跑通。
- 发布 `v1.0.0` Release。
- GitHub Profile 已 pin 仓库。

### 6.2 P1 建议验收

- Social Preview 已配置。
- `docs/promotion-copy.md` 已准备三档推广文案。
- 至少完成 2 个渠道发布。
- 收到至少 1 条真实反馈。
- README 根据反馈完成一次修改。

### 6.3 P2 可选验收

- 制作演示 GIF 或短视频。
- 增加英文 README。
- 增加 GitHub Actions 校验 skill 结构。
- 增加贡献指南。
- 建立 issue templates。

## 7. 风险与边界

1. **不要刷 star**：短期数据可能好看，但会伤害账号和项目可信度。
2. **不要过度包装**：skill 本体要保持轻量，复杂说明放到 docs。
3. **不要只发链接**：推广要讲真实场景，否则转化低。
4. **不要频繁改定位**：前 2 周只围绕“AI 编程协作流程”这个核心卖点。
5. **不要承诺万能**：明确它是协作规范 skill，不是自动修复所有代码问题。

## 8. 下一步执行清单

建议按顺序执行：

```text
1. 新增 README.md
2. 新增 LICENSE
3. 新增 docs/examples.md
4. 新增 docs/promotion-copy.md
5. 配置 GitHub description 和 topics
6. 配置 social preview
7. 发布 v1.0.0 Release
8. Pin 到 GitHub Profile
9. 发第一轮推广文案
10. 记录 7 天数据并迭代 README
```

## 9. 参考来源

- GitHub Docs: Best practices for repositories  
  https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories
- GitHub Docs: About READMEs  
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes
- GitHub Docs: Licensing a repository  
  https://docs.github.com/articles/licensing-a-repository
- GitHub Docs: Classifying your repository with topics  
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics
- GitHub Docs: Customizing your repository's social media preview  
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview
