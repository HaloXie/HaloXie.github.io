import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Alert, Button, Card, Checkbox, Collapse, ConfigProvider, Divider, Dropdown, Empty, Input, Radio, Segmented, Slider, Space, Steps, Switch, Tag, theme } from 'antd';
import type { InputRef } from 'antd';

const css = `
#antd-demo { min-width:0; }
#antd-demo section { margin:0; }
#antd-demo > section { margin-top:var(--space-8); scroll-margin-top:1rem; }
#antd-demo h2 { font-size:var(--text-h2); line-height:var(--leading-heading); }
#antd-demo h3 { font-size:var(--text-h3); line-height:var(--leading-heading); margin:0 0 var(--space-4); }
#antd-demo .lab-controls { display:flex; flex-wrap:wrap; align-items:center; gap:var(--space-4); padding:var(--space-4); background:var(--surface-soft); border-radius:var(--radius-md); margin-bottom:var(--space-5); }
#antd-demo .lab-stage { min-width:0; max-width:100%; margin:auto; }
#antd-demo .narrow { max-width:360px; }
#antd-demo .reader-copy { font-family:var(--font-prose); font-size:1.125rem; line-height:var(--leading-prose); max-width:var(--measure-prose); }
#antd-demo .board { display:grid; grid-template-columns:11rem minmax(0,1fr); gap:var(--space-5); }
#antd-demo .board-index { border-right:1px solid var(--border); padding-right:var(--space-4); }
#antd-demo .material-nav { justify-content:flex-start; white-space:normal; height:auto; min-height:2.75rem; padding:var(--space-3); text-align:left; }
#antd-demo .material-nav[aria-pressed="true"] { background:var(--surface-accent); color:var(--accent); }
#antd-demo .material-nav .material-label { display:flex; width:100%; min-width:0; flex-direction:column; align-items:flex-start; gap:var(--space-1); line-height:var(--leading-ui); }
#antd-demo .material-nav .material-label small { color:var(--ink-muted); font-size:var(--text-xs); }
#antd-demo .material-nav .material-count { margin-left:auto; color:var(--ink-muted); font-size:var(--text-sm); font-variant-numeric:tabular-nums; }
#antd-demo .board-paper { min-width:0; padding:var(--space-5); background:var(--canvas); border-radius:var(--radius-lg); }
#antd-demo .board-paper p { line-height:1.8; }
#antd-demo .board-paper .ant-radio-group { display:grid; gap:var(--space-3); }
#antd-demo .narrow .board { grid-template-columns:1fr; }
#antd-demo .narrow .board-index { border:0; padding:0; }
#antd-demo .flow-example { display:flex; flex-wrap:wrap; gap:var(--space-3); align-items:center; margin:var(--space-5) 0; }
#antd-demo .flow-example span { padding:var(--space-3); border-bottom:2px solid var(--accent); }
#antd-demo .lesson { max-width:44rem; margin:auto; }
#antd-demo .lesson .ant-radio-group { display:grid; gap:var(--space-3); margin:var(--space-4) 0; }
#antd-demo .readout { font-variant-numeric:tabular-nums; font-size:var(--text-h2); color:var(--ink-strong); }
#antd-demo .ant-card { margin-bottom:var(--space-5); }
#antd-demo .ant-card-head-title { white-space:normal; overflow-wrap:anywhere; padding-block:var(--space-3); }
#antd-demo .board-paper li { overflow-wrap:anywhere; }
#antd-demo .ant-input-search { max-width:100%; }
@media(max-width:768px) { #antd-demo .board { grid-template-columns:1fr; } #antd-demo .board-index { border:0; padding:0; } #antd-demo .board-paper { padding:var(--space-4); } }
`;

