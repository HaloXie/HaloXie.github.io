# 发布与回滚：用讨论推进理解

**当前状态：2026-11-13 作者已确认同场连续性重绘版的风格和绘画要求。** 当前六张 `dialogue-*.webp` 对应本文后半部分“同场连续性重绘”的 Prompt；前半部分孤立头像版本仅保留探索记录，不作为当前布局参考。确认范围为视觉与对话方向，豆包审读、Git 提交及发布状态另见验收记录。

2026-11-13。替换旧版流程漫画，正文中性旁白与三段确定性交互保留。每段8轮交流，分成两张图；每句话回应前一句的问题、假设或遗漏。画面只保留交流、表情和必要识别配饰，不再用机器、箱子、编号流程承担主线。

模型 gpt-image-2；沿用已授权 API；输入为三个已确认角色板转成 PNG，仅作身份参考。请求1536×864、high、PNG；每张完整 Prompt 如下，无自动增补。最终规格1200×675 WebP。实际结果与验收记录见下文。

## dialogue-loading-question

```text
Create one 16:9 hand-drawn conversational educational comic, TWO wide horizontal conversation beats stacked vertically with generous whitespace separating them, no panel borders or numbers. This is a thoughtful podcast-like discussion illustrated with characters, NOT a process diagram. Characters face each other and genuinely listen/respond. Upper beat has two speech balloons, lower beat has two; read upper-left, upper-right, lower-left, lower-right. Each beat contains the two specified speakers ONLY, waist-up close shots at bottom of that beat, with LARGE readable Chinese dialogue above them. Keep speech balloons large and characters secondary; use full width and ample breathing room. No title, captions, character names, extra words, arrows, diagrams, machinery, boxes, signs, checklists or process props. Identity references only: input1 young gentle tan capybara with orange bag, slightly larger than otter; input2 feminine white cat with fine eyelashes and mint collar; input3 small brown otter with blue scarf. Preserve their approved appearance, no reference grid copying. Very pale cream #FFF9E9, crisp dark ink contours, bright restrained sky blue/orange/mint colors, minimal texture, no graphite hatching, no grey wash, no photorealism. Exact text below, natural line breaks, very clear bubble tails to their speakers. Expressions and small conversational hand gestures reflect each response, no posing toward camera. Four balloons only.
Upper beat: speakers cat on left and otter on right. Lower beat: speakers cat on left and capybara on right.
Balloon 1, cat, expression puzzled: "发布指针已经改成 r2，为什么请求还用 r1？"
Balloon 2, otter, expression cautious hypothesis: "会不会只是页面没刷新？"
Balloon 3, cat, expression presenting evidence verbally: "可实例报告写着：r2 加载失败。"
Balloon 4, capybara, expression gentle diagnostic question: "那指针记录的，是想用哪版，还是已经用上哪版？"
```

## dialogue-loading-understanding

```text
Create one 16:9 hand-drawn conversational educational comic, TWO wide horizontal conversation beats stacked vertically with generous whitespace separating them, no panel borders or numbers. This is a thoughtful podcast-like discussion illustrated with characters, NOT a process diagram. Characters face each other and genuinely listen/respond. Upper beat has two speech balloons, lower beat has two; read upper-left, upper-right, lower-left, lower-right. Each beat contains the two specified speakers ONLY, waist-up close shots at bottom of that beat, with LARGE readable Chinese dialogue above them. Keep speech balloons large and characters secondary; use full width and ample breathing room. No title, captions, character names, extra words, arrows, diagrams, machinery, boxes, signs, checklists or process props. Identity references only: input1 young gentle tan capybara with orange bag, slightly larger than otter; input2 feminine white cat with fine eyelashes and mint collar; input3 small brown otter with blue scarf. Preserve their approved appearance, no reference grid copying. Very pale cream #FFF9E9, crisp dark ink contours, bright restrained sky blue/orange/mint colors, minimal texture, no graphite hatching, no grey wash, no photorealism. Exact text below, natural line breaks, very clear bubble tails to their speakers. Expressions and small conversational hand gestures reflect each response, no posing toward camera. Four balloons only.
Upper beat: speakers cat on left and otter on right. Lower beat: speakers cat on left and capybara on right.
Balloon 1, cat, expression bright everyday analogy: "是想用哪版。就像下了单，不等于已经收到。"
Balloon 2, otter, expression reasoning from evidence: "那加载失败时，继续用上一次成功加载的 r1。"
Balloon 3, cat, expression seeking confirmation: "所以不能只看发布命令成功，还得查实例？"
Balloon 4, capybara, expression warm precise explanation: "对。核对加载结果、完整 hash，再查新请求的版本。"
```

