// 台面上的物件：带米刻度的导轨（0–6m）、三脚架上的相机（镜头长度随焦距变）、三个人偶、5m 处的灯串、清晰范围板。
// 导轨上的距离按比例（1m = U 个场景单位，从镜头前端量起）；人偶、灯串、相机高度为了看得清放大了，不按比例。
import * as THREE from 'three';
import { paint, at, merge, prbox, rbox, glow, damp, canvasTexture } from '../../exploded/kit/util.js';
import { CYAN, ORANGE } from '../../exploded/kit/palette.js';
import { BODY, FIGURE, BULBS } from './palette.js';
import { SUBJECTS, BULBS_M, FOCALS } from './optics.js';

export const U = 1.6;
// 观众站在 -z 看向 +z，屏幕右侧是 -x：相机放在左边（大 x），距离往屏幕右侧（-x）增长，和读数习惯一致
export const DIR = -1;
export const CAM_X = 5.0; // 镜头前端（距离零点）
export const RAIL_Z = 0.3;
export const AXIS_Y = 1.0; // 镜头高度 ≈ 人偶头部，副相机拍到的是平视构图
export const RAIL_M = 6;
export const xAt = (m) => CAM_X + DIR * m * U;
export const zAt = (lateralM) => RAIL_Z + DIR * lateralM * U; // 照片右侧 = 相机的右手边

const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2, ...o });
const add = (scene, geo, mat, shadow = true) => {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
  return m;
};

export function buildRail(scene) {
  const parts = [prbox(BODY.rail, RAIL_M * U + 0.5, 0.06, 0.34, CAM_X + DIR * ((RAIL_M * U) / 2 - 0.1), 0.03, RAIL_Z, 0.02)];
  parts.push(prbox(BODY.railTop, RAIL_M * U + 0.4, 0.012, 0.05, CAM_X + DIR * ((RAIL_M * U) / 2 - 0.1), 0.066, RAIL_Z, 0.004));
  for (let i = 0; i <= RAIL_M * 10; i++) {
    const major = i % 10 === 0;
    const half = i % 5 === 0;
    parts.push(at(paint(new THREE.BoxGeometry(0.012, 0.008, major ? 0.16 : half ? 0.11 : 0.06), BODY.tick), xAt(i / 10), 0.064, RAIL_Z - 0.17 + (major ? 0.08 : half ? 0.055 : 0.03)));
  }
  add(scene, merge(parts), std({ roughness: 0.4, metalness: 0.6 }), false);
  // 米数刻字：贴在导轨靠观众一侧的台面上
  const W = 2048;
  const H = 96;
  const strip = canvasTexture(W, H, (c) => {
    c.clearRect(0, 0, W, H);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let m = 0; m <= RAIL_M; m++) {
      c.font = '800 54px ui-monospace, Menlo, monospace';
      c.fillStyle = BODY.railInk;
      c.fillText(m === 0 ? '0' : `${m}m`, ((m + 0.25) / (RAIL_M + 0.5)) * W, H / 2);
    }
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry((RAIL_M + 0.5) * U, ((RAIL_M + 0.5) * U * H) / W), new THREE.MeshBasicMaterial({ map: strip.tex, transparent: true, depthWrite: false }));
  plane.rotation.set(-Math.PI / 2, 0, Math.PI); // 先在平面内转半圈：字头朝 +z、米数往 -x 增长，观众正着读
  plane.position.set(CAM_X + DIR * (((RAIL_M + 0.5) * U) / 2 - 0.25), 0.008, RAIL_Z - 0.32);
  plane.userData.noDepth = true;
  scene.add(plane);
}

