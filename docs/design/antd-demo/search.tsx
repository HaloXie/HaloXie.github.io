import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Spin } from 'antd';
import { SearchController, pagefindModuleUrl, type SearchResult } from './search-controller';

export const SEARCH_DEBOUNCE_MS = 300;

export function SearchDialog({ trigger, pagefindUrl, label, cancelLabel }: {trigger: HTMLElement; pagefindUrl: string; label: string; cancelLabel: string}) {
  const english = document.documentElement.lang === 'en';
  const text = english ? {loading:'Loading search…',empty:'No results found.',error:'Search is temporarily unavailable.',retry:'Retry',hint:'Search this language'} : {loading:'正在加载搜索…',empty:'没有找到结果。',error:'搜索暂时不可用。',retry:'重试',hint:'搜索当前语言'};
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [retry, setRetry] = useState(0);
  const controller = useRef(new SearchController(retry => {
    const moduleUrl = pagefindModuleUrl(pagefindUrl, retry, location.origin);
    return import(/* @vite-ignore */ moduleUrl);
  }, document.documentElement.lang, location.origin));
  const opener = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const closeSearch = () => {controller.current.cancel();setOpen(false);setQuery('');setResults([]);setStatus('idle');};
  useEffect(() => {
    const show = () => {opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : trigger;setOpen(true);};
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {event.preventDefault();show();}
    };
    trigger.addEventListener('click', show);
    document.addEventListener('keydown', shortcut);
    return () => {trigger.removeEventListener('click',show);document.removeEventListener('keydown',shortcut);};
  }, [trigger]);
  useEffect(() => {
    controller.current.cancel();
    if (!open || !query.trim()) {setResults([]);setStatus('idle');return;}
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const data = await controller.current.search(query.trim());
        if (data === undefined) return;
        setResults(data);setStatus('done');
      } catch {setStatus('error');}
    }, SEARCH_DEBOUNCE_MS);
    return () => {window.clearTimeout(timer);controller.current.cancel();};
  }, [open,query,retry]);
  return <Modal open={open} title={label} footer={null} onCancel={closeSearch} keyboard destroyOnHidden width="min(42rem, calc(100vw - 2rem))"
    closeIcon={<span aria-label={cancelLabel}>×</span>}
    afterClose={() => opener.current?.focus()}
    afterOpenChange={value => {if(value) document.getElementById('search-input')?.focus();}}>
    <div id="command-search-dialog">
      <Input id="search-input" type="search" autoComplete="off" aria-label={label} aria-controls="search-results" placeholder={`${label}…`} value={query}
        onChange={event => {controller.current.cancel();setResults([]);setStatus('idle');setQuery(event.target.value);}}
        onKeyDown={event => {
          if(event.key === 'Escape'){event.preventDefault();closeSearch();}
          if(event.key === 'ArrowDown'){event.preventDefault();resultsRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();}
          if(event.key === 'Enter'){event.preventDefault();resultsRef.current?.querySelector<HTMLAnchorElement>('a')?.click();}
        }}/>
      <div id="search-results" className="command-search-results" ref={resultsRef} role="list" aria-live="polite" aria-busy={status === 'loading'} style={{maxHeight:'min(60vh, 30rem)',overflowY:'auto',marginTop:16}}
        onKeyDown={event => {
          if(!['ArrowDown','ArrowUp'].includes(event.key)) return;
          event.preventDefault();
          const links = [...resultsRef.current!.querySelectorAll<HTMLAnchorElement>('a')];
          const index = links.findIndex(link => link === document.activeElement) + (event.key === 'ArrowDown' ? 1 : -1);
          if(index < 0) document.getElementById('search-input')?.focus(); else links[Math.min(index,links.length-1)]?.focus();
        }}>
        {results.map(result => <div key={result.url} role="listitem" className="command-search-result"><a href={result.url}>
          <span className="command-search-result-title">{result.meta.title}</span><span className="command-search-result-excerpt" dangerouslySetInnerHTML={{__html:result.excerpt}}/>
        </a></div>)}
      </div>
      <div role="status">{status === 'loading' ? <><Spin size="small"/> {text.loading}</> : status === 'done' && !results.length ? text.empty : null}</div>
      {status === 'error' && <Alert type="error" title={text.error} action={<Button onClick={() => setRetry(value => value + 1)}>{text.retry}</Button>}/>}
      <p>{text.hint}</p>
    </div>
  </Modal>;
}