## dialogue-rollback-question

```text
Create one 16:9 hand-drawn conversational educational comic, TWO wide horizontal conversation beats stacked vertically with generous whitespace separating them, no panel borders or numbers. This is a thoughtful podcast-like discussion illustrated with characters, NOT a process diagram. Characters face each other and genuinely listen/respond. Upper beat has two speech balloons, lower beat has two; read upper-left, upper-right, lower-left, lower-right. Each beat contains the two specified speakers ONLY, waist-up close shots at bottom of that beat, with LARGE readable Chinese dialogue above them. Keep speech balloons large and characters secondary; use full width and ample breathing room. No title, captions, character names, extra words, arrows, diagrams, machinery, boxes, signs, checklists or process props. Identity references only: input1 young gentle tan capybara with orange bag, slightly larger than otter; input2 feminine white cat with fine eyelashes and mint collar; input3 small brown otter with blue scarf. Preserve their approved appearance, no reference grid copying. Very pale cream #FFF9E9, crisp dark ink contours, bright restrained sky blue/orange/mint colors, minimal texture, no graphite hatching, no grey wash, no photorealism. Exact text below, natural line breaks, very clear bubble tails to their speakers. Expressions and small conversational hand gestures reflect each response, no posing toward camera. Four balloons only.
Upper beat: speakers otter on left and cat on right. Lower beat: speakers otter on left and capybara on right.
Balloon 1, otter, expression cautious proposal: "出了异常，我想先退回最近的 r1。"
Balloon 2, cat, expression hopeful question: "好，那 B 就不会再被用了吧？"
Balloon 3, otter, expression noticing a missing assumption: "等等，r1 里还是 A、B 各一半。"
Balloon 4, capybara, expression gentle uncovering different goals: "你们想恢复原来的实验，还是让 B 停下来？"
```

## dialogue-rollback-understanding

```text
Create one 16:9 hand-drawn conversational educational comic, TWO wide horizontal conversation beats stacked vertically with generous whitespace separating them, no panel borders or numbers. This is a thoughtful podcast-like discussion illustrated with characters, NOT a process diagram. Characters face each other and genuinely listen/respond. Upper beat has two speech balloons, lower beat has two; read upper-left, upper-right, lower-left, lower-right. Each beat contains the two specified speakers ONLY, waist-up close shots at bottom of that beat, with LARGE readable Chinese dialogue above them. Keep speech balloons large and characters secondary; use full width and ample breathing room. No title, captions, character names, extra words, arrows, diagrams, machinery, boxes, signs, checklists or process props. Identity references only: input1 young gentle tan capybara with orange bag, slightly larger than otter; input2 feminine white cat with fine eyelashes and mint collar; input3 small brown otter with blue scarf. Preserve their approved appearance, no reference grid copying. Very pale cream #FFF9E9, crisp dark ink contours, bright restrained sky blue/orange/mint colors, minimal texture, no graphite hatching, no grey wash, no photorealism. Exact text below, natural line breaks, very clear bubble tails to their speakers. Expressions and small conversational hand gestures reflect each response, no posing toward camera. Four balloons only.
Upper beat: speakers cat on left and otter on right. Lower beat: speakers cat on left and capybara on right.
Balloon 1, cat, expression understanding goal distinction: "我要停用 B。原来“退回去”不等于“去掉 B”。"
Balloon 2, otter, expression practical reasoning: "那得找 A 全量的版本，还要确认现在仍然适用。"
Balloon 3, cat, expression probing boundary: "假如 r0 已验证且适用，选它就算恢复了吗？"
Balloon 4, capybara, expression warm precise clarification: "还没。得确认实例加载成功，新请求也用了它。"
```

