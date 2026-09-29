// 本课入口：按下快门，一张照片是怎么被做出来的。
// 唯一状态 st → derive(st) → 相机机械件 / 光锥 / 景深板 / 取景画面 / 测光表 / 图表 / 叙述，全部从这一份派生。
import * as THREE from 'three';
import { createStage } from '../kit/stage.js';
import { createPicker, knob, pushButton, gauge } from '../kit/controls3d.js';
import { createLabels } from '../kit/labels.js';
import { seg, statCards, modal } from '../kit/hud.js';
import { $, paint, at, merge, prbox } from '../kit/util.js';
import * as O from './optics.js';
import { buildRig, PART_META, curtainStarts } from './camera.js';
import { buildDiorama, AXIS } from './diorama.js';
import { createViewfinder, SAMPLES, PREVIEW, PER_FRAME, VF_W, VF_H } from './viewfinder.js';
import { buildDofBoard, buildLightCone, buildDust } from './overlays.js';
import { narrate, verdict, buildChart, updateChart, buildRuler, updateRuler } from './panel.js';
import { createPhotoStrip } from './photos.js';
import { unlockAudio, playShutter } from './audio.js';

addEventListener('error', (e) => console.error('[error]', e.error?.stack ?? e.message));

// ---------- 状态（URL 参数 view / f / t / iso / cut 直接进入指定状态） ----------
const q = new URLSearchParams(location.search);
const parseT = (s) => (s.includes('/') ? 1 / Number(s.split('/')[1]) : Number(s));
const VIEWS = ['overview', 'shoot', 'section'];
const CUTS = ['none', 'exploded', 'path'];
const st = {
  f: q.has('f') ? O.nearestIndex(O.F_STOPS, 'N', Number(q.get('f'))) : O.DEFAULTS.f,
  t: q.has('t') ? O.nearestIndex(O.SHUTTERS, 't', parseT(q.get('t'))) : O.DEFAULTS.t,
  iso: q.has('iso') ? O.nearestIndex(O.ISOS, 'iso', Number(q.get('iso'))) : O.DEFAULTS.iso,
  view: VIEWS.includes(q.get('view')) ? q.get('view') : 'overview',
  cut: CUTS.includes(q.get('cut')) ? q.get('cut') : 'none',
  sound: false,
};
const PRESETS = [
  { name: '人像', f: 0, t: 3, iso: 1, title: 'f/1.8 · 1/125 · ISO 200：背景化成光斑' },
  { name: '定格', f: 1, t: 6, iso: 4, title: 'f/2.8 · 1/1000 · ISO 1600：风车叶定格' },
  { name: '拖影', f: 4, t: 0, iso: 1, title: 'f/8 · 1/15 · ISO 200：风车转成一片' },
  { name: '收光圈', f: 6, t: 0, iso: 4, title: 'f/16 · 1/15 · ISO 1600：清晰范围从 9cm 拉宽到约 0.9m，背景光斑明显变小' },
];

// ---------- 舞台（kit） ----------
const stage = createStage({
  container: $('stage'),
  bench: { x0: -5.2, x1: 9.2, z0: -3.3, z1: 3.1, h: 2.2 },
  post: q.get('post') === '0' ? { gtao: false, bokeh: false, bloom: false } : {},
});
const { scene, camera } = stage;

// ---------- 相机：镜头入瞳对准 AXIS，朝 +x ----------
const RIG_S = 0.5;
const PUPIL_LOCAL_X = 1.1; // 本地坐标里前组镜片的位置，作为入瞳
const mount = new THREE.Group();
mount.scale.setScalar(RIG_S);
mount.position.set(AXIS.x - PUPIL_LOCAL_X * RIG_S, AXIS.y, AXIS.z);
scene.add(mount);
const cam = buildRig(mount);
{
  // 三脚架云台 + 控制台底板
  const parts = [];
  const bx = mount.position.x - 0.45;
  const top = AXIS.y - 0.56 * RIG_S;
  parts.push(prbox(0x1d2129, 0.7, 0.05, 0.6, bx, 0.025, 0, 0.02));
  parts.push(at(paint(new THREE.CylinderGeometry(0.06, 0.08, top - 0.05, 16), 0x2a2f38), bx, 0.05 + (top - 0.05) / 2, 0));
  parts.push(prbox(0x3a4250, 0.5, 0.04, 0.34, bx, top - 0.02, 0, 0.015));
  parts.push(prbox(0x161a21, 3.3, 0.06, 1.1, -3.1, 0.03, -2.45, 0.03));
  const m = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.5 }));
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}

