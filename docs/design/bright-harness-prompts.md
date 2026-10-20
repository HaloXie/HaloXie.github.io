# Harness 明快配图生成记录

2026-10-20：5张中文原创插图与5张对应英文编辑图。使用imagegen CLI，经已授权网关请求gpt-image-2；每张一次成功，1536×864、high、WebP、no-augment。中文generate，英文edit以对应中文新图为唯一输入。最终等比缩为1200×675，WebP质量80–88；逐张打开最终文件核验文字与关系。

新文件使用`-bright`后缀，避免把原英文SVG误认为模型图源。文章已更新引用。Codex案例图是示意工作流，具体统计留在独立确定性图和正文表格；原文件保留，旧尺寸豁免按实际引用移除。

## strategy

发布路径：`assets/img/harness-engineering/strategy-bright.webp`；1200×675，89606字节。

完整实际Prompt：

```text
Create a bright, friendly hand-drawn educational editorial illustration. Use a clean very light cream background (#FFF9E9), close to white, with only barely visible paper texture. Draw confident, crisp dark ink outlines with slight natural hand-drawn irregularity. Fill shapes with clean, luminous flat colors: sky blue, warm orange, sunny yellow and mint green, using at most four main accent colors. Keep the background neutral and pale; do not put a yellow or grey wash over the colored objects. Use white highlights and minimal light contact shadows, with clear separation between objects and background. The overall feeling is fresh, welcoming and easy to understand, like a well-illustrated learning notebook. Use large simple shapes, one obvious focal point, and generous breathing room. The main relationship must remain readable at a 360px-wide thumbnail. Landscape 16:9, with safe margins on all sides. No watermark, signature or extra logo.

Avoid graphite shading, pencil hatching, crosshatching, charcoal smudges, dirty grey midtones, sepia, aged parchment, vignette, heavy shadows, dark recesses, faded colors, photorealism, glossy 3D, neon colors, decorative clutter and tiny labels. Hand-drawn means ink contours and colored fills, not a pencil sketch. Do not add people unless they explain the subject. Do not invent technical claims or numbers.


Two layers of a software system: interchangeable model engines in the lower layer, a stable runtime frame above providing tools, context and checks. Verified experience flows into reusable knowledge cards beside the frame. Chinese title: 把工程经验沉淀在 Harness 中. Short labels only: 模型层; Harness 层; 工具; 上下文; 验证; 可复用经验. Show separation of responsibilities, not claims about market value or guaranteed advantage.
```

## compare-en

发布路径：`assets/img/harness-engineering/compare-en-bright.webp`；1200×675，81050字节。

完整实际Prompt：

```text
Localize image 1 into English only. Preserve every object, layout, bright colors, ink outline, relationship and arrow. Replace all Chinese reader-facing text, leaving no Chinese characters. Use short clear English labels sized to fit, with safe margins. No watermarks. 裸调 LLM = Bare LLM call; 请求 = Request; 回复 = Response; 工具 = Tools; 记忆 = Memory; 验证 = Verification; 反馈 = Feedback
```

## cover-en

发布路径：`assets/img/harness-engineering/cover-en-bright.webp`；1200×675，96424字节。

完整实际Prompt：

```text
Localize image 1 into English only. Preserve every object, layout, bright colors, ink outline, relationship and arrow. Replace all Chinese reader-facing text, leaving no Chinese characters. Use short clear English labels sized to fit, with safe margins. No watermarks. 模型是引擎 = The model is the engine; Harness 是驾驭框架 = Harness provides control; 人类掌舵，Agent 执行 = Humans steer, agents execute; 工具袋 = Tools; 记忆袋 = Memory; 验证仪表 = Verification
```

## strategy-en

发布路径：`assets/img/harness-engineering/strategy-en-bright.webp`；1200×675，93284字节。

完整实际Prompt：

```text
Localize image 1 into English only. Preserve every object, layout, bright colors, ink outline, relationship and arrow. Replace all Chinese reader-facing text, leaving no Chinese characters. Use short clear English labels sized to fit, with safe margins. No watermarks. 把工程经验沉淀在 Harness 中 = Retain Engineering Experience in the Harness; Harness 层 = Harness Layer; 工具 = Tools; 上下文 = Context; 验证 = Verification; 可复用经验 = Reusable Experience; 模型层 = Model Layer
```

