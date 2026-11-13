# 完整快照博客：三角色试版


## 全文角色讲述版

根据明昊要求，整篇更新为名词解释→应用场景与相关性→对话推进完整链路。晦涩点用追问、分歧和证据解释，简单点短对话推进。保留技术契约、历史归档条件、环境隔离、故障注入判断、审批后变更重审、加载失败保留旧快照、按恢复目标选择版本、runId 追溯及分阶段边界。两个独立 agent 分别模拟基础发布读者和一般技术读者，均能复述主线；采纳名词提问对齐、方案版本与对象版本关系补充、删除重复总结、后续术语清单折叠等建议。豆包审读仍受403阻塞，本次没有声称通过。

新增 versions-characters.webp 与 checks-characters.webp，各一次 gpt-image-2 编辑成功。输入仍是三个当前角色板，源图1536×864 PNG，最终1200×675 WebP quality85。failure 图生成成功但未进入文章：图中连接关系不够清晰，正文用对话与既有Mermaid保留该失败语义。

以下完整 Prompt = 公共块 + 换行 + 对应块。

### common

```text
One hand-drawn technical blog teaching illustration, landscape 16:9. Three input sheets are identity references only: young tan capybara senior with closed orange bag, smaller thoughtful brown otter with blue scarf, feminine warm-white cat junior with fine eyelashes and mint collar. Do not reproduce grids. One instance per requested character, original warm gentle faces. Capybara youthful not middle-aged, modestly larger. Pale cream #FFF9E9, crisp dark ink, clean blue/orange/mint/yellow flat fills, restrained texture, generous margins. Exact Chinese text only as specified, large readable lettering. No logos, extra text, magnifiers or clutter. Explain through purposeful character action and visible objects, not generic decoration.
```

### versions

```text
Teach IMMUTABLE VERSIONS. One continuous scene. Left a blue sealed configuration case labeled r1 remains intact on a shelf. Right otter places a separate new orange case labeled r2 next to it, both have document+gear symbols. White cat holds an eraser but has paused, looking at the preserved r1. Capybara calmly gestures to the TWO separate intact cases. One cat balloon exact: 旧版本不能直接改吗？ One short large bottom caption exact: 保留 r1，新建 r2 . No arrows or erasing marks on r1. Important: r1 is preserved, r2 is newly created, neither overwrites the other.
```

### checks

```text
Teach THREE DISTINCT RELEASE STATES with three horizontal small scenes in one illustration, separated by whitespace, NOT arrows implying automatic success. Left otter checks a blue case against a test card, title above exact: 测试通过 . Middle young capybara checks an approval document bearing hash H1 next to the SAME blue case bearing H1, title exact: 审批通过 . Right cat reads a runtime display H1 next to same blue case bearing H1, title exact: 实例加载 . Each character appears only once. Under third scene a large cat speech balloon exact: 实际加载的也是 H1 吗？ No green tick on third display, she is checking, not assuming success. Show H1 identically in three scenes if hash shown. Avoid fake code, extra labels, tiny text. The key is verifying actual loaded hash, not merely approving the request.
```

### failure

```text
Teach LOAD FAILURE DOES NOT MEAN SWITCHING TO FAILED VERSION. Single simple scene. Left one blue intact case labeled r1 is connected by one clear thick mint line to a simple running service box with a small lit circular indicator; r1 is the active version. Right orange case labeled r2 is visibly disconnected from service with a short gap and a small orange warning triangle. Otter points at disconnected r2 with concerned thoughtful expression, not panic. Cat traces the existing r1 connection, young capybara gently points to r1, warm peer guidance. Capybara balloon exact: 加载失败，继续用上一份。 No connection from r2 to service, no green check on r2, no arrows falsely switching versions, no red X on characters. Only labels r1 and r2 plus speech. Minimal composition readable on mobile.
```


2026 年 11 月 12 日，按 blog-imagegen 生成新封面与两张正文图，并加入三段短对话。原有技术正文、Mermaid 失败回路、未上线设计声明与 r1 回滚恢复 A/B 各 50% 的边界保留。中文本地试版，未提交或发布；英文未同步，待中文方向确认后处理。

核心命题：测试、审批、生产加载和回滚必须指向同一份完整配置。角色各推进一个理解动作，不取代技术依据。

## 试读方向修正

