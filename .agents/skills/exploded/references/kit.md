# kit API

**适用**：搭 lab 时查接口。kit 在 `kit/`，lab 用相对路径 import，不拷贝。

坐标约定：实验台台面 `y = 0`，观众默认站在 `-z` 一侧看向 `+z`；单位约等于米的 1/10（1:10 微缩）。

## 舞台 `stage.js`

`createStage({ container, bench, fov?, post? })` → `stage`

- `bench`：台面范围 `{ x0, x1, z0, z1, h }`，房间、灯、阴影相机都按它摆。
- `post`：`{ gtao, bokeh, bloom }` 开关，默认全开；`?post=0` 这类调试开关由 lab 自己接。
- 返回：`THREE, renderer, scene, camera, controls, lights, bench, post, views, bounds, stats, theme`。
- `stage.onFrame((dt, now) => …)`：渲染前更新状态。`stage.onAfter(fn)`：渲染后（标签层）。
- `stage.renderExtra((renderer) => …)`：副渲染（取景器等），draw call 单独计入 `stats.extraCalls`。
- `stage.markShadows()`：静态物体动过后重算一次阴影（阴影默认不每帧更新）。
- `stage.onTheme((T) => …)`：明暗或 token 变了之后回调；房间、台子、灯光 kit 自己会重建，lab 只管自己随主题变的东西。
- `stage.start()`：开帧循环。
- `window.__exploded`：`{ mainCalls, extraCalls, fps, scheme }`，审计脚本读它。

## 机位 `views.js`（经 `stage.views`）

- `define(name, { dir, box, target?, fill? })`：`dir` 观察方向，`box` 主体包围盒（`Box3` 或返回 `Box3` 的函数），`fill` 主体占空白区的比例（默认 0.6）。
- `go(name, instant?)`：运镜到机位；初始化时 `instant = true`。
- 空白区从 DOM 读：带 `data-dock="left|right|top|bottom"` 的元素向内挤占画面，主体投在剩下区域的中心。
- `solved[name]`：`{ fillW, fillH, inside }`，可用来核对主体是否完整落在空白区。

## 操作件 `controls3d.js`

- `createPicker(stage)`：指针拾取，处理悬停、按下、拖动；操作件都挂在它上面。
- `knob(stage, picker, { position, labels, title, tone, value, onStep })`：挡位旋钮，拖动或点击换挡，`set(i)` 同步外部状态。
- `pushButton(stage, picker, { position, color?, onPress })`：按下回弹的按钮，`kick()` 播一次按下动画。
- `gauge(stage, { position, r, range, title, ticks })`：指针表盘，`set(value, readout)`。
- 底座、旋钮、表盘的颜色在 `kit/palette.js` 的 `CONTROL`，不随明暗变化。

## 标签 `labels.js`

`createLabels(stage, parent)` → `{ add(key, { anchor, tone, lift, html, visible }) }`，每个标签返回 `{ set(html), show(bool), el }`。`anchor` 是返回世界坐标 `Vector3` 的函数，每帧取一次；`tone` 取 `o | c | g | w`，对应 token 里的橙 / 青 / 绿 / 白。

## HUD `hud.js`

- `seg(el, [{ label, title? }], onPick)` → `{ set(i), buttons }`：分段按钮。
- `statCards(el, [{ key, label, tone }])` → `set(key, value, sub)`：数字卡，值变化时闪一下。
- `modal()` → `{ open(node, caption) }`：放大查看。

## 工具 `util.js`

`spring / bouncy / springVec / damp`（缓动）、`paint(geo, color)`（刷顶点色，便于合并成一次 draw call）、`at(geo, x, y, z, rx, ry, rz, s)`、`merge(list)`、`rbox / prbox`（倒角盒）、`canvasTexture(w, h, draw)`、`glow(color, k)`（分量 > 1 进 bloom）、`rng(seed)`、`$(id)`。

## 主题 `theme.js` / `scheme.js` / `palette.js`

见 `theming.md`。lab 需要随主题取色时用 `color('名字')` / `number('名字')` / `token('名字')`，名字不带 `--exploded-` 前缀。
