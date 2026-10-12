import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from '../../.agents/skills/anatomy/kit/iso-kit.mjs';
import * as A from '../../.agents/skills/anatomy/kit/audit.mjs';
import { CONFIG, model, describe } from './model.mjs';

// Figure: a paper-card comparator; its carriage stops at the reusable prefix.
// Parts: 8 feet, bed/base, 2 rails, 4 stops, 4 cards, 16 clamps,
// 8 locating pins, ruler, 9 carriage parts, 2 nameplate parts = 56 solids.
const HERE = dirname(fileURLToPath(import.meta.url));
const width = 960, height = 430;
const base = { x: -124, y: -59, w: 274, d: 118, r: 7 };
const travel = 200;
const start = -88;
const step = travel / CONFIG.labels.length;
const P = k.fitProjection(k.boxCorners(base, -17, 29), width, height, { pad: 40, azimuth: 60, elevation: 36 });
const R = A.recorder(P, { order: ['scanner'], spring: { stiffness: 120, damping: 22 } });
const line = (d, tone = 'faint') => k.lineSvg(d, { tone });
const dot = (x, y, z, size = 0.55) => k.dotsSvg([k.iso([x, y, z], P)], { size, tone: 'mid' });

function slab(name, plan, z, h, { tone = 'mid', piece = '', lit = false, inner = '', after = '', attrs = '' } = {}) {
  const shape = R.solid(A.slab(plan, z, h, { name }, 6));
  const svg = `<g ${attrs}>${k.solidSvg(k.slabOf(plan, z, h, P, 6, Math.min(0.7, h / 3)), { tone, lit, inner })}${after}</g>`;
  R.put({ name, piece, at: [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], move: piece ? [travel, 0, 0] : [0, 0, 0], svg, shapes: [shape] });
}
function cylinder(name, x, y, radius, z, h, { piece = '', tone = 'mid' } = {}) {
  const shape = R.solid(A.cylinder(x, y, radius, z, h, { name }));
  const inner = line(k.knurl(x, y, radius, z, z + h, 20, P), 'lo');
  const svg = k.solidSvg(k.cylinder(x, y, radius, z, h, P, 32, 0.4), { tone, inner }) + dot(x, y, z + h);
  R.put({ name, piece, at: [x, y, z + h / 2], move: piece ? [travel, 0, 0] : [0, 0, 0], svg, shapes: [shape] });
}

