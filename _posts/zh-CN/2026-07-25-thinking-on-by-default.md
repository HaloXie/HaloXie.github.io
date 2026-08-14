---
title: "模型开始自己思考之后：Harness 里那些该退役的老 Prompt"
description: "2026 年 7 月模型发布潮后，哪些 harness prompt 从有用变成有害，哪些该加强，哪些该新增"
date: 2026-07-25 00:00:00 +0800
lang: zh-CN
page_id: thinking-on-by-default
permalink: /posts/general/thinking-on-by-default/
redirect_from:
  - /posts/thinking-on-by-default/
categories: [AI]
tags: [harness-engineering, prompt-engineering, thinking, reasoning, ai-agent]
image:
  path: /assets/img/thinking-on-by-default/cover.webp
toc: true
---

> 本文写于 2026 年 7 月下旬。文中引用的模型状态、定价和 API 参数在这个领域大约以周为单位变化，读到时请以厂商文档为准。
>
> 这篇文章不讨论"哪个模型更强"。它想回答一个更具体的问题：**如果你在维护一个 agent harness，这一批新模型让你 prompt 里的哪些句子从"有用"变成了"有害"。**

2026 年 7 月的发布密度大概是这样的：Grok 4.5（7 月 8 日）、Kimi K3（7 月 16 日）、GPT-5.6 三件套、Claude Opus 5（7 月 24 日），加上 Qwen 3.6 和 GLM-5.2 在开源侧的更新。

如果只看 benchmark，这些发布互相咬得很紧，看不出统一叙事。但如果你维护的是 harness——给模型套上工具、上下文、验证和恢复机制的那一层——你会发现这批模型在**同一个方向上做了同一件事**。而这件事意味着：一批曾经是最佳实践的 prompt 写法，现在开始产生负收益。

## 先说结论

三个轴已经收敛成事实标准：

```text
thinking 默认开  →  你不再需要教模型"先思考"
effort 分档      →  推理深度从 prompt 技巧变成 API 参数
subagent 一等公民 →  派发不再需要你手写编排
```

第四个轴在分裂：**max effort 到底是不是答案**。这条分裂正在被价格主导。

而对 harness 工程来说，真正需要动手的是这七类 prompt：

| 类别 | 动作 |
|---|---|
| "最后加一步验证" / "用 subagent 复核" | **删** |
| "think step by step" / "回答前请仔细思考" | **删** |
| 硬编码的 temperature / top_p / top_k | **删** |
| 澄清门（先对齐再执行） | **留，且加强** |
| 允许模型顶回来的许可 | **留，且加强** |
| 独立验收的独立性约束 | **留，且加强** |
| thinking 回传 + effort 抽象层 + per-task 成本口径 | **新增** |

下面是依据。

## 一、三个轴的收敛

先摊事实。这三列不是同一家的宣传语，是几家独立厂商在一个月内落到文档和论文里的东西。

| 轴 | Anthropic | OpenAI | xAI | Moonshot | Qwen / 智谱 |
|---|---|---|---|---|---|
| thinking 默认开 | Opus 5 默认开启 | thinking level 已是常驻控件 | 内建 | K3 thinking always on | Qwen 3.6 Plus always-on CoT；GLM-5 每次响应和工具调用前都思考 |
| effort 分档 | `low` → `max` 五档 | Sol 新增 Max 推理档 | per-call reasoning effort dial | `reasoning_effort`，首发仅 max | Qwen3 系列起有 thinking budget |
| subagent 一等公民 | 更主动派发 | Sol 的 Ultra 模式拆给多个 subagent | 长任务 RL | K3 Swarm Max 专门跑大规模并行 | GLM-5 独立 agentic RL 阶段 |

三家以上独立收敛，基本可以排除"某一家单方面赌方向"的可能。

### 为什么是这个方向

四个驱动，按可验证程度从高到低排：

