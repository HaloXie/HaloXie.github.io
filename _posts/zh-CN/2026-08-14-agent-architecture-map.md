---
title: "Agent 为什么有这么多种：从大白话看懂 BDI、ReAct 和 Multi-Agent"
description: "从同一个技术研究 Agent 出发，用四个简单问题看懂经典 Agent、LLM Agent、BDI、ReAct 和 Multi-Agent"
date: 2026-08-14 18:50:00 +0800
lang: zh-CN
translation_status: pending
lang-exclusive: [zh-CN]
page_id: agent-architecture-map
permalink: /learn/agent-zero-to-one/agent-architecture-map/
redirect_from:
  - /posts/agent-architecture-map/
categories: [AI]
tags: [ai-agent, agent-architecture, bdi, multi-agent, llm-agent]
image:
  path: /assets/img/agent-architecture-map/cover.webp
  alt: "用行动依据、控制方式、决策机制和协作数量四个问题定位 Agent 架构"
toc: true
mermaid: true
---

第一次看到 BDI、Reactive、ReAct、Multi-Agent 时，不知道它们是什么意思很正常。这些词来自不同年代的论文和工程实践，本来就在回答不同问题。

这篇不会要求你先背名词。我们始终使用同一个例子：一个能够搜索资料、核对来源并写出报告的**技术研究 Agent**。

先想象它正在回答：“Pi Agent 的安全边界是什么？”它需要：

1. 读取问题；
2. 决定先搜索哪里；
3. 打开资料并记录发现；
4. 判断证据是否足够；
5. 继续搜索或输出报告。

前两篇文章已经回答了两个基础问题：

- [Chat、Workflow 还是 Agent？](/learn/agent-zero-to-one/chat-workflow-agent-guide/)：谁决定下一步？
- [Agent 不只一种](/learn/agent-zero-to-one/agent-patterns-with-pi/)：模型拿到了多少运行时决策权？

继续学习时，你会遇到 Reflex、Goal-based、BDI、Reactive、ReAct 和 Multi-Agent。最容易犯的错误，是把它们排成一条升级路线：

```text
Reactive → BDI → LLM Agent → Multi-Agent
```

这条线看起来直观，实际上混合了不同问题。它就像把“自动挡”“电动车”和“车队”排成同一种汽车等级：一个描述怎么控制，一个描述动力来源，一个描述有几辆车。

如果只记住一句话，请记住：

> **这些名词不是升级等级。同一个 Agent 可以同时属于其中好几类。**

先不要记英文，只记住四个问题：

| 问题 | 大白话 | 后面会遇到的词 |
|---|---|---|
| 它根据什么选择下一步？ | 看当前情况、记住过去、追目标，还是比较收益？ | Reflex、Goal-based、Utility-based |
| 它怎样组织判断过程？ | 立即反应、先规划，还是两者结合？ | Reactive、Deliberative、Hybrid、BDI |
| 谁在负责判断？ | 固定规则、搜索算法、LLM，还是共同负责？ | Rules、Algorithms、LLM、Mixed |
| 是一个 Agent 还是多个？ | 单人完成，还是像团队一样分工？ | Single Agent、Multi-Agent |

## 先别分类：Agent 到底在做什么

无论是扫地机器人、交易程序，还是会调用工具的 LLM Agent，都在重复同一个闭环：

- **环境（Environment）**：Agent 正在处理的外部世界，例如网页、代码仓库或用户问题；
- **感知（Perceive）**：读取环境中的新信息；
- **状态（State）**：记住已经知道什么、做到哪一步；
- **判断（Decide）**：选择下一步；
- **行动（Act）**：搜索、读取文件、调用 API 或输出答案。

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart LR
  E["环境 Environment"] --> P["感知 Perceive"]
  P --> D["状态与判断 Decide"]
  D --> A["行动 Act"]
  A --> E
