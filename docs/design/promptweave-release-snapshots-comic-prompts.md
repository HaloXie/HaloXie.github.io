# 发布与回滚：连续漫画修订

> 历史探索，已被同场对话版替代。本文对应的 `comic-*.webp` 不再由文章引用，也不是当前风格参考；保留用于解释迭代差异。当前版本见 [对话图记录](promptweave-release-snapshots-dialogue-prompts.md)。

2026-11-13。正文和交互改为中性解释；角色仅在图片里。系列导读独立于正文。封面保留，旧正文插画退出本文引用，不删除历史资源。

## 叙事和事实边界

三个小故事分别讲：只换 Prompt 的遗漏如何被发现并转为整套送测；指针更新后通过实例证据发现加载失败并保留上一份成功配置；停用 B 的目标如何排除 r1 并选择已验证且适用的 r0，再核对实际加载。

每张是四格连续漫画，不是三名角色分别持牌。配置案例完成的是送测准备，不暗示测试成功；恢复案例明确 r0 的验证和适用前提。图注和 alt 只写机制，不给角色命名。

## 生成记录

真实模型：gpt-image-2，使用本会话已授权的 API。通用 CLI 不接受网关路由前缀，三次在本地验证时退出，未发出生成请求；随后直接使用已授权 API，没有改 CLI 或换模型。

初始三次生成均 HTTP 200。snapshot 与 loading 各追加一次定向修图；完整 Prompt 见下文。原始输入按顺序是技能中的 senior-current.webp、cat-current.webp、otter-sheet.webp 转成的 PNG，仅作身份参考。修图以对应初稿 PNG 为唯一输入。请求1536×864、high、PNG；未追加隐式 Prompt。最终1200×675 WebP。

首稿 loading 第3格把 r2 连到实际 r1 屏幕，撤用该版；修图删除全部电缆，用期望/实际读数解释差异。snapshot 首稿额外标签“已验证”容易混淆验证顺序且第3格体型比例不合，局部修正。独立审图复核叙事闭环，未将 agent 意见当真人阅读反馈。

## comic-snapshot

```text
Create a finished educational COMIC STRIP with exactly FOUR panels in a 2x2 grid, reading top-left, top-right, bottom-left, bottom-right. Landscape 16:9. A continuous little story, not a chart, not three presenters holding signs. Express a concrete problem, a tentative attempt, evidence that changes their understanding, and a resolved action. Use distinct purposeful poses and facial expressions across panels. Input 1 identity only: young gentle capybara senior with orange closed bag. Input 2 identity only: feminine white cat junior, subtle eyelashes, mint collar. Input 3 identity only: smaller brown otter with blue scarf. Preserve approved faces and body proportions. Do NOT copy the reference grid poses. At most two characters per panel unless specified. They can recur across panels. Very light cream #FFF9E9, crisp dark hand-drawn ink contours, luminous flat sky blue/orange/mint/yellow, minimal paper texture. No graphite shading, grey wash, heavy shadows, neon, logos, signatures. Large balloons and bold clean Chinese lettering, generous white space. Only the exact dialogue and labels listed below. NO character names or species names as written text. Each balloon tail must unmistakably point to its speaker. No long footnotes, no extra title. Make the visual actions and the same recurring props connect the panels. Number panels 1, 2, 3, 4 unobtrusively. Everything stays inside safe margins.
Story: Why changing only the Prompt does not preserve the tested configuration.
Panel 1: White cat enthusiastically holds one blue document marked "Prompt" toward an execution machine whose other components are orange. Cat balloon: "只换这一张？". The otter looks concerned, glancing at a test checklist.
Panel 2: Otter opens the test case and compares it with the machine: tested set has blue document, blue gear and blue branching tile; machine has blue document but ORANGE gear and branching tile. Otter points at the mismatched gear, balloon: "参数和路由呢？". Cat stops her hand and thinks, no second balloon.
Panel 3: Capybara gently points to the entire tested blue set, not only the document, balloon: "先固定整套组合。". Otter groups document, gear and branching tile inside ONE blue case marked "r2". The action is packaging referenced configuration versions, not hardware replacement. No approval tick here.
Panel 4: Cat now carries the complete closed blue r2 case toward a test bench, otter compares its checklist with the case. Cat balloon: "这套一起验证！". Bench label "测试". Resolution is a complete candidate ready to test, not a claim that packaging proves correctness. No green success check. Keep their satisfaction thoughtful rather than celebratory.

```

