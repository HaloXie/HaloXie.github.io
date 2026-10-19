import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
const built=await build({entryPoints:[new URL('./post-pagination.tsx',import.meta.url).pathname],bundle:true,write:false,format:'iife',globalName:'Pagination',plugins:[{name:'test-ui',setup(builder){
  builder.onResolve({filter:/^(react|antd)$/},args=>({path:args.path,namespace:'fake'}));
  builder.onLoad({filter:/.*/,namespace:'fake'},args=>({contents:args.path==='react'?'module.exports=globalThis.react':'module.exports={Button:"button"}'}));
}}]});
let complete;
let fail=true;
let calls=0;
const appended=[];
const card=href=>({querySelector:()=>({getAttribute:()=>href})});
const context={console:{error(){}},URL,AbortSignal,window:{},document:{documentElement:{lang:'en'},importNode:node=>node},
  fetch:async()=>{calls++;return{ok:!fail,status:503,url:'https://example.com/page2/',text:async()=>'<html>'};},
  DOMParser:class {parseFromString(){return{querySelectorAll:()=>[card('/existing/'),card('/new/'),card('/new/')],querySelector:()=>null};}},
  react:{createElement:(type,props,...children)=>({type,props,children}),useEffect(){},useRef:value=>({current:value}),useState:()=>['idle',value=>{if(value==='error'||value==='end')complete(value);}]}
};
context.react.default=context.react;
vm.createContext(context);vm.runInContext(built.outputFiles[0].text,context);
const list={querySelectorAll:()=>[{getAttribute:()=>'/existing/'}],append:node=>appended.push(node)};
const tree=context.Pagination.PostPagination({list,navigation:{},firstUrl:'https://example.com/page2/'});
const click=tree.children[0].props.onClick;
let settled=new Promise(resolve=>{complete=resolve;});
click();assert.equal(await settled,'error');
fail=false;settled=new Promise(resolve=>{complete=resolve;});
click();click();assert.equal(await settled,'end');
assert.equal(calls,2,'duplicate click during fetch must not add a request');
assert.equal(appended.length,1,'deduplicate existing cards and repeated cards in the response');
click();assert.equal(calls,2,'no further requests after the end');
console.log('Pagination tests passed: retry, in-flight guard, deduplication, end state.');