## dialogue-snapshot-question

```text
Create one 16:9 hand-drawn conversational educational comic, TWO wide horizontal conversation beats stacked vertically with generous whitespace separating them, no panel borders or numbers. This is a thoughtful podcast-like discussion illustrated with characters, NOT a process diagram. Characters face each other and genuinely listen/respond. Upper beat has two speech balloons, lower beat has two; read upper-left, upper-right, lower-left, lower-right. Each beat contains the two specified speakers ONLY, waist-up close shots at bottom of that beat, with LARGE readable Chinese dialogue above them. Keep speech balloons large and characters secondary; use full width and ample breathing room. No title, captions, character names, extra words, arrows, diagrams, machinery, boxes, signs, checklists or process props. Identity references only: input1 young gentle tan capybara with orange bag, slightly larger than otter; input2 feminine white cat with fine eyelashes and mint collar; input3 small brown otter with blue scarf. Preserve their approved appearance, no reference grid copying. Very pale cream #FFF9E9, crisp dark ink contours, bright restrained sky blue/orange/mint colors, minimal texture, no graphite hatching, no grey wash, no photorealism. Exact text below, natural line breaks, very clear bubble tails to their speakers. Expressions and small conversational hand gestures reflect each response, no posing toward camera. Four balloons only.
Upper beat: speakers cat on left and otter on right. Lower beat: speakers cat on left and capybara on right.
Balloon 1, cat, expression curious confident: "B 已经测过了，直接换 Prompt 不就行了？"
Balloon 2, otter, expression thoughtful asking: "当时用的模型参数和备用方案，也一样吗？"
Balloon 3, cat, expression honestly puzzled: "这些也要管？我以为测的是这段 Prompt。"
Balloon 4, capybara, expression gentle inviting reflection: "测试时，真正运行的只有这段文字吗？"
```

## dialogue-snapshot-understanding

```text
Create one 16:9 hand-drawn conversational educational comic, TWO wide horizontal conversation beats stacked vertically with generous whitespace separating them, no panel borders or numbers. This is a thoughtful podcast-like discussion illustrated with characters, NOT a process diagram. Characters face each other and genuinely listen/respond. Upper beat has two speech balloons, lower beat has two; read upper-left, upper-right, lower-left, lower-right. Each beat contains the two specified speakers ONLY, waist-up close shots at bottom of that beat, with LARGE readable Chinese dialogue above them. Keep speech balloons large and characters secondary; use full width and ample breathing room. No title, captions, character names, extra words, arrows, diagrams, machinery, boxes, signs, checklists or process props. Identity references only: input1 young gentle tan capybara with orange bag, slightly larger than otter; input2 feminine white cat with fine eyelashes and mint collar; input3 small brown otter with blue scarf. Preserve their approved appearance, no reference grid copying. Very pale cream #FFF9E9, crisp dark ink contours, bright restrained sky blue/orange/mint colors, minimal texture, no graphite hatching, no grey wash, no photorealism. Exact text below, natural line breaks, very clear bubble tails to their speakers. Expressions and small conversational hand gestures reflect each response, no posing toward camera. Four balloons only.
Upper beat: speakers cat on left and otter on right. Lower beat: speakers cat on left and capybara on right.
Balloon 1, cat, expression thoughtful realization: "不是。模型和备用方案也会影响结果。"
Balloon 2, otter, expression explaining to peer: "所以只换文字，可能拼出一套没测过的组合。"
Balloon 3, cat, expression checking her understanding: "那就把各项版本一起记住，换的时候也一起换？"
Balloon 4, capybara, expression warm clarifying not lecturing: "对，这就是快照。固定组合后，仍要一起验证。"
```

## 回滚理解图定向修订

```text
Edit this image minimally. Keep all four character portraits, layout, style, exact other speech, and warm cream background. Change ONLY the lower-left speech balloon to exact Chinese text: “假如 A 全量的 r0 已验证且适用，选它就算恢复了吗？” Use balanced line breaks and same large legible font. Do not print enclosing quotation marks. Do not alter any other balloon. Preserve 16:9 canvas, no extra text.
```

## 实际结果与验收

