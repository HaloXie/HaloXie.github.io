---
title: "Shared Memory for Agents: Control Writes Before Promising Improvement"
description: "A cross-harness experience-memory design using hindsight: how memories enter context, which rules remain outside it, and the gates between experiment and daily use."
date: 2026-09-28 12:00:00 +0800
lang: en
page_id: hindsight-shared-memory
categories: [AI]
tags: [agent, memory, hindsight, architecture, retrieval]
permalink: /posts/general/hindsight-shared-memory/
image:
  path: /assets/img/hindsight-shared-memory/cover-en.webp
  alt: "Experience cards pass a verification gate before entering shared memory and task context"
toc: true
---

Suppose I corrected a judgment in Claude Code yesterday: new evidence had invalidated an old approach. Today I switch to Codex, and it recommends that old approach from a different set of memories. Automatically summarizing both conversations into a shared store would not necessarily solve this. It might spread the outdated conclusion to more sessions.

I want to reuse experience across tools, but shared memory can also widen the spread of errors. Here, a *harness* is the tool that hosts an agent, such as Claude Code, Codex, or Pi.

**Shared memory is valuable when it brings sourced experience into context while leaving judgment rules in Git—not simply when it stores more.**

I chose [hindsight](https://github.com/vectorize-io/hindsight) to test this approach. It is a self-hostable memory system that processes incoming material with an LLM and retrieves relevant memories later. As of September 28, 2026, implementation had not started: Phase 0 was still waiting for connectivity to the deployment host. What follows is a design and experiment plan, with no measured outcomes yet.

## Separate the framework, inputs, and outcome

I do not treat the memory store as another agent that makes decisions for me. A task involves at least three layers:

| Layer | Question it answers | Authoritative source | Role of shared memory |
| --- | --- | --- | --- |
| Framework | How should a judgment be made? | Baseline, skills, Git | Leave it untouched |
| Inputs | Which facts and precedents inform the judgment? | Source files, decision records, corrected experience | Retrieve them |
| Outcome | What is the judgment this time? | The current output | Do not generate it directly |

This boundary determines the integration: hindsight supplies relevant experience to context, and the caller controls how much to include. It cannot change decision priorities, non-negotiable rules, or task classification.

![Shared memory supplies judgment inputs while Git remains authoritative for the judgment framework](/assets/img/hindsight-shared-memory/judgment-layers-en.webp)

## Why I am not automatically ingesting whole conversations

The easiest integration would install the official Coding Agents package and automatically retain every session. I have not adopted it. Conversations mix unverified guesses, temporary instructions, credential traces, and conclusions already overturned. Automatic ingestion risks treating “something was said” as “something deserves reuse.”

Instead, writes pass an explicit gate: only verified facts with sources may enter memory. Every fact needs at least its content, a source location, and a quotation from that source. This gives up some automation while preserving traceability and the ability to remove material.

`reflect` generates answers from memories; I will not use it for decision questions. I retrieve memories and let the current agent judge them under the existing rules.

## Guard each of hindsight's three judgment points

hindsight is not free of judgment. It uses models or ranking algorithms at least at these three points:

| Stage | What it does | Constraint in this design |
| --- | --- | --- |
| retain | Extracts facts, entities, and time information | Submit only verified, sourced facts; extraction must remain traceable to the original |
| consolidation | Derives observations from multiple facts and records conflicts | Preserve quotations for derived observations; verify important conclusions against the source |
| recall | Retrieves through multiple paths, fuses results, and reranks | Apply a minimum score; return nothing below it rather than forcing an injection |

“Return nothing” means supplying no memory, not terminating the task. The agent can still work from current material; it should state that it cannot answer only when the available material is insufficient. The [Recall API documentation](https://hindsight.vectorize.io/developer/api/recall) warns that scores are not confidence values calibrated across queries: a fixed threshold can exclude correct results. Phase 0 must inspect the actual distribution before calibrating `reranker` or `final` thresholds. Setting a minimum score is not itself proof of safety.

## Replace storage, not domain rules

The target architecture places hindsight in the infrastructure layer. The domain layer defines only a memory interface. Its implementation could use hindsight or return to grep over Markdown without rewriting skills or domain rules.

The intended task path is: receive a question → select a bank by project → retrieve and filter → inject into context → let the current agent judge. At task completion, verify facts, redact sensitive material, and write.

<details markdown="1">
<summary>Interface sketch: keep storage implementation in infrastructure</summary>

```ts
export interface MemoryPort {
  recall(query: string, opts?: { minScore?: number }): Promise<Recalled[]>;
  ingest(fact: VerifiedFact): Promise<void>;
}

export interface VerifiedFact {
  text: string;
  source: string;
  quote: string;
  context: 'personal' | 'team';
}
```

This is a read/write contract sketch, not a direct hindsight SDK example. `Recalled` represents the integration layer's result type. `minScore` is a name in this interface, not a native API field; mapping it to recall parameters such as `min_scores` still requires implementation and testing.

</details>

A bank stores a collection of memories. Callers do not choose one arbitrarily: integration hooks route to the personal or team bank using project context. These hooks provide common logic around tasks: bank selection at entry, redaction before writes, retrieval when a question arrives, and verification before writing at completion. This layer is not implemented yet and is a prerequisite for daily use. Separate banks do not automatically establish permission isolation; access controls need independent verification.

## What moves, and what remains authoritative

The first candidates are experience and indexes, not rule files:

| Treatment | Material | Reason |
| --- | --- | --- |
| Replace | Claude Code memory and Codex native memories | Retrieve relevant material instead of loading the whole collection each time |
| Add | Pi integration | Give all three harnesses the same experience entry point |
| Index only | Decision records, roadmap history, lessons | Keep originals in Git so the index can be rebuilt |
| Leave untouched | Baseline, skills, glossary, exact code facts | These are judgment rules or authoritative facts requiring precise locations |

Git remains authoritative for rules and indexed documents; that part is rebuildable. Native memories must be backed up, separated by project, and checked after migration. “Documents can be rebuilt” does not mean “deleting the entire database loses nothing.” Version histories of derived observations and persistent answers could still be lost.

## When new evidence overturns an old conclusion

Ranking recent memories first cannot solve the opening example. The [observations documentation](https://hindsight.vectorize.io/developer/observations) describes source references, consolidation, and stale states. Derived observations may be outdated before new material is consolidated. Conflicts should preserve the history of change rather than silently overwrite the past.

I plan three integration constraints: derived material needs sources and quotations; source updates trigger checks for stale derivatives; source deletion requires recomputing or deleting dependent material. Important judgments still require checking originals. Because this design does not use reflect for decisions, its stale-content behavior cannot be assumed to protect ordinary recall injection automatically.

Recency weighting changes ranking; it is neither deletion nor a TTL or automatic forgetting mechanism. The opening case needs to retrieve *why the old conclusion was overturned*, not merely move that conclusion down the list.

Turning experience into a rule requires another gate: it must hold in at least two unrelated scenarios before a rule change is proposed. Only after I confirm it does the change enter a baseline or skill in Git. The memory store cannot promote it by itself.

![Verified corrections inform future retrieval; experience that holds across scenarios still needs human confirmation before becoming a rule](/assets/img/hindsight-shared-memory/two-level-loop-en.webp)

## Expose the service remotely, not the database

The plan is to run the service on an always-on small computer, accessed through a private Tailscale network. Only administrative SSH and the hindsight API would be remotely accessible. Postgres and its pgvector extension would bind to loopback. The console would remain off by default and bind only to a private-network address when needed.

```text
Other devices ── Tailscale ──▶ hindsight API
                                  │
                                  └──▶ 127.0.0.1:5432 Postgres + pgvector
```

The API would use a dedicated authentication key, read from the system Keychain into the startup environment, never written to a file or included in command-line arguments. The first Phase 0 check is that a request without a key is rejected and one with a key succeeds. If authentication fails, all subsequent ingestion stops.

Chinese retrieval has two open questions: an English-oriented default embedding model cannot simply be reused, and BM25's Chinese tokenization needs testing. These are experimental questions, not established conclusions.

Self-hosting also does not mean that all content stays local. The current design plans to use the DeepSeek API for LLM processing, so extraction material would pass through an external model service. Redaction before writes applies to the personal bank; the permitted scope for team wiki processing still needs separate confirmation.

## Four phases, each with an exit criterion

Rather than connect the service to every session immediately, I plan four phases:

1. **Phase 0: offline experiment.** Create only a personal bank. Import decision, history, and experience records. Compare hindsight recall with a grep control using 30 questions, recording accuracy, citation accuracy, refusal rate, tokens, latency, and retain cost.
2. **Phase 1: read-only injection.** Start with Claude Code only, retrieving at `UserPromptSubmit` and injecting context. Record result count, tokens, and minimum score. Observe for two weeks; consider the next phase only if extra token use is acceptable and no incorrect retrievals occur. The cost ceiling remains to be defined.
3. **Phase 2: controlled writes.** Admit only verified facts through the quality gate and integrate all three harnesses. Disable native memory entry points only after backup and migration checks pass. Compare correction counts across four weeks before and after integration, counting cases where the same issue is corrected at least twice.
4. **Phase 3: team knowledge bank.** Create a separate bank containing wiki outputs, not raw code. Give members individual tokens and demonstrate that the two banks cannot see each other. Confirm the scope of material sent to the external extraction model before import.

The proposed Phase 0 threshold is at least a 15-percentage-point accuracy improvement over grep, or equal accuracy with both token use and latency reduced to at most one third. These thresholds await confirmation. The experiment report will inform a go/no-go decision; they are neither fixed acceptance metrics nor achieved results.

The comparison concerns the main model's final answers, not retrieval hits alone. How refusal questions are scored and how citations are verified must be defined when reviewing the question set, not changed after seeing results.

<details markdown="1">
<summary>Phase 0 checklist and later evidence records</summary>

1. I confirm host connectivity and the availability of OrbStack and Docker Compose, and personally configure the required service keys in Keychain.
2. Start Postgres and the API with restricted listen addresses and Tailscale ACLs. Verify rejection without a key and success with one. Stop and fix configuration if this fails; import no material.
3. Create a personal bank, import sourced decisions, history, and experience, and record total retain tokens and cost. Test candidate multilingual embeddings alongside Chinese keyword retrieval.
4. I review one shared set of 30 questions: 10 on current conclusions, 10 on reasons and sources, 5 requiring refusal, and 5 on chronology. Group A gives recall results to the main model; Group B has the same model grep the same files. Keep the prompt framework identical and record each answer and citation.
5. Write the report and decide go/no-go. For each later phase, append the date, actual actions, evidence links, result, lessons, and next step. Record gaps and rollback if a gate fails; do not prefill successful outcomes.

Deployment would use standalone PostgreSQL rather than an embedded database as the operating setup. The backup plan is daily `pg_dump` with seven local copies. Neither plan has been executed and verified yet.

</details>

## Failure and rollback

The design specifies failure paths before integration:

- Retrieval service unavailable: skip injection and continue the current task.
- Write failure: record it without automatic retry.
- Score below threshold: return nothing instead of injecting weakly related material.
- Experiment below threshold: remove the deployment and volume, rebuilding from Git originals.
- Stop Phase 1: remove retrieval hooks. Stop Phase 2: restore native memories from pre-migration backups. Stop Phase 3: remove the team bank. Check backups and rebuildable sources before cleanup.

## Decisions still open before integration

The integration mechanism is not final. My recommendation is custom integration hooks; another option is the official package with `retainSessions` disabled and retrieval retained. The prohibition on automatically ingesting whole conversations remains. Whether Phase 0 should start on a laptop, which threshold to adopt, and what Phase 3 may send to external models each require confirmation.

The eventual test is not simply whether the memory store answers questions. It is whether experience becomes more reusable without spreading errors further. **Clear boundaries are what give shared memory a chance to make an agent better with use.**

## References

- [hindsight source](https://github.com/vectorize-io/hindsight): project scope and self-hosting entry point.
- [Observations](https://hindsight.vectorize.io/developer/observations): derived observations, sources, and consistency.
- [Retrieval](https://hindsight.vectorize.io/developer/retrieval): retrieval and ranking mechanisms.
- [Recall API](https://hindsight.vectorize.io/developer/api/recall): retrieval parameters and minimum-score constraints.
- [Reflect](https://hindsight.vectorize.io/developer/reflect): generating answers from memory; not used for decisions here.
- [Mental models](https://hindsight.vectorize.io/developer/mental-models): persistent answers and their maintenance; whether this design needs consumers remains to be seen.