// ---------- 布景 + 取景 + 叠加层 ----------
const dio = buildDiorama(scene);
const vf = createViewfinder(stage, dio);
cam.screenMat.map = vf.screenTex;
cam.screenMat.color.setScalar(1.35); // 背屏会再经过一次主画面的 ACES，稍提亮补偿
cam.screenMat.toneMapped = false;
cam.screenMat.needsUpdate = true;
const board = buildDofBoard(scene);
const cone = buildLightCone(scene);
const dust = buildDust(scene, new THREE.Box3(new THREE.Vector3(AXIS.x + 0.1, 0.25, -0.55), new THREE.Vector3(AXIS.x + 1.9, 1.15, 0.35)));

// ---------- 台面控件（kit） ----------
const picker = createPicker(stage);
const CZ = -2.45;
const kF = knob(stage, picker, { position: new THREE.Vector3(-1.9, 0.06, CZ), labels: O.F_STOPS.map((x) => x.label), title: 'APERTURE', tone: 0xff8a2a, value: st.f, onStep: (i) => set('f', i) });
const kT = knob(stage, picker, { position: new THREE.Vector3(-2.75, 0.06, CZ), labels: O.SHUTTERS.map((x) => x.label.replace('1/', '')), title: 'SHUTTER', tone: 0x3fe0ff, value: st.t, onStep: (i) => set('t', i) });
const kI = knob(stage, picker, { position: new THREE.Vector3(-3.6, 0.06, CZ), labels: O.ISOS.map((x) => x.label), title: 'ISO', tone: 0xffd24a, value: st.iso, onStep: (i) => set('iso', i) });
const meter = gauge(stage, { position: new THREE.Vector3(-4.35, 0.06, CZ), r: 0.34, range: 3, title: 'METER', ticks: [{ v: -3, label: '-3' }, { v: 0, label: '0' }, { v: 3, label: '+3' }] });
pushButton(stage, picker, { position: new THREE.Vector3(-1.2, 0.06, CZ), onPress: fire });

// ---------- 标签（kit） ----------
const labels = createLabels(stage, $('app'));
const tmpV = new THREE.Vector3();
const lensFront = () => cam.rig.localToWorld(tmpV.set(1.5, 0, 0)).clone();
const L = {
  figure: labels.add('figure', { anchor: dio.anchors.figure, tone: 'o', lift: 30 }),
  windmill: labels.add('windmill', { anchor: dio.anchors.windmill, tone: 'c', lift: 26 }),
  bulbs: labels.add('bulbs', { anchor: dio.anchors.bulbs, tone: 'y', lift: 22 }),
  // 景深板标签挂在板的近界、偏镜头左侧的底边，避开人偶头顶的标签
  board: labels.add('board', { anchor: () => tmpV.set(AXIS.x + board.range.near, 0.2, -0.45).clone(), tone: 'c', lift: 16 }),
  camera: labels.add('camera', { anchor: () => cam.rig.localToWorld(tmpV.set(-0.6, 1.2, 0)).clone(), tone: 'w', lift: 26 }),
};
const partLabels = {};
// 引线长短交错，相邻零件的胶囊不叠
['barrel', 'lens1', 'aperture', 'lens2', 'shutterF', 'shutterR', 'bayer', 'body'].forEach((k, i) => {
  partLabels[k] = labels.add(`p-${k}`, { anchor: () => cam.anchorWorld(k, new THREE.Vector3()), tone: k === 'aperture' ? 'o' : k.startsWith('shutter') ? 'c' : 'w', lift: i % 2 ? 44 : 12, html: PART_META[k].name });
});

