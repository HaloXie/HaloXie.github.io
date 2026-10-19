# promptweave-fallback-observability 配图生成记录

## 来源

本图使用已授权网关与 imagegen skill 的原生 CLI 生成。模型请求标识为 `gpt-image-2`，未推断服务内部模型路由。高质量生成 1 次，未重试。原图请求和实际尺寸均为 1536×864，输出 WebP；无 prompt 自动增补。

## 实际完整 Prompt

```text
Hand-drawn editorial concept illustration on warm ivory paper #f6f0df. Charcoal ink contours, restrained colored-pencil shading in muted sky blue, orange, yellow and light green. Landscape 16:9 composition, generous outer safe margins. No text, letters, numbers, logos, signatures, watermark, humans, robots, decorative plants or scenery. This is a conceptual blog cover, not a literal technical flowchart. A primary path across a small bridge is visibly blocked. A prepared parallel bypass bridge remains intact and connects the same starting and ending points. A single continuous trace follows the bypass. Depict planned recovery without suggesting a jump into an unknown route.
```

## 用途与导出

封面表达概念，不作为精确流程或数据证据。无文字，可由中英文共用；各语言 alt 分别写入文章。原 cover.svg 和 cover.webp 保留为旧设计记录，新图是独立模型产物，发布路径为 `assets/img/promptweave-fallback-observability/cover-image2.webp`。

等比缩放到 1200×675、移除元数据，以 WebP 压缩。没有裁切、拉伸或覆盖文字。最终图已打开检查：无文字、边缘裁切、结构遮挡，主要概念完整。文件体积由图片门禁核验，页面 E2E 随中英文文章验证。
