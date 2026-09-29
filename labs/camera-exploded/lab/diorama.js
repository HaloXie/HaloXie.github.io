// 微缩布景（1:10）：人偶（对焦主体）· 风车（一直转，演示运动模糊）· 灯串（一直闪，演示焦外光斑）· 黄昏天幕。
// 坐标：入瞳在 AXIS，镜头朝 +x；距离都来自 optics.SUBJECT（真实 m = 场景单位）。
// setTime(t) 让风车角度、灯泡亮度只由时间决定：主画面用真实时钟，副相机每个样本用「快门时间内的某一刻」。
import * as THREE from 'three';
import { paint, at, merge, prbox, rbox, glow, rng, canvasTexture } from '../kit/util.js';
import { SUBJECT, WINDMILL_REV_PER_S } from './optics.js';

export const PHOTO_LAYER = 1; // 副相机只看这一层：布景和灯光在，相机模型 / 景深板 / 标签不在
export const AXIS = new THREE.Vector3(0, 0.62, 0); // 入瞳（世界坐标），光轴沿 +x
const TOP = 0.14; // 布景底座顶面

export function photoVisible(o) {
  o.traverse((c) => c.layers.enable(PHOTO_LAYER));
  return o;
}

// 圆柱 / 胶囊放在两点之间
function between(geo, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  geo.applyQuaternion(q);
  geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return geo;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

let dotTex = null;
export function softDot() {
  if (dotTex) return dotTex;
  dotTex = canvasTexture(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }).tex;
  return dotTex;
}

