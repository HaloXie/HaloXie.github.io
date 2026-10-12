// 从 theme.css 的 --exploded-* token 取值给 three.js 用；token 变了（切明暗、宿主覆盖）就回调。
// 颜色经浏览器解析再读像素，所以 token 可以写任何 CSS 颜色语法（hex、rgb()、color-mix()…）。
import * as THREE from 'three';

const root = document.documentElement;
let probe = null;
let ctx = null;

// 解析一个 CSS 颜色表达式为 THREE.Color（忽略 alpha）。
export function cssColor(expr) {
  if (!probe) {
    probe = document.createElement('i');
    probe.style.display = 'none';
    document.body.append(probe);
    ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  }
  probe.style.color = '';
  probe.style.color = expr;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = getComputedStyle(probe).color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

export function token(name) {
  return getComputedStyle(root).getPropertyValue(`--exploded-${name}`).trim();
}
export const color = (name) => cssColor(`var(--exploded-${name})`);
export function number(name) {
  const v = Number.parseFloat(token(name));
  if (!Number.isFinite(v)) throw new Error(`exploded token --exploded-${name} 不是数字：「${token(name)}」`);
  return v;
}

export function readTheme() {
  return {
    scheme: root.dataset.explodedScheme === 'dark' ? 'dark' : 'light',
    font: token('font'),
    mono: token('mono'),
    bg: color('bg'),
    wall: color('wall'),
    wallLo: color('wall-lo'),
    trim: color('trim'),
    floor: color('floor'),
    wood: color('wood'),
    steel: color('steel'),
    steelLo: color('steel-lo'),
    lampWarm: color('lamp-warm'),
    lampCool: color('lamp-cool'),
    lampGlow: number('lamp-glow'),
    hemiSky: color('hemi-sky'),
    hemiGround: color('hemi-ground'),
    keyColor: color('key-color'),
    fillColor: color('fill-color'),
    rimColor: color('rim-color'),
    hemi: number('hemi'),
    key: number('key'),
    fill: number('fill'),
    rim: number('rim'),
    env: number('env'),
    exposure: number('exposure'),
    bloom: number('bloom'),
    bloomThreshold: number('bloom-threshold'),
    fogNear: number('fog-near'),
    fogFar: number('fog-far'),
  };
}

// 明暗切换或宿主改 <html style> 上的 token 时回调；同一帧内多次变化只回调一次。
export function onThemeChange(fn) {
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(readTheme());
    });
  }).observe(root, { attributes: true, attributeFilter: ['data-exploded-scheme', 'style'] });
}