**① 训练奖励从"偏好"换成"结果可验证"。** 不再问"这个回答看起来像用户要的吗"，而是问"代码编译了吗、测试过了吗、重构完成了吗"。**模型的自我验证行为不是被设计出来的 feature，而是优化终态而非步骤合规的必然结果。**

**② test-time compute 是当前最便宜的 scaling 轴。** 预训练那条曲线陡了——算力翻十倍，能力提升只剩个位数，而且钱是实验室一次性垫的。思考时长这条曲线还是线性的，而且钱是用户按 query 付。同样的性能提升，一个记 CapEx 一个记 OpEx。Anthropic 说 Opus 5"把额外 effort 转化为质量比任何早期 Opus 更可靠"，翻译过来就是：我们把这条曲线做陡了。

**③ 目标 workload 从 chat 换成 long-horizon agent。** 单轮对话里人在环内，字面遵循和延迟最重要。200 步的 agent loop 里没有人，误差乘性复合——单步 99% 可靠，200 步只剩 13% 成功率。自纠错和自验证是让这个数字可接受的唯一手段，不是 UX 装饰。

**④ 训练目标已经明确写成"长任务自主执行"。** 这条有一手材料：Qwen 3.6 的 RL 跨百万级 agent 环境、任务分布逐步复杂化；GLM-5 的 post-training 明确分出 reasoning RL 和 agentic RL 两个阶段，SFT 语料直接包含 coding agents、search agents、通用 agents；Grok 4.5 在数十万个多步任务上做强化。

所以"模型越来越倾向自己推断意图、自己往下走"不是某家的调性问题，是行业训练目标的正中心。

## 二、被低估的第四个收敛：preserved thinking

这条最容易被漏掉，因为它不是能力描述，而是**harness 层的硬约束**。

![同一模型会话回传完整 thinking history，切换模型时建立新会话](/assets/img/thinking-on-by-default/preserved-thinking.webp)

- GLM-5 的论文把它单列为 **Preserved Thinking**：coding agent 场景下自动保留跨多轮的全部 thinking block，复用已有推理而不是从头重推。
- Qwen 3.6 把 **Thinking Preservation** 列为新特性，跨对话历史保留思考上下文。
- Moonshot 说得最直接：K3 是在 preserved thinking history 模式下训练的，如果 agent harness 没把全部历史 thinking 内容传回，或中途从别的模型切过来，生成质量可能变得高度不稳定。

翻译成 harness 需求，两条：

**1. thinking block 必须原样回传，不能只留最终文本。** 很多早期 harness 的多轮循环是这样写的：拿到响应 → 抽取最终答案 → 拼进历史 → 下一轮。这个写法在 thinking 是可选功能的时代没问题，在 thinking 成为训练前提之后会静默降质——注意是**静默**，不报错，只是变笨。

**2. 模型切换必须被当成会话边界。** 如果你的工作流是"模型 A 做探索、模型 B 做定稿"，这两步不能在同一个 thread 里做。跨会话切换没问题，同一条历史里换模型会丢 thinking 连续性。

这条对多模型工作流是个真实的设计约束，而不是优化建议。

## 三、分裂点：max effort 不是答案

所有人都装了 effort 旋钮，但**竞争轴已经从"max 档有多强"挪到了"每个任务花多少 token"**。

xAI 官方给的数字：Grok 4.5 平均用约 1.6 万 output token 解决一个 SWE Bench Pro 任务，是 Opus 4.8 max 档约 6.7 万的 1/4.2。定价 \$2/\$6 per M token，对比 Opus 5 的 \$5/\$25。

拉平后的账很直接：**per-token 便宜约 2.5 倍 × per-task token 少约 4 倍 ≈ 每任务成本差一个数量级。**

质量上不是碾压——xAI 自己公布的四个 coding eval 里，对 Opus 4.8 是两胜两负，赢的是 terminal 类和较旧的 eval，输的是更新、更脏的 repo 级 eval。但这不重要。重要的是**成本口径变了**。

