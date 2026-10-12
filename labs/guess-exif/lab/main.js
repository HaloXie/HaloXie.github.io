// EXIF 猜谜入口：写入页面骨架，读本地 JPEG 的 EXIF 出题、打分、记最近 10 轮。
import { MARKUP } from './markup.js';
import { parseExif, hasEnoughExifForQuiz } from '../exif-parser.mjs';

document.getElementById('app').innerHTML = MARKUP;

/* ---------------------------------------------------------------
   Standard photographic stop scales
   --------------------------------------------------------------- */
const APERTURE_STOPS = [1.4, 1.8, 2, 2.8, 3.5, 4, 4.5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
const SHUTTER_STOPS = [
  { label: '1/8000', v: 1 / 8000 }, { label: '1/4000', v: 1 / 4000 }, { label: '1/2000', v: 1 / 2000 },
  { label: '1/1000', v: 1 / 1000 }, { label: '1/500', v: 1 / 500 }, { label: '1/250', v: 1 / 250 },
  { label: '1/125', v: 1 / 125 }, { label: '1/60', v: 1 / 60 }, { label: '1/30', v: 1 / 30 },
  { label: '1/15', v: 1 / 15 }, { label: '1/8', v: 1 / 8 }, { label: '1/4', v: 1 / 4 },
  { label: '1/2', v: 1 / 2 }, { label: '1"', v: 1 }, { label: '2"', v: 2 }, { label: '4"', v: 4 }, { label: '8"', v: 8 },
];
const ISO_STOPS = [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];
const FOCAL_STOPS = [16, 20, 24, 28, 35, 50, 70, 85, 100, 135, 200, 300, 400, 600];

function nearestIndex(stops, target) {
  let best = 0, bestDiff = Infinity;
  stops.forEach((s, i) => {
    const d = Math.abs(s - target);
    if (d < bestDiff) { bestDiff = d; best = i; }
  });
  return best;
}

function populateSelect(select, options, formatFn, defaultIndex) {
  select.innerHTML = '';
  options.forEach((opt, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = formatFn(opt);
    select.appendChild(o);
  });
  select.value = String(defaultIndex);
}

const apSelect = document.getElementById('ap-select');
const shSelect = document.getElementById('sh-select');
const isoSelect = document.getElementById('iso-select');
const flSelect = document.getElementById('fl-select');
const apVal = document.getElementById('ap-val');
const shVal = document.getElementById('sh-val');
const isoVal = document.getElementById('iso-val');
const flVal = document.getElementById('fl-val');

populateSelect(apSelect, APERTURE_STOPS, (v) => `f/${v}`, nearestIndex(APERTURE_STOPS, 4));
populateSelect(shSelect, SHUTTER_STOPS, (v) => v.label, 6);
populateSelect(isoSelect, ISO_STOPS, (v) => String(v), nearestIndex(ISO_STOPS, 400));
populateSelect(flSelect, FOCAL_STOPS, (v) => String(v), nearestIndex(FOCAL_STOPS, 50));

function syncLabels() {
  apVal.textContent = `f/${APERTURE_STOPS[+apSelect.value]}`;
  shVal.textContent = SHUTTER_STOPS[+shSelect.value].label;
  isoVal.textContent = String(ISO_STOPS[+isoSelect.value]);
  flVal.textContent = String(FOCAL_STOPS[+flSelect.value]) + ' mm';
}
[apSelect, shSelect, isoSelect, flSelect].forEach((s) => s.addEventListener('change', syncLabels));
syncLabels();

/* ---------------------------------------------------------------
   Photo queue
   --------------------------------------------------------------- */
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const queueStatus = document.getElementById('queue-status');
const skipNote = document.getElementById('skip-note');
const photoCol = document.getElementById('photo-col');
const quizCol = document.getElementById('quiz-col');
const photoImg = document.getElementById('photo-img');
const photoName = document.getElementById('photo-name');
const photoProgress = document.getElementById('photo-progress');
const resultPanel = document.getElementById('result-panel');
const btnReveal = document.getElementById('btn-reveal');
const btnNext = document.getElementById('btn-next');

let queue = []; // { file, exif } for photos WITH enough EXIF
let queueIndex = 0;
let currentObjectUrl = null;
let currentExif = null;
let revealed = false;

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
['dragenter', 'dragover'].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag'); })
);
['dragleave', 'drop'].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); })
);
dropzone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files || []);
  handleFiles(files);
});
fileInput.addEventListener('change', () => {
  handleFiles(Array.from(fileInput.files || []));
  fileInput.value = '';
});

