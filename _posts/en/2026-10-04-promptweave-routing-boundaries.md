---
title: "PromptCode, ModelConfig, and Routing: Who Decides What?"
description: "Separate prompt revisions, model configuration, and constrained routing to define the smallest reliable execution boundary for PromptWeave."
date: 2026-10-04 12:00:00 +0800
lang: en
page_id: promptweave-routing-boundaries
permalink: /learn/promptweave/promptweave-routing-boundaries/
categories: [AI]
tags: [prompt-engineering, ai-infrastructure, routing, software-architecture]
image:
  path: /assets/img/promptweave-routing-boundaries/cover-image2.webp
  alt: "Routing facts reach a controlled junction that selects an execution path"
toc: true
---

This is Part 2 of the PromptWeave series. Part 1 separated the responsibilities: callers supply facts, PromptWeave manages configuration and execution, and the gateway handles transport. Now we can ask: **who chooses the prompt and model for a request?**

The implementation boundary matters here: Phase 1 supports direct calls through `promptCode`. `scenarioCode` belongs to Phase 2. It appears in this article to explain how scenario selection can be added later, not to imply that it is already deployed.

Continue with the same design scenario. The problem-solving product has a stable prompt, but wants a different model for mathematics, different channels for web and mobile, and an experiment for a small share of requests.

A web mathematics request might submit `subject=mathematics`, `platform=web`, and `assignmentKey=stable-user-key`. If selection lives in business code, that entry point chooses Model B itself. If selection lives in published rules, the system can record which rule selected which ModelConfig.

Putting every decision in business code creates an expanding chain of conditionals. Letting the configuration system inspect complete business objects couples it to business context. The smaller boundary is to submit normalized facts and let published rules select a plan.

## Two entry points for two needs

Phase 1 needs only `promptCode`: the caller names a prompt explicitly. Phase 2 adds `scenarioCode` so scenario rules can choose a plan. A request must not submit both:

| Entry point | Purpose | Resolution |
|---|---|---|
| `promptCode` | Stable entry point for a specified prompt | Resolve the prompt revision, route target, and fallback binding from the currently published snapshot |
| `scenarioCode` | Rule-based selection of a complete plan | Read the Scenario release and choose the primary and fallback plans |

Keeping `promptCode` preserves the existing caller contract. Introducing experiments need not force every caller to migrate. Nor does `scenarioCode` change the identity of a PromptAsset; it adds a layer that chooses an execution plan.

## Callers supply facts; the system makes constrained choices

A caller can supply experiment tags, platform, subject, and a stable assignment key:

```json
{
  "routingContext": {
    "experimentTags": ["exp_x"],
    "subject": "mathematics",
    "platform": "web",
    "assignmentKey": "stable-user-key"
  }
}
```

These are routing facts, not a complete business object. PromptWeave neither reads arbitrary headers nor queries a business database to guess missing fields.

Phase 1 rules allow only a bounded set of operations: equality, set membership, condition composition, priority, and stable bucketing. Rules are checked by priority, with declaration order breaking ties; the first matching rule wins. Rules cannot execute JavaScript or arbitrary expressions, and cannot contain credentials.

Missing fields follow the missing-field policy defined by the published rules, with the reason recorded. If bucketing requires an `assignmentKey` and none is supplied, the system must not invent a random assignment. A default target must exist, and the exact missing-field policy is part of the routing contract. This gives up some flexibility in exchange for explainable behavior.

## Why ModelConfig is separate from the prompt

The prompt describes what to tell the model. ModelConfig describes which service and model to use. Separating them provides two benefits:

1. Switching models does not require copying a prompt.
2. The same prompt can use different model settings in different scenarios.

The Provider determines the underlying protocol. ModelConfig records the model, channel, and upstream mapping. A `channel` must not also mean an account group. Phase 1 keeps only the `default` and `endless` channels; account grouping, if needed later, requires its own field.

The smallest selection chain is:

```text
Caller facts
  → PromptCode / ScenarioCode
  → Published routing rules
  → Prompt revision + ModelConfig
  → ExecutionPlan
```

The caller supplies facts, rules make the selection, and the chosen prompt revision and ModelConfig define execution. Business code does not need its own copy of configuration logic.

Next we examine failure: **how can a fallback remain a previously validated plan when the primary call fails?**

Previous: [A Prompt Is More Than Text](/en/learn/promptweave/promptweave-prompt-lifecycle/) · Next: [A Trustworthy Fallback Path](/en/learn/promptweave/promptweave-fallback-observability/)
