import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, ConfigProvider, Drawer, Dropdown, Menu, theme } from 'antd';
import { SearchDialog } from './search';
import { PostPagination } from './post-pagination';

type LanguageLink = { href: string; language: string; preference: string; label: string; current: boolean };
declare global {
  interface Window {
    Theme: { update(mode: string): void; isSystemTheme: boolean; resolvedTheme: string };
    ReadingHighlights?: { takeControl(): { enabled: boolean; setEnabled(value: boolean): void } | undefined };
  }
}

// Base remains the only production source of colors and typography.
function readTheme() {
  const style = getComputedStyle(document.documentElement);
  const value = (name: string) => style.getPropertyValue(name).trim();
  return {
    algorithm: style.colorScheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      fontFamily:value('--font-ui'), fontFamilyCode:value('--font-mono'), fontSize:16,
      colorPrimary:value('--accent'), colorTextLightSolid:value('--accent-contrast'),
      colorSuccess:value('--success'), colorWarning:value('--warning'),
      colorText:value('--ink'), colorTextHeading:value('--ink-strong'), colorTextSecondary:value('--ink-muted'),
      colorBgContainer:value('--surface'), colorBgElevated:value('--surface'), colorBgLayout:value('--canvas'),
      colorBorder:value('--border-strong'), colorBorderSecondary:value('--border'),
      colorBgContainerDisabled:value('--surface-soft'), colorTextDisabled:value('--ink-muted'),
      borderRadius:parseFloat(value('--radius-md')) * parseFloat(style.fontSize), controlHeight:40,
      motion:!matchMedia('(prefers-reduced-motion: reduce)').matches
    },
    components: { Button: {
      defaultBg:value('--surface'), defaultColor:value('--ink'), defaultBorderColor:value('--border-strong'),
      defaultHoverBg:value('--surface-accent'), defaultHoverColor:value('--accent'), defaultHoverBorderColor:value('--accent'),
      primaryShadow:'none', defaultShadow:'none', primaryColor:value('--accent-contrast')
    } }
  };
}

function SiteTheme({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState(readTheme);
  useEffect(() => {
    const update = () => setConfig(readTheme());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {attributes:true, attributeFilter:['data-bs-theme', 'lang']});
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    scheme.addEventListener('change', update);
    motion.addEventListener('change', update);
    return () => {observer.disconnect();scheme.removeEventListener('change',update);motion.removeEventListener('change',update);};
  }, []);
  return <ConfigProvider button={{autoInsertSpace:false}} theme={config}>{children}</ConfigProvider>;
}

function LanguageMenu({ links, label }: { links: LanguageLink[]; label: string }) {
  const [open, setOpen] = useState(false);
  return <SiteTheme>
    <Dropdown trigger={['click']} open={open} onOpenChange={setOpen} menu={{
      selectedKeys:links.filter(link => link.current).map(link => link.language),
      items:links.map(link => ({key:link.language, label:<a href={link.href} lang={link.language} hrefLang={link.language} data-language-preference={link.preference} aria-current={link.current ? 'page' : undefined}>{link.label}</a>}))
    }}>
      <Button type="text" aria-label={label} aria-haspopup="menu" aria-expanded={open} onKeyDown={event => {if(event.key === 'ArrowDown'){event.preventDefault();setOpen(true);}}} icon={<i className="fas fa-language" aria-hidden="true"/>}/>
    </Dropdown>
  </SiteTheme>;
}

function ThemeMenu({ modes, label }: { modes: { key: string; label: string }[]; label: string }) {
  const [selected, setSelected] = useState(() => window.Theme.isSystemTheme ? 'system' : window.Theme.resolvedTheme);
  return <SiteTheme><Dropdown trigger={['click']} menu={{
    selectedKeys: [selected], items: modes,
    onClick: ({key}) => { window.Theme.update(key); setSelected(key); }
  }}><Button type="text" id="mode-toggle" aria-label={label} aria-haspopup="menu"
    icon={<i className={selected === 'dark' ? 'fa-regular fa-moon' : selected === 'light' ? 'fa-regular fa-sun' : 'fa-solid fa-display'} aria-hidden="true"/>}/></Dropdown></SiteTheme>;
}

function HighlightToggle({ controller, enabledLabel, disabledLabel }: {
  controller: { enabled: boolean; setEnabled(value: boolean): void }; enabledLabel: string; disabledLabel: string;
}) {
  const [enabled, setEnabled] = useState(controller.enabled);
  const label = enabled ? enabledLabel : disabledLabel;
  return <SiteTheme><Button type="text" id="reading-highlights-toggle" className="topbar-reading-highlights-toggle" data-reading-highlights-toggle
    data-enabled-label={enabledLabel} data-disabled-label={disabledLabel} data-reading-highlights-ready=""
    aria-pressed={enabled} aria-label={label} title={label}
    icon={<i className="fas fa-highlighter" aria-hidden="true"/>}
    onClick={() => {controller.setEnabled(!enabled);setEnabled(!enabled);}}/></SiteTheme>;
}

