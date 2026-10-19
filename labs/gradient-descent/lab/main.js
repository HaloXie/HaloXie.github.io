// 本课入口：梯度下降为什么会卡住，学习率怎么选。
// 唯一状态 st（学习率挡位、动量、起点、模型状态 s）→ 小球 / 轨迹 / 下一步箭头 / 读数 / 曲线 / 叙述，全部从它派生。
import * as THREE from 'three';
import { createStage } from '../../exploded/kit/stage.js';
import { createPicker, knob, pushButton, gauge } from '../../exploded/kit/controls3d.js';
import { createLabels } from '../../exploded/kit/labels.js';
import { statCards } from '../../exploded/kit/hud.js';
import { seg, mountButton } from '../../shared/antd-controls.mjs';
import { $, paint, at, merge, glow, canvasTexture } from '../../exploded/kit/util.js';
import { color } from '../../exploded/kit/theme.js';
import { ORANGE, CYAN, GREEN, RED } from '../../exploded/kit/palette.js';
import * as M from './model.js';
import { buildTerrain, toWorld, toModel } from './terrain.js';
import { MODEL } from './palette.js';
import { MARKUP } from './markup.js';

$('app').innerHTML = MARKUP;

addEventListener('error', (e) => console.error('[error]', e.error?.stack ?? e.message));

// ---------- 状态（URL 参数 lr / x / y / m / view / steps 直接进入指定状态） ----------
const q = new URLSearchParams(location.search);
const VIEWS = ['overview', 'top', 'side'];
const STARTS = [{ name: '右上', x: 2.5, y: 2.5 }, { name: '左下', x: -2.5, y: -2.5 }, { name: '正下', x: 0, y: -3 }];
const num = (k, d) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Math.max(-M.RANGE, Math.min(M.RANGE, Number(q.get(k)))) : d);
const lrIdx = q.has('lr') ? M.LRS.reduce((b, v, i) => (Math.abs(v - Number(q.get('lr'))) < Math.abs(M.LRS[b] - Number(q.get('lr'))) ? i : b), 0) : M.DEFAULTS.lr;
const st = {
  lr: lrIdx,
  momentum: q.get('m') === '1',
  x0: num('x', M.DEFAULTS.x),
  y0: num('y', M.DEFAULTS.y),
  view: VIEWS.includes(q.get('view')) ? q.get('view') : 'overview',
  running: false,
  predicted: null,
};
st.s = M.start(st.x0, st.y0);
const lr = () => M.LRS[st.lr];

// ---------- 舞台 ----------
const stage = createStage({
  container: $('stage'),
  bench: { x0: -4.4, x1: 4.4, z0: -3.4, z1: 3.6, h: 2.2 },
  post: q.get('post') === '0' ? { gtao: false, bokeh: false, bloom: false } : {},
});
const { scene, camera, renderer } = stage;
const terrain = buildTerrain(scene);

// 两个坑的标记针：灰杆 + 发光针头（一个 mesh）
const pinTop = (m) => toWorld(m.x, m.y).add(new THREE.Vector3(0, 0.34, 0));
{
  const parts = [];
  for (const [m, c] of [[M.GLOBAL_MIN, GREEN], [M.LOCAL_MIN, ORANGE]]) {
    const p = toWorld(m.x, m.y);
    parts.push(at(paint(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), MODEL.pin), p.x, p.y + 0.15, p.z));
    parts.push(at(paint(new THREE.SphereGeometry(0.04, 16, 12), glow(c, 2)), p.x, p.y + 0.31, p.z));
  }
  scene.add(new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3 })));
}

