// 本课入口：光圈开大，背景为什么会糊？
// 唯一状态 st → derive(st) → 清晰范围板 / 标签 / 读数 / 模拟照片 / 叙述，全部从这一份派生。
import * as THREE from 'three';
import { createStage } from '../../exploded/kit/stage.js';
import { createPicker, knob, pushButton } from '../../exploded/kit/controls3d.js';
import { createLabels } from '../../exploded/kit/labels.js';
import { seg, statCards, modal } from '../../exploded/kit/hud.js';
import { $ } from '../../exploded/kit/util.js';
import { ORANGE, CYAN, YELLOW } from '../../exploded/kit/palette.js';
import * as O from './optics.js';
import { buildRail, buildCamera, buildFigures, buildBulbs, buildBoard, buildFov } from './scene.js';
import { createPhoto, PHOTO_W, PHOTO_H } from './photo.js';
import { MARKUP } from './markup.js';

$('app').innerHTML = MARKUP;

addEventListener('error', (e) => console.error('[error]', e.error?.stack ?? e.message));

// ---------- 状态（URL 参数 view / f / focal / focus 直接进入指定状态） ----------
const q = new URLSearchParams(location.search);
const nearest = (list, v) => list.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(list[best] - v) ? i : best), 0);
const VIEWS = ['overview', 'side', 'top'];
const st = {
  f: q.has('f') ? nearest(O.F_STOPS, Number(q.get('f'))) : O.DEFAULTS.f,
  focal: q.has('focal') ? nearest(O.FOCALS, Number(q.get('focal'))) : O.DEFAULTS.focal,
  focus: q.has('focus') ? nearest(O.FOCUS_M, Number(q.get('focus'))) : O.DEFAULTS.focus,
  view: VIEWS.includes(q.get('view')) ? q.get('view') : 'overview',
  guided: q.get('free') !== '1', // 引导模式：只改光圈
  pick: null,
  settled: false,
};

// ---------- 舞台（kit） ----------
const stage = createStage({
  container: $('stage'),
  bench: { x0: -5.4, x1: 7.0, z0: -3.1, z1: 2.4, h: 2.2 },
  post: q.get('post') === '0' ? { gtao: false, bokeh: false, bloom: false } : {},
});
const { scene } = stage;

buildRail(scene);
const cam = buildCamera(scene);
const figs = buildFigures(scene);
const bulbsAnchor = buildBulbs(scene);
const board = buildBoard(scene);
const fov = buildFov(scene);

// ---------- 台面控件（kit） ----------
const picker = createPicker(stage);
const CZ = -2.25;
const kF = knob(stage, picker, { position: new THREE.Vector3(5.2, 0.06, CZ), labels: O.F_STOPS.map(String), title: 'APERTURE', tone: ORANGE, value: st.f, onStep: (i) => set('f', i) });
const kL = knob(stage, picker, { position: new THREE.Vector3(4.25, 0.06, CZ), labels: O.FOCALS.map(String), title: 'FOCAL mm', tone: CYAN, value: st.focal, onStep: (i) => set('focal', i) });
const kD = knob(stage, picker, { position: new THREE.Vector3(3.3, 0.06, CZ), labels: O.FOCUS_M.map(String), title: 'FOCUS m', tone: YELLOW, value: st.focus, onStep: (i) => set('focus', i) });
pushButton(stage, picker, { position: new THREE.Vector3(2.4, 0.06, CZ), onPress: run });

// ---------- 标签（kit）：常驻只留对焦、清晰范围、灯串光斑；各人偶的光斑只在侧视显示 ----------
const labels = createLabels(stage, $('app'));
const L = {
  range: labels.add('range', { anchor: board.rangeAnchor, tone: 'c', lift: 18 }),
  focus: labels.add('focus', { anchor: board.focusAnchor, tone: 'o', lift: 40 }),
  bulbs: labels.add('bulbs', { anchor: bulbsAnchor, tone: 'w', lift: 22 }),
};
const figL = Object.fromEntries(O.SUBJECTS.map((o, i) => [o.key, labels.add(`fig-${o.key}`, { anchor: figs[o.key], tone: 'w', lift: 6, visible: false })]));

