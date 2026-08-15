# 博客项目规范

本文件是 Codex 在本仓库工作的项目级指令。涉及样式、文章、翻译及配图时，必须遵守以下约束。

## 文章命令与包管理器

- Node.js / TypeScript 文章中的依赖安装命令统一使用 pnpm：普通依赖使用 `pnpm add <package>`，开发依赖使用 `pnpm add -D <package>`，全局工具使用 `pnpm add -g <package>`。
- 禁止在新增或修改的文章示例中写入 `npm install` 或 `npm i`。只有文章明确讲解 npm 自身行为、逐字引用外部原始输出，或目标项目已确认只能使用 npm 时例外，并必须就近说明原因。
- 修改文章后必须扫描 `_posts/` 中的 `npm install` 和 `npm i`；无明确例外的命中必须在交付前改为等价 pnpm 命令。

## CSS 与视觉系统修改规范

### 权威来源与文件职责

- `docs/design/blog-base-style-demo.html` 是已经确认的 Base Style 视觉决策记录和 all-in-one 验收 demo，不参与 Jekyll 运行时编译。修改全局字体、字号层级、行高、行宽、主题色、背景色、圆角、阴影、动效或媒体比例前，必须先以该 demo 为基线；若要改变既有视觉方向，先更新 demo 并取得明昊确认，再修改生产样式。
- `_sass/custom/_base.scss` 是生产环境全局设计 token 和基础排版默认值的唯一事实源。字体角色、语义色、type scale、spacing、radius、focus、motion、media、Chirpy vendor variable 映射，以及中英文 Base 默认值都只能在这里定义。Base 是供页面和组件继承的稳定基线，不能为了满足某个局部页面或组件的视觉需求而反向修改。
- `assets/css/jekyll-theme-chirpy.scss` 是主题编译入口和页面/组件样式层。它必须通过 `@use 'custom/base'` 消费 Base；允许处理 sidebar、首页 archive、文章布局、学习路线等组件结构，也允许在明确限定的页面或组件 selector 内 override Base token。局部 override 不得污染 `:root`、复制整套全局体系，或反向修改 `_sass/custom/_base.scss` 来满足局部需求。
- `_includes/head.html` 只负责页面资源加载入口。不得在组件 CSS 中使用 `@import` 临时引入字体，也不得未经确认新增第三方字体 CDN。生产字体方案优先使用仓库自托管、带 hash 的 WOFF2，并按 `lang + layout` 条件加载及构建期 subset。
- 不修改 Chirpy gem、vendor 文件或 `_site/` 构建产物来实现样式；缺陷必须修在上述仓库 source of truth。

### 修改路由

| 变更类型 | 应修改的位置 | 约束 |
| --- | --- | --- |
| 全局字体、颜色、字号、行高、间距、圆角、动效、图片比例 | 先更新 demo；确认后修改 `_sass/custom/_base.scss` | 同一个真值只保留一处，组件只消费语义 token |
| Light / Dark 主题 | `_sass/custom/_base.scss` | 两个主题必须成对定义；同时检查普通文字对比度 |
| 全站中英文排版默认差异 | `_sass/custom/_base.scss` 的语言 override | Base 角色一致，family、line-height、measure、tracking 可按语言设置默认值 |
| 页面或组件的排版与布局差异 | `assets/css/jekyll-theme-chirpy.scss`，或已有对应 partial | 在最小作用域 selector 内 override Base token；不得为局部需求修改 Base 默认值，不复制整套 token 真值 |
| 新字体文件与加载策略 | 先给 payload、license、缓存和 fallback 方案；确认后改资源加载入口 | 不以节省字节为由先降级阅读质量，也不直接把 demo CDN 当生产方案 |
| 实验性视觉方案 | `docs/design/` 下独立 demo | 未确认前不得写入生产 CSS |

### 禁止事项

