// kit 台面实体控件：挡位旋钮（段落感 + 回弹）、按压按钮（回弹）、指针表。统一的拾取器。
import * as THREE from 'three';
import { paint, at, merge, bouncy, canvasTexture, glow, FONT, MONO, ORANGE } from './util.js';

const ptr = new THREE.Vector2();
const ray = new THREE.Raycaster();

// 拾取器：controls = [{ meshes, onDown(e, hit), onDrag(dx, dy), onUp(moved), hover(bool) }]
export function createPicker(stage) {
  const { renderer, camera, controls } = stage;
  const list = [];
  let active = null;
  let hovered = null;
  let start = null;
  let moved = 0;
  const el = renderer.domElement;
  function hit(e) {
    const r = el.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const meshes = list.flatMap((c) => c.meshes);
    const h = ray.intersectObjects(meshes, false)[0];
    return h ? list.find((c) => c.meshes.includes(h.object)) : null;
  }
  el.addEventListener('pointerdown', (e) => {
    const c = hit(e);
    if (!c) return;
    active = c;
    start = { x: e.clientX, y: e.clientY };
    moved = 0;
    controls.enabled = false;
    el.setPointerCapture(e.pointerId);
    c.onDown?.(e);
  });
  el.addEventListener('pointermove', (e) => {
    if (active) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      moved = Math.max(moved, Math.hypot(dx, dy));
      active.onDrag?.(dx, dy);
      return;
    }
    const c = hit(e);
    if (c !== hovered) { hovered?.hover?.(false); c?.hover?.(true); hovered = c; }
    el.style.cursor = c ? 'pointer' : '';
  });
  const up = (e) => {
    if (!active) return;
    active.onUp?.(moved > 4, e);
    active = null;
    controls.enabled = true;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return { add(c) { list.push(c); return c; }, get dragging() { return !!active; } };
}

// 挡位旋钮。labels：每挡的刻度字；sweep：总转角；onStep(i)：挡位变化
export function knob(stage, picker, o) {
  const { r = 0.28, labels, sweep = (270 * Math.PI) / 180, title, tone = ORANGE, onStep } = o;
  const n = labels.length;
  const g = new THREE.Group();
  g.position.copy(o.position);
  g.rotation.y = Math.PI; // 观众在 -z 一侧：刻度字的"上"朝 +z
  if (o.rotation) g.rotation.copy(o.rotation);
  const angleOf = (i) => sweep / 2 - (i / (n - 1)) * sweep; // 顺时针走挡（从上往下看）

  // 刻度面：画布贴在台面上
  const S = 512;
  const face = canvasTexture(S, S, (c) => {
    c.clearRect(0, 0, S, S);
    const cx = S / 2;
    const R = S * 0.36;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    labels.forEach((t, i) => {
      const a = angleOf(i);
      const x = cx - Math.sin(a) * R * 1.13;
      const y = cx - Math.cos(a) * R * 1.13;
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.fillRect(cx - Math.sin(a) * R * 0.92 - 3, cx - Math.cos(a) * R * 0.92 - 3, 6, 6);
      c.font = `800 ${n > 7 ? 30 : 34}px ${MONO}`;
      c.fillStyle = '#e8edf5';
      c.fillText(t, x, y);
    });
    if (title) {
      c.font = `800 30px ${FONT}`;
      c.fillStyle = `#${new THREE.Color(tone).getHexString()}`;
      c.fillText(title, cx, S - 22);
    }
  });
  const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 3.4, r * 3.4), new THREE.MeshBasicMaterial({ map: face.tex, transparent: true, depthWrite: false }));
  faceMesh.rotation.x = -Math.PI / 2;
  faceMesh.position.y = 0.012;
  faceMesh.userData.noDepth = true; // 贴花：不进 AO / 景深深度通道
  g.add(faceMesh);

  const base = new THREE.Mesh(merge([
    at(paint(new THREE.CylinderGeometry(r * 1.18, r * 1.24, 0.05, 48), 0x1a1e25), 0, 0.025, 0),
    at(paint(new THREE.TorusGeometry(r * 1.15, 0.012, 6, 48), glow(tone, 1.4)), 0, 0.05, 0, Math.PI / 2),
  ]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.6 }));
  g.add(base);

  // 旋转体：滚花圆柱 + 指示线（一个 mesh）
  const parts = [at(paint(new THREE.CylinderGeometry(r, r * 1.02, 0.2, 40), 0x2c313a), 0, 0.15, 0)];
  parts.push(at(paint(new THREE.CylinderGeometry(r * 0.9, r * 0.96, 0.03, 40), 0x444b57), 0, 0.265, 0));
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    parts.push(at(paint(new THREE.BoxGeometry(0.018, 0.17, 0.03), 0x16191e), Math.sin(a) * r, 0.15, Math.cos(a) * r, 0, a));
  }
  parts.push(at(paint(new THREE.BoxGeometry(0.035, 0.012, r * 0.8), glow(tone, 2.2)), 0, 0.285, -r * 0.45));
  const body = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.55 }));
  body.castShadow = true;
  g.add(body);
  stage.bench.add(g);

  const st = { i: o.value ?? 0, a: { x: angleOf(o.value ?? 0), v: 0 }, drag0: 0, press: { x: 0, v: 0 }, hot: 0 };
  picker.add({
    meshes: [body, base],
    onDown() { st.drag0 = st.i; },
    onDrag(dx) {
      const steps = Math.round(dx / 34);
      const i = Math.max(0, Math.min(n - 1, st.drag0 + steps));
      if (i !== st.i) onStep(i);
    },
    // 单击走下一挡（到头回到第一挡），Shift + 单击走上一挡
    onUp(moved, e) { if (!moved) onStep((st.i + (e.shiftKey ? -1 : 1) + n) % n); },
    hover(v) { st.hot = v ? 1 : 0; },
  });
  stage.onFrame((dt) => {
    // 欠阻尼：走到挡位后略过冲再回位 = 段落感
    bouncy(st.a, angleOf(st.i), dt, 38, 0.32);
    body.rotation.y = st.a.x;
    bouncy(st.press, st.hot * 0.012, dt, 30, 0.5);
    body.position.y = st.press.x;
  });
  return {
    group: g,
    set(i) { st.i = i; },
  };
}