```

技术研究 Agent 搜索文档是在行动；搜索结果是新的环境信息；读取结果并决定是否继续，就是下一轮判断。

[《Artificial Intelligence: A Modern Approach》](https://aima.cs.berkeley.edu/)（常简称 AIMA；配套开源实现：[aimacode/aima-python](https://github.com/aimacode/aima-python)）把 **Agent Function** 定义为“根据已经看到的信息，决定下一步行动的函数”。

书里还使用 **Rational Agent（理性 Agent）** 这个词。这里的“理性”不是聪明绝顶，而是：**在当前信息和限制下，选择最可能帮助自己完成目标的行动。**

“理性”不代表全知全能，也不代表结果永远正确。一个 Agent 可能因为信息不足而失败，但只要它在现有证据下作出了合理选择，仍然可以是 rational 的。

这套骨架是后面所有分类的共同底座。

## 问题一：它根据什么选择下一步

AIMA 常用五种教学模型解释行动依据。英文名字不需要背，先看每种方式在研究任务里会怎么做：

| 中文直觉 | 术语 | 研究 Agent 的例子 |
|---|---|---|
| 看到情况就按规则做 | Simple Reflex | 遇到 404 就换备用地址 |
| 记住当前世界是什么样 | Model-based | 记住哪些网页已经读过、哪些证据仍缺失 |
| 选择更接近目标的行动 | Goal-based | 为了回答版本问题，优先寻找 changelog（版本变更记录） |
| 比较哪个选择更划算 | Utility-based | 在可信度、时效、成本之间选择来源 |
| 根据反馈改变后续策略 | Learning | 多次误选来源后，调整检索或排序方式 |

这里的 **世界状态（World State）**，就是 Agent 对当前情况的内部记录。比如网页上的一条信息暂时看不见了，Agent 仍记得它刚才读到过。

**Utility（效用）** 也不是一个神秘算法，它只是把“什么结果更值得”说清楚。例如官方文档可信度高，但社区讨论可能更新；Agent 要在两者之间权衡。

这不是五个产品版本，也不是必须依次升级的成熟度等级。

一个技术研究 Agent 可以同时是：

- Goal-based：目标是回答研究问题；
- Utility-based：在时效、可信度和成本之间选择来源；
- Learning：根据评估结果调整后续检索策略。

还有一个常见误会：使用预训练模型，不自动等于 Learning Agent。这里的 learning 指系统会根据运行反馈改变后续行为，而不是“内部放了一个曾经训练过的模型”。

## 问题二：它是直接反应，还是先想清楚

前一节问的是“根据什么选动作”，这一节问的是“整个判断过程怎么安排”。文献里常把这种安排叫 **Architecture（架构）** 或 **Control Architecture（控制架构）**。

### 直接反应（Reactive）

Reactive 的意思是“对当前情况作反应”。它尽量让新信息直接触发行为，状态少、响应快。

例如，研究 Agent 发现网页打不开，就立刻换备用地址。这个局部动作不需要重新规划整篇报告。

Rodney Brooks 在 1991 年的论文 *Intelligence without representation* 中提出了具有代表性的**分层抑制（subsumption）**思路。大白话说，就是把多个简单行为分层：紧急的底层行为可以暂时覆盖高层计划。例如机器人快撞墙时，“先避障”可以覆盖“继续前进”。

这里还要直接分清两个相似说法：Simple Reflex 回答“它凭什么选择这个动作”，Reactive Architecture 回答“整个控制过程怎么组织”。两者经常同时出现，但不在同一条坐标上。

### 先思考和规划（Deliberative）

Deliberative 来自 deliberate，意思接近“慎重考虑”。这种 Agent 会先维护当前状态、目标或计划，再推演应该采取什么行动。

例如，研究 Agent 先列出“确认定义 → 查官方文档 → 找反例 → 写结论”的计划，再按计划推进。它能处理长任务，但要付出更多状态维护、搜索和规划成本。

### 两者组合（Hybrid）

Hybrid 就是“混合”。它把前两种方式组合起来：局部问题快速反应，整体任务继续按目标和计划推进。

生产中的 LLM Agent 经常也是 hybrid：

```text
确定性代码：权限检查、预算、超时、审批、写库
LLM 决策：拆解问题、选择工具、调整检索路径
```

不要把 Hybrid 理解成“同时调用多个模型”。它描述的是控制结构如何分层。

## BDI 是什么：给 Agent 准备三本小本子

**BDI 不是第五个问题，而是问题二里的一种内部组织模型。**名字来自三个英文单词的首字母：Belief、Desire、Intention。

可以把它理解成 Agent 面前放着三本小本子：

```text
Belief（认知本）       我目前认为哪些事情是真的
Desire（愿望本）       我希望完成哪些目标
Intention（当前任务）  我已经决定优先推进什么
```

例如，一个研究 Agent 可能有：

- **Belief**：官方文档支持结论 A，但缺少版本信息；
- **Desire**：找到版本证据、完成报告、控制调用成本；
- **Intention**：当前先核对 changelog，再决定是否保留结论 A。

Desire 和 Intention 最容易混淆。Agent 可以同时“想”完成很多目标，但当前只能承诺优先做其中一部分。Intention 能防止它每看到一个新线索就完全换方向。

BDI 通常偏向“先思考和规划”的 Deliberative 一侧，外层仍然可以增加 Reactive 规则，组成 Hybrid 系统。

它也不是简单地在 Prompt 中增加 `beliefs`、`desires`、`intentions` 三个标题。系统还必须回答：这些状态什么时候更新？多个目标冲突时选哪个？什么情况下放弃当前承诺？

## 问题三：规则、算法和 LLM，谁负责判断

同一个“先制定计划”的行为，可以由不同机制实现：

- 固定代码按照模板生成计划；
- 搜索算法从多个方案里寻找路径；
- LLM 阅读自然语言目标后生成计划；
- LLM 负责探索，确定性代码负责权限、预算和验收。

因此，**Planner（计划器）** 只是“负责产出计划的组件”，不等于 LLM，也不自动等于 Agent。

LLM 可以负责：

- 理解非结构化输入；
- 生成或修改计划；
- 选择工具与参数；
- 根据工具结果决定下一步；
- 把过程整理成人能读懂的答案。

但“调用了一次 LLM”不等于 LLM Agent。一次调用可能只是生成一段文字。要成为能持续工作的 Agent，它还需要环境输入、行动能力，以及“执行后读取结果，再决定下一步”的循环。

### ReAct：判断、行动、看结果，再判断

**ReAct = Reasoning（推理）+ Acting（行动）**。它描述的是这样一个循环：

```text
判断下一步 → 执行行动 → 读取真实结果 → 根据结果继续判断
```

例如，LLM 先决定读取 `package.json`；工具返回文件内容；LLM 发现这是 TypeScript 项目，于是再决定读取 `tsconfig.json`。

ReAct 和前面的 **Reactive Architecture** 只是拼写看起来接近，含义完全不同：

```text
ReAct              LLM 在“推理”和“行动”之间循环
Reactive Agent     当前情况快速触发行为的经典控制架构
```

## 问题四：一个 Agent，还是一支 Agent 小队

**Multi-Agent（多 Agent 系统）** 回答的不是“单个 Agent 怎么思考”，而是：系统里有几个能够相对独立选择行动的 Agent，它们怎样通信、分工和协调？

可以把它类比成一个团队。只有一个研究员独立完成任务，是 Single Agent；一个负责人把任务分给资料检索员、事实核验员和报告编辑，就是 Multi-Agent。

**拓扑（Topology）** 在这里就是“团队怎么组织”。常见方式包括：

- **Single Agent**：一个 Agent 持有目标并完成循环；
- **Supervisor–Workers**：一个监督者拆任务，多个执行者分别完成；
- **Peer**：多个相对平等的 Agent 交换结果；
- **Hierarchical**：像公司层级一样，多层分配和汇总。

Multi-Agent 不自动更聪明。它增加了并行和专业分工，也增加了通信、状态同步、冲突解决、成本和验收难度。

同样，多个 Prompt、多个模型调用，或者“Planner 产出计划、Executor 固定执行计划”的流水线，也不自动等于 Multi-Agent。至少要确认这些单元是否拥有相对独立的状态、目标、行动能力和协调过程。

## 现在，用四个问题描述同一个 Agent

回到开头的技术研究 Agent。不要急着写代码，先用自然语言回答：

| 问题 | 这个研究 Agent 的答案 |
|---|---|
| 根据什么选择行动？ | 追求完成研究目标，并比较来源质量、时效和成本 |
| 怎样组织判断？ | 整体任务会规划，局部错误会快速处理，因此是 Hybrid |
| 谁负责判断？ | LLM 负责探索，代码负责权限、预算和验收 |
| 有几个 Agent？ | 第一版只有一个，避免过早增加协调成本 |

压缩成一行就是：**目标与来源权衡 / 混合控制 / LLM 与代码共同决策 / 单 Agent**。

理解自然语言后，再看 TypeScript。下面不是行业标准，只是后续课程使用的“架构坐标卡”。`mentalModel` 是可选字段，因为 BDI 可以放在 Hybrid 系统内部，两者不是二选一：

```ts
type ActionBasis =
  | "reflex"
  | "model-based"
  | "goal-based"
  | "utility-based"
  | "learning";

