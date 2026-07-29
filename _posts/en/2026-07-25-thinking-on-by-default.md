---
title: "When Models Start Thinking for Themselves: The Legacy Prompts Your Harness Should Retire"
description: "After the July 2026 wave of model releases, which harness prompts have gone from helpful to harmful, which should be strengthened, and which new ones are needed"
date: 2026-07-25 00:00:00 +0800
lang: en
page_id: thinking-on-by-default
permalink: /posts/thinking-on-by-default/
categories: [AI]
tags: [harness-engineering, prompt-engineering, thinking, reasoning, ai-agent]
image:
  path: /assets/img/thinking-on-by-default/cover-en.webp
toc: true
---

> This article was written in late July 2026. Model capabilities, pricing, and API parameters in this field change almost weekly, so consult each vendor's documentation when you read it.
>
> This article is not about "which model is stronger." It asks a more specific question: **if you maintain an agent harness, which sentences in your prompts have this new generation of models turned from "helpful" into "harmful"?**

The release cadence in July 2026 looked roughly like this: Grok 4.5 on July 8, Kimi K3 on July 16, the GPT-5.6 trio, Claude Opus 5 on July 24, plus open-source updates from Qwen 3.6 and GLM-5.2.

Judging by benchmarks alone, these releases are closely matched and offer no unified narrative. But if you maintain a harness—the layer that wraps a model with tools, context, validation, and recovery mechanisms—you will find that these models all did **the same thing in the same direction**. And that means a set of prompt patterns that used to be best practices are now producing negative returns.

## The conclusion first

Three axes have converged into de facto standards:

```text
thinking on by default   →  you no longer need to teach the model to "think first"
effort tiers             →  reasoning depth shifts from prompt craft to an API parameter
subagents as first-class →  delegation no longer requires hand-written orchestration
```

A fourth axis is splitting: **is max effort actually the answer?** Price is increasingly driving that split.

For harness engineering, these are the seven prompt categories that require action:

| Category | Action |
|---|---|
| "Add a final validation step" / "Use a subagent to review" | **Remove** |
| "Think step by step" / "Think carefully before answering" | **Remove** |
| Hard-coded temperature / top_p / top_k | **Remove** |
| Clarification gate (align before execution) | **Keep and strengthen** |
| Permission for the model to push back | **Keep and strengthen** |
| Independence constraints for independent acceptance | **Keep and strengthen** |
| Thinking replay + effort abstraction + per-task cost accounting | **Add** |

Here is the evidence.

## 1. Convergence along three axes

First, the facts. These columns are not marketing claims from one vendor; they are features that several independent vendors documented or published in papers within one month.

| Axis | Anthropic | OpenAI | xAI | Moonshot | Qwen / Zhipu |
|---|---|---|---|---|---|
| thinking on by default | Enabled by default in Opus 5 | thinking level is now a persistent control | Built in | K3 thinking always on | Qwen 3.6 Plus always-on CoT; GLM-5 thinks before every response and tool call |
| effort tiers | Five tiers from `low` to `max` | Sol adds a Max reasoning tier | Per-call reasoning effort dial | `reasoning_effort`, max only at launch | Thinking budget available since the Qwen3 family |
| subagents as first-class | More proactive delegation | Sol Ultra splits work across multiple subagents | RL for long tasks | K3 Swarm Max targets large-scale parallelism | GLM-5 has a dedicated agentic RL stage |

When three or more independent vendors converge, it is unlikely that only one company is making a unilateral bet.

### Why this direction

Four drivers, ordered from most to least verifiable:

**1. Training rewards have shifted from "preference" to "verifiable outcomes."** The question is no longer "does this answer look like what the user wanted?" but "did the code compile, did the tests pass, was the refactor completed?" **Model self-validation is not a designed feature; it is the inevitable result of optimizing terminal states instead of compliance with intermediate steps.**

**2. Test-time compute is currently the cheapest scaling axis.** The pretraining curve has become steep: ten times the compute now yields only single-digit capability gains, and the lab pays that cost up front. The thinking-time curve is still linear, and the user pays per query. For the same capability gain, one is booked as CapEx and the other as OpEx. Anthropic says Opus 5 "converts additional effort into quality more reliably than any earlier Opus." In plain language: they made that curve steeper.

**3. The target workload has shifted from chat to long-horizon agents.** In a single-turn conversation, a human remains in the loop, so literal instruction following and latency matter most. In a 200-step agent loop, no human is present and errors compound multiplicatively: 99% reliability per step leaves only a 13% success rate after 200 steps. Self-correction and self-validation are the only ways to make that number acceptable; they are not UX decoration.

**4. Training objectives now explicitly target autonomous execution of long tasks.** First-party material supports this point: Qwen 3.6 performs RL across millions of agent environments with progressively more complex task distributions; GLM-5 post-training explicitly separates reasoning RL and agentic RL, while its SFT data directly includes coding agents, search agents, and general agents; Grok 4.5 uses reinforcement learning across hundreds of thousands of multi-step tasks.

