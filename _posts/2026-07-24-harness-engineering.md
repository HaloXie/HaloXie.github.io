---
title: "Harness Engineering：AI Agent 时代的新工程范式"
description: "系统拆解 Harness Engineering 的核心理念、六大组件、OpenAI 百万行代码案例及战略启示"
date: 2026-07-24 15:14:59 +0800
categories: [AI]
tags: [harness-engineering, ai-agent, openai, codex, context-engineering]
image:
  path: /assets/img/harness-engineering/cover.png
toc: true
---

当大模型成为新引擎，企业真正竞争的，是驾驭它的"马具"——**Harness Engineering（驾驭工程）**正在成为 AI Agent 时代的新工程范式。本文系统拆解其核心理念、六大核心组件、OpenAI 标志性案例（3-7 名工程师、5 个月、约 100 万行代码、零手写）以及战略启示。

**受众：**AI 产品经理与工程团队

![cover](/assets/img/harness-engineering/cover.png)

# 一、概念定义：从"裸调 LLM"到"Harness Engineering"

## 1.1 什么是 Harness Engineering

**Harness Engineering**（驾驭工程）是一套围绕 AI Agent 搭建**可控、可验证、可观测运行外壳**的工程方法论。"Harness"一词源自马具——当一匹爆发力极强的烈马（AI 模型）出现时，人类需要为它设计缰绳、马鞍、护目镜、信号灯、仪表盘等整套驾驭系统，而不仅仅是"对它喊话"。

OpenAI 工程团队在 2026 年 2 月发布的《*Harness engineering: leveraging Codex in an agent-first world*》中正式使用了这一概念，并基于一项极限实验将其升格为系统化的工程范式。HashiCorp 联合创始人 Mitchell Hashimoto 在 2026 年 2 月 5 日将其概括为："**系统性地构建约束、工具、文档和反馈循环的学科，使 AI 编码 Agent 能够可靠地完成工作**"。

> OpenAI 工程师 Ryan Lopopolo："**当工程团队的主要工作不再是写代码，而是设计环境、指定意图、构建反馈循环时，Harness Engineering 就是这个问题的系统性答案。**"

理解这个概念的关键，是不要把以下几组术语混为一谈：

| 概念 | 本质 | 回答的问题 |
|---|---|---|
| Prompt Engineering | 文本工程 | 如何措辞才能让模型给出正确答案？ |
| Context Engineering | 信息工程 | 模型在做决策时能看到什么？ |
| Agent Harness | 技术实体 | 运行 Agent 的控制面板由哪些模块构成？ |
| **Harness Engineering** | **工程方法论** | **如何设计、构建、维护高可用的 Agent Harness？** |

## 1.2 关键技术溯源

- **概念源头：**Anthropic 在 2025 年 11 月—2026 年 3 月先后发布《*Effective Harnesses for Long-Running Agents*》与《*Harness Design for Long-Running Apps*》，从持久化、检查点、错误恢复、人工介入等维度提出系统性设计指导。

- **命名推广：**OpenAI 2026 年 2 月的"百万行零手写代码"实验将 Harness 理念升格为 Harness Engineering 完整体系。

- **工程化落地：**2026 年 3—4 月，SemaClaw、DeerFlow 2.0、Symphony 等开源框架陆续将 Harness Engineering 工程化。

## 1.3 裸调 LLM vs Harness Engineering

![compare](/assets/img/harness-engineering/compare.png)

**裸调 LLM**意味着直接把大模型 API 接进业务，所有"非推理"的事务（工具调用、记忆管理、上下文控制、错误恢复、安全审计）都需要业务方在调用层临时拼凑。结果往往是：演示很惊艳，落地一塌糊涂。

**Harness Engineering**把上述所有"非推理"事务当作一等公民来设计与工程化：

| 维度 | 裸调 LLM | Harness Engineering |
|---|---|---|
| 工具调用 | 临时拼装，失败率高（部分编辑工具失败率高达 50.7%） | 全生命周期管理，工具规格化、可观测 |
| 记忆 | 无状态或仅会话级 | 短期 + 长期 + 结构化三层记忆 |
| 上下文 | 窗口管理靠运气，"Lost in the Middle"性能损失 30%+ | 精准注入、压缩、检索增强 |
| 任务编排 | 单步推理或随机循环 | DAG 规划、子任务分解、多 Agent 协作 |
| 验证 | 无验证，结果直接交付 | 规则引擎 + 结构化测试 + 人工审批节点 |
| 可观测性 | 几乎没有 | Trace、日志、指标、端到端审计 |

