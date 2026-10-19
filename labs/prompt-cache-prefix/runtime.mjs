// Inlined by build.mjs after the shared model; React owns the controls.
import { mountButton } from '../shared/antd-controls.mjs';
const english = new URLSearchParams(window.location.search).get('lang') === 'en';
const t = text => translate(text, english);
if (english) {
  document.documentElement.lang = 'en';
  document.title = t(document.title);
  const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) walker.currentNode.textContent = t(walker.currentNode.textContent);
  document.querySelectorAll('[aria-label], [title]').forEach(element => {
    for (const attribute of ['aria-label', 'title']) {
      if (element.hasAttribute(attribute)) element.setAttribute(attribute, t(element.getAttribute(attribute)));
    }
  });
  document.querySelector('.topbar a').href = '/en/posts/general/prompt-cache-prefix/';
}
const plate = document.querySelector('.iso-plate');
const items = [...document.querySelectorAll('[data-item]')];
const machine = document.querySelector('#machine');
const readout = document.querySelector('[data-readout]');
const cards = [...document.querySelectorAll('.machine-card')];
const buttons = [...document.querySelectorAll('[data-change]')];
const status = [...document.querySelectorAll('[data-status] em')];
const tourButton = document.querySelector('#tour');
const announcement = document.querySelector('#announcement');
announcement.textContent = localizedDescription(model(CONFIG.initialChange), english);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let state = model(CONFIG.initialChange);
let targetState = state;
let share = state.matchedSegments / GEOMETRY.count;
let target = share;
let visible = false, frame = 0, last = 0, idle = 0;
let touring = !embedded && !reduced.matches, held = false;
const tourChoices = [CONFIG.initialChange, 0, CONFIG.labels.length - 1, null];
let tourIndex = 0;
const changeControls = buttons.map(button => ({
  value: button.dataset.change,
  control: mountButton(button, () => choose(button.dataset.change === 'none' ? null : Number(button.dataset.change), true)),
}));
const tourControl = mountButton(tourButton, () => { touring = !touring; idle = 0; setTourLabel(); run(); });

function renderPosition() {
  const [x, y] = GEOMETRY.translation.map(value => value * share);
  for (const item of items) if (item.dataset.moving === 'true') item.setAttribute('transform', `translate(${x} ${y})`);
  const ordered = [...items].sort((a, b) => (+a.dataset.key + (a.dataset.moving === 'true' ? GEOMETRY.depthTravel * share : 0)) - (+b.dataset.key + (b.dataset.moving === 'true' ? GEOMETRY.depthTravel * share : 0)));
  ordered.forEach(item => machine.append(item));
}
function commit() {
  state = targetState;
  readout.textContent = localizedDescription(state, english);
  plate.dataset.hitTokens = state.hitTokens;
  plate.dataset.recomputeTokens = state.recomputeTokens;
  plate.dataset.relativeCost = state.relativeCost;
  state.segments.forEach((segment, index) => {
    cards[index].dataset.hit = segment.hit;
    cards[index].dataset.changed = segment.changed;
    status[index].textContent = t(segment.hit ? '命中' : segment.changed ? '改动起点 · 重算' : '未改动 · 仍重算');
  });
  if (!touring) announcement.textContent = localizedDescription(state, english);
}
function choose(change, human = false) {
  if (human) { touring = false; setTourLabel(); }
  idle = 0;
  targetState = model(change);
  target = targetState.matchedSegments / GEOMETRY.count;
  changeControls.forEach(({value, control}) => control.update({ pressed: value === (change === null ? 'none' : String(change)) }));
  if (reduced.matches) { share = target; renderPosition(); commit(); }
  else if (Math.abs(target - share) > 0.0001) readout.textContent = t('校验头定位中…');
  else commit();
  run();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
  last = now;
  if (!visible || document.hidden) { frame = 0; return; }
  if (touring && !held && !reduced.matches) {
    idle += dt;
    if (idle > 4.8) { tourIndex = (tourIndex + 1) % tourChoices.length; choose(tourChoices[tourIndex]); }
  }
  if (Math.abs(target - share) > 0.0001) {
    share += (target - share) * (1 - Math.exp(-dt / 0.2));
    if (Math.abs(target - share) < 0.0001) { share = target; commit(); }
    renderPosition();
  }
  frame = (touring || share !== target) && !reduced.matches ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible && !document.hidden) { last = 0; frame = requestAnimationFrame(tick); } }
function setTourLabel() {
  tourControl.update({ disabled: reduced.matches, label: t(reduced.matches ? '减少动态效果：自动演示已关闭' : touring ? '暂停自动演示' : '播放自动演示'), pressed: touring });
}
plate.addEventListener('pointerenter', () => { held = true; });
plate.addEventListener('pointerleave', () => { held = false; idle = 0; run(); });
document.querySelector('.controls').addEventListener('focusin', () => { held = true; });
document.querySelector('.controls').addEventListener('focusout', () => { held = false; idle = 0; run(); });
new IntersectionObserver(entries => { visible = entries.at(-1).isIntersecting; if (visible) run(); }, { rootMargin: '0px' }).observe(plate);
document.addEventListener('visibilitychange', run);
reduced.addEventListener('change', () => { if (reduced.matches) { touring = false; share = target; renderPosition(); commit(); setTourLabel(); } else run(); });
setTourLabel();
commit();