// 相机：机身固定，镜筒长度随焦距（24mm 短、200mm 长），镜头前端始终在距离零点。
export function buildCamera(scene) {
  const g = new THREE.Group();
  scene.add(g);
  const mat = std({ roughness: 0.4, metalness: 0.45 });
  const tripod = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const foot = new THREE.Vector3(CAM_X - DIR * 0.75 + Math.cos(a) * 0.42, 0, RAIL_Z + Math.sin(a) * 0.42);
    const top = new THREE.Vector3(CAM_X - DIR * 0.75, AXIS_Y - 0.2, RAIL_Z);
    const len = foot.distanceTo(top);
    const leg = paint(new THREE.CylinderGeometry(0.018, 0.022, len, 8), BODY.tripod);
    leg.applyMatrix4(new THREE.Matrix4().compose(foot.clone().add(top).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize()), new THREE.Vector3(1, 1, 1)));
    tripod.push(leg);
  }
  tripod.push(prbox(BODY.tripod, 0.22, 0.05, 0.2, CAM_X - DIR * 0.75, AXIS_Y - 0.2, RAIL_Z, 0.02));
  add(scene, merge(tripod), mat);
  const body = merge([
    prbox(BODY.shell, 0.34, 0.26, 0.42, 0, 0, 0, 0.05),
    prbox(BODY.grip, 0.18, 0.22, 0.12, 0, -0.01, DIR * 0.24, 0.04),
    prbox(BODY.shell, 0.14, 0.1, 0.16, 0.0, 0.17, 0, 0.03),
    at(paint(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), BODY.ring), 0, 0.14, DIR * 0.15),
  ]);
  const bodyMesh = add(scene, body, mat);
  const barrel = add(scene, merge([
    at(paint(new THREE.CylinderGeometry(0.12, 0.12, 1, 32), BODY.barrel), 0, 0, 0, 0, 0, Math.PI / 2),
    at(paint(new THREE.CylinderGeometry(0.126, 0.126, 0.25, 32), BODY.ring), 0, 0, 0, 0, 0, Math.PI / 2),
  ]), mat);
  const glass = add(scene, at(new THREE.CircleGeometry(0.1, 32), 0, 0, 0, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: BODY.glass, roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.7 }), false);
  const lenFor = (i) => 0.12 + ((FOCALS[i] - FOCALS[0]) / (FOCALS.at(-1) - FOCALS[0])) * 0.55;
  const cur = { len: lenFor(3) };
  const place = () => {
    bodyMesh.position.set(CAM_X - DIR * (cur.len + 0.17), AXIS_Y, RAIL_Z);
    barrel.scale.set(cur.len, 1, 1);
    barrel.position.set(CAM_X - DIR * (cur.len / 2), AXIS_Y, RAIL_Z);
    glass.position.set(CAM_X + DIR * 0.002, AXIS_Y, RAIL_Z);
  };
  place();
  return {
    update(dt, focalIdx) { cur.len = damp(cur.len, lenFor(focalIdx), 8, dt); place(); },
  };
}

// 人偶：放大的标记（1.7m → 约 1.25 单位，不按导轨比例），彼此身高比例按真实值
export function buildFigures(scene) {
  const out = {};
  SUBJECTS.forEach((o, i) => {
    const k = (o.h / 1.7) * 1.9;
    const x = xAt(o.d);
    const z = zAt(o.x);
    const p = [];
    p.push(at(paint(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 24), FIGURE.base), x, 0.015, z));
    p.push(at(paint(new THREE.CapsuleGeometry(0.035 * k, 0.16 * k, 4, 10), FIGURE.pants), x, 0.03 + 0.11 * k, z - 0.04 * k));
    p.push(at(paint(new THREE.CapsuleGeometry(0.035 * k, 0.16 * k, 4, 10), FIGURE.pants), x, 0.03 + 0.11 * k, z + 0.04 * k));
    p.push(at(paint(rbox(0.13 * k, 0.24 * k, 0.2 * k, 0.05 * k), FIGURE.jackets[i]), x, 0.03 + 0.33 * k, z));
    for (const s of [-1, 1]) p.push(at(paint(new THREE.CapsuleGeometry(0.028 * k, 0.17 * k, 4, 8), FIGURE.jackets[i]), x, 0.03 + 0.32 * k, z + s * 0.12 * k));
    p.push(at(paint(new THREE.SphereGeometry(0.085 * k, 20, 14), FIGURE.skin), x, 0.03 + 0.53 * k, z));
    p.push(at(paint(new THREE.SphereGeometry(0.088 * k, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), FIGURE.hair), x + 0.01, 0.03 + 0.55 * k, z));
    add(scene, merge(p), std({ roughness: 0.6, metalness: 0 }));
    out[o.key] = () => new THREE.Vector3(x, 0.02, RAIL_Z - 1.1); // 标签钉在人偶前方的台面上，不与板顶的标签抢位置
  });
  return out;
}

// 灯串：两根立杆之间一串小灯泡，发光进 bloom（远处背景的点光源）
export function buildBulbs(scene) {
  const x = xAt(BULBS_M);
  const n = 11;
  const z0 = zAt(-1.0);
  const z1 = zAt(1.0);
  const yAt = (t) => 1.5 - Math.sin(t * Math.PI) * 0.2;
  const posts = [];
  for (const z of [z0, z1]) {
    posts.push(at(paint(new THREE.CylinderGeometry(0.025, 0.03, 1.55, 10), BODY.post), x, 0.775, z));
    posts.push(at(paint(new THREE.CylinderGeometry(0.07, 0.08, 0.03, 16), BODY.post), x, 0.015, z));
  }
  const wire = [];
  for (let i = 0; i < 24; i++) {
    const t0 = i / 24;
    const t1 = (i + 1) / 24;
    const a = new THREE.Vector3(x, yAt(t0), z0 + (z1 - z0) * t0);
    const b = new THREE.Vector3(x, yAt(t1), z0 + (z1 - z0) * t1);
    const seg = paint(new THREE.CylinderGeometry(0.004, 0.004, a.distanceTo(b), 4), BODY.wire);
    seg.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()), new THREE.Vector3(1, 1, 1)));
    wire.push(seg);
  }
  add(scene, merge([...posts, ...wire]), std({ roughness: 0.5, metalness: 0.4 }));
  const bulbs = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    bulbs.push(at(paint(new THREE.SphereGeometry(0.04, 12, 8), glow(BULBS[i % BULBS.length], 2.4)), x, yAt(t) - 0.05, z0 + (z1 - z0) * t));
  }
  add(scene, merge(bulbs), new THREE.MeshBasicMaterial({ vertexColors: true }), false);
  return () => new THREE.Vector3(x, 1.55, z0);
}

