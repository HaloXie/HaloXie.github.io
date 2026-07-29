---
title: "Skills Teach AI to Do; Abilities Teach AI to Judge"
description: "The engineering evolution from Skill to Ability: how to help AI consistently inherit a class of judgments instead of merely following steps"
date: 2026-07-03 18:53:55 +0800
lang: en
page_id: from-skills-to-abilities
permalink: /posts/from-skills-to-abilities/
categories: [AI]
tags: [ai-agent, ability, skill, cognitive-architecture, acp, harness-engineering]
image:
  path: /assets/img/from-skills-to-abilities/ability-hero-en.webp
toc: true
---

> Project repository: `https://github.com/cognirail/from-skills-to-abilities`
>
> This article is not announcing an industry standard.
> It simply records an engineering judgment that has grown increasingly strong as I build my personal AI tooling system: **writing a bigger skill for AI does not naturally produce more reliable judgment.**

## The Conclusion First

In one sentence:

```text
Skill answers: when AI encounters a task, how should it proceed?
Ability answers: when AI faces a class of problems, how should it judge?
```

The two look similar, but they differ greatly in long-term maintenance.

I now prefer to see this as an evolutionary chain:

```text
Tool → Skill → Ability → Cognitive Architecture
```

![The capability evolution ladder from Tool and Skill to Ability and Cognitive Architecture](/assets/img/from-skills-to-abilities/evolution-en.webp)

| Layer | Problem it solves | Typical failure | Implementation form |
|---|---|---|---|
| Tool | Lets AI invoke external capabilities | It can invoke them but does not know when it should | Function / MCP |
| Skill | Lets AI complete a task by following steps | It finishes the steps, but the result is still wrong | `SKILL.md` |
| Ability | Lets AI inherit stable judgment | Its judgment is sound, but abilities override one another | `ABILITY.md` + references |
| Cognitive Architecture | Coordinates abilities, memory, rules, and tools within one system | As capabilities grow, context budgets tighten and instructions decay against one another | runtime + scheduling layer |

This article focuses on the transition in the middle: why move from Skill to Ability?

When I first used AI to write code and documents or run workflows, I naturally turned everything into a skill: for code review, follow these steps; for research, follow these steps; for project delivery, follow these steps.

That is certainly useful.
But after using this approach for a while, an obvious problem emerges:

**AI can follow steps, but it does not necessarily know what is good, what is bad, or why.**

Skills then grow larger and larger, accumulating rules, styles, examples, checklists, and lessons from the past. Eventually, a skill is no longer merely a workflow but a hybrid: half procedure, half judgment, and half knowledge.

Yes, that is three halves. That is exactly the problem.

## Who This Article Is For

If you only occasionally ask AI to write some code, this article may feel a little heavy.

But if you have encountered any of the following, it should resonate:

- You wrote many Claude / Codex / Cursor rules, yet AI still often forgets them.
- You wrote a skill for AI; it can execute the steps, but its output does not reflect your reviewer style.
- You introduced AI coding to a team and found that newcomers and AI share the same gap: neither has a judgment framework.
- You began maintaining prompts, rules, knowledge, and examples in separate files, but every invocation still depends on assembling context ad hoc.
- Multi-agent / multi-persona / multi-routing setups feel lively, but do not become significantly more reliable on long-running tasks.

I am not trying to solve every agent problem.
I want to solve a smaller, more specific one first:

**How can AI consistently inherit a class of judgments?**

## The Boundary of a Skill

My understanding of a skill is straightforward:

```text
Skill = procedure
```

It answers:

```text
When X happens, what steps should I follow?
```

For example:

- Produce a code review.
- Write a summary from meeting notes.
- Pull data and generate a report.
- Deliver a requirement through a defined workflow.

These are all excellent fits for skills because they have clear entry points, steps, outputs, and acceptance criteria.

But some things are not steps.

Consider "write code the way I do."
That is not a workflow problem. You cannot simply tell AI:

```text
1. Read the requirements
2. Write the code
3. Run the tests
```

It will certainly produce code, but that code will not necessarily resemble yours.

What truly determines whether it does is a more implicit set of judgments:

- When should a change be minimal, and when should it be a refactor?
- Controllers should only handle the protocol layer; business logic belongs in Services.
- External input should first be accepted as `unknown`, then narrowed with a type guard.
- Defaults should use `??`; `||` must not swallow `0`, `''`, or `false`.
- Errors must preserve the Error object and control-flow semantics; empty catches are forbidden.
- A method should encapsulate a complete problem instead of returning a bare ID that forces the caller to query again.

These are not "steps."
They are "judgments."

That made me realize that one class of capabilities should no longer be stuffed into skills.

## What Is an Ability?

I now call it an Ability.

Not because the word sounds more advanced, but because it genuinely occupies a different abstraction layer from a skill.

```text
Skill   answers: How do I do it?
Ability answers: What am I capable of?
```

A more engineering-oriented definition is:

```text
Ability = cognitive entry point + judgment framework + source routing + contextualization + validation contract
```