六次初始调用均成功（HTTP 200）；回滚理解图追加一次修订成功，补明 r0 是 A 全量。全部原图1536×864，最终1200×675 WebP、quality90 / method6，逐张打开核对文字和说话者。

- dialogue-loading-question.webp：78348 bytes。
- dialogue-loading-understanding.webp：85610 bytes。
- dialogue-rollback-question.webp：79358 bytes。
- dialogue-rollback-understanding.webp：81100 bytes。
- dialogue-snapshot-question.webp：80694 bytes。
- dialogue-snapshot-understanding.webp：81860 bytes。

独立对白审读确认三组均从疑问、假设或不同目标推进到理解；独立审图未发现前五图的错字、截字或说话者归属错误。“完整 hash”的对照对象在紧随正文明确为获批快照，不重复把长技术条件塞入气泡。豆包本次实际调用仍 HTTP403，无有效结果，未宣称通过。

## 同场连续性重绘（2026-11-13）

按作者确认：两人讨论先画两人，水豚加入时此前角色全部保留，之后同段讨论保持三人同场。取消独立头像的对称四等分，改为共享场景、按台词分配气泡空间。对白不改，正文不加角色名。下列为本次完整请求，每张输入仍为三个已确认身份板PNG，请求1536×864/high/PNG。

### dialogue-loading-question

```text
Redraw an educational conversation illustration, landscape 16:9. IMPORTANT: show continuous SHARED SCENES of people talking together, NOT isolated speaker portraits, NOT 2x2 grid, NOT four equal quadrants, NOT symmetric columns. Two wide, borderless conversation scenes arranged top-to-bottom with organic white space; upper scene uses about 45% height, lower about 55%. Unequal balloon widths based on dialogue length, staggered heights, readable left-to-right within each scene. Four exact balloons total, two per scene. Characters face each other with shared eye lines. All participants in a scene must be simultaneously visible, each exactly once within that scene. Listening characters stay visible and react naturally, not portraits beneath their own captions. Use relaxed asymmetrical grouping, overlapping depth without hiding faces; maintain screen-direction and recognizable positions across both scenes. No speech/name labels, no title or numbers, no props, boxes, machines, charts, arrows, microphones or table. Cream #FFF9E9, crisp dark hand drawn ink, gentle approved expressions, restrained blue/orange/mint accents, minimal texture. Clear LARGE Chinese lettering; generously sized balloons and clear tails pointing to the exact speaker. Input1 identity reference young tan capybara senior, modestly larger than otter, orange bag visible, no scarf; input2 feminine warm white cat, fine eyelashes, mint collar; input3 smaller brown otter, cream muzzle, unmistakable blue scarf, no bag. Never morph otter into capybara. No borders, no fixed equal character slots. Preserve all exact dialogue.
Upper scene: cat and otter only, both visible together. Cat at left, otter near center-right. Their two balloons above them. Lower scene: SAME cat remains left and SAME blue-scarf otter remains near center; capybara JOINS from the right as a third person. ALL THREE MUST be visible in the lower scene. The cat/otter who speaks balloon3 turns toward newcomer; other student listens visibly. Balloon4 belongs to capybara at right. Capybara cannot occupy or replace otter location. Show the otter explicitly as an attentive listener even when he has no speech.
Balloon 1: speaker cat, expression puzzled, exact text: "发布指针已经改成 r2，为什么请求还用 r1？"
Balloon 2: speaker otter, expression cautious hypothesis, exact text: "会不会只是页面没刷新？"
Balloon 3: speaker cat, expression presenting evidence verbally, exact text: "可实例报告写着：r2 加载失败。"
Balloon 4: speaker capybara, expression gentle diagnostic question, exact text: "那指针记录的，是想用哪版，还是已经用上哪版？"
```

### dialogue-loading-understanding

