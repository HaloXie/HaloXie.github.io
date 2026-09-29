// 相机本体：本地 +x = 镜头朝向（光从 +x 进来往 -x 走），-z 一侧是剖切开口，朝向观众，+x 端背面（-x）是取景背屏。
// 相机模型按展示比例放大画，不在 1:10 布景比例里；光学计算只用 optics.js 里的真实 50mm 参数。
import * as THREE from 'three';
import { paint, at, merge, glow, spring, springVec, damp, rbox, ORANGE, CYAN } from '../kit/util.js';
import { F_STOPS } from './optics.js';

// 闪光同步速度：典型值，机型不同（常见 1/160–1/250）。比它快时前后帘同时走，只留一道缝。
export const FLASH_SYNC_S = 1 / 250;
const F_WIDEST = F_STOPS[0].N;

export const PART_META = {
  body: { name: '机身', desc: '固定所有零件的骨架；剖开的一侧能看到快门和传感器。' },
  sensor: { name: '传感器', desc: '把落下的光转成电信号，曝光越多读数越高。' },
  bayer: { name: '拜耳滤色阵列', desc: 'RGGB 滤镜网格：每个像素只透过红 / 绿 / 蓝之一，再插值还原全彩。' },
  shutterR: { name: '快门后帘', desc: '曝光结束时追上前帘把光挡住；曝光时间 = 两帘出发的时间差。' },
  frame: { name: '快门框', desc: '两道帘子在这个框里上下走。' },
  shutterF: { name: '快门前帘', desc: '曝光开始时先落下，让光开始照到传感器。' },
  mount: { name: '卡口', desc: '镜头与机身的金属接口，螺丝固定，触点传电子信号。' },
  lens2: { name: '后组镜片', desc: '再次弯折光线，让它们会聚到传感器平面上成像。' },
  aperture: { name: '光圈叶片', desc: '9 片叶片围成孔，只挡掉外圈的光、不弯折光线。f 值 = 焦距 ÷ 从镜头前方看到的孔径（入瞳），孔越大一次进光越多、景深越浅。' },
  lens1: { name: '前组镜片', desc: '第一次弯折光线，让平行进来的光开始向光轴会聚。' },
  barrel: { name: '镜筒 / 对焦环', desc: '这是 50mm 定焦镜头，焦距不变；转动对焦环推动镜片组前后移动，改变对焦距离。' },
};

// 光圈叶片几何（本地单位）。孔半径与 1/N 成正比：rho = R_MAX × N_最大光圈 / N。
const R_MAX = 0.21;
const BLADE_D = 0.23;
const BLADE_L = 0.2;
const N_BLADES = 9;
export function holeRadius(N) {
  return (R_MAX * F_WIDEST) / N;
}

// 快门窗口
const WIN_TOP = 0.28;
const WIN_BOT = -0.28;
const CUR_MIN = 0.05; // 收起后的帘高
export const TRAVEL_S = 0.3; // 演示用单帘行程时长（放慢，便于看清）
const LEAD_S = 0.12;

// 前帘 / 后帘出发时刻（演示时间，秒）。慢于同步：前帘走完后再按对数多停一会；快于同步：缝宽 ∝ t / FLASH_SYNC_S。
export function curtainStarts(t) {
  const span = WIN_TOP - WIN_BOT;
  const slit = span * Math.min(1, t / FLASH_SYNC_S);
  const hold = t >= FLASH_SYNC_S ? 0.08 * Math.log2(t / FLASH_SYNC_S) : 0;
  return { front: LEAD_S, rear: LEAD_S + TRAVEL_S * (slit / span) + hold };
}

