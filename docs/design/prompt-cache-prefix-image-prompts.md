# Prompt caching 文章配图 Prompt

状态：封面已通过 `imagegen` 的 API CLI 路径生成，逐张检查了源图与最终 WebP。执行规范见 [blog-imagegen](../skills/blog-imagegen/SKILL.md)。本文仅保留可公开的创作输入，不保存端点或凭据配置。

正文图 `prefix-machine.webp` 不是模型生图：它是 anatomy skill 生成的确定性 SVG 交互页截图，源码在 `labs/prompt-cache-prefix/`，同名 SVG 在本文章图片目录。

## 生成记录

- 模型：`gpt-image-2`；质量：`high`；调用使用 `--no-augment`，没有附加改写。
- 请求尺寸：`1536x864`；服务返回 `1536x864` PNG。
- 交付尺寸：`1200x675`；格式：WebP。

| 文件（位于 assets/img/prompt-cache-prefix/） | 生成次数 | 实际模型 | 最终尺寸 / 字节数 | 状态 |
| --- | --- | --- | --- | --- |
| `cover.webp` | 1 | `gpt-image-2` | 1200×675 / 69,376 | 已验收 |
| `prefix-machine.webp` | 0（确定性 SVG 截图） | — | 1200×675 / 27,748 | 已验收 |

生成日期：2026-10-12。共一次 CLI 请求，成功，无重试；表中模型是实际请求的模型标识，未对服务内部路由作额外推断。

## 公共风格块

与 [hindsight 配图 Prompt](hindsight-shared-memory-image-prompts.md) 的公共风格块逐字相同。

## 1. cover.webp

用途：封面只表达核心命题——缓存复用的是连续前缀，一处改动之后的内容走新的计算路径。

```text
Cover concept, not a technical flowchart.
Exact title: 缓存只认连续前缀
Two long hand-drawn paper strips run from left to right, made of small linked cards.
For the left half the two strips lie exactly on top of each other, neatly aligned, tinted muted sky blue.
At one point a single small orange slip of paper replaces one card on the upper strip.
From that point onward the two strips separate and go different directions; the cards after the
orange slip are freshly re-inked with visible new pencil strokes, showing they are redrawn.
No other text besides the title. No numbers, no machine, no step labels.
Restrained sketchbook composition, warm paper, abundant space.
```

核对：文字仅有标题；橙色卡片之前两行完全对齐，之后分开且改为未着色的重描卡片；未复用正文的校验机。

## 导出

```bash
magick input.png -strip -resize 1200x675 -quality 80 output.webp
```