```text
Redraw an educational conversation illustration, landscape 16:9. IMPORTANT: show continuous SHARED SCENES of people talking together, NOT isolated speaker portraits, NOT 2x2 grid, NOT four equal quadrants, NOT symmetric columns. Two wide, borderless conversation scenes arranged top-to-bottom with organic white space; upper scene uses about 45% height, lower about 55%. Unequal balloon widths based on dialogue length, staggered heights, readable left-to-right within each scene. Four exact balloons total, two per scene. Characters face each other with shared eye lines. All participants in a scene must be simultaneously visible, each exactly once within that scene. Listening characters stay visible and react naturally, not portraits beneath their own captions. Use relaxed asymmetrical grouping, overlapping depth without hiding faces; maintain screen-direction and recognizable positions across both scenes. No speech/name labels, no title or numbers, no props, boxes, machines, charts, arrows, microphones or table. Cream #FFF9E9, crisp dark hand drawn ink, gentle approved expressions, restrained blue/orange/mint accents, minimal texture. Clear LARGE Chinese lettering; generously sized balloons and clear tails pointing to the exact speaker. Input1 identity reference young tan capybara senior, modestly larger than otter, orange bag visible, no scarf; input2 feminine warm white cat, fine eyelashes, mint collar; input3 smaller brown otter, cream muzzle, unmistakable blue scarf, no bag. Never morph otter into capybara. No borders, no fixed equal character slots. Preserve all exact dialogue.
This follows a scene where capybara already joined. BOTH upper AND lower scenes must contain ALL THREE participants, each once: cat at left, blue-scarf otter near center, orange-bag capybara on right. Upper: cat and otter talk, capybara listens at right. Lower: cat and capybara talk, otter stays visible near center reacting thoughtfully. Do NOT omit the listener. No swapping identities at one location.
Balloon 1: speaker cat, expression bright everyday analogy, exact text: "是想用哪版。就像下了单，不等于已经收到。"
Balloon 2: speaker otter, expression reasoning from evidence, exact text: "那加载失败时，继续用上一次成功加载的 r1。"
Balloon 3: speaker cat, expression seeking confirmation, exact text: "所以不能只看发布命令成功，还得查实例？"
Balloon 4: speaker capybara, expression warm precise explanation, exact text: "对。核对加载结果、完整 hash，再查新请求的版本。"
```

### dialogue-rollback-question

```text
Redraw an educational conversation illustration, landscape 16:9. IMPORTANT: show continuous SHARED SCENES of people talking together, NOT isolated speaker portraits, NOT 2x2 grid, NOT four equal quadrants, NOT symmetric columns. Two wide, borderless conversation scenes arranged top-to-bottom with organic white space; upper scene uses about 45% height, lower about 55%. Unequal balloon widths based on dialogue length, staggered heights, readable left-to-right within each scene. Four exact balloons total, two per scene. Characters face each other with shared eye lines. All participants in a scene must be simultaneously visible, each exactly once within that scene. Listening characters stay visible and react naturally, not portraits beneath their own captions. Use relaxed asymmetrical grouping, overlapping depth without hiding faces; maintain screen-direction and recognizable positions across both scenes. No speech/name labels, no title or numbers, no props, boxes, machines, charts, arrows, microphones or table. Cream #FFF9E9, crisp dark hand drawn ink, gentle approved expressions, restrained blue/orange/mint accents, minimal texture. Clear LARGE Chinese lettering; generously sized balloons and clear tails pointing to the exact speaker. Input1 identity reference young tan capybara senior, modestly larger than otter, orange bag visible, no scarf; input2 feminine warm white cat, fine eyelashes, mint collar; input3 smaller brown otter, cream muzzle, unmistakable blue scarf, no bag. Never morph otter into capybara. No borders, no fixed equal character slots. Preserve all exact dialogue.
Upper scene: cat and otter only, both visible together. Cat at left, otter near center-right. Otter speaks first in an upper balloon; cat replies in a slightly lower balloon. Reading order unmistakable. Lower scene: SAME cat remains left and SAME blue-scarf otter remains near center; capybara JOINS from the right as a third person. ALL THREE MUST be visible in the lower scene. The otter who speaks balloon3 turns toward newcomer; other student listens visibly. Balloon4 belongs to capybara at right. Capybara cannot occupy or replace otter location. Show the otter explicitly as an attentive listener even when he has no speech.
Balloon 1: speaker otter, expression cautious proposal, exact text: "出了异常，我想先退回最近的 r1。"
Balloon 2: speaker cat, expression hopeful question, exact text: "好，那 B 就不会再被用了吧？"
Balloon 3: speaker otter, expression noticing a missing assumption, exact text: "等等，r1 里还是 A、B 各一半。"
Balloon 4: speaker capybara, expression gentle uncovering different goals, exact text: "你们想恢复原来的实验，还是让 B 停下来？"
```