// ---------- 机位（kit views） ----------
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
stage.views.define('overview', { dir: V3(-0.22, 0.46, -1), box: new THREE.Box3(V3(-4.6, 0, -2.9), V3(8.4, 1.9, 2.8)), fill: 0.6 });
stage.views.define('shoot', { dir: V3(-1, 0.38, 0.5), box: new THREE.Box3(V3(-1.3, 0.1, -1.4), V3(4.2, 1.35, 1.6)), target: V3(2.2, 0.6, 0), fill: 0.6 });
stage.views.define('section', { dir: V3(0.1, 0.34, -1), box: () => new THREE.Box3().setFromObject(cam.rig).expandByScalar(0.05), fill: 0.6 });

// ---------- HUD ----------
const setStat = statCards($('stats'), [
  { key: 'f', label: '光圈', tone: 'o' }, { key: 't', label: '快门', tone: 'c' },
  { key: 'iso', label: 'ISO', tone: 'y' }, { key: 'ev', label: '曝光', tone: 'g' },
]);
const segF = seg($('seg-f'), O.F_STOPS.map((x) => ({ label: x.label, title: `f/${x.label}` })), (i) => set('f', i));
const segT = seg($('seg-t'), O.SHUTTERS.map((x) => ({ label: x.label.replace('1/', ''), title: `${x.label} 秒` })), (i) => set('t', i));
const segI = seg($('seg-iso'), O.ISOS.map((x) => ({ label: x.label, title: `ISO ${x.label}` })), (i) => set('iso', i));
const segP = seg($('seg-preset'), PRESETS.map((p) => ({ label: p.name, title: p.title })), (i) => { Object.assign(st, { f: PRESETS[i].f, t: PRESETS[i].t, iso: PRESETS[i].iso }); apply('preset'); });
const segV = seg($('seg-view'), [{ label: '总览' }, { label: '拍摄' }, { label: '机械剖视' }], (i) => { st.view = VIEWS[i]; apply('view'); });
const segC = seg($('seg-cut'), [{ label: '组装' }, { label: '爆炸图' }, { label: '光路图' }], (i) => { st.cut = CUTS[i]; if (st.view !== 'section') st.view = 'section'; apply('view'); });
$('btn-fire').addEventListener('click', fire);
$('btn-sound').addEventListener('click', () => { st.sound = !st.sound; if (st.sound) unlockAudio(); $('btn-sound').textContent = st.sound ? '声音：开' : '声音：关'; });
buildChart($('chart'));
buildRuler($('ruler'));
const photos = createPhotoStrip($('tray'));
$('vf-box').appendChild(vf.canvas);
const vfModal = modal();
const vfBig = document.createElement('canvas');
vfBig.width = VF_W;
vfBig.height = VF_H;
$('vf-zoom').addEventListener('click', () => vfModal.open(vfBig, '实时取景（副相机累积渲染，未按快门）'));
$('vf-box').addEventListener('click', () => vfModal.open(vfBig, '实时取景（副相机累积渲染，未按快门）'));

