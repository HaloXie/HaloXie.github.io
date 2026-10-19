# 2026-10-19 新增与替换图片清单

本表来自当前工作区 `git diff --name-only -- assets/img` 与 `git ls-files --others --exclude-standard assets/img` 的并集，尺寸由 Sharp 读取，字节数来自实际文件。涵盖本轮 31 个图片文件（26 个 WebP、5 个 SVG），不是全仓图片总数。全部为 1200×675；所有 WebP 均小于 100,000 字节。

本地生成与逐张检查不代表部署。页面检查与门禁统一见 [站点验收记录](2026-10-19-site-verification.md)。

## image-2 模型生成及英文编辑图

下表来源为经已授权网关实际请求的 `gpt-image-2`；概念封面与含文字图的英文编辑均分别留存完整 Prompt。中文架构图和 LLM 调用图为先前本轮生成的替换结果，英文版为独立本地化生成，不把旧 SVG 当作这些 WebP 的生成源。

| 路径 | 尺寸 | 字节数 | 来源 |
| --- | --- | ---: | --- |
| [assets/img/agent-architecture-map/cover.webp](../../assets/img/agent-architecture-map/cover.webp) | 1200×675 | 92,904 | gpt-image-2 概念封面 |
| [assets/img/llm-call-anatomy/cover.webp](../../assets/img/llm-call-anatomy/cover.webp) | 1200×675 | 60,838 | gpt-image-2 概念封面 |
| [assets/img/agent-architecture-map/cover-en.webp](../../assets/img/agent-architecture-map/cover-en.webp) | 1200×675 | 90,196 | gpt-image-2 英文编辑 |
| [assets/img/agent-patterns-with-pi/cover-image2.webp](../../assets/img/agent-patterns-with-pi/cover-image2.webp) | 1200×675 | 72,638 | gpt-image-2 概念封面 |
| [assets/img/chat-workflow-agent-guide/cover-image2.webp](../../assets/img/chat-workflow-agent-guide/cover-image2.webp) | 1200×675 | 82,974 | gpt-image-2 概念封面 |
| [assets/img/chezmoi-secure-dotfiles/cover-image2.webp](../../assets/img/chezmoi-secure-dotfiles/cover-image2.webp) | 1200×675 | 88,400 | gpt-image-2 概念封面 |
| [assets/img/from-skills-to-abilities/cover-image2.webp](../../assets/img/from-skills-to-abilities/cover-image2.webp) | 1200×675 | 87,944 | gpt-image-2 概念封面 |
| [assets/img/hindsight-shared-memory/cover-en.webp](../../assets/img/hindsight-shared-memory/cover-en.webp) | 1200×675 | 92,624 | gpt-image-2 英文编辑 |
| [assets/img/hindsight-shared-memory/judgment-layers-en.webp](../../assets/img/hindsight-shared-memory/judgment-layers-en.webp) | 1200×675 | 79,014 | gpt-image-2 英文编辑 |
| [assets/img/hindsight-shared-memory/two-level-loop-en.webp](../../assets/img/hindsight-shared-memory/two-level-loop-en.webp) | 1200×675 | 97,984 | gpt-image-2 英文编辑 |
| [assets/img/llm-call-anatomy/cover-en.webp](../../assets/img/llm-call-anatomy/cover-en.webp) | 1200×675 | 49,526 | gpt-image-2 英文编辑 |
| [assets/img/openclaw-guide/cover-image2.webp](../../assets/img/openclaw-guide/cover-image2.webp) | 1200×675 | 81,752 | gpt-image-2 概念封面 |
| [assets/img/prompt-cache-prefix/cover-en.webp](../../assets/img/prompt-cache-prefix/cover-en.webp) | 1200×675 | 65,874 | gpt-image-2 英文编辑 |
| [assets/img/promptweave-fallback-observability/cover-image2.webp](../../assets/img/promptweave-fallback-observability/cover-image2.webp) | 1200×675 | 93,028 | gpt-image-2 概念封面 |
| [assets/img/promptweave-prompt-lifecycle/cover-image2.webp](../../assets/img/promptweave-prompt-lifecycle/cover-image2.webp) | 1200×675 | 91,904 | gpt-image-2 概念封面 |
| [assets/img/promptweave-release-snapshots/cover-image2.webp](../../assets/img/promptweave-release-snapshots/cover-image2.webp) | 1200×675 | 92,840 | gpt-image-2 概念封面 |
| [assets/img/promptweave-routing-boundaries/cover-image2.webp](../../assets/img/promptweave-routing-boundaries/cover-image2.webp) | 1200×675 | 32,042 | gpt-image-2 概念封面 |
| [assets/img/thinking-on-by-default/cover-image2.webp](../../assets/img/thinking-on-by-default/cover-image2.webp) | 1200×675 | 82,936 | gpt-image-2 概念封面 |
| [assets/img/sprint-git-flow/cover-image2.webp](../../assets/img/sprint-git-flow/cover-image2.webp) | 1200×675 | 62,174 | gpt-image-2 概念封面 |