// 小球、轨迹（每步一段弦）、落点小圆点、下一步箭头
const BALL_R = 0.1;
const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 20), new THREE.MeshPhysicalMaterial({ color: MODEL.ball, metalness: 0.85, roughness: 0.18, clearcoat: 1 }));
ball.castShadow = true;
scene.add(ball);
const MAX = 400;
const trailPos = new Float32Array(MAX * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: glow(CYAN, 1.6) }));
trail.frustumCulled = false;
scene.add(trail);
const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.032, 10, 8), new THREE.MeshStandardMaterial({ color: MODEL.dot, emissive: CYAN, emissiveIntensity: 0.5 }), MAX);
dots.count = 0;
dots.frustumCulled = false;
scene.add(dots);
const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, MODEL.dot, 0.12, 0.07);
arrow.line.material.color.copy(glow(ORANGE, 2));
arrow.cone.material.color.copy(glow(ORANGE, 2));
scene.add(arrow);

const lift = (v) => v.setY(v.y + BALL_R); // 球心在曲面上方一个半径
const ballFrom = lift(toWorld(st.x0, st.y0));
let moveProgress = 1;
const mtx = new THREE.Matrix4();
function syncPath() {
  // 轨迹只画模型状态里还保留的位置：起点 + 每一步
  const pts = pathPts;
  for (let i = 0; i < pts.length; i++) {
    toWorld(pts[i][0], pts[i][1], undefined, tmp).toArray(trailPos, i * 3);
    trailPos[i * 3 + 1] += 0.02;
    mtx.makeTranslation(tmp.x, tmp.y + 0.02, tmp.z);
    dots.setMatrixAt(i, mtx);
  }
  trailGeo.setDrawRange(0, pts.length);
  trailGeo.attributes.position.needsUpdate = true;
  dots.count = pts.length;
  dots.instanceMatrix.needsUpdate = true;
}
const tmp = new THREE.Vector3();
let pathPts = [[st.x0, st.y0]];

// ---------- 台面控件 ----------
const picker = createPicker(stage);
const CZ = -2.55;
const kLr = knob(stage, picker, { position: new THREE.Vector3(2.1, 0.06, CZ), labels: M.LRS.map((v) => String(v).replace(/^0/, '')), title: 'LEARNING RATE', tone: ORANGE, value: st.lr, onStep: (i) => setLr(i) });
const bStep = pushButton(stage, picker, { position: new THREE.Vector3(0.95, 0.06, CZ), color: CYAN, onPress: () => doStep(true) });
const bPlay = pushButton(stage, picker, { position: new THREE.Vector3(0.25, 0.06, CZ), color: GREEN, onPress: () => togglePlay() });
const bReset = pushButton(stage, picker, { position: new THREE.Vector3(-0.45, 0.06, CZ), color: RED, onPress: () => reset() });
// loss 表：表盘范围 ±3 映射到 loss −0.95 … 1.75（全局最低在左端，起点附近在右半）
const toG = (l) => (l - 0.4) / 0.45;
const meter = gauge(stage, { position: new THREE.Vector3(-1.75, 0.06, CZ), r: 0.38, range: 3, title: 'LOSS', ticks: [{ v: toG(-0.9), label: '-0.9' }, { v: toG(0.4), label: '0.4' }, { v: toG(1.6), label: '1.6' }],
  // 绿 = 到了全局最低的坑底（局部极小 -0.47 不在里面），橙 = 比起点还高、在发散
  zones: [[-3, toG(-0.8), 'ok'], [toG(-0.8), toG(1.6), 'low'], [toG(1.6), 3, 'high']] });

// 按钮下方的印字：随主题重画（台面颜色会变）
const caption = canvasTexture(512, 64);
const capMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.25), new THREE.MeshBasicMaterial({ map: caption.tex, transparent: true, depthWrite: false }));
capMesh.rotation.set(-Math.PI / 2, 0, Math.PI);
capMesh.position.set(0.25, 0.012, CZ - 0.5);
capMesh.userData.noDepth = true;
stage.bench.add(capMesh);
function drawCaption() {
  const c = caption.ctx;
  c.clearRect(0, 0, 512, 64);
  c.font = `800 30px ${getComputedStyle(document.documentElement).getPropertyValue('--exploded-font')}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = `#${color('text').getHexString()}`;
  // 平面绕 y 转了 180°：画布从左到右 = 世界 +x 到 −x = 观众的左到右
  [['单步', 0.15], ['播放', 0.5], ['重置', 0.85]].forEach(([t, u]) => c.fillText(t, u * 512, 34));
  caption.tex.needsUpdate = true;
}
drawCaption();
stage.onTheme(drawCaption);