## codex-case-en

发布路径：`assets/img/harness-engineering/codex-case-en-bright.webp`；1200×675，95132字节。

完整实际Prompt：

```text
Localize image 1 into English only. Preserve every object, layout, bright colors, ink outline, relationship and arrow. Replace all Chinese reader-facing text, leaving no Chinese characters. Use short clear English labels sized to fit, with safe margins. No watermarks. Translate all Chinese into concise English. Title: Humans Design the Environment; Agents Write Code. Intent, Scope and Constraints, Acceptance Criteria, Test Bench, Repository. Clearly hypothetical task-management example: create tasks, set deadlines, mark complete, list correctly, handle edge cases. Bottom stages: Human Design; Agent Implementation; Verify Before Merge. Failure loop: Not Passed; Return Feedback and Refine Criteria. Do not add numbers or claims.
```

## six-components-v2

发布路径：`assets/img/harness-engineering/six-components-v2-bright.webp`；1200×675，76026字节。

完整实际Prompt：

```text
Create a bright, friendly hand-drawn educational editorial illustration. Use a clean very light cream background (#FFF9E9), close to white, with only barely visible paper texture. Draw confident, crisp dark ink outlines with slight natural hand-drawn irregularity. Fill shapes with clean, luminous flat colors: sky blue, warm orange, sunny yellow and mint green, using at most four main accent colors. Keep the background neutral and pale; do not put a yellow or grey wash over the colored objects. Use white highlights and minimal light contact shadows, with clear separation between objects and background. The overall feeling is fresh, welcoming and easy to understand, like a well-illustrated learning notebook. Use large simple shapes, one obvious focal point, and generous breathing room. The main relationship must remain readable at a 360px-wide thumbnail. Landscape 16:9, with safe margins on all sides. No watermark, signature or extra logo.

Avoid graphite shading, pencil hatching, crosshatching, charcoal smudges, dirty grey midtones, sepia, aged parchment, vignette, heavy shadows, dark recesses, faded colors, photorealism, glossy 3D, neon colors, decorative clutter and tiny labels. Hand-drawn means ink contours and colored fills, not a pencil sketch. Do not add people unless they explain the subject. Do not invent technical claims or numbers.


A central Agent connected to six equally weighted modules in a clear circular layout. Chinese title: Harness 的六类组件. Six labels exactly: 工具; 记忆; 上下文管理; 任务编排; 验证过滤; 自我修正. Use a simple appropriate icon per module and a clearly directed feedback loop. These are six categories of engineering responsibilities, not a strict mandatory hierarchy. No other text or numbers.
```

## compare

发布路径：`assets/img/harness-engineering/compare-bright.webp`；1200×675，80632字节。

完整实际Prompt：

```text
Create a bright, friendly hand-drawn educational editorial illustration. Use a clean very light cream background (#FFF9E9), close to white, with only barely visible paper texture. Draw confident, crisp dark ink outlines with slight natural hand-drawn irregularity. Fill shapes with clean, luminous flat colors: sky blue, warm orange, sunny yellow and mint green, using at most four main accent colors. Keep the background neutral and pale; do not put a yellow or grey wash over the colored objects. Use white highlights and minimal light contact shadows, with clear separation between objects and background. The overall feeling is fresh, welcoming and easy to understand, like a well-illustrated learning notebook. Use large simple shapes, one obvious focal point, and generous breathing room. The main relationship must remain readable at a 360px-wide thumbnail. Landscape 16:9, with safe margins on all sides. No watermark, signature or extra logo.

Avoid graphite shading, pencil hatching, crosshatching, charcoal smudges, dirty grey midtones, sepia, aged parchment, vignette, heavy shadows, dark recesses, faded colors, photorealism, glossy 3D, neon colors, decorative clutter and tiny labels. Hand-drawn means ink contours and colored fills, not a pencil sketch. Do not add people unless they explain the subject. Do not invent technical claims or numbers.


Two panels comparing a bare model call with a designed runtime. Left: a model engine receiving a request, with loose unconnected tools nearby; title 裸调 LLM. Right: the same engine inside an organized frame connected to tools, memory, verification and a feedback loop; title Harness Engineering. Short Chinese labels only: 工具; 记忆; 验证; 反馈. The contrast is engineered support, not greater model intelligence; no numbers or claims of guaranteed success.
```

