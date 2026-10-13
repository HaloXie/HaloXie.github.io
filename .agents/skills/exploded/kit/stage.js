// kit 舞台：渲染器、房间、灯光、实验台、主相机 + 轨道控制、后处理、帧循环、draw call 计数。
// 新 lab 只需 createStage({ bench }) 然后往 stage.bench / stage.scene 里加自己的东西。
// 坐标约定：实验台台面 y = 0；观众默认站在 -z 一侧看向 +z。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { paint, at, merge, prbox, glow, canvasTexture, rng } from './util.js';
import { createPost } from './post.js';
import { createViews } from './views.js';
import { readTheme, onThemeChange } from './theme.js';
import { DECOR } from './palette.js';

// 把灯光 / 物体对所有图层可见（副相机用其他图层时也能被照亮）。
export function allLayers(o) {
  o.traverse((c) => c.layers.enableAll());
  return o;
}

// 地砖：缝 = floor token 压暗，砖面在 floor 上下轻微抖动亮度。
function floorTexture(T) {
  const shade = (k) => `#${T.floor.clone().multiplyScalar(k).getHexString()}`;
  const { tex } = canvasTexture(512, 512, (g, w) => {
    g.fillStyle = shade(0.8);
    g.fillRect(0, 0, w, w);
    const r = rng(7);
    const n = 4;
    const s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = shade(0.92 + r() * 0.16);
      g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

// 房间（地面、墙、灯带、陈设）：颜色全部来自主题 T，换主题时整组重建。
function buildRoom(T, B) {
  const room = new THREE.Group();
  const floorY = -B.h;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: floorTexture(T), roughness: 0.35, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  floor.receiveShadow = true;
  room.add(floor);

  const wall = [];
  const glows = [];
  const zBack = B.z1 + 5;
  const xL = B.x0 - 6;
  const xR = B.x1 + 6;
  const H = 12;
  // 背墙：竖向面板 + 暖色灯带
  const panelW = 2.4;
  for (let x = xL; x < xR; x += panelW) {
    wall.push(prbox(Math.floor((x - xL) / panelW) % 2 ? T.wall : T.wallLo, panelW - 0.06, H, 0.2, x + panelW / 2, floorY + H / 2, zBack, 0.05));
  }
  // 侧墙（观众右手边 = -x）
  for (let z = B.z0 - 8; z < zBack; z += panelW) {
    wall.push(prbox(T.wallLo, 0.2, H, panelW - 0.06, xL, floorY + H / 2, z + panelW / 2, 0.05));
  }
  wall.push(prbox(T.trim, xR - xL, 0.5, 0.4, (xL + xR) / 2, floorY + 0.25, zBack - 0.2, 0.08));
  // 灯带亮度 = 基准倍数 × lamp-glow token（dark 下进 bloom，light 下只是一条亮色灯管）
  const k = T.lampGlow;
  glows.push(at(paint(new THREE.BoxGeometry(xR - xL, 0.07, 0.06), glow(T.lampWarm, 2.6 * k)), (xL + xR) / 2, floorY + 0.55, zBack - 0.42));
  glows.push(at(paint(new THREE.BoxGeometry(xR - xL, 0.06, 0.06), glow(T.lampWarm, 2.2 * k)), (xL + xR) / 2, floorY + 7.4, zBack - 0.12));
  for (const x of [xL + 3, (xL + xR) / 2, xR - 3]) glows.push(at(paint(new THREE.BoxGeometry(0.05, 6.8, 0.05), glow(T.lampCool, 0.9 * k)), x, floorY + 4, zBack - 0.12));
  // 墙上的架子和低多边形植物，给背景一点层次
  const r = rng(3);
  for (const x of [xL + 5, xR - 6]) {
    wall.push(prbox(T.wood, 3.2, 0.12, 0.7, x, floorY + 4.2, zBack - 0.45, 0.04));
    for (let i = 0; i < 4; i++) wall.push(prbox(DECOR.shelf[i], 0.36, 0.3 + r() * 0.5, 0.36, x - 1.1 + i * 0.72, floorY + 4.45 + r() * 0.1, zBack - 0.45, 0.06));
  }
  const pine = (x, z, h) => {
    DECOR.pine.forEach((c, i) => wall.push(at(paint(new THREE.ConeGeometry(h * (0.3 - i * 0.07), h * 0.42, 7), c), x, floorY + h * (0.32 + i * 0.2), z, 0, i * 0.5)));
    wall.push(at(paint(new THREE.CylinderGeometry(h * 0.04, h * 0.05, h * 0.2, 6), DECOR.trunk), x, floorY + h * 0.1, z));
  };
  pine(xR - 2, zBack - 1.6, 4.2);
  pine(xR - 3.6, zBack - 2.4, 3.0);
  pine(xL + 1.6, B.z0 - 2, 3.4);

  const wm = new THREE.Mesh(merge(wall), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.1, flatShading: false }));
  wm.receiveShadow = true;
  room.add(wm);
  const lamps = new THREE.Mesh(merge(glows), new THREE.MeshBasicMaterial({ vertexColors: true }));
  lamps.name = 'lamps';
  room.add(lamps);
  return room;
}

// 实验台本体（台面、柜体、台沿灯条），换主题时整组重建；lab 自己的东西挂在 stage.bench 上，不受影响。
function buildBenchBody(T, B) {
  const g = new THREE.Group();
  const top = [];
  const w = B.x1 - B.x0;
  const d = B.z1 - B.z0;
  const cx = (B.x0 + B.x1) / 2;
  const cz = (B.z0 + B.z1) / 2;
  top.push(prbox(T.wood, w, 0.22, d, cx, -0.11, cz, 0.06));
  // 前挡板（观众这侧）+ 金属柜体
  top.push(prbox(T.steel, w - 0.3, B.h - 0.5, d - 0.6, cx, -0.22 - (B.h - 0.5) / 2, cz + 0.1, 0.08));
  top.push(prbox(T.steelLo, w - 0.1, 0.34, 0.16, cx, -0.4, B.z0 + 0.02, 0.05));
  for (const x of [B.x0 + 0.4, B.x1 - 0.4]) top.push(prbox(T.steelLo, 0.36, B.h - 0.2, 0.36, x, -B.h / 2 - 0.1, B.z0 + 0.4, 0.08));
  const m = new THREE.Mesh(merge(top), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 }));
  m.receiveShadow = true;
  m.castShadow = true;
  g.add(m);
  // 台沿发光条
  const strip = new THREE.Mesh(paint(new THREE.BoxGeometry(w - 0.4, 0.035, 0.03), glow(T.lampWarm, 3 * T.lampGlow)), new THREE.MeshBasicMaterial({ vertexColors: true }));
  strip.position.set(cx, -0.4, B.z0 - 0.07);
  g.add(strip);
  return g;
}