![An Ability combines a cognitive entry point, judgment framework, source routing, contextualization, and a validation contract into a cognitive closure](/assets/img/from-skills-to-abilities/cognitive-closure-en.webp)

That sounds abstract, so let us break it down:

| Component | Purpose |
|---|---|
| Cognitive entry point | Determines which capability to load for this class of problem |
| Judgment framework | Defines what is good, what is bad, and why |
| source routing | Identifies which rules / knowledge / checklists must be consulted |
| Contextualization | Explains what the same rule means in this ability's context |
| Validation contract | Proves that the judgment was actually followed this time |

This is not the same as a "bigger skill."

A bigger skill usually packs in more steps.
An Ability brings a class of judgments together cohesively.

## A Concrete Example: code-style-core

The first ability I have brought into a genuinely coherent form is called `code-style-core`.

Its goal is simple: help AI write Node/TypeScript backend code closer to my reviewer style.

It is neither a tutorial nor a Node.js beginner's guide.
It is closer to a "style contract":

```text
Good:
  Narrow external input with unknown + type guard
  Preserve valid zero values with ??
  Keep Controllers limited to the protocol layer
  Let Services encapsulate complete problems
  Preserve Error objects and control-flow semantics

Bad:
  Escaping through any
  Using || to swallow 0 / '' / false
  Assembling business branches in Controllers
  Returning bare IDs that force callers to query again
  Empty catch blocks or `${error}` that loses the stack
```

This is not about making AI memorize rules.

The real goal is for AI to ask itself, when facing a concrete change:

```text
What is the smallest problem this change addresses?
Which method should own the composite logic?
Is the return contract sufficient for downstream consumers?
Have the error semantics changed?
Did I introduce any new any / as / || / process.env?
What validation did I run?
```

That is reviewer style.

Writing code is merely the outcome; the order of judgment is the ability.

## How Does This Relate to "Employee Distillation" / Expert Judgment Distillation?

At this point, it is natural to think of the recently popular idea of "employee distillation."

That intuition is correct.
`code-style-core` is essentially a small-scale instance of employee distillation: extracting my tacit judgments as a reviewer so AI can inherit some of them when writing Node/TypeScript backend code.

But I do not want to equate Ability directly with employee distillation.

Many employee-distillation efforts end with:

- Interview notes
- SOPs
- prompts
- Persona cards
- Experience repositories
- checklists

All of these can be valuable, but they do not necessarily constitute a capability that an agent can load reliably.

I now prefer this distinction:

```text
Employee distillation = extracting a person's tacit experience and judgment.
Ability = packaging that class of judgments into a cognitive capability that AI can load, validate, and evolve.
```

In other words, employee distillation is more like an input method, while Ability is the engineering package.

If I merely write my experience into a prompt, it may become persona simulation: "write code like Minghao."
But if I turn it into an Ability, it must continue to answer:

```text
When should it load?
What are the judgment criteria?
Which files are authoritative sources?
How do we prove it actually took effect?
Where does it degrade when it fails?
```

That is also why I think it matters.

It does not mystify a person or turn experience into slogans.
It compresses a class of judgments that once existed only in review habits into a contract an agent runtime can use.

## Why Not Multi-Agent?

This is easy to conflate with another popular direction: multi-agent systems.

Multi-agent systems are certainly valuable. I use them too.
But they solve a different problem:

```text
Assign a task to different roles / perspectives / executors.
```

They do not automatically make judgment more stable.

Many so-called agents are essentially persona/template + routing:

```text
You are now a security expert
You are now an architect
You are now a test engineer
```

This works for short tasks.
But in long contexts, models suffer instruction decay. They do not forget only unimportant instructions; overall adherence declines together.

So what I care about now is not "how many agents there are," but:

```text
Have the critical judgments been compressed into a cognitive closure that can be loaded, validated, and degraded?
```

That is the difference between an Ability and prompt routing.

## The File Structure of an Ability

In the minimal public example in this repo, the structure looks roughly like this:

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

An ability package is not a single-file prompt. It is a small package:

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

This repo currently preserves a complete minimal closed loop; a full internal package can add framework conventions, project rules, validated lessons, review checklists, and more cross-platform adapters.

`ABILITY.md` is not responsible for cramming in all knowledge.
It declares:

- What concern this ability owns.
- When to use it and when not to use it.
- What its core judgments are.
- Which references must be read.
- How to validate it.
- How to project it across platforms.

This matters.

If one file duplicates every rule, it quickly becomes a new dumping ground.
An Ability should refer to external sources of truth, then add: "what does this rule mean within this capability?"

## Why Not Just Accumulate a Knowledge Base and Checklists?

There is another easy point of confusion:

If I already have rules, knowledge, memory, and checklists, why do I still need an ability?

My understanding is that they answer different questions.

```text
Knowledge / memory answers: What do I know?
Rules answer: Which constraints must I obey?
Checklist answers: What do I need to inspect?
Skill answers: What should I do when I encounter a task?
Ability answers: How should I judge when facing this class of problem?
```

Knowledge bases and checklists are both important.
But they do not form judgment by themselves.

For example, I can record in a knowledge base:

