// 纯计算层：页面和 node（check-optics.mjs）共用同一份。不 import three，不碰 DOM。
// 所有显示数字、景深板边界、累积渲染的光圈半径与视锥都从这里派生。

// ---------- 比例 ----------
// 布景比例 1:10：布景里 0.1 m 代表真实场景 1 m。场景坐标 1 单位 = 布景 0.1 m，所以 1 单位 = 真实 1 m。
// 光学计算一律用真实尺寸（50mm 镜头、全画幅传感器、真实距离），再按 UNIT_M_REAL 换成场景单位。
export const MODEL_SCALE = 10;
export const UNIT_M_MODEL = 0.1;
export const UNIT_M_REAL = UNIT_M_MODEL * MODEL_SCALE; // = 1
export const mToUnits = (m) => m / UNIT_M_REAL;

// ---------- 镜头与传感器 ----------
export const FOCAL_MM = 50; // 50mm 定焦
export const SENSOR_W_MM = 36; // 全画幅
export const SENSOR_H_MM = 24;
export const COC_MM = 0.03; // 容许弥散圆，全画幅常用值
export const FOCUS_M = 1.5; // 对焦在人偶上（真实距离，从入瞳量起）

// 布景里各物体到入瞳的真实距离（m）。景深板、叙述、自检都读这里。
export const SUBJECT = { figure: 1.5, windmill: 3.5, bulbs: 7 };

// ---------- 档位 ----------
// 相机内部按精确的 2 的幂走档，面板上印的是取整后的名义值（2.8 实为 √8，1/125 实为 1/128）。
// f/1.8 是 50mm 定焦常见的最大光圈，不在整档序列上，按 1.8 本身计算。
export const F_STOPS = [
  { label: '1.8', N: 1.8 },
  { label: '2.8', N: 2 ** 1.5 },
  { label: '4', N: 2 ** 2 },
  { label: '5.6', N: 2 ** 2.5 },
  { label: '8', N: 2 ** 3 },
  { label: '11', N: 2 ** 3.5 },
  { label: '16', N: 2 ** 4 },
];
export const SHUTTERS = [15, 30, 60, 125, 250, 500, 1000].map((d, i) => ({ label: `1/${d}`, t: 2 ** -(4 + i) }));
export const ISOS = [100, 200, 400, 800, 1600, 3200, 6400].map((v, i) => ({ label: String(v), iso: 100 * 2 ** i }));

// 场景亮度：EV100 = 8，家庭室内灯光下的典型值（常见范围 EV 5–8），不是测出来的。
export const EV_SCENE = 8;

// 风车真实转速：每秒 2 圈。
export const WINDMILL_REV_PER_S = 2;

export const DEFAULTS = { f: 1, t: 1, iso: 0 }; // f/2.8 · 1/30 · ISO 100，正好 EV 8 = 正确曝光

// ---------- 光圈 ----------
// f 值 = 焦距 ÷ 入瞳直径（从镜头前方看到的孔径，不是叶片的物理开口）。
export function pupilDiameterMm(N) {
  return FOCAL_MM / N;
}
// 累积渲染用的光圈半径（场景单位）= 焦距 ÷ f 值 ÷ 2，换成米再换成单位。
export function lensRadiusUnits(N) {
  return mToUnits(pupilDiameterMm(N) / 2 / 1000);
}

// ---------- 成像几何 ----------
// 对焦到 s 时像距 v = 1 / (1/f − 1/s)；副相机的竖直视场按这个像距算（对焦呼吸也就自然带上了）。
export function imageDistanceMm(sM = FOCUS_M) {
  const s = sM * 1000;
  return 1 / (1 / FOCAL_MM - 1 / s);
}
export function vfovRad(sM = FOCUS_M) {
  return 2 * Math.atan(SENSOR_H_MM / 2 / imageDistanceMm(sM));
}
// 对焦平面上的画框半宽 / 半高（场景单位）
export function focusPlaneHalf(sM = FOCUS_M) {
  const hh = mToUnits(sM) * Math.tan(vfovRad(sM) / 2);
  return { hw: hh * (SENSOR_W_MM / SENSOR_H_MM), hh };
}