### dialogue-rollback-understanding

```text
Redraw an educational conversation illustration, landscape 16:9. IMPORTANT: show continuous SHARED SCENES of people talking together, NOT isolated speaker portraits, NOT 2x2 grid, NOT four equal quadrants, NOT symmetric columns. Two wide, borderless conversation scenes arranged top-to-bottom with organic white space; upper scene uses about 45% height, lower about 55%. Unequal balloon widths based on dialogue length, staggered heights, readable left-to-right within each scene. Four exact balloons total, two per scene. Characters face each other with shared eye lines. All participants in a scene must be simultaneously visible, each exactly once within that scene. Listening characters stay visible and react naturally, not portraits beneath their own captions. Use relaxed asymmetrical grouping, overlapping depth without hiding faces; maintain screen-direction and recognizable positions across both scenes. No speech/name labels, no title or numbers, no props, boxes, machines, charts, arrows, microphones or table. Cream #FFF9E9, crisp dark hand drawn ink, gentle approved expressions, restrained blue/orange/mint accents, minimal texture. Clear LARGE Chinese lettering; generously sized balloons and clear tails pointing to the exact speaker. Input1 identity reference young tan capybara senior, modestly larger than otter, orange bag visible, no scarf; input2 feminine warm white cat, fine eyelashes, mint collar; input3 smaller brown otter, cream muzzle, unmistakable blue scarf, no bag. Never morph otter into capybara. No borders, no fixed equal character slots. Preserve all exact dialogue.
This follows a scene where capybara already joined. BOTH upper AND lower scenes must contain ALL THREE participants, each once: cat at left, blue-scarf otter near center, orange-bag capybara on right. Upper: cat and otter talk, capybara listens at right. Lower: cat and capybara talk, otter stays visible near center reacting thoughtfully. Do NOT omit the listener. No swapping identities at one location.
Balloon 1: speaker cat, expression understanding goal distinction, exact text: "我要停用 B。原来“退回去”不等于“去掉 B”。"
Balloon 2: speaker otter, expression practical reasoning, exact text: "那得找 A 全量的版本，还要确认现在仍然适用。"
Balloon 3: speaker cat, expression probing boundary, exact text: "假如 A 全量的 r0 已验证且适用，选它就算恢复了吗？"
Balloon 4: speaker capybara, expression warm precise clarification, exact text: "还没。得确认实例加载成功，新请求也用了它。"
```

### dialogue-snapshot-question

```text
Redraw an educational conversation illustration, landscape 16:9. IMPORTANT: show continuous SHARED SCENES of people talking together, NOT isolated speaker portraits, NOT 2x2 grid, NOT four equal quadrants, NOT symmetric columns. Two wide, borderless conversation scenes arranged top-to-bottom with organic white space; upper scene uses about 45% height, lower about 55%. Unequal balloon widths based on dialogue length, staggered heights, readable left-to-right within each scene. Four exact balloons total, two per scene. Characters face each other with shared eye lines. All participants in a scene must be simultaneously visible, each exactly once within that scene. Listening characters stay visible and react naturally, not portraits beneath their own captions. Use relaxed asymmetrical grouping, overlapping depth without hiding faces; maintain screen-direction and recognizable positions across both scenes. No speech/name labels, no title or numbers, no props, boxes, machines, charts, arrows, microphones or table. Cream #FFF9E9, crisp dark hand drawn ink, gentle approved expressions, restrained blue/orange/mint accents, minimal texture. Clear LARGE Chinese lettering; generously sized balloons and clear tails pointing to the exact speaker. Input1 identity reference young tan capybara senior, modestly larger than otter, orange bag visible, no scarf; input2 feminine warm white cat, fine eyelashes, mint collar; input3 smaller brown otter, cream muzzle, unmistakable blue scarf, no bag. Never morph otter into capybara. No borders, no fixed equal character slots. Preserve all exact dialogue.
Upper scene: cat and otter only, both visible together. Cat at left, otter near center-right. Their two balloons above them. Lower scene: SAME cat remains left and SAME blue-scarf otter remains near center; capybara JOINS from the right as a third person. ALL THREE MUST be visible in the lower scene. The cat/otter who speaks balloon3 turns toward newcomer; other student listens visibly. Balloon4 belongs to capybara at right. Capybara cannot occupy or replace otter location. Show the otter explicitly as an attentive listener even when he has no speech.
Balloon 1: speaker cat, expression curious confident, exact text: "B 已经测过了，直接换 Prompt 不就行了？"
Balloon 2: speaker otter, expression thoughtful asking, exact text: "当时用的模型参数和备用方案，也一样吗？"
Balloon 3: speaker cat, expression honestly puzzled, exact text: "这些也要管？我以为测的是这段 Prompt。"
Balloon 4: speaker capybara, expression gentle inviting reflection, exact text: "测试时，真正运行的只有这段文字吗？"
```

