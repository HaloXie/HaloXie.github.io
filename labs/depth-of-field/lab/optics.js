// 景深模型（薄透镜近似，全画幅，弥散圆容许值 c = 0.03mm）。读数、清晰范围板、标签、模拟照片、叙述都从 derive() 派生。
// 内部长度单位 mm；界面上距离用 m。
//   H  = f²/(N·c) + f                       超焦距
//   Dn = s(H−f)/(H+s−2f)                    近点
//   Df = s(H−f)/(H−s)，s ≥ H 时为 ∞          远点
//   b  = f²·|d−s| / (N·d·(s−f))             距离 d 处一个点在传感器上的弥散圆直径

export const C_MM = 0.03;
export const SENSOR_W_MM = 36;
export const SENSOR_H_MM = 24;
export const F_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
export const FOCALS = [24, 35, 50, 85, 135, 200];
export const FOCUS_M = [0.5, 1, 1.5, 2, 3, 4, 5, 6]; // 导轨 0–6m（旧页侧视图的范围）
export const DEFAULTS = { f: 0, focal: 3, focus: 2 }; // f/1.4 · 85mm · 1.5m（旧页默认值）

// 场景里的被摄体：到镜头的距离 d、横向偏移 x（右为正）、高度 h，单位 m。背景灯串固定在 5m（旧页的背景点光源）。
export const SUBJECTS = [
  { key: 'near', name: '近处人偶', d: 1, x: 0.45, h: 1.1 },
  { key: 'mid', name: '中间人偶', d: 1.5, x: 0, h: 1.7 },
  { key: 'far', name: '远处人偶', d: 3, x: -0.6, h: 1.7 },
];
export const BULBS_M = 5;
export const CAM_H_M = 1.5;

export function hyperfocal(f, N) {
  return (f * f) / (N * C_MM) + f;
}
export function nearLimit(f, N, s) {
  const H = hyperfocal(f, N);
  return (s * (H - f)) / (H + s - 2 * f);
}
export function farLimit(f, N, s) {
  const H = hyperfocal(f, N);
  return s >= H ? Infinity : (s * (H - f)) / (H - s);
}
export function blurMm(f, N, s, d) {
  return (f * f * Math.abs(d - s)) / (N * d * (s - f));
}

// st = { f, focal, focus }（各自是挡位下标）
export function derive(st) {
  const N = F_STOPS[st.f];
  const f = FOCALS[st.focal];
  const sM = FOCUS_M[st.focus];
  const s = sM * 1000;
  const H = hyperfocal(f, N);
  const near = nearLimit(f, N, s);
  const far = farLimit(f, N, s);
  const dof = far === Infinity ? Infinity : far - near;
  const blurAt = (dM) => blurMm(f, N, s, dM * 1000);
  const subjects = SUBJECTS.map((o) => {
    const b = blurAt(o.d);
    return { ...o, blur: b, sharp: b <= C_MM };
  });
  return { N, f, sM, s, H, near, far, dof, pupilMm: f / N, subjects, bulbBlur: blurAt(BULBS_M) };
}

export function fmtM(mm) {
  if (mm === Infinity) return '无穷远';
  const m = mm / 1000;
  return m < 10 ? `${m.toFixed(2)} m` : `${m.toFixed(1)} m`;
}
export function fmtDof(mm) {
  if (mm === Infinity) return '到无穷远';
  const m = mm / 1000;
  return m < 1 ? `${(m * 100).toFixed(1)} cm` : `${m.toFixed(2)} m`;
}
