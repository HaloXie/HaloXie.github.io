// 左侧面板：因果叙述、曝光图、景深尺。全部只读 derive() 的结果。
import * as O from './optics.js';
import { $ } from '../kit/util.js';

const n = (v, tone) => `<b class="num tone-${tone}">${v}</b>`;
const pct = (mm) => `${((mm / O.SENSOR_H_MM) * 100).toFixed(mm / O.SENSOR_H_MM < 0.01 ? 2 : 1)}%`;

// 曝光结论：以 EV_场景 为基准
export function verdict(d) {
  const s = d.stops;
  if (Math.abs(s) < 0.34) return { tone: 'g', text: '曝光正好' };
  if (s > 0) return { tone: 'o', text: s > 2 ? '严重过曝，亮部发白' : '偏亮' };
  return { tone: 'c', text: s < -2 ? '严重欠曝，画面发黑' : '偏暗' };
}

function blurWord(mm) {
  const r = mm / O.COC_MM;
  if (r < 1) return '清晰';
  if (r < 4) return '微微发虚';
  if (r < 12) return '明显虚化';
  return '化成大光斑';
}

// 因果链叙述。changed = 'f' | 't' | 'iso' | 'fire' | null；prev = 上一次的 derive 结果
export function narrate(d, prev, changed) {
  const v = verdict(d);
  const tail = `→ 总曝光 ${n(O.fmtStops(d.stops), v.tone)}（${v.text}）`;
  if (changed === 'f' && prev) {
    const dl = Math.log2((prev.N * prev.N) / (d.N * d.N));
    return {
      tag: ['光圈', 'o'],
      html: `${n(`f/${d.F.label}`, 'o')} → 入瞳 ⌀${n(`${d.pupilMm.toFixed(1)}mm`, 'o')} → 进光 ${n(O.fmtStops(dl), 'o')} → 景深 ${n(O.fmtLen(d.dof.total), 'c')} → 背景灯泡光斑占画高 ${n(pct(d.bulbBlurMm), 'y')}，${blurWord(d.bulbBlurMm)} ${tail}`,
    };
  }
  if (changed === 't' && prev) {
    const dl = Math.log2(d.t / prev.t);
    const sw = d.sweepDeg;
    const blur = sw < 3 ? '叶片定格' : sw < 20 ? '叶尖略拖影' : sw < 90 ? '叶片拖成扇面' : '叶片糊成一片';
    return {
      tag: ['快门', 'c'],
      html: `${n(d.S.label + ' 秒', 'c')} → 风车转过 ${n(`${sw < 10 ? sw.toFixed(1) : sw.toFixed(0)}°`, 'c')} → ${blur} → 进光 ${n(O.fmtStops(dl), 'c')} ${tail}`,
    };
  }
  if (changed === 'iso' && prev) {
    const dl = Math.log2(d.iso / prev.iso);
    return {
      tag: ['ISO', 'y'],
      html: `ISO ${n(d.I.label, 'y')} → 不多进一点光，只把信号放大 ${n(O.fmtStops(dl), 'y')} → 噪点变${dl > 0 ? '粗' : '细'}（示意） ${tail}`,
    };
  }
  if (changed === 'fire') {
    return {
      tag: ['拍照', 'g'],
      html: `前帘先关住传感器 → 前帘落下开始曝光 → ${n(d.S.label + ' 秒', 'c')}后后帘追上 → 这段时间里经过 ${n(`⌀${d.pupilMm.toFixed(1)}mm`, 'o')} 入瞳的光，就是这张照片`,
    };
  }
  return {
    tag: ['取景', 'w'],
    html: `取景时快门常开，传感器一直在出画面。对焦 ${n(`${O.FOCUS_M} m`, 'w')}，${n(`f/${d.F.label}`, 'o')} 时清晰范围 ${n(`${O.fmtM(d.dof.near)}–${Number.isFinite(d.dof.far) ? O.fmtM(d.dof.far) : '∞'}`, 'c')}。调任何一个参数，右上的照片都会跟着变。`,
  };
}

// ---------- 曝光图：x = 快门档，y = 光圈档；正确曝光线随 ISO 平移 ----------
const CH = { w: 248, h: 128, l: 26, r: 6, t: 6, b: 18 };
const nS = O.SHUTTERS.length;
const xs = (i) => CH.l + (i / (nS - 1)) * (CH.w - CH.l - CH.r);
// 纵轴按 log2(N²)：f/1.8 在顶
const LY0 = Math.log2(O.F_STOPS[0].N ** 2);
const LY1 = Math.log2(O.F_STOPS[O.F_STOPS.length - 1].N ** 2);
const yN = (N) => CH.t + ((Math.log2(N * N) - LY0) / (LY1 - LY0)) * (CH.h - CH.t - CH.b);
const xT = (t) => xs(-Math.log2(t) - 4);

