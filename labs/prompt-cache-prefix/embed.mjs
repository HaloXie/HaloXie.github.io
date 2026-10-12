// Inlined before runtime.mjs; the parent blog owns embedded colors and fonts.
const embedded = new URLSearchParams(window.location.search).get('embed') === '1';

if (embedded) {
  document.body.dataset.embed = 'true';
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400..800&family=Noto+Serif+SC:wght@400;600&display=swap';
  document.head.append(fonts);

  // frameElement is null when opened directly or in a cross-origin parent.
  const host = window.frameElement;
  if (host) {
    const parentDocument = window.parent.document;
    const parentRoot = parentDocument.documentElement;
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    const main = document.querySelector('main');

    function resizeFrame() {
      // Measure content, not document.scrollHeight: the latter cannot shrink below the iframe viewport.
      host.style.height = `${Math.ceil(main.getBoundingClientRect().height)}px`;
    }

    function syncTheme() {
      const rootStyle = window.parent.getComputedStyle(parentRoot);
      const bodyStyle = window.parent.getComputedStyle(parentDocument.body);
      const prose = parentDocument.querySelector('article[data-toc] > .content');
      const theme = parentRoot.getAttribute('data-bs-theme');
      const dark = theme === 'dark' || (theme !== 'light' && scheme.matches);
      document.body.dataset.theme = dark ? 'dark' : 'light';
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      const canvas = rootStyle.getPropertyValue('--canvas').trim() || bodyStyle.backgroundColor;
      const tokens = {
        page: canvas, card: canvas, paper: canvas,
        text: rootStyle.getPropertyValue('--ink').trim() || bodyStyle.color,
        strong: rootStyle.getPropertyValue('--ink-strong').trim() || bodyStyle.color,
        muted: rootStyle.getPropertyValue('--ink-muted').trim() || bodyStyle.color,
        border: rootStyle.getPropertyValue('--border').trim(),
        'font-prose': prose ? window.parent.getComputedStyle(prose).fontFamily : rootStyle.getPropertyValue('--font-prose').trim() || bodyStyle.fontFamily,
        'font-ui': rootStyle.getPropertyValue('--font-ui').trim() || bodyStyle.fontFamily,
      };
      for (const [name, value] of Object.entries(tokens)) {
        document.body.style.setProperty(`--anatomy-${name}`, value);
      }
      resizeFrame();
    }

    syncTheme();
    new MutationObserver(syncTheme).observe(parentRoot, { attributes: true, attributeFilter: ['data-bs-theme'] });
    scheme.addEventListener('change', syncTheme);
    new ResizeObserver(resizeFrame).observe(main);
    window.addEventListener('resize', resizeFrame);
    document.fonts.ready.then(resizeFrame);
    document.fonts.addEventListener('loadingdone', resizeFrame);
  }
}
