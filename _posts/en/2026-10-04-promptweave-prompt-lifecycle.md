---
title: "A Prompt Is More Than Text: Define the Configuration Boundary First"
description: "Follow a configuration page that gradually grows out of control to decide what a prompt system should own and why business context belongs elsewhere."
date: 2026-10-04 10:00:00 +0800
lang: en
page_id: promptweave-prompt-lifecycle
permalink: /learn/promptweave/promptweave-prompt-lifecycle/
categories: [AI]
tags: [prompt-engineering, ai-infrastructure, software-architecture]
image:
  path: /assets/img/promptweave-prompt-lifecycle/cover-image2.webp
  alt: "A prompt joins other configuration pieces in a versioned package before execution"
toc: true
---

This is Part 1 of the PromptWeave series. Before choosing database tables or designing screens, we need to answer a more basic question: **what should a prompt system manage?**

This series describes an architectural design and its implementation boundaries, not capabilities already deployed in production. The example below is a design scenario, not a reported production incident.

Imagine a problem-solving product that starts with one configuration page. A caller passes a `promptCode`; the system reads the prompt and model configuration, then sends a request. Over time, the team adds three capabilities: switching the model for the same prompt, running an A/B experiment between prompts, and using a fallback when the primary model fails.

Each addition looks like one more field: a model name, a traffic percentage, or a backup ID. Together, however, these fields change how a request behaves. There is still no single object that answers, “What exactly is included in this release?”

That leaves several questions:

- Does changing the prompt require testing the model combination again?
- Is a backup resolved by name or pinned to a specific revision?
- Did production load the same rules that were tested?
- Will restoring only the prompt restore the old behavior?
- Can we reconstruct what a completed request actually used?

The running failure scenario is simple: testing validates “Prompt B + Model B + B's backup + experiment rules,” but the production release switches only the prompt to B. Production may still use Model A and the old fallback. The configuration screen shows the new prompt, while the runtime executes a combination that was never tested.

If the answers depend on the release operator's memory, the system does not yet have a reliable version boundary.

## Author configuration and business context have different owners

PromptWeave should own prompt versions, model invocation settings, constrained routing, input validation, and execution records. It should not assemble complete business objects for callers or query business databases to fill in missing context.

| Participant | Owns | Does not own |
|---|---|---|
| Caller | Variables, images, and normalized routing facts | Handing the configuration system a complete business object |
| PromptWeave | Prompt versions, model settings, rules, execution, and audit records | Querying business databases or grading business answers |
| LLM gateway | Provider transport, credentials, and upstream retries | Prompt experiments and releases |
| Evaluator | Running datasets and producing comparison evidence in a later phase | Promoting results directly to production |

These boundaries give each participant a clear responsibility. The caller knows what to submit; PromptWeave knows what it may change; neither the gateway nor the evaluator bypasses the release process.

## Prompts need a lifecycle

A prompt needs more than a single “current text” state:

```text
Author edits
  → Save a revision
  → Validate input declarations
  → Execute against a model
  → Record the result
  → Include it in a test release
```

A released revision must not be edited in place. Authors can continue changing a draft, but a revision referenced by test or production must remain immutable. Otherwise, historical executions become impossible to explain reliably, and rollback becomes an attempt to reconstruct an approximate configuration.

This is what distinguishes a prompt from an ordinary text template. Its text affects the model input, but the model, protocol, channel, and fallback also affect execution. Saving only the text does not preserve the behavior of a call.

## What the first phase should deliver

Phase 1 should establish one narrow end-to-end path:

```text
PromptAsset
  → immutable revision
  → ModelConfig
  → typed route
  → ExecutionPlan
  → main / fallback
  → release snapshot
```

`PromptAsset` contains the authored prompt and its input declarations. `ModelConfig` specifies the service and model used to send a request. `ExecutionPlan` binds the primary and fallback calls. A release snapshot captures a complete version that can be tested, approved, loaded, and restored.

Phase 1 excludes automatic health-based routing, arbitrary rule expressions, and automatic promotion. First prove that one version can be explained, executed, and recovered.

The next question is: **when prompt versions, model settings, and routing rules are separate, who chooses the combination for an individual request?**

Next: [PromptCode, ModelConfig, and Routing: Who Decides What?](/en/learn/promptweave/promptweave-routing-boundaries/)
