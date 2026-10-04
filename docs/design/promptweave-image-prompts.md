# PromptWeave 配图 Prompt

## 公共风格块

用于 PromptWeave 系列的所有封面和正文信息图。每张图都在公共风格块后追加自己的构图、关系和准确文字。

```text
Use case: scientific-educational / infographic-diagram
Asset type: 1200×675 blog cover or explanatory diagram

Create a hand-drawn educational whiteboard infographic, similar to a carefully prepared online lesson board.
Use a warm off-white paper canvas with a subtle, regular light-gray dot grid.
Use dark charcoal ink with visibly hand-drawn variation: slightly uneven baselines, imperfect corners, double sketch lines, loose arrows, and small annotation strokes.
Use handwritten-style display lettering for headings, conclusions, and short annotations. Keep technical identifiers, API names, code-like labels, and dense explanatory text in a clear readable fallback font such as Arial Unicode MS or a system sans-serif.
Use the existing Halo Xie blog palette: warm paper #f6f0df or #f8f7f1, charcoal #30312c or #34352f, and no more than four low-saturation accents selected from muted blue, green, orange, and yellow.
Use colored marker strokes, underlines, translucent highlights, and small check marks to emphasize conclusions.
Organize the canvas like a lesson board: a small source/problem area, a central derivation or flow, and a conclusion/recap area when the subject needs a causal explanation.
Prefer short labels, arrows with unambiguous direction, small diagrams, and generous whitespace. Let the image explain one relationship or design decision; do not typeset the article.
Keep all nodes inside safe margins. Preserve clear reading at mobile width. No photorealism, no 3D rendering, no neon, no glassmorphism, no gradients, no decorative characters, no watermark, no logo, no invented metrics, no unsupported claims.
The diagram must preserve the exact supplied text, relationships, arrow directions, and branching semantics.
```

## 构图模板

```text
Composition: lesson-board layout.
Left: the concrete input, source material, or failure scenario.
Center: the reasoning chain, state transition, or architecture relationship.
Right: the conclusion, trade-off, or compact recap.
Use hand-drawn arrows and annotation lines to show causality.
If the image is a cover, reduce the number of nodes and keep one readable thesis.
If the image is a body diagram, keep the full relationship and put secondary details in small annotations.
```

## PromptWeave 系列第 1 图构图

```text
Text (verbatim):
PROMPTWEAVE · DESIGN NOTE
Prompt 不只是文本
先看一次“只改 Prompt”为什么会失控
原来的配置页
promptCode → Prompt + Model
后来又加了：
• 实验流量比例
• backup ID
问题：一次发布到底改了什么？
设计推导
Prompt 版本
模型配置
路由规则
单独改一项，会临时拼出一套新组合
所以发布单位要变成：
完整环境快照
一起验证 · 一起发布 · 一起恢复
读者带走
✓ 为什么要有 revision
✓ 为什么不能只改 Prompt
✓ 为什么要保留完整历史
✓ 为什么可以整体回滚
从问题出发 → 选择最小的可靠设计

Composition: a three-part lesson board. Put the old configuration page on the left, the Prompt revision → Model configuration → routing rule derivation in the center, and the reader takeaway card on the right. Use blue, green, and orange marker fills. Keep the causal arrows visible.
```

## PromptWeave 系列第 2 图构图：路由边界

```text
Text (verbatim):
PROMPTWEAVE · DESIGN NOTE
一次请求谁决定什么
先提交事实，再做受限选择
调用方事实
subject · platform · assignmentKey
PromptCode / ScenarioCode
受限路由规则
priority · 稳定分桶
执行方案
Prompt revision + ModelConfig
调用方提交事实 → 规则选择方案 → 系统执行
边界清楚，选择才可解释

Composition: a four-step whiteboard chain from left to right: caller facts, stable entry, typed ordered rules, and the final execution plan. Do not imply that PromptCode bypasses routing. Use a blue fact card, a yellow entry card, an orange rule card, and a green execution card. Keep the arrows directional and separate the caller-owned facts from PromptWeave-owned selection.
```

## PromptWeave 系列第 3 图构图：fallback 与 trace

```text
Text (verbatim):
PROMPTWEAVE · DESIGN NOTE
失败后进入可信路径
不临时拼接未经验证的组合
输入校验
主调用
满足触发策略
绑定的 fallback
同一个 runId
attempt 1 · attempt 2
校验失败 → 直接返回
主失败 → 顺序进入绑定 fallback

Composition: a lesson board with a small input-validation panel on the left, a main execution card in the center, and a fallback card on the right. Show main and fallback as two parallel attempt records under one runId, in sequence rather than parent-child nesting. Mark invalid input with a red stop stroke and the verified fallback with a green check.
```

## PromptWeave 系列第 4 图构图：ReleaseSnapshot

```text
Text (verbatim):
PROMPTWEAVE · DESIGN NOTE
把验证过的版本交付出去
发布与回滚都移动完整版本
旧快照
Prompt · Model · fallback · rules
测试验证
审批 hash
生产加载
新快照
加载失败 → 继续使用上一份成功快照
异常 → 回滚完整快照

Composition: a three-part lesson board. Put the complete old snapshot on the left, test and approval evidence in the center, and the production snapshot on the right. Show the publish arrow moving the entire snapshot forward and a separate rollback arrow returning to the previous complete snapshot. Do not draw a single-field Prompt-only rollback.
```

## 生成与验收记录

- 视觉参考：用户提供的教学白板截图；只取构图语言、点阵纸、手写注释和教学分区，不复制其中的内容、品牌或素材。
- 当前样板：`assets/img/promptweave-prompt-lifecycle/cover-handdrawn-whiteboard.svg`
- 当前样板生成方式：确定性 SVG；未调用 `image_gen`，因为本次会话没有可用的内置图片生成入口。
- 正式交付仍须导出为 1200 × 675 WebP，并逐张检查文字、箭头、裁切、移动端可读性和图片门禁。
