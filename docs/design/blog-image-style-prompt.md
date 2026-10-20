# 博客配图 Prompt：明快手绘（已确认）

2026-10-19：明昊确认第二张明快样图效果更好，要求后续图片统一此风格并重绘之前的图片。浅奶油底、清晰墨线和明快色块是后续默认方向；旧图生成记录保留原始 Prompt，不改写历史。

## 复用风格 Prompt

```text
Create a bright, friendly hand-drawn educational editorial illustration. Use a clean very light cream background (#FFF9E9), close to white, with only barely visible paper texture. Draw confident, crisp dark ink outlines with slight natural hand-drawn irregularity. Fill shapes with clean, luminous flat colors: sky blue, warm orange, sunny yellow and mint green, using at most four main accent colors. Keep the background neutral and pale; do not put a yellow or grey wash over the colored objects. Use white highlights and minimal light contact shadows, with clear separation between objects and background. The overall feeling is fresh, welcoming and easy to understand, like a well-illustrated learning notebook. Use large simple shapes, one obvious focal point, and generous breathing room. The main relationship must remain readable at a 360px-wide thumbnail. Landscape 16:9, with safe margins on all sides. No watermark, signature or extra logo.

Avoid graphite shading, pencil hatching, crosshatching, charcoal smudges, dirty grey midtones, sepia, aged parchment, vignette, heavy shadows, dark recesses, faded colors, photorealism, glossy 3D, neon colors, decorative clutter and tiny labels. Hand-drawn means ink contours and colored fills, not a pencil sketch. Do not add people unless they explain the subject. Do not invent technical claims or numbers.
```

每张追加：核心命题、对象关系、构图、必要图内文字及语言。无文字概念封面可中英共用；精确流程仍单独核验节点与箭头。交付保持1200×675 WebP，目标100KB以内。

## 本次试图：发布与回滚完整快照

在复用 Prompt 后追加以下内容，完整拼接内容即实际生成 Prompt：

```text
Subject: releasing and rolling back a complete configuration snapshot. Show two intact configuration packages side by side on a simple clean shelf, with equal visual weight. The left package is predominantly sky blue and the right package predominantly warm orange. Each package contains the same three clearly visible items grouped together: a white document, a gear, and a tiny branching connector. The document, gear and connector must read as one inseparable package. A single large selector lever below the shelf can point toward either whole package; use two simple directional marks to show the alternatives, not a continuous production conveyor. No loose component swapping. Keep the shelf and package interiors bright and open, without dark cavities. Minimal, charming ink-and-flat-color illustration, bold enough for a blog thumbnail. No text, letters or numbers anywhere. Do not add people, robots or unrelated decoration.
```

模型：gpt-image-2；经已授权网关使用 imagegen CLI；请求1536×864、high、WebP，关闭自动Prompt增补。试图不自动替换文章引用。

生成结果：1次请求成功（310.8秒），原图1536×864，Pillow等比缩至1200×675，WebP quality 88。最终文件：`assets/img/promptweave-release-snapshots/cover-bright-preview.webp`。已实际打开检查：浅奶油底、蓝橙色包体、清晰墨线、绿色选择杆；无图内文字、无水印，文档/齿轮/分支关系完整。保留旧封面引用，仅供风格确认。
