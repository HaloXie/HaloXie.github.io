// 浏览器审计 + 截图：起本地静态服务器和 headless Chrome（直连 DevTools 协议，无依赖），
// 打开 lab 页面，检查控制台报错、未捕获异常、加载失败和主画面 draw call，再截图。任一不过退出码为 1。
// 运行：node scripts/capture.ts <lab 的 index.html> [--root <服务器根目录>] [--theme light|dark]
//        [--query "view=overview"] [--out shot.png] [--width 1280] [--height 800] [--wait 6000] [--max-calls 200]
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export type CaptureOptions = {
  page: string;
  root: string;
  theme?: 'light' | 'dark';
  query?: string;
  out?: string;
  width: number;
  height: number;
  wait: number;
  maxCalls: number;
};
export type CaptureResult = { problems: string[]; stats: { mainCalls: number; extraCalls: number; scheme: string } | null; overflowX: boolean };

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function serve(root: string): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = resolve(root, `.${path}`);
    if (!file.startsWith(root + sep) && file !== root) return void res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, port: (server.address() as { port: number }).port })));
}

function launch(profile: string): Promise<{ chrome: ChildProcess; port: number }> {
  if (!existsSync(CHROME)) throw new Error(`找不到 Chrome：${CHROME}（可用环境变量 CHROME 指定）`);
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  return new Promise((done, fail) => {
    let text = '';
    const timer = setTimeout(() => fail(new Error('Chrome 20 秒内没有启动')), 20_000);
    chrome.stderr?.on('data', (chunk) => {
      text += chunk;
      const m = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
      if (m) {
        clearTimeout(timer);
        done({ chrome, port: Number(m[1]) });
      }
    });
    chrome.on('exit', (code) => fail(new Error(`Chrome 启动前退出：${code}`)));
  });
}

// 最小 CDP 客户端：send 等回包，on 收事件。
async function connect(port: number) {
  const pages = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
  const target = pages.find((p) => p.type === 'page');
  if (!target) throw new Error('Chrome 里没有页面');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, fail) => { ws.onopen = done; ws.onerror = fail; });
  let id = 0;
  const waiting = new Map<number, { done: (v: unknown) => void; fail: (e: Error) => void }>();
  const handlers = new Map<string, Array<(p: any) => void>>();
  ws.onmessage = (e) => {
    const msg = JSON.parse(String(e.data));
    if (msg.id && waiting.has(msg.id)) {
      const w = waiting.get(msg.id)!;
      waiting.delete(msg.id);
      msg.error ? w.fail(new Error(`${msg.error.message}`)) : w.done(msg.result);
    } else if (msg.method) for (const h of handlers.get(msg.method) ?? []) h(msg.params);
  };
  return {
    send: (method: string, params: object = {}) => new Promise<any>((done, fail) => {
      waiting.set(++id, { done, fail });
      ws.send(JSON.stringify({ id, method, params }));
    }),
    on: (method: string, fn: (p: any) => void) => handlers.set(method, [...(handlers.get(method) ?? []), fn]),
    close: () => ws.close(),
  };
}

export async function capture(o: CaptureOptions): Promise<CaptureResult> {
  const root = resolve(o.root);
  const page = resolve(o.page);
  if (!page.startsWith(root + sep)) throw new Error(`页面不在服务器根目录内：${page}`);
  const { server, port: httpPort } = await serve(root);
  const profile = mkdtempSync(join(tmpdir(), 'exploded-chrome-'));
  const { chrome, port } = await launch(profile);
  const problems: string[] = [];
  try {
    const cdp = await connect(port);
    const ignore = (url = '') => url.endsWith('/favicon.ico');
    cdp.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') problems.push(`console.error: ${p.args.map((a: any) => a.value ?? a.description).join(' ')}`); });
    cdp.on('Runtime.exceptionThrown', (p) => problems.push(`未捕获异常: ${p.exceptionDetails.exception?.description ?? p.exceptionDetails.text}`));
    cdp.on('Log.entryAdded', (p) => { if (p.entry.level === 'error' && !ignore(p.entry.url)) problems.push(`加载失败: ${p.entry.text} ${p.entry.url ?? ''}`); });
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: o.width, height: o.height, deviceScaleFactor: 1, mobile: false });
    if (o.theme) await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: o.theme }] });
    const url = `http://127.0.0.1:${httpPort}/${relative(root, page).split(sep).join('/')}${o.query ? `?${o.query}` : ''}`;
    await cdp.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, o.wait));
    const { result } = await cdp.send('Runtime.evaluate', {
      expression: 'JSON.stringify({ stats: window.__exploded ?? null, overflowX: document.documentElement.scrollWidth > innerWidth })',
      returnByValue: true,
    });
    const { stats, overflowX } = JSON.parse(result.value);
    if (!stats) problems.push('页面没有 window.__exploded：不是用 kit 的 createStage 搭的，或启动前就出错了');
    else if (stats.mainCalls > o.maxCalls) problems.push(`主画面 draw call ${stats.mainCalls} 超出预算 ${o.maxCalls}`);
    else if (stats.mainCalls === 0) problems.push('主画面 draw call 为 0：场景没有渲染');
    if (overflowX) problems.push('页面出现横向滚动');
    if (o.theme && stats && stats.scheme !== o.theme) problems.push(`明暗不对：期望 ${o.theme}，页面是 ${stats.scheme}`);
    if (o.out) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(o.out, Buffer.from(shot.data, 'base64'));
    }
    cdp.close();
    return { problems, stats, overflowX };
  } finally {
    chrome.kill('SIGKILL');
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i === -1 ? undefined : args.splice(i, 2)[1];
  };
  const theme = flag('--theme') as CaptureOptions['theme'];
  const opts: CaptureOptions = {
    root: flag('--root') ?? process.cwd(),
    theme,
    query: flag('--query'),
    out: flag('--out'),
    width: Number(flag('--width') ?? 1280),
    height: Number(flag('--height') ?? 800),
    wait: Number(flag('--wait') ?? 6000),
    maxCalls: Number(flag('--max-calls') ?? 200),
    page: args[0] ?? '',
  };
  if (!opts.page || !existsSync(opts.page) || (theme && theme !== 'light' && theme !== 'dark')) {
    console.error('用法：node scripts/capture.ts <index.html> [--root <dir>] [--theme light|dark] [--query ...] [--out shot.png] [--width 1280] [--height 800] [--wait 6000] [--max-calls 200]');
    process.exit(2);
  }
  const { problems, stats } = await capture(opts);
  for (const p of problems) console.log(`FAIL ${p}`);
  console.log(problems.length ? `capture: ${problems.length} 个问题` : `capture: OK · ${stats?.scheme} · 主画面 ${stats?.mainCalls} draw call ≤ ${opts.maxCalls}${opts.out ? ` · 截图 ${opts.out}` : ''}`);
  process.exit(problems.length ? 1 : 0);
}
