# 明快手绘模型图片更新记录

## 请求与验收范围

本批共 22 个编辑任务，通过已授权网关调用 imagegen CLI 的 `edit`，请求模型 `gpt-image-2`；不推断网关内部路由。每个首轮任务调用 1 次，全部退出码 0；请求 `1536x864`、`quality high`、`output-format webp`、`no-augment`，实际源图均为 1536×864。

每个任务的 image 1 是下表发布路径在此次编辑前的图片，image 2 是已确认的 `assets/img/promptweave-release-snapshots/cover-bright-preview.webp`，仅用作风格参考。完整 Prompt 由下列复用风格与任务指令拼接，22 个任务一致，没有额外自动增补。

## 完整复用 Prompt 与任务后缀

```text
Create a bright, friendly hand-drawn educational editorial illustration. Use a clean very light cream background (#FFF9E9), close to white, with only barely visible paper texture. Draw confident, crisp dark ink outlines with slight natural hand-drawn irregularity. Fill shapes with clean, luminous flat colors: sky blue, warm orange, sunny yellow and mint green, using at most four main accent colors. Keep the background neutral and pale; do not put a yellow or grey wash over the colored objects. Use white highlights and minimal light contact shadows, with clear separation between objects and background. The overall feeling is fresh, welcoming and easy to understand, like a well-illustrated learning notebook. Use large simple shapes, one obvious focal point, and generous breathing room. The main relationship must remain readable at a 360px-wide thumbnail. Landscape 16:9, with safe margins on all sides. No watermark, signature or extra logo.

Avoid graphite shading, pencil hatching, crosshatching, charcoal smudges, dirty grey midtones, sepia, aged parchment, vignette, heavy shadows, dark recesses, faded colors, photorealism, glossy 3D, neon colors, decorative clutter and tiny labels. Hand-drawn means ink contours and colored fills, not a pencil sketch. Do not add people unless they explain the subject. Do not invent technical claims or numbers.


Image 1 is the existing content to redraw. Image 2 is ONLY the approved style reference. Redraw image 1 in the bright ink-and-flat-color style of image 2. Preserve the exact subject, all object relationships, grouping, arrow directions, and the meaning of the original image. Preserve every existing text label verbatim in its original language, legible and correctly spelled; do not translate, add titles, omit key labels, invent facts or numbers. If image 1 has no text, keep it text-free. Do not import packages or the selector lever from image 2 unless they already belong to image 1. Replace gray pencil shading with bright clean colored fills. Use cream background, crisp black contours, restrained light shadows. Preserve content while improving clarity at thumbnail scale. Maintain 16:9 layout with safe margins, no cropped objects or text.
```

## 首轮逐图结果

最终审阅文件均为等比缩至 1200×675 的 WebP，未裁切、未叠加文字。已逐张实际打开，核对文字、主体、关系、箭头与边缘；尺寸和字节数从实际审阅文件读取。合格 20 张已覆盖原发布路径；2 张未通过，仍保留旧发布图，等待重生成。失败行的字节数属于拒收的审阅候选，不是当前发布文件。