for (const [index, [x, y]] of k.corners(base, 17).entries()) {
  slab(`stand.foot-${index}`, { x: x - 7, y: y - 7, w: 14, d: 14, r: 3 }, -17, 3, { tone: 'lo' });
  slab(`foot-neck-${index}`, { x: x - 5, y: y - 5, w: 10, d: 10, r: 2 }, -14, 5, { tone: 'lo' });
}
slab('base', base, -9, 9, {
  tone: 'lo',
  inner: line(k.sideSeam(base, -5, P, 6)),
  after: line(k.planOutline(k.insetPlan(base, 4), 0, P, 6)) + k.corners(base, 9).map(([x, y]) => line(k.ring(x, y, 2, 0, P), 'lo') + dot(x, y, 0)).join(''),
});
slab('bed', { x: -94, y: -24, w: 212, d: 48, r: 2 }, 0, 1, { tone: 'lo' });
for (const y of [-39, 33]) {
  slab(`rail-${y}`, { x: -104, y, w: 228, d: 6, r: 1 }, 0, 6);
  for (const x of [-111, 124]) slab(`stop-${x}-${y}`, { x, y: y - 2, w: 7, d: 10, r: 1 }, 0, 10, { after: dot(x + 3.5, y + 3, 10) });
}
const initial = model(CONFIG.initialChange);
for (let i = 0; i < CONFIG.labels.length; i++) {
  const x = start + i * step + 1;
  const plan = { x, y: -23, w: step - 3, d: 46, r: 1 };
  const rules = Array.from({ length: 7 }, (_, row) => k.lineSvg(k.lineOnTop([x + 6, -14 + row * 4.5], [x + 30 + (row % 3) * 5, -14 + row * 4.5], 2.4, P), { tone: 'lo', free: true })).join('');
  const altered = `<g class="token-change">${line(k.planOutline({ x: x + 4, y: -17, w: 5, d: 5, r: 0.5 }, 2.4, P), 'hi')}</g>`;
  slab(`card-${i}`, plan, 1, 1.4, { tone: 'hi', after: rules + altered, attrs: `class="machine-card" data-index="${i}" data-hit="${initial.segments[i].hit}" data-changed="${initial.segments[i].changed}"` });
  for (const y of [-28, 25]) {
    for (const offset of [7, step - 10]) {
      slab(`clamp-${i}-${y}-${offset}`, { x: x + offset, y, w: 3, d: 3, r: 0.4 }, 0, 2.4, { tone: 'lo', after: dot(x + offset + 1.5, y + 1.5, 2.4, 0.45) });
    }
    cylinder(`pin-${i}-${y}`, x + 24, y + 1.5, 1.25, 0, 2.4, { tone: 'lo' });
  }
}
const ruler = { x: -94, y: 45, w: 212, d: 6, r: 0.4 };
const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 5, 5, ruler.y, 0.5, [2.2, 4], P);
slab('ruler', ruler, 0, 0.5, { tone: 'lo', after: line(ticks.minor, 'lo') + line(ticks.major, 'mid') });
const plate = { x: 123, y: -20, w: 18, d: 33, r: 1 };
slab('nameplate', plate, 0, 0.6, { tone: 'lo', after: line(k.planOutline(k.insetPlan(plate, 2), 0.6, P), 'lo') + dot(132, -17, 0.6) + dot(132, 10, 0.6) });
slab('switch', { x: 128, y: -10, w: 8, d: 13, r: 1 }, 0.6, 3, { tone: 'hi', after: line(k.planOutline({ x: 130, y: -8, w: 4, d: 3, r: 0.5 }, 3.6, P), 'mid') });
for (const y of [-39, 33]) {
  slab(`scanner.skid-${y}`, { x: start - 6, y, w: 12, d: 6, r: 1 }, 6, 3, { piece: 'scanner' });
  slab(`scanner.leg-${y}`, { x: start - 4, y, w: 8, d: 6, r: 0.8 }, 9, 13, { piece: 'scanner' });
  cylinder(`scanner.knob-${y}`, start, y + 3, 3, 26, 3, { piece: 'scanner' });
}
slab('scanner.bridge', { x: start - 6, y: -39, w: 12, d: 78, r: 1 }, 22, 4, { piece: 'scanner', after: line(k.planOutline({ x: start - 3, y: -26, w: 6, d: 52, r: 1 }, 26, P), 'lo') });
slab('scanner.head', { x: start - 3, y: -23, w: 6, d: 46, r: 0.6 }, 15, 7, { piece: 'scanner', tone: 'hi', lit: true });
slab('scanner.sensor', { x: start - 1.5, y: -18, w: 3, d: 36, r: 0.3 }, 13, 2, { piece: 'scanner', tone: 'hi' });

