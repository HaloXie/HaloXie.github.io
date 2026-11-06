# 博客配图 Prompt：明快手绘（已确认）

2026-10-19：明昊确认第二张明快样图效果更好，要求后续图片统一此风格并重绘之前的图片。浅奶油底、清晰墨线和明快色块是后续默认方向；旧图生成记录保留原始 Prompt，不改写历史。

## 复用风格 Prompt

```text
Create a bright, friendly hand-drawn educational editorial illustration. Use a clean very light cream background (#FFF9E9), close to white, with only barely visible paper texture. Draw confident, crisp dark ink outlines with slight natural hand-drawn irregularity. Fill shapes with clean, luminous flat colors: sky blue, warm orange, sunny yellow and mint green, using at most four main accent colors. Keep the background neutral and pale; do not put a yellow or grey wash over the colored objects. Use white highlights and minimal light contact shadows, with clear separation between objects and background. The overall feeling is fresh, welcoming and easy to understand, like a well-illustrated learning notebook. Use large simple shapes, one obvious focal point, and generous breathing room. The main relationship must remain readable at a 360px-wide thumbnail. Landscape 16:9, with safe margins on all sides. No watermark, signature or extra logo.

Avoid graphite shading, pencil hatching, crosshatching, charcoal smudges, dirty grey midtones, sepia, aged parchment, vignette, heavy shadows, dark recesses, faded colors, photorealism, glossy 3D, neon colors, decorative clutter and tiny labels. Hand-drawn means ink contours and colored fills, not a pencil sketch. Do not add people unless they explain the subject. Do not invent technical claims or numbers.
```

每张追加：核心命题、对象关系、构图、必要图内文字及语言。无文字概念封面可中英共用；精确流程仍单独核验节点与箭头。交付保持1200×675 WebP，目标100KB以内。

## 流程图布局与字体（2026-11-06 确认）

适用于包含节点、箭头和精确文字的流程图；概念插画不必套用卡片布局。需要可验证几何关系时使用确定性 SVG，并明确说明来源，文章仍引用导出的 WebP。

- **同一路径沿同一水平线展开。** 连续节点的中心线、连接箭头保持水平，节点内部同角色文字使用相同基线、内边距和对齐方式。不要无故把末节点放到下方，或让箭头折返、斜连。不同读取路径用独立行或泳道，分支与回路按真实语义绘制。
- **全图使用同一字体族。** 中文图统一使用与博客 Base 一致的 `PingFang SC`，fallback 为 `Microsoft YaHei, sans-serif`；标题与节点标题用 600 字重，说明用 400，同角色字号一致。不得混入 Hiragino、宋体等另一套字体；语言或 Base 字体方案变化时同步对应图的字体设置。
- **箭头必须完整可追踪。** 连接线与箭头对准节点边缘，保留间隙，不穿过卡片或文字；通过与不通过的去向、必要的例外与恢复路径不能因追求水平整齐而省略。
- **检查最终导出文件。** 核对 SVG 与最终 WebP，确认连接线、边框、字重、换行和文字位置均保留；不能只检查尺寸和体积。字体须检查实际使用的 font face，声明了字体名称不等于已加载。导出丢失 stroke 或发生 fallback 时修复导出，再逐张打开最终文件。
- **同时检查原尺寸和 360px 阅读效果。** 主路径与节点标题应清楚；说明过小就减少文字或拆图，不靠继续缩字塞进画布。保留点击放大入口。

## 本次试图：发布与回滚完整快照

在复用 Prompt 后追加以下内容，完整拼接内容即实际生成 Prompt：

```text
Subject: releasing and rolling back a complete configuration snapshot. Show two intact configuration packages side by side on a simple clean shelf, with equal visual weight. The left package is predominantly sky blue and the right package predominantly warm orange. Each package contains the same three clearly visible items grouped together: a white document, a gear, and a tiny branching connector. The document, gear and connector must read as one inseparable package. A single large selector lever below the shelf can point toward either whole package; use two simple directional marks to show the alternatives, not a continuous production conveyor. No loose component swapping. Keep the shelf and package interiors bright and open, without dark cavities. Minimal, charming ink-and-flat-color illustration, bold enough for a blog thumbnail. No text, letters or numbers anywhere. Do not add people, robots or unrelated decoration.
```

模型：gpt-image-2；经已授权网关使用 imagegen CLI；请求1536×864、high、WebP，关闭自动Prompt增补。试图不自动替换文章引用。

生成结果：1次请求成功（310.8秒），原图1536×864，Pillow等比缩至1200×675，WebP quality 88。最终文件：`assets/img/promptweave-release-snapshots/cover-bright-preview.webp`。已实际打开检查：浅奶油底、蓝橙色包体、清晰墨线、绿色选择杆；无图内文字、无水印，文档/齿轮/分支关系完整。保留旧封面引用，仅供风格确认。
