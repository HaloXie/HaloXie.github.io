// 梯度下降的唯一模型：损失面、解析梯度、一步更新、结局判定。读数、小球、轨迹、叙述都从这里派生。
// f(x,y) = 0.1(x²+y²) − 1.2·exp(−((x−1.5)²+(y−1)²)) − 0.8·exp(−((x+1.5)²+(y+1.2)²))

export const RANGE = 4; // 地形模型覆盖 [-4, 4]²
export const OUT = RANGE * 1.6; // 冲出这个范围算发散
export const MOMENTUM = 0.85;
export const LRS = [0.01, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1.2];
export const DEFAULTS = { lr: 3, x: 2.5, y: 2.5 };

export function loss(x, y) {
  const a = Math.exp(-((x - 1.5) ** 2 + (y - 1) ** 2));
  const b = Math.exp(-((x + 1.5) ** 2 + (y + 1.2) ** 2));
  return 0.1 * (x * x + y * y) - 1.2 * a - 0.8 * b;
}

export function grad(x, y) {
  const a = Math.exp(-((x - 1.5) ** 2 + (y - 1) ** 2));
  const b = Math.exp(-((x + 1.5) ** 2 + (y + 1.2) ** 2));
  return [
    0.2 * x + 2.4 * a * (x - 1.5) + 1.6 * b * (x + 1.5),
    0.2 * y + 2.4 * a * (y - 1) + 1.6 * b * (y + 1.2),
  ];
}

// 在 (cx, cy) 周围 ±r 的网格上找最低点
function gridMin(cx, cy, r, n) {
  let best = { x: cx, y: cy, loss: loss(cx, cy) };
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const x = cx - r + (2 * r * i) / n;
      const y = cy - r + (2 * r * j) / n;
      const l = loss(x, y);
      if (l < best.loss) best = { x, y, loss: l };
    }
  }
  return best;
}
export const GLOBAL_MIN = gridMin(0, 0, RANGE, 400);
export const LOCAL_MIN = gridMin(-1.5, -1.2, 0.8, 200);

export function start(x, y) {
  return { x, y, vx: 0, vy: 0, step: 0, history: [loss(x, y)], outcome: null };
}

// 一步更新（不改入参）；momentum = true 时走带速度的版本
export function step(s, lr, momentum) {
  const [gx, gy] = grad(s.x, s.y);
  const vx = momentum ? MOMENTUM * s.vx - lr * gx : -lr * gx;
  const vy = momentum ? MOMENTUM * s.vy - lr * gy : -lr * gy;
  const n = { ...s, x: s.x + vx, y: s.y + vy, vx, vy, step: s.step + 1 };
  n.history = [...s.history, loss(n.x, n.y)].slice(-400);
  n.outcome = outcome(n);
  return n;
}

// 结局：'global' | 'local' | 'diverge' | 'oscillate' | 'slow'（步子太小，上限内没走到底）| null（还在走）
export function outcome(s) {
  if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || Math.abs(s.x) > OUT || Math.abs(s.y) > OUT) return 'diverge';
  const recent = s.history.slice(-8);
  const stable = recent.length >= 6 && Math.max(...recent) - Math.min(...recent) < 0.0008;
  if (Math.hypot(...grad(s.x, s.y)) < 0.01 && stable) return Math.hypot(s.x - GLOBAL_MIN.x, s.y - GLOBAL_MIN.y) < 0.35 ? 'global' : 'local';
  // 步数到上限：loss 还在单调下降是走得慢，否则是在坑两侧来回震荡
  if ((s.step >= 120 && stable) || s.step >= 180) return recent.every((l, i) => i === 0 || l <= recent[i - 1]) ? 'slow' : 'oscillate';
  return null;
}

export function run(s, lr, momentum, max = 400) {
  let c = s;
  while (!c.outcome && c.step < max) c = step(c, lr, momentum);
  return c;
}
