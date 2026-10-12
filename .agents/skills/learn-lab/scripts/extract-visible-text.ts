// 抽出一节课里用户看得见的文字（HTML 文本、提示属性、JS/TS 字符串与模板字符串的每个分支），
// 输出成带 文件:行 的 markdown 清单，作为核验者逐条判定教学论断的起点。
// 用法：node scripts/extract-visible-text.ts <课目录> [--all] [--exclude <正则>]
//
// 保证范围：.html / .js / .mjs / .ts / .mts 文件；HTML 文本节点，title / alt / placeholder / aria-label（单双引号都支持）；
// JS 里含中文、或含至少两个英文词的字符串。全英文课用 --all 取消这个过滤。
// 不覆盖：JSX 文本节点（.tsx）；${} 插值里若含注释或正则、其中的大括号可能让分支文字抽错；由 JS 运行时拼出、源码里不存在的文字。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// kind=text：待判定的可见文字；kind=html-number：HTML 初始标记里写死的数值（同源 gate 的嫌疑，JS 渲染后可能与 state 不一致）
export interface Hit {
  file: string;
  line: number;
  text: string;
  count: number;
  kind: 'text' | 'html-number';
}

const CJK = /[㐀-鿿぀-ヿ]/;
// 核验脚本、测试脚本里的字符串用户看不到，默认跳过
const DEFAULT_EXCLUDE = /(^|\/)(check|verify|test)[^/]*\.m?[jt]s$|\.test\.m?[jt]s$/;
const REGEX_BEFORE = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '+',
  '-',
  '*',
  '%',
  '<',
  '>',
  '~',
  '^',
  '',
]);