如果你的 harness 里有"改动成本 / 调用成本"这类决策门禁，而量化维度只有 per-token 价格，那这个门禁现在是失效的。**必须补一列 per-task token 消耗**，而且必须在自己的任务分布上实测——厂商的 4.2x 是在 SWE Bench Pro 上测的，不是在你的 repo 上。

另外两条降温证据，值得写进任何"模型变强了所以可以放松"的讨论里：

- Kimi K3 的独立测试显示准确率从上一代的约 33% 升到约 46%，但**幻觉率同时升到约 51%**。推理规模化不修事实性。
- K3 首发时 `reasoning_effort` 只有 max 一档，低档"后续更新"。**旋钮的存在不等于旋钮可用**，别在 harness 里假设 effort 是普遍可移植的参数。

## 四、老 Prompt 该怎么改

这是本文的重点。下面每一条都对应上面的某个事实，不是风格偏好。

### 该删的三类

**1. 一切"记得验证"类指令。**

```text
❌ 完成后请加入一个最终验证步骤
❌ 请派一个 subagent 复核你的输出
❌ 交付前请自行检查是否有遗漏
```

Anthropic 在 Opus 5 的文档里明确写了：模型会主动自验证，要求移除从旧模型带过来的这类指令，否则会 over-verification。这类句子在 2025 年是刚需，现在是纯浪费——浪费 token，而且会让模型在简单任务上反复绕。

注意区分两个层次：**"提醒模型验证"该删；"验证等级和验收标准"该留。** 前者是 prompt 技巧，后者是交付契约。删错了会把质量门一起拆掉。

**2. 一切"先思考再回答"类指令。**

```text
❌ think step by step
❌ 请在回答前仔细分析
❌ 先列出你的推理过程，再给结论
```

thinking 默认开之后，这类指令做的事情从"激活推理"变成了"干扰 effort 分配"——模型本来会自己判断该想多久，你的指令给了一个与任务难度无关的固定信号。

**3. 硬编码的采样参数。**

Anthropic 从 Opus 4.7 起，`temperature`、`top_p`、`top_k` 设成非默认值直接返回 400。这不是软性弃用，是硬错误。如果你的 harness 有一个统一的 request builder 里塞了 `temperature: 0.7`，它会在升级模型的那一刻整个断掉。

### 该留、而且该加强的三类

这部分比"该删"更重要，因为它反直觉。

**4. 澄清门：先对齐再执行。**

模型越自主，这道门越重要，而不是越不重要。

这里有个我认为被普遍低估的机制（这段是推理，不是厂商文档）：**澄清提问在偏好数据里长期吃亏。** 人类标注者对"让我先确认一下你是指……"的评分，系统性低于"直接给出答案"——即使后者猜错了。所以"先问清楚"是被 RLHF 结构性压制的行为，不是模型能力不足。

推论很实用：**你的澄清门补的是训练数据偏差，不是模型缺陷。** 它需要长期存在，而且需要写成硬约束而不是软偏好——软偏好会被模型的默认倾向压过去。

**5. 允许模型顶回来的许可。**

同一个机制。pushback 和 clarification 一样是被偏好数据惩罚的行为。而这一批模型的整条路线都建立在一个隐含前提上：**人给的目标是对的。**

如果目标本身错了，一个结果导向、自主推进、不爱澄清的模型会非常高效地把错的事情做完。所以模型越强，"发现前提不成立时停下来说出来"这条许可就越 load-bearing。这是我认为最容易被"模型变聪明了所以规则可以少写"这个想法误伤的部分。

**6. 独立验收的独立性。**

模型自验证 ≠ 独立验收。自验证是**自评**，而自评已知偏宽松。

Opus 5 会主动自验证并要求你删掉验证提示——这条不能读成"不再需要独立验收环节"。该删的是 prompt 级的提醒，该保留甚至加硬的是结构级的约束：**执行者不能同时是最终验收者。** 否则"模型说它验过了"会悄悄替代"验收证据"，而你不会收到任何报错。