- 禁止在页面 selector 或组件 class 中硬编码已经存在语义 token 的颜色、字体、阴影、圆角和动效值；确需新增角色时，先判断是否应进入 Base。
- 禁止为了压过错误层级而堆叠 `!important` 或无边界提高 selector specificity。页面/组件确有不同视觉需求时，应在最小作用域 selector 内 override 对应 Base token；不得通过修改 Base 默认值影响其他页面。只有覆盖无法修改的 Chirpy vendor 规则时允许使用 `!important`，并必须就近写明原因。
- 禁止把 `blog-base-style-demo.html` 的整段 CSS 直接复制到生产入口。demo 同时展示全部语言和资源，生产实现必须按页面职责拆分。
- 禁止顺手重排、格式化或重构与本次 goal 无关的样式区域。
- 禁止把系统字体 fallback 的实际渲染误报为自定义字体已加载；字体改动必须检查真实 font face、字重、fallback 和缺字。

### 文章页已确认视觉契约

- 文章正文容器最大宽度为 `55rem`，普通中文段落保持约 `48em`（约 48 字/行）、英文段落保持 `68ch`；只有代码块、表格、图片等宽内容可以占满正文容器。禁止绕过 Base 直接把普通段落硬编码为 `55rem`。
- 中文正文继承 Base 的 `Noto Serif SC`，英文正文继承 `Source Serif 4`。禁止在文章 selector 中把 `Georgia` 或其他局部字体插到 Base family 前面；字体方向变化必须先更新 demo 和 Base。
- 文章与页面排版层级统一由 Base 提供：H1 / 文章主标题 `clamp(1.875rem, 2.2vw, 2.5rem)`；H2 `clamp(1.5rem, 2.2vw, 1.875rem)`；H3 `clamp(1.25rem, 1.7vw, 1.5rem)`；H4–H6 依次为 `clamp(1.125rem, 1.35vw, 1.25rem)`、`1.125rem`、`1rem`；正文桌面 `1.125rem / 1.80`，英文 `1.125rem / 1.72`，移动端 `1.0625rem`。展示型页面也不得另行放大 H1；组件 selector 不得重新硬编码另一套字号或弱化标题字重。
- 桌面文章目录首屏位于文章顶部；文章 header 离开顶部的一小段滚动区间内，目录应连续缓动到垂直居中的阅读状态。禁止把 `top: 50vh` 作为目录初始状态，也禁止只用二态 class 切换制造跳变。
- 文章页 Breadcrumb 左边界必须与正文及学习路线入口左边界一致；覆盖 Chirpy vendor 间距时必须检查 selector 是否真正命中，不能只凭声明存在判断已生效。
- 文章页右上角使用 `#topbar-actions` 作为唯一工具组，顺序为重点高亮、语言切换、搜索。重点高亮不得回到 sidebar；待译文章仍显示语言菜单，但只能链接当前已发布语言，禁止生成空英文页或死链接。
- 新增或改变 Org 徽章、阅读高亮、语言菜单、topbar 工具等可见组件时，必须在同一次变更中同步 `docs/design/blog-base-style-demo.html`；生产已有而 demo 缺失、或 demo 已变而生产未同步，都视为未完成。

### 视觉回归防复发门禁

- 修改文章页字体、measure、Breadcrumb、TOC、topbar 或 sidebar 前，必须先检查相关 selector 的 `git log -p`，区分 Base 决策、临时 override 和 vendor 默认值；不得把历史存在等同于当前权威设计。
- 禁止用 `TODO`、`temporary`、`follow-up` 注释为偏离已确认 demo 的生产视觉放行。需要试验时只允许放在 `docs/design/` 独立 demo，确认后再一次性进入生产。
- 视觉改动必须同时核对三层：demo 决策、`_sass/custom/_base.scss` token、生产组件 selector。三层不一致时先判定权威来源和根因，不得继续叠加 override。
- `scripts/check-rendered-site.rb` 等门禁必须验证当前已确认视觉契约。只有明昊明确改变设计方向时才允许同步修改预期；不得为了让构建通过而弱化或删除检查。
- 交付前必须从最终页面反查：旧入口是否仍存在、组件是否出现在正确区域、单语/双语文章状态是否正确、Light/Dark 与窄屏是否保持同一信息层级。只看 CSS diff 或 build 成功不算视觉验收。

### 多 Session 并发保护

