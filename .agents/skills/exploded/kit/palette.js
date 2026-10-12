// kit 自带物件的固有色：不随明暗变化（黑色旋钮在哪种房间里都是黑的）。
// 随明暗变的颜色一律走 theme.css 的 token；这里和 theme.css 是 kit 里仅有的两处颜色字面量。

// 发光强调色（3D 里进 bloom 的灯带、指针、刻度）
export const ORANGE = 0xff8a2a;
export const CYAN = 0x3fe0ff;
export const GREEN = 0x7dffa8;
export const YELLOW = 0xffd24a;
export const RED = 0xe0413a;

// 操作件：底座、旋钮、表盘
export const CONTROL = {
  base: 0x1a1e25,
  body: 0x2c313a,
  cap: 0x444b57,
  grip: 0x16191e,
  bezelRing: 0x8a93a3,
  hub: 0xdddddd,
  ink: '#e8edf5',
  inkDim: 'rgba(255,255,255,0.55)',
  inkSoft: '#9fb3c8',
  inkStrong: '#ffffff',
  faceHi: '#223044',
  faceLo: '#0d131d',
  arcLow: 'rgba(63,160,255,0.55)',
  arcOk: 'rgba(125,255,168,0.9)',
  arcHigh: 'rgba(255,120,80,0.6)',
};

// 房间陈设：墙上架子的小物件、低多边形松树
export const DECOR = {
  shelf: [0xe0dcd2, 0xff8a2a, 0x3a4250, 0x7a9cc6],
  pine: [0x2f7a4a, 0x3b8f58, 0x4ea463],
  trunk: 0x6b4a33,
};
