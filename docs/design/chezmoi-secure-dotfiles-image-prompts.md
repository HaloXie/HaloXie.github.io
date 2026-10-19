# chezmoi-secure-dotfiles 封面生成记录

## 实际生成

使用已授权本地网关，模型请求标识 `gpt-image-2`；不推断服务内部路由。每图调用 1 次，quality 为 high，请求 1536×864，实际原图 1536×864，输出 WebP，关闭 prompt 自动增补。

## 完整 Prompt

```text
Hand-drawn editorial concept illustration on warm ivory paper #f6f0df. Dark charcoal ink outlines, colored pencil fills using only muted sky blue, orange, yellow and light green. Landscape 16:9, large simple shapes and generous whitespace, phone-readable. No text or letters, no logo or watermark, no neon or glass effects, no realistic 3D, no decorative scenery. Conceptual cover, not a precise flowchart. Safe synchronization of developer configuration: two simple laptop outlines exchange harmless configuration sheets through a versioned folder, while a sensitive key remains inside a separate locked envelope outside the synchronization path. Emphasize that syncing configuration does not mean exposing secrets.
```

## 导出与验收

发布路径：`assets/img/chezmoi-secure-dotfiles/cover-image2.webp`。Sharp 等比缩小到 1200×675，WebP quality 88，移除元数据，88400 字节；没有裁切、拉伸或添加文字。该无文字概念封面由中英文共用，各语言 alt 独立本地化；旧图保留但不再作为文章封面引用。

已逐张打开最终 WebP 检查：主要构图完整，无文字乱码、边缘裁切或明显生成伪影。封面表达概念，不作为精确机制或流程证据。页面 Light/Dark、移动端和内置浏览器 E2E 由整批交付统一验收，此记录不替代页面检查。

旧 `cover.webp` 已无发布引用，移除历史尺寸豁免；因为图片门禁也检查未引用文件，旧图保留内容并等比缩至 1200×675，不继续保留过期豁免。
