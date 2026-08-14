---
title: "Agent 不只一种：从软路由、工具自动匹配到自主循环，再用 Pi 跑起最小 Agent"
description: "拆解 Agent 的决策权光谱，并使用 Pi CLI、SDK 和 Extension 构建以只读工具为起点的最小 Agent"
date: 2026-08-13 20:10:00 +0800
lang: zh-CN
page_id: agent-patterns-with-pi
permalink: /posts/agent-patterns-with-pi/
categories: [AI]
tags: [ai-agent, pi, tool-calling, routing, agent-loop]
image:
  path: /assets/img/agent-patterns-with-pi/cover.webp
toc: true
---

上一篇[《Chat、Workflow 还是 Agent？》](/posts/chat-workflow-agent-guide/)用“谁决定下一步”区分了三种系统。这篇继续往 Agent 内部走一步。

当人们说“我们做了一个 Agent”，它可能只是根据问题切换 Prompt，也可能会自动选择工具、循环执行，甚至把任务派给其他 Agent。这些形态拥有的决策权并不相同。

本文使用下面这条工程光谱来解释它们：

```text
Prompt Routing
→ 软路由
→ 工具自动匹配
→ 受约束 Agent Loop
→ Planner / Executor
→ Multi-Agent
```

这不是任何框架的官方分级，也不是行业成熟度标准，而是一个帮助我们定位**模型到底决定了什么**的教学分类。

## 五个问题，看清一个 Agent 的实际自主度

![Agent 的形态取决于模型获得了哪些运行时决策权，而不是角色名称或 Agent 数量](/assets/img/agent-patterns-with-pi/agent-decision-spectrum.webp)

看到一个 Agent 系统时，可以连续问五个问题：

| 决策轴 | 要问的问题 |
|---|---|
| 能力选择 | 谁决定加载哪个 Prompt、Skill 或专业 Agent？ |
| 工具选择 | 谁决定调用哪个工具和参数？ |
| 步骤规划 | 谁决定下一步做什么？ |
| 失败恢复 | 谁决定重试、换工具或换策略？ |
| 结束判断 | 谁决定任务已经完成？ |

前两项常见于“看起来很智能”的路由系统。后三项才真正把系统带进持续 Agent Loop。

自主度也不是越高越好。权限、支付和数据删除等动作通常应该保留在固定流程和人工门禁中，而不是为了“更 Agent”全部交给模型。

## 形态 0：Persona / Prompt Routing

最简单的做法是根据输入切换 Prompt：

```text
代码问题 → “你是资深工程师”
合同问题 → “你是法务助手”
营销问题 → “你是内容策划”
```

如果路由完成后，系统只是生成一次回答，那么它更准确的名字是 **Prompt Routing** 或 **Persona Routing**。

它适合隔离领域上下文、输出风格和少量规则，但“换了一顶帽子”并不会自动带来工具、状态、失败恢复和执行循环。多个角色 Prompt 也不等于 Multi-Agent。

## 形态 1：Agent 软路由

本文把下面这种做法称为**软路由**：程序只提供候选能力及其描述，由模型根据语义选择当前应该加载哪一个。

```text
硬路由：if (type === "math") loadMathSolver()
软路由：模型阅读候选能力描述，自行选择最匹配的一项
```

“软路由”在这里是教学术语，不是 Pi 或其他框架的官方名词。

被选择的对象可能是：

- 一段 Prompt；
- 一个 Skill 或 Ability；
- 一组上下文资料；
- 一个专业 Agent；
- 一种模型或推理档位。

软路由能处理规则难以穷举的模糊意图，也方便新增能力。但它会带来新的工程问题：候选描述重叠时会误选；候选太多会挤占上下文；相同输入未必每次得到相同路由；错误选择还可能在后续执行中被放大。

因此，软路由的关键不是写一句“请自动选择最佳 Agent”，而是让候选边界互斥、记录选择证据，并给高风险类别保留硬门禁。

## 形态 2：工具自动匹配

![Prompt、Skill、Tool 和 Agent 是不同的匹配层，自动选择其中一层不等于获得全部 Agent 能力](/assets/img/agent-patterns-with-pi/routing-layers.webp)

Function Calling 常把每个工具描述成四部分：

```text
name + description + parameters + result
```

模型阅读工具描述，根据当前目标决定是否调用、调用哪个，以及参数是什么。例如：

- `read_file`：读取一个文件；
- `search_docs`：检索文档；
- `get_weather`：查询指定地点天气。

这叫工具自动匹配，但它是否构成 Agent，取决于匹配之后发生什么：