function Demo() {
  const [dark, setDark] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [lang, setLang] = useState('zh-CN');
  const [pending, setPending] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const [search, setSearch] = useState(false);
  const searchInput = useRef<InputRef>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState('success');
  const [load, setLoad] = useState('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [topic, setTopic] = useState('source');
  const [answer, setAnswer] = useState<string>();
  const [question, setQuestion] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string>();
  const [locked, setLocked] = useState(false);
  const [speed, setSpeed] = useState(6);
  const [explanation, setExplanation] = useState('');
  const [reference, setReference] = useState(false);
  useEffect(() => { if (search) searchInput.current?.focus(); }, [search]);
  useEffect(() => {
    const button = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
    const toggle = () => setDark(value => !value);
    button.addEventListener('click', toggle);
    return () => { button.removeEventListener('click', toggle); clearTimeout(timer.current); };
  }, []);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.readingHighlights = highlight ? 'on' : 'off';
  const themeButton = document.querySelector('#theme-toggle');
  if (themeButton) themeButton.textContent = dark ? '切换浅色模式' : '切换深色模式';
  const computed = getComputedStyle(document.documentElement);
  const token = (name: string) => computed.getPropertyValue(name).trim();
  const posts = ['一次小实验', 'Agent 的最小循环', '阅读工具'];
  const matches = posts.filter(title => title.toLowerCase().includes(query.trim().toLowerCase()));
  const stage = narrow ? 'lab-stage narrow' : 'lab-stage';
  return <ConfigProvider button={{ autoInsertSpace:false }} theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: {
    fontFamily: token('--font-ui-zh'), fontFamilyCode: token('--font-mono'), fontSize:16,
    colorPrimary:token('--accent'), colorTextLightSolid:token('--accent-contrast'), colorSuccess:token('--success'), colorWarning:token('--warning'),
    colorText:token('--ink'), colorTextHeading:token('--ink-strong'), colorTextSecondary:token('--ink-muted'),
    colorBgContainer:token('--surface'), colorBgElevated:token('--surface'), colorBgLayout:token('--canvas'), colorBorder:token('--border-strong'), colorBorderSecondary:token('--border'),
    colorBgContainerDisabled:token('--surface-soft'), colorTextDisabled:token('--ink-muted'),
    borderRadius:parseFloat(token('--radius-md')) * parseFloat(computed.fontSize), controlHeight:40, motion:!matchMedia('(prefers-reduced-motion: reduce)').matches
  }, components: { Button: {
    defaultBg:token('--surface'), defaultColor:token('--ink'), defaultBorderColor:token('--border-strong'),
    defaultHoverBg:token('--surface-accent'), defaultHoverColor:token('--accent'), defaultHoverBorderColor:token('--accent'),
    primaryShadow:'none', defaultShadow:'none', primaryColor:token('--accent-contrast')
  } } }}>
    <style>{css}</style>
    <section id="components">
      <h2>05 · React + Ant Design 控件</h2>
      <p>原有字体与 Base 色彩，官方控件状态。此页仅作设计对比，尚未替换生产组件。</p>
      <div className="lab-controls"><Checkbox checked={narrow} onChange={e => setNarrow(e.target.checked)}>窄屏预览</Checkbox><Space><Switch checked={dark} onChange={setDark} aria-label="深色模式"/>深色模式</Space><a href="#teaching">教学白板 ↓</a></div>
      <div className={stage}>
        <Card id="reader-specimen" title="文章工具与搜索">
          <Space wrap><Button aria-pressed={highlight} type={highlight ? 'primary' : 'default'} onClick={() => setHighlight(!highlight)}>重点高亮</Button>
            <Dropdown trigger={['click']} menu={{ selectedKeys:[lang], items:[{ key:'zh-CN', label:'简体中文' }, ...(!pending ? [{key:'en',label:'English'}] : [])], onClick:({key}) => setLang(key) }}><Button>语言 · {lang === 'en' ? 'English' : '中文'} ▾</Button></Dropdown>
            <Button ref={searchButton} aria-expanded={search} aria-controls="example-search" onClick={() => setSearch(!search)}>搜索</Button></Space>
          <Divider/>
          <div lang={lang} className="reader-copy"><h3>{lang === 'en' ? 'Start with a small experiment' : '从一个小实验开始'}</h3><p>{lang === 'en' ? 'Change one condition and observe whether the result matches your prediction.' : '改变一个条件，观察结果是否符合你的预期。'}</p><p className={highlight ? 'reading-highlight' : ''}><strong>{lang === 'en' ? 'Write your prediction first. Let observations refine your understanding.' : '先写下预测，再用观察修正理解。'}</strong></p></div>
          {search && <div id="example-search" onKeyDown={e => {if(e.key === 'Escape'){setSearch(false);searchButton.current?.focus();}}}><Input.Search ref={searchInput} aria-label="搜索示例" placeholder="搜索示例文章" value={query} onChange={e => setQuery(e.target.value)}/><div aria-live="polite">{matches.length ? matches.map(title => <p key={title}><a href={title === posts[0] ? '#teaching' : title === posts[2] ? '#reader-specimen' : '#article'}>{title}</a></p>) : <Empty description="没有匹配的示例" image={Empty.PRESENTED_IMAGE_SIMPLE}/>}</div></div>}
          <Divider/><Checkbox checked={pending} onChange={e => {setPending(e.target.checked); if(e.target.checked) setLang('zh-CN');}}>模拟待译文章</Checkbox>{pending && <Tag>英文尚未发布</Tag>}
        </Card>
        <Card id="loading-specimen" title="让等待与失败都有下一步">
          <div className="lab-controls"><span>模拟结果</span><Segmented aria-label="模拟加载结果" value={outcome} options={[{label:'成功',value:'success'},{label:'失败',value:'error'}]} onChange={setOutcome}/><Button onClick={() => {clearTimeout(timer.current); setLoad('idle');}}>重置样例</Button></div>
          <ul><li>从一个小实验开始</li>{load === 'done' && <><li>把观察写成解释</li><li>为下一次实验留下问题</li></>}</ul>
          <Space direction="vertical" size="middle" style={{width:'100%'}}><Button type="primary" loading={load === 'loading'} disabled={load === 'done'} onClick={() => {setLoad('loading'); timer.current = setTimeout(() => setLoad(outcome === 'error' ? 'error' : 'done'), 600);}}>{load === 'done' ? '已全部加载' : load === 'error' ? '重试加载' : '加载更多文章'}</Button>
          <div role="status">{load === 'error' ? <Alert type="error" showIcon title="加载失败，已有文章仍可阅读。"/> : load === 'done' ? '已显示全部 3 篇示例文章' : load === 'loading' ? '正在加载…' : '还有 2 篇示例文章'}</div></Space>
        </Card>
      </div>
    </section>
    <section id="teaching"><h2>教学实验 · Ant Design</h2><p>白板内容独立设计；控件由 Ant Design 提供。追问仅在本页记录，没有模型调用。</p>
      <div className={stage}><Card id="whiteboard-specimen" title="把材料、判断与追问放在一起" extra={<Button type="text" onClick={() => {setNotes([]);setQuestion('');setAnswer(undefined);setTopic('source');}}>重置</Button>}>
        <div className="board"><aside className="board-index"><p className="eyebrow">本次材料</p><Space direction="vertical" style={{width:'100%'}}><Button className="material-nav" block type="text" aria-pressed={topic === 'source'} onClick={() => setTopic('source')}><span className="material-label"><span>请求与缓存</span><small>示例笔记</small></span></Button><Button className="material-nav" block type="text" aria-pressed={topic === 'notes'} onClick={() => setTopic('notes')}><span>我的追问</span><span className="material-count">{notes.length}</span></Button></Space></aside>
        <div className="board-paper"><Tag>板书 01</Tag><h3>{topic === 'source' ? '先看请求经过了哪里' : '把不确定的地方留下来'}</h3>
          {topic === 'source' ? <><p>本例只有命中和未命中两条路径。缓存未命中时，请求继续读取数据源。</p><div className="flow-example" aria-label="缓存未命中路径"><span>请求</span>→<span>缓存未命中</span>→<span>读取数据源</span></div><Divider/><p><strong>如果没有命中缓存，请求下一步去哪？</strong></p><Radio.Group value={answer} onChange={e => setAnswer(e.target.value)} options={[{value:'source',label:'读取数据源'},{value:'stop',label:'直接结束'}]}/>{answer && <Alert style={{marginTop:16}} type={answer === 'source' ? 'success' : 'warning'} showIcon title={answer === 'source' ? '与板书一致：继续读取数据源。' : '再看箭头：本例未命中后仍会继续读取。'}/>}</> : notes.length ? <ol>{notes.map((note,i) => <li key={i}>{note}</li>)}</ol> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有追问"/>}
          <Divider/><form onSubmit={e => {e.preventDefault();if(question.trim()){setNotes([...notes,question.trim()]);setQuestion('');setTopic('notes');}}}><Space.Compact style={{width:'100%'}}><Input aria-label="白板追问" placeholder="哪一步还不清楚？" value={question} onChange={e => setQuestion(e.target.value)}/><Button type="primary" htmlType="submit" disabled={!question.trim()}>记录追问</Button></Space.Compact></form>
        </div></div>
      </Card>
      <Card id="lesson-specimen" title="同样的路，换一种速度？" extra={<Button type="text" onClick={() => {setPrediction(undefined);setLocked(false);setSpeed(6);setExplanation('');setReference(false);}}>重新预测</Button>}><div className="lesson">
        <Steps current={reference ? 2 : locked ? 1 : 0} size="small" items={[{title:'预测'},{title:'观察'},{title:'讲回来'}]}/><Divider/>
        <p>路程不变，匀速从 3 km/h 变为 6 km/h，用时会怎样？</p><Radio.Group aria-label="用时预测" value={prediction} disabled={locked} onChange={e => setPrediction(e.target.value)} options={[{value:'half',label:'变成原来的一半'},{value:'same',label:'保持不变'},{value:'double',label:'变成原来的两倍'}]}/>
        {!locked ? <Button type="primary" disabled={!prediction} onClick={() => setLocked(true)}>锁定预测，查看观察</Button> : <><Alert showIcon type={prediction === 'half' ? 'success' : 'warning'} title="观察：用时从 120 分钟变成 60 分钟。"/><Divider/><label htmlFor="speed">匀速 {speed} km/h · 固定路程 6 km</label><Slider id="speed" aria-label="匀速" min={1} max={6} value={speed} onChange={setSpeed}/><output className="readout">{360 / speed} 分钟</output><p>用时 = 路程 ÷ 速度；不包含停留。</p><Collapse items={[{key:'hint',label:'需要一点提示',children:'每小时走得更远，走完相同路程需要的小时数就更少。'}]}/><Divider/><label htmlFor="explanation">用自己的话解释，什么保持不变？</label><Input.TextArea id="explanation" rows={3} value={explanation} onChange={e => {setExplanation(e.target.value);setReference(false);}}/><Button style={{marginTop:16}} disabled={!explanation.trim()} onClick={() => setReference(true)}>对照解释</Button>{reference && <Alert style={{marginTop:16}} type="info" title="路程固定为 6 km。速度翻倍，用时从 2 小时变成 1 小时。此处不自动评价你的解释。"/>}</>}
      </div></Card></div>
    </section>
  </ConfigProvider>;
}

createRoot(document.getElementById('antd-demo')!).render(<Demo/>);
const preview = document.querySelector('.layout-preview');
if (preview) new ResizeObserver(() => {
  const box = preview.getBoundingClientRect();
  document.querySelector('.layout-preview__metrics')!.textContent = `窗口 ${innerWidth}px · 布局宽 ${Math.round(box.width)}px`;
}).observe(preview);