// ---------- 机位（kit views） ----------
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
stage.views.define('overview', { dir: V3(-0.18, 0.5, -1), box: new THREE.Box3(V3(-4.8, 0, -2.6), V3(6.4, 1.6, 1.4)), fill: 0.62 });
// 侧视正对导轨、略高于台面：近 / 远两块板之间的间距沿屏幕横向展开；取景框紧贴导轨与人偶，墙面灯带出画
stage.views.define('side', { dir: V3(0, 0.42, -1), box: new THREE.Box3(V3(-4.8, 0, -1.3), V3(6.3, 1.6, 1.1)), fill: 0.86 });
stage.views.define('top', { dir: V3(0, 1, -0.12), box: new THREE.Box3(V3(-4.8, 0, -2.6), V3(6.4, 0.4, 1.6)), fill: 0.66 });

// ---------- HUD ----------
const setStat = statCards($('stats'), [
  { key: 'near', label: '近点', tone: 'c' }, { key: 'far', label: '远点', tone: 'c' },
  { key: 'dof', label: '景深', tone: 'g' }, { key: 'h', label: '超焦距', tone: 'w' },
]);
const segF = seg($('seg-f'), O.F_STOPS.map((x) => ({ label: String(x), title: `f/${x}` })), (i) => set('f', i));
const segL = seg($('seg-focal'), O.FOCALS.map((x) => ({ label: String(x), title: `${x}mm` })), (i) => set('focal', i));
const segD = seg($('seg-focus'), O.FOCUS_M.map((x) => ({ label: String(x), title: `${x} m` })), (i) => set('focus', i));
const segV = seg($('seg-view'), [{ label: '总览' }, { label: '侧视' }, { label: '俯视' }], (i) => { st.view = VIEWS[i]; apply('view'); });
const segM = seg($('seg-mode'), [{ label: '只改光圈' }, { label: '三个都调' }], (i) => { st.guided = i === 0; apply('mode'); });
const photo = createPhoto(stage, [board.group, fov.lines]);
$('photo-box').appendChild(photo.canvas);
const photoModal = modal();
const photoBig = document.createElement('canvas');
photoBig.width = PHOTO_W;
photoBig.height = PHOTO_H;
const openPhoto = () => { photoBig.getContext('2d').drawImage(photo.canvas, 0, 0); photoModal.open(photoBig, $('photo-read').innerHTML); };
$('photo-zoom').addEventListener('click', openPhoto);
$('photo-box').addEventListener('click', openPhoto);
const opts = [...document.querySelectorAll('#quiz .opt')];
for (const b of opts) b.addEventListener('click', () => {
  if (st.settled) return;
  st.pick = b.dataset.choice;
  opts.forEach((x) => x.classList.toggle('picked', x === b));
  $('btn-run').disabled = false;
});
$('btn-run').addEventListener('click', run);

