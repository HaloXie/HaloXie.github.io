# 公共记忆文章配图 Prompt

对应文章：[_posts/zh-CN/2026-09-28-hindsight-shared-memory.md](../../_posts/zh-CN/2026-09-28-hindsight-shared-memory.md)。

状态：三张图片已通过 `imagegen` 的 API CLI 路径生成，逐张检查了源图与最终 WebP。执行规范见 [blog-imagegen](../skills/blog-imagegen/SKILL.md)。本文仅保留可公开的创作输入，不保存端点或凭据配置。

## 构图选择

保留封面、判断层关系、经验升级为规则三张图。五层适配器架构已有正文及折叠接口说明，不再重复配图；阶段计划继续使用正文表达。经验图不把“再次犯错”画成成功路径。

风格参考 [strategy.webp](../../assets/img/harness-engineering/strategy.webp) 的米白纸张、墨线与低饱和强调色，不复制其水印；[three-control-models.webp](../../assets/img/chat-workflow-agent-guide/three-control-models.webp) 提供简短标签与大块分区参考。公共风格块与每张专用块拼接后即为实际发送的完整 Prompt，调用使用 `--no-augment`，没有附加改写。

## 实际参数与生成记录

- 模型：`gpt-image-2`；质量：`high`。
- 请求尺寸：`1536x864`；服务实际返回三张 `1672x941` PNG，近似 16:9，未严格遵循请求尺寸。
- 交付尺寸：`1200x675`；格式：WebP；目标不超过 100 KB，硬上限 150 KB。

| 文件（均位于 assets/img/hindsight-shared-memory/） | 生成次数 | 实际模型 | 最终尺寸 / 字节数 | 状态 |
| --- | --- | --- | --- | --- |
| cover.webp | 1 | gpt-image-2 | 1200×675 / 96,256 | 源图与 WebP 验收通过 |
| judgment-layers.webp | 1 | gpt-image-2 | 1200×675 / 99,410 | 源图与 WebP 验收通过 |
| two-level-loop.webp | 1 | gpt-image-2 | 1200×675 / 95,120 | 源图与 WebP 验收通过 |

生成日期：2026-09-28。共三次 CLI 请求，均成功，无重试；表中模型是实际请求的模型标识，未对服务内部路由作额外推断。不记录服务地址、凭据、私人账户名或原始响应。

验收差异：判断层图额外生成了含义正确的“记忆”盒标签；经验图用人物符号表达“人工确认”。三张图中文无错字，箭头符合正文关系，无文字重叠或文字裁切。已检查文章在 1200px / 360px 的 Light / Dark 显示，主要关系可读、无页面横向溢出；正文图片放大入口正常。

## 公共风格块

```text
Hand-drawn editorial infographic on warm off-white paper (#f6f0df), slightly textured.
Black / dark-grey ink outlines with gentle irregular edges, colored-pencil fill.
Accent colors only: muted sky blue, orange, yellow, light green (max 4, low saturation).
Simple visual metaphors: cards, arrows, shelves, gates, loops. Generous whitespace.
Landscape 16:9. One bold centered title at top; short labels only; all text in Simplified Chinese,
except product names kept as-is. Text must be spelled exactly as given, no extra text.
No watermark, no signature, no logo, no people, no neon, no gradients, no glassmorphism, no 3D render.
Large clean Chinese typography legible on a phone; 8 percent outer safe margins.
Do not imitate any watermark in visual references.
```

## 1. cover.webp

用途：封面只表达经过核验的经验才能进入公共记忆。

```text
Cover concept, not a technical flowchart.
Exact title: 记忆先过闸门，再进上下文
A loose stack of notes at left, a validation gate in center bearing the only additional text
已验证, an orderly memory card box on right with an abstract reading aperture.
Some crossed-out notes remain outside the gate. No robot needed. No other text.
Restrained sketchbook composition, warm paper, abundant space.
```

核对：文字仅有标题与“已验证”；被拒的便签留在闸门外，不能混入右侧卡片盒。

## 2. judgment-layers.webp

用途：放在判断三层说明之后，区分框架、输入与结果。

```text
Exact title: 记忆只进输入层
Three broad horizontal shelf cards, vertically arranged.
Top: 框架：怎么判 with a small lock and Git tag.
Middle in muted blue: 输入：拿什么判, with a memory card box integrated into this shelf.
Bottom: 结果：判成什么
A dashed downward arrow only from middle to bottom labelled 间接影响.
No upward arrow. The top shelf is visibly separate and protected.
Keep each label huge, no explanatory paragraph, no extra text.
```

核对：记忆卡片位于输入层；虚线只表示输入对结果的间接影响，不画记忆自动修改框架的路径。

## 3. two-level-loop.webp

用途：放在经验升级为规则的段落后，分开自动复用与人工确认。

```text
Exact title: 经验可以复用，规则要人确认
Two spacious horizontal rows, not a circular diagram.
Upper pale-blue row: three large cards 被纠正 → 核验后记忆 → 下次召回.
Lower pale-green row: three large cards 跨场景成立 → 人工确认 → 写入规则.
A single connector from the middle upper card to the first lower card, labelled 提议.
Route it through whitespace without crossing cards or other arrows.
Upper row depicts reusing a verified correction.
Lower row depicts optional promotion only after human confirmation.
No arrow suggesting every recall repeats an error. No additional words or numbers.
All six node labels must be large and legible at 360px.
```

核对：“人工确认”必须在“写入规则”之前；“跨场景成立”的具体条件由正文解释，不用缩小字号塞进图里。

## 导出与验收

本次使用 Pillow `ImageOps.fit` 等比缩放并居中裁切到 `1200×675`：源图高度仅裁去约 0.5 像素，不影响内容，不拉伸。WebP 使用 `method=6`，封面与经验图 `quality=80`，判断层图 `quality=85`；不带源图元数据。源 PNG 与临时 Prompt 不进入仓库。

其他精确 16:9 源图也可使用下列 ImageMagick 命令；输入名是通用示例，不指向任何私人目录：

```bash
magick input.png -strip -resize 1200x675 -quality 80 output.webp
magick identify -format '%f %wx%h %b\n' output.webp
```

导出后逐张打开最终 WebP。超过体积目标时调整压缩，文字变糊时应简化画面再生成。最终尺寸、文件大小及源码引用由 `ruby scripts/check-content-images.rb` 校验；生成成功不等于通过文章页面的视觉验收。

## 本次交付验证

文章按设计与计划写作：保留写入和召回边界、来源与派生内容关系、阶段放行条件、恢复路径、权限与外部模型处理范围；未把候选阈值或尚未执行的步骤写成效果。

两位 agent 分别模拟基础读者和接入工程师试读，共同卡点是接口过早、“返回空”与最终拒答混淆、实验判分口径待明确。修订后两位复读通过；这是 agent 模拟试读，不是真人用户验证。

本地检查通过：翻译配对、系列、参考链接、内容图片、`git diff --check`、生产 Jekyll 构建、Pagefind 索引、渲染站点检查及 HTML-Proofer 站内检查（152 页、673 条内部链接）。重点高亮实际选中了文章核心命题，两个附录默认折叠且展开后代码与列表正常。未做线上部署或线上验收；HTML-Proofer 未检测外部链接可达性。