// ---------- 标签 ----------
const labels = createLabels(stage, $('app'));
const L = {
  global: labels.add('global', { anchor: () => pinTop(M.GLOBAL_MIN), tone: 'g', lift: 26, html: `全局最低 · loss <b>${M.GLOBAL_MIN.loss.toFixed(3)}</b>` }),
  local: labels.add('local', { anchor: () => pinTop(M.LOCAL_MIN), tone: 'o', lift: 26, html: `局部极小 · loss <b>${M.LOCAL_MIN.loss.toFixed(3)}</b>` }),
  ball: labels.add('ball', { anchor: () => ball.position.clone().add(new THREE.Vector3(0, BALL_R, 0)), tone: 'c', lift: 58 }),
};

// ---------- 机位 ----------
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const tb = terrain.box;
stage.views.define('overview', { dir: V3(-0.32, 0.78, -1), box: tb.clone().expandByPoint(V3(2.6, 0, CZ - 0.6)).expandByPoint(V3(-2.3, 0, CZ - 0.6)), fill: 0.84 });
stage.views.define('top', { dir: V3(0, 1, -0.05), box: tb.clone(), fill: 0.72 });
stage.views.define('side', { dir: V3(1, 0.42, -0.5), box: tb.clone(), fill: 0.7 });

// ---------- HUD ----------
const setStat = statCards($('stats'), [
  { key: 'loss', label: 'LOSS', tone: 'c' }, { key: 'step', label: '步数', tone: 'w' },
  { key: 'g', label: '梯度模长', tone: 'o' }, { key: 'jump', label: '下一步跳', tone: 'y' },
]);
const segLr = seg($('seg-lr'), M.LRS.map((v) => ({ label: String(v).replace(/^0/, ''), title: `学习率 ${v}` })), (i) => setLr(i));
const segM = seg($('seg-m'), [{ label: '关' }, { label: '开 · β=0.85', title: '速度 = 0.85 × 上一步速度 − 学习率 × 梯度' }], (i) => { st.momentum = i === 1; reset(); });
const segS = seg($('seg-start'), STARTS.map((p) => ({ label: p.name, title: `(${p.x}, ${p.y})` })), (i) => { st.x0 = STARTS[i].x; st.y0 = STARTS[i].y; reset(); });
const segV = seg($('seg-view'), [{ label: '总览' }, { label: '俯视' }, { label: '侧视' }], (i) => { st.view = VIEWS[i]; stage.views.go(st.view); refresh(); });
mountButton($('btn-step'), () => doStep(true));
const playControl = mountButton($('btn-play'), () => togglePlay());
mountButton($('btn-reset'), () => reset());
const opts = [...document.querySelectorAll('#predict .opt')];
const predictionControls = opts.map((b) => mountButton(b, () => {
  if (st.s.step > 0) return; // 开跑后锁定预测
  st.predicted = b.dataset.choice;
  refresh();
}));

// ---------- 动作 ----------
function setLr(i) {
  if (st.lr === i) return;
  st.lr = i;
  refresh();
}
function reset() {
  st.s = M.start(st.x0, st.y0);
  st.running = false;
  ball.position.copy(lift(toWorld(st.x0, st.y0)));
  moveProgress = 1;
  pathPts = [[st.x0, st.y0]];
  bReset.kick();
  refresh();
}
function doStep(manual) {
  if (st.s.outcome) return;
  if (manual) { st.running = false; bStep.kick(); }
  ballFrom.copy(ball.position);
  moveProgress = 0;
  st.s = M.step(st.s, lr(), st.momentum);
  pathPts.push([Math.max(-M.OUT, Math.min(M.OUT, st.s.x)), Math.max(-M.OUT, Math.min(M.OUT, st.s.y))]);
  if (pathPts.length > MAX) pathPts.shift();
  if (st.s.outcome) st.running = false;
  refresh();
}
function togglePlay() {
  if (st.s.outcome) reset();
  st.running = !st.running;
  bPlay.kick();
  refresh();
}