function isVisible(text: string, all: boolean): boolean {
  const t = text.trim();
  if (t === '') return false;
  if (all) return true;
  if (/^(https?:|\.{0,2}\/|#[\w-]+$|data:)/.test(t)) return false;
  if (CJK.test(t)) return true;
  // 英文：至少两个 3 字母以上的词，且含空格，排除 class 名、标识符
  return /\s/.test(t) && (t.match(/[A-Za-z]{3,}/g)?.length ?? 0) >= 2 && !/[{};]\s*$/.test(t);
}

type Emit = (line: number, text: string, kind?: Hit['kind']) => void;

// 跳过一个字符串或模板字符串，返回结束后的位置；只用于在 ${...} 里找配对的右括号
function skipQuoted(source: string, index: number): number {
  const q = source[index];
  index++;
  while (index < source.length && source[index] !== q) {
    if (source[index] === '\\') index++;
    else if (q === '`' && source[index] === '$' && source[index + 1] === '{')
      index = findExprEnd(source, index + 2);
    index++;
  }
  return index;
}

function findExprEnd(source: string, index: number): number {
  let depth = 1;
  while (index < source.length) {
    const c = source[index];
    if (c === '"' || c === "'" || c === '`') index = skipQuoted(source, index);
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return index;
    index++;
  }
  return index;
}

function countLines(s: string): number {
  let n = 0;
  for (const c of s) if (c === '\n') n++;
  return n;
}

interface Cursor {
  index: number;
  line: number;
}

// 单行注释：跳到换行处（不含），行号不变。
function skipLineComment(source: string, index: number): number {
  let index_ = index;
  while (index_ < source.length && source[index_] !== '\n') index_++;
  return index_;
}

// 块注释：跳到 `*/` 之后，累计跨行的行号。
function skipBlockComment(source: string, index: number, line: number): Cursor {
  const end = source.indexOf('*/', index + 2);
  const stop = end === -1 ? source.length : end + 2;
  return { index: stop, line: line + countLines(source.slice(index, stop)) };
}

// 单/双引号字符串：原样转义解码，emit 一次，返回收尾位置（不跨行）。
function scanQuoted(source: string, index: number, line: number, emit: Emit): number {
  const quote = source[index];
  const at = line;
  let text = '';
  let index_ = index + 1;
  while (index_ < source.length && source[index_] !== quote && source[index_] !== '\n') {
    if (source[index_] === '\\') {
      index_++;
      text += source[index_] ?? '';
    } else text += source[index_] ?? '';
    index_++;
  }
  emit(at, text);
  return index_ + 1;
}

// 模板字符串：${} 插值递归各自单独抽出，主体文字压成一行 emit。
function scanTemplate(source: string, index: number, line: number, emit: Emit): Cursor {
  const at = line;
  let text = '';
  let index_ = index + 1;
  let currentLine = line;
  while (index_ < source.length && source[index_] !== '`') {
    if (source[index_] === '\\') {
      index_++;
      text += source[index_] ?? '';
      index_++;
      continue;
    }
    if (source[index_] === '$' && source[index_ + 1] === '{') {
      const end = findExprEnd(source, index_ + 2);
      const expr = source.slice(index_ + 2, end);
      // 插值里的字符串（三元分支的文案等）各自单独抽出
      scanJs(expr, currentLine, emit);
      currentLine += countLines(expr);
      text += '{…}';
      index_ = end + 1;
      continue;
    }
    if (source[index_] === '\n') currentLine++;
    text += source[index_] ?? '';
    index_++;
  }
  emit(at, text.replaceAll(/\s+/g, ' '));
  return { index: index_ + 1, line: currentLine };
}

// 正则字面量：跳过字符类里的 `/`，再跳过尾部 flags；不 emit（正则不是可见文字）。
// 逐字符处理，用 if/else 避免 switch 的穷举要求（ch 是 string | undefined）。
function skipRegexBody(source: string, index: number): number {
  let index_ = index;
  let inClass = false;
  while (index_ < source.length && source[index_] !== '\n' && (inClass || source[index_] !== '/')) {
    const ch: string | undefined = source[index_];
    switch (ch) {
      case '\\': {
        index_++;
        break;
      }
      case '[': {
        inClass = true;
        break;
      }
      case ']': {
        inClass = false;
        break;
      }
      case undefined: {
        break;
      }
      default: {
        break;
      }
    }
    index_++;
  }
  return index_;
}

function skipRegex(source: string, index: number): number {
  let index_ = skipRegexBody(source, index + 1);
  index_++;
  while (index_ < source.length && /[a-z]/.test(source[index_] ?? '')) index_++;
  return index_;
}

function escPipe(s: string): string {
  return s.replaceAll('|', String.raw`\|`);
}

export function scanJs(source: string, startLine: number, emit: Emit): void {
  let line = startLine;
  let previous = '';
  let index = 0;
  while (index < source.length) {
    const result = scanJsChar(source, index, line, previous, emit);
    index = result.index;
    line = result.line;
    previous = result.previous;
  }
}

interface ScanJsCharResult {
  index: number;
  line: number;
  previous: string;
}

function scanJsChar(
  source: string,
  index: number,
  line: number,
  previous: string,
  emit: Emit,
): ScanJsCharResult {
  const c = source.charAt(index);
  const d = source[index + 1];
  if (c === '/' && d === '/') {
    return { index: skipLineComment(source, index), line, previous };
  }
  if (c === '/' && d === '*') {
    const r = skipBlockComment(source, index, line);
    return { index: r.index, line: r.line, previous };
  }
  if (c === '"' || c === "'") {
    return { index: scanQuoted(source, index, line, emit), line, previous: c };
  }
  if (c === '`') {
    const r = scanTemplate(source, index, line, emit);
    return { index: r.index, line: r.line, previous: '`' };
  }
  if (c === '/' && REGEX_BEFORE.has(previous)) {
    return { index: skipRegex(source, index), line, previous: '/' };
  }
  const newLine = c === '\n' ? line + 1 : line;
  const newPrevious = /\s/.test(c) ? previous : c;
  return { index: index + 1, line: newLine, previous: newPrevious };
}

// HTML 属性扫描：用两个单引号/双引号各一个 RegExp，避免交替分支触发 super-linear 告警
const ATTR_DQ = /\b(?:title|alt|placeholder|aria-label)\s*=\s*"([^"]*)"/gi;
const ATTR_SQ = /\b(?:title|alt|placeholder|aria-label)\s*=\s*'([^']*)'/gi;

function blankNonNewlines(s: string): string {
  return s.replaceAll(/[^\n]/g, ' ');
}

function htmlLineAt(source: string, offset: number): number {
  return 1 + countLines(source.slice(0, offset));
}

