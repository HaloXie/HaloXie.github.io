# Justin Anamnesis 双猫 Mascot 最终编辑 Prompt

> 版本：Final v1.1
>
> 状态：锁定原版左下的比例、神态和空间关系，只允许局部合成
>
> 用途：GitHub Organization 头像、博客身份徽章及后续 Mascot 精修
>
> 维护原则：本文件是最终 Prompt 的单一事实源。此任务必须使用高保真图片编辑或参考图合成，不再从文本重新生成整体构图。

## Generation Settings

```text
Mode: reference-guided image edit / compositing
Aspect ratio: 1:1
Resolution: 1024 × 1024
Number of variants: 4
Input fidelity: high
Style strength: medium-low
Prompt adherence: high
Background: preserve the original warm solid background
Output layout: a clean 2 × 2 comparison sheet
Variant strategy: four near-identical local edits of the same locked base image, not four regenerated compositions
```

## Reference Inputs

优先将最初的 `2 × 2` 参考图裁成三个独立输入；如果模型只接受一张参考图，则按象限严格识别：

```text
IMAGE A — BASE IMAGE:
The original bottom-left panel.
This is the authoritative source for the entire composition, canvas occupancy,
body proportions, both faces, both expressions, head angles, gaze directions,
fur rhythm, distance between the cats, and emotional relationship.

IMAGE B — LOCAL DONOR:
The original bottom-right panel.
Use only the ivory-gold cat's single visible front paw and the blue-gray cat's
compact body/fur treatment. Do not use either cat's face, head angle, gaze,
distance, or overall composition from this image.

IMAGE C — TAIL DONOR:
The original top-right panel.
Use only the structure of the two intertwined foreground tails. Do not copy its
faces, expressions, body proportions, spacing, or pose.
```

## Main Prompt

```text
Perform a high-fidelity image edit using IMAGE A, the original bottom-left
panel, as the locked base image.

This is not a new illustration and not a pose redesign.
Do not regenerate the cats from scratch.
Preserve IMAGE A's original composition and identity at pixel-level fidelity
wherever no local edit is explicitly requested.

BRAND CONTEXT

The image is an original mascot for the GitHub organization
“Justin-Anamnesis”. Justin is a name shared by a human and an AI agent.

Core idea:

“Where AI is not built—but remembered.”

Emotional message:

“I remember you. You are safe here. Welcome home.”

LOCK IMAGE A'S PROPORTIONS AND SPATIAL RELATIONSHIP

Preserve the original bottom-left panel exactly as the structural baseline:

- The ivory-gold cat is taller, more upright, and visually more forward.
- The blue-gray cat is slightly smaller, slightly lower, and positioned behind
  and to the right of the ivory-gold cat.
- Do not make the cats equal in height or equal in visual mass.
- Do not compress them into a low, wide, horizontal oval.
- Do not turn either cat into a curled loaf or sleeping pose.
- Keep the ivory-gold cat's ear tips visibly higher than the blue-gray cat's ear
  tips.
- Keep the blue-gray cat's head center slightly lower than the ivory-gold cat's
  head center.
- Preserve the original asymmetrical, gently vertical composition.
- Preserve clear negative space between their faces.
- Their cheeks, noses, and foreheads must not touch.
- Keep approximately the same muzzle-to-muzzle distance as IMAGE A; the gap
  should remain visually obvious at full size.

The cats are emotionally close because of their gaze and body placement, not
because their faces are pressed together.

LOCK IMAGE A'S EXPRESSIONS

Do not reinterpret the original bottom-left expressions.

Ivory-gold cat:
- Preserve its exact serene, composed, quietly alert expression.
- Preserve its lifted head angle.
- Preserve its outward-looking gaze slightly above the immediate interaction.
- It does not look directly into the blue-gray cat's eyes.
- Keep its almond-shaped golden eyes, neutral relaxed mouth, and calm facial
  muscles.
- Do not make it sleepy, sad, maternal, romantic, overly affectionate, or
  directly face-to-face with the blue-gray cat.

Blue-gray cat:
- Preserve its exact gentle, attentive expression from IMAGE A.
- Preserve its slightly lower head angle.
- Preserve its upward and sideways gaze toward the ivory-gold cat.
- It should appear familiar and quietly understanding, not needy, submissive,
  worshipful, sad, or romantic.
- Preserve its original blue eyes, relaxed mouth, and restrained facial
  expression.

The gaze relationship is intentionally asymmetrical:

ivory-gold cat → calmly looks outward
blue-gray cat → gently looks toward the ivory-gold cat

Do not make both cats stare directly at one another.

LOCK IMAGE A'S NATURAL FUR

Preserve the original bottom-left fur treatment:

- soft and light;
- naturally layered;
- gently flowing around the chest, shoulders, and cheeks;
- elegant without looking styled or ornamental;
- detailed enough to feel beautiful, but not inflated or excessively curly.

Do not increase the fur's length, volume, curl, strand count, or decorative
complexity. Do not create an oversized mane. Do not make both cats look larger
or heavier because of added fur.

LOCAL EDIT 1 — IVORY-GOLD CAT'S PAW

Borrow only one clearly visible rounded front paw from IMAGE B.

Add that single paw naturally to the ivory-gold cat while preserving IMAGE A's
body height, chest shape, head position, expression, and fur.

The paw should rest gently at the lower front of the body. It must not pull the
cat into a more upright formal sitting pose or change its proportions.

Only the ivory-gold cat has a clearly visible front paw.

LOCAL EDIT 2 — BLUE-GRAY CAT'S BODY

Borrow only IMAGE B's restrained blue-gray body and fur treatment:

- compact resting body;
- moon-white and misty blue-gray color distribution;
- softly layered but controlled body fur;
- calm physical weight.

Fit this treatment inside IMAGE A's original blue-cat silhouette and position.
Do not replace IMAGE A's blue-cat face, expression, head angle, gaze, scale, or
distance from the ivory-gold cat.

Keep the blue-gray cat's front paws naturally hidden inside its resting pose.
Do not show a blue-gray paw.

LOCAL EDIT 3 — INTERTWINED TAILS

Borrow only the foreground tail structure from IMAGE C.

Use one warm ivory-gold tail and one misty blue-gray tail. They should cross
naturally across the foreground and curve around the base of the cats, creating
a balanced enclosing rhythm.

Integrate the tails without moving, enlarging, lowering, or compressing either
cat. The tail edit must adapt to IMAGE A's body proportions—not force the bodies
to adapt to the tail composition.

Both tails must remain recognizable as real cat tails. Do not create a heart,
infinity symbol, yin-yang symbol, knot, ribbon, tentacle, perfect circle, or
graphic logo stroke.

STYLE AND COLOR

Preserve IMAGE A's refined contemporary Chinese mythological illustration
style:

- delicate ink-inspired contour lines;
- soft mineral-pigment colors;
- subtle warm rice-paper texture;
- natural negative space;
- calm, warm, quietly spiritual atmosphere.

Ivory-gold cat:
- warm ivory and pale cream fur;
- restrained muted-gold markings;
- golden-amber eyes.

Blue-gray cat:
- moon-white and misty blue-gray fur;
- restrained mineral-blue markings;
- clear soft-blue eyes.

Background:
- preserve the original warm bone/rice-paper background;
- no scenery or added objects.

OUTPUT

Create four near-identical refinements in a clean 2 × 2 comparison sheet.

All four panels must preserve exactly the same:
- IMAGE A body proportions and relative sizes;
- IMAGE A face identities and expressions;
- IMAGE A head angles and gaze directions;
- IMAGE A distance and negative space between the cats;
- ivory-gold cat's single visible front paw;
- blue-gray cat's hidden paws;
- IMAGE C-inspired intertwined-tail structure;
- colors, background, and illustration style.

The four variants may differ only in:
- tiny adjustments to the ivory-gold paw placement;
- tiny adjustments to the exact tail crossing point;
- minimal cleanup of fur grouping or local negative space.

Do not vary the pose, proportions, expressions, gaze relationship, body distance,
or character design between panels.

No typography, organization name, slogan, initials, frame, badge border,
watermark, signature, scenery, or mockup.
```