// ---------- 叙述（只从状态派生） ----------
const n = (v, tone) => `<b class="num tone-${tone}">${v}</b>`;
const LABEL = { global: '全局最低点', local: '局部极小值', diverge: '发散 / 不收敛', oscillate: '震荡未收敛', slow: '还没走到底' };
const SHORT = { global: '全局最低', local: '局部极小', diverge: '超出范围', oscillate: '震荡', slow: '太慢' };
function narrate() {
  const s = st.s;
  const l = s.history.at(-1);
  const prev = s.history.at(-2) ?? l;
  const g = Math.hypot(...M.grad(s.x, s.y));
  const r = lr().toFixed(2);
  const pos = `(${s.x.toFixed(2)}, ${s.y.toFixed(2)})`;
  if (s.step === 0) return { tag: ['未开始', 'w'], html: `学习率 ${n(r, 'y')}${st.momentum ? '，带动量' : ''}，起点 ${pos}，loss = ${n(l.toFixed(3), 'c')}。先在左下选一个预测，再按播放或单步。橙色箭头是下一步要跳的位置。` };
  if (s.outcome === 'diverge') return { tag: ['超出范围', 'r'], html: `第 ${s.step} 步坐标超出演示范围（约 ${pos}），停止演示。请减小学习率后重置。` };
  if (s.outcome === 'oscillate') return { tag: ['震荡未收敛', 'r'], html: `第 ${s.step} 步仍未收敛：最近几步 loss ${Math.max(...s.history.slice(-8)) - Math.min(...s.history.slice(-8)) < 0.0008 ? '几乎相同，但等高不等于同一点' : '仍在变化'}。本步参数移动 ${n(Math.hypot(s.vx, s.vy).toFixed(3), 'y')}，梯度仍有 ${n(g.toFixed(4), 'o')}。离散更新会跨过坑底；这不是重力滚球。` };
  if (s.outcome === 'slow') return { tag: ['太慢', 'y'], html: `学习率 ${n(r, 'y')} 太小，走了 ${s.step} 步 loss 还在一点点降（${n(l.toFixed(4), 'c')}），梯度 ${n(g.toFixed(4), 'o')}。方向是对的，只是每步挪得太少，演示到上限也没走到坑底。` };
  if (s.outcome === 'global') return { tag: ['收敛到全局最低', 'g'], html: `第 ${s.step} 步收敛，loss 稳定在 ${n(l.toFixed(4), 'g')}，就是右上那个最深的坑。梯度降到 ${n(g.toFixed(4), 'o')}，小球不再移动。` };
  if (s.outcome === 'local') return { tag: ['卡在局部极小', 'o'], html: `第 ${s.step} 步不再移动，loss 停在 ${n(l.toFixed(4), 'o')}，但全局最低是 ${n(M.GLOBAL_MIN.loss.toFixed(4), 'g')}，还低 ${(l - M.GLOBAL_MIN.loss).toFixed(4)}。小球掉进了左下较浅的坑，这里梯度也接近 0（${g.toFixed(4)}），它以为到底了。` };
  const d = prev - l;
  const trend = d > 0.0001 ? '在下降' : d < -0.0001 ? '在上升（越过坑底又爬回坡上）' : '几乎不变（不代表位置不变）';
  return { tag: ['下降中', 'c'], html: `学习率 ${n(r, 'y')}，第 ${s.step} 步，loss 从 ${prev.toFixed(4)} 到 ${n(l.toFixed(4), 'c')}，${trend}。梯度模长 ${n(g.toFixed(4), 'o')}，当前坐标 ${pos}。` };
}

