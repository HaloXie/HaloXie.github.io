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