async function loadDefaultSample() {
  queueStatus.textContent = '正在载入示例照片…';
  try {
    const response = await fetch('./samples/bee-eater.jpg');
    if (!response.ok) throw new Error(`sample request failed: ${response.status}`);
    const blob = await response.blob();
    await handleFiles([new File([blob], 'bee-eater.jpg', { type: 'image/jpeg' })]);
  } catch {
    queueStatus.textContent = '请拖入一张 JPEG 照片开始。';
  }
}

async function handleFiles(files) {
  const jpegs = files.filter((f) => /\.jpe?g$/i.test(f.name) || f.type === 'image/jpeg');
  const rejected = files.length - jpegs.length;

  const skipped = [];
  const usable = [];

  for (const file of jpegs) {
    const buf = await file.arrayBuffer();
    const exif = parseExif(buf);
    if (hasEnoughExifForQuiz(exif)) {
      usable.push({ file, exif });
    } else {
      skipped.push(file.name);
    }
  }

  queue = usable;
  queueIndex = 0;

  const notes = [];
  if (rejected > 0) notes.push(`${rejected} 个文件不是 JPEG，已忽略（HEIC 请先导出为 JPEG）`);
  if (skipped.length > 0) notes.push(`${skipped.length} 张没有完整参数，无法出题，已跳过：${skipped.join('、')}`);
  if (notes.length > 0) {
    skipNote.textContent = notes.join('；');
    skipNote.hidden = false;
  } else {
    skipNote.hidden = true;
  }

  queueStatus.textContent = usable.length > 0
    ? `共 ${usable.length} 张可用照片`
    : '没有可用的照片（缺少必要 EXIF 参数）';

  if (usable.length > 0) {
    loadCurrent();
  } else {
    photoCol.hidden = true;
    quizCol.hidden = true;
    resultPanel.hidden = true;
  }
}

function loadCurrent() {
  const entry = queue[queueIndex];
  if (!entry) {
    photoCol.hidden = true;
    quizCol.hidden = true;
    queueStatus.textContent = '这一批照片都猜完了，可以再拖入新的照片。';
    return;
  }
  currentExif = entry.exif;
  revealed = false;

  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(entry.file);
  photoImg.src = currentObjectUrl;
  photoName.textContent = entry.file.name;
  photoProgress.textContent = `第 ${queueIndex + 1} / ${queue.length} 张`;

  photoCol.hidden = false;
  quizCol.hidden = false;
  resultPanel.hidden = true;
  btnReveal.disabled = false;
  btnReveal.textContent = '揭晓答案';
}

/* ---------------------------------------------------------------
   Scoring — differences measured in photographic stops (log2)
   --------------------------------------------------------------- */
function apertureStopDiff(guessF, realF) {
  return 2 * Math.log2(guessF / realF);
}
function shutterStopDiff(guessT, realT) {
  return Math.log2(guessT / realT);
}
function isoStopDiff(guessIso, realIso) {
  return Math.log2(guessIso / realIso);
}
function focalStopDiff(guessMm, realMm) {
  return Math.log2(guessMm / realMm);
}

function grade(absDiff) {
  if (absDiff <= 1 / 3) return { key: 'exact', label: '全对', cls: 'grade-exact' };
  if (absDiff <= 1) return { key: 'close', label: '接近', cls: 'grade-close' };
  return { key: 'off', label: '偏差较大', cls: 'grade-off' };
}

/* ---------------------------------------------------------------
   Explanation templates — derived from the numeric diff + which
   direction the guess erred, never hand-written per photo.
   --------------------------------------------------------------- */
function apertureExplain(guessF, realF, diff) {
  const absDiff = Math.abs(diff);
  if (absDiff <= 1 / 3) return `光圈猜得很准（差 ${absDiff.toFixed(1)} 挡）。`;
  const guessedWider = guessF < realF; // wider aperture = smaller f-number
  const dir = guessedWider
    ? '你猜的光圈比实际更大（数字更小），如果背景虚化程度和你猜的不符，说明看走眼了'
    : '你猜的光圈比实际更小（数字更大），如果背景其实很模糊，那通常意味着实际光圈比你猜的大得多';
  return `真实是 f/${realF}，你猜 f/${guessF}，差 ${absDiff.toFixed(1)} 挡。${dir}——大光圈（小 f 值）背景虚化明显，小光圈（大 f 值）前后景都清晰，这是最直接的视觉线索。`;
}