| 发布路径 / image 1 | 首轮调用 | 用时（秒） | 审阅图字节数 | 验收与安装结果 |
| --- | ---: | ---: | ---: | --- |
| `assets/img/agent-architecture-map/cover-en.webp` | 1 | 348.309 | 96,960 | 通过并安装 |
| `assets/img/agent-architecture-map/cover.webp` | 1 | 318.88 | 98,788 | 通过并安装 |
| `assets/img/agent-patterns-with-pi/cover-image2.webp` | 1 | 240.762 | 65,128 | 通过并安装 |
| `assets/img/chat-workflow-agent-guide/cover-image2.webp` | 1 | 259.607 | 65,180 | 通过并安装 |
| `assets/img/chezmoi-secure-dotfiles/cover-image2.webp` | 1 | 189.85 | 58,098 | 通过并安装 |
| `assets/img/from-skills-to-abilities/cover-image2.webp` | 1 | 293.785 | 96,962 | 未通过：右上饼图卡右侧被裁断；未安装 |
| `assets/img/hindsight-shared-memory/cover-en.webp` | 1 | 289.363 | 86,128 | 通过并安装 |
| `assets/img/hindsight-shared-memory/cover.webp` | 1 | 302.482 | 91,704 | 通过并安装 |
| `assets/img/hindsight-shared-memory/judgment-layers-en.webp` | 1 | 363.32 | 79,706 | 通过并安装 |
| `assets/img/hindsight-shared-memory/judgment-layers.webp` | 1 | 276.811 | 77,796 | 通过并安装 |
| `assets/img/hindsight-shared-memory/two-level-loop-en.webp` | 1 | 296.301 | 78,446 | 未通过：遗漏题头 Reuse Experience; Review Rule Changes；未安装 |
| `assets/img/hindsight-shared-memory/two-level-loop.webp` | 1 | 227.368 | 86,468 | 通过并安装 |
| `assets/img/llm-call-anatomy/cover-en.webp` | 1 | 212.351 | 57,596 | 通过并安装 |
| `assets/img/llm-call-anatomy/cover.webp` | 1 | 224.294 | 70,336 | 通过并安装 |
| `assets/img/openclaw-guide/cover-image2.webp` | 1 | 218.621 | 64,286 | 通过并安装 |
| `assets/img/prompt-cache-prefix/cover-en.webp` | 1 | 245.371 | 55,726 | 通过并安装 |
| `assets/img/prompt-cache-prefix/cover.webp` | 1 | 241.243 | 50,080 | 通过并安装 |
| `assets/img/promptweave-fallback-observability/cover-image2.webp` | 1 | 299.366 | 91,488 | 通过并安装 |
| `assets/img/promptweave-prompt-lifecycle/cover-image2.webp` | 1 | 265.86 | 86,728 | 通过并安装 |
| `assets/img/promptweave-routing-boundaries/cover-image2.webp` | 1 | 231.704 | 35,472 | 通过并安装 |
| `assets/img/sprint-git-flow/cover-image2.webp` | 1 | 236.957 | 69,022 | 通过并安装 |
| `assets/img/thinking-on-by-default/cover-image2.webp` | 1 | 244.255 | 84,310 | 通过并安装 |

英文缓存封面的后续段使用黄色，中文版为白色；两者都保留首个不同 token 和连续前缀边界，未改变机制。此色差已记录，未以局部涂抹方式伪装模型输出。

发布／回滚的明快样图是另一个已确认生成任务，不在本批 22 次编辑之内；其生成记录见 [明快风格 Prompt](blog-image-style-prompt.md)。已逐张打开确认后复制至 `assets/img/promptweave-release-snapshots/cover-image2.webp`，1200×675、70,514 字节。

## 第二轮修正

Skills 封面：在上面的完整 Prompt 后追加以下原文，第二轮调用 1 次，仍使用 `gpt-image-2`、1536×864、high、WebP、no-augment。两轮共调用 2 次。

```text
Critical correction: shrink the complete composition to fit within a generous 100px margin on every side. Every card and every border must be fully visible. In particular the top-right pie-chart card must not touch or cross the image edge.
```

第二轮已实际打开最终 WebP，右上饼图卡边框完整，所有主要对象留在画面内，关系与原图相同。Sharp 等比缩为1200×675，quality 88，81,974字节，已安装到 `assets/img/from-skills-to-abilities/cover-image2.webp`。首轮拒收记录保留。

英文双层循环：在上面的完整 Prompt 后追加以下原文，第二轮调用 1 次，用时109.3秒；模型与请求参数仍为 `gpt-image-2`、1536×864、high、WebP、no-augment。两轮共调用2次。

```text
Mandatory heading across the top: "Reuse Experience; Review Rule Changes". Preserve the full heading verbatim. Leave a dedicated top title area. All six node labels must remain complete, use compact icons to make space.
```

第二轮最终 WebP 已实际打开：完整题头、6个节点、Proposal 标签与上下层箭头全部保留，无裁切或错字。Sharp 等比缩为1200×675，quality 88，85,730字节，已安装到 `assets/img/hindsight-shared-memory/two-level-loop-en.webp`。

本批22个编辑目标全部验收安装：20张首轮通过，2张第二轮通过，共24次编辑调用。首轮失败图未发布；另有1张已确认的发布／回滚样图直接安装，不计入本批编辑次数。

## 安全和验证

未保存网关地址、凭据或原始响应；表内仅含公开发布路径、调用次数和耗时。未改精确 SVG、Harness 或语言选择文章图片；没有执行站点构建。发布页面 Light/Dark、360px 可读性与图片放大由整批内置浏览器 E2E 验证，不能将本次文件级验收当作线上部署。
