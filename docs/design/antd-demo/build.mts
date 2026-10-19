// After dependencies are installed: node build.mts. Regenerates the comparison HTML.
import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
const source = await readFile(new URL('../blog-base-style-demo.html', import.meta.url), 'utf8');
const start = source.indexOf('          <section id="components">');
const end = source.indexOf('          <section id="extraction">', start);
assert.ok(start > 0 && end > start, 'Canonical section boundaries changed');
const cdn = [
  'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js',
  'https://cdn.jsdelivr.net/npm/antd@6.5.0/dist/antd.min.js'
];
// Official browser distributions expose globals; bundle only our demo code.
const result = await build({ entryPoints: [new URL('./app.tsx', import.meta.url).pathname], bundle: true, write: false, minify: true, format: 'iife', jsx: 'transform', plugins: [{
  name: 'cdn-globals', setup(builder) {
    builder.onResolve({ filter: /^(react|react-dom\/client|antd)$/ }, args => ({ path: args.path, namespace: 'cdn' }));
    builder.onLoad({ filter: /.*/, namespace: 'cdn' }, args => ({ contents: `module.exports = window.${args.path === 'react' ? 'React' : args.path === 'antd' ? 'antd' : 'ReactDOM'};`, loader: 'js' }));
  }
}], legalComments: 'inline' });
let html = source.slice(0, start) + '<div id="antd-demo"></div>\n' + source.slice(end);
html = html.replace(/<script>[\s\S]*?<\/script>/g, '')
  .replace('<title>Halo\'s Blog · 组件与阅读实验室</title>', '<title>Halo’s Blog · React + Ant Design 对比</title>')
  .replace('blog / component-lab', 'React 18 · Ant Design 6 · CDN 版')
  .replace('</body>', () => `${cdn.map(url => `<script src="${url}" crossorigin="anonymous"></script>`).join('\n')}<script>
if (!window.React || !window.ReactDOM || !window.dayjs || !window.antd) {
  document.getElementById('antd-demo').textContent = '组件库未能从 CDN 加载，请检查网络后刷新。';
} else { ${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')} }
</script></body>`);
assert.ok(html.includes('Source+Serif+4') && html.includes('--font-body-zh: var(--font-ui-zh)'));
assert.equal((html.match(/<div id="antd-demo"><\/div>/g) || []).length, 1);
assert.ok(result.outputFiles[0].text.length < 50000, 'Demo must not embed library runtimes');
assert.deepEqual([...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]), cdn);
await writeFile(new URL('../blog-antd-demo.html', import.meta.url), html.replace(/^[\t ]+$/gm, ''));
console.log('Built blog-antd-demo.html; canonical fonts and theme CSS preserved.');
