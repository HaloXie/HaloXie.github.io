// 解析明暗：<html data-exploded-theme="light|dark"> 优先，否则跟随系统；结果写到 data-exploded-scheme，
// theme.css 只认这个属性。普通 <script>（非 module）放在 <head>，首帧之前就定好，避免先闪一下 light。
(() => {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const forced = root.dataset.explodedTheme;
    const scheme = forced === 'light' || forced === 'dark' ? forced : media.matches ? 'dark' : 'light';
    if (root.dataset.explodedScheme !== scheme) root.dataset.explodedScheme = scheme;
  };
  apply();
  media.addEventListener('change', apply);
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-exploded-theme'] });
})();