So the tendency for models to infer intent and continue on their own is not a quirk of one vendor. It sits at the center of the industry's training objectives.

## 2. The underestimated fourth convergence: preserved thinking

This one is easiest to miss because it is not a capability description. It is a **hard constraint on the harness layer**.

![Replay the complete thinking history within one model session, and start a new session when switching models](/assets/img/thinking-on-by-default/preserved-thinking-en.webp)

- The GLM-5 paper calls it out separately as **Preserved Thinking**: in coding-agent scenarios, the complete thinking blocks are retained across turns, so existing reasoning can be reused instead of recomputed from scratch.
- Qwen 3.6 lists **Thinking Preservation** as a new feature, retaining thinking context across conversation history.
- Moonshot puts it most directly: K3 was trained with preserved thinking history. If an agent harness does not pass back the full thinking history, or switches from another model midstream, generation quality can become highly unstable.

Translated into harness requirements, that means two things:

**1. Thinking blocks must be replayed verbatim; retaining only final text is not enough.** Many early harness loops worked like this: receive a response → extract the final answer → append it to history → begin the next turn. That was fine when thinking was optional. Once thinking becomes a training assumption, this pattern silently degrades quality—it fails **silently**, without an error, and the model simply becomes less capable.

**2. A model switch must be treated as a session boundary.** If your workflow uses model A for exploration and model B for finalization, those stages cannot share one thread. Switching across sessions is fine; switching models within a single history breaks thinking continuity.

For multi-model workflows, this is a real design constraint, not an optimization tip.

## 3. The fault line: max effort is not the answer

Everyone now exposes an effort control, but **the competitive axis has moved from "how strong is the max tier?" to "how many tokens does each task consume?"**

xAI's official numbers say Grok 4.5 uses roughly 16,000 output tokens on average to solve a SWE Bench Pro task, about one quarter of the roughly 67,000 used by Opus 4.8 at max effort. Pricing is \$2/\$6 per million tokens versus \$5/\$25 for Opus 5.

Once normalized, the arithmetic is straightforward: **roughly 2.5× cheaper per token × about 4× fewer tokens per task ≈ an order-of-magnitude difference in per-task cost.**

This is not a quality rout—in xAI's own four coding evaluations against Opus 4.8, the result is two wins and two losses. Grok wins on terminal-style and older evaluations, but loses on newer, messier repository-level evaluations. That is not the important part. What matters is that **the cost metric has changed**.

If your harness has decision gates for "change cost" or "invocation cost" and only quantifies per-token price, those gates are now broken. **You must add per-task token consumption**, and measure it on your own task distribution—the vendor's 4.2× figure comes from SWE Bench Pro, not your repository.

Two more pieces of evidence should temper any discussion that says "models are stronger, so we can relax controls":

- Independent testing of Kimi K3 shows accuracy rising from roughly 33% in the previous generation to about 46%, while the **hallucination rate also rises to roughly 51%**. Scaling reasoning does not fix factuality.
- At launch, K3 exposed only the max tier for `reasoning_effort`, with lower tiers promised in a later update. **The presence of a control does not mean the control is usable.** Do not assume effort is a universally portable parameter in your harness.

## 4. How legacy prompts should change

This is the core of the article. Every recommendation below maps to one of the facts above; none is merely a stylistic preference.

### Three categories to remove

**1. Every "remember to validate" instruction.**

```text
❌ Add a final validation step when you finish
❌ Ask a subagent to review your output
❌ Check for omissions before delivery
```

Anthropic explicitly states in the Opus 5 documentation that the model proactively self-validates and that these inherited instructions from older models should be removed to avoid over-verification. These sentences were essential in 2025. Now they waste tokens and make the model loop repeatedly on simple tasks.

Keep the distinction between two levels clear: **remove reminders to validate; retain validation levels and acceptance criteria.** The former is prompt craft. The latter is a delivery contract. Confusing the two removes the quality gate itself.

**2. Every "think before answering" instruction.**

```text
❌ think step by step
❌ analyze carefully before answering
❌ list your reasoning process before giving the conclusion
```

Once thinking is on by default, these instructions no longer activate reasoning. They interfere with effort allocation: the model would otherwise decide how long to think, while your instruction supplies a fixed signal unrelated to task difficulty.

**3. Hard-coded sampling parameters.**

Starting with Opus 4.7, Anthropic returns a 400 error when `temperature`, `top_p`, or `top_k` is set to a non-default value. This is not a soft deprecation; it is a hard failure. If your harness has a shared request builder that always injects `temperature: 0.7`, upgrading the model will break the entire path.

### Three categories to keep—and strengthen

This section matters more than the removal list because its conclusions are counterintuitive.

**4. The clarification gate: align before execution.**

The more autonomous the model becomes, the more important this gate is—not less.

There is a mechanism here that I think is widely underestimated (this paragraph is an inference, not vendor documentation): **clarifying questions have long been penalized in preference data.** Human annotators systematically rate "let me first confirm whether you mean..." lower than "here is the answer"—even when the latter guessed incorrectly. As a result, "clarify first" is structurally suppressed by RLHF; it is not absent because models lack the capability.

