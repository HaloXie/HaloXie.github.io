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
    const it = { el, obj, body: el.firstChild, anchor: o.anchor, vis: 0, want: o.visible ?? true, html: '' };
    items.set(key, it);
    const api = {
      set(html) { if (html !== it.html) { it.body.innerHTML = html; it.html = html; } return api; },
      show(v) { it.want = v; return api; },
      el,
    };
    if (o.html) api.set(o.html);
    return api;
  }

  stage.onAfter(() => r.render(stage.scene, stage.camera));
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
