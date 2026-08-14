---
title: "Skill 让 AI 会做事，Ability 让 AI 会判断"
description: "从 Skill 到 Ability 的工程演进：如何让 AI 稳定继承一类判断，而不只是按步骤执行"
date: 2026-07-03 18:53:55 +0800
lang: zh-CN
page_id: from-skills-to-abilities
permalink: /posts/general/from-skills-to-abilities/
redirect_from:
  - /posts/from-skills-to-abilities/
categories: [AI]
tags: [ai-agent, ability, skill, cognitive-architecture, acp, harness-engineering]
image:
  path: /assets/img/from-skills-to-abilities/ability-hero.webp
toc: true
---

> 项目仓库：`https://github.com/cognirail/from-skills-to-abilities`
>
> 这篇文章不是在宣布一个行业标准。
> 它只是记录我最近在做个人 AI 工具体系时，一个越来越强烈的工程判断：**只给 AI 写更大的 skill，不会自然得到更稳定的判断。**

## 先说结论

如果用一句话概括：

```text
Skill 解决的是：遇到一个任务，AI 应该怎么做。
Ability 解决的是：面对一类问题，AI 应该怎么判断。
```

这两个东西看起来很像，但长期维护起来差别很大。

我现在更愿意把这件事看成一条演进链：

```text
Tool → Skill → Ability → Cognitive Architecture
```

![从 Tool、Skill、Ability 到 Cognitive Architecture 的能力演进阶梯](/assets/img/from-skills-to-abilities/evolution.webp)

| 层级 | 解决的问题 | 典型失效 | 落地形态 |
|---|---|---|---|
| Tool | 让 AI 能调用外部能力 | 会调用，但不知道何时该调用 | 函数 / MCP |
| Skill | 让 AI 能按步骤完成任务 | 步骤走完了，结果却不对 | `SKILL.md` |
| Ability | 让 AI 能继承稳定判断 | 判断对了，但能力之间互相覆盖 | `ABILITY.md` + references |
| Cognitive Architecture | 让 abilities、memory、rules、tools 在一个系统里协同 | 能力越多，上下文预算越紧，指令互相衰减 | runtime + 调度层 |

这篇文章主要讲中间这一跳：为什么从 Skill 走到 Ability。

刚开始用 AI 写代码、写文档、跑流程的时候，我也会自然地把所有东西都写成 skill：遇到 code review，按这些步骤；遇到调研，按这些步骤；遇到项目交付，按这些步骤。

这当然有用。
但用久之后，会出现一个很明显的问题：

**AI 会按步骤做事，但不一定知道什么是好，什么是坏，为什么。**

于是 skill 越写越大，里面开始塞规则、塞风格、塞范例、塞 checklist、塞历史教训。最后它不再只是一个流程，而变成一个混合体：一半是 procedure，一半是 judgment，一半是 knowledge。

是的，这里有三个"一半"。这就是问题。

## 这篇适合谁看

如果你只是偶尔让 AI 写点代码，这篇可能有点重。

但如果你遇到过下面这些问题，应该会有共鸣：

- 你写了很多 Claude / Codex / Cursor rules，但 AI 还是经常忘。
- 你给 AI 写了 skill，它能执行步骤，但写出来的东西不像你的 reviewer 风格。
- 你在团队里推广 AI coding，发现新人和 AI 一样，都缺少判断框架。
- 你开始把 prompt、rules、knowledge、examples 分文件维护，但每次调用都靠临时拼上下文。
- 你觉得多 agent / 多 persona / 多 routing 很热闹，但长期任务里并没有显著变稳。

我不是想解决所有 agent 问题。
我只想先解决一个更小、更具体的问题：

**如何让 AI 稳定继承一类判断。**

## Skill 的边界

我对 skill 的理解很朴素：

```text
Skill = procedure
```

它回答的是：

```text
遇到 X，按什么步骤做？
```

比如：

- 生成一份代码 review。
- 根据会议记录写总结。
- 拉取数据并生成报表。
- 按流程完成一次需求交付。

这些都非常适合 skill。因为它们有明显的入口、步骤、输出和验收。

但有些东西不是步骤。