A.settle(R, P);
const depthTravel = k.depthOf([travel, 0, 0], P);
const share = initial.matchedSegments / CONFIG.labels.length;
const sorted = [...R.items].sort((a, b) => (a.key + (a.piece ? depthTravel * share : 0)) - (b.key + (b.piece ? depthTravel * share : 0)));
const machine = `<path class="iso-halo" d="${k.haloOf(base, -17, 9, P)}"/>` + sorted.map(item => `<g data-item="${item.name}" data-key="${item.key}" data-moving="${Boolean(item.piece)}" transform="${k.translateAlong(P, [item.piece ? travel * share : 0, 0, 0])}">${item.svg}</g>`).join('');
const svg = k.figureSvg({ width, height, label: '纸带校验机：橙色校验头停在第一个改动之前。边界前的连续前缀可复用，边界后的卡片需要重新计算。', body: `<g id="machine">${machine}</g>` });
const status = initial.segments.map(segment => `<span data-status="${segment.index}"><b>${segment.index + 1} · ${segment.label}</b><em>${segment.hit ? '命中' : segment.changed ? '改动起点 · 重算' : '未改动 · 仍重算'}</em></span>`).join('');
const plateHtml = k.plateHtml({
  fig: '图 1', title: '前缀校验机', hint: '校验头停在可复用前缀的边界', readout: describe(initial),
  keys: [{ mark: 'lit', label: '橙色校验头：前缀命中边界' }, { mark: 'raised', label: '深色卡片：从改动处开始重算' }],
  caption: `教学模型：${CONFIG.labels.length} 段等长输入，每段 ${CONFIG.segmentTokens.toLocaleString('en-US')} token。改动所选段的首个 token；未改动的后缀也不能单独接回原缓存。`,
  body: `<div class="iso-stage">${svg}</div><div class="card-status">${status}</div>`,
});
const buttons = CONFIG.labels.map((label, index) => `<button type="button" data-change="${index}" aria-pressed="${index === CONFIG.initialChange}">改第 ${index + 1} 段：${label}</button>`).join('');
const body = `<nav class="topbar"><a href="/posts/general/prompt-cache-prefix/">← 返回文章</a><span>交互解释图 · Prompt caching</span></nav><header><h1>改动一个 token，缓存停在哪里？</h1><p class="intro">从左到右沿用同一段前缀。改变一张卡片的开头，校验头就停在它前面；后面的文字即使没变，也要重新计算。</p></header>${plateHtml}<section class="controls" aria-label="改变提示内容"><p>选择一段，改动它的首个 token：</p><div class="buttons">${buttons}<button type="button" data-change="none" aria-pressed="false">完全不改</button></div><button type="button" class="tour" id="tour" aria-pressed="true">暂停自动演示</button><p class="sr-only" id="announcement" role="status" aria-live="polite">${describe(initial)}</p></section><section class="assumptions"><h2>这台机器假设了什么</h2><p>每个段末的前缀都已经缓存、仍然有效，本次也能查询这些边界。卡片只是教学分段，不代表厂商真实 block 大小或断点规则。一次只修改所选段的首个 token，输入总长度不变。</p><p>相对成本只比较本次输入的「缓存读取 + 普通重算」，以完全未命中的输入成本为 ${Math.round(model(0).relativeCost * 100)}%。读取倍率取 ${CONFIG.readMultiplier}，对应 <a href="${CONFIG.source}">Anthropic Claude Sonnet 4.6 的缓存读取价 / 普通输入价</a>（查证：${CONFIG.checkedOn}）。不含首次缓存写入、写入溢价及输出费用，不是完整请求账单。</p><p>来源：确定性 SVG（anatomy skill）。所有 token 与成本读数由同一个模型函数生成。</p></section>`;
const css = readFileSync(join(HERE, 'style.css'), 'utf8');
const embedCss = readFileSync(join(HERE, 'embed.css'), 'utf8');
const embedCode = readFileSync(join(HERE, 'embed.mjs'), 'utf8');
const modelCode = readFileSync(join(HERE, 'model.mjs'), 'utf8').replaceAll('export ', '');
const runtime = readFileSync(join(HERE, 'runtime.mjs'), 'utf8');
const endProjection = k.iso([travel, 0, 0], P);
const translation = endProjection.map((value, index) => value - P.origin[index]);
const data = { translation, depthTravel, count: CONFIG.labels.length };
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>前缀校验机 · Prompt caching</title><style>${k.ISO_CSS}\n${css}\n${embedCss}</style></head><body class="iso" data-theme="light"><main>${body}</main><script type="module">${modelCode}\nconst GEOMETRY = ${JSON.stringify(data)};\n${embedCode}\n${runtime}</script></body></html>`;
writeFileSync(join(HERE, 'index.html'), html);
const imageDir = join(HERE, '../../assets/img/prompt-cache-prefix');
mkdirSync(imageDir, { recursive: true });
const escaped = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const snapshot = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" class="iso" data-theme="light"><style>${k.ISO_CSS}${css}</style><rect width="1200" height="675" fill="#f6f0df"/><g font-family="system-ui,-apple-system,PingFang SC,sans-serif" fill="#393831"><text x="38" y="46" font-size="18">图 1</text><text x="1162" y="46" text-anchor="end" font-size="24">前缀校验机</text><g transform="translate(100 78) scale(1.04)">${machine}</g>${initial.segments.map((s,i)=>`<text x="${180+i*280}" y="550" text-anchor="middle" font-size="20">${i+1} · ${s.label}</text><text x="${180+i*280}" y="580" text-anchor="middle" font-size="16">${s.hit?'命中':s.changed?'改动起点 · 重算':'未改动 · 仍重算'}</text>`).join('')}<text x="38" y="637" font-size="18">校验头停在可复用前缀的边界</text><text x="1162" y="637" text-anchor="end" font-size="17">${escaped(describe(initial))}</text></g></svg>`;
writeFileSync(join(imageDir, 'prefix-machine.svg'), snapshot);
console.log(`wrote index.html and prefix-machine.svg · ${R.solids.length} solids`);
A.auditOrExit(R, P);
