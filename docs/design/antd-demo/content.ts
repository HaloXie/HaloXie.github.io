// Static article enhancement; navigation, search, and preference controls belong to React.
type Day = {format(pattern: string): string};
declare global {
  interface Window {
    dayjs?: {locale(value: string): void; extend(plugin: unknown): void; unix(value: number): Day};
    dayjs_plugin_localizedFormat?: unknown;
    tocbot?: {init(options: Record<string, unknown>): void; destroy(): void};
    GLightbox?: (options: {selector: string}) => {destroy(): void};
    mermaid?: {initialize(options: Record<string, unknown>): void; run(options: {nodes: HTMLElement[]}): Promise<void>};
  }
}

function enhanceDates(root: ParentNode = document) {
  if (!window.dayjs) return;
  window.dayjs.locale(document.documentElement.lang.split('-')[0]);
  if (window.dayjs_plugin_localizedFormat) window.dayjs.extend(window.dayjs_plugin_localizedFormat);
  root.querySelectorAll<HTMLElement>('time[data-ts]').forEach(element => {
    const date = window.dayjs!.unix(Number(element.dataset.ts));
    element.textContent = date.format(element.dataset.df || 'YYYY-MM-DD');
    element.title = date.format('llll');
  });
}

const watchedImages = new WeakSet<HTMLImageElement>();
function enhanceImages(root: ParentNode = document) {
  root.querySelectorAll<HTMLImageElement>(root === document ? 'article img' : 'img').forEach(image => {
    if (watchedImages.has(image)) return;
    watchedImages.add(image);
    const reveal = () => image.parentElement?.classList.remove('shimmer','blur');
    image.addEventListener('load',reveal);
    image.addEventListener('error',reveal);
    // Refactored LQIP markup starts with a preview src and keeps the full image in data-src.
    const source = image.getAttribute('data-src');
    if (source) {image.src=encodeURI(source);image.removeAttribute('data-src');}
    if (image.complete && image.getAttribute('src')) reveal();
  });
}

function enhanceCopy() {
  const english = document.documentElement.lang === 'en';
  const status = document.createElement('span');
  status.className = 'visually-hidden';
  status.setAttribute('role','status');
  document.body.append(status);
  document.querySelectorAll<HTMLButtonElement>('.code-header > button, #copy-link').forEach(button => {
    button.addEventListener('click', async () => {
      const code = button.parentElement?.nextElementSibling;
      const text = button.id === 'copy-link' ? location.href : (code?.querySelector('.rouge-code') || code?.querySelector('code'))?.textContent;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = button.dataset.titleSucceed || (english ? 'Copied' : '已复制');
      } catch {
        status.textContent = english ? 'Copy failed. Select and copy the text manually.' : '复制失败，请选中文本手动复制。';
      }
      button.title = status.textContent;
    });
  });
}

function enhanceToc() {
  const popup = document.querySelector<HTMLDialogElement>('#toc-popup');
  if (!window.tocbot || !document.querySelector('#toc')) return;
  const desktop = matchMedia('(min-width: 1200px)');
  let opener: HTMLElement | null = null;
  const close = () => {popup?.close();opener?.focus();};
  const render = () => {
    window.tocbot!.destroy();
    if (desktop.matches && popup?.open) close();
    window.tocbot!.init({tocSelector: desktop.matches ? '#toc' : '#toc-popup-content',contentSelector:'article[data-toc] > .content',ignoreSelector:'[data-toc-skip]',headingSelector:'h2, h3, h4',orderedList:false,scrollSmooth:false,collapseDepth:4,headingsOffset:desktop.matches ? 32 : 48});
    document.getElementById('toc-wrapper')?.classList.remove('invisible');
  };
  render();
  desktop.addEventListener('change',render);
  document.querySelectorAll<HTMLButtonElement>('.toc-trigger').forEach(button => button.addEventListener('click',() => {opener=button;popup?.showModal();}));
  document.getElementById('toc-popup-close')?.addEventListener('click',close);
  popup?.addEventListener('click',event => {if(event.target instanceof Element && (event.target.closest('a') || event.target === popup)) close();});
  popup?.addEventListener('close',() => opener?.focus());
  const header = document.querySelector('article[data-toc] > header');
  const bar = document.getElementById('toc-bar');
  if (header && bar) new IntersectionObserver(entries => bar.classList.toggle('invisible',entries[0].isIntersecting),{rootMargin:'-48px 0px 0px'}).observe(header);
}

function enhanceFigures() {
  let lightbox: {destroy(): void} | undefined;
  const charts: {element: HTMLElement; source: string}[] = [];
  document.querySelectorAll<HTMLElement>('.language-mermaid').forEach(code => {
    const source = code.textContent || '';
    const element = document.createElement('pre');
    element.className = 'mermaid';
    element.textContent = source;
    code.parentElement?.classList.add('d-none');
    code.parentElement?.after(element);
    charts.push({element,source});
  });
  let drawing = Promise.resolve();
  const render = () => {
    const dark = document.documentElement.dataset.bsTheme === 'dark';
    lightbox?.destroy();
    lightbox = window.GLightbox?.({selector:dark ? '.popup:not(.light)' : '.popup:not(.dark)'});
    drawing = drawing.then(async () => {
      if (!window.mermaid || !charts.length) return;
      for (const {element,source} of charts) {element.removeAttribute('data-processed');element.textContent=source;}
      window.mermaid.initialize({startOnLoad:false,theme:dark ? 'dark' : 'default'});
      await window.mermaid.run({nodes:charts.map(chart=>chart.element)});
    }).catch(error => console.error('Diagram rendering failed',error));
  };
  render();
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['data-bs-theme']});
}

function initContent() {
  enhanceDates();enhanceImages();enhanceCopy();enhanceToc();enhanceFigures();
  const list = document.getElementById('post-list');
  if (list) new MutationObserver(entries => entries.forEach(entry => entry.addedNodes.forEach(node => {if(node instanceof Element) {enhanceDates(node);enhanceImages(node);}}))).observe(list,{childList:true});
  const back = document.getElementById('back-to-top');
  const scroll = () => back?.classList.toggle('show',window.scrollY > 50);
  window.addEventListener('scroll',scroll,{passive:true});scroll();
  back?.addEventListener('click',() => window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
  // CDN failure still leaves mobile navigation usable without any old UI bundle.
  if (!window.React || !window.antd) {
    document.body.dataset.navigationFallback = 'true';
    const trigger = document.getElementById('sidebar-trigger');
    const mask = document.getElementById('mask');
    const toggle = () => {
      const open = !document.body.hasAttribute('sidebar-display');
      document.body.toggleAttribute('sidebar-display',open);
      document.getElementById('sidebar')?.classList.toggle('z-2',open);
      mask?.classList.toggle('d-none',!open);
      trigger?.setAttribute('aria-expanded',String(open));
    };
    trigger?.addEventListener('click',toggle);mask?.addEventListener('click',toggle);
    document.addEventListener('keydown',event=>{if(event.key==='Escape' && document.body.hasAttribute('sidebar-display')) {toggle();trigger?.focus();}});
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initContent,{once:true});
else initContent();
