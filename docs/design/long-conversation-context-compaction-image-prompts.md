# 长对话压缩封面

状态：已生成并替换原文字卡片封面。请求模型标识为 `gpt-image-2`，经已授权网关调用；成功生成 1 次。此前一次 WebP 输出请求被网关拒绝，未生成图片。

## 完整 Prompt

Create a bright, friendly hand-drawn educational editorial illustration. Use a clean very light cream background (#FFF9E9), close to white, with only barely visible paper texture. Draw confident, crisp dark ink outlines with slight natural hand-drawn irregularity. Fill shapes with clean, luminous flat colors: sky blue, warm orange, sunny yellow and mint green, using at most four main accent colors. Use white highlights and minimal light contact shadows. Landscape 16:9 with generous safe margins. The main relationship must remain clear at a 360px-wide thumbnail.

Subject: an AI agent keeps the complete conversation archive but carries only a compact working notebook into its next task. Show one substantial sky-blue open archive box on the left, containing many intact paper sheets with simple non-legible ink marks. In the foreground on the right, show a much smaller orange notebook opened to a few useful excerpts, with a mint-green bookmark identifying the newest page. A single graceful ink arrow leads from a duplicated sheet hovering beside the archive to the small notebook, communicating selection into a working copy. The archive stays full and intact. Make the archive and notebook tangible hand-drawn stationery objects, not rectangles in a software flowchart. Use one clear focal relationship, large expressive shapes, and generous empty space. No people, robots, computer screens, scissors, shredders, deleted papers, UI cards, tables, headings, readable text, letters, numbers, logos, signature or watermark. Avoid pencil hatching, charcoal, dirty grey shading, sepia, gradients, photorealism and glossy 3D.

## 导出与验收

- 实际请求：`gpt-image-2`，1536×864，high，PNG，关闭自动 Prompt 增补；模型输出 PNG 1,930,460 字节。
- 本地等比缩放为 1200×675，以 WebP quality 82 导出至 `assets/img/long-conversation-context-compaction/cover.webp`，75,318 字节。
- 已打开原图和最终 WebP：完整档案仍在；小笔记是派生副本；无剪碎或销毁原始历史的暗示。发布页的移动端与 Light/Dark 检查见交付验证。

## 正文流程图

- 来源：确定性 SVG，`assets/img/long-conversation-context-compaction/request-view.svg` 为 source of truth。
- 2026-11-06 重导出：旧 WebP 丢失 stroke，连接线与卡片边框未呈现；改用 Chromium 在 1200×675 视口渲染 SVG，再以 `cwebp -q 90` 导出最终 WebP。
- 布局：页面回放与请求副本分两行；裁剪、预算检查、模型请求沿同一水平中线排列。全图统一 `PingFang SC`，标题与节点使用 600 字重，说明使用 400。
- 最终文件：`assets/img/long-conversation-context-compaction/request-view.webp`，1200×675，47,168 字节。已打开最终文件核对：两条读取路径、全部连接线、箭头及边框均保留。