**一句话总结：**模型是引擎，Harness 是驾驭它的框架。同样的引擎，没有 Harness 就是野马；有了 Harness，才能成为可靠的生产力。

# 二、六大核心组件

从能力维度看，一个生产可用的 Harness 至少需要六大核心组件协同工作。它们不是堆叠的功能，而是围绕 Agent 的**运行外壳**——任何一项缺失，Agent 都无法在企业环境稳定运行。

![six-components-v2](/assets/img/harness-engineering/six-components-v2.png)

## 2.1 工具层（Tools）

**定位：**把 Agent 的"手"延伸出去。工具层负责把模型无法原生完成的操作（读写文件、调外部 API、运行命令、操作数据库）封装成 Agent 可以调用的能力单元。

**典型实现：**

- **函数调用（Function Calling）：**OpenAI / Anthropic / Google 等模型原生支持的 JSON-Schema 工具调用。

- **MCP（Model Context Protocol）：**Anthropic 提出的开放协议，让 Agent 与工具之间形成标准化的"插拔式"连接。

- **外部 API / 系统接入：**业务系统、数据库、SaaS、文件系统、CI/CD 流水线。

**关键挑战：**工具规格的可读性与可校验性。Can Duruk 在 2026 年 2 月发现，主流通用编辑工具的失败率高达 **50.7%**（Grok 4 使用 patch 格式时），核心原因是工具契约对模型不友好。其解决方案 **Hashline**（行级内容哈希）让模型只需引用 2-3 字符的哈希标签即可精确编辑。

## 2.2 记忆层（Memory）

**定位：**让 Agent 拥有"持续学习"的能力。记忆层把"上下文"和"知识"区分对待，让 Agent 既能在一次会话内保持短期一致，也能在跨会话、跨任务时复用长期积累。

**典型实现：**

- **短期记忆：**当前会话的对话历史、工具调用结果、中间变量。

- **长期记忆：**向量库（pgvector、Pinecone、Chroma）、结构化记忆（用户偏好、决策日志、领域知识）。

- **知识沉淀：**把任务派生的洞察"外化"为用户可拥有、可检索的语料（如 SOUL.md、Agent Wiki）。

**关键挑战：**记忆的"垃圾回收"与"知识蒸馏"。Log-style 记忆只是存档，不构成知识；SemaClaw 提出的 **Knowledge Sedimentation（知识沉淀）**强调把任务经验结构化、外化为可复用的概念。

## 2.3 上下文管理（Context Management）

**定位：**给模型喂对的信息，而不是更多的信息。上下文管理是 Harness 中**投入产出比最高**的环节——优化它，往往能立刻看到能力跃升。

**典型实现：**

- **渐进式披露：**不把全部信息塞进 prompt，而是先给一个约 100 行的入口文件（如 AGENTS.md）作为"目录"，按需引导 Agent 去查阅 docs/。

- **压缩与摘要：**当对话或任务历史超过窗口阈值时，自动压缩为结构化摘要。

- **检索增强（RAG）：**基于任务动态检索相关知识、代码、历史决策。

**关键挑战：**"**Context Rot**"（上下文腐烂）。Stanford 的《Lost in the Middle》研究和 Chroma 的实验均表明，当关键内容落在上下文中间位置时，模型表现会下降 **30%+**。这正是 OpenAI 团队放弃"一万行 AGENTS.md"方案、转向"地图而非手册"（Map, Not Manual）的根本原因。

## 2.4 任务编排（Task Orchestration）

**定位：**把单一 Agent 升级为可处理复杂任务的"团队"。任务编排负责把用户目标分解为可并行/可串行的子任务，分配给合适的 Agent 或工具，并跟踪依赖与失败。

**典型实现：**

- **规划（Planning）：**ReAct、Plan-and-Execute、Chain-of-Thought 等。

- **子任务分解：**把大目标拆成 DAG（有向无环图）形式的子任务。

