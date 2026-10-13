# 主题与嵌入

**适用**：选颜色、接入宿主站点、放进文章 iframe。

## 三处颜色来源

| 文件 | 放什么 | 随明暗变 |
| --- | --- | --- |
| `kit/theme.css` | `--exploded-*`：界面（底色、文字、面板、标签、强调色）、房间与台子、灯光颜色与强度、曝光、bloom、雾 | 是 |
| `<lab>/theme.css` | `--lab-*`：本课界面专用色（相机屏幕黑、相纸色……） | 可选 |
| `palette.js`（kit 一份、lab 一份） | 零件固有色：黑色旋钮、黄色外套、绿草地 | 否 |

其余文件不写颜色字面量（`check-static.ts` 判定）。半透明强调色用 `color-mix(in srgb, var(--exploded-cyan) 20%, transparent)` 派生。

数字 token（`--exploded-hemi`、`--exploded-key`、`--exploded-env`、`--exploded-exposure`、`--exploded-bloom`、`--exploded-lamp-glow`、雾距）也在 `theme.css`，light / dark 各一档。dark 是相机课 v3 的原值；light 的房间偏暖浅、灯带不发光、bloom 很弱。

## 明暗怎么定

1. `kit/scheme.js`（普通脚本，`<head>` 里第一个）读 `<html data-exploded-theme="light|dark">`；没有就跟系统 `prefers-color-scheme`。
2. 结果写到 `<html data-exploded-scheme>`；`theme.css` 只认这个属性，首帧前就定好，不闪。
3. `kit/theme.js` 把 token 交给 three.js：颜色经浏览器解析再读像素，所以 token 可以写任意 CSS 颜色语法（hex、`rgb()`、`color-mix()`、`var()` 引用宿主变量）。
4. `<html>` 的 `data-exploded-scheme` 或 `style` 一变，`stage` 重读 token：背景、雾、灯、曝光、bloom、环境贴图更新，房间和台子按新颜色重建，再回调 `stage.onTheme`。

## 宿主怎么接

skill 不认识宿主。宿主只做两件事：

- **定明暗**：在 lab 页面的 `<html>` 上写 `data-exploded-theme`（例如跟站点的明暗开关同步）。
- **改颜色字体**：在 kit.css 之后 `<link>` 一个宿主样式表，用 `:root[data-exploded-scheme] { --exploded-bg: …; }` 覆盖 token（同权重，后加载者胜）；或直接写 `<html style>` 上的变量。房间色可以从宿主画布色派生，例如 `--exploded-wall: color-mix(in oklab, var(--canvas), var(--ink) 9%)`，明暗两套自动协调。

宿主页面也是壳：`<head>` 里宿主脚本 → `kit/scheme.js` → `kit.css` → `lab.css` → 宿主样式表 → importmap → `lab/main.js`，`<body>` 只放宿主自己的外框和一个空 `#app`。lab 代码只有一份，宿主页和 skill 示例都引用它。

## 嵌入模式

- 用 iframe 打开 `?embed=1`：`scheme.js` 在 `<html>` 上加 `data-exploded-embed`，带 `data-embed="hide"` 的元素隐藏，面板宽度收到 208px，面板过高时内部滚动。
- lab 自己决定哪些面板在嵌入时隐藏：保留主体、台面操作件和最关键的一块读数（camera 留取景画面与机位切换），其余标 `data-embed="hide"`。
- 3D 场景没有「内容高度」，iframe 高度由宿主按宽高比给（例如 `aspect-ratio: 16 / 10`）；720×450 下要能看清主体和操作件。
- 嵌入时不自动播放演示；`createStage` 自动在顶部居中放「全屏打开 ↗」链接（新窗口打开不带 `embed` 的页面），lab 不用自己写。