明昊指出目标是角色完成小知识点的复盘/讲述，而不是给原文增加插图。后续补三图的路径已撤出正文，未使用的生成响应留在工作产物中。当前以“退回旧版本，就没有 B 了吗？”为完整复盘：预测、查版本记录、发现目标分歧、解释边界、迁移判断与折叠反馈。独立试读发现迁移答案过早暴露及旧流程限定上一份快照的冲突，已分别改成折叠答案与选定适用的已验证快照；加载失败保留上一份成功快照的语义不变。豆包403阻塞仍未解除，本版本仍为本地试读稿。

## 图片与 Prompt

三次 gpt-image-2 编辑请求，各一次成功；输入依次为技能 assets/actions 的 senior-current.webp、cat-current.webp、otter-sheet.webp，仅作身份参考。实际源图 1536×864 PNG、high；最终等比缩为1200×675 WebP quality 85，无额外 Prompt 增补。来源文件目录 assets/img/promptweave-release-snapshots/，分别为 cover-characters.webp、snapshot-characters.webp、rollback-characters.webp。已逐张打开核验，未覆盖旧图。

完整请求 Prompt = 公共块 + 换行 + 对应图块。

### common

```text
Create a standalone 16:9 technical blog hand-drawn illustration. Inputs are capybara senior student, white cat junior sister and otter senior learner identity sheets, NOT grids to reproduce. Capybara young warm tan, slightly larger than otter, kind attentive, closed orange bag, not potbellied or middle aged. Otter brown with cream muzzle and blue scarf, steady thoughtful. Cat warm white, mint collar, subtly feminine eyes and soft face, bright intelligent. Keep original identity and crisp black ink, pale cream #FFF9E9 background, luminous flat blue orange mint yellow accents, restrained texture, no photorealism/3D. All characters once only, one continuous scene, generous margins, large readable Chinese exact text only as specified. No tiny labels, extra text, logos, magnifiers or unrelated props.
```

### cover

```text
COVER about why releasing only a prompt is insufficient. White cat left holds one loose white document and looks curiously at two intact transparent configuration cases on a table: one blue and one orange, each contains grouped document, gear, branching route and backup loop icons. Otter looks at the whole cases thoughtfully. Capybara gently points to the complete orange case, not to just the document. Cat speech balloon exact: 只换这一张就够了吗？ Single strong focal interaction, no arrows or detailed workflow. Packages are intact, not mixed or dismantled.
```

### snapshot

```text
BODY explaining complete version snapshots. One large clear blue case in center on table, with FOUR simple large objects grouped inside: white prompt document, orange model gear, mint branching route, yellow backup loop. Outside case otter holds a checklist and visually compares all four objects. Cat watches and asks in one balloon exact: 要一起固定哪些配置？ Capybara senior points at entire case with open gentle gesture, not lecturing. Small plaque on case exact: 完整快照 . No other text. No credentials or data depicted inside; this is only configuration versions. Distinct composition from cover: a single large case and checking action.
```

### rollback

```text
BODY conceptual comparison about restoring a known version. Center a large blue archive card headed exactly r1. Under heading show TWO equal-size large circles side by side, one blue labeled exactly A 50%, one orange labeled exactly B 50%. They are clearly parts of the same r1 card, not different snapshots. Otter holds and examines this archive card. Cat points at B half with thoughtful curious expression, speech balloon exact: 回滚不等于 A 全量？ Capybara young senior points to r1 heading, gently inviting them to read the record. No checkmarks, no A100% output, no arrow implying all traffic A, no other labels. Keep the exact percentages big and legible.
```

## 验证与审读

- 源检查：translations、series、reference-links、content-images、git diff --check 通过；文章 npm install/npm i 扫描无命中。
- 生产 Jekyll 构建通过（现有 Sass @import 弃用告警）；搜索索引生成及 check-rendered-site 门禁通过。
- 浏览器：1200px Light、360px Dark/Light 无横向溢出，三张图片实际加载；原 Mermaid 渲染，两个承重结论实际命中 reading-highlight。移动端图内文字较小，正文保留同义解释，不依赖图中文字作为唯一信息源。外部评论与分析请求连接失败，不影响本地文章正文。
- 独立 agent 模拟基础发布知识读者试读：能复述问题、完整发布路径和失败恢复；图文及新增对话未发现必须修改项。该试读不是豆包语言审读。
- 豆包审读未完成：doubao-seed-1-6 返回无法自动解析路由；显式 token360/doubao-seed-1.6 返回403 model_blocked。无有效输出，采纳/驳回项均为零，不用其他模型替代，不宣称中文最终稿。当前仅供视觉与叙述方向预览。