// 清晰范围：近点、远点各立一块带亮边的青色薄板，中间一块半透明体，导轨上一段高亮色带；对焦面是橙色薄片。
// 远点超出导轨按导轨末端画。整组只是教学叠加层，副相机拍照时隐藏（group）。
export function buildBoard(scene) {
  const g = new THREE.Group();
  scene.add(g);
  const H = 1.5;
  const D = 2.2;
  const MIN_W = 0.06; // 板间最小可视厚度（场景单位），f/1.4 时真实宽度只有几厘米
  const slabMat = new THREE.MeshBasicMaterial({ color: glow(CYAN, 1.4), transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1, H, D), slabMat);
  const plateMat = new THREE.MeshBasicMaterial({ color: glow(CYAN, 1.6), transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const rimMat = new THREE.LineBasicMaterial({ color: glow(CYAN, 2.6), transparent: true, opacity: 0.95 });
  const plateGeo = new THREE.PlaneGeometry(D, H);
  const rimGeo = new THREE.EdgesGeometry(plateGeo);
  const plates = [0, 1].map(() => {
    const p = new THREE.Group();
    p.add(new THREE.Mesh(plateGeo, plateMat), new THREE.LineSegments(rimGeo, rimMat));
    p.rotation.y = Math.PI / 2;
    return p;
  });
  const band = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 0.14), new THREE.MeshBasicMaterial({ color: glow(CYAN, 2.6) }));
  const focusMat = new THREE.MeshBasicMaterial({ color: glow(ORANGE, 2), transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const focus = new THREE.Mesh(plateGeo, focusMat);
  focus.rotation.y = Math.PI / 2;
  g.add(slab, ...plates, band, focus);
  g.traverse((o) => { o.userData.noDepth = true; });
  const cur = { near: 1.4, far: 1.6, focus: 1.5 };
  let pulse = 0;
  const maxM = RAIL_M - 0.05;
  return {
    group: g,
    pulse() { pulse = 1; },
    // 输入单位 m；far 可为 Infinity
    update(dt, nearM, farM, focusM) {
      cur.near = damp(cur.near, Math.min(nearM, maxM), 10, dt);
      cur.far = damp(cur.far, Math.min(farM, maxM), 10, dt);
      cur.focus = damp(cur.focus, focusM, 10, dt);
      const mid = (xAt(cur.near) + xAt(cur.far)) / 2;
      const w = Math.max(MIN_W, (cur.far - cur.near) * U);
      slab.scale.x = w;
      slab.position.set(mid, 0.07 + H / 2, RAIL_Z);
      plates[0].position.set(mid - (DIR * w) / 2, 0.07 + H / 2, RAIL_Z);
      plates[1].position.set(mid + (DIR * w) / 2, 0.07 + H / 2, RAIL_Z);
      band.scale.x = w;
      band.position.set(mid, 0.078, RAIL_Z);
      focus.position.set(xAt(cur.focus), 0.07 + H / 2, RAIL_Z);
      pulse = Math.max(0, pulse - dt * 0.4);
      slabMat.opacity = 0.08 + pulse * 0.16;
      plateMat.opacity = 0.16 + pulse * 0.2;
      focusMat.opacity = 0.2 + pulse * 0.2;
    },
    rangeAnchor: () => new THREE.Vector3((xAt(cur.near) + xAt(cur.far)) / 2, 0.07 + H, RAIL_Z - D / 2),
    focusAnchor: () => new THREE.Vector3(xAt(cur.focus), 0.07 + H, RAIL_Z + D / 2), // 挂在板的后上角，与前沿的清晰范围标签错开
  };
}

// 视野边线（俯视看得最清楚）：从镜头前端向两侧张开，张角 = 水平视角，随焦距变
export function buildFov(scene) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  const mat = new THREE.LineDashedMaterial({ color: glow(ORANGE, 1.6), dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.7 });
  const lines = new THREE.LineSegments(geo, mat);
  lines.userData.noDepth = true;
  scene.add(lines);
  let half = 0.2;
  return {
    lines,
    update(dt, halfAngle) {
      half = damp(half, halfAngle, 8, dt);
      const L = Math.min(RAIL_M * U, 2.4 / Math.tan(half)); // 广角时边线截在台面内
      const p = geo.attributes.position;
      const y = 0.08;
      p.setXYZ(0, CAM_X, y, RAIL_Z);
      p.setXYZ(1, CAM_X + DIR * L, y, RAIL_Z + Math.tan(half) * L);
      p.setXYZ(2, CAM_X, y, RAIL_Z);
      p.setXYZ(3, CAM_X + DIR * L, y, RAIL_Z - Math.tan(half) * L);
      p.needsUpdate = true;
      lines.computeLineDistances();
    },
  };
}