// 薄透镜累积：副相机在光圈圆盘内偏移 (dx, dy)（相机本地坐标，单位同场景），
// 平移视锥让对焦平面上的画框不动。返回近平面上的 left/right/top/bottom（相对偏移后的相机）。
export function shearedFrustum(dx, dy, near, sM = FOCUS_M) {
  const { hw, hh } = focusPlaneHalf(sM);
  const k = near / mToUnits(sM);
  return { left: (-hw - dx) * k, right: (hw - dx) * k, top: (hh - dy) * k, bottom: (-hh - dy) * k, near };
}
// 用上面的视锥把相机坐标里的点 (y, 深度 d) 投影成 NDC y；页面走 three 的投影矩阵，结果相同。
export function projectNdcY(y, d, dy, fr) {
  const yn = ((y - dy) * fr.near) / d;
  return (2 * yn - (fr.top + fr.bottom)) / (fr.top - fr.bottom);
}

// ---------- 景深 ----------
// 超焦距 H = f²/(N·c) + f；近界 = s(H−f)/(H+s−2f)；远界 = s(H−f)/(H−s)，s ≥ H 时为无穷远。返回米。
export function dofLimitsM(N, sM = FOCUS_M, cMm = COC_MM) {
  const f = FOCAL_MM;
  const s = sM * 1000;
  const H = (f * f) / (N * cMm) + f;
  const near = (s * (H - f)) / (H + s - 2 * f);
  const far = s >= H ? Infinity : (s * (H - f)) / (H - s);
  return { near: near / 1000, far: far / 1000, total: (far - near) / 1000, hyperfocal: H / 1000 };
}
// 景深板：前后边界到入瞳的距离（场景单位）
export function dofBoardUnits(N, sM = FOCUS_M) {
  const d = dofLimitsM(N, sM);
  return { near: mToUnits(d.near), far: Number.isFinite(d.far) ? mToUnits(d.far) : Infinity };
}

// 某距离上点光源在传感器上的模糊圆直径（mm）：A·f·|d−s| / (d·(s−f))，A = 入瞳直径。
export function blurDiscMm(N, dM, sM = FOCUS_M) {
  const f = FOCAL_MM;
  const s = sM * 1000;
  const d = dM * 1000;
  return (pupilDiameterMm(N) * f * Math.abs(d - s)) / (d * (s - f));
}

// ---------- 曝光 ----------
// EV_设置 = log2(N²/t) − log2(ISO/100)；增益 = 2^(EV_场景 − EV_设置)。设置每亮一挡，增益翻倍。
export function evSetting(N, t, iso) {
  return Math.log2((N * N) / t) - Math.log2(iso / 100);
}
export function exposureGain(N, t, iso) {
  return 2 ** (EV_SCENE - evSetting(N, t, iso));
}

// ISO 噪点：示意模型，不是某台相机的实测。标准差 ∝ √(ISO/100)，暗部更明显。
export const NOISE_AT_ISO100 = 0.006;
export function noiseSigma(iso) {
  return NOISE_AT_ISO100 * Math.sqrt(iso / 100);
}

// 快门时间内风车转过的角度（度）
export function windmillSweepDeg(t) {
  return 360 * WINDMILL_REV_PER_S * t;
}

// ---------- 派生：一份 state 出所有显示值 ----------
export function derive(st) {
  const F = F_STOPS[st.f];
  const S = SHUTTERS[st.t];
  const I = ISOS[st.iso];
  const N = F.N;
  const dof = dofLimitsM(N);
  const ev = evSetting(N, S.t, I.iso);
  return {
    F, S, I, N, t: S.t, iso: I.iso,
    pupilMm: pupilDiameterMm(N),
    lensR: lensRadiusUnits(N),
    dof,
    board: dofBoardUnits(N),
    ev,
    stops: EV_SCENE - ev, // >0 过曝，<0 欠曝
    gain: exposureGain(N, S.t, I.iso),
    bulbBlurMm: blurDiscMm(N, SUBJECT.bulbs),
    millBlurMm: blurDiscMm(N, SUBJECT.windmill),
    sweepDeg: windmillSweepDeg(S.t),
    noise: noiseSigma(I.iso),
  };
}

// 最近档位：URL 参数用。
export function nearestIndex(list, key, v) {
  let best = 0;
  let bd = Infinity;
  list.forEach((o, i) => {
    const d = Math.abs(Math.log2(o[key]) - Math.log2(v));
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

export const fmtM = (m) => (m >= 10 ? `${m.toFixed(0)} m` : m >= 1 ? `${m.toFixed(2)} m` : `${(m * 100).toFixed(0)} cm`);
export const fmtLen = (m) => (m < 1 ? `${(m * 100).toFixed(m < 0.1 ? 1 : 0)} cm` : `${m.toFixed(2)} m`);
export const fmtStops = (x) => `${x > 0.05 ? '+' : x < -0.05 ? '−' : '±'}${Math.abs(x).toFixed(1)} 挡`;