export function scanHtml(source: string, emit: Emit): void {
  for (const m of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const bodyStart = m.index + m[0].indexOf('>') + 1;
    scanJs(m[1] ?? '', htmlLineAt(source, bodyStart), emit);
  }
  // 抹掉 script / style / 注释，保留换行，行号不偏
  const markup = source.replaceAll(
    /<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi,
    blankNonNewlines,
  );
  for (const m of markup.matchAll(/>([^<]+)</g)) {
    const text = (m[1] ?? '').replaceAll(/\s+/g, ' ');
    const line = htmlLineAt(markup, m.index + 1);
    emit(line, text);
    // 只标「以数值为主」的节点（如 1/250s、f/2.8、9）；句子里顺带提到的数字不算状态显示
    const letters = text.replaceAll(/\d/g, '').match(/[A-Za-z㐀-鿿぀-ヿ]/g)?.length ?? 0;
    if (/\d/.test(text) && letters <= 4) emit(line, text, 'html-number');
  }
  for (const m of markup.matchAll(ATTR_DQ)) {
    emit(htmlLineAt(markup, m.index), m[1] ?? '');
  }
  for (const m of markup.matchAll(ATTR_SQ)) {
    emit(htmlLineAt(markup, m.index), m[1] ?? '');
  }
}

function walk(directory: string, exclude: RegExp, root: string, out: string[]): void {
  for (const name of readdirSync(directory)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const p = path.join(directory, name);
    if (statSync(p).isDirectory()) {
      walk(p, exclude, root, out);
    } else if (/\.(html?|m?js|m?ts)$/.test(name) && !exclude.test(path.relative(root, p))) {
      out.push(p);
    }
  }
}

function recordHit(
  seen: Map<string, Hit>,
  file: string,
  all: boolean,
  line: number,
  raw: string,
  kind: Hit['kind'],
): void {
  const text = raw.trim();
  if (kind !== 'text' || isVisible(text, all)) {
    const key = `${kind}\u0000${text}`;
    const hit = seen.get(key);
    if (hit === undefined) {
      seen.set(key, { file, line, text, count: 1, kind });
    } else {
      hit.count++;
    }
  }
}

function makeEmit(seen: Map<string, Hit>, file: string, all: boolean): Emit {
  return (line, raw, kind = 'text') => {
    recordHit(seen, file, all, line, raw, kind);
  };
}

export function extract(
  directory: string,
  options: { all?: boolean; exclude?: RegExp } = {},
): Hit[] {
  const files: string[] = [];
  walk(directory, options.exclude ?? DEFAULT_EXCLUDE, directory, files);
  const seen = new Map<string, Hit>();
  const all = options.all ?? false;
  for (const file of files.toSorted((a, b) => a.localeCompare(b))) {
    const related = path.relative(directory, file);
    const emit = makeEmit(seen, related, all);
    const source = readFileSync(file, 'utf8');
    if (/\.html?$/.test(file)) scanHtml(source, emit);
    else scanJs(source, 1, emit);
  }
  return [...seen.values()];
}

export function toMarkdown(hits: Hit[]): string {
  const texts = hits.filter((h) => h.kind === 'text');
  const numbers = hits.filter((h) => h.kind === 'html-number');
  const countLabel = (h: Hit): string => (h.count > 1 ? String(h.count) : '');
  const out = [
    '## 可见文字',
    '',
    '| 出处 | 文字 | 重复 | 是否论断 | 核验方式 | 结论 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...texts.map((h) => `| ${h.file}:${h.line} | ${escPipe(h.text)} | ${countLabel(h)} | | | |`),
  ];
  if (numbers.length > 0) {
    out.push(
      '',
      '## HTML 里写死的数值（逐个确认初始化后会被 state 覆盖，且与 state 一致）',
      '',
      '| 出处 | 文字 |',
      '| --- | --- |',
      ...numbers.map((h) => `| ${h.file}:${h.line} | ${escPipe(h.text)} |`),
    );
  }
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const targetDirectory = args.find(
    (a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--exclude',
  );
  if (targetDirectory === undefined) {
    process.stderr.write(
      '用法：node scripts/extract-visible-text.ts <课目录> [--all] [--exclude <正则>]\n',
    );
    process.exit(2);
  }
  const ex = args.indexOf('--exclude');
  const pattern = ex === -1 ? undefined : args[ex + 1];
  const hits = extract(targetDirectory, {
    all: args.includes('--all'),
    ...(pattern === undefined ? {} : { exclude: new RegExp(pattern) }),
  });
  process.stdout.write(toMarkdown(hits) + '\n');
  const n = hits.filter((h) => h.kind === 'html-number').length;
  process.stderr.write(`共 ${hits.length - n} 条可见文字，${n} 处 HTML 写死的数值`);
}