// ---------- 派生与联动 ----------
let d = O.derive(st);
const pct = (mm) => `${((mm / O.SENSOR_H_MM) * 100).toFixed(1)}%`;
const blurText = (mm) => (mm <= O.C_MM ? '清晰' : `光斑 ⌀${mm < 1 ? mm.toFixed(2) : mm.toFixed(1)}mm`);
function set(k, i) {
  if (st[k] === i) return;
  if (st.guided && (k === 'focal' || k === 'focus')) {
    showNarration(['锁定', 'w'], '引导模式下焦距和对焦距离锁定，只看光圈一个变量。想三个一起调，把「调哪些参数」切到「三个都调」。');
    if (k === 'focal') kL.set(st.focal); else kD.set(st.focus);
    return;
  }
  st[k] = i;
  apply(k);
}
function apply(changed) {
  d = O.derive(st);
  segF.set(st.f); segL.set(st.focal); segD.set(st.focus);
  segV.set(VIEWS.indexOf(st.view)); segM.set(st.guided ? 0 : 1);
  kF.set(st.f); kL.set(st.focal); kD.set(st.focus);
  $('seg-focal').classList.toggle('locked', st.guided);
  $('seg-focus').classList.toggle('locked', st.guided);
  $('mode-hint').textContent = st.guided
    ? '引导模式：只有光圈能调，方便只看一个变量的效果。'
    : '自由模式：三个参数都能调，看它们如何一起影响清晰范围。';
  setStat('near', O.fmtM(d.near).replace(' m', ''), 'm');
  setStat('far', d.far === Infinity ? '∞' : O.fmtM(d.far).replace(' m', ''), d.far === Infinity ? '无穷远' : 'm');
  setStat('dof', d.dof === Infinity ? '∞' : O.fmtDof(d.dof).replace(/ (cm|m)$/, ''), d.dof === Infinity ? '到无穷远' : O.fmtDof(d.dof).split(' ')[1]);
  setStat('h', O.fmtM(d.H).replace(' m', ''), 'm');
  const range = `${O.fmtM(d.near)} – ${O.fmtM(d.far)}`;
  $('dof-read').innerHTML = `清晰范围 <b class="num tone-c">${range}</b> · 景深 <b class="num tone-g">${O.fmtDof(d.dof)}</b>`;
  $('photo-read').innerHTML = `f/${d.N} · ${d.f}mm · 对焦 ${d.sM} m · 灯串（${O.BULBS_M} m）光斑 <b class="num">⌀${d.bulbBlur.toFixed(2)}mm</b>，约画高 ${pct(d.bulbBlur)}`;
  // 侧视里对焦标签与清晰范围标签上下叠，合成一个
  const side = st.view === 'side';
  L.range.set(`${side ? `对焦 <b>${d.sM} m</b> · ` : ''}清晰范围 <b>${O.fmtM(d.near)} – ${d.far === Infinity ? '∞' : O.fmtM(d.far)}</b>`);
  L.focus.show(!side);
  L.focus.set(`对焦 <b>${d.sM} m</b>`);
  L.bulbs.set(`灯串 ${O.BULBS_M} m · ${blurText(d.bulbBlur)}`);
  for (const o of d.subjects) {
    figL[o.key].set(`${o.d} m · ${o.sharp ? '清晰' : `⌀${o.blur < 1 ? o.blur.toFixed(2) : o.blur.toFixed(1)}`}`);
    figL[o.key].el.className = `kit-cap tone-${o.sharp ? 'g' : 'w'}`;
  }
  photo.shoot(d);
  if (changed === 'f' || changed === 'focal' || changed === 'focus') { board.pulse(); showNarration(['变化', 'c'], narrate(d)); }
  if (changed === 'view' || changed === 'init') { stage.views.go(st.view, changed === 'init'); stage.setLamps(st.view !== 'side'); }
  if (changed !== 'view') stage.markShadows();
  const u = new URL(location.href);
  u.searchParams.set('view', st.view); u.searchParams.set('f', d.N); u.searchParams.set('focal', d.f); u.searchParams.set('focus', d.sM);
  history.replaceState(null, '', u);
}

