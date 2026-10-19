---
title: "Prompt Caching: Why Does Changing One Token Break Reuse After It?"
description: "Understand context-dependent KV states with an interactive prefix machine, then separate OpenAI and Anthropic breakpoint, TTL, and billing rules."
date: 2026-10-12 12:00:00 +0800
lang: en
page_id: prompt-cache-prefix
permalink: /posts/general/prompt-cache-prefix/
categories: [AI]
tags: [llm, prompt-caching, ai-agent]
image:
  path: /assets/img/prompt-cache-prefix/cover-en.webp
  alt: "A change splits a continuous prompt prefix, requiring later content to be processed under the new context"
toc: true
---

Suppose you are building a code-review agent. Every request carries the same tool definitions, review rules, and project notes; only the code at the end changes. Those shared materials are long, so you want prompt caching to reuse them.

Later, you add the current time at the start of the system prompt to provide task context. The rules and project notes remain identical, yet cache hits fall. The edit is tiny. Why cannot the cache skip it and reuse the large unchanged section afterward?

**Prompt caching reuses states computed with preceding context. The first differing token cuts off reuse of the old prefix after that point. Put stable content first and changing content later, while also satisfying the provider's cache-boundary and lifetime requirements.**

Here, “cannot reuse” means this request cannot use the remainder of that old cached prefix. It does not mean the server deletes the old cache. Another request with the original prefix may still hit it.

## The cache does not remember an independent passage

First distinguish two kinds of cache. Storing a question and its answer for direct reuse is answer caching. Prompt caching stores intermediate states produced while the model processes input. After a hit, the model still processes new input and generates this request's answer.