## comic-loading

```text
Create a finished educational COMIC STRIP with exactly FOUR panels in a 2x2 grid, reading top-left, top-right, bottom-left, bottom-right. Landscape 16:9. A continuous little story, not a chart, not three presenters holding signs. Express a concrete problem, a tentative attempt, evidence that changes their understanding, and a resolved action. Use distinct purposeful poses and facial expressions across panels. Input 1 identity only: young gentle capybara senior with orange closed bag. Input 2 identity only: feminine white cat junior, subtle eyelashes, mint collar. Input 3 identity only: smaller brown otter with blue scarf. Preserve approved faces and body proportions. Do NOT copy the reference grid poses. At most two characters per panel unless specified. They can recur across panels. Very light cream #FFF9E9, crisp dark hand-drawn ink contours, luminous flat sky blue/orange/mint/yellow, minimal paper texture. No graphite shading, grey wash, heavy shadows, neon, logos, signatures. Large balloons and bold clean Chinese lettering, generous white space. Only the exact dialogue and labels listed below. NO character names or species names as written text. Each balloon tail must unmistakably point to its speaker. No long footnotes, no extra title. Make the visual actions and the same recurring props connect the panels. Number panels 1, 2, 3, 4 unobtrusively. Everything stays inside safe margins.
Story: Desired pointer updated but failed loading keeps the previous successfully loaded snapshot.
Panel 1: Otter turns a clear environment selector toward a closed orange case "r2". Cat asks eagerly, balloon: "现在用 r2 了？". Small selector label "期望". A separate running service screen still reads "r1".
Panel 2: Close view with cat leaning forward to read the service screen "r1", while orange r2 case sits disconnected beside it with one small warning triangle. Cat balloon: "怎么还是 r1？". On warning card exact "加载失败". No arrow suggesting r2 took over.
Panel 3: Capybara points between selector "r2" and running screen "r1", gently explaining, balloon: "指针不等于实际。". Otter follows the connected blue r1 case feeding the service. The orange r2 case remains disconnected.
Panel 4: Otter keeps the BLUE r1 case connected to the running service, and examines an r2 loading checklist separately. Cat now checks the actual screen r1, balloon: "先保留已加载的。". Exact small label beside live screen "实际 r1". The resolution preserves the last working configuration while diagnosing the failed candidate; do NOT make r2 succeed in the last panel. Not all old versions are safe; specifically it is the previous successfully loaded snapshot.

```

## comic-rollback