function drawCurve() {
  const h = st.s.history;
  const hi = Math.max(1, ...h.filter(Number.isFinite).map((v) => Math.min(v, 6)));
  const lo = -1.0;
  const X = (i) => 24 + (i / Math.max(30, h.length - 1)) * 218;
  const Y = (v) => 6 + (1 - (Math.min(v, hi) - lo) / (hi - lo)) * 56;
  const pts = h.map((v, i) => `${X(i).toFixed(1)},${Y(Number.isFinite(v) ? v : hi).toFixed(1)}`).join(' ');
  $('curve').innerHTML = `<rect class="cv-bg" x="22" y="4" width="222" height="60" rx="4"/>`
    + `<line class="cv-g" x1="22" x2="244" y1="${Y(M.GLOBAL_MIN.loss)}" y2="${Y(M.GLOBAL_MIN.loss)}"/>`
    + `<line class="cv-l" x1="22" x2="244" y1="${Y(M.LOCAL_MIN.loss)}" y2="${Y(M.LOCAL_MIN.loss)}"/>`
    + `<text class="cv-ax" x="18" y="${Y(hi) + 4}" text-anchor="end">${hi.toFixed(1)}</text>`
    + `<text class="cv-ax" x="18" y="${Y(M.GLOBAL_MIN.loss) + 3}" text-anchor="end">${M.GLOBAL_MIN.loss.toFixed(1)}</text>`
    + `<text class="cv-ax" x="244" y="71" text-anchor="end">${h.length - 1} 步</text>`
    + `<polyline class="cv-line" points="${pts}"/>`;
}

function refresh() {
  const s = st.s;
  const l = s.history.at(-1);
  const g = Math.hypot(...M.grad(s.x, s.y));
  kLr.set(st.lr);
  segLr.set(st.lr);
  segM.set(st.momentum ? 1 : 0);
  segS.set(STARTS.findIndex((p) => p.x === st.x0 && p.y === st.y0));
  segV.set(VIEWS.indexOf(st.view));
  $('lr-read').textContent = lr().toFixed(2);
  $('start-read').textContent = `(${st.x0.toFixed(2)}, ${st.y0.toFixed(2)})`;
  playControl.update({ label: st.running ? '暂停' : s.outcome ? '再来一次' : '播放', pressed: st.running });
  const nx = M.step(s, lr(), st.momentum);
  setStat('loss', Number.isFinite(l) ? l.toFixed(2) : '∞', s.outcome ? SHORT[s.outcome] : '');
  setStat('step', String(s.step), st.momentum ? '带动量' : '');
  setStat('g', g.toFixed(3), '');
  setStat('jump', s.outcome ? '—' : Math.hypot(nx.x - s.x, nx.y - s.y).toFixed(2), `lr ${lr()}`);
  meter.set(toG(Number.isFinite(l) ? l : 9), Number.isFinite(l) ? l.toFixed(2) : '∞');
  const nar = narrate();
  $('narr-tag').textContent = nar.tag[0];
  $('narr-tag').className = `tag tag-${nar.tag[1]}`;
  $('narr-text').innerHTML = nar.html;
  // 预测
  const res = s.outcome === 'oscillate' ? 'diverge' : s.outcome;
  $('predict').classList.toggle('locked', s.step > 0);
  opts.forEach((b, i) => {
    predictionControls[i].update({ pressed: b.dataset.choice === st.predicted, disabled: s.step > 0,
      className: ['opt', b.dataset.choice === st.predicted ? 'selected' : '', s.outcome && b.dataset.choice === res ? 'correct' : '', s.outcome && b.dataset.choice === st.predicted && st.predicted !== res ? 'wrong' : ''].join(' ') });
  });
  $('predict-result').innerHTML = !s.outcome || !st.predicted ? ''
    : st.predicted === res ? `<b class="ok">预测正确。</b>结果确实是「${LABEL[res]}」。`
      : `<b class="bad">预测不对。</b>你选的是「${LABEL[st.predicted]}」，实际是「${LABEL[s.outcome]}」。`;
  L.ball.set(`小球 · loss <b>${Number.isFinite(l) ? l.toFixed(3) : '∞'}</b>`);
  // 停在坑底时小球标签与坑位标签重叠，只留坑位的
  L.ball.show(![M.GLOBAL_MIN, M.LOCAL_MIN].some((m) => Math.hypot(s.x - m.x, s.y - m.y) < 0.4));
  drawCurve();
  syncPath();
  // 下一步箭头：从当前位置指向按当前学习率会落到的位置
  const from = toWorld(s.x, s.y, undefined, new THREE.Vector3());
  const to = toWorld(Math.max(-M.OUT, Math.min(M.OUT, nx.x)), Math.max(-M.OUT, Math.min(M.OUT, nx.y)), undefined, new THREE.Vector3());
  from.y += BALL_R * 2.2;
  to.y += BALL_R * 2.2;
  const len = from.distanceTo(to);
  arrow.visible = !s.outcome && len > 0.02;
  if (arrow.visible) {
    arrow.position.copy(from);
    arrow.setDirection(to.sub(from).normalize());
    arrow.setLength(len, Math.min(0.12, len * 0.5), Math.min(0.07, len * 0.3));
  }
  const u = new URL(location.href);
  u.searchParams.set('view', st.view); u.searchParams.set('lr', String(lr()));
  u.searchParams.set('x', st.x0.toFixed(2)); u.searchParams.set('y', st.y0.toFixed(2));
  if (st.momentum) u.searchParams.set('m', '1'); else u.searchParams.delete('m');
  u.searchParams.delete('steps');
  history.replaceState(null, '', u);
  stage.markShadows();
}