The [OpenAI documentation](https://developers.openai.com/api/docs/guides/prompt-caching) calls these intermediate states **key-value (KV) states**. Later computation can use them to refer to earlier tokens. They are not text passages that can be cut and pasted arbitrarily.

Why does earlier context affect later content? Start with the dependency direction: later positions can refer to earlier positions; earlier positions cannot read the future. This is the causal constraint used by typical autoregressive Transformers, described in [Attention Is All You Need](https://arxiv.org/html/1706.03762v7#S3.SS1). As computation proceeds through layers, a position's state incorporates preceding context. Identical text at that position does not establish that its old state remains valid.

Consider two requests:

```text
Old request: A → B → C → D
New request: A → B′ → C → D
```

The text of `C` is unchanged, but its context changed from `A, B` to `A, B′`. The cached state for `C` was computed in the old context and cannot simply follow the new one. Nor can the system skip ahead and reuse `D`.

We do not need to claim that every later vector necessarily changes. **The exact prefix no longer matches, so the old state cannot be treated as valid computation for this request.** `A`, however, never read the later `B`, so it remains potentially reusable.

That is only a content condition. A **cache breakpoint** marks the end of a prefix whose state a service can store or look up. Real services must find a previously written, unexpired cache at an allowed boundary. The actual hit can therefore be shorter than the identical text prefix.

## Predict first, then operate the machine

Choose an answer before opening the explanations.

1. **If you change only the end of Anthropic's top-level system prompt, can the earlier tool definitions still hit the cache?** Assume identical tools, a valid cache at the end of the tools, sufficient length, and a request that queries that boundary.
2. **If you change one token in reference material, can the unchanged current question after it independently reuse the old cache?** Assume there is no other cached prefix matching the new input.

<details markdown="1">
<summary>After exploring the figure: answer to question 1</summary>

**Yes.** Anthropic explicitly orders cached prefixes as `tools → system → messages`. A change to the system prompt does not retroactively alter the tool prefix. The question supplies the cache-existence, length, and lookup-boundary conditions. Without them, we could say only that the tools remain eligible for reuse, not that a hit is guaranteed.

Source: [Anthropic prompt structure and invalidation rules](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#what-invalidates-the-cache), checked on October 12, 2026. This is the provider's context ordering, not the order of fields in your request JSON.

</details>

<details markdown="1">
<summary>After exploring the figure: answer to question 2</summary>

**No.** The question's text is identical, but the preceding reference material changed. It is no longer the same complete prefix. Cached states after the old material cannot be reattached as independent fragments. Input must be processed after the reusable old boundary before a new answer is generated.

</details>

<iframe src="/labs/prompt-cache-prefix/?embed=1&lang=en" loading="lazy" title="Prefix machine: change a segment to explore cache hits and recomputation" style="display:block;width:100%;max-width:100%;height:1px;border:0;"></iframe>

[Open the interactive version full screen](/labs/prompt-cache-prefix/?lang=en)

<noscript markdown="1">

![The prefix machine stops reuse before the first difference; unchanged later text also needs recomputation](/assets/img/prompt-cache-prefix/prefix-machine-en.webp)

</noscript>

The machine arranges input as a continuous segmented belt. Selecting a segment changes its first token: the prefix before that point is reusable, while everything afterward needs processing again. Change the reference material, then move the edit to the system instructions or tool definitions. Watch why the unchanged second half also loses reuse.

The figure uses deterministic SVG drawn with the anatomy skill. Equal-length segments make the relationship visible; they do not represent a provider's chunk sizes. The model assumes a valid cache exists at every segment end and that this request can find each boundary. It isolates the effect of edit position rather than simulating an API's complete cache scheduling.

The displayed cost covers this request's cache reads and ordinary input processing only. It excludes warm-up, new cache writes, and output.

<details markdown="1">
<summary>How the figure's cost differs from a real bill</summary>

Relative cost uses processing the same input entirely at the ordinary input rate as its baseline. It counts only **cache reads and uncached input processing for this request**. Let `H` be the cached amount, `R` the amount requiring recomputation, and `r` the cache-read price relative to ordinary input:

```text
Relative input cost = (H × r + R) / (H + R)
```

The demo uses `r = 0.1`, the cache-read multiplier for Claude Sonnet 4.6 in [Anthropic's pricing table](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#pricing), checked on **October 12, 2026**. This is not a universal discount across models.

The figure excludes prior cache warm-up, does not simulate writing a new suffix into cache, and omits output charges. If the actual request writes a cache, calculate that cost at the applicable write rate. “How much input was recomputed?” and “What did the entire call cost?” are different quantities.

For Claude Sonnet 4.6, a **5-minute** cache write costs **1.25×** ordinary input, and a **1-hour** write costs **2×**, according to the same source checked on **October 12, 2026**. A real bill applies separate prices to reads, writes, and ordinary input, then adds output charges.

</details>

## Why identical prefixes can still miss

Back to the code-review agent: moving the timestamp to the end keeps the earlier content stable, but that alone does not prove caching is fixed.

A breakpoint at the end of a request does not mean the service automatically saved a cache at every intermediate position.

For example, suppose the first request writes a cache only at the end of “rules + project notes + code to review.” When the code changes next time, the shared rules are unchanged, but there may be no old cache ending at the shared rules. Placing a breakpoint at the end of stable content still requires a request that actually writes that prefix first.

**A stable prefix determines where reuse is possible. A previously written, discoverable, and still-live cache boundary determines where this request actually hits.**

Both providers describe misses where stable content exists but no corresponding prior write does. Their controls are not interchangeable:

| What to check | OpenAI | Anthropic Claude API |
|---|---|---|
| Matching unit | The fully rendered prefix, including platform instructions, tool definitions, developer messages, and history; relevant request settings may also change it | A cumulative prefix ordered `tools → system → messages`; a breakpoint covers everything before it |
| Boundary selection | GPT-5.6 and later support implicit and explicit breakpoints through `prompt_cache_options.mode` and `prompt_cache_breakpoint`; earlier models support implicit caching only, under different rules | Mark content blocks with `cache_control`; request-level automatic caching is also available, but its boundary need not coincide with the end of your stable content |
| Lookup | Find the longest available match among the query boundaries allowed for this request; do not assume every token position has a cache | Look backward from a breakpoint across content-block boundaries for prefixes written by earlier requests; the lookback range is limited |
| Minimum length | **1,024 visible input tokens** for GPT-5.6 and later; earlier models vary with request settings | Model-dependent; Claude Sonnet 4.6 requires **1,024 tokens**, which is not a rule for all Claude models |
| Lifetime | GPT-5.6 and later currently support `ttl: "30m"`, providing at least **30 minutes** after the latest write or reuse; older models have different retention rules | **5 minutes** by default, refreshed on a hit; **1 hour** is optional at a different write price |

Rules and numbers checked on **October 12, 2026**: [OpenAI's caching guide and model differences](https://developers.openai.com/api/docs/guides/prompt-caching#summary-of-model-differences), and Anthropic's [minimum lengths](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#cache-limitations) and [cache duration](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#1-hour-cache-duration). Model version numbers define the scope of these statements.

Do not apply an old tutorial's “OpenAI is entirely automatic and needs no breakpoints” or “all Claude caches have the same minimum length” to every current model. Identify the model and platform you actually call, then check their documentation.

## Apply the model to agent requests

For the opening agent, I would first change **content order within a role and message organization**, without changing instruction priority for caching:

```text
Tool definitions: keep names, descriptions, schemas, and order stable
System / developer instructions: stable review rules
Shared material in messages: relatively stable project notes
──── Establish a cache boundary at a suitable stable endpoint ────
Current material in messages: time, code under review, this turn's question
```

This is an organizational sketch, not portable request JSON. Tools, system instructions, and ordinary messages have distinct protocol positions. Do not demote higher-priority system constraints into user messages to obtain a longer cache prefix.

For an existing call chain:

1. **Find the first actual difference.** Compare tool definitions, system or developer instructions, historical messages, and relevant settings across two requests. Timestamps, random identifiers, or changed tool order can precede the current question. Do not compare only the final message, and do not log complete requests containing secrets.
2. **Make stable content a continuous prefix.** Put changing task material in suitable later messages. As an agent continues, unchanged history can form a prefix followed by new messages. Summarize, compact, or trim when needed; treat rewritten history as a new prefix and recheck caching. Do not retain unlimited history for the hit rate.
3. **Establish a readable cache at the stable endpoint.** Configure boundaries according to the current model, check minimum length, and complete an initial cache write. Do not add useless text to meet the threshold; confirm that the shared material belongs in context in the first place.
4. **Verify response usage.** Test identical resubmission, a tail-only change, and an early change separately. Read cache usage fields. Tail changes should preserve reuse of the stable prefix; early changes should reduce the corresponding hit. One faster response is not independent proof of a cache hit.

A cache miss is not a request failure. The normal path is to process input again and generate an answer.

<details markdown="1">
<summary>Troubleshooting: usage fields and the first checks after a miss</summary>

| API | Cache reads | What else to distinguish |
|---|---|---|
| OpenAI Responses API | `usage.input_tokens_details.cached_tokens` | Models with cache-write billing may also expose `usage.input_tokens_details.cache_write_tokens`; not all input has the ordinary input price |
| Anthropic Messages API | `usage.cache_read_input_tokens` | `cache_creation_input_tokens` counts writes; `input_tokens` counts input neither read from nor written to cache |

Anthropic's total input is `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. Its `input_tokens` alone is not the total.

Field sources: [OpenAI caching guide](https://developers.openai.com/api/docs/guides/prompt-caching) and [Anthropic usage explanation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#tracking-cache-performance), checked on October 12, 2026.

If an identical resubmission misses, first check that the cache was actually written, meets the model's minimum length, is still alive, and is queried at the original boundary. Then check the model, request settings, and provider routing or isolation conditions. `prompt_cache_key` cannot force different prefixes into the same cache.

After adding a template or tool definition, allow initial requests to establish a new cache. For persistent misses, locate the earliest difference, correct request organization or boundaries, and repeat the comparisons. Do not undo necessary safety rules merely to restore hits.

</details>

## Where the metaphor stops working

The machine explains dependency direction, not the server's physical internals. Preserve these boundaries:

| Machine element | Real mechanism | Difference |
|---|---|---|
| Equal-length segmented belt | Services read and write at supported content-block, message-end, or model-specific boundaries | A token is a model encoding unit, not one character; the instructional segments cannot predict an exact hit count after a token edit |
| Cursor that can stop at every segment end | Reuse requires a previously written boundary this request can find | Real requests need not have caches at every stable position; hits can be shorter or absent |
| Old records permanently on the desk | Caches have lifetimes and availability conditions | Identical text can require recomputation after expiration; OpenAI also states that routing to the machine holding a matching cache affects hits |
| Button changing only a segment's first token | Edits undergo tokenization; tools and settings can alter rendered context | One character edit need not change only one token; the application text diff need not equal the final prefix difference |
| One cost meter | Reads, writes, ordinary input, and output are billed separately, with model-specific multipliers | Warm-up, new writes, and output are omitted; the input reading is not the entire call's cost. See the cost explanation above |

Service boundaries come from the two official caching guides cited above; pricing distinctions come from [Anthropic's pricing table](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#pricing), all checked on **October 12, 2026**. The original Transformer paper supports the causal-dependency explanation; it does not imply that either provider has disclosed every implementation detail.

The timestamp caused trouble because it appeared too early, not because the edit was large. When hits fall, first identify **which genuinely readable cached prefix remains before the first difference**. That is more useful than counting how much of the prompt's text stayed unchanged.

## References

- [OpenAI: Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching): KV states, complete-prefix matching, model-generation differences, query boundaries, and lifetime.
- [Anthropic: Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching): cumulative prefixes, block breakpoints, invalidation hierarchy, model length thresholds, usage fields, and pricing.
- [Attention Is All You Need](https://arxiv.org/html/1706.03762v7#S3.SS1): decoder causal masking and attention, supporting the direction of context dependencies.
