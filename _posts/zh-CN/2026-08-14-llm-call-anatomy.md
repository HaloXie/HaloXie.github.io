---
title: "一次 LLM 调用究竟发生了什么：从请求、采样到结构化响应"
description: "用 Pi 拆开一次模型调用，看清请求如何进入模型、token 如何被采样，以及为什么响应不只是一段文字"
date: 2026-08-14 21:10:00 +0800
lang: zh-CN
translation_status: pending
lang-exclusive: [zh-CN]
page_id: llm-call-anatomy
permalink: /learn/agent-zero-to-one/llm-call-anatomy/
categories: [AI]
tags: [ai-agent, llm, pi, model-runtime]
image:
  path: /assets/img/llm-call-anatomy/cover.webp
  alt: "结构化请求经过模型运行时和候选 token 采样后形成结构化响应"
toc: true
---

前面三课一直在谈 Agent，但 Agent 最底下反复做的事情，其实很朴素：**调用模型，读取结果，再决定下一步。**

如果连一次模型调用都说不清楚，后面的 Agent Loop、Tool Calling 和 Context Management 就很容易变成“会抄代码，但不知道系统为什么这样跑”。

先把它压缩成一条线：

```text
程序准备请求
  → Provider 把请求转换成模型 API 能理解的格式
  → 模型反复预测下一个 token
  → 采样器从候选 token 中选择一个
  → 满足停止条件
  → Provider 返回结构化响应
```

这里最重要的不是记住 API 字段，而是建立一个判断：

> **LLM 调用不是查询标准答案，而是在当前输入和模型参数下生成一次结果。**

## 第一步：程序准备的不是一句话

我们在聊天框里看到的是一句问题，但程序通常会准备一组结构化数据：

- 使用哪个 Provider 和 Model；
- 系统规则；
- 当前的消息；
- 可用工具；
- 超时、取消信号和生成参数。

不同厂商的 API 字段并不完全一样。Pi 的 `@earendil-works/pi-ai` 会先使用统一的 `Context` 表达模型需要看到的内容，再由对应 Provider 转成 OpenAI、Anthropic、Google 或其他 API 的请求格式。

所以可以先这样理解：

```text
你的程序使用 Pi Context
  → Pi Provider Adapter
  → 厂商真实 API Request
```

模型并不会直接看到你的 TypeScript 对象。对象会先被转换成厂商协议，再编码成模型实际处理的 token。Message、Role、Token 和 Context Window 的细节放到下一课单独讲。

## 第二步：模型不是一次写完整段答案

对常见的自回归文本模型，可以先把生成过程理解成：**根据当前已有内容，预测下一个 token 的候选概率，然后重复。**

例如模型准备继续下面这句话：

```text
Agent 最重要的工程边界是 ____
```

模型内部可能得到一组候选：

```text
权限      0.38
工具      0.24
上下文    0.17
提示词    0.08
其他      0.13
```

这些数字只是解释用的假设，不是某次真实模型输出。重点在于：模型得到的是候选分布，不是一条从数据库读取出来的唯一答案。

采样器会根据模型和请求支持的策略选择下一个 token，再把它放回已有内容中，继续预测下一个。服务端可能使用批处理、缓存或推测解码加速，但对调用方来说，仍然可以使用“不断生成下一个 token”的心智模型。

### Temperature 控制什么

大白话理解：Temperature 会改变候选之间的差距。

- 较低：更倾向高概率候选，输出通常更稳定；
- 较高：低概率候选更容易被选中，输出通常更多样；
- `0`：通常更稳定，但不应当被当成跨时间、跨硬件、跨 Provider 的绝对确定性保证。

不同模型和 Provider 支持的生成参数并不完全相同，尤其是 reasoning model。不要为了“看起来可控”就在所有请求里机械填写一套参数。

## 第三步：生成为什么会停

模型不会无限生成。一次调用通常会因为下面某个原因结束：

| 停止原因 | 大白话解释 |
|---|---|
| `stop` | 模型正常结束本轮回答 |
| `length` | 达到输出长度限制 |
| `toolUse` | 模型选择调用工具，等待真实结果 |
| `error` | Provider、网络或请求失败 |
| `aborted` | 调用方主动取消 |
| `deferred` | Provider 接受任务，稍后再取结果 |

这也是为什么业务代码不能只拿到文字就结束。`length` 可能意味着答案被截断，`toolUse` 意味着系统应该执行工具，`error` 和 `aborted` 则需要完全不同的恢复策略。

## 用 Pi 运行一次最小模型调用

