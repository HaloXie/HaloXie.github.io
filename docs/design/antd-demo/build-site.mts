// Build the first production UI migration slice. Vendor libraries stay on CDN.
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const result = await build({
  entryPoints:[new URL('./site.tsx', import.meta.url).pathname],
  bundle:true, write:false, minify:true, format:'iife', jsx:'transform',
  plugins:[{name:'cdn-globals',setup(builder){
    builder.onResolve({filter:/^(react|react-dom\/client|antd)$/}, args => ({path:args.path,namespace:'cdn'}));
    builder.onLoad({filter:/.*/,namespace:'cdn'}, args => ({contents:`module.exports=window.${args.path === 'react' ? 'React' : args.path === 'antd' ? 'antd' : 'ReactDOM'};`,loader:'js'}));
  }}]
});
const code = result.outputFiles[0].text;
assert.ok(code.length < 20000, 'Do not bundle CDN dependencies');
await writeFile(new URL('../../../assets/js/ui/site.js',import.meta.url), `---\nlayout: null\nlang-exclusive: [zh-CN]\n---\n/* Generated from docs/design/antd-demo/site.tsx by build-site.mts. */\nif(window.React && window.ReactDOM && window.antd && window.dayjs){${code}}\n`);
console.log('Built site UI; runtime libraries external.');
