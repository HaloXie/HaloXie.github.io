---
title: "PromptCode、ModelConfig 与路由：一次请求谁决定什么"
description: "从调用方契约出发，区分 Prompt 版本、模型配置和受限路由，建立 PromptWeave 第一阶段的最小执行边界。"
date: 2026-10-04 12:00:00 +0800
lang: zh-CN
translation_status: pending
lang-exclusive: [zh-CN]
page_id: promptweave-routing-boundaries
permalink: /learn/promptweave/promptweave-routing-boundaries/
categories: [AI]
tags: [prompt-engineering, ai-infrastructure, routing, software-architecture]
image:
  path: /assets/img/promptweave-routing-boundaries/cover.webp
  alt: "调用方提交路由事实，PromptCode、ModelConfig 和受限规则共同选择执行方案"
toc: true
---

这是 PromptWeave 系列第 2 篇。上一篇先划定了责任边界：调用方提供事实，PromptWeave 管理配置和执行，网关负责传输。本篇继续追问：**一次请求到底由谁决定使用哪套 Prompt 和模型？**

当前实现边界先说清楚：Phase 1 只实现 `promptCode` 直调；`scenarioCode` 属于 Phase 2。本篇提前介绍它，是为了说明未来如何增加场景选择，不代表它已经上线。

仍然使用同一个设计场景。解题产品已有一份稳定 Prompt，但希望在数学题上使用另一种模型，在网页端和移动端使用不同通道，还要给一小部分请求做实验。

例如，一次网页端数学题请求提交 `subject=mathematics`、`platform=web` 和 `assignmentKey=stable-user-key`。如果这些判断写在业务代码里，业务入口会自己选择 Model B；如果交给已发布规则，系统才能记录“是哪条规则选中了哪个 ModelConfig”。

如果把这些判断都写进业务代码，业务入口会逐渐变成一串 if-else；如果让配置系统读取完整业务对象，又会把业务上下文和 Prompt 管理绑在一起。更小的边界是：调用方提交归一化后的事实，配置系统只根据已发布规则选择方案。

## 两种入口，解决两种需求

第一阶段只需要 `promptCode`：调用方明确指定一个 Prompt。Phase 2 再增加 `scenarioCode`，让场景规则选择方案。两者不能同时提交：

| 入口 | 适用场景 | 系统如何处理 |
|---|---|---|
| `promptCode` | 指定 Prompt 的稳定入口 | 仍按当前已发布快照解析 Prompt revision、route target 和备用绑定 |
| `scenarioCode` | 按规则选择完整方案 | 读取 Scenario release，选择主方案和备用方案 |

保留 `promptCode` 很重要：已有调用方可以继续使用原契约，不会因为引入实验就被迫迁移。`scenarioCode` 也不改变 PromptAsset 的身份，它只是增加了一层“选择哪套执行方案”的入口。

## 调用方提交事实，系统负责有限选择

调用方可以提交已有实验标签、平台、学科和稳定分桶标识：

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

这些字段是路由事实，不是完整业务对象。PromptWeave 不读取任意 header，也不查询业务数据库来猜缺少的字段。

第一阶段的规则只允许有限操作：相等、集合包含、条件组合、优先级和稳定分桶。系统按优先级检查规则；优先级相同时按声明顺序检查，并选择第一条匹配项。规则不能执行 JavaScript 或任意表达式，也不能携带凭据。

缺少规则字段时按已发布规则定义的缺失字段策略处理，并记录原因；需要分桶却没有 `assignmentKey` 时，不能临时随机分配。默认 target 必须存在，具体缺失字段策略属于路由契约的一部分。这个限制牺牲了一点灵活性，却保住了可解释性。

## ModelConfig 为什么要和 Prompt 分开

Prompt 描述“告诉模型什么”，ModelConfig 描述“通过哪个服务和模型发送”。两者分开有两个直接收益：

1. 换模型不需要复制一份 Prompt；
2. 同一份 Prompt 可以在不同场景里使用不同模型配置。

Provider 决定底层协议，ModelConfig 再记录模型、通道和上游映射。`channel` 不能同时承担账号分组的含义；第一阶段只保留 `default` 和 `endless` 两个通道，后续如果需要账号分组，再增加独立字段。

最终，一次请求的最小选择链是：

```text
调用方事实
  → PromptCode / ScenarioCode
  → 已发布路由规则
  → Prompt revision + ModelConfig
  → ExecutionPlan
```

这个链条回答了“谁决定什么”：调用方提供事实，规则决定选择，Prompt revision 和 ModelConfig 决定具体执行，业务代码不需要复制配置逻辑。

下一篇会继续处理这条链的失败路径：**主调用失败后，怎样确保备用调用仍然是已经验证过的方案？**

上一篇：[Prompt 不只是文本：先划清配置系统的边界](/learn/promptweave/promptweave-prompt-lifecycle/) · 下一篇：[主调用失败后，怎样进入一条可信的备用路径](/learn/promptweave/promptweave-fallback-observability/)
