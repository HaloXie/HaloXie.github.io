// kit 运镜：预设机位 + 自动构图。
// 构图：用 camera.setViewOffset 把主体投到「两侧面板之间的空白区」中心，二分距离让主体占画面 fill（默认 60%），
// 同时保证主体包围盒完整落在空白区里（不被面板遮、不被画面边缘裁）。
// 空白区从 DOM 读：带 data-dock="left|right|top|bottom" 的元素向内挤占画面。
import * as THREE from 'three';
import { spring } from './util.js';

const MARGIN = 14;

export function freeRect() {
  let l = 0;
  let r = innerWidth;
  let t = 0;
  let b = innerHeight;
  document.querySelectorAll('[data-dock]').forEach((el) => {
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
    const q = el.getBoundingClientRect();
    if (q.width === 0 || q.height === 0) return;
    const side = el.dataset.dock;
    if (side === 'left') l = Math.max(l, q.right);
    if (side === 'right') r = Math.min(r, q.left);
    if (side === 'top') t = Math.max(t, q.bottom);
    if (side === 'bottom') b = Math.min(b, q.top);
  });
  return { x: l + MARGIN, y: t + MARGIN, w: r - l - 2 * MARGIN, h: b - t - 2 * MARGIN };
}

const corners = (box) => {
  const out = [];
  for (let i = 0; i < 8; i++) out.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
  return out;
};

export function createViews(camera, controls, renderer) {
  const presets = {};
  const solved = {};
  const cur = {
    px: { x: 0, v: 0 }, py: { x: 0, v: 0 }, pz: { x: 0, v: 0 },
    tx: { x: 0, v: 0 }, ty: { x: 0, v: 0 }, tz: { x: 0, v: 0 },
    ox: { x: 0, v: 0 }, oy: { x: 0, v: 0 },
  };
  let active = null;
  let flying = false;
  let stillFrames = 0;
  const lastM = new THREE.Matrix4();
  const tmp = new THREE.Vector3();

  function applyOffset(ox, oy) {
    const W = innerWidth;
    const H = innerHeight;
    camera.aspect = W / H;
    camera.setViewOffset(W, H, ox, oy, W, H);
    camera.updateProjectionMatrix();
  }
  // 当前相机参数下包围盒投影到屏幕的像素矩形
  function projectBox(box) {
    camera.updateMatrixWorld(true);
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const c of corners(box)) {
      tmp.copy(c).project(camera);
      const sx = (tmp.x * 0.5 + 0.5) * innerWidth;
      const sy = (-tmp.y * 0.5 + 0.5) * innerHeight;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }

  function solve(name) {
    const p = presets[name];
    const box = typeof p.box === 'function' ? p.box() : p.box;
    const target = p.target ? p.target.clone() : box.getCenter(new THREE.Vector3());
    const dir = p.dir.clone().normalize();
    const R = freeRect();
    const W = innerWidth;
    const H = innerHeight;
    const fill = p.fill ?? 0.6;
    let D = box.getSize(tmp).length() * 1.6;
    let ox = W / 2 - (R.x + R.w / 2);
    let oy = H / 2 - (R.y + R.h / 2);
    const saveFov = camera.fov;
    if (p.fov) camera.fov = p.fov;
    let pr = null;
    for (let it = 0; it < 24; it++) {
      camera.position.copy(target).addScaledVector(dir, D);
      camera.lookAt(target);
      applyOffset(ox, oy);
      pr = projectBox(box);
      // 目标尺寸：宽或高中较大的一边占画面 fill，且整个框留在空白区里
      const kFill = Math.max(pr.w / W, pr.h / H) / fill;
      const kFit = Math.max(pr.w / (R.w * 0.98), pr.h / (R.h * 0.98));
      const k = Math.max(kFill, kFit);
      D *= 1 + (k - 1) * 0.9;
      // 包围盒中心对齐空白区中心
      ox += ((pr.x0 + pr.x1) / 2 - (R.x + R.w / 2)) * 0.9;
      oy += ((pr.y0 + pr.y1) / 2 - (R.y + R.h / 2)) * 0.9;
    }
    camera.position.copy(target).addScaledVector(dir, D);
    camera.lookAt(target);
    applyOffset(ox, oy);
    pr = projectBox(box);
    const fov = camera.fov;
    camera.fov = saveFov;
    solved[name] = {
      pos: camera.position.clone(), target, ox, oy, fov,
      fillW: pr.w / W, fillH: pr.h / H,
      inside: pr.x0 >= R.x - 1 && pr.x1 <= R.x + R.w + 1 && pr.y0 >= R.y - 1 && pr.y1 <= R.y + R.h + 1,
      rect: R, proj: pr,
    };
    return solved[name];
  }

  const api = {
    presets, solved, freeRect,
    get active() { return active; },
    define(name, p) { presets[name] = p; },
    go(name, instant = false) {
      // 先记下当前（可能被手动拖过的）视角，solve 会临时改动相机
      const from = { p: camera.position.clone(), t: controls.target.clone() };
      const s = solve(name);
      active = name;
      flying = true;
      const put = (k, v) => { cur[k].x = v; if (instant) cur[k].v = 0; };
      const P = instant ? s.pos : from.p;
      const T = instant ? s.target : from.t;
      put('px', P.x); put('py', P.y); put('pz', P.z);
      put('tx', T.x); put('ty', T.y); put('tz', T.z);
      if (instant) { put('ox', s.ox); put('oy', s.oy); }
      camera.fov = s.fov;
      controls.enabled = false;
      api.update(0);
    },
    update(dt) {
      if (active && flying) {
        const s = solved[active];
        const w = 4.2;
        spring(cur.px, s.pos.x, dt, w); spring(cur.py, s.pos.y, dt, w); spring(cur.pz, s.pos.z, dt, w);
        spring(cur.tx, s.target.x, dt, w); spring(cur.ty, s.target.y, dt, w); spring(cur.tz, s.target.z, dt, w);
        spring(cur.ox, s.ox, dt, w); spring(cur.oy, s.oy, dt, w);
        camera.position.set(cur.px.x, cur.py.x, cur.pz.x);
        controls.target.set(cur.tx.x, cur.ty.x, cur.tz.x);
        camera.lookAt(controls.target);
        applyOffset(cur.ox.x, cur.oy.x);
        const err = camera.position.distanceTo(s.pos) + controls.target.distanceTo(s.target);
        if (err < 1e-3 && Math.abs(cur.ox.x - s.ox) < 0.5) { flying = false; controls.enabled = true; }
      }
      camera.updateMatrixWorld();
      const moved = !lastM.equals(camera.matrixWorld);
      lastM.copy(camera.matrixWorld);
      stillFrames = moved ? 0 : stillFrames + 1;
    },
    isStill: () => stillFrames > 2,
    focusDistance: () => camera.position.distanceTo(controls.target),
    resize() { if (active) { const a = active; solve(a); flying = true; api.update(0); } else applyOffset(0, 0); },
  };
  return api;
}
