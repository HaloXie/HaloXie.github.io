// kit 舞台：渲染器、房间、灯光、实验台、主相机 + 轨道控制、后处理、帧循环、draw call 计数。
// 新 lab 只需 createStage({ bench }) 然后往 stage.bench / stage.scene 里加自己的东西。
// 坐标约定：实验台台面 y = 0；观众默认站在 -z 一侧看向 +z。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { paint, at, merge, prbox, glow, canvasTexture, rng } from './util.js';
import { createPost } from './post.js';
import { createViews } from './views.js';

export const THEME = {
  wall: 0x1b2640, wallLo: 0x121a2e, floor: 0x2a2f3a, trim: 0x0e1422,
  wood: 0x6b4a33, woodLo: 0x4a3322, steel: 0x3a4250, warm: 0xffb36b, cool: 0x3fe0ff,
};

// 把灯光 / 物体对所有图层可见（副相机用其他图层时也能被照亮）。
export function allLayers(o) {
  o.traverse((c) => c.layers.enableAll());
  return o;
}

function floorTexture() {
  const { tex } = canvasTexture(512, 512, (g, w) => {
    g.fillStyle = '#20252f';
    g.fillRect(0, 0, w, w);
    const r = rng(7);
    const n = 4;
    const s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 38 + Math.floor(r() * 8);
      g.fillStyle = `rgb(${v},${v + 4},${v + 12})`;
      g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

function buildRoom(scene, B) {
  const floorY = -B.h;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.35, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  floor.receiveShadow = true;
  scene.add(floor);

  const wall = [];
  const glows = [];
  const zBack = B.z1 + 5;
  const xL = B.x0 - 6;
  const xR = B.x1 + 6;
  const H = 12;
  // 背墙：竖向面板 + 暖色灯带
  const panelW = 2.4;
  for (let x = xL; x < xR; x += panelW) {
    wall.push(prbox(Math.floor((x - xL) / panelW) % 2 ? THEME.wall : THEME.wallLo, panelW - 0.06, H, 0.2, x + panelW / 2, floorY + H / 2, zBack, 0.05));
  }
  // 侧墙（观众右手边 = -x）
  for (let z = B.z0 - 8; z < zBack; z += panelW) {
    wall.push(prbox(THEME.wallLo, 0.2, H, panelW - 0.06, xL, floorY + H / 2, z + panelW / 2, 0.05));
  }
  wall.push(prbox(THEME.trim, xR - xL, 0.5, 0.4, (xL + xR) / 2, floorY + 0.25, zBack - 0.2, 0.08));
  glows.push(at(paint(new THREE.BoxGeometry(xR - xL, 0.07, 0.06), glow(THEME.warm, 2.6)), (xL + xR) / 2, floorY + 0.55, zBack - 0.42));
  glows.push(at(paint(new THREE.BoxGeometry(xR - xL, 0.06, 0.06), glow(THEME.warm, 2.2)), (xL + xR) / 2, floorY + 7.4, zBack - 0.12));
  for (const x of [xL + 3, (xL + xR) / 2, xR - 3]) glows.push(at(paint(new THREE.BoxGeometry(0.05, 6.8, 0.05), glow(THEME.cool, 0.9)), x, floorY + 4, zBack - 0.12));
  // 墙上的架子和低多边形植物，给背景一点层次
  const r = rng(3);
  for (const x of [xL + 5, xR - 6]) {
    wall.push(prbox(THEME.wood, 3.2, 0.12, 0.7, x, floorY + 4.2, zBack - 0.45, 0.04));
    for (let k = 0; k < 4; k++) wall.push(prbox([0xe0dcd2, 0xff8a2a, 0x3a4250, 0x7a9cc6][k], 0.36, 0.3 + r() * 0.5, 0.36, x - 1.1 + k * 0.72, floorY + 4.45 + r() * 0.1, zBack - 0.45, 0.06));
  }
  const pine = (x, z, h) => {
    [0x2f7a4a, 0x3b8f58, 0x4ea463].forEach((c, k) => wall.push(at(paint(new THREE.ConeGeometry(h * (0.3 - k * 0.07), h * 0.42, 7), c), x, floorY + h * (0.32 + k * 0.2), z, 0, k * 0.5)));
    wall.push(at(paint(new THREE.CylinderGeometry(h * 0.04, h * 0.05, h * 0.2, 6), 0x6b4a33), x, floorY + h * 0.1, z));
  };
  pine(xR - 2, zBack - 1.6, 4.2);
  pine(xR - 3.6, zBack - 2.4, 3.0);
  pine(xL + 1.6, B.z0 - 2, 3.4);

  const wm = new THREE.Mesh(merge(wall), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.1, flatShading: false }));
  wm.receiveShadow = true;
  scene.add(wm);
  scene.add(new THREE.Mesh(merge(glows), new THREE.MeshBasicMaterial({ vertexColors: true })));
}

function buildBench(scene, B) {
  const g = new THREE.Group();
  const top = [];
  const w = B.x1 - B.x0;
  const d = B.z1 - B.z0;
  const cx = (B.x0 + B.x1) / 2;
  const cz = (B.z0 + B.z1) / 2;
  top.push(prbox(THEME.wood, w, 0.22, d, cx, -0.11, cz, 0.06));
  // 前挡板（观众这侧）+ 金属柜体
  top.push(prbox(THEME.steel, w - 0.3, B.h - 0.5, d - 0.6, cx, -0.22 - (B.h - 0.5) / 2, cz + 0.1, 0.08));
  top.push(prbox(0x2a303b, w - 0.1, 0.34, 0.16, cx, -0.4, B.z0 + 0.02, 0.05));
  for (const x of [B.x0 + 0.4, B.x1 - 0.4]) top.push(prbox(0x262b35, 0.36, B.h - 0.2, 0.36, x, -B.h / 2 - 0.1, B.z0 + 0.4, 0.08));
  const m = new THREE.Mesh(merge(top), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 }));
  m.receiveShadow = true;
  m.castShadow = true;
  g.add(m);
  // 台沿发光条
  const strip = new THREE.Mesh(paint(new THREE.BoxGeometry(w - 0.4, 0.035, 0.03), glow(THEME.warm, 3)), new THREE.MeshBasicMaterial({ vertexColors: true }));
  strip.position.set(cx, -0.4, B.z0 - 0.07);
  g.add(strip);
  scene.add(g);
  return g;
}