// ---------- 派生与联动 ----------
let d = O.derive(st);
let prevD = d;
let shadowUntil = 0;
const fmtRange = (x) => `${O.fmtM(x.near)}–${Number.isFinite(x.far) ? O.fmtM(x.far) : '∞'}`;
function set(k, i) {
  if (st[k] === i) return;
  st[k] = i;
  apply(k);
}
function apply(changed) {
  prevD = d;
  d = O.derive(st);
  segF.set(st.f); segT.set(st.t); segI.set(st.iso);
  segV.set(VIEWS.indexOf(st.view)); segC.set(CUTS.indexOf(st.cut));
  segP.set(PRESETS.findIndex((p) => p.f === st.f && p.t === st.t && p.iso === st.iso));
  kF.set(st.f); kT.set(st.t); kI.set(st.iso);
  const v = verdict(d);
  setStat('f', `f/${d.F.label}`, `⌀${d.pupilMm.toFixed(1)}mm`);
  setStat('t', d.S.label, `转 ${d.sweepDeg < 10 ? d.sweepDeg.toFixed(1) : d.sweepDeg.toFixed(0)}°`);
  setStat('iso', d.I.label, `×${(d.iso / 100).toFixed(0)}`);
  setStat('ev', O.fmtStops(d.stops).replace(' 挡', ''), `挡 · ${v.text.slice(0, 2)}`);
  $('st-ev').className = `v tone-${v.tone}`;
  if (changed !== 'view' && changed !== 'init') {
    const nar = narrate(d, prevD, changed === 'preset' ? null : changed);
    showNarration(nar);
  }
  updateChart(d);
  updateRuler(d);
  $('dof-read').innerHTML = `清晰范围 <b class="num tone-c">${fmtRange(d.dof)}</b> · 景深 <b class="num tone-c">${O.fmtLen(d.dof.total)}</b>`;
  meter.set(d.stops, O.fmtStops(d.stops).replace(' 挡', ''));
  if (changed === 'f' || changed === 'preset') board.pulse();
  if (changed === 'f' || changed === 'view') { cam.parts.aperture.act = 1; shadowUntil = performance.now() / 1000 + 1.5; }
  if (changed === 'view' || changed === 'init') {
    stage.views.go(st.view, changed === 'init');
    document.body.dataset.view = st.view;
    $('seg-cut').classList.toggle('dim', st.view !== 'section');
  }
  L.figure.set(`人偶 · 对焦 <b>${O.FOCUS_M} m</b>`);
  L.windmill.set(`风车 · <b>${O.WINDMILL_REV_PER_S} 圈/秒</b> · 本次转 <b>${d.sweepDeg < 10 ? d.sweepDeg.toFixed(1) : d.sweepDeg.toFixed(0)}°</b>`);
  L.bulbs.set(`灯串 · ${O.SUBJECT.bulbs} m · 光斑 <b>${((d.bulbBlurMm / O.SENSOR_H_MM) * 100).toFixed(1)}%</b> 画高`);
  L.board.set(`清晰范围 <b>${fmtRange(d.dof)}</b>`);
  L.camera.set(`50mm 定焦 · 入瞳 <b>⌀${d.pupilMm.toFixed(1)}mm</b>`);
  partLabels.aperture.set(`光圈叶片 · 入瞳 <b>⌀${d.pupilMm.toFixed(1)}mm</b>`);
  const u = new URL(location.href);
  u.searchParams.set('view', st.view); u.searchParams.set('f', d.F.label); u.searchParams.set('t', d.S.label); u.searchParams.set('iso', d.I.label);
  if (st.cut !== 'none') u.searchParams.set('cut', st.cut); else u.searchParams.delete('cut');
  history.replaceState(null, '', u);
}
function showNarration(nar) {
  $('narr-tag').textContent = nar.tag[0];
  $('narr-tag').className = `tag tag-${nar.tag[1]}`;
  $('narr-text').innerHTML = nar.html;
}