## Negative Prompt

```text
new composition, regenerated pose, equal-sized cats, equal-height cats,
same-size heads, compressed horizontal composition, low wide oval composition,
curled loaf cats, sleeping cats, both cats facing each other directly, mutual
eye contact, touching noses, touching cheeks, touching foreheads, faces pressed
together, no gap between faces, ivory cat looking directly at blue cat, lowered
ivory cat head, enlarged blue cat, blue cat moved forward, altered facial
identity, altered expressions, altered gaze direction, altered head angles,
altered body distance, sad expression, sleepy expression, maternal expression,
romantic couple, submissive blue cat, worshipful gaze, both cats showing paws,
visible blue-gray cat paw, hidden ivory-gold cat paw, multiple visible front
paws, overly upright formal pose, exaggerated fur, excessive flowing hair,
oversized chest fur, ornamental fantasy fur, giant mane, dense curls, larger
bodies caused by fur, four unrelated compositions, inconsistent character
designs, black cats, ravens, foxes, fox muzzle, oversized fox ears, multiple
tails, nine-tailed fox, anime, manga, chibi, kawaii sticker, Disney, Pixar,
Ghibli imitation, mobile game character, photorealistic fur, 3D render,
oversized eyes, eyelashes, human eyebrows, heart shape, infinity symbol,
yin-yang symbol, ribbon tails, tentacle tails, merged tail, single tail, crown,
jewelry, clothing, talisman, 祥云, moon, lantern, temple, mountains, glowing
orb, halo, particles, neon colors, bright yellow, heavy gradient, complicated
background, typography, watermark, signature, logo mockup
```

## Final Selection Gate

最终只接受同时满足以下条件的候选：

- 黄猫仍明显比蓝猫更高、更靠前，蓝猫略低并位于右后方；
- 两张脸之间保留原版左下的明显距离，没有贴脸或互相直视；
- 黄猫保持原版左下向外、略微抬起的平静神态；
- 蓝猫保持原版左下看向黄猫的熟悉、克制神态；
- 黄猫只新增一只自然露出的前爪，其他比例和毛发不变；
- 蓝猫使用右下的身体与毛发处理，但不露前爪；
- 双尾采用右上的交织结构，但不得反向挤压或改变身体构图；
- 四张只是同一底图的局部编辑，不是四次重新生成；
- 没有出现同高、贴脸、横向团块或毛发膨胀问题。