// 取景（待机）时两帘都收起、快门常开，传感器一直在出实时画面。
// 按下快门：前帘先升起关住（LEAD_S），再按曝光时间走一遍「前帘落下 → 后帘追上」，最后两帘复位回常开。
const CLOSE_S = 0.1; // 前帘升起关闭所用演示时间
export function fireTimeline(el, t) {
  const span = WIN_TOP - WIN_BOT;
  const rearStart = curtainStarts(t).rear;
  const end = rearStart + TRAVEL_S + 0.3;
  const p = (x) => Math.max(0, Math.min(1, x / TRAVEL_S));
  if (el >= end) return { frontTop: WIN_BOT, rearBot: WIN_TOP, done: true, open: 1, phase: 'live' };
  if (el < LEAD_S) {
    // 前帘从收起（WIN_BOT）升到关闭（WIN_TOP）
    const k = Math.min(1, el / CLOSE_S);
    return { frontTop: WIN_BOT + k * span, rearBot: WIN_TOP, done: false, open: 1 - k, phase: 'close', end };
  }
  if (el > rearStart + TRAVEL_S) {
    // 曝光结束：后帘在下、前帘在下，两帘一起复位（后帘收回上方）
    const k = Math.min(1, (el - rearStart - TRAVEL_S) / 0.3);
    return { frontTop: WIN_BOT, rearBot: WIN_BOT + k * span, done: false, open: 0, phase: 'reset', end };
  }
  const frontTop = WIN_TOP - p(el - LEAD_S) * span; // 前帘上沿从 WIN_TOP 落到 WIN_BOT
  const rearBot = WIN_TOP - p(el - rearStart) * span; // 后帘下沿从 WIN_TOP 落到 WIN_BOT
  const open = Math.max(0, rearBot - Math.max(frontTop, WIN_BOT)) / span;
  return { frontTop, rearBot, done: false, open, phase: 'expose', end };
}

function lens(radius, thick, edge) {
  const pts = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const r = (i / n) * radius;
    const sag = edge / 2 + (thick - edge) / 2 * (1 - (r / radius) ** 2);
    pts.push(new THREE.Vector2(r, sag));
  }
  for (let i = n; i >= 0; i--) {
    const r = (i / n) * radius;
    const sag = edge / 2 + (thick - edge) / 2 * (1 - (r / radius) ** 2);
    pts.push(new THREE.Vector2(r, -sag));
  }
  const g = new THREE.LatheGeometry(pts, 40);
  g.rotateZ(-Math.PI / 2);
  return g;
}

