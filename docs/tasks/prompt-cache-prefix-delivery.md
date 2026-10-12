# Prompt cache prefix 交付记录

日期：2026-10-12。所有改动留工作区，不 commit / push / 建分支。

## 核心命题与范围

提示缓存复用的是带着前文计算出的状态；第一处 token 差异会切断旧前缀的后续复用，所以应把稳定内容放前、易变内容放后，并满足所用厂商的缓存边界与存活条件。

本次包含新中文文章、anatomy Figure 交互页与可重跑源码、截图 SVG/WebP、imagegen 封面、共享图片目录登记。图片与生成源码合计超过五个文件，按 L 级文件数记录；用户已明确授权完整产物范围，分内容/图、集成、验收推进，不涉及发布。新 lab 的模型、样式和生成入口自成模块，不改全局视觉方向。

1. 阻塞前置：读取规范、两篇范例和配图，抓取官方来源；确认封面工具可用性。
2. 实现：文章与 Figure 单一模型，封面，登记共享资源。
3. 验证：两位独立读者模拟，kit audit/lines，源码门禁、生产构建、搜索索引、页面和浏览器验收。

观测：模型守恒、不同改动位置的命中与成本、实际高亮命中、浏览器窄屏与折叠内容、完整检查退出码。兜底：缓存未命中是重新处理输入，图明确教学假设；缺封面不得冒充已完整交付。回滚：本次均为未提交新增文件及单条资源配置，人工审后可按精确路径撤回，不执行删除。

## 写前材料核验

| 项目 | 必须保留的语义 |
|---|---|
| 核心规则 | 旧前缀第一处不一致后的状态不能跳段复用；旧缓存不等于被删除 |
| 前提 | 同模型及相关设置、前缀相同、已写入、缓存可用、长度合格、本次会查询旧边界 |
| 对象关系 | token → 层间 KV 状态；断点指前缀结束，不是独立段落缓存 |
| 正常路径 | 稳定内容在前 → 稳定末尾边界 → 首次写入 → 后续读命中量 |
| 异常恢复 | 检查最早差异与边界/TTL/长度；普通重算与重新建立缓存，不回退必要安全规则 |
| 适用边界 | OpenAI 新旧模型区别；Anthropic tools/system/messages；因果机制≠未公开内部实现 |

已读 README、reading-highlights README、chat-workflow-agent-guide 全文、chezmoi-secure-dotfiles-guide 全文。已实际打开 three-control-models、recovery、strategy、pi-minimal-loop WebP。图参考采用米白背景与清楚主关系，不沿用 recovery 的历史暗色。

## 一手来源与数字

查证日期统一 2026-10-12；通过 curl 实际抓取页面，原始页面保留于本机 `/tmp/prompt-cache-work/`（不提交）。

| 数字/规则 | 来源与范围 |
|---|---|
| OpenAI GPT-5.6 及之后最小 1,024 可见输入 token；30m，最近写入/复用后至少30分钟 | https://developers.openai.com/api/docs/guides/prompt-caching#summary-of-model-differences |
| Anthropic Claude Sonnet 4.6 最小1,024 token | https://platform.claude.com/docs/en/build-with-claude/prompt-caching#cache-limitations |
| Anthropic 默认5分钟、可选1小时 | https://platform.claude.com/docs/en/build-with-claude/prompt-caching#1-hour-cache-duration |
| Claude Sonnet 4.6 读取0.1倍、5分钟写入1.25倍、1小时写入2倍 | https://platform.claude.com/docs/en/build-with-claude/prompt-caching#pricing |
| 图4段×1024，命中/重算/百分比 | 人为教学输入，经 model 函数计算；不是生产测量或厂商切块规则 |
| 因果遮罩 | https://arxiv.org/html/1706.03762v7#S3.SS1 |

## 封面生成说明

当前无内置 image_gen callable。已按 imagegen skill 提供 CLI 备用选择并等待回答；尚未生成，禁止用 SVG 冒充。封面预定独立概念：两条手绘连续墨线/纸带，在一个小改动处从共同路径分开，后段重新描绘；不复用交互机器，不画完整流程。

## 验证与试读

以下是最终状态，构建成功不代表已能发布。图片缺失导致两项门禁失败。

