import { SCENARIOS, stateAt, type Candidate } from './model.ts';
import { translate } from './locale.ts';
import { mountButton } from '../shared/antd-controls.mjs';

const english = new URLSearchParams(location.search).get('lang') === 'en';
const t = (text: string) => translate(text, english);
if (english) {
  document.documentElement.lang = 'en';
  document.title = t(document.title);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script, noscript')) continue;
    node.textContent = t(node.textContent ?? '');
  }
  for (const node of document.querySelectorAll('[aria-label]')) node.setAttribute('aria-label', t(node.getAttribute('aria-label')!));
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a')) {
    if (link.pathname === '/posts/general/sprint-git-flow/') link.pathname = '/en/posts/general/sprint-git-flow/';
    else if (link.pathname === '/labs/sprint-git-flow/') link.search = '?lang=en';
  }
}

function element<T extends HTMLElement>(id: string, type: { new(): T }): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`Missing element: ${id}`);
  return found;
}
const play = element('play', HTMLButtonElement);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const STEP_MS = 6500; // Enough time to read each short step; manual stepping is the default.
let scenario = SCENARIOS[0];
let index = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const priorCards = new Map<string, string>();
const controls = new Map<string, ReturnType<typeof mountButton>>();
const scenarioControls = new Map<string, ReturnType<typeof mountButton>>();

function stop() {
  clearInterval(timer);
  timer = undefined;
  controls.get('play')?.update({ label: t('播放'), pressed: false });
  controls.get('pause-bottom')?.update({ disabled: true });
}

function card(id: string, title: string, contents: string[], detail: string, explanation: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card';
  button.dataset.card = id;
  const heading = document.createElement('strong');
  heading.textContent = t(title);
  const chips = document.createElement('span');
  chips.className = 'chips';
  for (const content of contents) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = t(content);
    chips.append(chip);
  }
  const caption = document.createElement('small');
  caption.textContent = t(detail);
  button.append(heading, chips, caption);
  const signature = JSON.stringify([contents, detail]);
  const changed = priorCards.has(id) && priorCards.get(id) !== signature;
  button.dataset.changed = String(changed);
  priorCards.set(id, signature);
  button.setAttribute('aria-expanded', 'false');
  const inspection = document.createElement('span');
  inspection.className = 'inspection';
  inspection.textContent = t(explanation);
  inspection.hidden = true;
  button.append(inspection);
  button.addEventListener('click', () => {
    inspection.hidden = !inspection.hidden;
    button.setAttribute('aria-expanded', String(!inspection.hidden));
  });
  return button;
}

function artifactLabel(candidate: Candidate | null) {
  if (!candidate) return t('尚未选择候选');
  return `${candidate.tag} · ${candidate.artifact} · ${t(candidate.verified ? 'gray 已通过' : 'gray 未通过放行')}`;
}

function render() {
  const state = stateAt(scenario, index);
  const step = scenario.steps[index];
  element('question', HTMLElement).textContent = t(scenario.question);
  element('step-title', HTMLElement).textContent = t(step.title);
  element('explanation', HTMLElement).textContent = t(step.explanation);
  element('action', HTMLElement).textContent = t(step.action);
  element('progress', HTMLElement).textContent = `${index + 1} / ${scenario.steps.length}`;
  element('progress-bottom', HTMLElement).textContent = `${index + 1} / ${scenario.steps.length} · ${t(step.title)}`;
  element('explanation-bottom', HTMLElement).textContent = t(step.explanation);
  const atStart = index === 0;
  const atEnd = index === scenario.steps.length - 1;
  for (const id of ['previous', 'previous-bottom']) controls.get(id)?.update({ disabled: atStart });
  for (const id of ['next', 'next-bottom']) controls.get(id)?.update({ disabled: atEnd });
  controls.get('play')?.update({ disabled: reduced.matches || atEnd });
  element('branches', HTMLElement).replaceChildren(
    card('main', 'main · 生产候选基线', state.main, '只接收已放行的原开发分支', '合并只改变代码基线，不会自动改变生产。tag 固定选定的提交，不会排除已合入的其他功能。'),
    card('work', '原开发分支 · 保留各自改动', state.branches.length ? state.branches : ['本场景无在开发分支'], 'A / B 是功能；H / F 是修复', '这是多条独立分支的清单。测试失败回对应分支修复，最终由原分支发起 MR。'),
    card('develop', 'develop · 共享测试组合', state.develop, '随 Sprint 协调重建', '这里只组织测试组合；不能把它整体合回 main。重建前保存必要修复和未完成工作。'),
  );
  element('environments', HTMLElement).replaceChildren(
    card('test', '测试环境 · 部署 develop', [state.test], '测试结论绑定版本', '组合变化或提交变化就要重新验证；A + B 通过不能证明 A 独立成立。'),
    card('gray', 'gray · 发布前验证环境', state.candidate?.contents ?? ['无候选'], artifactLabel(state.candidate), 'gray 运行候选 tag 构建的产物。未通过不得晋级；修复后创建新 tag，不移动旧 tag。'),
    card('production', '生产 · 当前运行产物', state.production.contents, `${state.production.tag} · ${state.production.artifact}`, '只部署通过 gray 的同一产物，并检查运行结果；恢复产物前检查数据、消息格式及副作用兼容性。'),
  );
  for (const [id, control] of scenarioControls) control.update({ pressed: id === scenario.id });
  if (atEnd) stop();
}

for (const choice of SCENARIOS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = t(choice.label);
  button.dataset.scenario = choice.id;
  element('scenarios', HTMLElement).append(button);
  scenarioControls.set(choice.id, mountButton(button, () => { stop(); scenario = choice; index = 0; priorCards.clear(); render(); }));
}
const back = () => { stop(); index = Math.max(0, index - 1); render(); };
const forward = () => { stop(); index = Math.min(scenario.steps.length - 1, index + 1); render(); };
for (const id of ['previous', 'previous-bottom']) controls.set(id, mountButton(element(id, HTMLButtonElement), back));
for (const id of ['next', 'next-bottom']) controls.set(id, mountButton(element(id, HTMLButtonElement), forward));
controls.set('pause-bottom', mountButton(element('pause-bottom', HTMLButtonElement), stop));
controls.set('reset', mountButton(element('reset', HTMLButtonElement), () => { stop(); index = 0; priorCards.clear(); render(); }));
controls.set('play', mountButton(play, () => {
  if (timer !== undefined) return stop();
  controls.get('play')?.update({ label: t('暂停'), pressed: true });
  controls.get('pause-bottom')?.update({ disabled: false });
  timer = setInterval(() => { index = Math.min(scenario.steps.length - 1, index + 1); render(); }, STEP_MS);
}));
reduced.addEventListener('change', () => { stop(); render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }).observe(document.querySelector('main')!);

if (new URLSearchParams(location.search).get('embed') === '1') {
  document.documentElement.dataset.embed = 'true';
  const host = window.frameElement;
  if (host) {
    const main = document.querySelector('main')!;
    const resize = () => { host.setAttribute('height', String(Math.ceil(main.getBoundingClientRect().height))); };
    new ResizeObserver(resize).observe(main);
    document.fonts.ready.then(resize);
  }
}
stop();
render();
