// WebAudio 合成快门声：两次带通噪声 click（前帘 / 后帘）+ 一个低频"咚"。无音频文件，默认静音。
let ctx = null;
let noise = null;

function ensure() {
  if (ctx) return ctx;
  ctx = new AudioContext();
  const len = Math.floor(ctx.sampleRate * 0.05);
  noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  return ctx;
}

function click(at, freq, gain) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(at);
}

function thump(at) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(140, at);
  o.frequency.exponentialRampToValueAtTime(55, at + 0.08);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.35, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.1);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + 0.12);
}

export function unlockAudio() {
  ensure();
  if (ctx.state === 'suspended') ctx.resume();
}

// frontDelay / rearDelay：秒，与动画时间线一致
export function playShutter(frontDelay, rearDelay) {
  ensure();
  const t0 = ctx.currentTime + 0.01;
  click(t0 + frontDelay, 2600, 0.9);
  thump(t0 + frontDelay);
  click(t0 + rearDelay, 3400, 0.7);
}