| 命令 | 最终退出码 | 证据 |
|---|---:|---|
| `ruby scripts/check-translations.rb` | 0 | 首次1，补上检查器要求的 `lang-exclusive: [zh-CN]` 后通过；没有英文占位 |
| `ruby scripts/check-series.rb` | 0 | 3 series、32 lessons |
| `ruby scripts/check-reference-links.rb` | 0 | 79 linked references、12 sections |
| `ruby scripts/check-content-images.rb` | 0 | 两张 WebP 补齐后重跑：90 个 WebP、无英文 CJK 泄漏 |
| `git diff --check` | 0 | 无空白错误 |
| `node labs/prompt-cache-prefix/model.test.mjs` | 0 | 首段/中段/无改动、token守恒、后缀不命中、成本、非法输入 |
| `node --check labs/prompt-cache-prefix/build.mjs` | 0 | 语法 |
| `node --check labs/prompt-cache-prefix/runtime.mjs` | 0 | 语法 |
| `node labs/prompt-cache-prefix/build.mjs --audit` | 0 | 56 solids、56 items、45 depth states、6508 overlaps；所有失败项0，audit passed |
| `node .agents/skills/anatomy/scripts/capture.mjs labs/prompt-cache-prefix/index.html --out /tmp/prompt-cache-work/figure.png --width 1440 --scale 1 --reduced` | 0 | Codex 沙箱内 Chrome 启动即 SIGABRT；改在沙箱外重跑通过，console clean。发布图用 `--scale 2` 截图后裁 16:9、缩到 1200×675 |
| `node .agents/skills/anatomy/scripts/lines.mjs labs/prompt-cache-prefix/index.html --out /tmp/prompt-cache-work/lines.png --reduced` | 0 | 沙箱外重跑：line ends 0 of 264 float |
| `JEKYLL_ENV=production bundle exec jekyll build` | 0 | 最终构建约5.7秒 |
| `pnpm exec pagefind --root-selector 'article[data-toc]' --keep-index-url --quiet --site _site --output-path _site/pagefind` | 0 | zh-cn stemming不支持提示，不影响索引生成 |
| `bundle exec ruby scripts/check-rendered-site.rb` | 0 | metadata、reading highlights契约、Pagefind、sitemap、feed、共享资源 |
| `bundle exec htmlproofer _site --disable-external --ignore-urls '/^http:\/\/127.0.0.1/,/^http:\/\/0.0.0.0/,/^http:\/\/localhost/'` | 0 | 两张 WebP 补齐、重新构建与 Pagefind 后重跑通过 |

额外检查：扫描 `_posts/` 的 `npm install` / `npm i`，无命中（rg退出1代表无匹配）。官方来源的所有引用anchor已解析页面验证存在。Nokogiri确认四个details默认关闭且内部生成段落/表格/代码结构；canonical为 https://halo.xin/posts/general/prompt-cache-prefix/，语言链接没有虚构英文页。对渲染HTML提取候选后执行真实 reading-highlights selectCandidates，选中核心命题与“稳定前缀/有效缓存边界”两段；这只是离线结构检查，未替代浏览器中开关与实际class验收。

### 两位独立 agent 模拟试读

这不是真人读者验证，也不是只问“写得好不好”。两位都只拿成稿复述核心问题、对象、正常路径、厂商差异与失败处理。

- `reader_api`（只会调用API）：卡点为断点定义晚于预测题、新术语密集、费用打断主线、正常重算藏在折叠内。改法：定义提前、用前后依赖直接讲因果、成本折叠、正常回退放正文。复读确认四项已解决，未发现新增理解阻塞。
- `reader_agent`（Agent工程师）：卡点为保留历史可能被读成不要压缩，账单口径/字段分散。改法：明确压缩照常进行；将写入价格归到成本折叠，补全 OpenAI 写入字段路径与 Anthropic 总输入公式。复读确认两项已解决。
- 共同卡点：账单内容的分层与定位。已集中折叠；默认主线继续解释缓存存在条件。两位均没有看过未完成的最终WebP，不把文字试读当作图验收。

### 图片与文件

| 路径 | 尺寸 | 体积 | 来源/状态 |
|---|---|---:|---|
| `assets/img/prompt-cache-prefix/prefix-machine.svg` | 1200×675 | 177286 bytes，173.13 KiB | 确定性SVG（anatomy）；可重跑build生成，非发布WebP；WebP上限不适用于SVG源码 |
| `assets/img/prompt-cache-prefix/prefix-machine.webp` | 1200×675 | 27748 bytes | 确定性SVG（anatomy）交互页截图；已逐张打开 |
| `assets/img/prompt-cache-prefix/cover.webp` | 1200×675 | 69376 bytes | `gpt-image-2`，imagegen API CLI 路径 1 次；Prompt 见 `docs/design/prompt-cache-prefix-image-prompts.md`；已逐张打开 |

新增文件：文章；`labs/prompt-cache-prefix/build.mjs`、`index.html`、`model.mjs`、`model.test.mjs`、`runtime.mjs`、`style.css`；`assets/img/prompt-cache-prefix/prefix-machine.svg`；本交付记录。已有文件只修改 `_config.yml`，增加图片共享目录一行。工作区初始干净，没有触碰受禁目录/文件；所有结果未提交。

### 浏览器验收（2026-10-12，Playwright）

- 交互页：点第 1 / 2 / 3 段与「完全不改」，读数依次为 100% / 78% / 55% / 10%，与模型公式一致；读数在校验头动画结束后更新（约 1.5–3 秒，期间显示「定位中…」）；360px 无横向溢出。打开时默认播放自动演示。
- 文章页：1280px 与 360px、Light 与 Dark 四种组合均无横向溢出，封面与正文图加载成功，4 个 details 默认关闭，交互页链接存在；`.reading-highlight` 命中核心命题与「稳定前缀 / 有效缓存边界」两段。
- 未验证：键盘操作、reduced-motion 下的交互页、图片放大入口的点击。

## 指令取舍

- 用户要求单个自包含 HTML，优先于通用 code-style 的静态页面四文件发布建议；可分开发源码，但构建内联发布页。
- 用户限定 anatomy light、无 WebGL/3D runtime；采用等轴 SVG，3D 运行时与深色变体不在本篇发布范围。
- 封面按 `docs/skills/blog-imagegen` 的公共风格块加顶部标题生成，实际 Prompt 与生成记录见 `docs/design/prompt-cache-prefix-image-prompts.md`。