// 点地形顶面换起点：按下与抬起几乎同一处才算点击，拖动留给旋转
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = picker.dragging ? null : { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(terrain.top, false)[0];
  if (!hit) return;
  const [x, y] = toModel(hit.point);
  st.x0 = Math.max(-M.RANGE, Math.min(M.RANGE, x));
  st.y0 = Math.max(-M.RANGE, Math.min(M.RANGE, y));
  reset();
});

// ---------- 帧循环 ----------
const STEP_MS = 140;
let lastStep = 0;
let logT = 0;
const target = new THREE.Vector3();
stage.onFrame((dt, now) => {
  if (st.running && now * 1000 - lastStep > STEP_MS) { lastStep = now * 1000; doStep(false); }
  const s = st.s;
  lift(toWorld(Math.max(-M.OUT, Math.min(M.OUT, s.x)), Math.max(-M.OUT, Math.min(M.OUT, s.y)), undefined, target));
  // 动画只插值参数平面；高度重新取 loss，避免三维弦线穿过地形。
  moveProgress = Math.min(1, moveProgress + dt / 0.1);
  ball.position.lerpVectors(ballFrom, target, moveProgress);
  const [x, y] = toModel(ball.position);
  lift(toWorld(x, y, undefined, ball.position));
  if (now - logT > 1) {
    logT = now;
    const p = stage.stats;
    $('perf').textContent = `主画面 ${p.mainCalls} draw · ${p.fps.toFixed(0)} fps`;
  }
});

// URL 带 steps=N：先跑 N 步（截图与分享直接看到结果）
for (let i = 0, k = Number(q.get('steps')) || 0; i < k && !st.s.outcome; i++) doStep(false);
ball.position.copy(lift(toWorld(Math.max(-M.OUT, Math.min(M.OUT, st.s.x)), Math.max(-M.OUT, Math.min(M.OUT, st.s.y)))));
ballFrom.copy(ball.position);
moveProgress = 1;
refresh();
stage.views.go(st.view, true);
stage.start();
$('loading').classList.add('hide');