function MobileNavigation({ links, title, label }: { links: {href: string; label: string; current: boolean}[]; title: string; label: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const wide = matchMedia('(min-width: 850px)');
    const closeOnWide = () => {if (wide.matches) setOpen(false);};
    wide.addEventListener('change', closeOnWide);
    return () => wide.removeEventListener('change', closeOnWide);
  }, []);
  return <SiteTheme><Button type="text" id="sidebar-trigger" aria-label={label} aria-expanded={open} aria-controls="site-mobile-navigation"
    icon={<i className="fas fa-bars fa-fw" aria-hidden="true"/>} onClick={() => setOpen(true)}/>
    <Drawer title={title} placement="left" open={open} onClose={() => setOpen(false)} styles={{wrapper:{width:'min(320px, 90vw)'}}}
      afterOpenChange={value => {if (!value) document.getElementById('sidebar-trigger')?.focus();}}>
      <nav id="site-mobile-navigation" aria-label={label}><Menu selectedKeys={links.filter(link => link.current).map(link => link.href)} items={links.map(link => ({
        key: link.href, label: <a href={link.href} aria-current={link.current ? 'page' : undefined} onClick={() => setOpen(false)}>{link.label}</a>
      }))}/></nav>
    </Drawer></SiteTheme>;
}

// Wait until legacy defer scripts have bound their nodes; replacement removes those listeners.
function mountSiteControls() {
const postList = document.getElementById('post-list');
const pagination = document.getElementById('post-pagination');
const nextPage = pagination?.querySelector<HTMLAnchorElement>('[rel="next"]')?.href;
if (postList && pagination && nextPage) createRoot(pagination).render(<SiteTheme><PostPagination list={postList} navigation={pagination} firstUrl={nextPage}/></SiteTheme>);
const searchTrigger = document.getElementById('search-trigger');
const staticDialog = document.getElementById('command-search-dialog');
if (searchTrigger && staticDialog) {
  const trigger = searchTrigger.cloneNode(true) as HTMLElement;
  searchTrigger.replaceWith(trigger);
  const host = document.createElement('div');
  const pagefindUrl = staticDialog.dataset.pagefindUrl!;
  const label = staticDialog.getAttribute('aria-label')!;
  const cancelLabel = staticDialog.querySelector('#search-cancel')!.getAttribute('aria-label')!;
  staticDialog.replaceWith(host);
  document.documentElement.dataset.searchUi = 'antd';
  createRoot(host).render(<SiteTheme><SearchDialog trigger={trigger} pagefindUrl={pagefindUrl} label={label} cancelLabel={cancelLabel}/></SiteTheme>);
}
for (const nav of document.querySelectorAll<HTMLElement>('#topbar-actions .language-switcher')) {
  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a.language-link')].map(link => ({
    href:link.getAttribute('href')!, language:link.hreflang, preference:link.dataset.languagePreference!,
    label:link.querySelector('span')!.textContent!.trim(), current:link.getAttribute('aria-current') === 'page'
  }));
  if (!links.length) continue;
  const label = nav.getAttribute('aria-label') || 'Language';
  createRoot(nav).render(<LanguageMenu links={links} label={label}/>);
  nav.dataset.ui = 'antd';
}
const themeButton = document.getElementById('mode-toggle');
const themeContainer = themeButton?.parentElement;
if (themeContainer && window.Theme) {
  const modes = [...themeContainer.querySelectorAll<HTMLElement>('button[data-theme-mode]')].map(button => ({key:button.dataset.themeMode!,label:button.textContent!.trim()}));
  if (modes.length) createRoot(themeContainer).render(<ThemeMenu modes={modes} label={themeButton!.getAttribute('aria-label') || 'Theme'}/>);
}
const highlight = document.querySelector<HTMLElement>('[data-reading-highlights-toggle]');
const controller = typeof window.ReadingHighlights?.takeControl === 'function' ? window.ReadingHighlights.takeControl() : undefined;
if (highlight && controller) {
  const host = document.createElement('span');
  host.style.display = 'contents';
  highlight.replaceWith(host);
  createRoot(host).render(<HighlightToggle controller={controller} enabledLabel={highlight.dataset.enabledLabel!} disabledLabel={highlight.dataset.disabledLabel!}/>);
}
const trigger = document.getElementById('sidebar-trigger');
const sidebar = document.getElementById('sidebar');
if (trigger && sidebar) {
  const links = [...sidebar.querySelectorAll<HTMLAnchorElement>('nav a.nav-link')].map(link => ({href:link.getAttribute('href')!,label:link.textContent!.trim(),current:link.parentElement!.classList.contains('active')}));
  const host = document.createElement('span');
  host.style.display = 'contents';
  trigger.replaceWith(host);
  const mask = document.getElementById('mask');
  if (mask) mask.onclick = null;
  createRoot(host).render(<MobileNavigation links={links} title={sidebar.querySelector('.site-title')?.textContent || ''} label={trigger.getAttribute('aria-label') || 'Navigation'}/>);
}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountSiteControls, {once:true});
else mountSiteControls();