```text
Create a finished educational COMIC STRIP with exactly FOUR panels in a 2x2 grid, reading top-left, top-right, bottom-left, bottom-right. Landscape 16:9. A continuous little story, not a chart, not three presenters holding signs. Express a concrete problem, a tentative attempt, evidence that changes their understanding, and a resolved action. Use distinct purposeful poses and facial expressions across panels. Input 1 identity only: young gentle capybara senior with orange closed bag. Input 2 identity only: feminine white cat junior, subtle eyelashes, mint collar. Input 3 identity only: smaller brown otter with blue scarf. Preserve approved faces and body proportions. Do NOT copy the reference grid poses. At most two characters per panel unless specified. They can recur across panels. Very light cream #FFF9E9, crisp dark hand-drawn ink contours, luminous flat sky blue/orange/mint/yellow, minimal paper texture. No graphite shading, grey wash, heavy shadows, neon, logos, signatures. Large balloons and bold clean Chinese lettering, generous white space. Only the exact dialogue and labels listed below. NO character names or species names as written text. Each balloon tail must unmistakably point to its speaker. No long footnotes, no extra title. Make the visual actions and the same recurring props connect the panels. Number panels 1, 2, 3, 4 unobtrusively. Everything stays inside safe margins.
Story: Wanting to stop B differs from restoring the nearest prior snapshot. Fictional r0 is verified and applicable A100%; r1 is A50/B50; current r2 is B100%.
Panel 1: Cat points worriedly at an orange B output, asks "退回 r1 就没 B？". Otter reaches toward a blue case marked r1, hesitating. No actual switch yet.
Panel 2: Otter opens the r1 record, a simple card with EXACT LARGE text "A 50% / B 50%". Otter balloon: "旧版也有 B。". Cat looks thoughtfully surprised, not silly or ashamed. The r1 case remains unchanged.
Panel 3: Capybara asks gently "要恢复什么状态？" while pointing to two clear goal cards: "恢复实验" and "停用 B". Cat deliberately points at "停用 B". This is goal clarification, not a teacher merely declaring a wrong answer.
Panel 4: Cat and otter together examine an intact green r0 case and the actual service display. Case label "r0" and a large verification card "已验证且适用". Screen reads "实际 r0" and "A 100%". Cat balloon: "选对，还要查加载。". This depicts r0 selected AND successfully loaded after verification, not automatic approval. No claim that every old version is safe; no deleting B from r1. Make labels short, large and accurate.

```

## comic-loading-fix

```text
Edit this exact four-panel comic. Preserve the 2x2 layout, all character identities, poses, facial expressions, exact large speech balloons, light cream background and hand drawn style. Critical fix: REMOVE EVERY CABLE, WIRE, PLUG AND SOCKET from ALL FOUR PANELS. Configuration snapshots are not physically cabled devices; the previous cables imply the orange r2 is loaded in panel 3, which is WRONG. Keep the separate selector labeled 期望 pointing r2 and the runtime monitor showing r1 in all four panels. The closed orange r2 case never feeds the monitor. Keep blue r1 case in panels 3 and 4. Keep loading failure label in panel 2. In panel 4 simplify the otter checklist to ONLY large exact text 加载失败, no tiny rows or invented check items. The fourth panel monitor remains r1 with small adjacent card 实际 r1. Orange r2 case in panel 4 MUST retain its clear r2 label. Do not change other dialogue or add text. No extra characters or panels. Preserve full 16:9 canvas and borders.

```

## comic-snapshot-fix

```text
Edit this exact four-panel comic minimally. Preserve all panels, the continuous actions, all large speech balloons, machine, box r2, current art style and character identities. Fix ONLY TWO things: (1) In panel 2, replace the entire small heading above the blue Prompt/gear/route diagram with EXACT text 配置核对. Remove 已验证 everywhere on that card. Do not imply the new candidate already passed testing. Panel 4 remains a candidate being brought to the test bench, with no passed checkmark. (2) In panel 3 only, make the young capybara with orange bag modestly larger than the blue-scarf otter on the same floor, about 10 percent taller, matching the other approved relative character sizes. Keep capybara young with modest slim belly, not an older teacher. Keep all other details intact. Landscape 16:9, safe edges, no new text.

```


## 最终验收

| 最终文件（assets/img/promptweave-release-snapshots/） | API 调用次数 | 尺寸 | WebP 参数 | 字节数 | 结果 |
| --- | --- | --- | --- | --- | --- |
| comic-snapshot.webp | 2 | 1200×675 | quality75 / method6 | 90568 | 四格连续、标签与体型修复，最终WebP已打开 |
| comic-loading.webp | 2 | 1200×675 | quality80 / method6 | 92746 | 误导连线删除、期望与实际分离，最终WebP已打开 |
| comic-rollback.webp | 1 | 1200×675 | quality80 / method6 | 101166 | 目标澄清和加载确认闭环，最终WebP已打开 |

三张均低于100KiB，先压缩再复查文字；360px缩图能辨认主关系，细节通过文章既有放大入口阅读。没有把失败首稿计为最终结果。独立 agent 定向复核两次：首次发现 snapshot 标签和体型问题，修复后通过；loading 修复后通过。
