// kit 胶囊标签：CSS2DRenderer，胶囊 + 竖向引线，锚在 3D 点上。
// labels.add(key, { anchor: () => Vector3, lift: px, tone: 'o'|'c'|'g'|'w' }) → { set(html), show(bool) }
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { damp } from './util.js';

export function createLabels(stage, parent = document.body) {
  const r = new CSS2DRenderer();
  r.setSize(innerWidth, innerHeight);
  r.domElement.className = 'kit-labels';
  parent.appendChild(r.domElement);
  addEventListener('resize', () => r.setSize(innerWidth, innerHeight));
  const items = new Map();

  function add(key, o) {
    const el = document.createElement('div');
    el.className = `kit-cap tone-${o.tone || 'w'}`;
    el.innerHTML = `<div class="kit-cap-body"></div><div class="kit-cap-line" style="height:${o.lift ?? 36}px"></div><div class="kit-cap-dot"></div>`;
    const obj = new CSS2DObject(el);
    obj.center.set(0.5, 1);
    stage.scene.add(obj);
    const it = { el, obj, body: el.firstChild, line: el.children[1], lift: o.lift ?? 36, extra: 0, anchor: o.anchor, vis: 0, want: o.visible ?? true, html: '' };
    items.set(key, it);
    const api = {
      set(html) { if (html !== it.html) { it.body.innerHTML = html; it.html = html; } return api; },
      show(v) { it.want = v; return api; },
      el,
    };
    if (o.html) api.set(o.html);
    return api;
  }

  // 避让：按锚点在屏幕上从下往上排，胶囊和已放好的重叠就把引线拉长、整块往上抬，
  // 目标抬高量阻尼过去，避免每帧跳。只用锚点投影 + 胶囊尺寸算，不读本帧布局，没有反馈抖动。
  const v = new stage.THREE.Vector3();
  const GAP = 4;
  const MAX_EXTRA = 180;
  function avoid(dt) {
    const live = [];
    for (const it of items.values()) {
      if (!it.obj.visible) continue;
      v.copy(it.obj.position).project(stage.camera);
      if (v.z > 1) continue;
      live.push({ it, x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, w: it.body.offsetWidth, h: it.body.offsetHeight });
    }
    live.sort((a, b) => b.y - a.y);
    const placed = [];
    for (const L of live) {
      // 胶囊横向收进画面（引线和圆点仍在锚点上）
      const dx = Math.min(0, innerWidth - 4 - (L.x + L.w / 2)) + Math.max(0, 4 - (L.x - L.w / 2));
      L.it.body.style.transform = dx ? `translateX(${dx.toFixed(0)}px)` : '';
      const x0 = L.x - L.w / 2 + dx;
      const x1 = L.x + L.w / 2 + dx;
      let bottom = L.y - L.it.lift;
      for (let moved = true, n = 0; moved && n < 20; n++) {
        moved = false;
        for (const P of placed) {
          if (x0 < P.x1 + GAP && x1 > P.x0 - GAP && bottom > P.top - GAP && bottom - L.h < P.bottom + GAP) { bottom = P.top - GAP; moved = true; }
        }
      }
      const target = Math.min(MAX_EXTRA, L.y - L.it.lift - bottom);
      L.it.extra = damp(L.it.extra, target, 8, dt);
      L.it.line.style.height = `${(L.it.lift + L.it.extra).toFixed(1)}px`;
      placed.push({ x0, x1, top: L.y - L.it.lift - target - L.h, bottom: L.y - L.it.lift - target });
    }
  }

  stage.onAfter(() => r.render(stage.scene, stage.camera));
  stage.onAfter(avoid);
  stage.onFrame((dt) => {
    for (const it of items.values()) {
      it.vis = damp(it.vis, it.want ? 1 : 0, 10, dt);
      it.obj.visible = it.vis > 0.02;
      if (!it.obj.visible) continue;
      it.obj.position.copy(it.anchor());
      it.el.style.opacity = it.vis.toFixed(3);
    }
  });
  return {
    add,
    get: (k) => items.get(k),
  };
}
