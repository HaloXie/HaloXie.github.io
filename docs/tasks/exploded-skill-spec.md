# exploded：独立的 3D 拆解交互图 skill（Spec）

状态：Spec 已确认（2026-10-12），未开工。

## 目标

新建一个独立、纯粹的 3D 交互解释图 skill，放在 `.agents/skills/exploded/`。它和 `.agents/skills/anatomy`（平面等轴测）互为补充：

- 简单机制、算法、协议，用 anatomy 的平面图；
- 空间结构、光学、实体物件、拆解图，用 exploded。

它不承载教学流程（先预测、复习等）。与 study-lab（`.agents/skills/learn-lab`）的结合以后再考虑；将来 exploded 会和 study-lab 一起拆到独立仓。

## 边界

- **独立**：skill 不认识博客。只对外暴露主题 token，不读博客的 `_sass`、不读父页面。
- **视觉基准**：只以本站 `labs/camera-exploded` 为基准。不参照、不模仿任何第三方站点的版式、配色或构图。
- **写法参照** anatomy 的组织方式：SKILL.md → references → kit → 审计脚本 → examples；硬规则只写机器能判的，并写明通过时的输出字样。
- 不改 anatomy，不改 learn-lab。

## 子项（每项只做到最小可用；整条链路跑通后再逐项加深）

| # | 子项 | 最小可用的标准 |
| --- | --- | --- |
| 1 | kit 收敛：把 `.agents/skills/learn-lab/assets/kit` 与 `labs/camera-exploded/kit` 两份分叉合成一份，放到 `exploded/kit/` | camera 示例用新 kit 能跑，功能不少于原来两份的并集 |
| 2 | 主题：skill 自带 light / dark 两套主题，对外暴露一组 `--exploded-*` CSS token。three.js 的材质色、背景色、光照档位都从 token 取值，不写死 | 切换主题后，3D 场景的材质和光照随之变化；dark 下不发灰、不像塑料 |
| 3 | 审计脚本，每条都会失败、都以退出码为准：<br>① token 之外不许出现颜色字面量<br>② draw call ≤ 200、自写代码 ≤ 220 KB（沿用相机课 v3 实测预算）<br>③ console 无报错<br>④ headless Chrome 截图（skill 自带脚本，不依赖 anatomy） | 每条检查都配「坏输入必须报错」的测试 |
| 4 | SKILL.md + references：尺寸分档、零件与拆解规则、操作件、标签、嵌入模式（`?embed=1`，宿主通过 token 注入主题） | 每条硬规则都能对应到 #3 的某条检查，或写明由谁审查 |
| 5 | 示例：用 exploded 重做 camera-exploded，作为 `examples/camera/` | 和当前线上版并排截图：拆解、标签、操作件不退化；light、dark 都可用 |
| 6 | 博客适配（博客仓的职责，不进 skill）：主题桥把 Base 变量映射到 anatomy 与 exploded 的 token。把 `labs/prompt-cache-prefix/embed.mjs` 的取色逻辑抽成 `labs/_shared/theme-bridge.js` 共用 | prompt-cache 和新 camera 嵌入文章后，跟随 Light/Dark 切换，字体与正文一致 |

## 风险

| 风险 | 缓解 |
| --- | --- |
| dark 主题下 3D 光照发灰、像塑料（相机课 v1 出现过） | 主题里给 3D 单独一组光照档；light / dark 各截图对比后再定 |
| camera 重做后质感退化 | 动手前先截当前线上版作基线；退化的子项回滚 |
| 博客改 `_base.scss` 后主题桥失效 | 主题桥只读一份白名单变量；`check-rendered-site` 增加一条检查：这些变量必须存在 |
| 规模失控 | 按子项推进，每项只做到最小可用；diff 超出预算 2 倍就停下来重新评估 |

## 变化三件套

- **观测**：每个子项按上表的最小可用标准，用截图和退出码验收，结果记入 `docs/tasks/exploded-delivery.md`。
- **兜底**：子项 5 不达标时，线上 camera-exploded 保留旧版；子项 6 不达标时，prompt-cache 保留内联取色。
- **回滚**：每个子项单独提交，在 master 上直接提交，可以逐个 `git revert`。
