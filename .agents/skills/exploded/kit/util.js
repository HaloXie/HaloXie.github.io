// kit 通用小工具：弹簧、几何上色合并、画布贴图、倒角盒。所有 lab 共用。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// 临界阻尼弹簧（隐式欧拉，任意 dt 稳定）。s = { x, v }。
export function spring(s, target, dt, omega) {
  const f = 1 + 2 * dt * omega;
  const hoo = dt * omega * omega;
  const hhoo = dt * hoo;
  const inv = 1 / (f + hhoo);
  const x = (f * s.x + dt * s.v + hhoo * target) * inv;
  s.v = (s.v + hoo * (target - s.x)) * inv;
  s.x = x;
  return x;
}
// 欠阻尼弹簧：zeta < 1 时有回弹（按钮、挡位旋钮用）。半隐式欧拉，dt 内分步保证稳定。
export function bouncy(s, target, dt, omega, zeta = 0.35) {
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    s.v += (omega * omega * (target - s.x) - 2 * zeta * omega * s.v) * h;
    s.x += s.v * h;
  }
  return s.x;
}
export function springVec(s, target, dt, omega) {
  for (const k of ['x', 'y', 'z']) {
    const c = { x: s.x[k], v: s.v[k] };
    spring(c, target[k], dt, omega);
    s.x[k] = c.x;
    s.v[k] = c.v;
  }
}
export function damp(x, target, k, dt) {
  return x + (target - x) * (1 - Math.exp(-k * dt));
}
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

// 刷顶点色，便于把不同颜色的零件合并成一次 draw call。
export function paint(geo, hex) {
  const c = new THREE.Color(hex);
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
export function at(geo, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    typeof s === 'number' ? new THREE.Vector3(s, s, s) : s,
  );
  geo.applyMatrix4(m);
  return geo;
}
export function merge(list) {
  const out = mergeGeometries(list, false);
  if (!out) throw new Error('mergeGeometries failed: attribute sets differ');
  for (const g of list) g.dispose();
  return out;
}
// 倒角盒：r = 倒角半径，默认取最短边的 18%。
export function rbox(w, h, d, r, seg = 3) {
  const rr = r ?? Math.min(w, h, d) * 0.18;
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(rr, Math.min(w, h, d) / 2 - 1e-4));
}
// 上色后的倒角盒，放到 (x, y, z)
export function prbox(hex, w, h, d, x, y, z, r, ry = 0) {
  return at(paint(rbox(w, h, d, r), hex), x, y, z, 0, ry, 0);
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (draw) draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { tex: t, canvas: c, ctx: g };
}
// 发光色：分量可 >1，进 bloom。
export function glow(hex, k) {
  return new THREE.Color(hex).multiplyScalar(k);
}
// 可复现随机数（mulberry32）
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const $ = (id) => document.getElementById(id);
export const FONT = '"SF Pro Display", -apple-system, system-ui, "PingFang SC", sans-serif';
export const MONO = '"SF Mono", ui-monospace, Menlo, monospace';
export const ORANGE = 0xff8a2a;
export const CYAN = 0x3fe0ff;
export const GREEN = 0x7dffa8;