type ControlArchitecture =
  | "reactive"
  | "deliberative"
  | "hybrid";

interface ControlDesign {
  architecture: ControlArchitecture;
  mentalModel?: "bdi";
}

type DecisionMechanism =
  | "rules"
  | "algorithms"
  | "llm"
  | "mixed";

type TeamTopology =
  | "single"
  | "supervisor-workers"
  | "peer"
  | "hierarchical";

interface AgentArchitectureCard {
  actionBasis: ActionBasis[];
  control: ControlDesign;
  mechanism: DecisionMechanism;
  topology: TeamTopology;
}
```

我们的最终项目“证据优先的技术研究 Agent”第一版会这样定位：

```ts
const researchAgent: AgentArchitectureCard = {
  actionBasis: ["goal-based", "utility-based"],
  control: { architecture: "hybrid" },
  mechanism: "mixed",
  topology: "single",
};
```

它以完成研究问题为目标；根据来源质量和成本作选择；让 LLM 负责探索，让确定性代码负责权限、预算和验收；第一版先使用 Single Agent，避免过早引入协调成本。

Pi 在这里是什么？**Harness（运行底座）**负责承载模型调用、执行后读取结果再决定下一步的循环、Tool（工具）执行、状态和运行边界。Pi 决定 Agent **怎么跑**，不决定它**是哪类 Agent**。

用前面的汽车类比，Pi 更像底盘和测试台，不是驱动方式，也不是车队组织。同一个 Pi Runtime（运行时）可以承载不同的工具、控制边界和组织方式。

## 最后，只带走四个问题

以后再看到一个 Agent 系统，不要先问“它属于哪一种 Agent”，而是连续问四个问题：

1. 它凭什么选择行动？
2. 内部判断过程怎么组织？
3. 规则、算法和 LLM，谁承担主要决策？
4. 系统里有几个独立 Agent，它们怎么协作？

一个系统同时拥有四组答案，是正常现象，不是分类冲突。

下一阶段会进入 LLM Runtime（运行时）：先拆开一次模型调用，再逐步加入 Message（消息）、Context（上下文）、流式输出、状态和停止条件。等底层机制清楚后，我们再实现 ReAct、先规划再执行（Plan-and-Execute）、完成后复盘（Reflection）和 Multi-Agent，避免只记住架构名，却不知道它们在代码里改变了什么。

## 名词速查

| 名词 | 一句话解释 |
|---|---|
| Reflex | 看到当前情况，直接按规则行动 |
| Goal-based | 选择更接近目标的行动 |
| Utility-based | 在多个可行结果里选择更值得的一个 |
| Reactive | 当前情况快速触发行为的控制方式 |
| Deliberative | 先维护状态和计划，再选择行动 |
| Hybrid | 把快速反应和长期规划组合起来 |
| BDI | 用事实、愿望和当前承诺组织内部状态 |
| ReAct | LLM 在推理、行动和读取结果之间循环 |
| Multi-Agent | 多个相对独立的 Agent 分工与协调 |
| Runtime | Agent 真正运行时使用的模型、状态、工具和控制过程 |

## 参考资料

- Russell & Norvig, [Artificial Intelligence: A Modern Approach](https://aima.cs.berkeley.edu/), Chapter 2：Agent、rationality 与行动依据分类。
- Wooldridge & Jennings, [Intelligent Agents: Theory and Practice](https://doi.org/10.1017/S0269888900008122)：经典 Agent 理论、架构和语言。
- Brooks, [Intelligence without representation](https://doi.org/10.1016/0004-3702(91)90053-M)：Reactive 与 subsumption 思路。
- Rao & Georgeff, [BDI Agents: From Theory to Practice](https://cdn.aaai.org/ICMAS/1995/ICMAS95-042.pdf)：Belief、Desire、Intention 与承诺机制。
- Wooldridge, [An Introduction to MultiAgent Systems](https://www.cs.ox.ac.uk/people/michael.wooldridge/pubs/imas/IMAS2e.html)：Multi-Agent 的交互与协调。
- Yao et al., [ReAct: Synergizing Reasoning and Acting in Language Models](https://openreview.net/forum?id=WE_vluYUL-X)：LLM 中 reasoning 与 acting 的交替模式。
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)：Workflow、Agent 与现代工程模式。

本文中的四坐标卡、示例和关系图均为教学整理，不是对上述来源图表的翻译或复刻。
