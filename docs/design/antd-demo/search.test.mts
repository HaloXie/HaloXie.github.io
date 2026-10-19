import assert from 'node:assert/strict';
import { build } from 'esbuild';
const output = await build({entryPoints:[new URL('./search-controller.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const { SearchController, pagefindModuleUrl } = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
const deferred = () => {let resolve; const promise = new Promise(done => {resolve=done;}); return {promise,resolve};};
const old = deferred();
const result = url => ({data:async () => ({url,meta:{title:url},excerpt:''})});
const controller = new SearchController(async () => ({init:async()=>{},search:async query => query === 'old' ? old.promise : {results:[result('/en/new/'),result('/new/')]}}),'en','https://example.com');
const pending = controller.search('old');
const fresh = await controller.search('new');
old.resolve({results:[result('/en/old/')]});
assert.equal(await pending,undefined,'out-of-order old response must not replace new results');
assert.deepEqual(fresh.map(row=>row.url),['/en/new/'],'filter results by current language');
let loads=0;
const retry = new SearchController(async () => ({init:async()=>{if(++loads===1)throw new Error('offline');},search:async()=>({results:[]})}),'zh-CN','https://example.com');
await assert.rejects(retry.search('x'),/offline/);
assert.deepEqual(await retry.search('x'),[],'retry must initialize again after an initialization failure');
assert.equal(loads,2);
const canceled = deferred();
const closing = new SearchController(async()=>({init:async()=>{},search:()=>canceled.promise}),'en','https://example.com');
const closingResult=closing.search('x');
closing.cancel();
canceled.resolve({results:[result('/en/x/')]});
assert.equal(await closingResult,undefined,'closing the dialog invalidates pending work');
// Browser module maps retain rejected imports by URL; retrying the same import must fail here.
const modules=new Map();
const urls=[];
let blocked=true;
const cachedImport=new SearchController(async retry=>{
  const url=pagefindModuleUrl('/pagefind/pagefind.js',retry,'https://example.com');
  urls.push(url);
  if(!modules.has(url)) modules.set(url,blocked ? Promise.reject(new Error('blocked import')) : Promise.resolve({init:async()=>{},search:async()=>({results:[]})}));
  return modules.get(url);
},'en','https://example.com');
await assert.rejects(cachedImport.search('x'),/blocked import/);
blocked=false;
assert.deepEqual(await cachedImport.search('x'),[]);
assert.deepEqual(await cachedImport.search('y'),[]);
assert.deepEqual(urls,['/pagefind/pagefind.js','https://example.com/pagefind/pagefind.js?retry=1'],'only failure changes the module URL; successful queries reuse the instance');
let released=0;
const attempts=[];
const brokenIndex=new SearchController(async retry=>{attempts.push(retry);return{
  init:async()=>{},destroy:async()=>{released++;},search:async()=>{if(retry===0)throw new Error('index unavailable');return{results:[]};}
};},'en','https://example.com');
await assert.rejects(brokenIndex.search('x'),/index unavailable/);
assert.deepEqual(await brokenIndex.search('x'),[]);
assert.equal(released,1,'a failed index/worker instance must be released');
assert.deepEqual(attempts,[0,1],'search-stage failures must refresh the module as well');
console.log('Search tests passed: stale responses, language filter, initialization retry, cancellation, cached import failure, index failure.');