- 修改 CSS 前必须运行 `git status --short`，并检查 `_sass/custom/_base.scss`、`assets/css/jekyll-theme-chirpy.scss`、`_includes/head.html` 和目标组件文件的 staged / unstaged diff。
- 发现目标文件存在不属于当前任务的未提交改动时，不得覆盖、还原、批量格式化或把它们混入提交。能在不重叠 selector 中安全完成时只做最小改动；存在重叠或归属不明时停止修改，报告冲突并等待 session 交接。
- 当明昊明确说另一个 session 正在修改生产样式时，本 session 默认只允许做只读审计、方案或 `docs/design/` demo，除非明昊明确移交生产 CSS 修改权。
- 提交时使用精确 pathspec，只提交本次任务文件；不得夹带其他 session 已 staged 的文件。

### CSS 验收

任何生产 CSS 改动交付前至少完成：

1. `git diff --check`；
2. `JEKYLL_ENV=production bundle exec jekyll b`；
3. `bundle exec ruby scripts/check-rendered-site.rb`；
4. 浏览器检查 Light / Dark，以及 `360 / 768 / 1200px` 下的首页、文章页和直接受影响页面；
5. 检查正文、表格、代码块、长标题无横向溢出，focus 和 `prefers-reduced-motion` 未退化；
6. 涉及字体时，额外验证中文、英文、加粗、代码混淆字符的真实加载，并记录冷缓存请求数和 WOFF2 体积。

若因环境原因不能运行某项，最终汇报必须写明未运行项、替代证据和剩余人工验收点。

## 中文先行、定稿后英译

- 系列文章先以中文完整编写并正常发布，明昊在线上读完整个系列并确认定稿后，再统一进行英文改写；不得为了通过门禁提前生成英文草稿、占位文案或机器直译版本。
- 尚未英译的中文文章放在 `_posts/zh-CN/`，并在 front matter 声明 `translation_status: pending`。它是正式发布的中文文章，不是 `_drafts/` 草稿。
- 英文版本完成后放在 `_posts/en/`。同一文章的两个文件必须使用相同的 `YYYY-MM-DD-<slug>.md` 文件名，并保持 front matter 中的 `date`、`page_id` 和由文件名确定的 slug 一致；同时删除中文文章的 `translation_status: pending`。
- 两个版本分别声明 `lang: zh-CN` 和 `lang: en`；`page_id` 使用稳定的英文 kebab-case slug，作为语言切换和 SEO 关联键。
- 翻译结果必须作为 Markdown 文件进入 Git，允许人工审校和后续修订。Jekyll build、浏览器运行时和页面请求不得调用外部翻译 API。
- 标题、description、正文、图片 alt text 和图内面向读者的文字必须随文章语言本地化；代码标识符、API、CLI、产品名和无需翻译的专有名词保持原文。
- 两个语言版本共用图片时，必须确认图片不依赖单一语言文字；包含中文或英文说明文字的图片应分别提供本地化版本，并在对应文章中引用正确文件。
- 提交前必须运行 `ruby scripts/check-translations.rb`。门禁必须允许显式标记为 `translation_status: pending` 的中文文章单语发布，同时拒绝未标记的缺失翻译、英文单边文章、过期 pending 标记、配对语言错误及 `page_id`、日期或 slug 漂移。
- 中文待译期间，英文站不得生成空文章、复制中文正文或死链接；学习路线按语言分别显示发布状态。整个中文系列确认定稿后，英文转译属于必须收口项，不能无限保留 pending。

## 目标

配图必须帮助读者理解文章中的关系、流程、对比、层级或关键结论，不能只作为装饰。已有图片覆盖充分时不重复添加，短文也不按固定数量凑图。

## 图片规格

- 每篇新文章必须在 front matter 中配置封面：

  ```yaml
  image:
    path: /assets/img/<post-slug>/cover.webp
  ```

