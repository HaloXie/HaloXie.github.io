# 角色动作参考生成记录

用途：模型参考素材，非文章发布图。主参考仍为已确认三角色图；这些新动作和未见过的全身比例属于候选，不表示明昊已逐格批准。

2026 年 11 月 12 日，通过 gpt-image-2 编辑生成三个角色动作板，各一次成功。每次输入同一张 `docs/skills/blog-imagegen/assets/mentor-otter-cat.webp`。请求与实际输出均为 3072×1728，high，PNG；本地以 WebP quality 95 保存原尺寸板。初次四等分发现部分耳尖跨中线，已改为按完整角色边界裁出，再以原像素居中放入 1536×864 单格画布，没有插值放大。

| 角色 | 板文件（相对技能 assets/actions/） | 字节数 | 单格数 |
| --- | --- | --- | --- |
| 水豚 | mentor-sheet.webp | 282870 | 4 |
| 水獭 | otter-sheet.webp | 272330 | 4 |
| 白猫 | cat-sheet.webp | 184350 | 4 |

图板及单格用途、文件索引、已知姿态差异见 [动作参考库](../skills/blog-imagegen/references/actions.md)。无透明背景。原始 PNG 保留在本次工作产物目录，不提交响应或运行环境信息。已检查输出尺寸、格子裁切、配饰与外形；尚未测试将单格作为新请求输入后的复现效果，未接入文章或发布。

## 实际 Prompt

每个请求由下方公共块、一个换行、对应角色块完整拼接，未自动增补。

### 公共块

```text
Use the attached approved illustration as the EXACT character identity and style reference. Produce a HIGH RESOLUTION 2 by 2 CHARACTER ACTION REFERENCE SHEET, landscape 16:9, four equal rectangular cells, no visible borders. Exactly FOUR instances of ONLY the specified character, one per cell, identical scale and anatomy, three-quarter view, full body with every foot, ear, accessory and tail entirely visible. Keep each pose centered in its own quadrant with generous blank margins, never crossing the middle horizontal or vertical line; this sheet will be cropped into four separate model-reference images. Clean uniform pale cream #FFF9E9 background. Preserve the reference facial geometry, warm appealing expressions and crisp hand-drawn black contours, restrained texture, clean blue/orange/mint accent fills. No hatching, realistic fur, 3D, gradients, extra clothing or new accessories. Expressions may change intentionally but eye shape, muzzle, ear placement, head-to-body ratio and color must stay consistent across cells. No text, letters, numbers, speech balloons, captions, panels, scenery, shadows reaching other cells or other characters. No floating or extra limbs. These are model-conditioning references, not a comic or production diagram. Do not enlarge details artificially; render clean detail at native resolution.
```

### mentor

```text
Character ONLY: the original large warm-tan CAPYBARA MENTOR, broad blunt muzzle, small high ears, kind attentive eyes, orange CLOSED crossbody bag. No visible tail, no glasses, no magnifying glass. Mature calm friendly teacher, never pompous or angry. Top left: opening a gentle explanation with one open palm. Top right: carefully explaining a key point, one paw indicating a simple blank card held by the other. Bottom left: listening attentively to a student's reasoning, slight head inclination, thoughtful relaxed mouth, paws resting naturally. Bottom right: guiding two competing explanations toward a test, both open palms inviting comparison, curious encouraging expression, NOT pointing an accusing finger or choosing a winner. All four preserve the approved mentor face and stockier adult proportions.
```

### otter

```text
Character ONLY: original smaller warm-brown OTTER senior learner, cream muzzle and belly, small round ears, long tapered tail, original sky-blue neckerchief, thoughtful steady kind face. Not a teacher and not a baby. Top left: listening carefully, forepaws calmly together, attentive look. Top right: thinking cautiously about a problem, one paw near chin, slightly questioning brows, not anxious or gloomy. Bottom left: suggesting a practical attempt, one paw gently indicating a small plain blank task card held in the other, modest helpful expression. Bottom right: checking a result, holding one plain card and looking closely at it with an interested thoughtful expression, no magnifier. Same face and same relative body proportions in all four, tail fully visible within each cell.
```

### cat

```text
Character ONLY: original small warm-white CAT junior learner, triangular ears with pale pink inside, slender curved tail, thin mint-green collar, small natural expressive eyes, bright clever friendly expression, no clothing or bows. Lively and intelligent, not silly or always wrong. Top left: eagerly asking a question, one front paw raised slightly, mouth gently open, ears attentive. Top right: recognizing a useful everyday analogy, one paw lightly near cheek and the other open, delighted but not exaggerated. Bottom left: proposing a counterexample, curious head tilt with one paw extended palm up, thoughtful confident expression, not confrontational. Bottom right: trying a simple idea, carefully arranging two small plain wooden blocks with forepaws, focused lively expression. Same face, head/body ratio and collar in all four; full tail stays inside each cell.
```
