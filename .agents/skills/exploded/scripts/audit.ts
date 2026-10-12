// 总审计：静态检查 + light / dark × 每个视图的浏览器检查与截图。全部通过才退出 0，最后一行是「audit: OK」。
// 运行：node scripts/audit.ts <lab 目录> [--root <服务器根目录>] [--view "view=overview"]... [--out-dir <截图目录>]
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { audit as staticAudit } from './check-static.ts';
import { capture } from './capture.ts';

const args = process.argv.slice(2);
const views: string[] = [];
let root: string | undefined;
let outDir = join(tmpdir(), 'exploded-audit');
let kitDir = join(dirname(fileURLToPath(import.meta.url)), '../kit');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--view') views.push(args.splice(i--, 2)[1]);
  else if (args[i] === '--root') root = args.splice(i--, 2)[1];
  else if (args[i] === '--out-dir') outDir = args.splice(i--, 2)[1];
  else if (args[i] === '--kit') kitDir = args.splice(i--, 2)[1];
}
const lab = args[0] ? resolve(args[0]) : '';
if (!lab || !existsSync(join(lab, 'index.html'))) {
  console.error('用法：node scripts/audit.ts <含 index.html 的 lab 目录> [--root <dir>] [--view "view=overview"]... [--out-dir <dir>] [--kit <dir>]');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

let failed = 0;
const { findings, kb } = staticAudit(lab, resolve(kitDir));
for (const f of findings) console.log(`FAIL static ${f.file}:${f.line} ${f.rule} ${f.text}`);
console.log(`static: ${findings.length ? `${findings.length} 处违规` : `OK · ${kb.toFixed(1)} KB`}`);
failed += findings.length;

for (const theme of ['light', 'dark'] as const) {
  for (const [i, query] of (views.length ? views : ['']).entries()) {
    const out = join(outDir, `${theme}-${i}.png`);
    const r = await capture({ page: join(lab, 'index.html'), root: resolve(root ?? process.cwd()), theme, query, out, width: 1280, height: 800, wait: 6000, maxCalls: 200 });
    for (const p of r.problems) console.log(`FAIL ${theme} ${query || '(默认视图)'} ${p}`);
    console.log(`${theme} ${query || '(默认视图)'}: ${r.problems.length ? `${r.problems.length} 个问题` : `OK · ${r.stats?.mainCalls} draw call`} · ${out}`);
    failed += r.problems.length;
  }
}
console.log(failed ? `audit: ${failed} 个问题` : 'audit: OK');
process.exit(failed ? 1 : 0);