export function buildChart(svg) {
  const W = CH.w - CH.l - CH.r;
  const H = CH.h - CH.t - CH.b;
  let s = `<defs><clipPath id="chc"><rect x="${CH.l}" y="${CH.t}" width="${W}" height="${H}"/></clipPath></defs>`;
  s += `<rect x="${CH.l}" y="${CH.t}" width="${W}" height="${H}" class="ch-bg"/>`;
  s += '<g clip-path="url(#chc)"><polygon id="ch-over" class="ch-over"/><polygon id="ch-under" class="ch-under"/>';
  s += '<line id="ch-ok" class="ch-ok"/><line id="ch-ok1" class="ch-ok1"/><line id="ch-ok2" class="ch-ok1"/></g>';
  O.SHUTTERS.forEach((S, i) => { if (i % 2 === 0) s += `<text x="${xs(i)}" y="${CH.h - 5}" class="ch-ax" text-anchor="middle">${S.label}</text>`; });
  O.F_STOPS.forEach((F, i) => { if (i % 2 === 0) s += `<text x="${CH.l - 3}" y="${yN(F.N) + 3}" class="ch-ax" text-anchor="end">${F.label}</text>`; });
  s += `<text x="${CH.l + 4}" y="${CH.t + 10}" class="ch-lab over">过曝</text><text x="${CH.w - CH.r - 4}" y="${CH.h - CH.b - 4}" class="ch-lab under" text-anchor="end">欠曝</text>`;
  s += '<g id="ch-dot"><circle r="9" class="ch-halo"/><circle r="4.5" class="ch-cur"/></g>';
  svg.innerHTML = s;
}
// 正确曝光：log2(N²) − log2(1/t) ... 即 log2(N²/t) = EV_场景 + log2(ISO/100)
export function updateChart(d) {
  const target = O.EV_SCENE + Math.log2(d.iso / 100);
  // 给定 t，正确的 N² = 2^target × t
  const line = (off) => {
    const pts = [-1, nS].map((i) => {
      const t = 2 ** -(4 + i);
      const n2 = 2 ** (target + off) * t;
      return [xs(i), CH.t + ((Math.log2(n2) - LY0) / (LY1 - LY0)) * (CH.h - CH.t - CH.b)];
    });
    return pts;
  };
  const set = (id, p) => { const el = $(id); el.setAttribute('x1', p[0][0]); el.setAttribute('y1', p[0][1]); el.setAttribute('x2', p[1][0]); el.setAttribute('y2', p[1][1]); };
  const L = line(0);
  set('ch-ok', L);
  set('ch-ok1', line(1));
  set('ch-ok2', line(-1));
  const far = 400;
  // 线的左上方：孔更大 / 时间更长 → 过曝；右下方 → 欠曝
  $('ch-over').setAttribute('points', `${L[0][0]},${L[0][1]} ${L[1][0]},${L[1][1]} ${L[1][0]},${L[1][1] - far} ${L[0][0]},${L[0][1] - far}`);
  $('ch-under').setAttribute('points', `${L[0][0]},${L[0][1]} ${L[1][0]},${L[1][1]} ${L[1][0]},${L[1][1] + far} ${L[0][0]},${L[0][1] + far}`);
  $('ch-dot').setAttribute('transform', `translate(${xT(d.t).toFixed(1)} ${yN(d.N).toFixed(1)})`);
}

// ---------- 景深尺：0–8 m，标出清晰范围和三件东西的模糊程度 ----------
const RU = { w: 248, h: 46, l: 6, r: 6 };
const MAXM = 8;
const xm = (m) => RU.l + (Math.min(m, MAXM) / MAXM) * (RU.w - RU.l - RU.r);
export function buildRuler(svg) {
  let s = `<line x1="${RU.l}" y1="30" x2="${RU.w - RU.r}" y2="30" class="ru-axis"/>`;
  for (let m = 0; m <= MAXM; m++) s += `<line x1="${xm(m)}" y1="28" x2="${xm(m)}" y2="32" class="ru-axis"/><text x="${xm(m)}" y="43" class="ch-ax" text-anchor="middle">${m}</text>`;
  s += '<rect id="ru-band" y="12" height="22" class="ru-band"/>';
  const items = [['figure', '人偶'], ['windmill', '风车'], ['bulbs', '灯串']];
  for (const [k, name] of items) s += `<circle id="ru-${k}" cx="${xm(O.SUBJECT[k])}" cy="22" class="ru-obj"/><text x="${xm(O.SUBJECT[k])}" y="8" class="ru-lab" text-anchor="middle">${name}</text>`;
  svg.innerHTML = s;
}
export function updateRuler(d) {
  const x0 = xm(d.dof.near);
  const x1 = xm(Number.isFinite(d.dof.far) ? d.dof.far : MAXM);
  const band = $('ru-band');
  band.setAttribute('x', x0.toFixed(1));
  band.setAttribute('width', Math.max(2, x1 - x0).toFixed(1));
  for (const k of ['figure', 'windmill', 'bulbs']) {
    const mm = O.blurDiscMm(d.N, O.SUBJECT[k]);
    // 圆点半径 ∝ 模糊圆直径（相对 c），上限 9px
    $(`ru-${k}`).setAttribute('r', Math.min(9, 2 + Math.sqrt(mm / O.COC_MM) * 1.1).toFixed(2));
    $(`ru-${k}`).classList.toggle('sharp', mm <= O.COC_MM * 1.0001);
  }
}
