# exploded 交付记录

Spec：`docs/tasks/exploded-skill-spec.md`。每个子项单独提交，按最小可用标准验收。

## 子项 1：kit 收敛（2026-10-12）

- **两份分叉的实际差异**：`.agents/skills/learn-lab/assets/kit` 是 `labs/camera-exploded/kit` 经 lint 自动修复后的副本。两份用同一套格式化后对比，275 行差异全是改名（`el`→`element`、`i`→`index` 等）、`forEach`→`for…of`、`appendChild`→`append`、数字分隔符，没有功能差异。其中 `setFocus(dist, …)` 被改成 `setFocus(distribution, …)`，属于误改名。
- **做法**：以线上验证过的 `labs/camera-exploded/kit` 为源，原样放到 `.agents/skills/exploded/kit/`，所以「不少于两份的并集」自然成立。camera 示例放到 `examples/camera/`，import 改指 `../../../kit/`，并去掉博客外壳（`lab-shell.css` 和返回导航），示例不依赖博客。
- **未动**：`labs/camera-exploded`（线上版，子项 5 再替换）、learn-lab 的 kit（Spec 约定不改 learn-lab）。
- **验收**（本地静态服务器，1280×800，Chromium）：
  - 总览视图（`?view=overview&f=2.8&t=1%2F30&iso=100`）加载正常，场景、取景画面、操作件、标签齐全；
  - 机械剖视 → 爆炸图：和线上 `/labs/camera-exploded/` 同参数截图逐项一致（零件、标签、材质、面板），唯一差别是去掉了博客顶栏；
  - 控制台：示例 0 条报错（不计本地服务器的 favicon 404）；
  - 体积：kit 加示例 lab 合计约 140 KB，低于 Spec 的 220 KB 预算。

## 子项 2：主题（2026-10-12）

- **token 来源**：`kit/theme.css` 定义全部 `--exploded-*` token，light 写在 `:root`，dark 写在 `[data-exploded-scheme="dark"]`；dark 一组沿用原值，所以 dark 画面与线上版一致。数字 token（灯光强度、曝光、环境光、bloom、雾距、灯带亮度）同样在这里分档。
- **明暗解析**：`kit/scheme.js`（普通脚本，放在 `<head>`）按 `<html data-exploded-theme>` 或系统偏好写 `data-exploded-scheme`，首帧前定好，不闪。
- **three.js 取值**：`kit/theme.js` 用浏览器解析 token 再读像素得到颜色，因此 token 可写任意 CSS 颜色语法；`stage.js` 的背景、雾、曝光、环境贴图、四盏灯、bloom、房间和台子都从主题取值，`<html>` 的 `data-exploded-scheme` 或 `style` 变化时整体重算，房间和台子重建。lab 用 `stage.onTheme(fn)` 跟随。
- **固有色**：不随明暗变的颜色放在 `palette.js`（kit 一份管旋钮表盘与陈设，camera 示例一份管模型与布景，约 98 处字面量迁入，代回原值后与改前逐字一致）。lab 自己的界面色放在 lab 的 `theme.css`（`--lab-*`）。
- **验收**（1280×800 与 2000×1057，Chromium）：
  - light / dark 各截总览与爆炸图：light 为浅色工作室、木台、深色机身，不发白；dark 与线上一致；
  - 运行时把 `data-exploded-theme` 从 light 改成 dark，场景和面板随之切换；在 `<html style>` 覆盖 `--exploded-wall`，墙面立即按新颜色重建；
  - 控制台 0 报错；主画面 draw call：总览 198、爆炸图 92–122（预算 200）。

## 子项 3：审计脚本（2026-10-12）

脚本都在 `.agents/skills/exploded/scripts/`，TypeScript，Node 24 直接运行，无依赖；Chrome 用本机安装（或环境变量 `CHROME`）。

| 脚本 | 检查 | 坏输入测试 |
| --- | --- | --- |
| `check-static.ts` | ① 颜色字面量只能在 `theme.css` / `palette.js`（JS 的 `0x` 六位十六进制与字符串颜色；CSS 声明值的 hex / 颜色函数 / 颜色名）；HTML 不许 `<style>`、`style=`，必须 `<link>` kit.css、`<script src>` scheme.js；lab 里不许有 kit 副本；② 自写代码 ≤ 220 KB | `check-static.test.ts` 6 条 |
| `capture.ts` | ③ 控制台报错、未捕获异常、资源加载失败；② 主画面 draw call ≤ 200 且 > 0；页面必须有 `window.__exploded`（走了 kit）；明暗与 `--theme` 一致；无横向滚动；④ 截图 | `capture.test.ts` 5 条（夹具在 `scripts/fixtures/`） |
| `audit.ts` | 静态检查 + light / dark × 每个 `--view` 的浏览器检查，最后一行 `audit: OK` | 由上两者覆盖 |