- **多 Agent 协作：**主 Agent 调度、专家 Agent 分工、Agent 互审（如 OpenAI 的 Agent-to-Agent Review）。

**关键挑战：**"伪编排"（Pseudo-orchestration）——名义上的编排器其实把所有推理都留在自己内部，没有产生可验证、可执行的任务图。SemaClaw 提出的 **DAG Teams** 用"LLM 生成 DAG + 确定性调度器执行"的两阶段方法解决这一难题。

## 2.5 验证过滤（Verification & Filtering）

**定位：**在 Agent 的输出和真实世界之间，设立一道"硬检查"关卡。验证过滤把 LLM 的**非确定性输出**约束在**确定性合约**之内，是企业级 Harness 与玩具 Agent 的根本分水岭。

**典型实现：**

- **规则引擎：**用确定性代码而非 prompt 来执行业务规则。

- **结构化测试：**架构模式、模块依赖、接口契约的自动化测试（非功能测试）。

- **人机协作（Human-in-the-Loop）：**高风险操作前强制暂停等待人工确认，对应企业财务"四眼原则"。

**关键挑战：**验证是"代码拥有的保证"而非"提示词主张的承诺"。SemaClaw 论文中的对照实验证明：仅靠 prompt 指令，违规响应会泄露给读者；只有由代码强制执行的检查才能完全阻止。

## 2.6 自我修正（Self-Correction）

**定位：**让 Harness 具备"从错误中学习"的能力。自我修正把"失败"重新定义为"系统缺少某项能力的诊断信号"，并通过反馈循环把一次性的修复沉淀为长期的结构性改进。

**典型实现：**

- **反馈循环：**Hook 监听用户纠正信号（"不要这样做""为什么总出这个问题"），自动写入"待办" buffer。

- **错误检测：**运行结构性测试 + 错误分类，识别 Agent 行为漂移。

- **迭代改进：**把反复出现的问题编码为 lint 规则、结构约束或 SOP，逐步收敛熵增。

**关键挑战：**Agent 会"复制仓库中现有的模式——包括坏模式"（OpenAI 团队观察）。这意味着 Harness 必须主动做"垃圾回收"——周期性运行专门 Agent 扫描矛盾、违规、技术债，提交清理 PR，而不是任由熵增累积。

**小结：**六大组件不是平行功能，而是一个**反馈闭环**——工具层提供手脚，记忆层提供大脑皮层，上下文管理提供当下视野，任务编排提供工作流，验证过滤提供质检，自我修正提供进化。

# 三、OpenAI 标志性案例：百万行代码的工程实践

![codex-case](/assets/img/harness-engineering/codex-case.png)

如果说 Harness Engineering 的理论体系在 2025 年由 Anthropic 奠基，那么让它真正进入行业视野的，是 OpenAI 2026 年 2 月发布的一项极限实验。

## 3.1 关键数据：5 个月、100 万行、0 手写

2025 年 8 月，OpenAI 内部一个由 **3 名工程师**组成的小团队（后期扩至 **7 人**）从空仓库起步，仅用 **5 个月**时间，在 **0 行手写代码**的前提下，借助 Codex Agent 交付了一款包含约 **100 万行**真实代码的 Beta 产品。

该实验的对外披露数据如下：

![chart_codex](/assets/img/harness-engineering/chart_codex.png)

| 指标 | 数值 |
|---|---|
| 团队规模 | 3 名起步 → 扩至 7 名 |
| 项目周期 | 5 个月（2025 年 8 月—2026 年 2 月） |
| 代码规模 | 约 100 万行（含应用逻辑、测试、CI、可观测性、文档） |
| 合并 PR 数 | 约 1,500 个 |
| 人均吞吐 | 3.5 个 PR / 工程师 / 天（且随团队扩大仍提升） |
| 单任务时长 | 单次 Codex 运行常达 **6+ 小时**（多在工程师休息期间） |
| 人均效率 | 3-10x 人类工程师当量 |
| 效率估计 | 约手写 1/10 的时间 |

**两个数字最值得深思：**

1. **3.5 个 PR/工程师/天**，大约是人类典型节奏的 5-10x。