顺带一条：Opus 5 默认输出更长、在 agent session 里更频繁叙述进度、更主动派发 subagent。如果你的 harness 有输出压缩要求或"不要过度并行"的约束，这些约束现在承受的压力比以前大，需要写得更硬。

### 该新增的三类

**7. thinking 回传与模型边界。** 见第二节。多轮循环回传完整 thinking block；模型切换视为新会话。

**8. effort 抽象层。** 别把厂商参数名写进业务逻辑。定义一层抽象档位：

```text
shallow / normal / deep / max
```

再由各平台适配层翻译成 Anthropic 的 `low`–`max`、Grok 的 per-call dial、K3 的 `reasoning_effort`。理由有两个：一是参数名和档位数各家不同，二是**档位可用性会变**（K3 首发只有 max）。抽象层让"任务类型 → 推理深度"这张决策表只需要维护一份。

这张表怎么填只能靠自己跑 eval。不同模型把 effort 转成质量的效率不同，凭感觉设档位等于白付钱。

**9. per-task token 成本口径。** 见第三节。成本量化清单里加这一列，并且在自己的任务分布上实测。

## 五、一张迁移清单

如果你现在要审一遍手里的 harness prompt，按这个顺序：

```text
1. grep 掉所有"验证/复核/检查"类提醒          → 保留验收契约，删掉提醒
2. grep 掉所有"step by step / 仔细思考"       → 直接删
3. grep 掉 temperature / top_p / top_k        → 会 400，优先级最高
4. 检查多轮循环是否回传 thinking block        → 静默降质，最容易漏
5. 标注模型切换 = 会话边界                    → 多模型工作流必须
6. 澄清门和 pushback 许可从软偏好升成硬约束    → 反直觉但重要
7. 验收独立性约束加硬                         → 防自验证塌缩
8. effort 抽象层 + 任务档位决策表              → 需要 eval 支撑
9. 成本口径补 per-task token                  → 选型主变量
```

前三条是机械替换，一个下午能做完。第 4、5 条是 bug 级问题，不改会静默掉质量。第 6、7 条是判断问题，也是最容易在"模型变强了"的乐观情绪里被误删的部分。

## 最后：一个自我质疑

上面"三个轴收敛"的判断，建立在各厂商的公开材料上。而这些材料本身有互相抄产品形态的成分——**形态收敛不等于底层技术路线收敛。**

真正的判据是各家的 RL 训练目标，而这一层只有 GLM-5 的论文和 Qwen 的 repo 公开到了，OpenAI 和 Anthropic 都没有。所以这个结论我给中高置信度，不给高。

但对 harness 工程来说，这个区别不太影响行动。因为你要对齐的是**接口和行为**，不是训练配方。thinking 默认开、effort 分档、preserved thinking、subagent 原生——这四件事已经进了各家的 API 和文档，不管背后的训练路线是不是真的同一条。

---

## 参考资料

- Anthropic. [*What's new in Claude Opus 5*](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5). 2026-07.
- Anthropic. [*Model deprecations*](https://platform.claude.com/docs/en/about-claude/model-deprecations).
- xAI. [*Introducing Grok 4.5*](https://x.ai/news/grok-4-5). 2026-07.
- Qwen Team. [*Qwen3.6*](https://github.com/QwenLM/Qwen3.6).
- Zhipu AI. [*GLM-5: from Vibe Coding to Agentic Engineering*](https://arxiv.org/abs/2602.15763). arXiv:2602.15763.
- Simon Willison. [*Kimi K3, and what we can still learn from the pelican benchmark*](https://simonwillison.net/2026/Jul/16/kimi-k3/). 2026-07-16.
- ThursdAI. [*July 2026 AI Releases*](https://thursdai.news/releases/2026-07).
- Stanford. [*Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/abs/2307.03172).

延伸阅读：[Harness Engineering：AI Agent 时代的新工程范式](/posts/general/harness-engineering/) · [Skill 让 AI 会做事，Ability 让 AI 会判断](/posts/general/from-skills-to-abilities/)