- 写测试时发现第一版 CSS 规则只匹配 `--` 开头的属性，普通属性全漏，此前对 camera 的「OK」是假通过；修正后又把 `var(--exploded-orange)` 误判为颜色名，加了边界。两处都有对应测试。
- 顺带调了 light 主题：半球光 1.15→0.8、环境光 0.85→0.6、地面与墙面压深、雾起点推远；1280×800 下地面不再发白。
- 验收：两个测试文件 11/11 通过；`node scripts/audit.ts examples/camera --root . --view "view=overview" --view "view=section&cut=exploded"` → `audit: OK`（静态 156.1 KB；draw call 总览 198、爆炸图 156）。
- 已知：URL 直接打开 `view=section&cut=exploded` 时机位与点击进入不同（过渡未完成），沿用原示例行为，未改。

## 子项 5：camera 实验室改用 exploded（2026-10-12）

- **index.html 只当壳**：面板 DOM 移进 `examples/camera/lab/markup.js`，`main.js` 启动时写进 `#app`；壳只剩 `scheme.js` → kit.css → lab.css → importmap → `main.js` 和一个空 `#app`。`check-static.ts` 新增规则：`<body>` 只许一个空 `#app`（附坏输入测试）。
- **嵌入模式**：`?embed=1` 时 `scheme.js` 加 `data-exploded-embed`，`data-embed="hide"` 的元素隐藏，面板收到 208px，过高时内部滚动。camera 嵌入时保留场景、台面操作件、取景画面和机位 / 剖视切换。
- **发布**：`labs/exploded` 软链到 `.agents/skills/exploded`，`_config.yml` 排除 SKILL.md、references、scripts、package.json；`labs/camera-exploded/` 删掉原来的 kit 与 lab 两份副本（−3103 行），index.html 改成博客壳，引用 `/labs/exploded/…`。
- **验收**：skill 审计 `audit: OK`（light / dark × 总览 / 爆炸图，draw call 198 / 156，静态 157.0 KB）；构建产物里博客页 light / dark 截图：界面用博客字体与 Base 配色，dark 房间为暖暗色，控制台 0 报错。

## 子项 6：博客主题桥（2026-10-12）

- `labs/shared/theme-bridge.scss`（Jekyll 编译为 `/labs/shared/theme-bridge.css`）：`@import "custom/base"` 取博客 Base 变量，把 `--exploded-*` 与嵌入时的 `--anatomy-*` 映射过去；房间色由 `--canvas` / `--ink` 用 `color-mix` 派生；返回导航跟随 Base；嵌入时隐藏导航。
- `labs/shared/theme-bridge.js`：只同步明暗。嵌入时跟父页面 `data-bs-theme`，独立页读 Chirpy 的 `localStorage.theme`，没有就跟系统；写本页 `data-bs-theme` 与 `data-exploded-theme`。
- prompt-cache 的 `embed.mjs` 去掉逐项读取父页面颜色和字体的代码，只保留 anatomy 的 `body[data-theme]` 同步与高度自适应；anatomy 审计与模型测试通过。
- `check-rendered-site.rb` 新增两条：主题桥引用的 Base 变量必须在编译产物里有定义；`labs/*/index.html` 引用的 `/labs/…` 文件必须存在。两条都用改坏的产物验证过会失败。
- **验收**：
  - 文章里的 prompt-cache：light / dark 背景与父页面一致（247,245,241 / 25,24,23），切换父页面明暗随之变化；高度 764 等于内容高度；360px 下 iframe 宽 320、页面无横向溢出；
  - camera 以 `?embed=1` 嵌入测试页（只放在 `_site`，未提交）：跟随父页面切换明暗，导航与左栏隐藏，draw call 198；
  - 博客门禁：translations / content-images / reference-links / diff-check / jekyll build / pagefind / check-rendered-site / htmlproofer 全部通过（htmlproofer 第一次失败是增量构建留下的旧 `_site/en/labs/camera-exploded`，`jekyll clean` 后通过）。

## 子项 4：SKILL.md 与 references（2026-10-12）