2. **吞吐随团队扩大而上升**，这**颠覆了 Brooks's Law**（加人会拖慢项目）。原因是工程师的角色从"写代码"转为"驾驭 Agent + 维护 Harness"，加人不增加协调成本，反而带来更多对 Harness 的投资。

## 3.2 核心做法：把仓库变成 Agent 的"可读世界"

OpenAI 团队的核心洞察是：**"从 Agent 的视角看，如果运行时无法访问，等同于不存在。"**（From the agent's point of view, anything it can't access in-context while running effectively doesn't exist.）

因此，他们把 Harness 工程实践凝练为五条原则：

1. **Repo as System of Record（仓库即真相源）**——把 Slack 讨论、Google Doc 决策、脑海中的隐性知识，全部**外化为仓库内可版本化的产物**（markdown、schemas、executable plans）。

2. **Map, Not Manual（地图而非手册）**——**AGENTS.md** 文件保持约 100 行，作为入口地图指向更深的 docs/。试过"一文件包含一切"，结果是上下文被挤占、约束失效、文档腐烂。

3. **Mechanical Enforcement（机械执行）**——架构约束由**自定义 linter + 结构化测试**强制执行，而非靠文档劝导。Agent 写出违反架构的代码，CI 立即失败。linter 本身也是由 Codex 写成的。

4. **Agent Readability（Agent 可读性）**——优先选择"无聊但稳定"的技术栈（高训练数据覆盖率、稳定 API），避免冷门依赖。必要时为 Agent 重新实现一个聚焦子集，比包装一个晦涩的上游库更划算。

5. **Throughput Changes Merge Philosophy（吞吐改变合并哲学）**——Agent 数量远超人工关注度时，"fix-forward"（重跑修复）通常比"fix-perfect"（完美修复）划算。短 PR 生命周期、可重跑测试成为默认。

此外，OpenAI 团队还做了两件关键工程：

- **分层架构强制：**业务域内的依赖方向被锁死为 Types → Config → Repo → Service → Runtime → UI，跨层依赖直接被 linter 拦截。

- **可观测性作为 Agent 工具：**把 Chrome DevTools Protocol、Victoria Logs、Victoria Metrics 直接接入 Agent runtime，让 Agent 能像人类工程师一样查看 UI、查日志、查指标。

## 3.3 效果与启示：方法本身可被复制

需要客观看待的边界：

- 这是 **OpenAI 自报的单个实验**，greenfield 项目、零历史包袱。

- 100 万行本身不说明问题（"烂系统也能快速产生代码"），真正值得复制的是 **5 个月、1500 个 PR 中保持架构一致性**这件事。

- OpenAI 拥有对 Codex 产品的特权访问和影响力，外部团队复现效果需要更扎实的 Harness 投入。

但方法本身可迁移：

- **AGENTS.md 入口 + docs/ 真相源**的"地图模式"已被 Claude Code 的 CLAUDE.md 广泛沿用。

- **自定义 linter 机械执行架构**对所有规模团队都适用（Martin Fowler 已在 2026 年 4 月撰文推荐）。

- **Agent 互审代替人审**正在成为大型代码库的新常规（OpenAI 报告称 2025 年底全公司约 70% PR 由 AI 协助合并）。

该实验的产出物 **Symphony**（issue-tracker 驱动的 Agent 编排器）已于 2026 年 4 月开源，半年内 GitHub Stars 突破 2.5 万，部分内部团队落地后 PR 落地量提升 **5 倍**。

**诚实的反方观点：**如果你还在自己写大部分代码，或者项目是一个周末原型，**不要造 Harness**——那是过度工程。Harness Engineering 适用的场景是：Agent 每天在你的代码库开多个 PR。

# 四、战略启示：模型是商品，Harness 是护城河

![strategy](/assets/img/harness-engineering/strategy.png)

OpenAI 这场实验最深层的启示，不是"AI 能写 100 万行代码"，而是**护城河正在从模型层迁移到 Harness 层**。

## 4.1 差异化正在从模型层迁移到 Harness 层

LangChain 在 Terminal Bench 2.0 上的对照实验给出了最直白的证据：

![chart_harness](/assets/img/harness-engineering/chart_harness.png)

> 保持模型不变，**仅优化 Harness 配置**，编程 Agent 的 Terminal Bench 2.0 任务完成率从 **52.8%** 跃升至 **66.5%**——整整 **13.7 个百分点**的提升完全归因于 Harness 设计。

