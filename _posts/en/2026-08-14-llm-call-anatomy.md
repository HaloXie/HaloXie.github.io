---
title: "What Happens in an LLM Call? From Requests and Sampling to Structured Responses"
description: "Take apart a model call with Pi to see how a request reaches the model, how tokens are sampled, and why the response is more than a string."
date: 2026-08-14 21:10:00 +0800
lang: en
page_id: llm-call-anatomy
permalink: /learn/agent-zero-to-one/llm-call-anatomy/
categories: [AI]
tags: [ai-agent, llm, pi, model-runtime]
image:
  path: /assets/img/llm-call-anatomy/cover-en.webp
  alt: "A structured request passes through the model runtime and token sampling to produce a structured response"
toc: true
---

The previous three lessons discussed agents, but the operation underneath them is simple: **call the model, read the result, and decide what to do next.**

Without understanding one model call, it is easy to copy agent loops, tool calling, and context management code without knowing why the system behaves as it does.

Start with one sequence:

```text
The program prepares a request
  → The provider converts it into the model API's format
  → The model repeatedly predicts the next token
  → A sampler selects a candidate token
  → A stopping condition is reached
  → The provider returns a structured response
```

The most important idea is not an API field to memorize:

> **An LLM call generates an outcome from the current input and model parameters; it does not look up a single authoritative answer.**

## Step 1: The program prepares more than a sentence

The chat interface shows a question, but the program usually prepares structured data:

- Which provider and model to use.
- System instructions.
- Current messages.
- Available tools.
- Timeouts, cancellation signals, and generation parameters.

Vendors do not all use the same API fields. Pi's `@earendil-works/pi-ai` represents the input with a common `Context`, and the relevant provider converts it into a request for OpenAI, Anthropic, Google, or another API.

You can picture it like this:

```text
Your program uses Pi Context
  → Pi Provider Adapter
  → The vendor's actual API request
```

The model does not directly read your TypeScript object. That object is converted into the vendor's protocol and encoded into tokens the model processes. The next lesson covers messages, roles, tokens, and context windows in detail.

## Step 2: The model does not write the whole answer at once

For common autoregressive text models, a useful starting point is: **predict a probability distribution for the next token from the content already present, then repeat.**

Suppose the model is continuing:

```text
An agent's most important engineering boundary is ____
```

It might produce a candidate distribution such as:

```text
permissions    0.38
tools          0.24
context        0.17
prompts        0.08
other          0.13
```

These numbers are hypothetical teaching examples, not an actual model output. The point is that the model produces a distribution of candidates, not a unique answer retrieved from a database.

The sampler selects the next token using a strategy supported by the model and request. That token becomes part of the existing content, and prediction continues. The server may accelerate this with batching, caching, or speculative decoding, but “repeatedly generate the next token” remains a useful mental model for the caller.

### What does temperature control?

In plain language, temperature changes the differences between candidate probabilities.

- Lower values favor high-probability candidates; output is usually more stable.
- Higher values make lower-probability candidates easier to select; output is usually more varied.
- `0` is usually more stable, but is not an absolute determinism guarantee across time, hardware, or providers.

Different models and providers support different generation parameters, especially reasoning models. Do not mechanically apply the same set of parameters to every request just to make it look controlled.

## Step 3: Why does generation stop?

A model does not generate indefinitely. A call usually ends for one of these reasons:

| Stop reason | Meaning |
|---|---|
| `stop` | The model finished this response normally |
| `length` | The output length limit was reached |
| `toolUse` | The model requested a tool call and needs its actual result |
| `error` | The provider, network, or request failed |
| `aborted` | The caller cancelled the request |
| `deferred` | The provider accepted the task; its result must be retrieved later |

That is why application code cannot stop at extracting text. `length` may mean a truncated answer; `toolUse` means the system should execute a tool; `error` and `aborted` require different recovery strategies.

## Run a minimal model call with Pi

