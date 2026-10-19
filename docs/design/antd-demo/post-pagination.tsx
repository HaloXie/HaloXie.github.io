import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';

export function PostPagination({list,navigation,firstUrl}: {list:HTMLElement;navigation:HTMLElement;firstUrl:string}) {
  const chinese=document.documentElement.lang.startsWith('zh');
  const labels=chinese ? {more:'加载更多文章',loading:'正在加载…',retry:'加载失败，点击重试',end:'已显示全部文章'} : {more:'Load more posts',loading:'Loading…',retry:'Loading failed. Retry',end:'All posts loaded'};
  const [state,setState]=useState<'idle'|'loading'|'error'|'end'>('idle');
  const nextUrl=useRef<string|null>(firstUrl);
  const busy=useRef(false);
  const observer=useRef<IntersectionObserver>();
  const loadMore=async()=>{
    if(busy.current || !nextUrl.current)return;
    busy.current=true;setState('loading');observer.current?.unobserve(navigation);
    try {
      const response=await fetch(nextUrl.current,{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error(`Post page returned ${response.status}`);
      const page=new DOMParser().parseFromString(await response.text(),'text/html');
      const cards=page.querySelectorAll('#post-list > article');
      if(!cards.length)throw new Error('Post page contains no cards');
      const nextPath=page.querySelector('#post-pagination [rel="next"]')?.getAttribute('href');
      const followingUrl=nextPath ? new URL(nextPath,response.url).href : null;
      const existing=new Set([...list.querySelectorAll('.post-preview')].map(link=>link.getAttribute('href')));
      for(const card of cards){
        const href=card.querySelector('.post-preview')?.getAttribute('href');
        if(!href || existing.has(href))continue;
        list.append(document.importNode(card,true));existing.add(href);
      }
      nextUrl.current=followingUrl;
      setState(followingUrl ? 'idle' : 'end');
      if(followingUrl)observer.current?.observe(navigation);else observer.current?.disconnect();
    }catch(error){console.error('Could not load more posts',error);setState('error');}
    finally{busy.current=false;}
  };
  useEffect(()=>{
    if(window.IntersectionObserver){
      observer.current=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))void loadMore();},{rootMargin:'600px'});
      observer.current.observe(navigation);
    }
    return()=>observer.current?.disconnect();
  },[]);
  return <>{state!=='end' && <Button onClick={()=>void loadMore()} loading={state==='loading'} disabled={state==='loading'}>{state==='error'?labels.retry:labels.more}</Button>}
    <p role="status">{state==='end'?labels.end:state==='loading'?labels.loading:state==='error'?labels.retry:''}</p></>;
}
