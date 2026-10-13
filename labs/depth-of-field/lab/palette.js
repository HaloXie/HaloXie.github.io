// 景深课的固有色：相机、导轨、人偶、灯串、模拟照片。不随明暗主题变化；随主题变的颜色在 kit/theme.css。

export const BODY = {
  shell: 0x2c3037,
  grip: 0x1b1d21,
  barrel: 0x23262c,
  ring: 0x3d424b,
  glass: 0x7fe7ff,
  tripod: 0x2a2f38,
  rail: 0x1d2129,
  railTop: 0x9aa3ad,
  tick: 0x0d0e10,
  railInk: '#e8edf5',
  railInkDim: '#9aa3ad',
  post: 0x3a4250,
  wire: 0x1b1d21,
};

// 三个人偶外套颜色依次对应 SUBJECTS（近 / 中 / 远）
export const FIGURE = {
  jackets: [0x4f8ad9, 0xffc23d, 0xd9534f],
  skin: 0xf2c6a0,
  pants: 0x2f3a4a,
  hair: 0x3a2a20,
  base: 0x30343b,
};

export const BULBS = [0xffc46b, 0xff7a45, 0xfff0c8, 0x7fd8ff, 0xff8fb8];

// 模拟照片（2D 画布）：夜景街道 + 人物剪影 + 灯串光斑
export const PHOTO = {
  skyTop: '#141a2e',
  skyLow: '#2b3352',
  ground: '#1c1f2a',
  skin: '#e9b892',
  hair: '#3a2a20',
  jackets: ['#4f8ad9', '#ffc23d', '#d9534f'],
  bulbs: ['#ffc46b', '#ff7a45', '#fff0c8', '#7fd8ff', '#ff8fb8'],
};
