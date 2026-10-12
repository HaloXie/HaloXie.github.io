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
