// 取景渲染：副相机只看布景图层，按物理累积出「这台相机拍到的画面」。
// 景深：每个样本在入瞳圆盘内偏移副相机，平移视锥让对焦平面上的画框不动（optics.shearedFrustum）。
// 运动模糊：每个样本在快门时间内取一个时刻，把风车转到那个角度、灯泡调到那个亮度。
// 累积：半精度浮点 render target 线性相加；显示时 ÷ 样本数 × 曝光增益，再统一做 ACES + sRGB。
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import * as O from './optics.js';
import { PHOTO_LAYER, AXIS } from './diorama.js';
import { rng } from '../kit/util.js';

export const VF_W = 600;
export const VF_H = 400; // 3:2，与 36×24mm 传感器同比例
export const SAMPLES = 64; // 收敛样本数
export const PREVIEW = 4; // 参数一变先出的快速预览
export const PER_FRAME = 8; // 之后每帧追加
const REFRESH_S = 1.2; // 收敛后每隔多久在后台重拍一张，让取景画面保持「活的」
const NEAR = 0.05;
const FAR = 30;
// 渲染器亮度标定：让 EV_设置 = EV_场景（增益 1）时人偶落在正常曝光。一次性标定常数，不是物理量。
// 2026-09-29 实测（f/2.8 · 1/30 · ISO 100，增益 1）：环境贴图压暗到 0.35 后人偶区域平均 sRGB 0.431；
// 目标 18% 灰 ≈ sRGB 0.46，按 0.46 / 0.431 取 1.07（改后未再截图复测）。
export const CAL = 1.07;

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const ADD_FRAG = 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.0); }';
const DISP_FRAG = /* glsl */ `
uniform sampler2D tAcc; uniform float count, gain, noise, seed, dark;
varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c){
  const mat3 IN = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 OUT = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  c *= 1.0 / 0.6; c = IN * c; c = RRTAndODTFit(c); c = OUT * c; return clamp(c, 0.0, 1.0);
}
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y); // 读回时第一行就是画面顶部
  vec3 lin = texture2D(tAcc, uv).rgb / max(count, 1.0) * gain;
  vec3 c = aces(lin);
  // ISO 噪点（示意）：三角分布，标准差 = noise，暗部更明显
  vec2 p = floor(gl_FragCoord.xy) + seed;
  float l = h(p) + h(p + 17.1) - 1.0;
  vec3 ch = vec3(h(p + 3.3) + h(p + 9.1) - 1.0, h(p + 5.7) + h(p + 1.9) - 1.0, h(p + 7.7) + h(p + 4.4) - 1.0);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += (ch * 0.4 + l * 0.6) * (noise * 2.45) * (1.3 - lum);
  c = clamp(c, 0.0, 1.0) * dark;
  c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  gl_FragColor = vec4(c, 1.0);
}`;