- `SKILL.md`：一个原则（先定现象再搭物件）、规模两档与预算、9 步工作流、硬规则表（每条对应 `check-static.ts` / `capture.ts` 的检查，或写明人工审查）、已知陷阱。
- `references/kit.md`（API 与坐标约定）、`references/explode.md`（零件表、爆炸 / 光路位移、弹簧级联、标签）、`references/theming.md`（三处颜色来源、明暗解析、宿主接入、嵌入模式）。
- Claude Code 入口 `.claude/skills/exploded` 软链；博客 `AGENTS.md` 补 exploded 的使用规则，并把 anatomy 那条改成走共享主题桥。
- 测试：`node --test scripts/*.test.ts` 12/12 通过。

## 第二轮：其余实验迁到 exploded（2026-10-12 – 10-13）

方案按物件适配度分档：有空间结构的做 3D 实验台，没有实体物件的只换主题层（明昊拍板）。

| 实验 | 做法 | 提交 |
| --- | --- | --- |
| 梯度下降 | 3D 实验台：损失面做成台面地形模型，小球沿曲面走并留轨迹；学习率旋钮、单步 / 播放 / 重置按钮、loss 表盘长在台面上。模型拆为 `lab/model.js` + 测试（5/5）。小学习率在步数上限内没走到底时，原页误判为「发散」，新增结局「太慢」与第四个预测选项 | `b95bd1d` |
| 景深 | 3D 导轨实验台：0–6 m 刻度导轨上放相机、三个人偶、5 m 灯串；近点 / 远点亮边薄板与导轨色带随旋钮伸缩；模拟照片为相机位副渲染，模糊量取自 `optics.js` 弥散圆（测试 4/4）。第一版主体过小、侧视有杂物、照片是 2D，返工一轮 | `b2bfa8d` |
| EXIF 猜谜 | 只换主题层：壳 + `lab/` 拆分，样式只用 token，趋势图随明暗重绘。「示例照片不自动载入」核实为误报（截图早于载入完成），补「正在载入」提示 | `ca494f5` |

博客 lab 代码放 `labs/<slug>/lab/`，经 `../../exploded/kit/` 引用 kit；`AGENTS.md` 写明审计命令：先 `jekyll build`，再对 `_site/labs/<slug>` 跑 `audit.ts --root _site`（`theme-bridge.css` 由 scss 编译，源码目录下 404）。

kit 与审计脚本的改动：

- **宿主外框**：`check-static.ts` 放行带 `data-host` 的元素与只含 class 的包层，博客导航不再违规（附测试）；`lab-shell.css` 导航改用 token，亮色下不再是深色条（`decb139`）。
- **capture 等待**：three 经 CDN 单文件 2–3 秒，固定等 6 秒时 `__exploded` 偶发未出现（梯度下降对照组同样复现）；改为先轮询舞台就绪（上限 wait×5）再等稳定（`e99b109`）。
- **嵌入全屏链接、表盘分区、灯带开关**：`createStage` 在 `?embed=1` 时自动放「全屏打开 ↗」；`gauge` 加 `zones`，梯度下降的 loss 表改为绿 = 全局最低、橙 = 发散；`stage.setLamps(on)`，景深侧视关掉穿过主体的背墙灯带（`dc013c2`）。
- **标签避让与窄屏**（`262b115`）：
  - 胶囊重叠时上抬、出画时横向收回；
  - ≤ 640px 时面板搬进底部抽屉，嵌入模式下隐藏；
  - 修运镜结束条件漏查 `oy`：只有竖向偏移变化时运镜提前停，主体落在抽屉后面；
  - 竖屏相机距离实测 40–107，同步放宽滚轮上限与远裁面，雾区随距离后移（基准 32 = 1280×800 最远机位）。

**验收**：
- 三个 3D 实验在构建产物上 `audit: OK`（light / dark × 总览 / 侧视 / 嵌入；draw call 相机 198、梯度下降 91、景深 104）；
- 720×450 嵌入与 360×740 截图逐张看过，标签不重叠、主体完整、无横向滚动；
- 推送后线上 4 个实验 light / dark 各打开一次，均为 0 报错；360×740 下三个 3D 实验都有底部抽屉。

## 未做 / 已知

- 以桌面 web 为主（明昊 2026-10-13）：手机竖屏只保证能用，主体约占屏宽六成，不做手机专用机位。
- URL 直接打开 `view=section&cut=exploded` 时机位按组装态包围盒算，和点击进入不同，沿用原行为。
- 博客没有嵌入 3D 实验的文章；嵌入只在构建产物上以 `?embed=1` 验证过。
- EXIF 猜谜没有自动化测试；页面开着时切换博客明暗、趋势图是否即时重绘未验证。
