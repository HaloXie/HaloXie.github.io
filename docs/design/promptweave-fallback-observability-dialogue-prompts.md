# promptweave-fallback-observability：讨论配图

2026-11-13。保留原技术边界、文章身份与封面，以两张连续同场讨论图梳理一个核心误解。正文、图注、alt无角色署名；两人开场，第三人加入后原参与者保留，随后三人同场。模型gpt-image-2，经已授权API；输入为当前三角色身份板转PNG，请求1536×864/high/PNG，无额外增补。

## question

```text
Redraw an educational conversation illustration, landscape 16:9. IMPORTANT: show continuous SHARED SCENES of people talking together, NOT isolated speaker portraits, NOT 2x2 grid, NOT four equal quadrants, NOT symmetric columns. Two wide, borderless conversation scenes arranged top-to-bottom with organic white space; upper scene uses about 45% height, lower about 55%. Unequal balloon widths based on dialogue length, staggered heights, readable left-to-right within each scene. Four exact balloons total, two per scene. Characters face each other with shared eye lines. All participants in a scene must be simultaneously visible, each exactly once within that scene. Listening characters stay visible and react naturally, not portraits beneath their own captions. Use relaxed asymmetrical grouping, overlapping depth without hiding faces; maintain screen-direction and recognizable positions across both scenes. No speech/name labels, no title or numbers, no props, boxes, machines, charts, arrows, microphones or table. Cream #FFF9E9, crisp dark hand drawn ink, gentle approved expressions, restrained blue/orange/mint accents, minimal texture. Clear LARGE Chinese lettering; generously sized balloons and clear tails pointing to the exact speaker. Input1 identity reference young tan capybara senior, modestly larger than otter, orange bag visible, no scarf; input2 feminine warm white cat, fine eyelashes, mint collar; input3 smaller brown otter, cream muzzle, unmistakable blue scarf, no bag. Never morph otter into capybara. No borders, no fixed equal character slots. Preserve all exact dialogue.
Upper scene: cat and otter only, both visible together. Cat at left, otter near center-right. Their two balloons above them. Lower scene: SAME cat remains left and SAME blue-scarf otter remains near center; capybara JOINS from the right as a third person. ALL THREE MUST be visible in the lower scene. The cat/otter who speaks balloon3 turns toward newcomer; other student listens visibly. Balloon4 belongs to capybara at right. Capybara cannot occupy or replace otter location. Show the otter explicitly as an attentive listener even when he has no speech.
Balloon 1: speaker cat, natural thoughtful conversation, exact text: "主模型失败了，换个能用的模型试试？"
Balloon 2: speaker otter, natural thoughtful conversation, exact text: "但它能接受同样的输入吗？Prompt 也合适吗？"
Balloon 3: speaker cat, natural thoughtful conversation, exact text: "原来换了模型，不一定还是验证过的方案。"
Balloon 4: speaker capybara, natural thoughtful conversation, exact text: "那备用组合，应该等失败后才临时决定吗？"
```

一次请求HTTP200；最终1200×675 WebP，quality 90，84858 bytes。

## understanding

```text
Redraw an educational conversation illustration, landscape 16:9. IMPORTANT: show continuous SHARED SCENES of people talking together, NOT isolated speaker portraits, NOT 2x2 grid, NOT four equal quadrants, NOT symmetric columns. Two wide, borderless conversation scenes arranged top-to-bottom with organic white space; upper scene uses about 45% height, lower about 55%. Unequal balloon widths based on dialogue length, staggered heights, readable left-to-right within each scene. Four exact balloons total, two per scene. Characters face each other with shared eye lines. All participants in a scene must be simultaneously visible, each exactly once within that scene. Listening characters stay visible and react naturally, not portraits beneath their own captions. Use relaxed asymmetrical grouping, overlapping depth without hiding faces; maintain screen-direction and recognizable positions across both scenes. No speech/name labels, no title or numbers, no props, boxes, machines, charts, arrows, microphones or table. Cream #FFF9E9, crisp dark hand drawn ink, gentle approved expressions, restrained blue/orange/mint accents, minimal texture. Clear LARGE Chinese lettering; generously sized balloons and clear tails pointing to the exact speaker. Input1 identity reference young tan capybara senior, modestly larger than otter, orange bag visible, no scarf; input2 feminine warm white cat, fine eyelashes, mint collar; input3 smaller brown otter, cream muzzle, unmistakable blue scarf, no bag. Never morph otter into capybara. No borders, no fixed equal character slots. Preserve all exact dialogue.
This follows a scene where capybara already joined. BOTH upper AND lower scenes must contain ALL THREE participants, each once: cat at left, blue-scarf otter near center, orange-bag capybara on right. Upper: cat and otter talk, capybara listens at right. Lower: cat and capybara talk, otter stays visible near center reacting thoughtfully. Do NOT omit the listener. No swapping identities at one location.
Balloon 1: speaker cat, natural thoughtful conversation, exact text: "应该先固定备用的 Prompt 和模型版本，再验证。"
Balloon 2: speaker otter, natural thoughtful conversation, exact text: "还要约定哪些错误能切换，最多尝试几次。"
Balloon 3: speaker cat, natural thoughtful conversation, exact text: "如果只是少了必填参数，也切到备用试试？"
Balloon 4: speaker capybara, natural thoughtful conversation, exact text: "不行。输入校验失败应直接返回，换模型补不了缺项。"
```

一次请求HTTP200；最终1200×675 WebP，quality 90，94686 bytes。

## 定向修订

```text
Edit this exact illustration minimally. In LOWER scene, the LEFT speech balloon 原来换了模型，不一定还是验证过的方案。 is spoken by WHITE CAT at far left, NOT the blue-scarf otter in center. Redraw that balloon tail so it unmistakably points to white cat's mouth/head at lower left. Remove any tail toward otter. Otter remains a silent attentive listener. Preserve ALL exact text, identities, expressions, other balloons, shared scenes, 16:9 canvas. No other change.
```

追加一次请求HTTP200，final question图 84234 bytes，quality90。初稿撤用。
