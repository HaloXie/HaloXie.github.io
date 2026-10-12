# 拆解：零件、爆炸位移、标签

**适用**：做物件的「组装 / 爆炸图 / 光路图」切换。实现参照 `examples/camera/lab/camera.js` 的 `reg` 与 `update`。

## 零件表先于几何

每个零件一行：键名、中文名、一句说明（写它在现象里干什么，不写外观）、组装位、爆炸位移 `dE`、光路位移 `dP`（可选）、标签锚点。说明放在 `PART_META` 里，标签和面板都从这里取，不另写一份。

camera 的例子：

| 键 | 名称 | `dE`（沿光轴 x） | 说明 |
| --- | --- | --- | --- |
| `body` | 机身 | −3.0 | 固定所有零件的骨架 |
| `sensor` | 传感器 | −1.85 | 把落下的光转成电信号 |
| `aperture` | 光圈叶片 | +0.1 | 只挡外圈的光、不弯折光线 |
| `lens1` | 前组镜片 | +0.55 | 第一次弯折光线 |

规则：

- 沿一条主轴拉开（光轴、传动轴、插拔方向），间距随序号递增，离中心越远拉得越开；不沿主轴的零件（镜筒）可以加一个侧向分量避免遮挡。
- 组装位就是建模位置，`dE` 是相对它的位移；拆开后每个零件仍能看出原来插在哪里。
- 零件数 8–15 个最好读；更多就分组，一组一起动。

## 注册与运动

```js
function reg(key, group, dE, dP, anchor, mats) {
  rig.add(group);
  parts[key] = { key, group, dE, dP, anchor, mats, pos: { x: new THREE.Vector3(), v: new THREE.Vector3() }, idx: order.length };
  order.push(key);
}

// 每帧：目标位移按模式取，临界阻尼弹簧追过去；序号越大弹簧越软，形成级联
for (const key of order) {
  const p = parts[key];
  const target = cut === 'exploded' ? p.dE : cut === 'path' ? p.dP : ZERO;
  springVec(p.pos, target, dt, 7.5 - p.idx * 0.25);
  p.group.position.copy(p.pos.x);
}
```

- 用弹簧不用插值：中途切换模式不会跳。
- 悬停的零件抬高一点（另一个弹簧），并让它的材质 `emissive` 微亮；只对 `MeshStandardMaterial` / `MeshPhysicalMaterial` 设 `emissive`。
- 拆开后整体包围盒变大：剖视机位的 `box` 用函数实时取 `Box3().setFromObject(rig)`，运镜才能把全部零件框进来。

## 标签

- 锚点 = 零件本地锚点 + 当前位移，再转世界坐标（`anchorWorld(key, v)`），标签跟着零件走。
- 相邻零件的标签 `lift` 交替高低（如 12 / 44 px），避免胶囊叠在一起。
- 组装状态只显示正在讲的 2–3 个零件标签；爆炸图显示全部。

## 光路 / 剖切

光路图是第三种位移（`dP`，拆得比爆炸图小，让光线能穿过），配一组只在该模式可见的光线几何。光线的折点必须来自模型（例如薄透镜公式），不是手摆。