// ---------- 拍照 ----------
let pending = null;
function fire() {
  if (cam.isFiring() || vf.busy) return;
  const now = performance.now() / 1000;
  cam.fire(now);
  shadowUntil = now + 2;
  if (st.sound) { const c = curtainStarts(d.t); playShutter(c.front, c.rear); }
  showNarration(narrate(d, d, 'fire'));
  const shot = d;
  vf.shoot(dio.time, shot, (canvas) => { pending = { canvas, shot }; });
}
function flushPhoto() {
  if (!pending || cam.isFiring()) return;
  const { canvas, shot } = pending;
  pending = null;
  const v = verdict(shot);
  const p = cam.rig.localToWorld(new THREE.Vector3(-1.4, 0.2, 0)).project(camera);
  photos.add(canvas, {
    title: `f/${shot.F.label} · ${shot.S.label}s · ISO ${shot.I.label}`,
    lines: [
      `曝光 ${O.fmtStops(shot.stops)}（${v.text}）`,
      `清晰范围 ${fmtRange(shot.dof)}，景深 ${O.fmtLen(shot.dof.total)}`,
      `风车在快门时间内转过 ${shot.sweepDeg.toFixed(1)}° · 灯泡光斑 ${((shot.bulbBlurMm / O.SENSOR_H_MM) * 100).toFixed(1)}% 画高`,
      `${SAMPLES} 个样本累积（光圈圆盘 × 快门时间）`,
    ],
  }, { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight });
  showNarration(narrate(d, d, null));
  console.log('[lab] photo', photos.count, shot.F.label, shot.S.label, shot.I.label);
}

// ---------- 帧循环 ----------
const stats = $('perf');
let logT = 0;
stage.onFrame((dt, now) => {
  const tNow = performance.now() / 1000;
  dio.setTime(now);
  dust.update(now);
  const cut = st.view === 'section' ? st.cut : 'none';
  cam.update(dt, tNow, { N: d.N, t: d.t, cut, gain: d.gain });
  const dark = cam.phase === 'close' || cam.phase === 'expose' || cam.phase === 'reset' ? 0.04 : 1;
  vf.update(now, d, dark);
  flushPhoto();
  if (vfModal.isOpen) vfBig.getContext('2d').drawImage(vf.canvas, 0, 0);
  const inSection = st.view === 'section';
  board.show(!inSection);
  board.update(dt, d.board);
  cone.show(!inSection);
  cone.update(dt, lensFront(), dio.anchors.figure().setY(AXIS.y), cam.holeRadius() * RIG_S, d.gain);
  L.figure.show(!inSection); L.windmill.show(!inSection); L.bulbs.show(!inSection); L.board.show(!inSection); L.camera.show(st.view === 'overview');
  for (const [k, lab] of Object.entries(partLabels)) lab.show(inSection && (st.cut !== 'none' || k === 'aperture' || k === 'shutterF' || k === 'bayer'));
  if (tNow < shadowUntil) stage.markShadows();
  $('vf-meta').innerHTML = `f/${d.F.label} · ${d.S.label}s · ISO ${d.I.label}<span>${vf.converged ? '已稳定' : `累积 ${vf.info.liveSamples}/${SAMPLES}`}</span>`;
  if (tNow - logT > 1) {
    logT = tNow;
    const s = stage.stats;
    stats.textContent = `主画面 ${s.mainCalls} draw · 副相机 ${s.extraCalls} draw / ${vf.info.samplesPerFrame} 样本 · ${s.fps.toFixed(0)} fps`;
    window.__lab = { gtao: !!stage.post.gtao?.enabled, mainCalls: s.mainCalls, extraCalls: s.extraCalls, samplesPerFrame: vf.info.samplesPerFrame, liveSamples: vf.info.liveSamples, totalSamples: vf.info.total, gain: vf.info.gain, meanAll: vf.info.meanAll, meanFigure: vf.info.meanFigure, fps: s.fps, views: Object.fromEntries(Object.entries(stage.views.solved).map(([k, x]) => [k, { fillW: +x.fillW.toFixed(3), fillH: +x.fillH.toFixed(3), inside: x.inside }])) };
    console.log('[lab]', JSON.stringify(window.__lab));
  }
});

apply('init');
showNarration(narrate(d, d, null));
stage.markShadows();
stage.start();
$('loading').classList.add('hide');
if (q.get('shoot') === '1') setTimeout(fire, 1500);
console.log('[lab] 采样参数', JSON.stringify({ SAMPLES, PREVIEW, PER_FRAME, VF: `${VF_W}x${VF_H}` }));