这意味着：

- 当你把 GPT-5 换成 Claude Opus 4.8，效果差距可能只是 2-3 个百分点；

- 但当你把"裸调 LLM"换成"成熟 Harness"，效果差距可能是 10+ 个百分点。

模型层的差异化正在快速收敛：

| 趋势 | 观察 |
|---|---|
| 能力趋同 | GPT-5、Claude Opus 4.8、Gemini 2.5 在主流 benchmark 上差距已小于 5% |
| 价格趋同 | 头部模型 API 价格阶梯压缩，token 成本下降曲线接近 |
| 切换成本下降 | Harness 设计良好的项目可秒级切换底层模型 |
| 训练数据趋同 | 公开互联网数据红利已被消化，闭源合成数据成为新变量 |

与此同时，**Harness 层的护城河却在加深**：

- **工具链沉淀：**自研的 MCP 工具、领域专用函数库

- **数据沉淀：**长期记忆、用户偏好、领域知识库

- **流程沉淀：**校验规则、回归测试、审批节点

- **反馈沉淀：**失败模式库、错误分类、修复 playbook

## 4.2 给 AI 产品团队的启示

对于今天的 AI 产品经理与工程团队，Harness Engineering 提出了五条可操作的行动建议：

1. **不要押注单一模型，而是押注 Harness 的可移植性。**把模型当作可替换的 commodity，把 Harness 当作可演进的资产。Claude Code 之所以被 Anthropic 称作"成熟的 Harness 工程范例"，正是因为它的显式 context lifecycle、持久状态隔离、hook 执行控制、增量技能加载，**对模型变化不敏感**。

2. **从"上下文工程"或"架构约束"等单一维度切入。**不要试图一次性建"完整的 Harness 体系"——从最痛的痛点（幻觉？越权？难复现？）出发，单点突破后再扩展。

3. **把"失败"重新定义为"系统缺少某项能力"。**当 Agent 出错时，问的不是"为什么 Agent 失败"，而是"Agent 缺少什么能力，我如何让这个能力可读、可验证"。这正是 OpenAI 团队反复强调的**能力补全**思路。

4. **把架构约束编码为机器可执行的规则。**文档会腐烂，linter 不会。把"模块依赖方向""错误处理规范"等翻译成结构性测试和自定义 linter，Agent 即便无人值守 6+ 小时也不会越界。

5. **建立"垃圾回收 Agent"作为长期机制。**每 1-2 周跑一次扫描型 Agent，识别架构漂移、文档矛盾、技术债，并提交清理 PR。让 Harness 自身具备进化能力。

**结语：**OpenAI 的 100 万行代码实验，本质上回答了一个问题——**当模型的边际能力趋同，谁能把 AI 安全、可控、可持续地转化为业务价值？**答案是 Harness Engineering。

2026 年的竞争不再是"谁的 Agent 更聪明"，而是"谁的 Harness 更完善"。把 Harness 当作一等公民来投资，是 AI 产品团队当下最高 ROI 的工程决策。

---

## 参考资料

- OpenAI. *Harness engineering: leveraging Codex in an agent-first world*. 2026-02. https://openai.com/index/harness-engineering/

- Anthropic. *Effective Harnesses for Long-Running Agents*. 2025-11.

- Anthropic. *Harness Design for Long-Running Apps*. 2026-03.

- Martin Fowler. *OpenAI's Harness Engineering Practice*. 2026-04.

- Tony Lee. *How OpenAI Built 1 Million Lines of Code Using Only Agents: 5 Harness Engineering Principles*. 2026. https://tonylee.im/en/blog/openai-harness-engineering-five-principles-codex/

- Mitchell Hashimoto. *Harness Engineering Definition*. 2026-02-05.

- Can Duruk. *I Improved 15 LLMs at Coding in One Afternoon (Hashline)*. 2026-02.

- LangChain. *Harness-only Optimization on Terminal Bench 2.0*. 2026.

- Stanford. *Lost in the Middle: How Language Models Use Long Contexts*.

- SemaClaw. *A Step Towards General-Purpose Personal AI Agents through Harness Engineering*. arXiv:2604.11548. 2026-04.
