// kit 后处理链：Render → GTAO（只在画面静止时开）→ Bokeh（主视角轻微景深，像拍微缩模型）→ Bloom → Output（ACES + sRGB）。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createPost(renderer, scene, camera, opts = {}) {
  const o = { gtao: true, bokeh: true, bloom: true, bloomStrength: 0.55, bloomThreshold: 0.92, ...opts };
  const w = innerWidth;
  const h = innerHeight;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  let gtao = null;
  if (o.gtao) {
    gtao = new GTAOPass(scene, camera, w, h);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    gtao.enabled = false;
    composer.addPass(gtao);
  }
  let bokeh = null;
  if (o.bokeh) {
    bokeh = new BokehPass(scene, camera, { focus: 10, aperture: 0.0006, maxblur: 0.006 });
    composer.addPass(bokeh);
  }
  let bloom = null;
  if (o.bloom) {
    bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), o.bloomStrength, 0.5, o.bloomThreshold);
    composer.addPass(bloom);
  }
  composer.addPass(new OutputPass());

  // 带 userData.noDepth 的物体（半透明叠加层、贴花）不进 AO / 景深的深度通道：
  // 它们不该产生遮蔽，也不该改变景深焦点；每个这样的物体省 2 次 draw call。
  const skipNoDepth = (pass) => {
    if (!pass) return;
    const render = pass.render.bind(pass);
    pass.render = (...args) => {
      const hidden = [];
      scene.traverseVisible((o) => { if (o.userData.noDepth) hidden.push(o); });
      for (const o of hidden) o.visible = false;
      render(...args);
      for (const o of hidden) o.visible = true;
    };
  };
  skipNoDepth(gtao);
  skipNoDepth(bokeh);

  let stillT = 0;
  return {
    composer, gtao, bokeh, bloom,
    // 景深焦点：主相机到 target 的距离（world 单位）
    setFocus(dist, aperture) {
      if (!bokeh) return;
      bokeh.uniforms.focus.value = dist;
      if (aperture !== undefined) bokeh.uniforms.aperture.value = aperture;
    },
    setStatic(still) {
      stillT = still ? stillT + 1 : 0;
      if (gtao) gtao.enabled = stillT > 6;
    },
    render(dt) { composer.render(dt); },
    setSize(W, H) { composer.setSize(W, H); },
  };
}
