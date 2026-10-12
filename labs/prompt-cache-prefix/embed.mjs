// Inlined before runtime.mjs. In embed mode the blog owns colors and fonts:
// /labs/shared/theme-bridge.js writes the blog mode to <html data-bs-theme>, and
// /labs/shared/theme-bridge.css maps the blog Base variables to --anatomy-*.
const embedded = new URLSearchParams(window.location.search).get('embed') === '1';

if (embedded) {
  document.body.dataset.embed = 'true';
  const root = document.documentElement;
  // Anatomy switches its part palette on body[data-theme]; follow the bridged blog mode.
  const syncTheme = () => {
    document.body.dataset.theme = root.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
  };
  syncTheme();
  new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-bs-theme'] });

  // frameElement is null when opened directly or in a cross-origin parent.
  const host = window.frameElement;
  if (host) {
    const main = document.querySelector('main');
    // Measure content, not document.scrollHeight: the latter cannot shrink below the iframe viewport.
    const resizeFrame = () => {
      host.style.height = `${Math.ceil(main.getBoundingClientRect().height)}px`;
    };
    resizeFrame();
    new ResizeObserver(resizeFrame).observe(main);
    window.addEventListener('resize', resizeFrame);
    document.fonts.ready.then(resizeFrame);
    document.fonts.addEventListener('loadingdone', resizeFrame);
  }
}