export function createViewfinder(stage, dio) {
  const { renderer, scene } = stage;
  const cam = new THREE.PerspectiveCamera();
  cam.layers.set(PHOTO_LAYER);
  cam.matrixAutoUpdate = false;
  cam.matrixWorldAutoUpdate = false;

  const hdr = () => new THREE.WebGLRenderTarget(VF_W, VF_H, { type: THREE.HalfFloatType, depthBuffer: false });
  const sampleRT = new THREE.WebGLRenderTarget(VF_W, VF_H, { type: THREE.HalfFloatType, depthBuffer: true });
  const acc = [hdr(), hdr(), hdr()]; // [显示中, 后台重拍, 拍照]
  const dispRT = new THREE.WebGLRenderTarget(VF_W, VF_H, { depthBuffer: false });
  const addQ = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { t: { value: sampleRT.texture } }, vertexShader: VERT, fragmentShader: ADD_FRAG,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  }));
  const dispMat = new THREE.ShaderMaterial({
    uniforms: { tAcc: { value: null }, count: { value: 1 }, gain: { value: 1 }, noise: { value: 0 }, seed: { value: 0 }, dark: { value: 1 } },
    vertexShader: VERT, fragmentShader: DISP_FRAG, depthTest: false, depthWrite: false,
  });
  const dispQ = new FullScreenQuad(dispMat);
  const pixels = new Uint8Array(VF_W * VF_H * 4);

  // 输出画布：HUD 取景窗、机身背屏（CanvasTexture）共用
  const canvas = document.createElement('canvas');
  canvas.width = VF_W;
  canvas.height = VF_H;
  const ctx2d = canvas.getContext('2d');
  const screenTex = new THREE.CanvasTexture(canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;

  // 样本序列：光圈圆盘用黄金角螺旋，时间用打乱的分层；两者用不同的排列解耦
  const R = rng(2024);
  const tPerm = [...Array(SAMPLES).keys()];
  for (let i = SAMPLES - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [tPerm[i], tPerm[j]] = [tPerm[j], tPerm[i]]; }
  const diskIdx = (k) => (k * 37) % SAMPLES; // 37 与 64 互质：前几个样本就铺满整个圆盘
  const Rv = new THREE.Vector3(0, 0, 1); // 相机右 = +z
  const Uv = new THREE.Vector3(0, 1, 0);
  const Bv = new THREE.Vector3(-1, 0, 0); // 相机背后 = -x（镜头朝 +x）

  function setSample(k, p) {
    const di = diskIdx(k);
    const r = Math.sqrt((di + 0.5) / SAMPLES) * p.lensR;
    const th = di * GOLDEN;
    const dx = r * Math.cos(th);
    const dy = r * Math.sin(th);
    const fr = O.shearedFrustum(dx, dy, NEAR);
    const jx = ((R() - 0.5) * (fr.right - fr.left)) / VF_W; // 亚像素抖动 = 抗锯齿
    const jy = ((R() - 0.5) * (fr.top - fr.bottom)) / VF_H;
    cam.projectionMatrix.makePerspective(fr.left + jx, fr.right + jx, fr.top + jy, fr.bottom + jy, NEAR, FAR);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.matrixWorld.makeBasis(Rv, Uv, Bv).setPosition(AXIS.x + Rv.x * dx, AXIS.y + dy, AXIS.z + Rv.z * dx);
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    // 快门时间内的某一刻（分层 + 抖动）
    return p.base + ((tPerm[k] + R()) / SAMPLES) * p.t;
  }

  function clear(rt) {
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
  }
  // 在 job 上追加 n 个样本
  function accumulate(job, n) {
    const tMain = dio.time;
    dio.photoMode(true);
    const end = Math.min(SAMPLES, job.n + n);
    stage.renderExtra(() => {
      // FullScreenQuad 走 renderer.render：autoClear 开着会先清掉累积缓冲，只剩最后一个样本
      const ac = renderer.autoClear;
      renderer.autoClear = false;
      for (let k = job.n; k < end; k++) {
        dio.setTime(setSample(k, job.p));
        renderer.setRenderTarget(sampleRT);
        renderer.setClearColor(0x000000, 1);
        renderer.clear();
        renderer.render(scene, cam);
        renderer.setRenderTarget(job.rt);
        addQ.render(renderer);
      }
      renderer.autoClear = ac;
      renderer.setRenderTarget(null);
    });
    samplesThisFrame += end - job.n;
    job.n = end;
    dio.photoMode(false);
    dio.setTime(tMain);
  }
  function newJob(rt, p) {
    clear(rt);
    renderer.setRenderTarget(null);
    return { rt, p, n: 0 };
  }
  // 累积结果 → ACES + sRGB → 读回到画布
  function develop(job, look, target) {
    dispMat.uniforms.tAcc.value = job.rt.texture;
    dispMat.uniforms.count.value = job.n;
    dispMat.uniforms.gain.value = look.gain * CAL;
    dispMat.uniforms.noise.value = look.noise;
    dispMat.uniforms.seed.value = Math.floor(R() * 1000);
    dispMat.uniforms.dark.value = look.dark ?? 1;
    stage.renderExtra(() => {
      renderer.setRenderTarget(dispRT);
      dispQ.render(renderer);
      renderer.readRenderTargetPixels(dispRT, 0, 0, VF_W, VF_H, pixels);
      renderer.setRenderTarget(null);
    });
    const img = new ImageData(new Uint8ClampedArray(pixels.buffer.slice(0)), VF_W, VF_H);
    target.getContext('2d').putImageData(img, 0, 0);
    // 测光读数（sRGB 0–1）：全画面平均、人偶所在区域平均。用来标定 CAL，也写进日志
    let sum = 0;
    let fig = 0;
    let nf = 0;
    for (let y = 0; y < VF_H; y += 4) {
      for (let x = 0; x < VF_W; x += 4) {
        const i = (y * VF_W + x) * 4;
        const l = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
        sum += l;
        if (x > VF_W * 0.58 && x < VF_W * 0.76 && y > VF_H * 0.3 && y < VF_H * 0.9) { fig += l; nf++; }
      }
    }
    info.meanAll = +(sum / ((VF_W / 4) * (VF_H / 4))).toFixed(3);
    info.meanFigure = +(fig / Math.max(1, nf)).toFixed(3);
  }

  let live = null; // 正在显示的累积
  let back = null; // 后台重拍
  let photo = null; // 拍照任务
  let key = '';
  let lookKey = '';
  let doneAt = 0;
  let samplesThisFrame = 0;
  const info = { samplesPerFrame: 0, liveSamples: 0, photoSamples: 0, total: 0 };

  const api = {
    canvas, screenTex, info,
    get converged() { return !!live && live.n >= SAMPLES; },
    // d = optics.derive(state)；now = 主时钟；dark = 取景画面是否黑屏（按下快门的瞬间）
    update(now, d, dark = 1) {
      samplesThisFrame = 0;
      const p = { lensR: d.lensR, t: d.t, base: now - d.t };
      const k = `${d.N}|${d.t}`;
      let changed = false;
      if (photo) {
        accumulate(photo, PER_FRAME * 2);
        if (photo.n >= SAMPLES) {
          const out = document.createElement('canvas');
          out.width = VF_W;
          out.height = VF_H;
          // 按下快门那一刻的增益和噪点冲洗，累积期间学习者再改 ISO 也不影响这张
          develop(photo, { gain: photo.gain, noise: photo.noise }, out);
          const cb = photo.cb;
          photo = null;
          lookKey = '';
          cb(out);
        }
      } else if (k !== key || !live) {
        key = k;
        back = null;
        live = newJob(acc[0], p);
        accumulate(live, PREVIEW);
        changed = true;
      } else if (live.n < SAMPLES) {
        accumulate(live, PER_FRAME);
        changed = true;
        if (live.n >= SAMPLES) doneAt = now;
      } else if (back) {
        accumulate(back, PER_FRAME);
        if (back.n >= SAMPLES) {
          [acc[0], acc[1]] = [acc[1], acc[0]];
          live = back;
          back = null;
          doneAt = now;
          changed = true;
        }
      } else if (now - doneAt > REFRESH_S) {
        back = newJob(acc[1], p);
        accumulate(back, PER_FRAME);
      }
      const lk = `${d.gain}|${d.noise}|${dark}`;
      if (changed || lk !== lookKey) {
        lookKey = lk;
        develop(live, { gain: d.gain, noise: d.noise, dark }, canvas);
        screenTex.needsUpdate = true;
      }
      info.samplesPerFrame = samplesThisFrame;
      info.liveSamples = live.n;
      info.total += samplesThisFrame;
      info.gain = +(d.gain * CAL).toFixed(3);
    },
    // 拍照：从 tStart 开始的曝光，累积完整 SAMPLES 个样本后回调一张画布
    shoot(tStart, d, cb) {
      photo = newJob(acc[2], { lensR: d.lensR, t: d.t, base: tStart });
      photo.gain = d.gain;
      photo.noise = d.noise;
      photo.cb = cb;
      info.photoSamples = SAMPLES;
    },
    get busy() { return !!photo; },
  };
  return api;
}