比如"写出像我一样的代码"。
这不是一个流程问题。你不能只告诉 AI：

```text
1. 先读需求
2. 再写代码
3. 最后跑测试
```

这样它当然会写，但写出来不一定像你的代码。

真正决定"像不像"的，是一组更隐性的判断：

- 什么情况下应该最小改动，什么情况下应该重构。
- Controller 只做协议层，Service 才放业务逻辑。
- 外部输入应该先用 `unknown` 接住，再用 type guard 收窄。
- 默认值应该用 `??`，不能用 `||` 吞掉 `0`、`''`、`false`。
- 错误要保留 Error 对象和控制流语义，不能空 catch。
- 方法应该封装一个完整问题，不要返回裸 ID 让调用方二次查询。

这些不是"步骤"。
这些是"判断"。

于是我开始意识到：有一类能力不应该继续塞进 skill 里。

## Ability 是什么

我现在把它叫 Ability。

不是因为这个词更高级，而是因为它和 skill 的抽象层确实不一样。

```text
Skill  回答：怎么做？
Ability 回答：我会什么？
```

更工程一点的定义是：

```text
Ability = 认知入口 + 判断框架 + source routing + 上下文化 + 验收契约
```

![Ability 把认知入口、判断框架、来源路由、上下文化和验收契约组成一个认知闭包](/assets/img/from-skills-to-abilities/cognitive-closure.webp)

这句话有点抽象，拆开就是：

| 组成 | 作用 |
|---|---|
| 认知入口 | 这类问题应该加载哪个能力 |
| 判断框架 | 什么是 good，什么是 bad，为什么 |
| source routing | 需要回源读哪些 rules / knowledge / checklist |
| 上下文化 | 同一条规则在这个能力场景下意味着什么 |
| 验收契约 | 怎么证明这次判断真的被遵守 |

这和"更大的 skill"不一样。

更大的 skill 往往是把更多步骤塞进去。
Ability 则是把一类判断内聚起来。

## 一个具体例子：code-style-core

我现在第一个真正成型的 ability 叫 `code-style-core`。

它的目标很简单：让 AI 写出更接近我 reviewer 风格的 Node/TypeScript 后端代码。

它不是教学文档，也不是 Node.js 入门教程。
它更像一份"风格合同"：

```text
Good:
  外部输入 unknown + type guard 收窄
  ?? 保留合法零值
  Controller 只做协议层
  Service 封装完整问题
  错误保留 Error 对象和控制流语义

Bad:
  any 逃逸
  || 吞 0 / '' / false
  Controller 拼业务分支
  方法返回裸 ID 让调用方二次查询
  空 catch 或 `${error}` 丢 stack
```

这不是为了让 AI 背规则。

真正的目标是：当 AI 面对一个具体改动时，它能先问自己：

```text
这次改动的最小问题是什么？
复合逻辑应该归属在哪个方法？
返回契约是否足够下游使用？
错误语义有没有变化？
有没有新增 any / as / || / process.env？
我跑了什么验证？
```

这才是 reviewer 风格。

写代码只是结果，判断顺序才是能力。

## 它和"员工蒸馏"/ Expert Judgment Distillation 有什么关系

写到这里，其实很容易想到前一阵很火的"员工蒸馏"。

这个直觉是对的。
`code-style-core` 本质上就是一次很小范围的员工蒸馏：把我作为 reviewer 的隐性判断提取出来，让 AI 在写 Node/TypeScript 后端代码时可以继承一部分。

但我不想把 Ability 直接等同于员工蒸馏。

很多员工蒸馏最后会停在：

- 访谈纪要
- SOP
- prompt
- 人设卡
- 经验库
- checklist

这些都可以有价值，但它们还不一定是 agent 能稳定加载的能力。

我现在更愿意这样区分：

```text
员工蒸馏 = 提取人的隐性经验和判断。
Ability = 把这类判断封装成 AI 可加载、可验证、可演进的认知能力包。
```

也就是说，员工蒸馏更像输入方法，Ability 更像工程封装。

如果只把我的经验写成一段 prompt，它可能会变成"像明昊一样写代码"的人设模拟。
但如果把它做成 Ability，它就必须继续回答：