function shutterExplain(guessLabel, realLabel, guessT, realT, diff) {
  const absDiff = Math.abs(diff);
  if (absDiff <= 1 / 3) return `快门猜得很准（差 ${absDiff.toFixed(1)} 挡）。`;
  const guessedSlower = guessT > realT;
  const dir = guessedSlower
    ? '你猜的快门比实际更慢，如果画面里的运动物体其实是清晰凝固的，说明实际快门比你猜的快得多'
    : '你猜的快门比实际更快，如果画面里有明显的运动模糊或手抖虚，说明实际快门比你猜的慢得多';
  return `真实是 ${realLabel} 秒，你猜 ${guessLabel} 秒，差 ${absDiff.toFixed(1)} 挡。${dir}——快门快能凝固运动，快门慢会留下模糊轨迹，看画面里动态元素的清晰度就是线索。`;
}

function isoExplain(guessIso, realIso, diff) {
  const absDiff = Math.abs(diff);
  if (absDiff <= 1 / 3) return `ISO 猜得很准（差 ${absDiff.toFixed(1)} 挡）。`;
  const guessedHigher = guessIso > realIso;
  const dir = guessedHigher
    ? '你猜的 ISO 比实际更高，如果画面其实很干净没什么噪点，说明实际 ISO 比你猜的低'
    : '你猜的 ISO 比实际更低，如果暗部或整体噪点其实很明显，说明实际 ISO 比你猜的高得多';
  return `真实是 ISO ${realIso}，你猜 ISO ${guessIso}，差 ${absDiff.toFixed(1)} 挡。${dir}——ISO 越高噪点越明显，尤其在暗部和阴影区域，放大看颗粒感是最直接的线索。`;
}

function focalExplain(guessMm, realMm, diff) {
  const absDiff = Math.abs(diff);
  if (absDiff <= 1 / 3) return `焦距猜得很准（差 ${absDiff.toFixed(1)} 挡）。`;
  const guessedLonger = guessMm > realMm;
  const dir = guessedLonger
    ? '你猜的焦距比实际更长，如果画面透视其实很宽广、背景压缩感不强，说明实际用的是更广的焦距'
    : '你猜的焦距比实际更短，如果背景被明显压缩、视角很窄，说明实际用的是更长的焦距';
  return `真实是 ${realMm}mm，你猜 ${guessMm}mm，差 ${absDiff.toFixed(1)} 挡。${dir}——长焦压缩空间、放大远处主体，广角视角宽、透视感强，画面的透视压缩程度是线索。`;
}

/* ---------------------------------------------------------------
   Reveal + scoring
   --------------------------------------------------------------- */
const scoreRow = document.getElementById('score-row');
const explainBlock = document.getElementById('explain-block');
const overallBig = document.getElementById('overall-big');

btnReveal.addEventListener('click', () => {
  if (revealed || !currentExif) return;
  revealed = true;
  btnReveal.disabled = true;

  const guessF = APERTURE_STOPS[+apSelect.value];
  const guessSh = SHUTTER_STOPS[+shSelect.value];
  const guessIso = ISO_STOPS[+isoSelect.value];
  const guessFl = FOCAL_STOPS[+flSelect.value];

  const realF = currentExif.fNumber;
  const realT = currentExif.exposureTime;
  const realIso = currentExif.iso;
  // Prefer the 35mm-equivalent focal length when present, per the spec.
  const realFl = currentExif.focalLengthIn35mm ?? currentExif.focalLength;

  const dAp = apertureStopDiff(guessF, realF);
  const dSh = shutterStopDiff(guessSh.v, realT);
  const dIso = isoStopDiff(guessIso, realIso);
  const dFl = focalStopDiff(guessFl, realFl);

  const items = [
    { label: '光圈', guessDisp: `f/${guessF}`, realDisp: `f/${formatNumber(realF)}`, diff: dAp },
    { label: '快门', guessDisp: `${guessSh.label}s`, realDisp: `${formatShutter(realT)}s`, diff: dSh },
    { label: 'ISO', guessDisp: String(guessIso), realDisp: String(Math.round(realIso)), diff: dIso },
    { label: '焦距', guessDisp: `${guessFl}mm`, realDisp: `${formatNumber(realFl)}mm`, diff: dFl },
  ];

  scoreRow.innerHTML = '';
  items.forEach((item) => {
    const g = grade(Math.abs(item.diff));
    const card = document.createElement('div');
    card.className = 'score-card';
    card.innerHTML = `
      <div class="label">${item.label}</div>
      <div class="guess">你猜 ${item.guessDisp}</div>
      <div class="real">${item.realDisp}</div>
      <div class="diff ${g.cls}">${g.label} · 差 ${Math.abs(item.diff).toFixed(1)} 挡</div>
    `;
    scoreRow.appendChild(card);
  });

  const avgAbsDiff = (Math.abs(dAp) + Math.abs(dSh) + Math.abs(dIso) + Math.abs(dFl)) / 4;
  overallBig.textContent = avgAbsDiff.toFixed(2);

  explainBlock.innerHTML = [
    apertureExplain(guessF, realF, dAp),
    shutterExplain(guessSh.label, formatShutter(realT), guessSh.v, realT, dSh),
    isoExplain(guessIso, Math.round(realIso), dIso),
    focalExplain(guessFl, realFl, dFl),
  ].map((t) => `<p>${t}</p>`).join('');

  resultPanel.hidden = false;

  recordRound(avgAbsDiff, items);
});