// 叙述：只从当前派生值拼，不写死结论
function narrate(x) {
  const shape = x.far === Infinity
    ? `清晰范围从 ${O.fmtM(x.near)} 一直延伸到无穷远（对焦距离已到超焦距 ${O.fmtM(x.H)} 之外）`
    : `清晰范围在 ${O.fmtM(x.near)} 到 ${O.fmtM(x.far)} 之间，宽 ${O.fmtDof(x.dof)}`;
  const i = O.F_STOPS.indexOf(x.N);
  const ap = i <= 1 ? `光圈开到 f/${x.N}（大光圈），入瞳 ⌀${x.pupilMm.toFixed(1)}mm，清晰范围被压得很窄。`
    : i >= 6 ? `光圈收到 f/${x.N}（小光圈），入瞳只有 ⌀${x.pupilMm.toFixed(1)}mm，清晰范围被拉宽，背景也没那么糊。`
      : `光圈在 f/${x.N}，清晰范围居中。`;
  const bg = x.bulbBlur < 0.05
    ? `${O.BULBS_M} m 处的灯串光斑只有 ${x.bulbBlur.toFixed(3)}mm，肉眼基本看不出糊。`
    : `${O.BULBS_M} m 处的灯串，每个灯泡在照片上糊成直径约 ${x.bulbBlur.toFixed(2)}mm 的光斑：光圈越大（f 数越小）、焦距越长，这个圆越大。`;
  return `<b>f/${x.N}</b> · <b>${x.f}mm</b> · 对焦 <b>${x.sM} m</b>：${shape}。${ap}${bg}`;
}
function showNarration(tag, html) {
  $('narr-tag').textContent = tag[0];
  $('narr-tag').className = `tag tag-${tag[1]}`;
  $('narr-text').innerHTML = html;
}

// ---------- 先预测，再运行：从 f/1.4 拨到 f/16，比较前后的景深（冻结运行那一刻的焦距与对焦距离） ----------
let runTimer = 0;
function run() {
  if (st.settled || runTimer) return;
  if (!st.pick) { showNarration(['先预测', 'o'], '先在左边选一个预测，再按运行。'); return; }
  const frozen = { focal: st.focal, focus: st.focus };
  const before = O.derive({ ...frozen, f: 0 });
  const after = O.derive({ ...frozen, f: O.F_STOPS.length - 1 });
  st.f = 0;
  apply('f');
  runTimer = setTimeout(() => {
    runTimer = 0;
    st.f = O.F_STOPS.length - 1;
    apply('f');
    const actual = after.dof > before.dof ? 'wider' : after.dof < before.dof ? 'narrower' : 'same';
    const ok = st.pick === actual;
    const name = { wider: '变宽', narrower: '变窄', same: '基本不变' };
    st.settled = true;
    $('btn-run').disabled = true;
    opts.forEach((b) => {
      b.classList.toggle('right', b.dataset.choice === actual);
      b.classList.toggle('wrong', b.dataset.choice === st.pick && !ok);
    });
    $('quiz-result').innerHTML = ok
      ? `<b class="good">预测正确。</b>景深从 ${O.fmtDof(before.dof)} 变到 ${O.fmtDof(after.dof)}，确实是「${name[actual]}」。`
      : `<b class="bad">预测不对。</b>你选的是「${name[st.pick]}」，实际景深从 ${O.fmtDof(before.dof)} 变到 ${O.fmtDof(after.dof)}，是「${name[actual]}」。`;
    showNarration([ok ? '预测正确' : '再看一眼', ok ? 'g' : 'o'], `${narrate(d)} 收光圈让入瞳变小，每个点打到传感器上的光锥变细，离对焦面更远的点也能落进 0.03mm 的容许圆里。`);
  }, 900);
}

// ---------- 帧循环 ----------
const perf = $('perf');
let logT = 0;
stage.onFrame((dt) => {
  cam.update(dt, st.focal);
  board.update(dt, d.near / 1000, d.far / 1000, d.sM);
  fov.update(dt, Math.atan(O.SENSOR_W_MM / 2 / d.f));
  L.bulbs.show(st.view !== 'top');
  for (const l of Object.values(figL)) l.show(st.view === 'side');
  photo.update();
  const tNow = performance.now() / 1000;
  if (tNow - logT > 1) {
    logT = tNow;
    const s = stage.stats;
    perf.textContent = `主画面 ${s.mainCalls} draw · ${s.fps.toFixed(0)} fps`;
  }
});

apply('init');
showNarration(['开始', 'w'], narrate(d));
stage.start();
$('loading').classList.add('hide');