function ringShape(ro, ri) {
  const s = new THREE.Shape();
  s.absarc(0, 0, ro, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.absarc(0, 0, ri, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

// 在 y-z 平面挤出、沿 x 厚度的环
function ringX(ro, ri, depth, x) {
  const g = new THREE.ExtrudeGeometry(ringShape(ro, ri), { depth, bevelEnabled: false, curveSegments: 40 });
  g.rotateY(Math.PI / 2);
  g.translate(x - depth / 2, 0, 0);
  return g; // ExtrudeGeometry 本身非索引
}

const OPEN_W = (58 * Math.PI) / 180; // 剖切开口半角
function barrelShell(r, x0, x1, hex) {
  const g = new THREE.CylinderGeometry(r, r, x1 - x0, 48, 1, true, Math.PI + OPEN_W, Math.PI * 2 - 2 * OPEN_W);
  g.rotateZ(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, 0);
  return paint(g, hex);
}

export function buildRig(mount) {
  const shake = new THREE.Group();
  mount.add(shake);
  const rig = new THREE.Group();
  let screenMat = null;
  shake.add(rig);

  const parts = {};
  const pickables = [];
  const order = [];
  function reg(key, group, dE, dP, anchor, mats) {
    group.userData.partKey = key;
    rig.add(group);
    parts[key] = {
      key, group, dE, dP, anchor, mats,
      pos: { x: new THREE.Vector3(), v: new THREE.Vector3() },
      lift: { x: 0, v: 0 },
      hot: 0,
      act: 0,
      idx: order.length,
    };
    order.push(key);
    group.traverse((o) => { if (o.isMesh) pickables.push(o); });
  }
  const V = (x, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // 机身：剖开 -z 一侧
  const bodyMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.4, side: THREE.DoubleSide });
  {
    const B = { x0: -1.5, x1: -0.62, y0: -0.54, y1: 0.54, z0: -1.1, z1: 1.1 };
    const dx = B.x1 - B.x0;
    const cx = (B.x0 + B.x1) / 2;
    const G = 0x2c3037;
    const list = [];
    // 外壳板全部倒角
    list.push(at(paint(rbox(0.07, 1.1, 2.22, 0.03), G), B.x0 + 0.035, 0, 0));
    list.push(at(paint(rbox(dx, 0.07, 2.22, 0.03), G), cx, B.y1 - 0.035, 0));
    list.push(at(paint(rbox(dx, 0.07, 2.22, 0.03), G), cx, B.y0 + 0.035, 0));
    list.push(at(paint(rbox(dx, 1.1, 0.07, 0.03), G), cx, 0, B.z1 - 0.035));
    list.push(at(paint(rbox(dx, 0.26, 0.07, 0.03), G), cx, B.y0 + 0.13, B.z0 + 0.035));
    // 背屏边框（屏幕本体是单独的 mesh，贴副相机画面）
    list.push(at(paint(rbox(0.04, 0.72, 1.12, 0.02), 0x121418), B.x0 - 0.015, 0.02, 0.12));
    // 热靴 + 取景器目镜
    list.push(at(paint(rbox(0.3, 0.05, 0.36, 0.015), 0x9aa3ad), B.x1 - 0.4, B.y1 + 0.33, 0));
    list.push(at(paint(rbox(0.12, 0.2, 0.34, 0.04), 0x1b1d21), B.x0 - 0.05, B.y1 + 0.08, 0));
    // 前板带卡口孔
    const fs = new THREE.Shape();
    fs.moveTo(-1.1, -0.54); fs.lineTo(1.1, -0.54); fs.lineTo(1.1, 0.54); fs.lineTo(-1.1, 0.54); fs.lineTo(-1.1, -0.54);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.47, 0, Math.PI * 2, true);
    fs.holes.push(hole);
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.06, bevelEnabled: false, curveSegments: 40 });
    fg.rotateY(Math.PI / 2);
    fg.translate(B.x1 - 0.06, 0, 0);
    list.push(paint(fg, 0x353a42));
    // 五棱镜顶
    const hs = new THREE.Shape();
    hs.moveTo(-0.34, 0); hs.lineTo(0.34, 0); hs.lineTo(0.2, 0.3); hs.lineTo(-0.2, 0.3); hs.lineTo(-0.34, 0);
    const hg = new THREE.ExtrudeGeometry(hs, { depth: dx * 0.85, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    hg.rotateY(-Math.PI / 2);
    hg.translate(B.x1 - 0.04, B.y1, 0);
    list.push(paint(hg, 0x30343b));
    // 握把（远侧）
    list.push(at(paint(new THREE.CapsuleGeometry(0.2, 0.6, 4, 12), 0x1b1d21), cx + 0.12, -0.05, B.z1 - 0.08));
    // 顶部：快门键、模式转盘、橙色饰线
    list.push(at(paint(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 20), 0xc9cfd8), cx + 0.1, B.y1 + 0.025, 0.72));
    list.push(at(paint(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 28), 0x3d424b), cx - 0.05, B.y1 + 0.04, -0.62));
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      list.push(at(paint(new THREE.BoxGeometry(0.012, 0.07, 0.02), 0x1b1d21), cx - 0.05 + Math.cos(a) * 0.16, B.y1 + 0.04, -0.62 + Math.sin(a) * 0.16, 0, -a));
    }
    list.push(at(paint(new THREE.BoxGeometry(0.02, 0.02, 2.2), ORANGE), B.x1 - 0.005, B.y1 - 0.08, 0));
    const g = new THREE.Group();
    const m = new THREE.Mesh(merge(list), bodyMat);
    m.castShadow = true;
    g.add(m);
    // 背屏：朝 -x，贴副相机的取景画面（main 里设置 map）
    screenMat = new THREE.MeshBasicMaterial({ color: 0x0a0c10 });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.66), screenMat);
    scr.rotation.y = -Math.PI / 2;
    scr.position.set(B.x0 - 0.037, 0.02, 0.12);
    g.add(scr);
    reg('body', g, V(-3.0), V(-0.9), V(-1.06, 0.9, 0), [bodyMat]);
  }

  // 传感器基板
  const sensorMat = new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.35, metalness: 0.7 });
  {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.86), sensorMat);
    m.position.x = -1.38;
    g.add(m);
    reg('sensor', g, V(-1.85), V(-0.6), V(-1.38, 0.34, 0), [sensorMat]);
  }

  // 拜耳阵列：RGGB 自发光方块（一个 InstancedMesh）
  const NZ = 16;
  const NY = 12;
  const tile = 0.036;
  const bayerMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  {
    const g = new THREE.Group();
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, tile * 0.86, tile * 0.86), bayerMat, NZ * NY);
    const m4 = new THREE.Matrix4();
    const cols = { R: new THREE.Color(1.0, 0.18, 0.12), G: new THREE.Color(0.2, 0.95, 0.35), B: new THREE.Color(0.2, 0.45, 1.0) };
    let k = 0;
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NZ; i++) {
        m4.makeTranslation(0, (j - (NY - 1) / 2) * tile, (i - (NZ - 1) / 2) * tile);
        im.setMatrixAt(k, m4);
        const key = j % 2 === 0 ? (i % 2 === 0 ? 'R' : 'G') : (i % 2 === 0 ? 'G' : 'B');
        im.setColorAt(k, cols[key]);
        k++;
      }
    }
    im.position.x = -1.345;
    g.add(im);
    reg('bayer', g, V(-1.45), V(-0.5), V(-1.345, 0.24, 0), [bayerMat]);
  }

  // 快门：框 + 前后帘（哑黑 + 亮边）
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.5, metalness: 0.6 });
  {
    const s = new THREE.Shape();
    s.moveTo(-0.52, -0.46); s.lineTo(0.52, -0.46); s.lineTo(0.52, 0.46); s.lineTo(-0.52, 0.46); s.lineTo(-0.52, -0.46);
    const h = new THREE.Path();
    h.moveTo(-0.37, WIN_BOT); h.lineTo(-0.37, WIN_TOP); h.lineTo(0.37, WIN_TOP); h.lineTo(0.37, WIN_BOT); h.lineTo(-0.37, WIN_BOT);
    s.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false });
    geo.rotateY(Math.PI / 2);
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, frameMat);
    m.position.x = -1.2;
    g.add(m);
    reg('frame', g, V(-0.7), V(-0.25), V(-1.2, 0.5, 0), [frameMat]);
  }
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.95, metalness: 0.0 });
  const edgeMatF = new THREE.MeshBasicMaterial({ color: glow(ORANGE, 0.4), toneMapped: false });
  const edgeMatR = new THREE.MeshBasicMaterial({ color: glow(CYAN, 0.4), toneMapped: false });
  function curtain(key, x, fromTop, edgeMat, dE, dP) {
    const g = new THREE.Group();
    const span = WIN_TOP - WIN_BOT + 0.02;
    const slats = [];
    for (let i = 0; i < 5; i++) slats.push(at(new THREE.BoxGeometry(0.012, span / 5 - 0.006, 0.78), 0, (i + 0.5) * (span / 5), 0));
    const sg = merge(slats);
    if (fromTop) sg.translate(0, -span, 0);
    const slat = new THREE.Mesh(sg, curtainMat);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, 0.8), edgeMat);
    slat.position.x = x;
    edge.position.x = x - 0.004;
    g.add(slat, edge);
    reg(key, g, dE, dP, V(x, fromTop ? 0.5 : -0.5, 0), [curtainMat]);
    return { slat, edge, span, anchorY: fromTop ? WIN_TOP + 0.01 : WIN_BOT - 0.01, fromTop };
  }
  const curR = curtain('shutterR', -1.225, true, edgeMatR, V(-1.1), V(-0.38));
  const curF = curtain('shutterF', -1.172, false, edgeMatF, V(-0.3), V(-0.12));

  // 卡口：镀铬环 + 4 颗螺丝 + 金色触点
  const mountMat = new THREE.MeshStandardMaterial({ color: 0xd6dbe2, roughness: 0.18, metalness: 1.0 });
  {
    const g = new THREE.Group();
    const m = new THREE.Mesh(ringX(0.56, 0.46, 0.12, -0.56), mountMat);
    g.add(m);
    const screws = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0x8b929c, roughness: 0.3, metalness: 1 }), 7);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      m4.compose(V(-0.495, Math.sin(a) * 0.51, Math.cos(a) * 0.51), q, V(1, 1, 1));
      screws.setMatrixAt(i, m4);
    }
    for (let i = 0; i < 3; i++) {
      m4.compose(V(-0.495, -0.505, -0.08 + i * 0.08), q, V(0.7, 0.6, 0.7));
      screws.setMatrixAt(4 + i, m4);
      screws.setColorAt(4 + i, new THREE.Color(0xe0b048));
    }
    for (let i = 0; i < 4; i++) screws.setColorAt(i, new THREE.Color(0xffffff));
    g.add(screws);
    reg('mount', g, V(-0.3), V(-0.1), V(-0.56, -0.62, 0), [mountMat]);
  }

  // 镜片：透射 + 清漆，青色主调
  const glassMat = () => new THREE.MeshPhysicalMaterial({
    color: 0xe8fbff, transmission: 1, thickness: 0.25, roughness: 0.04, ior: 1.52,
    clearcoat: 1, clearcoatRoughness: 0.05, attenuationColor: new THREE.Color(0x7fe7ff), attenuationDistance: 1.4,
    envMapIntensity: 1.2, transparent: false,
  });
  const g2Mat = glassMat();
  {
    const g = new THREE.Group();
    const geo = merge([at(lens(0.38, 0.13, 0.03), 0.02, 0, 0).toNonIndexed(), at(lens(0.4, 0.1, 0.03), 0.2, 0, 0).toNonIndexed()]);
    g.add(new THREE.Mesh(geo, g2Mat));
    reg('lens2', g, V(-0.25), V(-0.05), V(0.11, 0.46, 0), [g2Mat]);
  }

  // 光圈：外筒 + 盖环 + 9 片叶片 + 暖色叶片边
  const apMat = new THREE.MeshStandardMaterial({ color: 0x33373e, roughness: 0.4, metalness: 0.7 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.32, metalness: 0.9 });
  const bladeEdgeMat = new THREE.MeshBasicMaterial({ color: glow(ORANGE, 0.5), toneMapped: false });
  const AP_X = 0.45;
  const blades = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, BLADE_D, BLADE_L), bladeMat, N_BLADES);
  const bladeEdges = new THREE.InstancedMesh(new THREE.BoxGeometry(0.01, 0.008, BLADE_L * 0.96), bladeEdgeMat, N_BLADES);
  {
    const g = new THREE.Group();
    const house = merge([ringX(0.47, 0.44, 0.1, AP_X), ringX(0.47, R_MAX + 0.005, 0.012, AP_X + 0.05)]);
    g.add(new THREE.Mesh(house, apMat));
    blades.position.x = AP_X;
    bladeEdges.position.x = AP_X;
    g.add(blades, bladeEdges);
    reg('aperture', g, V(0.1), V(0.05), V(AP_X, 0.5, 0), [apMat, bladeMat]);
  }
  const bladeState = { x: holeRadius(F_STOPS[1].N), v: 0 };
  const m4 = new THREE.Matrix4();
  const qb = new THREE.Quaternion();
  const ax = new THREE.Vector3(1, 0, 0);
  function layoutBlades(rho) {
    for (let i = 0; i < N_BLADES; i++) {
      const th = (i / N_BLADES) * Math.PI * 2;
      qb.setFromAxisAngle(ax, th);
      const rc = rho + BLADE_D / 2;
      m4.compose(V((i - 4) * 0.0018, Math.cos(th) * rc, Math.sin(th) * rc), qb, V(1, 1, 1));
      blades.setMatrixAt(i, m4);
      m4.compose(V((i - 4) * 0.0018 + 0.004, Math.cos(th) * (rho + 0.004), Math.sin(th) * (rho + 0.004)), qb, V(1, 1, 1));
      bladeEdges.setMatrixAt(i, m4);
    }
    blades.instanceMatrix.needsUpdate = true;
    bladeEdges.instanceMatrix.needsUpdate = true;
  }
  layoutBlades(bladeState.x);

  const g1Mat = glassMat();
  {
    const g = new THREE.Group();
    const geo = merge([at(lens(0.42, 0.12, 0.03), 0.98, 0, 0).toNonIndexed(), at(lens(0.46, 0.17, 0.035), 1.2, 0, 0).toNonIndexed()]);
    g.add(new THREE.Mesh(geo, g1Mat));
    reg('lens1', g, V(0.55), V(0.25), V(1.09, 0.5, 0), [g1Mat]);
  }

  // 镜筒：剖切外壳 + 对焦环 / 变焦环滚花 + 橙色标志环
  const barrelMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide });
  {
    const g = new THREE.Group();
    const list = [
      barrelShell(0.5, -0.5, 1.5, 0x2a2e35),
      barrelShell(0.535, 0.08, 0.58, 0x15171a),
      barrelShell(0.53, 0.82, 1.3, 0x15171a),
      barrelShell(0.515, 1.36, 1.44, 0xff8a2a),
      barrelShell(0.515, -0.1, -0.02, 0x3fe0ff),
    ];
    g.add(new THREE.Mesh(merge(list), barrelMat));
    const perRing = 44;
    const knurl = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.022, 0.022), new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.7 }), perRing * 2);
    const q = new THREE.Quaternion();
    const rings = [[0.1, 0.56, 0.535], [0.84, 1.28, 0.53]];
    let k = 0;
    rings.forEach(([x0, x1, r]) => {
      for (let i = 0; i < perRing; i++) {
        const th = Math.PI + OPEN_W + ((i + 0.5) / perRing) * (Math.PI * 2 - 2 * OPEN_W);
        q.setFromAxisAngle(ax, th);
        m4.compose(V((x0 + x1) / 2, -Math.sin(th) * (r + 0.008), Math.cos(th) * (r + 0.008)), q, V(x1 - x0, 1, 1));
        knurl.setMatrixAt(k++, m4);
      }
    });
    g.add(knurl);
    g.children[0].castShadow = true;
    reg('barrel', g, V(0.95, 1.35, 0), V(0.5, 1.5, 0.2), V(0.5, 0.62, 0), [barrelMat]);
  }
  // 标签锚点高度：沿光轴相邻的零件上下交错，引线够长、胶囊不叠
  const LABEL_Y = { body: 1.05, sensor: -0.85, bayer: 0.95, shutterR: -1.0, shutterF: 1.05, mount: -0.85, lens2: 0.9, aperture: -0.85, lens1: 0.95, barrel: 0.9 };
  for (const [k, y] of Object.entries(LABEL_Y)) parts[k].anchor.y = y;

  // 光路：11 条光线 × 4 段（InstancedMesh）+ 光脉冲
  const RAYS = 11;
  const SEG = 5;
  const rayGeo = new THREE.CylinderGeometry(0.006, 0.006, 1, 5, 1, true);
  rayGeo.translate(0, 0.5, 0);
  const rays = new THREE.InstancedMesh(rayGeo, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false }), RAYS * SEG);
  const pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: glow(0xffe2b0, 4), toneMapped: false }), RAYS);
  rays.frustumCulled = false;
  pulses.frustumCulled = false;
  rig.add(rays, pulses);
  const rayVis = { x: 0, v: 0 };
  const up = new THREE.Vector3(0, 1, 0);
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpD = new THREE.Vector3();
  const colLit = glow(0xffd9a0, 2.6);
  const colDim = new THREE.Color(0.25, 0.22, 0.2);
  function seg(i, a, b, col, vis) {
    tmpD.subVectors(b, a);
    const len = tmpD.length();
    if (len < 1e-4 || vis < 0.01) {
      m4.makeScale(0, 0, 0);
    } else {
      qb.setFromUnitVectors(up, tmpD.divideScalar(len));
      m4.compose(a, qb, V(vis, len, vis));
    }
    rays.setMatrixAt(i, m4);
    rays.setColorAt(i, col);
  }
  const px = (key, lx) => parts[key].group.position.x + lx;
  const rayH = (r) => -0.4 + (r / (RAYS - 1)) * 0.8;
  // 只有前组、后组两处折射；光圈和快门不弯折光线，它们平面上的高度按直线插值得到。
  // K_L2 = 0.57 使组装态下光圈平面高度 ≈ 入射高度 × 0.72（与光圈开口尺寸的标定一致）。
  const K_L2 = 0.57;
  const lerpH = (x, xa, ha, xb, hb) => ha + ((x - xa) / (xb - xa)) * (hb - ha);
  let K_AP = 0.72; // 光圈平面高度 / 入射高度，随零件位置在 layoutRays 里重算
  function countThrough(rho) {
    let k = 0;
    for (let r = 0; r < RAYS; r++) if (Math.abs(rayH(r) * K_AP) <= rho) k++;
    return k;
  }
  let pulseT = 0;
  const rayInfo = { passed: 0, total: RAYS };
  function layoutRays(dt, rho, shutterOpenAt, visTarget) {
    spring(rayVis, visTarget, dt, 10);
    const vis = Math.max(0, rayVis.x);
    rays.visible = pulses.visible = vis > 0.01;
    if (!rays.visible) return;
    pulseT = (pulseT + dt * 0.55) % 1;
    const xs = [3.3, px('lens1', 1.09), px('aperture', AP_X), px('lens2', 0.11), px('shutterF', -1.172), px('bayer', -1.345)];
    K_AP = lerpH(xs[2], xs[1], 1, xs[3], K_L2);
    const kH = [1, 1, K_AP, K_L2, lerpH(xs[4], xs[3], K_L2, xs[5], 0), 0];
    let passed = 0;
    for (let r = 0; r < RAYS; r++) {
      const h = rayH(r);
      const pts = xs.map((x, i) => V(x, h * kH[i], 0));
      const through = Math.abs(h * K_AP) <= rho;
      const lit = through && shutterOpenAt(h * kH[4]);
      if (through) passed++;
      // 段：入射→前组→光圈→后组→快门→传感器；被光圈挡住的只画到光圈，快门关着的只画到快门
      seg(r * SEG, pts[0], pts[1], colLit, vis);
      seg(r * SEG + 1, pts[1], pts[2], through ? colLit : colDim, vis);
      seg(r * SEG + 2, pts[2], pts[3], colLit, through ? vis : 0);
      seg(r * SEG + 3, pts[3], pts[4], colLit, through ? vis : 0);
      seg(r * SEG + 4, pts[4], pts[5], colLit, lit ? vis : 0);
      // 脉冲：沿可达路径走
      const reach = through ? (lit ? 5 : 4) : 2;
      const tt = (pulseT + r * 0.09) % 1;
      const f = tt * reach;
      const i0 = Math.min(reach - 1, Math.floor(f));
      tmpA.copy(pts[i0]);
      tmpB.copy(pts[i0 + 1]);
      tmpA.lerp(tmpB, f - i0);
      m4.compose(tmpA, qb.identity(), V(vis, vis, vis));
      pulses.setMatrixAt(r, m4);
    }
    rayInfo.passed = passed;
    rays.instanceMatrix.needsUpdate = true;
    rays.instanceColor.needsUpdate = true;
    pulses.instanceMatrix.needsUpdate = true;
  }

  // 帘子位置（弹簧平滑）
  // 待机 = 取景：前帘收在下方、后帘收在上方，快门常开
  const cf = { x: WIN_BOT, v: 0 };
  const cr = { x: WIN_TOP, v: 0 };
  function layoutCurtains() {
    // 前帘：底部锚定，上沿 cf.x
    const fTop = Math.max(WIN_BOT + CUR_MIN, Math.min(WIN_TOP + 0.01, cf.x));
    const fScale = (fTop - curF.anchorY) / curF.span;
    curF.slat.position.y = curF.anchorY;
    curF.slat.scale.y = Math.max(0.02, fScale);
    curF.edge.position.y = fTop;
    // 后帘：顶部锚定，下沿 cr.x
    const rBot = Math.min(WIN_TOP - CUR_MIN, Math.max(WIN_BOT - 0.01, cr.x));
    const rScale = (curR.anchorY - rBot) / curR.span;
    curR.slat.position.y = curR.anchorY;
    curR.slat.scale.y = Math.max(0.02, rScale);
    curR.edge.position.y = rBot;
    return { fTop, rBot };
  }

  let fireStart = -1;
  const shakeS = { t: 1 };
  const out = {
    rig, shake, parts, order, pickables, rayInfo, countThrough,
    fire(nowS) { fireStart = nowS; shakeS.t = 0; },
    isFiring: () => fireStart >= 0,
    exposure: 1,
    phase: 'live',
    get screenMat() { return screenMat; },
    holeRadius: () => bladeState.x,
    // st = { N, t, cut: 'none'|'exploded'|'path', hover, gain }
    update(dt, nowS, st) {
      // 剖视位移：每个零件一个临界阻尼弹簧，按序号略错开形成级联
      for (const key of order) {
        const p = parts[key];
        const target = st.cut === 'exploded' ? p.dE : st.cut === 'path' ? p.dP : tmpD.set(0, 0, 0);
        springVec(p.pos, target, dt, 7.5 - p.idx * 0.25);
        spring(p.lift, st.hover === key ? 0.08 : 0, dt, 14);
        p.group.position.copy(p.pos.x);
        p.group.position.y += p.lift.x;
        p.hot = damp(p.hot, st.hover === key ? 1 : 0, 12, dt);
        p.act = Math.max(0, p.act - dt * 0.6);
        for (const m of p.mats) {
          if (m.emissive) {
            m.emissive.setHex(0xff9a4a);
            m.emissiveIntensity = p.hot * 0.35;
          }
        }
      }
      // 光圈叶片
      spring(bladeState, holeRadius(st.N), dt, 11);
      layoutBlades(Math.max(0.004, bladeState.x));
      const apAct = parts.aperture.act;
      bladeEdgeMat.color.copy(glow(ORANGE, 0.35 + apAct * 3.2));
      // 快门时间线：待机 = 取景，两帘收起
      let tl = { frontTop: WIN_BOT, rearBot: WIN_TOP, open: 1, phase: 'live' };
      if (fireStart >= 0) {
        tl = fireTimeline(nowS - fireStart, st.t);
        if (tl.done) fireStart = -1;
        parts.shutterF.act = parts.shutterR.act = 1;
      }
      out.phase = tl.phase;
      spring(cf, tl.frontTop, dt, 38);
      spring(cr, tl.rearBot, dt, 38);
      const { fTop, rBot } = layoutCurtains();
      edgeMatF.color.copy(glow(ORANGE, 0.3 + parts.shutterF.act * 3));
      edgeMatR.color.copy(glow(CYAN, 0.3 + parts.shutterR.act * 3));
      // 传感器受光：窗口暴露比例
      const exposed = Math.max(0, Math.min(WIN_TOP, rBot) - Math.max(WIN_BOT, fTop)) / (WIN_TOP - WIN_BOT);
      out.exposure = damp(out.exposure, exposed, exposed > out.exposure ? 30 : 3, dt);
      if (tl.phase === 'expose' && exposed > 0.01) parts.bayer.act = parts.sensor.act = 1;
      // 传感器亮度 ∝ 曝光增益（取景时也在收光）；按 log 压缩，避免 16 倍增益直接爆白
      const g = Math.log2(Math.max(1 / 64, st.gain ?? 1));
      bayerMat.color.setScalar(Math.max(0.06, (0.9 + g * 0.22) * out.exposure) + parts.bayer.act * 0.9 * (tl.phase === 'expose' ? 1 : 0));
      // 光线
      layoutRays(dt, bladeState.x, (y) => y < Math.min(WIN_TOP, rBot) && y > Math.max(WIN_BOT, fTop), st.cut === 'path' ? 1 : 0);
      // 机身抖动：衰减正弦
      shakeS.t += dt;
      const a = Math.exp(-shakeS.t * 14) * (shakeS.t < 0.6 ? 1 : 0);
      shake.position.set(Math.sin(shakeS.t * 90) * 0.012 * a, Math.sin(shakeS.t * 70) * 0.008 * a, 0);
      shake.rotation.z = Math.sin(shakeS.t * 80) * 0.006 * a;
    },
    snap(st) {
      for (const key of order) {
        const p = parts[key];
        p.pos.x.copy(st.cut === 'exploded' ? p.dE : st.cut === 'path' ? p.dP : V(0, 0, 0));
        p.pos.v.set(0, 0, 0);
      }
      bladeState.x = holeRadius(st.N);
      rayVis.x = st.cut === 'path' ? 1 : 0;
    },
    // 每个零件标签锚点（世界坐标）
    anchorWorld(key, v) {
      const p = parts[key];
      v.copy(p.anchor).add(p.group.position);
      return rig.localToWorld(v);
    },
    partCenterWorld(key, v) {
      const p = parts[key];
      v.set(p.anchor.x, 0, 0).add(p.group.position);
      if (key === 'body') v.y += 0.3;
      if (key === 'barrel') v.y += 0.35;
      if (key === 'mount') v.y -= 0.5;
      return rig.localToWorld(v);
    },
  };
  return out;
}