export function createStage(opts = {}) {
  const B = { x0: -4, x1: 10, z0: -3, z1: 3, h: 2.2, ...(opts.bench || {}) };
  const wrap = opts.container || document.body;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.info.autoReset = false;
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1628);
  scene.fog = new THREE.Fog(0x0f1628, 22, 48);
  // 环境贴图：RoomEnvironment 是一间白房间，直接用会让金属 / 清漆面在暗色房间里反射成一片灰白。
  // three 0.160 还没有 scene.environmentIntensity，所以在烘焙前把房间里的发光体和点光源按 envIntensity 压暗。
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const kEnv = opts.envIntensity ?? 0.35;
  const seen = new Set(); // RoomEnvironment 里多个盒子共用一个材质，只压一次
  room.traverse((o) => {
    if (o.isLight) o.intensity *= kEnv;
    if (o.isMesh && o.material?.color && !seen.has(o.material)) { seen.add(o.material); o.material.color.multiplyScalar(kEnv); }
  });
  scene.environment = pmrem.fromScene(room, 0.04).texture;

  // 灯光：半球底光 + 暖主光（投影）+ 冷补光 + 背后暖轮廓光。全部对所有图层可见。
  const lights = {
    hemi: new THREE.HemisphereLight(0xcfe0ff, 0x3a2c22, 0.35),
    key: new THREE.DirectionalLight(0xffe2c4, 1.6),
    fill: new THREE.DirectionalLight(0x9fc8ff, 0.45),
    rim: new THREE.PointLight(0xff9a4a, 30, 18, 2),
  };
  const cxB = (B.x0 + B.x1) / 2;
  lights.key.position.set(cxB - 3, 11, -6);
  lights.key.target.position.set(cxB, 0, 0);
  lights.key.castShadow = true;
  lights.key.shadow.mapSize.set(2048, 2048);
  const hw = (B.x1 - B.x0) / 2 + 1;
  Object.assign(lights.key.shadow.camera, { left: -hw, right: hw, top: hw * 0.7, bottom: -hw * 0.7, near: 2, far: 30 });
  lights.key.shadow.bias = -0.0006;
  lights.key.shadow.normalBias = 0.03;
  lights.key.shadow.radius = 4;
  lights.fill.position.set(cxB + 8, 5, -4);
  lights.rim.position.set(cxB, 5, B.z1 + 2);
  for (const l of Object.values(lights)) { scene.add(l); allLayers(l); }
  scene.add(lights.key.target);

  buildRoom(scene, B);
  const bench = buildBench(scene, B);

  const camera = new THREE.PerspectiveCamera(opts.fov ?? 30, innerWidth / innerHeight, 0.1, 120);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 2;
  controls.maxDistance = 40;

  const post = createPost(renderer, scene, camera, opts.post);
  const views = createViews(camera, controls, renderer);

  const frameFns = [];
  const afterFns = [];
  const stats = { mainCalls: 0, extraCalls: 0, fps: 0 };
  const clock = new THREE.Clock();
  let shadowDirty = true;
  let fpsAcc = 0;
  let fpsN = 0;

  const stage = {
    THREE, renderer, scene, camera, controls, lights, bench, post, views, bounds: B, stats,
    onFrame(fn) { frameFns.push(fn); }, // 渲染前：更新状态
    onAfter(fn) { afterFns.push(fn); }, // 渲染后：标签层等依赖最终相机的东西
    markShadows() { shadowDirty = true; },
    // 副渲染（取景器等）走这个入口，draw call 单独计数，不算进主画面
    renderExtra(fn) {
      renderer.info.reset();
      fn(renderer);
      stats.extraCalls += renderer.info.render.calls;
    },
    start() {
      const loop = () => {
        const dt = Math.min(0.05, clock.getDelta());
        const now = clock.elapsedTime;
        stats.extraCalls = 0;
        for (const fn of frameFns) fn(dt, now);
        views.update(dt);
        controls.update();
        post.setStatic(views.isStill());
        renderer.info.reset();
        if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
        post.setFocus(views.focusDistance());
        post.render(dt);
        stats.mainCalls = renderer.info.render.calls;
        for (const fn of afterFns) fn(dt, now);
        fpsAcc += dt;
        fpsN++;
        if (fpsAcc > 1) { stats.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
  };

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    post.setSize(innerWidth, innerHeight);
    views.resize();
  });
  return stage;
}