The practical implication: **your clarification gate compensates for training-data bias, not a model deficiency.** It needs to remain for the long term, and it must be a hard constraint rather than a soft preference—a soft preference will be overridden by the model's default tendency.

**5. Permission for the model to push back.**

The same mechanism applies. Like clarification, pushback is penalized by preference data. Yet this generation's entire direction assumes something implicitly: **the objective provided by the human is correct.**

If the objective itself is wrong, an outcome-oriented, autonomous model that dislikes clarification will complete the wrong task with great efficiency. So the stronger the model, the more load-bearing the permission to "stop and say so when a premise is invalid" becomes. This is the constraint most likely to be damaged by the idea that "the model is smarter, so we need fewer rules."

**6. Independence of independent acceptance.**

Model self-validation is not independent acceptance. Self-validation is **self-evaluation**, and self-evaluation is known to be lenient.

Opus 5 proactively self-validates and asks you to remove validation reminders. That does not mean independent acceptance is no longer needed. Remove the prompt-level reminder, but retain—and strengthen—the structural constraint: **the executor cannot also be the final evaluator.** Otherwise, "the model says it checked" quietly replaces acceptance evidence, and no error is raised.

One related point: Opus 5 produces longer output by default, narrates progress more frequently in agent sessions, and delegates to subagents more proactively. If your harness constrains output length or excessive parallelism, those constraints now face more pressure and need to be written more firmly.

### Three categories to add

**7. Thinking replay and model boundaries.** See Section 2. Replay the complete thinking block in multi-turn loops; treat a model switch as a new session.

**8. An effort abstraction layer.** Do not embed vendor parameter names in business logic. Define an abstract set of tiers:

```text
shallow / normal / deep / max
```

Then let each platform adapter map them to Anthropic's `low`–`max`, Grok's per-call dial, or K3's `reasoning_effort`. There are two reasons: vendors use different names and tier counts, and **tier availability changes** (K3 launched with max only). An abstraction layer lets you maintain the "task type → reasoning depth" decision table in one place.

You can fill that table only by running your own evaluations. Different models convert effort into quality at different rates; setting tiers by intuition means paying for nothing.

**9. Per-task token cost accounting.** See Section 3. Add this field to your cost-quantification checklist and measure it on your own task distribution.

## 5. A migration checklist

If you are about to audit your harness prompts, use this order:

```text
1. grep for every "validate/review/check" reminder        → keep acceptance contracts, remove reminders
2. grep for every "step by step / think carefully"       → remove outright
3. grep for temperature / top_p / top_k                   → they can trigger 400; highest priority
4. check whether multi-turn loops replay thinking blocks  → silent quality loss; easiest to miss
5. mark model switch = session boundary                   → mandatory for multi-model workflows
6. promote clarification gates and pushback permission
   from soft preferences to hard constraints              → counterintuitive but important
7. strengthen acceptance-independence constraints         → prevent self-validation collapse
8. add an effort abstraction + task-tier decision table   → requires evaluation evidence
9. add per-task tokens to cost accounting                 → primary model-selection variable
```

The first three are mechanical replacements and can be done in an afternoon. Items 4 and 5 are bug-level issues; leaving them unfixed silently reduces quality. Items 6 and 7 are judgment calls, and the ones most likely to be removed amid optimism that "models are stronger now."

## Finally: questioning the argument itself

The "three axes have converged" claim above is based on vendors' public materials. Those materials partly imitate one another's product forms—**convergence in product shape does not necessarily imply convergence in underlying technical paths.**

The real evidence would be each vendor's RL objective, and only the GLM-5 paper and Qwen repository disclose that layer. OpenAI and Anthropic do not. So I assign this conclusion medium-to-high confidence, not high confidence.

For harness engineering, however, that distinction does not materially change the action. You need to align with **interfaces and behavior**, not training recipes. Thinking on by default, effort tiers, preserved thinking, and native subagents are already present in vendors' APIs and documentation, regardless of whether their underlying training paths truly match.

---

## References

- Anthropic. *What's new in Claude Opus 5*. 2026-07. https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5
- Anthropic. *Model deprecations*. https://platform.claude.com/docs/en/about-claude/model-deprecations
- xAI. *Introducing Grok 4.5*. 2026-07. https://x.ai/news/grok-4-5
- Qwen Team. *Qwen3.6*. https://github.com/QwenLM/Qwen3.6
- Zhipu AI. *GLM-5: from Vibe Coding to Agentic Engineering*. arXiv:2602.15763
- Simon Willison. *Kimi K3, and what we can still learn from the pelican benchmark*. 2026-07-16. https://simonwillison.net/2026/Jul/16/kimi-k3/
- ThursdAI. *July 2026 AI Releases*. https://thursdai.news/releases/2026-07
- Stanford. *Lost in the Middle: How Language Models Use Long Contexts*.

Further reading: [Harness Engineering: The New Engineering Paradigm for the AI Agent Era](/posts/harness-engineering/) · [Skills Let AI Act; Abilities Let AI Judge](/posts/from-skills-to-abilities/)