- 新增封面和正文配图统一使用 `16:9`，交付尺寸固定为 `1200 × 675`。
- 发布格式统一为 WebP。文章只引用 WebP，不直接引用生成过程中的 PNG 或其他中间文件。
- 单张 WebP 目标不超过 `100 KB`，硬上限为 `150 KB`。超过目标时先压缩；不得通过明显降低文字清晰度达标。
- 图片放在 `assets/img/<post-slug>/`，使用能表达内容的英文 kebab-case 文件名。
- Markdown 必须提供准确的 alt text，说明图片表达的结论，不写 `image`、`cover` 等无意义文本。
- 现有非 16:9 图片不因普通文章编辑而强制重做；只有新增、替换或明确治理图片时才应用本规范。
- 历史非 `1200 × 675` 图片只允许使用 `scripts/content-image-exceptions.yml` 中冻结的显式豁免；豁免只能删除，不能新增路径。新增、替换或派生图片不得加入该清单。

## 视觉风格

默认参考 `assets/img/harness-engineering/strategy.webp`：

- 温暖米白纸张背景，主色接近 `#f6f0df`。
- 黑色或深灰色手绘墨线，允许轻微不规则边缘，但保持结构清楚。
- 只用少量低饱和强调色：天蓝、橙色、黄色、浅绿色；每张图不超过 4 个主强调色。
- 信息图优先使用卡片、箭头、阶梯、泳道、护栏、闭环等简单视觉隐喻。
- 标题清晰，正文标签简短；图内文字只保留理解关系所必需的内容。
- 图中文字语言跟随文章主语言；代码标识符、API、CLI、产品名保持原文。
- 保留足够留白，移动端缩放后仍能看清主要结构。

禁止以下风格：

- 与文章无关的装饰性人物、场景或图标堆叠；
- 赛博朋克霓虹、重度渐变、玻璃拟态、营销海报感；
- 逼真 3D 产品渲染或照片风，除非文章主题明确需要；
- 未经原文或权威来源支持的数字、比例、排名和品牌声明；
- 水印、生成器署名、额外 logo；
- 用大段文字复刻正文，或生成难以辨认的小字号表格。

## 选图与放置

- 封面负责表达文章的核心命题，不承担完整流程说明。
- 正文图只放在认知负担高的节点，优先级为：
  1. 架构或模块关系；
  2. 流程、状态机或时间顺序；
  3. 多维对比或决策框架；
  4. 全文总结。
- 一篇长文通常补 1–3 张正文图；已有表格、代码块或 Mermaid 已足够表达时不重复画图。
- 图片紧跟首次解释对应概念的段落或标题之后，不能提前剧透尚未解释的结论。

## 生成方式与来源透明

- 新的艺术性插图或手绘风格配图默认使用 `imagegen` skill，并优先调用 `gpt-image-2`。
- 如果当前环境没有可用的内置图片生成入口，不得静默改用 SVG、HTML、Canvas 或其他方式伪装成模型生成图。必须先说明不可用原因和可选路径。
- 只有需要精确文字、可验证几何关系或可编辑图表时，才可以使用 SVG 作为 source of truth；使用前必须明确告诉用户这是确定性绘图，不是 `gpt-image-2` 生成。
- 使用 SVG 时，文章仍引用由 SVG 导出的 WebP。SVG 与 WebP 同名并保存在同一文章目录。
- 禁止声称调用了未实际调用的模型或工具。最终交付必须说明图片来源：`gpt-image-2`、确定性 SVG，或其他真实方式。

## 验收

交付前必须逐张检查：

- 尺寸为 `1200 × 675`，格式为 WebP，体积满足限制；
- 原始尺寸下无错字、文字重叠、箭头歧义、边缘裁切和明显生成伪影；
- 图片表达与原文一致，没有增加未经验证的事实；
- front matter、Markdown 引用和真实文件路径一致；
- 全仓 `/assets/img/` 引用无断链；
- 通过 `ruby scripts/check-content-images.rb`，确认英文内容无未豁免 CJK、Markdown 图片 alt 有意义、发布引用均为有效 WebP、尺寸与体积合规、英文 SVG 可解析且无 CJK；
- 通过 `git diff --check`，且没有把临时 PNG、截图或生成缓存提交进仓库。

最终汇报必须列出新增图片路径、尺寸、体积、生成方式和未运行的验证项。
