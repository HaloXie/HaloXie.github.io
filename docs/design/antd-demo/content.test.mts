import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const code = (await readFile(new URL('../../../assets/js/ui/content.js',import.meta.url),'utf8')).replace(/^---[\s\S]*?---\n/,'');
const handlers = new Map();
const time = {dataset:{ts:'123',df:'YYYY-MM-DD'},textContent:'',title:''};
const button = {id:'copy-link',dataset:{titleSucceed:'Copied'},title:'',addEventListener(type,handler){handlers.set(type,handler);}};
const statuses=[];
const writes=[];
let failCopy=false;
const image=(complete,source=null)=>{
  const classes=new Set(['shimmer','blur']);
  const events=new Map();
  const attributes=new Map([['src','preview.webp']]);
  if(source)attributes.set('data-src',source);
  return {complete,classes,events,parentElement:{classList:{remove(...names){names.forEach(name=>classes.delete(name));}}},
    addEventListener:(name,callback)=>events.set(name,callback),getAttribute:name=>attributes.get(name),removeAttribute:name=>attributes.delete(name),
    set src(value){attributes.set('src',value);this.complete=false;}
  };
};
const cached=image(true), pending=image(false), broken=image(false), lqip=image(true,'full image.webp');
const images=[cached,pending,broken,lqip];
const list={};
let appended;
class Article {querySelectorAll(selector){return selector==='img'?[this.image]:[];}}
const context = {
  console, location:{href:'https://example.com/article/'},
  navigator:{clipboard:{writeText:async text=>{if(failCopy)throw Error('denied');writes.push(text);}}},
  matchMedia:()=>({matches:false,addEventListener(){}}),
  Element:Article,
  MutationObserver:class {constructor(callback){this.callback=callback;}observe(target){if(target===list)appended=this.callback;}},
  document:{readyState:'complete',documentElement:{lang:'en',dataset:{bsTheme:'light'}},
    body:{dataset:{},append(node){statuses.push(node);}},
    createElement:()=>({setAttribute(){},textContent:''}),
    querySelector:()=>null,
    getElementById:id=>id==='post-list'?list:null,
    querySelectorAll:selector=>selector==='article img'?images:selector==='time[data-ts]'?[time]:selector==='.code-header > button, #copy-link'?[button]:[],
    addEventListener(){}
  },
  addEventListener(){},scrollY:0,
  dayjs:{locale(){},extend(){},unix:timestamp=>{assert.equal(timestamp,123);return{format:pattern=>pattern==='YYYY-MM-DD'?'2026-10-19':'Monday, October 19'};}}
};
context.window=context;
vm.runInNewContext(code,context);
assert.equal(time.textContent,'2026-10-19');
assert.equal(time.title,'Monday, October 19');
assert.equal(context.document.body.dataset.navigationFallback,'true','only the CDN-failure fallback marks its layout scope');
assert.equal(cached.classes.size,0,'already-cached images must not retain their shimmer');
assert.equal(pending.classes.size,2,'unloaded lazy images keep their placeholder');
pending.events.get('load')();assert.equal(pending.classes.size,0);
broken.events.get('error')();assert.equal(broken.classes.size,0,'failed images reveal alt/failure instead of an endless loading mask');
assert.equal(lqip.getAttribute('src'),'full%20image.webp');
assert.equal(lqip.getAttribute('data-src'),undefined);
assert.equal(lqip.classes.size,2,'cached preview must not remove blur before the full image loads');
lqip.events.get('load')();assert.equal(lqip.classes.size,0);
const card=new Article();card.image=image(true);
appended([{addedNodes:[card]}]);
assert.equal(card.image.classes.size,0,'paginated cards receive cached-image enhancement');
await handlers.get('click')();
assert.deepEqual(writes,['https://example.com/article/']);
assert.equal(statuses[0].textContent,'Copied');
failCopy=true;
await handlers.get('click')();
assert.match(statuses[0].textContent,/Copy failed/);
console.log('Article enhancement tests passed: dates, copy, cached/lazy/error/LQIP images, pagination images.');