```text
模型选一次工具 → 程序拿结果直接结束
≈ 会调用工具的单轮应用

模型选工具 → 观察结果 → 再选工具或结束
≈ Agent Loop
```

工具越多并不等于能力越强。描述相近、参数模糊的工具会让选择更差。一个好工具应该边界清楚、结果可理解、错误语义明确，并尽量只完成一个完整问题。

## 形态 3：受约束 Agent Loop

Agent 最核心的结构，是一个由观察驱动的循环：

```text
Observe → Decide → Act → Observe
                    ↘ Done / Escalate
```

模型不是一次性猜完整流程，而是在每个动作之后读取真实结果，再决定继续、改变策略或结束。例如，它读取 `package.json` 后发现是 TypeScript 项目，接着查 `tsconfig.json`；再从脚本中找到测试入口；证据足够后停止。

生产系统中的“自主”应该是受约束的。至少要定义：

- 工具 allowlist；
- 最大运行时间、轮数或费用；
- 哪些动作必须人工批准；
- 明确的完成条件；
- 无进展、重复调用和异常的检测；
- 可回放的输入、工具调用、结果与最终结论。

Agent Loop 不等于 `while (true)`。没有停止条件和预算的循环，只是一个失控风险。

## 形态 4：Planner、Executor 与 Evaluator

复杂任务常被拆成不同角色：

```text
Planner 制定计划 → Executor 执行 → Evaluator 验收
```

角色分离有三个实际价值：减少单个上下文的负担、让执行过程更聚焦，以及避免执行者完全依靠自评验收。

但固定的 Planner → Executor → Evaluator 顺序仍然可能只是 Workflow。只有当这些角色能根据真实结果更新计划、退回重做或重新拆分任务时，系统才增加了运行时自主性。

角色名称不决定架构，实际决策权才决定。

## 形态 5：Multi-Agent

Multi-Agent 常见三种拓扑：

- Supervisor 把任务派给多个 Worker；
- 多个 Specialist 分别处理安全、代码、数据等领域；
- Peer / Swarm 互相交换结果并协作收敛。

它适合任务确实可并行、上下文可以隔离、输出容易合并的情况。否则，协调成本可能大于收益：多个 Agent 重复读取背景、结论互相冲突、错误来源难追踪，token 成本也会快速增加。

所以 Multi-Agent 不是 Agent 的“最终形态”。很多任务用一个 Agent、少量好工具和明确验收就够了。

## 为什么用 Pi 展示最小 Agent

Pi 将自己定位为 **minimal terminal coding harness**。本文示例基于 `earendil-works/pi` 的 `@earendil-works/pi-coding-agent` **v0.84.1**；该版本要求 **Node.js >= 22.19.0**。版本和接口会变化，实际使用时应以项目当前文档为准。

Pi 适合教学，是因为它把最小组成暴露得很清楚：

- 默认给模型 `read`、`write`、`edit`、`bash` 四个内置工具；
- 支持交互、print / JSON、RPC 和 SDK；
- TypeScript Extension 可以注册自定义工具；
- 核心刻意不内置 sub-agent、plan mode 等完整工作流，这些能力交给 Extension 或 Package。

这让我们能直接看到：

```text
模型 + 指令 + 工具 + 工具结果回传 + 循环 = 最小 Agent
```

但要注意一个安全事实：**Pi 默认不是一个完整的操作系统权限沙箱。** 工具在当前机器和进程权限下运行，Extension 也能执行任意代码。`--tools` 是工具可见性控制，不是容器隔离或系统级权限边界。只安装可信来源，处理陌生项目时应结合项目 trust、容器、低权限账户或其他外部隔离。

## 实践一：一条命令启动只读 Agent

先安装：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent@0.84.1
```

配置模型凭据后，在一个准备分析的项目目录运行：

```bash
pi --tools read,grep,find,ls -p \
  "阅读这个项目，判断它使用什么技术栈，并列出支撑结论的证据文件。不要修改任何文件。"