本文示例核对的是 [`earendil-works/pi`](https://github.com/earendil-works/pi) 的 `@earendil-works/pi-ai` **v0.84.2**，要求 Node.js `>= 22.19.0`。接口会继续变化，实际项目应固定版本并核对当前 README。

先安装：

```bash
npm pkg set type=module
npm install @earendil-works/pi-ai@0.84.2
npm install -D tsx
```

Pi 当前发布包使用 ESM，因此示例先把项目声明为 `type: module`。如果你的项目已经是 ESM，不需要重复执行第一条命令。

创建 `llm-call.ts`：

```ts
import { createModels, type Context } from "@earendil-works/pi-ai";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";

const modelId = process.env.PI_MODEL ?? "gpt-4o-mini";

const models = createModels();
models.setProvider(openaiProvider());

const model = models.getModel("openai", modelId);

if (!model) {
  throw new Error(`Unknown OpenAI model: ${modelId}`);
}

const context: Context = {
  systemPrompt: "回答要简短、准确；不知道时直接说明。",
  messages: [
    {
      role: "user",
      content: "用一句话解释：为什么一次 LLM 调用还不是 Agent？",
      timestamp: Date.now(),
    },
  ],
};

const response = await models.complete(model, context);

const text = response.content
  .filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("");

console.log(text);
console.log({
  provider: response.provider,
  model: response.model,
  stopReason: response.stopReason,
  usage: response.usage,
});
```

配置对应 Provider 的凭据后运行。以 OpenAI API Key 为例：

```bash
OPENAI_API_KEY="..." \
PI_MODEL="gpt-4o-mini" \
npx tsx llm-call.ts
```

不要把真实 Key 写进代码或提交进 Git。换 Provider 时，改用对应的 Provider factory、凭据环境变量和模型 ID；不要只修改一个字符串，就假设所有厂商协议完全相同。

## 为什么响应不应该被当成字符串

示例最后同时打印了文字和元数据。Pi 返回的 `AssistantMessage` 至少包含这些关键部分：

```text
content       文本、thinking 或 toolCall 等内容块
provider      实际使用的 Provider
model         请求的模型
usage         输入、输出、缓存、费用等用量
stopReason    为什么停止
errorMessage  失败时的错误信息
```

这套结构能回答很多生产问题：

- 这次回答是不是被长度限制截断了？
- 模型是在正常回答，还是要求调用工具？
- 一次运行消耗了多少 token 和费用？
- 失败来自模型拒绝、网络、取消，还是 Provider？

**只保存最终文字，会把最有用的调试信息全部丢掉。**

## 再运行一次，你可能得到不同答案

可以连续执行两次示例，比较：

- 文字是否完全相同；
- `usage.input` 和 `usage.output` 是否变化；
- `stopReason` 是否一致；
- 换模型后表达方式发生了什么变化。

这个实验不是为了证明“模型不可靠”，而是让你区分两类系统行为：

```text
确定性代码：选择模型、设置权限、记录用量、处理停止原因
概率性模型：根据当前 Context 生成下一段内容或行动建议
```

可靠的 Agent 系统不是消灭概率性，而是用确定性代码把概率性能力放进可以观察、限制和恢复的边界里。

## 三个最容易混淆的地方

### 1. API 调用成功，不等于答案正确

HTTP 成功、`stopReason: "stop"` 只说明生成过程正常结束，不代表事实正确。答案质量仍然需要验证、引用或 Evaluator。

### 2. 流式输出不是模型边想边发送完整句子

流式 API 会把生成过程中的增量事件尽早交给调用方。它改善等待体验，也便于观察 tool call 和取消，但不会自动提高答案质量。我们会在第 06 课把它接入 Agent Loop。

### 3. 一次模型调用还不是 Agent

这一课的程序只完成：输入一次，输出一次。

Agent 还需要根据输出或工具结果更新状态，并再次决定：继续、换方法、调用工具，还是停止。也就是说：

```text
一次 LLM 调用：Context → Response

Agent Loop：State → LLM Call → Action → Observation
                     ↑                    ↓
                     └──── 再次判断 ──────┘
```

下一课先把 `Context` 拆开：Message、Role、Token 和 Context Window 到底是什么。第 06 课再把多次调用串成真正的最小 Agent Loop。

## 参考资料

- [`@earendil-works/pi-ai` README](https://github.com/earendil-works/pi/blob/main/packages/ai/README.md)：Pi 的 Provider、Context、stream、complete、usage 与 stop reason 接口。
- [Pi `AssistantMessage` 与事件类型](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts)：本文响应结构和停止原因的代码来源。
- [Hugging Face Transformers：Generation strategies](https://github.com/huggingface/transformers/blob/main/docs/source/en/generation_strategies.md)：greedy、sampling、beam search 等生成策略。
- Holtzman et al., [The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751)：概率采样与 nucleus sampling 的经典论文。
- [OpenAI Cookbook：Reproducible outputs with `seed`](https://github.com/openai/openai-cookbook/blob/main/examples/Reproducible_outputs_with_the_seed_parameter.ipynb)：为什么可复现性通常是“更稳定”，而不是绝对保证。

本文的流程、例子和类比均为教学整理，不是对上述资料的翻译或图表复刻。