## six-components-v2-en

发布路径：`assets/img/harness-engineering/six-components-v2-en-bright.webp`；1200×675，77516字节。

完整实际Prompt：

```text
Localize image 1 into English only. Preserve every object, layout, bright colors, ink outline, relationship and arrow. Replace all Chinese reader-facing text, leaving no Chinese characters. Use short clear English labels sized to fit, with safe margins. No watermarks. Harness 的六类组件 = Six Harness Responsibilities; 工具 = Tools; 记忆 = Memory; 上下文管理 = Context; 任务编排 = Orchestration; 验证过滤 = Verification; 自我修正 = Self-correction
```

## codex-case

发布路径：`assets/img/harness-engineering/codex-case-bright.webp`；1200×675，88256字节。

完整实际Prompt：

```text
Create a bright, friendly hand-drawn educational editorial illustration. Use a clean very light cream background (#FFF9E9), close to white, with only barely visible paper texture. Draw confident, crisp dark ink outlines with slight natural hand-drawn irregularity. Fill shapes with clean, luminous flat colors: sky blue, warm orange, sunny yellow and mint green, using at most four main accent colors. Keep the background neutral and pale; do not put a yellow or grey wash over the colored objects. Use white highlights and minimal light contact shadows, with clear separation between objects and background. The overall feeling is fresh, welcoming and easy to understand, like a well-illustrated learning notebook. Use large simple shapes, one obvious focal point, and generous breathing room. The main relationship must remain readable at a 360px-wide thumbnail. Landscape 16:9, with safe margins on all sides. No watermark, signature or extra logo.

Avoid graphite shading, pencil hatching, crosshatching, charcoal smudges, dirty grey midtones, sepia, aged parchment, vignette, heavy shadows, dark recesses, faded colors, photorealism, glossy 3D, neon colors, decorative clutter and tiny labels. Hand-drawn means ink contours and colored fills, not a pencil sketch. Do not add people unless they explain the subject. Do not invent technical claims or numbers.


An editorial illustration of engineers specifying intent and acceptance criteria on a whiteboard, a code-generating assistant producing code pages, and a test bench checking those pages before they enter a software repository. A feedback arrow returns failed checks to the workbench. Short Chinese title: 人类设计环境，Agent 编写代码. Do not render any statistics, percentages, team counts or performance claims. No real company logo.
```

## cover

发布路径：`assets/img/harness-engineering/cover-bright.webp`；1200×675，96700字节。

完整实际Prompt：

```text
Create a bright, friendly hand-drawn educational editorial illustration. Use a clean very light cream background (#FFF9E9), close to white, with only barely visible paper texture. Draw confident, crisp dark ink outlines with slight natural hand-drawn irregularity. Fill shapes with clean, luminous flat colors: sky blue, warm orange, sunny yellow and mint green, using at most four main accent colors. Keep the background neutral and pale; do not put a yellow or grey wash over the colored objects. Use white highlights and minimal light contact shadows, with clear separation between objects and background. The overall feeling is fresh, welcoming and easy to understand, like a well-illustrated learning notebook. Use large simple shapes, one obvious focal point, and generous breathing room. The main relationship must remain readable at a 360px-wide thumbnail. Landscape 16:9, with safe margins on all sides. No watermark, signature or extra logo.

Avoid graphite shading, pencil hatching, crosshatching, charcoal smudges, dirty grey midtones, sepia, aged parchment, vignette, heavy shadows, dark recesses, faded colors, photorealism, glossy 3D, neon colors, decorative clutter and tiny labels. Hand-drawn means ink contours and colored fills, not a pencil sketch. Do not add people unless they explain the subject. Do not invent technical claims or numbers.


Title: Harness Engineering. A friendly mechanical horse illustrates a capable model, and its harness, reins, tool pouch, memory pouch, verification gauge and a human operator illustrate deliberate control. Use short Chinese labels: 模型是引擎; Harness 是驾驭框架; 人类掌舵，Agent 执行. Keep the mood cheerful and clean, bright blue, orange, yellow and mint accents. No branding or generator watermark.
```