// 按压按钮：按下陷入 + 欠阻尼回弹
export function pushButton(stage, picker, o) {
  const { r = 0.22, color = 0xe0413a, onPress } = o;
  const g = new THREE.Group();
  g.position.copy(o.position);
  const base = new THREE.Mesh(merge([
    at(paint(new THREE.CylinderGeometry(r * 1.45, r * 1.55, 0.08, 40), 0x1a1e25), 0, 0.04, 0),
    at(paint(new THREE.TorusGeometry(r * 1.25, 0.015, 6, 40), glow(color, 1.6)), 0, 0.085, 0, Math.PI / 2),
  ]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }));
  const capMat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, emissive: color, emissiveIntensity: 0.15 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, 0.14, 40), capMat);
  cap.position.y = 0.15;
  cap.castShadow = true;
  g.add(base, cap);
  stage.bench.add(g);
  const st = { y: { x: 0, v: 0 }, down: false, hot: 0 };
  picker.add({
    meshes: [cap, base],
    onDown() { st.down = true; },
    onUp() { st.down = false; st.y.v += 1.2; onPress(); },
    hover(v) { st.hot = v ? 1 : 0; },
  });
  stage.onFrame((dt) => {
    bouncy(st.y, st.down ? -0.07 : 0, dt, 34, 0.28);
    cap.position.y = 0.15 + st.y.x;
    capMat.emissiveIntensity = 0.15 + st.hot * 0.35 + (st.down ? 0.8 : 0);
  });
  return { group: g, kick() { st.y.x = -0.07; st.y.v = 0; } };
}

// 指针表：value ∈ [-range, range]；face 画刻度
export function gauge(stage, o) {
  const { r = 0.42, range = 3, sweep = (240 * Math.PI) / 180, title = '', ticks = [] } = o;
  const g = new THREE.Group();
  g.position.copy(o.position);
  g.rotation.y = Math.PI;
  if (o.rotation) g.rotation.copy(o.rotation);
  const S = 512;
  const face = canvasTexture(S, S);
  const drawFace = (readout) => {
    const c = face.ctx;
    const cx = S / 2;
    c.clearRect(0, 0, S, S);
    const bg = c.createRadialGradient(cx, cx, 10, cx, cx, cx);
    bg.addColorStop(0, '#223044');
    bg.addColorStop(1, '#0d131d');
    c.fillStyle = bg;
    c.beginPath(); c.arc(cx, cx, cx - 4, 0, Math.PI * 2); c.fill();
    c.lineWidth = 16;
    const seg = (a0, a1, col) => { c.strokeStyle = col; c.beginPath(); c.arc(cx, cx, cx * 0.78, a0, a1); c.stroke(); };
    const ang = (v) => -Math.PI / 2 + (v / range) * (sweep / 2);
    seg(ang(-range), ang(-0.5), 'rgba(63,160,255,0.55)');
    seg(ang(-0.5), ang(0.5), 'rgba(125,255,168,0.9)');
    seg(ang(0.5), ang(range), 'rgba(255,120,80,0.6)');
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const t of ticks) {
      const a = ang(t.v);
      c.fillStyle = '#e8edf5';
      c.font = `800 34px ${MONO}`;
      c.fillText(t.label, cx + Math.cos(a) * cx * 0.56, cx + Math.sin(a) * cx * 0.56);
    }
    c.font = `800 30px ${FONT}`;
    c.fillStyle = '#9fb3c8';
    c.fillText(title, cx, cx * 1.34);
    c.font = `800 44px ${MONO}`;
    c.fillStyle = '#ffffff';
    c.fillText(readout || '', cx, cx * 1.62);
    face.tex.needsUpdate = true;
  };
  drawFace('');
  const bezel = new THREE.Mesh(merge([
    at(paint(new THREE.CylinderGeometry(r * 1.1, r * 1.16, 0.08, 48), 0x1a1e25), 0, 0.04, 0),
    at(paint(new THREE.TorusGeometry(r * 1.06, 0.018, 8, 48), 0x8a93a3), 0, 0.085, 0, Math.PI / 2),
  ]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.8 }));
  const dial = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ map: face.tex }));
  dial.rotation.x = -Math.PI / 2;
  dial.position.y = 0.082;
  const needle = new THREE.Mesh(merge([
    at(paint(new THREE.BoxGeometry(0.018, 0.012, r * 0.82), glow(ORANGE, 3)), 0, 0, -r * 0.36),
    at(paint(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), 0xdddddd), 0, 0, 0),
  ]), new THREE.MeshBasicMaterial({ vertexColors: true }));
  needle.position.y = 0.095;
  g.add(bezel, dial, needle);
  stage.bench.add(g);
  const st = { a: { x: 0, v: 0 }, v: 0, text: null };
  stage.onFrame((dt) => {
    const clamped = Math.max(-range * 1.04, Math.min(range * 1.04, st.v));
    bouncy(st.a, -(clamped / range) * (sweep / 2), dt, 16, 0.42);
    needle.rotation.y = st.a.x;
  });
  return {
    group: g,
    set(v, readout) { st.v = v; if (readout !== st.text) { st.text = readout; drawFace(readout); } },
  };
}