function dispose(o) {
  o.traverse((c) => {
    c.geometry?.dispose();
    c.material?.map?.dispose();
    c.material?.dispose();
  });
}

export function createStage(opts = {}) {
  const B = { x0: -4, x1: 10, z0: -3, z1: 3, h: 2.2, ...(opts.bench || {}) };
  const wrap = opts.container || document.body;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.info.autoReset = false;
  wrap.appendChild(renderer.domElement);
  // 嵌入模式：给一个去掉 embed 参数的「全屏打开」链接，新窗口打开，不把读者从文章里带走
  if (document.documentElement.hasAttribute('data-exploded-embed')) {
    const full = new URL(location.href);
    full.searchParams.delete('embed');
    const a = Object.assign(document.createElement('a'), { className: 'kit-open', href: full.href, target: '_blank', rel: 'noopener', textContent: '全屏打开 ↗' });
    wrap.appendChild(a);
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog();
  // 环境贴图：RoomEnvironment 是一间白房间，直接用会让金属 / 清漆面在暗色房间里反射成一片灰白。
  // three 0.160 还没有 scene.environmentIntensity，所以在烘焙前把房间里的发光体和点光源按 env token 压暗。
  const pmrem = new THREE.PMREMGenerator(renderer);
  const bakeEnv = (kEnv) => {
    const envRoom = new RoomEnvironment();
    const seen = new Set(); // RoomEnvironment 里多个盒子共用一个材质，只压一次
    envRoom.traverse((o) => {
      if (o.isLight) o.intensity *= kEnv;
      if (o.isMesh && o.material?.color && !seen.has(o.material)) { seen.add(o.material); o.material.color.multiplyScalar(kEnv); }
    });
    scene.environment?.dispose();
    scene.environment = pmrem.fromScene(envRoom, 0.04).texture;
    dispose(envRoom);
  };

  // 灯光：半球底光 + 暖主光（投影）+ 冷补光 + 背后暖轮廓光。颜色和强度来自主题；全部对所有图层可见。
  const lights = {
    hemi: new THREE.HemisphereLight(),
    key: new THREE.DirectionalLight(),
    fill: new THREE.DirectionalLight(),
    rim: new THREE.PointLight(undefined, 1, 18, 2),
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

  const bench = new THREE.Group();
  scene.add(bench);
  let room = null;
  let benchBody = null;
  let theme = null;
  let lampsOn = true;

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
  const themeFns = [];
  // 审计脚本从 window.__exploded 读 draw call 与当前明暗
  const stats = { mainCalls: 0, extraCalls: 0, fps: 0, scheme: '' };
  window.__exploded = stats;
  const clock = new THREE.Clock();
  let shadowDirty = true;
  let fpsAcc = 0;
  let fpsN = 0;

  // 把主题落到场景：背景、雾、曝光、环境光、四盏灯、bloom，房间和台子按新颜色重建。
  const applyTheme = (T) => {
    theme = T;
    stats.scheme = T.scheme;
    scene.background = T.bg;
    scene.fog.color.copy(T.bg);
    scene.fog.near = T.fogNear;
    scene.fog.far = T.fogFar;
    renderer.toneMappingExposure = T.exposure;
    bakeEnv(T.env);
    lights.hemi.color.copy(T.hemiSky);
    lights.hemi.groundColor.copy(T.hemiGround);
    lights.hemi.intensity = T.hemi;
    lights.key.color.copy(T.keyColor);
    lights.key.intensity = T.key;
    lights.fill.color.copy(T.fillColor);
    lights.fill.intensity = T.fill;
    lights.rim.color.copy(T.rimColor);
    lights.rim.intensity = T.rim;
    post.setBloom(T.bloom, T.bloomThreshold);
    if (room) { scene.remove(room); dispose(room); }
    if (benchBody) { bench.remove(benchBody); dispose(benchBody); }
    room = buildRoom(T, B);
    benchBody = buildBenchBody(T, B);
    room.getObjectByName('lamps').visible = lampsOn;
    scene.add(room);
    bench.add(benchBody);
    shadowDirty = true;
    for (const fn of themeFns) fn(T);
  };
  applyTheme(readTheme());
  onThemeChange(applyTheme);

  const stage = {
    THREE, renderer, scene, camera, controls, lights, bench, post, views, bounds: B, stats,
    get theme() { return theme; },
    onTheme(fn) { themeFns.push(fn); }, // 明暗或 token 变化后：lab 刷新自己随主题变的东西
    onFrame(fn) { frameFns.push(fn); }, // 渲染前：更新状态
    onAfter(fn) { afterFns.push(fn); }, // 渲染后：标签层等依赖最终相机的东西
    markShadows() { shadowDirty = true; },
    // 墙上灯带开关：正对背墙的平视机位里灯带会穿过主体，lab 在这类机位关掉
    setLamps(on) { lampsOn = on; room.getObjectByName('lamps').visible = on; },
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
