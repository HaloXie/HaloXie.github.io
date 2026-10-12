// 梯度下降课的固有色：地形模型的分层设色、底座、小球、坑位标记。不随明暗主题变化。

// 地形顶面按 loss 分层设色（低 → 高），画布插值；等高线与坐标网格压在上面
export const TERRAIN = {
  ramp: ['#1d4e89', '#2f7fb5', '#59b3a6', '#a9cf8a', '#e8d38a', '#e59b5a', '#c8614a'],
  contour: 'rgba(20, 24, 30, 0.38)',
  contourMajor: 'rgba(20, 24, 30, 0.7)',
  grid: 'rgba(255, 255, 255, 0.16)',
};

export const MODEL = {
  side: 0xc29a6e, // 地形侧面：木纹层板色（竖直面受光少，取浅一些）
  sideDark: 0x8a6a4a,
  plinth: 0x22262d,
  plinthTrim: 0x3a404a,
  ball: 0xe9edf2,
  pin: 0x2c3038,
  dot: 0xffffff,
};