export function buildDiorama(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const std = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.02, ...o });
  const R = rng(11);
  const X_F = AXIS.x + SUBJECT.figure;
  const X_W = AXIS.x + SUBJECT.windmill;
  const X_B = AXIS.x + SUBJECT.bulbs;

  // ---------- 底座 + 草地 + 小路 + 篱笆 + 灌木 ----------
  const set = [];
  set.push(prbox(0x5a3d29, 7.9, TOP - 0.02, 5.6, 4.7, (TOP - 0.02) / 2, 0, 0.04));
  set.push(prbox(0x4f8a4a, 7.7, 0.03, 5.4, 4.7, TOP - 0.005, 0, 0.012));
  // 草丛和小花：合并进同一个静态 mesh，不加 draw call
  const FLOWER = [0xffe066, 0xff8fb8, 0xffffff, 0xff7a45, 0xb48cff];
  for (let i = 0; i < 260; i++) {
    const x = 0.9 + R() * 7.2;
    const z = -2.6 + R() * 5.2;
    if (Math.abs(z - (-0.9 + Math.sin(((x - 1) / 6.6) * 5.2) * 0.55 + ((x - 1) / 6.6) * 0.5)) < 0.2) continue; // 让开小路
    const h = 0.05 + R() * 0.07;
    set.push(at(paint(new THREE.ConeGeometry(0.018 + R() * 0.015, h, 4), [0x3f7d3a, 0x5a9a48, 0x6fae52][i % 3]), x, TOP + h / 2, z, (R() - 0.5) * 0.4, R() * 3, (R() - 0.5) * 0.4));
    if (i % 4 === 0) set.push(at(paint(new THREE.IcosahedronGeometry(0.016 + R() * 0.01, 0), FLOWER[i % FLOWER.length]), x + 0.01, TOP + h + 0.01, z));
  }
  // 路灯：人偶身后一盏暖色小灯（灯罩发光，照片里也是一个小光源）
  set.push(at(paint(new THREE.CylinderGeometry(0.012, 0.016, 0.9, 8), 0x2b2f36), X_F + 0.55, TOP + 0.45, 0.55));
  set.push(at(paint(new THREE.CylinderGeometry(0.05, 0.035, 0.07, 10), 0x2b2f36), X_F + 0.55, TOP + 0.93, 0.55));
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const x = 1.0 + t * 6.6;
    const z = -0.9 + Math.sin(t * 5.2) * 0.55 + t * 0.5;
    set.push(at(paint(new THREE.CylinderGeometry(0.07 + R() * 0.04, 0.09, 0.02, 7), 0xcdb89a), x, TOP + 0.02, z, 0, R() * 3));
  }
  for (let z = -2.5; z <= 2.5; z += 0.36) set.push(prbox(0xe8dcc8, 0.04, 0.26, 0.04, 7.9, TOP + 0.13, z, 0.012));
  set.push(prbox(0xe8dcc8, 0.03, 0.03, 5.1, 7.9, TOP + 0.2, 0, 0.01));
  set.push(prbox(0xe8dcc8, 0.03, 0.03, 5.1, 7.9, TOP + 0.1, 0, 0.01));
  const bush = (x, z, s, c) => {
    for (let k = 0; k < 3; k++) set.push(at(paint(new THREE.IcosahedronGeometry(s * (0.8 - k * 0.15), 1), c), x + (k - 1) * s * 0.5, TOP + s * 0.6, z + (R() - 0.5) * s * 0.4, R(), R()));
  };
  bush(2.6, -1.4, 0.28, 0x3f7d45);
  bush(4.6, 1.9, 0.34, 0x4a8f50);
  bush(5.6, -2.1, 0.3, 0x3a7440);
  bush(1.4, 1.5, 0.22, 0x55994f);
  // 灯串的两根杆
  for (const [x, z, h] of [[X_B, -2.55, 1.95], [X_B, 2.55, 1.95], [X_B - 0.8, -2.45, 1.55], [X_B - 0.8, 1.3, 1.55]]) {
    set.push(at(paint(new THREE.CylinderGeometry(0.025, 0.035, h, 8), 0x3b2c22), x, TOP + h / 2, z));
  }
  // 风车塔：八棱台 + 锥顶 + 门窗
  set.push(at(paint(new THREE.CylinderGeometry(0.2, 0.3, 0.86, 8), 0xe9e1d2), X_W, TOP + 0.43, 0.8, 0, Math.PI / 8));
  set.push(at(paint(new THREE.ConeGeometry(0.26, 0.26, 8), 0xb8452f), X_W, TOP + 0.99, 0.8, 0, Math.PI / 8));
  set.push(prbox(0x6b4a33, 0.03, 0.2, 0.12, X_W - 0.27, TOP + 0.1, 0.8, 0.01));
  set.push(prbox(0x2a3550, 0.03, 0.1, 0.08, X_W - 0.23, TOP + 0.5, 0.8, 0.01));
  const setMesh = new THREE.Mesh(merge(set), std());
  setMesh.receiveShadow = true;
  setMesh.castShadow = true;
  root.add(setMesh);

  // ---------- 人偶：黄雨衣、红围巾、毛线帽，手里捧着一台小相机 ----------
  const fig = [];
  const fx = X_F;
  const fz = -0.2;
  const y0 = TOP;
  fig.push(at(paint(new THREE.CapsuleGeometry(0.035, 0.1, 4, 10), 0x2f3a55), fx, y0 + 0.09, fz - 0.045));
  fig.push(at(paint(new THREE.CapsuleGeometry(0.035, 0.1, 4, 10), 0x2f3a55), fx, y0 + 0.09, fz + 0.045));
  fig.push(prbox(0x3a2a20, 0.1, 0.035, 0.06, fx - 0.015, y0 + 0.018, fz - 0.045, 0.012));
  fig.push(prbox(0x3a2a20, 0.1, 0.035, 0.06, fx - 0.015, y0 + 0.018, fz + 0.045, 0.012));
  fig.push(at(paint(rbox(0.16, 0.24, 0.2, 0.06), 0xf2c230), fx, y0 + 0.28, fz));
  fig.push(at(paint(new THREE.TorusGeometry(0.075, 0.025, 8, 20), 0xd83a2e), fx, y0 + 0.41, fz, Math.PI / 2));
  fig.push(at(paint(new THREE.SphereGeometry(0.1, 24, 16), 0xf5d3b8), fx, y0 + 0.5, fz));
  fig.push(at(paint(new THREE.SphereGeometry(0.103, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), 0x3a5fa8), fx, y0 + 0.52, fz));
  fig.push(at(paint(new THREE.SphereGeometry(0.03, 10, 8), 0xf0f0f0), fx, y0 + 0.63, fz));
  for (const s of [-1, 1]) {
    fig.push(at(paint(new THREE.SphereGeometry(0.012, 8, 6), 0x1a1a1a), fx - 0.093, y0 + 0.51, fz + s * 0.035));
    fig.push(at(paint(new THREE.SphereGeometry(0.016, 8, 6), 0xf09a8a), fx - 0.085, y0 + 0.475, fz + s * 0.06));
    // 手臂：肩 → 手（伸向镜头方向捧相机）
    fig.push(between(paint(new THREE.CapsuleGeometry(0.03, 0.14, 4, 8), 0xf2c230), V(fx, y0 + 0.37, fz + s * 0.1), V(fx - 0.1, y0 + 0.27, fz + s * 0.06)));
  }
  fig.push(prbox(0x22252b, 0.05, 0.07, 0.11, fx - 0.13, y0 + 0.28, fz, 0.012));
  fig.push(at(paint(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 14), 0x111111), fx - 0.165, y0 + 0.28, fz, 0, 0, Math.PI / 2));
  const figure = new THREE.Mesh(merge(fig), std({ roughness: 0.55 }));
  figure.castShadow = true;
  root.add(figure);

  // ---------- 风车叶（一直在转） ----------
  const hub = new THREE.Group();
  hub.position.set(X_W - 0.3, TOP + 0.78, 0.8);
  const blade = [];
  blade.push(paint(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 14).rotateZ(Math.PI / 2), 0x6b4a33));
  for (let k = 0; k < 4; k++) {
    const one = [];
    one.push(at(paint(new THREE.BoxGeometry(0.02, 0.46, 0.022), 0x6b4a33), 0, 0.26, 0));
    one.push(at(paint(new THREE.BoxGeometry(0.008, 0.34, 0.1), k % 2 ? 0xf1e7d6 : 0xd9553e), -0.006, 0.3, 0.06));
    for (let j = 0; j < 4; j++) one.push(at(paint(new THREE.BoxGeometry(0.012, 0.012, 0.11), 0x6b4a33), -0.012, 0.16 + j * 0.09, 0.06));
    const g = merge(one);
    g.rotateX((k * Math.PI) / 2);
    blade.push(g);
  }
  const blades = new THREE.Mesh(merge(blade), std({ roughness: 0.6 }));
  hub.add(blades);
  root.add(hub);

  // ---------- 灯串：两条悬链，一串小灯泡（InstancedMesh） ----------
  const strands = [
    { x: X_B, z0: -2.55, z1: 2.55, y0: TOP + 1.9, sag: 0.55, n: 17 },
    { x: X_B - 0.8, z0: -2.45, z1: 1.3, y0: TOP + 1.5, sag: 0.35, n: 11 },
  ];
  const wires = [];
  const bulbPos = [];
  for (const s of strands) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(V(s.x, s.y0 - s.sag * 4 * t * (1 - t), s.z0 + (s.z1 - s.z0) * t));
    }
    wires.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.006, 4, false), 0x1a1410));
    for (let i = 1; i < s.n; i++) {
      const t = i / s.n;
      bulbPos.push(V(s.x, s.y0 - s.sag * 4 * t * (1 - t) - 0.045, s.z0 + (s.z1 - s.z0) * t));
    }
  }
  const wireMesh = new THREE.Mesh(merge(wires), new THREE.MeshBasicMaterial({ vertexColors: true }));
  root.add(wireMesh);
  bulbPos.push(V(X_F + 0.55, TOP + 0.885, 0.55)); // 路灯灯泡
  const PAL = [0xffc46b, 0xff7a45, 0xfff0c8, 0x7fd8ff, 0xff8fb8];
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 10, 8), bulbMat, bulbPos.length);
  const baseCol = [];
  const m4 = new THREE.Matrix4();
  bulbPos.forEach((p, i) => {
    m4.makeTranslation(p.x, p.y, p.z);
    bulbs.setMatrixAt(i, m4);
    baseCol.push(new THREE.Color(PAL[i % PAL.length]));
    bulbs.setColorAt(i, baseCol[i]);
  });
  const phase = bulbPos.map(() => R() * Math.PI * 2);
  const rate = bulbPos.map(() => 1.2 + R() * 2.2);
  root.add(bulbs);

  // ---------- 天幕：黄昏渐变 + 远山剪影 + 月亮 + 星星 ----------
  const skyGeo = new THREE.PlaneGeometry(6.4, 3.2, 24, 12);
  const pos = skyGeo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cTop = new THREE.Color(0x0d1640);
  const cMid = new THREE.Color(0x3b3f8f);
  const cLow = new THREE.Color(0xf08a4b);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 1.6) / 3.2;
    if (t < 0.35) c.lerpColors(cLow, cMid, t / 0.35); else c.lerpColors(cMid, cTop, (t - 0.35) / 0.65);
    col.set([c.r, c.g, c.b], i * 3);
    const x = pos.getX(i);
    pos.setZ(i, ((x / 3.2) ** 2) * 0.6); // 两侧向镜头方向弯
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  skyGeo.rotateY(-Math.PI / 2);
  skyGeo.translate(X_B + 1.3, TOP + 1.6, 0);
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  root.add(sky);
  const hills = [];
  const hillShape = (z0, z1, h, n, hex, x) => {
    const s = new THREE.Shape();
    s.moveTo(z0, 0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      s.lineTo(z0 + (z1 - z0) * t, h * (0.55 + 0.45 * Math.sin(t * Math.PI * 2.3 + z0)) * Math.sin(t * Math.PI) ** 0.4);
    }
    s.lineTo(z1, 0);
    const g = new THREE.ShapeGeometry(s, 4);
    g.rotateY(-Math.PI / 2); // 正面朝镜头（-x）
    g.translate(x, TOP, 0);
    return paint(g, hex);
  };
  hills.push(hillShape(-3.2, 3.2, 0.75, 24, 0x2a2350, X_B + 1.1));
  hills.push(hillShape(-3.2, 1.5, 0.45, 18, 0x1a1a35, X_B + 0.9));
  for (let i = 0; i < 9; i++) {
    const z = -2.8 + i * 0.7 + R() * 0.2;
    hills.push(at(paint(new THREE.ConeGeometry(0.1, 0.42 + R() * 0.2, 6), 0x141428), X_B + 0.85, TOP + 0.28, z));
  }
  hills.push(at(paint(new THREE.CircleGeometry(0.2, 32), glow(0xfff2d0, 1.6)), X_B + 1.05, TOP + 2.4, 1.6, 0, -Math.PI / 2));
  root.add(new THREE.Mesh(merge(hills), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })));
  const starPos = [];
  for (let i = 0; i < 70; i++) starPos.push(X_B + 1.2, TOP + 1.7 + R() * 1.4, -3 + R() * 6);
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.035, map: softDot(), transparent: true, depthWrite: false, color: new THREE.Color(1.6, 1.6, 1.8), fog: false }));
  root.add(stars);

  // ---------- 布景灯：暖色主光打在人偶上，冷色月光轮廓 ----------
  const spot = new THREE.SpotLight(0xffd6a8, 9, 6, 0.5, 0.6, 1.4);
  spot.position.set(X_F - 0.6, 1.9, -1.3);
  spot.target.position.set(X_F, TOP + 0.35, -0.2);
  const moon = new THREE.PointLight(0x8fb4ff, 5, 7, 1.5);
  moon.position.set(X_W + 1.2, 1.9, 1.2);
  const bulbGlow = new THREE.PointLight(0xffb070, 3, 5, 1.5);
  bulbGlow.position.set(X_B - 0.5, TOP + 1.2, 0);
  root.add(spot, spot.target, moon, bulbGlow);
  for (const l of [spot, moon, bulbGlow]) l.layers.enableAll();

  photoVisible(root);

  // 照片通道里灯泡要亮得多（点光源的能量会摊到整个焦外光斑上）；主画面里只要 bloom 出光晕
  const BULB_MAIN = 3.2;
  const BULB_PHOTO = 34;
  let bulbK = BULB_MAIN;
  let tNow = 0;
  function setTime(t) {
    tNow = t;
    blades.rotation.x = -t * WINDMILL_REV_PER_S * Math.PI * 2;
    for (let i = 0; i < baseCol.length; i++) {
      const f = 0.72 + 0.28 * Math.sin(t * rate[i] + phase[i]) * Math.sin(t * rate[i] * 0.37 + phase[i] * 2);
      c.copy(baseCol[i]).multiplyScalar(bulbK * f);
      bulbs.setColorAt(i, c);
    }
    bulbs.instanceColor.needsUpdate = true;
  }
  setTime(0);

  const W = (o) => o.getWorldPosition(new THREE.Vector3());
  return {
    root, figure, blades, bulbs, hub,
    setTime,
    get time() { return tNow; },
    photoMode(on) { bulbK = on ? BULB_PHOTO : BULB_MAIN; setTime(tNow); },
    anchors: {
      figure: () => V(X_F, TOP + 0.78, -0.2),
      windmill: () => W(hub).add(V(0, 0.55, 0)),
      bulbs: () => V(X_B, TOP + 2.05, -1.2),
    },
    box: new THREE.Box3(V(0.7, 0, -2.8), V(X_B + 1.4, TOP + 3.2, 2.8)),
  };
}
