# prompt-cache-prefix/cover 英文图

来源：imagegen skill 原生 CLI edit，经已授权网关调用 `gpt-image-2`。输入是 `assets/img/prompt-cache-prefix/cover.webp`，属于编辑目标；保留中文图结构，只本地化图中文字。

请求尺寸 1536×864，质量 high，输出 WebP，关闭 prompt 自动增补。成功生成 1 次；此前一次 TLS 连接超时，未产出图，重试成功。

## 实际完整 Prompt

```text
Use case: text-localization. This image is the edit target. Translate only title to exactly 'Cache Reuse Needs a Matching Prefix'. Preserve token strips, shared prefix and diverging suffix, pencil texture and warm paper. No Chinese text. Keep the complete composition in landscape 16:9, with safe margins. Do not add a logo or watermark.
```

## 交付

路径：`assets/img/prompt-cache-prefix/cover-en.webp`，1200×675。等比缩放、不裁切、不叠加文字，WebP quality 80 并剥离元数据。已逐张打开最终图：英文拼写、箭头语义、中文残留、边距与遮挡均检查；最终体积及页面验收见本批内容迁移记录。