```text
Defaults should use ??; do not use || to swallow 0 / '' / false.
```

I can also put in a checklist:

```text
Check whether any new || was introduced.
```

But when AI faces a real change, it still needs to know:

```text
Is this rule relevant to the current task?
If so, does it affect the input boundary, configuration parsing, or the business return contract?
If violated, must it block delivery, or can it be recorded as a risk?
Which rule is the authoritative source?
What evidence ultimately demonstrates that it was handled?
```

That is where an ability fits.

It does not replace a knowledge base or a checklist.
It is more like a cognitive view between knowledge and action:

```text
Knowledge / rules / checklists
  → ability selects, interprets, and combines
  → skill or agent executes
  → validation verifies
```

That is why I do not want to put everything into one "super knowledge base."
The knowledge base stores facts and experience, the checklist acts as an acceptance plugin, and the ability organizes them into a judgment closure around one concern.

This is also how I understand "information cohesion":

It does not mean putting all information into one file.
It means giving the same class of judgments a clear home.

## ACP: A Direction Still in Its Early Days

Once you reach this point, the next question arises naturally:

If an ability is a cognitive capability package, can different harnesses load it?

MCP solves tool interoperability:

```text
Any LLM can invoke any tool.
```

What I want is closer to ACP:

```text
Any Harness can load any cognitive capability package.
```

![An ACP Ability Package is loaded, validated, and degraded by different Harnesses through a runtime contract](/assets/img/from-skills-to-abilities/acp-contract-en.webp)

For now, I call this ACP: Agentic Cognitive Protocol.

But this must be clear: it is not a finished standard.
At present, it is only an engineering direction.

A minimal ACP ability package must declare at least:

| Field | Meaning |
|---|---|
| identity | name / version / concern / maturity |
| applicability | triggers / file-patterns / do-not |
| context_budget | core token budget / reference loading strategy |
| sources | authoritative references to rules / knowledge / lessons / checklists |
| judgments | core invariants / redlines / quality criteria |
| validation | done_when / evidence_required / failure_action |
| projection | platform projections for claude / codex / openai / gemini, etc. |
| degradation | fallback to an L1 skill or L0 rules when L3 is unavailable |

What matters most to me now is not an elegant schema, but the runtime contract:

```text
When does it load?
How much does it load?
Where does the evidence come from?
How does it degrade on failure?
How do we know it actually works?
```

Without these, ACP is merely a static file format, not a protocol.

## What Comparing ruflo Taught Me

I have also looked at some open-source projects recently, including NomiFun, ruflo, Open WebUI, AnythingLLM, Khoj, and OpenHands.

NomiFun is more of a product-form inspiration: a local-first AI workstation that puts MCP, REST, browser/computer use, a secret vault, and WebUI into a desktop product.

ruflo is more of a harness/governance reference point, with MCP, hooks, memory, plugins, MetaHarness, security CI, and degradation modes.

But the biggest lesson these projects gave me was not "which architecture should I copy?"

Quite the opposite.

My conclusion is:

```text
NomiFun = product-form inspiration
ruflo   = harness / governance reference
Justin  = cognitive architecture / ability contract
```

In other words, learn from what others do well:

- tool registry
- security gate
- scorer
- degraded mode
- plugin package
- runtime observability

But I do not want to turn Justin into another agent harness.

A Harness gives a model hands and feet.
An Ability gives it a judgment framework.

These are two different things.

## What Remains Unsolved

This article is not a victory announcement.

Many problems remain unsolved:

- The Ability validator is still only planned.
- The L2 dynamic scheduler remains a transitional hook + contract design.
- The seven-dimensional scorer does not yet have a minimal executable prototype.
- `code-style-core` is still only a draft.
- ACP is not a standard; it is only a direction.

But I think the direction is already worth documenting.

Because it advances the problem from "how do I teach AI one more skill?" to:

```text
How do I help AI consistently inherit a class of judgments?
```

This question matters deeply to me.

As I lead a team, review code, and build my personal AI tooling system, the scarce resource is often not steps, but judgment.

Steps can be copied.
Judgment needs cohesion.

## Closing

If you have already written many skills, rules, and prompts, I suggest asking one question:

```text
Which things here are not actually procedures, but judgments?
```

If the answer is "many," then they may not belong in a skill anymore.

They may need to become an ability.

A small way to begin is to open your most frequently used skill / prompt / rule file and mark every sentence that is not a step.

If those sentences describe "what counts as good, what counts as bad, when to block, which source to consult, and how to prove it," they are ability candidates.

The point is not to invent a new term. It is to let AI do more than execute steps in long-running tasks—to reliably know:

```text
What is good.
What is bad.
Why.
How to prove it.
Where to fall back on failure.
```

That is my current understanding of Ability.

Placed back into the full chain, it occupies this position:

```text
Tools let AI act.
Skills let AI act by following a process.
Abilities let AI act with judgment.
Cognitive Architecture lets those judgments coordinate and evolve in a long-running system.
```

Skills teach AI to do.
Abilities teach AI to judge.

Project repository: `https://github.com/cognirail/from-skills-to-abilities`