function formatNumber(n) {
  return Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1);
}
function formatShutter(t) {
  if (t >= 1) return t.toFixed(t >= 10 ? 0 : 1) + '"';
  const denom = Math.round(1 / t);
  return `1/${denom}`;
}

btnNext.addEventListener('click', () => {
  queueIndex++;
  loadCurrent();
});

/* ---------------------------------------------------------------
   History — localStorage, last 10 rounds, trend chart
   --------------------------------------------------------------- */
const HISTORY_KEY = 'guess-exif-history-v1';
const MAX_HISTORY = 10;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode etc.) — history just won't persist
  }
}

function recordRound(avgAbsDiff) {
  const history = loadHistory();
  history.push({ t: Date.now(), avg: avgAbsDiff });
  while (history.length > MAX_HISTORY) history.shift();
  saveHistory(history);
  renderHistory();
}

const noHistoryEl = document.getElementById('no-history');
const trendCanvas = document.getElementById('trend-chart');
const historySummary = document.getElementById('history-summary');
const histCount = document.getElementById('hist-count');
const histAvg = document.getElementById('hist-avg');
const histTrend = document.getElementById('hist-trend');

function renderHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    noHistoryEl.hidden = false;
    trendCanvas.hidden = true;
    historySummary.hidden = true;
    return;
  }
  noHistoryEl.hidden = true;
  trendCanvas.hidden = false;
  historySummary.hidden = false;

  const avgs = history.map((h) => h.avg);
  const overallAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  histCount.textContent = String(history.length);
  histAvg.textContent = overallAvg.toFixed(2);

  if (history.length >= 4) {
    const half = Math.floor(history.length / 2);
    const early = avgs.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const recent = avgs.slice(-half).reduce((a, b) => a + b, 0) / half;
    const delta = early - recent; // positive = improving (error went down)
    histTrend.textContent = delta > 0.02
      ? `↓ 误差减少 ${delta.toFixed(2)} 挡（进步）`
      : delta < -0.02
        ? `↑ 误差增加 ${Math.abs(delta).toFixed(2)} 挡`
        : '基本持平';
  } else {
    histTrend.textContent = '轮次太少，暂看不出趋势';
  }

  drawTrendChart(avgs);
}

// canvas 不认 CSS 变量：经隐藏元素把 token 解析成具体颜色，切明暗后重画。
const probe = document.createElement('i');
probe.hidden = true;
document.body.append(probe);
function tokenColor(name) {
  probe.style.color = `var(--exploded-${name})`;
  return getComputedStyle(probe).color;
}
new MutationObserver(renderHistory).observe(document.documentElement, { attributes: true, attributeFilter: ['data-exploded-scheme', 'style'] });

function drawTrendChart(avgs) {
  const ctx = trendCanvas.getContext('2d');
  const w = trendCanvas.width, h = trendCanvas.height;
  ctx.clearRect(0, 0, w, h);

  const pad = 16;
  const maxVal = Math.max(1, ...avgs) * 1.1;
  const stepX = avgs.length > 1 ? (w - pad * 2) / (avgs.length - 1) : 0;

  // grid lines
  ctx.strokeStyle = tokenColor('line');
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad + ((h - pad * 2) * i) / 3;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  // line
  ctx.strokeStyle = tokenColor('cyan');
  ctx.lineWidth = 2;
  ctx.beginPath();
  avgs.forEach((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (v / maxVal) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // points
  ctx.fillStyle = tokenColor('orange');
  avgs.forEach((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (v / maxVal) * (h - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

renderHistory();
loadDefaultSample();