```text
什么时候加载？
判断标准是什么？
要回源读哪些文件？
怎么证明它真的生效？
失败时降级到哪里？
```

这也是我觉得它有意义的地方。

它不是把一个人神秘化，也不是把经验包装成口号。
它是把一类原本只存在于 review 习惯里的判断，压缩成 agent runtime 可以使用的 contract。

## 为什么不是多 agent

这里很容易和另一个流行方向混在一起：多 agent。

多 agent 当然有价值。我也在用。
但多 agent 解决的是另一个问题：

```text
把任务拆给不同角色 / 不同视角 / 不同执行器。
```

它不自动解决判断稳定性。

很多所谓 agent，本质上是 persona/template + routing：

```text
你现在是安全专家
你现在是架构师
你现在是测试工程师
```

这在短任务里有效。
但长上下文里，模型会遇到指令衰减。它不是只忘掉不重要的指令，而是整体遵循度一起下降。

所以我现在更关心的不是"有多少个 agent"，而是：

```text
关键判断有没有被压缩成一个可加载、可验证、可降级的认知闭包？
```

这就是 Ability 和 prompt routing 的区别。

## Ability 的文件形态

在这个 repo 的最小公开示例里，结构大概是这样：

```text
examples/code-style-core/
  ABILITY.md
  references/
    source-routing.md
    style-contract.md
    validation-contract.md
    degradation.md
  agents/
    openai.yaml
```

一个 ability package 不是单文件 prompt，而是一个小包：

```text
abilities/<ability-name>/
  ABILITY.md
  references/
    source-routing.md
    source-specific-context.md
    validation-contract.md
    degradation.md
  agents/
    openai.yaml
```

这个 repo 目前保留完整最小闭环；完整内部包可以继续增加 framework conventions、project rules、validated lessons、review checklists 和更多 cross-platform adapters。

`ABILITY.md` 不负责塞满所有知识。
它负责声明：

- 这个 ability 的 concern 是什么。
- 什么时候用，什么时候不用。
- 核心判断是什么。
- 需要读哪些 references。
- 怎么验证。
- 如何跨平台投射。

这点很重要。

如果一个文件把所有规则都复制一遍，它很快会变成新的垃圾场。
Ability 应该引用外部 source of truth，然后补"在这个能力里，这条规则意味着什么"。

## 为什么不是直接堆知识库和 checklist

这里还有一个容易混淆的点：

如果我已经有 rules、knowledge、memory、checklist，为什么还需要 ability？

我的理解是，它们回答的问题不一样。

```text
Knowledge / memory 回答：我知道什么。
Rules 回答：哪些约束必须遵守。
Checklist 回答：我要检查什么。
Skill 回答：遇到任务我该怎么做。
Ability 回答：面对这类问题我该怎么判断。
```

知识库和 checklist 都很重要。
但它们自己不会自动形成判断。

比如我可以在知识库里记录：

```text
默认值应该用 ??，不要用 || 吞掉 0 / '' / false。
```

也可以在 checklist 里写：

```text
检查是否新增了 ||。
```

但当 AI 面对一个真实改动时，它还需要知道：

```text
这个规则在当前任务里是否相关？
如果相关，它影响的是输入边界、配置解析，还是业务返回契约？
如果违反了，是必须阻断，还是可以记录为风险？
应该回源读哪份规则？
最终用什么证据说明已经处理？
```

这就是 ability 的位置。

它不是替代知识库，也不是替代 checklist。
它更像知识库到行动之间的一层认知视图：

```text
知识 / 规则 / checklist
  → ability 选择、解释、组合
  → skill 或 agent 执行
  → validation 回验
```

所以我现在不想把所有东西都塞进一个"超级知识库"。
知识库负责沉淀事实和经验，checklist 负责验收插件，ability 负责把它们组织成某个 concern 下的判断闭包。

这也是我理解的"信息内聚"：

不是把所有信息放到一个文件里，
而是让同一类判断有一个清晰的归属地。

## ACP：一个还很早的方向

做到这里后，会自然出现下一个问题：

如果 ability 是一种认知能力包，那它能不能被不同 harness 加载？

MCP 解决的是工具互操作：

```text
任何 LLM 能调用任何工具。
```