### dialogue-snapshot-understanding

```text
Redraw an educational conversation illustration, landscape 16:9. IMPORTANT: show continuous SHARED SCENES of people talking together, NOT isolated speaker portraits, NOT 2x2 grid, NOT four equal quadrants, NOT symmetric columns. Two wide, borderless conversation scenes arranged top-to-bottom with organic white space; upper scene uses about 45% height, lower about 55%. Unequal balloon widths based on dialogue length, staggered heights, readable left-to-right within each scene. Four exact balloons total, two per scene. Characters face each other with shared eye lines. All participants in a scene must be simultaneously visible, each exactly once within that scene. Listening characters stay visible and react naturally, not portraits beneath their own captions. Use relaxed asymmetrical grouping, overlapping depth without hiding faces; maintain screen-direction and recognizable positions across both scenes. No speech/name labels, no title or numbers, no props, boxes, machines, charts, arrows, microphones or table. Cream #FFF9E9, crisp dark hand drawn ink, gentle approved expressions, restrained blue/orange/mint accents, minimal texture. Clear LARGE Chinese lettering; generously sized balloons and clear tails pointing to the exact speaker. Input1 identity reference young tan capybara senior, modestly larger than otter, orange bag visible, no scarf; input2 feminine warm white cat, fine eyelashes, mint collar; input3 smaller brown otter, cream muzzle, unmistakable blue scarf, no bag. Never morph otter into capybara. No borders, no fixed equal character slots. Preserve all exact dialogue.
This follows a scene where capybara already joined. BOTH upper AND lower scenes must contain ALL THREE participants, each once: cat at left, blue-scarf otter near center, orange-bag capybara on right. Upper: cat and otter talk, capybara listens at right. Lower: cat and capybara talk, otter stays visible near center reacting thoughtfully. Do NOT omit the listener. No swapping identities at one location.
Balloon 1: speaker cat, expression thoughtful realization, exact text: "不是。模型和备用方案也会影响结果。"
Balloon 2: speaker otter, expression explaining to peer, exact text: "所以只换文字，可能拼出一套没测过的组合。"
Balloon 3: speaker cat, expression checking her understanding, exact text: "那就把各项版本一起记住，换的时候也一起换？"
Balloon 4: speaker capybara, expression warm clarifying not lecturing, exact text: "对，这就是快照。固定组合后，仍要一起验证。"
```

### 同场版实际结果

六次请求均HTTP200，各一次成功，未改台词。原图1536×864，最终1200×675 WebP，quality90/method6。逐张查看：question图上半场两人，下半场三人；understanding图上下两场均三人。保留薄荷项圈、蓝围巾、橙色小包的区别，不再让水豚替换水獭。气泡尺寸和位置随对白变化，回滚第一句在较高的气泡，下一句稍低；图注同步为从上到下跟随气泡。
- dialogue-loading-question.webp: 87576 bytes。
- dialogue-loading-understanding.webp: 93202 bytes。
- dialogue-rollback-question.webp: 78724 bytes。
- dialogue-rollback-understanding.webp: 89740 bytes。
- dialogue-snapshot-question.webp: 78740 bytes。
- dialogue-snapshot-understanding.webp: 93786 bytes。
