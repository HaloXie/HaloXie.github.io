---
name: exploded
description: 用 three.js 做 3D 交互解释页：把一个实体物件（相机、镜头、引擎、键盘、硬盘……）放在台面上，零件可以拆开成爆炸图，读者拧台面上的 3D 旋钮、按按钮，看现象和读数一起变。用于空间结构、光学、机械拆解这类平面图讲不清的主题；简单机制、算法、协议用 anatomy 的平面等轴测图。自带 light / dark 主题 token、嵌入模式（iframe ?embed=1）和会失败的审计脚本。
license: MIT
compatibility: 浏览器端 ES module + three 0.160（jsdelivr importmap），无构建步骤。审计脚本需要 Node 24+（直接运行 .ts）和本机 Chrome。
---

# exploded

做出来的东西像博物馆台面上的一件展品：房间、实验台、灯光都齐，主体是一个真实物件，零件能沿轴线拆开，标签用引线钉在零件上，台面上有能拖的旋钮和按钮。读者改一个参数，画面里的现象、零件和读数一起变，因为它们出自同一个模型。

完整示例：`examples/camera/`——相机对着 1:10 微缩布景，副相机按物理实时算取景画面；机械剖视下可切「组装 / 爆炸图 / 光路图」。动手前先打开它看一遍，结构照它搭。

## 一个原则

**先定现象，再搭物件。** 先回答「读者改一个变量，眼前什么在变」，再挑物件、摆道具。每件道具都对应一个现象（相机课：人偶在对焦距离上看清晰，风车一直转看拖影，灯串在远处看光斑），没有纯装饰的道具。画面上承载现象的效果必须与数字卡出自同一个纯函数模型；只管手感的效果（倒角、阴影、AO、常驻微动）可以省，但不许与现象矛盾。

## 规模

| 档 | 内容 | 预估 |
| --- | --- | --- |
| 拆解件 | 一个物件 + 8–15 个可拆零件 + 标签，2–3 个机位 | 1–2 小时 |
| 实验台 | 物件 + 布景 + 台面操作件 + 副渲染（camera 示例这一档） | 4–6 小时 |

两档共用预算：主画面 draw call ≤ 200，kit + lab 自写代码 ≤ 220 KB。开工前告诉对方是哪一档、多久。第一个小时内要有能在浏览器里打开的页面，再逐步加深。

## 工作流

1. **模型**：真实数字和行为写成纯函数模块（camera 的 `optics.js`），读数、零件动作、叙述都从它派生。写 `model.test.mjs` 对照几组手算值。
2. **零件表**：每个零件写名称、一句说明、组装位、爆炸位移 `dE`（沿主轴拉开，间距随零件序号递增），发光零件只留「正在起作用」的那个。配方见 `references/explode.md`。
3. **搭骨架**：照 `examples/camera/` 建 lab 目录——`index.html`（壳）、`lab/main.js`（入口）、`lab/markup.js`（面板 DOM）、`lab/palette.js`（固有色）、`lab/theme.css`（本课 token，可选）、`lab/lab.css`。壳的写法见下文硬规则。
4. **舞台**：`createStage({ container, bench })` 拿到房间、实验台、灯光、相机、后处理；物体加进 `stage.scene`，每帧逻辑写 `stage.onFrame`，副渲染包在 `stage.renderExtra`。API 见 `references/kit.md`。
5. **机位**：`stage.views.define(name, { dir, box, fill })` 定义总览 / 近看 / 剖视，`stage.views.go(name)` 运镜过去；面板加 `data-dock="left|right|bottom"`，主体自动避开面板、占画面约 60%。
6. **操作件长在台面上**：主变量用 `knob` / `pushButton` / `gauge` 做成 3D 物体，能拖、有挡位；HUD 的分段按钮只放「切换类」选项。
7. **标签**：`createLabels(stage, $('app')).add(key, { anchor, tone, lift, html })`，常驻显示，颜色跟语义走（青 = 正在讲的，橙 = 对比对象）。
8. **主题与嵌入**：颜色只用 token，宿主怎么接见 `references/theming.md`。
9. **审计到全绿，再看图**：`node scripts/audit.ts <lab 目录> --root <服务器根> --view "<机位参数>"…` 最后一行必须是 `audit: OK`；然后打开它截的每张 PNG，与 `examples/camera` 的同机位截图并排比，写下最大 3 个差距再改，最多 3 轮。常见差距：布景空、道具稀；机位切掉半截控件；主体太小；结果要操作才出现，截图看不到；金属反射成灰白像塑料。

## 硬规则

每条都由审计脚本判定；脚本输出 `FAIL` 即未完成。

| 规则 | 判定 |
| --- | --- |
| 颜色字面量只能写在 `theme.css`（随明暗变：kit 的 `--exploded-*`、本课的 `--lab-*`）和 `palette.js`（零件固有色）；别处一律引用 | `check-static.ts` |
| `index.html` 只是壳：`<head>` 依次 `<script src=".../kit/scheme.js">`、`<link .../kit/kit.css>`、`<link lab/lab.css>`、importmap、`<script type="module" src="lab/main.js">`；`<body>` 只有 `<div id="app"></div>`。不写 `<style>`、不写 `style=`，面板 DOM 放 `lab/markup.js` | `check-static.ts` |
| kit 只引用不拷贝：lab 目录里不许出现 kit 文件的副本 | `check-static.ts` |
| kit + lab 自写代码 ≤ 220 KB | `check-static.ts` |
| 主画面 draw call ≤ 200 且 > 0；页面由 `createStage` 搭（有 `window.__exploded`） | `capture.ts` |
| 控制台无报错、无未捕获异常、无加载失败；无横向滚动；light / dark 各自生效 | `capture.ts` |
| `kit/` 不 import lab；只有至少两个 lab 都要的能力才进 kit | 人工审查 |

## 已知陷阱

- `MeshBasicMaterial` 没有 `.emissive`，赋值后每帧报错、整场景全黑。发光条走 `glow()` 顶点色；`.emissive` 只用于 `MeshStandardMaterial` / `MeshPhysicalMaterial`。
- 半透明叠加层设 `userData.noDepth = true`，不进 AO / 景深深度通道，每个省 2 次 draw call。
- 环境贴图亮度由 `--exploded-env` 控制；直接用白房间 `RoomEnvironment` 会让金属反射成灰白。
- 「快照」类动作（拍照、记录）要冻结当时的全部参数，否则说明文字和画面对不上。

## 参考

- `references/kit.md`：kit 各模块的 API 和坐标约定。
- `references/explode.md`：零件注册、爆炸 / 光路位移、弹簧级联、标签锚点。
- `references/theming.md`：token 清单、明暗解析、宿主覆盖 token、嵌入模式。
- `scripts/`：`audit.ts`（总入口）、`check-static.ts`、`capture.ts`，各配 `*.test.ts`（`node --test scripts/*.test.ts`）。
