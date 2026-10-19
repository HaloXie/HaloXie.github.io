# Sprint Git Flow 新封面

imagegen skill 原生 CLI generate 经已授权网关请求 `gpt-image-2`，质量 high，1536×864 WebP，生成 1 次，无 prompt 自动增补。

```text
Hand-drawn editorial cover on warm ivory paper #f6f0df with charcoal ink and four muted pencil colors (sky blue, orange, yellow, light green). Wide 16:9, generous margins. Depict three separate small parcels of code cards entering a shared transparent testing tray; one verified parcel can leave on its own delivery path while the others stay in testing. The central idea is shared integration testing with independent delivery boundaries. Simple conceptual image, not a literal Git diagram. No readable text, no numbers, no logos, no robots, no watermark, no decorative scenery. Keep packages visually distinct, never merge all into one shipment.
```

最终 `assets/img/sprint-git-flow/cover-image2.webp` 为 1200×675、62,174 字节。等比缩放、WebP quality 80、不裁切，已打开确认组合测试与独立交付的概念可读；无文字，中英文共享。旧 SVG 不作为新图 source，仍保留历史设计。

四张新增英文流程图是原 SVG 的确定性本地化，使用 Sharp/librsvg 导出。保留原几何与箭头，只翻译文本并适配字号，不是 image-2 图：incident-routing-en.webp 63,530 字节；release-recovery-en.webp 45,554 字节；sprint-cycle-en.webp 53,620 字节；workflow-map-en.webp 40,990 字节，均为1200×675。已有 flow-en.webp 继续使用。
