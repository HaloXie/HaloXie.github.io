// 静态审计：颜色字面量、HTML 内联样式、kit 副本、自写代码体积。每条违规都让退出码为 1。
// 运行：node scripts/check-static.ts <lab 目录> [--kit <kit 目录>] [--budget-kb 220]
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Finding = { file: string; line: number; rule: string; text: string };

// 只有这两种文件允许写颜色字面量：主题 token 与固有色调色板。
export const COLOR_FILES = new Set(['theme.css', 'palette.js']);
const HEX_JS = /\b0x[0-9a-fA-F]{6}\b/g;
const HEX_STR = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;
// 前后不能紧挨 - 或字母数字，否则 var(--exploded-orange) 会被当成颜色名
const NAMED = /(?<![\w-])(?:white|black|red|green|blue|gray|grey|orange|yellow|cyan|magenta|purple|pink|brown|silver|gold)(?![\w-])/g;

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

// CSS：只看声明的值，避开 #id 选择器。
function cssValues(text: string): Array<{ value: string; index: number }> {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  const out: Array<{ value: string; index: number }> = [];
  const decl = /(?:^|[{;])\s*([a-zA-Z-][\w-]*)\s*:\s*([^;{}]+)/g;
  for (const m of clean.matchAll(decl)) {
    const value = m[2];
    out.push({ value, index: (m.index ?? 0) + m[0].length - value.length });
  }
  return out;
}

// JS：去掉注释，看数字十六进制和字符串里的颜色。
function jsStrings(text: string): Array<{ value: string; index: number }> {
  const clean = text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
  const out: Array<{ value: string; index: number }> = [{ value: clean.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, (m) => ' '.repeat(m.length)), index: 0 }];
  for (const m of clean.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) out.push({ value: m[2], index: (m.index ?? 0) + 1 });
  return out;
}

export function findColorLiterals(file: string, text: string): Finding[] {
  if (COLOR_FILES.has(basename(file))) return [];
  const ext = extname(file);
  const found: Finding[] = [];
  const hit = (index: number, t: string) => found.push({ file, line: lineOf(text, index), rule: '颜色字面量只能写在 theme.css / palette.js', text: t });
  if (ext === '.css') {
    for (const { value, index } of cssValues(text)) {
      for (const re of [HEX_STR, FUNC, NAMED]) for (const m of value.matchAll(re)) hit(index + (m.index ?? 0), m[0]);
    }
  } else if (ext === '.js' || ext === '.mjs') {
    const [code, ...strings] = jsStrings(text);
    for (const m of code.value.matchAll(HEX_JS)) hit(m.index ?? 0, m[0]);
    for (const { value, index } of strings) {
      for (const re of [HEX_STR, FUNC]) for (const m of value.matchAll(re)) hit(index + (m.index ?? 0), m[0]);
    }
  }
  return found;
}

// HTML：样式只能经 <link> 引用，不许 <style> 块和 style= 属性（省 token，也避免第二份颜色来源）。
export function checkHtml(file: string, text: string): Finding[] {
  const found: Finding[] = [];
  for (const m of text.matchAll(/<style\b/gi)) found.push({ file, line: lineOf(text, m.index ?? 0), rule: 'HTML 里不许 <style>，样式写进 css 文件再 <link>', text: m[0] });
  for (const m of text.matchAll(/\sstyle\s*=/gi)) found.push({ file, line: lineOf(text, m.index ?? 0), rule: 'HTML 里不许 style= 属性', text: m[0].trim() });
  if (!/<link[^>]+href="[^"]*kit\.css"/.test(text)) found.push({ file, line: 1, rule: '必须 <link> 引用 kit/kit.css', text: '' });
  if (!/<script[^>]+src="[^"]*kit\/scheme\.js"/.test(text)) found.push({ file, line: 1, rule: '必须在 <head> 用 <script src> 引用 kit/scheme.js', text: '' });
  return found;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const CODE = new Set(['.js', '.mjs', '.css', '.html']);

// lab 里不许有 kit 文件的副本：kit 只引用，不拷贝。
export function checkNoKitCopy(labFiles: string[], kitFiles: string[]): Finding[] {
  const kitNames = new Set(kitFiles.map((f) => basename(f)));
  const kitBodies = new Map(kitFiles.map((f) => [readFileSync(f, 'utf8'), f]));
  return labFiles.flatMap((f) => {
    const body = readFileSync(f, 'utf8');
    if (kitBodies.has(body)) return [{ file: f, line: 1, rule: 'lab 里有 kit 文件的副本，改为引用 kit', text: basename(kitBodies.get(body) ?? '') }];
    if (basename(dirname(f)) === 'kit' && kitNames.has(basename(f))) return [{ file: f, line: 1, rule: 'lab 里有 kit/ 目录，改为引用 kit', text: basename(f) }];
    return [];
  });
}

export function checkSize(files: string[], budgetKb: number): Finding[] {
  const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
  return bytes > budgetKb * 1024 ? [{ file: '(合计)', line: 0, rule: `自写代码超出 ${budgetKb} KB`, text: `${(bytes / 1024).toFixed(1)} KB` }] : [];
}

export function audit(labDir: string, kitDir: string, budgetKb = 220): { findings: Finding[]; kb: number } {
  const labFiles = walk(labDir).filter((f) => CODE.has(extname(f)));
  const kitFiles = walk(kitDir).filter((f) => CODE.has(extname(f)));
  const findings: Finding[] = [];
  for (const f of [...labFiles, ...kitFiles]) {
    const text = readFileSync(f, 'utf8');
    findings.push(...(extname(f) === '.html' ? checkHtml(f, text) : findColorLiterals(f, text)));
  }
  findings.push(...checkNoKitCopy(labFiles, kitFiles), ...checkSize([...labFiles, ...kitFiles], budgetKb));
  const kb = [...labFiles, ...kitFiles].reduce((n, f) => n + statSync(f).size, 0) / 1024;
  return { findings, kb };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i === -1 ? undefined : args.splice(i, 2)[1];
  };
  const kitDir = resolve(flag('--kit') ?? join(dirname(fileURLToPath(import.meta.url)), '../kit'));
  const budget = Number(flag('--budget-kb') ?? 220);
  const labDir = args[0];
  if (!labDir || !existsSync(labDir)) {
    console.error('用法：node scripts/check-static.ts <lab 目录> [--kit <kit 目录>] [--budget-kb 220]');
    process.exit(2);
  }
  const { findings, kb } = audit(resolve(labDir), kitDir, budget);
  for (const f of findings) console.log(`FAIL ${relative(process.cwd(), f.file)}:${f.line}  ${f.rule}  ${f.text}`);
  console.log(findings.length ? `check-static: ${findings.length} 处违规` : `check-static: OK · 颜色 / HTML / kit 副本 / 体积 ${kb.toFixed(1)} KB ≤ ${budget} KB`);
  process.exit(findings.length ? 1 : 0);
}