生成记录位于同目录 `<slug>-image-prompts.md`，英文图记录使用 `<slug>-<image>-en-image-prompts.md`。记录包含实际 Prompt、请求尺寸、质量与次数；本表仅汇总最终资产。

## 确定性 SVG 精确图及其 WebP

以下是原有 Sprint 精确图的英文修订／本地化，不是 image-2 输出。保留原图关系和几何结构，文本与必要字号按英文适配。SVG 是源文件，文章只引用同名 WebP。

| 路径 | 尺寸 | 字节数 | 来源 |
| --- | --- | ---: | --- |
| [assets/img/sprint-git-flow/flow-en.svg](../../assets/img/sprint-git-flow/flow-en.svg) | 1200×675 | 3,422 | 确定性 SVG 源文件 |
| [assets/img/sprint-git-flow/flow-en.webp](../../assets/img/sprint-git-flow/flow-en.webp) | 1200×675 | 52,284 | 确定性 SVG → WebP |
| [assets/img/sprint-git-flow/incident-routing-en.svg](../../assets/img/sprint-git-flow/incident-routing-en.svg) | 1200×675 | 3,336 | 确定性 SVG 源文件 |
| [assets/img/sprint-git-flow/incident-routing-en.webp](../../assets/img/sprint-git-flow/incident-routing-en.webp) | 1200×675 | 63,530 | 确定性 SVG → WebP |
| [assets/img/sprint-git-flow/release-recovery-en.svg](../../assets/img/sprint-git-flow/release-recovery-en.svg) | 1200×675 | 3,652 | 确定性 SVG 源文件 |
| [assets/img/sprint-git-flow/release-recovery-en.webp](../../assets/img/sprint-git-flow/release-recovery-en.webp) | 1200×675 | 45,554 | 确定性 SVG → WebP |
| [assets/img/sprint-git-flow/sprint-cycle-en.svg](../../assets/img/sprint-git-flow/sprint-cycle-en.svg) | 1200×675 | 3,053 | 确定性 SVG 源文件 |
| [assets/img/sprint-git-flow/sprint-cycle-en.webp](../../assets/img/sprint-git-flow/sprint-cycle-en.webp) | 1200×675 | 53,620 | 确定性 SVG → WebP |
| [assets/img/sprint-git-flow/workflow-map-en.svg](../../assets/img/sprint-git-flow/workflow-map-en.svg) | 1200×675 | 2,514 | 确定性 SVG 源文件 |
| [assets/img/sprint-git-flow/workflow-map-en.webp](../../assets/img/sprint-git-flow/workflow-map-en.webp) | 1200×675 | 40,990 | 确定性 SVG → WebP |

本轮 `flow-en` 为已有英文图修订，其余四张为新增英文版。导出后逐张打开最终 WebP 核对文字、线条、箭头与裁切。

## 动态实验的英文静态回退

| 路径 | 尺寸 | 字节数 | 来源 |
| --- | --- | ---: | --- |
| [assets/img/prompt-cache-prefix/prefix-machine-en.webp](../../assets/img/prompt-cache-prefix/prefix-machine-en.webp) | 1200×675 | 49,808 | 确定性 SVG（anatomy）内置浏览器截图 |

`prefix-machine-en.webp` 从修正配色后的英文实验画面生成，包含橙色扫描架、深色重算卡、图例与教学假设。截图实际为 1192×723，Sharp 使用 contain 等比放入米白底 1200×675，quality 88；不裁切、不拉伸。已打开最终 WebP 检查。它是实验的静态回退，不冒充 image-2 图。

## 历史文件规格维护

| 路径 | 尺寸 | 字节数 | 来源 |
| --- | --- | ---: | --- |
| [assets/img/chezmoi-secure-dotfiles/cover.webp](../../assets/img/chezmoi-secure-dotfiles/cover.webp) | 1200×675 | 32,512 | 旧封面等比缩小，保留原内容 |

chezmoi 旧封面已没有发布引用，仍保留作历史文件；图片门禁也检查未引用资产，因此从 1600×900 等比缩为 1200×675，并删除已失效的尺寸豁免。没有删除文件或放宽门禁，冻结尺寸豁免由 15 条减为 14 条。