This example was checked against **v0.84.2** of `@earendil-works/pi-ai` in [`earendil-works/pi`](https://github.com/earendil-works/pi), which requires Node.js `>= 22.19.0`. Interfaces will continue to change: pin your project's version and check the corresponding README.

Install the dependencies:

```bash
npm pkg set type=module
pnpm add @earendil-works/pi-ai@0.84.2
pnpm add -D tsx
```

Pi's published package uses ESM, so the first command declares `type: module` for the project. Skip that command if the project already uses ESM.

Create `llm-call.ts`:

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
  systemPrompt: "Be concise and accurate; say when you do not know.",
  messages: [
    {
      role: "user",
      content: "Explain in one sentence why a single LLM call is not yet an agent.",
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

Configure credentials for the provider, then run it. For an OpenAI API key:

```bash
OPENAI_API_KEY="..." \
PI_MODEL="gpt-4o-mini" \
pnpm exec tsx llm-call.ts
```

Do not put a real key in source code or commit it to Git. To switch providers, use the appropriate provider factory, credential environment variable, and model ID. Changing a string does not make all vendors' protocols interchangeable.

## Why the response should not be treated as a string

The example prints both text and metadata. Pi's `AssistantMessage` includes these important parts:

```text
content       Content blocks such as text, thinking, or toolCall
provider      The provider actually used
model         The requested model
usage         Input, output, cache, and cost information
stopReason    Why generation stopped
errorMessage  Error details when execution fails
```

This structure helps answer production questions:

- Was the answer cut off by the length limit?
- Is the model answering normally or requesting a tool call?
- How many tokens and how much money did the run consume?
- Did the failure involve a refusal, the network, cancellation, or the provider?

**Saving only the final text discards the most useful debugging information.**

## Run it again: the answer may differ

Run the example twice and compare:

- Whether the text is identical.
- Whether `usage.input` and `usage.output` change.
- Whether `stopReason` is the same.
- How the wording changes when you switch models.

The purpose is not to prove that models are unreliable. It is to distinguish two kinds of system behavior:

```text
Deterministic code: choose the model, enforce permissions, record usage, handle stop reasons
Probabilistic model: generate the next content or suggested action from the current Context
```

A reliable agent system does not eliminate probabilistic behavior. It uses deterministic code to place that capability within boundaries that can be observed, constrained, and recovered from.

## Three common confusions

### 1. A successful API call does not mean a correct answer

HTTP success and `stopReason: "stop"` show that generation finished normally. They do not establish factual correctness. Answer quality still needs verification, citations, or an evaluator.

### 2. Streaming does not mean the model thinks and sends complete sentences

A streaming API delivers incremental events as soon as possible. This improves the waiting experience and helps callers observe tool calls and cancellation; it does not automatically improve answer quality. Lesson 06 will connect streaming to the agent loop.

### 3. A single model call is not yet an agent

This lesson's program performs one input and one output.

An agent also needs to update its state from the output or tool result and decide again: continue, change approach, call a tool, or stop.

```text
A single LLM call: Context → Response

Agent Loop: State → LLM Call → Action → Observation
                     ↑                    ↓
                     └── Decide again ────┘
```

The next lesson unpacks `Context`: messages, roles, tokens, and the context window. Lesson 06 will connect several calls into a real minimal agent loop.

## References

- [`@earendil-works/pi-ai` README](https://github.com/earendil-works/pi/blob/main/packages/ai/README.md): Pi's provider, Context, stream, complete, usage, and stop-reason interfaces.
- [Pi `AssistantMessage` and event types](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts): the code behind the response structure and stop reasons described here.
- [Hugging Face Transformers: Generation strategies](https://github.com/huggingface/transformers/blob/main/docs/source/en/generation_strategies.md): greedy decoding, sampling, beam search, and other generation strategies.
- Holtzman et al., [The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751): a foundational paper on probabilistic and nucleus sampling.
- [OpenAI Cookbook: Reproducible outputs with `seed`](https://github.com/openai/openai-cookbook/blob/main/examples/Reproducible_outputs_with_the_seed_parameter.ipynb): why reproducibility usually means greater stability rather than an absolute guarantee.

The sequences, examples, and analogies in this article are teaching aids, not translations or reproductions of figures from these sources.
