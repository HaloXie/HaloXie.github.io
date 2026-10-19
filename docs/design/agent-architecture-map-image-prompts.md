# agent-architecture-map 封面生成记录

## 来源与结果

- 通过已授权的网关 Images API 请求 `openai/gpt-image-2`，响应模型标识为 `gpt-image-2`；不推断服务内部路由。
- 请求：`1536x1024`、`quality: high`、`output_format: webp`、`n: 1`。实际源图：1536×1024。
- 本轮高质量请求 3 次，保留第 1 次结果。后两次因错误归因裁切问题而重复生成，未采用。此前另有低质量预览成功结果及中断请求，未将中断请求计为成功生成。
- 发布路径：`assets/img/agent-architecture-map/cover.webp`；1200×675 WebP，92,904 字节。
- 原 `cover.svg` 仅保留为旧版设计记录，不是新 WebP 的生成源。旧 WebP 可由 Git 历史恢复。
- 封面只承担概念引入，正文中的精确技术关系仍以文字、代码与表格为准。
- 中文图含中文标题；本轮已生成独立英文 `cover-en.webp`，生成记录见 [英文封面记录](agent-architecture-map-cover-en-image-prompts.md)。

## 实际完整 Prompt

下面是选中结果请求里的完整 prompt，未额外增补；不保存凭据、服务地址或原始响应。

```text
Hand-drawn editorial illustration on warm off-white paper (#f6f0df), slightly textured. Dark charcoal ink outlines, colored-pencil fill, muted sky blue orange yellow and light green only, landscape composition with generous whitespace, calm educational tone. Exact title: Agent 不是一条升级路线. Show a central compass with four distinct abstract paths around it: quick reaction, deliberate planning, reasoning-and-action loop, and coordinated team. They are different questions about one system, not a maturity ladder. No extra text, no logo, no watermark.
```

## 导出与验收

原始 3:2 图先等比缩小至 1013×675，再居中放入 1200×675 纸色画布，不拉伸、不裁切、不覆盖模型生成文字。两侧留白是保留完整标题与主体的比例适配。

```sh
magick input.webp -resize 1200x675 -background '#f6f0df' -gravity center -extent 1200x675 -strip -quality 80 cover.webp
```

最终 WebP 已逐张打开：标题完整、无文字遮挡，主体关系可读，尺寸与体积合规。初次居中裁切会损失标题，因此未采用裁切输出。

图片门禁、`git diff --check`、生产 Jekyll 构建、Pagefind 索引及 `scripts/check-rendered-site.rb` 已通过。本地预览服务返回的 WebP 与源文件逐字节一致。

已通过内置浏览器的 360 / 768 / 1200px、Light / Dark 与图片放大入口检查；具体证据见 [站点验收记录](2026-10-19-site-verification.md)。这是本地页面验收，尚未部署。