```

这里没有告诉模型具体读取哪些文件。模型需要自己选择 `find`、`read`、`grep` 或 `ls`，观察结果，判断信息是否足够，再生成结论。

这已经是一个最小 Agent Loop：人给目标和边界，模型决定读取路径。

为什么先用只读工具？因为默认的 `write`、`edit` 和 `bash` 会扩大副作用。学习 Agent 时，先观察决策循环，比一开始就授予修改和命令执行权更容易调试。

如果项目目录包含本地 Pi 配置、Extension 或 Skill，先确认 trust 提示。非交互模式不会弹出确认，应根据需要显式使用 `--approve` 或 `--no-approve`，不要把信任决策藏在脚本默认值里。

## 实践二：用 Pi SDK 嵌入一个最小 Agent

安装同一个包后，可以在 Node/TypeScript 程序中创建内存 Session：

```ts
import {
  createAgentSession,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({
  modelRuntime,
  sessionManager: SessionManager.inMemory(),
  tools: ["read"],
});

session.subscribe((event) => {
  if (
    event.type === "message_update" &&
    event.assistantMessageEvent.type === "text_delta"
  ) {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt(
  "读取 package.json，解释项目的入口和脚本。只报告文件中能验证的事实。",
);

session.dispose();
```

这段代码做了四件事：创建模型运行时、创建不落盘的 Session、只暴露 `read` 工具、把目标交给 Agent。`session.prompt()` 会等待本次运行完成，包括其中的工具调用和后续模型轮次。

示例刻意没有开放 `bash`、`edit` 和 `write`。等你能稳定观察工具选择、错误和结束行为后，再按任务逐项增加权限。

## 实践三：注册一个无副作用的自定义工具

Pi Extension 可以通过 `pi.registerTool()` 注册模型可见的工具。下面的工具只统计输入文本中的 TODO，不访问网络，也不写文件：

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "count_todos",
    label: "Count TODOs",
    description: "Count standalone TODO markers in a provided text block.",
    parameters: Type.Object({
      text: Type.String({ description: "Text to inspect" }),
    }),
    async execute(_id, { text }) {
      const count = text.match(/\bTODO\b/g)?.length ?? 0;
      return {
        content: [{ type: "text", text: `TODO count: ${count}` }],
        details: { count },
      };
    },
  });
}
```

保存为 `./count-todos.ts` 后进行一次临时测试：

```bash
pi --extension ./count-todos.ts --tools count_todos -p \
  "请精确统计这段文字中的 TODO：TODO fix parser. Note only. TODO add test."
```

再测试一个不应该调用它的问题：

```bash
pi --extension ./count-todos.ts --tools count_todos -p \
  "解释什么是技术债，不需要统计任何内容。"
```

模型是否调用工具会受模型、Prompt 和上下文影响，不能把某次演示结果当成稳定契约。真正的工具匹配测试应该同时包含“应该调用”“不应该调用”“参数不完整”三类用例。

Extension 以当前进程权限执行；不要运行来源不明的 Extension，也不要把 API Key 写进代码或命令历史。

## 最小 Demo 距离生产系统还有多远

![Pi 的最小 Agent Loop 把目标、模型、工具调用、工具结果和结束判断连成闭环](/assets/img/agent-patterns-with-pi/pi-minimal-loop.webp)

上面的示例证明了循环能工作，但还不能证明它适合生产：

```text
Demo
  = 目标 + 工具 + 循环

可用系统
  = Demo
  + 权限与隔离
  + 成本和时间预算
  + 状态与可恢复性
  + 日志和可观测性
  + 结果验证
  + 人工审批与停止机制
```

当 Agent 开始写文件、运行命令、发送消息或操作业务数据时，外层 Harness 才是主要工程量。它要保证模型即使判断失误，也不能越过系统边界。

这正是[Harness Engineering](/posts/harness-engineering/)要解决的问题。而当你开始用 Skill 描述流程、又发现流程不足以承载稳定判断时，可以继续读[《Skill 让 AI 会做事，Ability 让 AI 会判断》](/posts/from-skills-to-abilities/)。

## 最后：先做一个边界清楚的 Agent

一个可靠的起点不是 Supervisor 加五个专家，而是：

```text
1 个 Agent
→ 2–4 个边界清楚的只读工具
→ 5–10 个真实任务测试
→ 记录误选、漏选、重复调用和错误结束
→ 再决定是否需要软路由或 Multi-Agent
```

先让一个小循环可理解、可观察、可停止。只有当单 Agent 的上下文、能力或并行性真的成为瓶颈时，再增加新的路由层和协调者。

如果你还没确定某个业务应该用 Chat、Workflow 还是 Agent，先回到上一篇的[场景选择指南](/posts/chat-workflow-agent-guide/)。架构的第一步不是搭 Agent，而是确认哪里真的存在值得交给模型的不确定性。

## 参考资料

- `earendil-works/pi`, `packages/coding-agent/README.md`, v0.84.1.
- `earendil-works/pi`, `packages/coding-agent/docs/sdk.md`, v0.84.1.
- `earendil-works/pi`, `packages/coding-agent/docs/extensions.md`, v0.84.1.
- `earendil-works/pi`, `packages/coding-agent/docs/security.md`, v0.84.1.
