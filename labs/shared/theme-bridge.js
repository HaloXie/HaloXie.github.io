// 让 lab 页面跟随博客明暗。普通 <script>，放在 <head> 里、skill 的 scheme.js 之前。
// 嵌入博客文章（同源 iframe）时跟父页面的 data-bs-theme；独立打开时读 Chirpy 存的 localStorage.theme，没有就跟系统。
// 结果写到本页 <html data-bs-theme>（博客 Base 变量据此切换）和 data-exploded-theme（exploded kit 据此切换）。
(() => {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');
  let parentRoot = null;
  try {
    parentRoot = window.frameElement ? window.parent.document.documentElement : null;
  } catch {
    parentRoot = null; // 跨域父页面读不到，按独立页处理
  }
  const pick = (v) => (v === 'light' || v === 'dark' ? v : null);
  const resolve = () =>
    pick(parentRoot?.getAttribute('data-bs-theme')) ?? pick(localStorage.getItem('theme')) ?? (media.matches ? 'dark' : 'light');
  const apply = () => {
    const mode = resolve();
    root.setAttribute('data-bs-theme', mode);
    root.dataset.explodedTheme = mode;
  };
  apply();
  media.addEventListener('change', apply);
  addEventListener('storage', (e) => { if (e.key === 'theme') apply(); });
  if (parentRoot) new MutationObserver(apply).observe(parentRoot, { attributes: true, attributeFilter: ['data-bs-theme'] });
})();
