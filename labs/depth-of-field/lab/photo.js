// 模拟照片：副相机放在镜头前端，拍台面上真实的 3D 场景（教学叠加层隐藏）。
// 景深：每个样本把副相机在入瞳圆盘里挪一下，并平移视锥让对焦面上的画框不动；样本累加取平均。
// 入瞳半径取 optics 的有效值 (f/N)·s/(s−f)，于是距离 d 处一点在照片上糊成的圆，直径恰好是 optics.blurMm(f, N, s, d)：
//   传感器上的偏移 = f·r·|1/d − 1/s|，r 取遍圆盘 → 直径 = f·(f/N)·|d−s| / (d·(s−f))，与数字卡同一个模型。
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { SENSOR_W_MM, SENSOR_H_MM } from './optics.js';
import { CAM_X, AXIS_Y, RAIL_Z, U, DIR } from './scene.js';

export const PHOTO_W = 480;
export const PHOTO_H = 320; // 3:2，与 36×24mm 传感器同比例
const SAMPLES = 48;
const PER_FRAME = 8;
const NEAR = 0.04;
const FAR = 40;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const ADD_FRAG = 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.0); }';
// 平均 → 曝光 → ACES（Narkowicz 拟合）→ sRGB；上下翻转，读回时第一行就是画面顶部
const DISP_FRAG = `uniform sampler2D tAcc; uniform float count, gain; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tAcc, vec2(vUv.x, 1.0 - vUv.y)).rgb / max(count, 1.0) * gain;
  c = clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
  c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  gl_FragColor = vec4(c, 1.0);
}`;

// hide：拍照时要隐藏的叠加层（清晰范围板、视野线）
export function createPhoto(stage, hide) {
  const { renderer, scene } = stage;
  const cam = new THREE.PerspectiveCamera();
  cam.matrixAutoUpdate = false;
  cam.matrixWorldAutoUpdate = false;
  const sampleRT = new THREE.WebGLRenderTarget(PHOTO_W, PHOTO_H, { type: THREE.HalfFloatType, depthBuffer: true });
  const accRT = new THREE.WebGLRenderTarget(PHOTO_W, PHOTO_H, { type: THREE.HalfFloatType, depthBuffer: false });
  const dispRT = new THREE.WebGLRenderTarget(PHOTO_W, PHOTO_H, { depthBuffer: false });
  const addQ = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { t: { value: sampleRT.texture } }, vertexShader: VERT, fragmentShader: ADD_FRAG,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  }));
  const dispMat = new THREE.ShaderMaterial({ uniforms: { tAcc: { value: accRT.texture }, count: { value: 1 }, gain: { value: 1 } }, vertexShader: VERT, fragmentShader: DISP_FRAG, depthTest: false, depthWrite: false });
  const dispQ = new FullScreenQuad(dispMat);
  const pixels = new Uint8Array(PHOTO_W * PHOTO_H * 4);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(PHOTO_W, PHOTO_H);
  const black = new THREE.Color(0, 0, 0);
  // 副相机朝 DIR·x 看：右手边 = (0, 0, DIR)，背后 = (−DIR, 0, 0)
  const Rv = new THREE.Vector3(0, 0, DIR);
  const Uv = new THREE.Vector3(0, 1, 0);
  const Bv = new THREE.Vector3(-DIR, 0, 0);
  let job = null;
  let n = 0;

  function setSample(k) {
    const r = Math.sqrt((k + 0.5) / SAMPLES) * job.lensR;
    const th = k * GOLDEN;
    const dx = r * Math.cos(th);
    const dy = r * Math.sin(th);
    // 视锥平移：对焦面（距离 s）上的画框固定，近裁面上的窗口随之错开
    const tw = SENSOR_W_MM / 2 / job.f;
    const thh = SENSOR_H_MM / 2 / job.f;
    const sx = dx / job.s;
    const sy = dy / job.s;
    cam.projectionMatrix.makePerspective(NEAR * (-tw - sx), NEAR * (tw - sx), NEAR * (thh - sy), NEAR * (-thh - sy), NEAR, FAR);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.matrixWorld.makeBasis(Rv, Uv, Bv).setPosition(CAM_X + Rv.x * dx, AXIS_Y + dy, RAIL_Z + Rv.z * dx);
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  }

  function step() {
    const end = Math.min(SAMPLES, n + PER_FRAME);
    const vis = hide.map((o) => o.visible);
    hide.forEach((o) => { o.visible = false; });
    stage.renderExtra(() => {
      const ac = renderer.autoClear;
      renderer.autoClear = false; // 累积缓冲不能被 FullScreenQuad 的 render 清掉
      if (n === 0) {
        renderer.setRenderTarget(accRT);
        renderer.setClearColor(black, 1);
        renderer.clear(true, false, false);
      }
      for (let k = n; k < end; k++) {
        setSample(k);
        renderer.setRenderTarget(sampleRT);
        renderer.setClearColor(black, 1);
        renderer.clear();
        renderer.render(scene, cam);
        renderer.setRenderTarget(accRT);
        addQ.render(renderer);
      }
      dispMat.uniforms.count.value = end;
      dispMat.uniforms.gain.value = renderer.toneMappingExposure;
      renderer.setRenderTarget(dispRT);
      dispQ.render(renderer);
      renderer.readRenderTargetPixels(dispRT, 0, 0, PHOTO_W, PHOTO_H, pixels);
      renderer.setRenderTarget(null);
      renderer.autoClear = ac;
    });
    hide.forEach((o, i) => { o.visible = vis[i]; });
    img.data.set(pixels);
    ctx.putImageData(img, 0, 0);
    n = end;
  }

  return {
    canvas,
    get done() { return n >= SAMPLES; },
    // d = optics.derive(st)：参数一变就从头累积
    shoot(d) {
      const fM = d.f / 1000;
      job = { f: d.f, s: d.sM * U, lensR: 0.5 * (d.pupilMm / 1000) * U * (d.sM / (d.sM - fM)) };
      n = 0;
    },
    update() { if (job && n < SAMPLES) step(); },
  };
}
