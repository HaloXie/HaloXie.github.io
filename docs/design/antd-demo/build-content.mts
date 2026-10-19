import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
const result = await build({entryPoints:[new URL('./content.ts',import.meta.url).pathname],bundle:true,write:false,minify:true,format:'iife'});
await writeFile(new URL('../../../assets/js/ui/content.js',import.meta.url),`---\nlayout: null\nlang-exclusive: [zh-CN]\n---\n/* Authored article enhancements; no legacy UI controller bundle. */\n${result.outputFiles[0].text}`);
console.log('Built article enhancements.');