我现在想要的东西更像 ACP：

```text
任何 Harness 能加载任何认知能力包。
```

![ACP Ability Package 通过 runtime contract 被不同 Harness 加载、验证和降级](/assets/img/from-skills-to-abilities/acp-contract.webp)

这里的 ACP，我暂时叫 Agentic Cognitive Protocol。

但必须说清楚：这不是一个已经完成的标准。
它现在只是一个工程方向。

一个最小的 ACP ability package，至少要声明：

| 字段 | 含义 |
|---|---|
| identity | name / version / concern / maturity |
| applicability | triggers / file-patterns / do-not |
| context_budget | 核心 token 预算 / reference 加载策略 |
| sources | rules / knowledge / lessons / checklists 的权威引用 |
| judgments | core invariants / redlines / quality criteria |
| validation | done_when / evidence_required / failure_action |
| projection | claude / codex / openai / gemini 等平台投射 |
| degradation | L3 不可用时回退到 L1 skill 或 L0 rules |

我现在最在意的不是 schema 漂亮，而是 runtime contract：

```text
什么时候加载？
加载多少？
证据从哪里来？
失败如何降级？
怎么知道它真的起作用？
```

没有这些，ACP 就只是一个静态文件格式，不是协议。

## 对标 ruflo 给我的启发

我最近也看了一些开源项目，比如 NomiFun、ruflo、Open WebUI、AnythingLLM、Khoj、OpenHands。

NomiFun 更像产品形态灵感：local-first AI workstation，把 MCP、REST、browser/computer use、secret vault、WebUI 放在一个桌面产品里。

ruflo 则更像 harness/governance 对标物：有 MCP、hooks、memory、plugin、MetaHarness、安全 CI、降级模式。

但这些项目给我的最大启发不是"应该复制哪个架构"。

恰恰相反。

我的结论是：

```text
NomiFun = 产品形态灵感
ruflo   = harness / governance 对标物
Justin  = cognitive architecture / ability contract
```

换句话说，别人做得好的地方要借鉴：

- tool registry
- security gate
- scorer
- degraded mode
- plugin package
- runtime observability

但我不想把 Justin 做成另一个 agent harness。

Harness 给模型手脚。
Ability 给模型判断框架。

这是两件事。

## 现在还没解决什么

这篇文章不是一个胜利宣言。

现在还没解决的问题很多：

- Ability 的 validator 还只是计划。
- L2 dynamic scheduler 还只是过渡 hook + contract 设计。
- 7 维 scorer 还没有最小可执行原型。
- `code-style-core` 还只是 draft。
- ACP 还不是标准，只是方向。

但我觉得这个方向已经足够值得写下来。

因为它把问题从"我怎么让 AI 多会一个技能"推进到了：

```text
我怎么让 AI 稳定继承一类判断？
```

这个问题对我很重要。

我现在带团队、review 代码、做个人 AI 工具体系，很多时候真正稀缺的不是步骤，而是判断。

步骤可以复制。
判断需要内聚。

## 最后

如果你已经写过很多 skill、rules、prompts，我建议你可以试着问一个问题：

```text
这里面哪些东西其实不是流程，而是判断？
```

如果答案很多，那么它可能不应该继续长在 skill 里。

它可能需要变成一个 ability。

一个很小的开始方式是：打开你现在最常用的一份 skill / prompt / rule 文件，标出里面所有不是步骤的句子。

如果这些句子在描述"什么算好、什么算坏、什么时候该阻断、该回源读哪里、怎么证明"，它们就是 ability 候选。

不是为了发明新名词，而是为了让 AI 在长周期任务里，不只是会执行步骤，也能稳定知道：

```text
什么是好。
什么是坏。
为什么。
怎么证明。
失败时退到哪里。
```

这就是我现在理解的 Ability。

如果再放回完整链路里，它的位置是：

```text
Tool 让 AI 能行动。
Skill 让 AI 能按流程行动。
Ability 让 AI 能带着判断行动。
Cognitive Architecture 让这些判断在长期系统里协同和进化。
```

Skill 让 AI 会做事。
Ability 让 AI 会判断。

项目仓库：`https://github.com/cognirail/from-skills-to-abilities`
