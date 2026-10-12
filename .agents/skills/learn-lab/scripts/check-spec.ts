// 检查 spec.md 的结构：必填字段是否齐全；「默认可见」是否写成实测数值加阈值；「先预测题」是否写明选定后锁住。
// 只查结构，语义对错（叙述分支是否真用计算结果、数值是否属实）由核验者判断。
// 用法：node scripts/check-spec.ts <spec.md>
import { readFileSync } from 'node:fs';

// 每个必填字段接受的标签前缀；不同 agent 写法略有差异（如「模型」与「公式或模型」）
const REQUIRED: { name: string; labels: string[] }[] = [
  { name: '学完能预测', labels: ['学完能预测'] },
  { name: '现象', labels: ['现象'] },
  { name: '主变量', labels: ['主变量'] },
  { name: '联动', labels: ['联动'] },
  { name: '默认参数', labels: ['默认参数'] },
  { name: '默认可见', labels: ['默认可见'] },
  { name: '先预测题', labels: ['先预测题', '先预测'] },
  { name: '叙述分支', labels: ['叙述分支'] },
  { name: '公式或模型', labels: ['公式或模型', '模型', '公式'] },
];

// 总览课（实体物件 / 系统类领域的第一课）用 SKILL.md 的另一套模板，字段不同。
// 判据：「展示方式」要求拆解视图 + 部件可点击，这是总览课独有的。
const OVERVIEW: { name: string; labels: string[] }[] = [
  { name: '学完能预测', labels: ['学完能预测'] },
  { name: '展示方式', labels: ['展示方式'] },
  { name: '先预测题', labels: ['先预测题', '先预测'] },
  { name: '主体配件列表', labels: ['主体配件列表', '配件列表'] },
  { name: '默认参数', labels: ['默认参数'] },
  { name: '升级/降级效果', labels: ['升级/降级效果', '升级降级效果', '升级 / 降级效果'] },
];

export function isOverviewSpec(lines: string[]): boolean {
  const index = lines.findIndex((l) => {
    const t = l.replace(/^\s*[-*]\s*/, '').replaceAll('**', '');
    const heading = l.replace(/^#+\s*/, '');
    return (
      t.startsWith('展示方式：') ||
      t.startsWith('展示方式:') ||
      heading === '展示方式' ||
      heading.startsWith('展示方式（') ||
      heading.startsWith('展示方式(')
    );
  });
  if (index === -1) return false;
  // 同一行或紧接下面的内容里含有总览课专有关键词
  const context = lines.slice(index, index + 5).join(' ');
  return /拆解|爆炸|可点击/.test(context);
}

function fieldLine(lines: string[], labels: string[]): string | undefined {
  return lines.find((l) => {
    // 匹配 "- 字段：" 或 "* 字段：" 或 "## 字段名"（总览课用标题格式）
    const t = l.replace(/^\s*[-*]\s*/, '').replaceAll('**', '');
    const heading = l.replace(/^#+\s*/, '');
    return labels.some(
      (label) =>
        t.startsWith(`${label}：`) ||
        t.startsWith(`${label}:`) ||
        heading === label ||
        heading.startsWith(`${label}（`) ||
        heading.startsWith(`${label}(`),
    );
  });
}

// 取一个字段从它的标签行起、到下一个字段/标题前的全部文本（含多行内容）
function fieldBlock(lines: string[], labels: string[]): string | undefined {
  const index = lines.findIndex((l) => {
    const t = l.replace(/^\s*[-*]\s*/, '').replaceAll('**', '');
    const heading = l.replace(/^#+\s*/, '');
    return labels.some(
      (label) =>
        t.startsWith(`${label}：`) ||
        t.startsWith(`${label}:`) ||
        heading === label ||
        heading.startsWith(`${label}（`) ||
        heading.startsWith(`${label}(`),
    );
  });
  if (index === -1) return undefined;
  const startLine = lines[index];
  if (startLine === undefined) return undefined; // unreachable: index is a valid findIndex result (not -1)
  // 单行格式（"- 字段：内容"）：只返回那一行，不跨行扫
  if (/^\s*[-*]\s*/.test(startLine) || /^[^#].*[:：]/.test(startLine)) {
    return startLine;
  }
  // 标题格式（"## 字段名"）：收集到下一个 ## 标题或下一个 "- 字段：" 行
  const block: string[] = [startLine];
  for (let index_ = index + 1; index_ < lines.length; index_++) {
    const l = lines[index_];
    if (l === undefined) break; // unreachable: index_ < lines.length by loop condition
    if (/^#+\s/.test(l)) break;
    if (/^\s*[-*]\s*\S.*[:：]/.test(l)) break;
    block.push(l);
  }
  return block.join('\n');
}

function commonProblems(lines: string[]): string[] {
  const problems: string[] = [];
  const predict = fieldBlock(lines, ['先预测题', '先预测']);
  if (predict !== undefined) {
    // 选项要真的列出来：「选项：」或「N 选一」之后至少有一个分隔符（/ 、 ，）
    if (!/(选项|[二三四]选一)[：:]?[^；;。]*?[/、,，]/.test(predict))
      problems.push('「先预测题」没列出选项');
    if (!predict.includes('锁')) problems.push('「先预测题」没写明学习者选定后锁住');
    if (!/(揭晓|并列|实际|结果|对比)/.test(predict))
      problems.push('「先预测题」没写揭晓时显示什么');
  }
  return problems;
}

function checkOverviewSpec(source: string, lines: string[], problems: string[]): string[] {
  for (const f of OVERVIEW) {
    if (fieldLine(lines, f.labels) === undefined) problems.push(`缺字段：${f.name}`);
  }
  const effectsField = OVERVIEW[5];
  if (effectsField === undefined) throw new Error('OVERVIEW missing index 5'); // unreachable: OVERVIEW is a fixed 6-entry literal
  const effects = fieldLine(lines, effectsField.labels);
  // 每个配件至少要写升级和降级两个方向，不能只写最高配 vs 最低配
  if (effects !== undefined && !(effects + source).includes('降'))
    problems.push('「升级/降级效果」只写了升级，没写降级');
  return [...problems, ...commonProblems(lines)];
}

export function checkSpec(source: string): string[] {
  const lines = source.split('\n');
  const problems: string[] = [];
  if (!lines.some((l) => /^#\s+\S/.test(l))) problems.push('缺标题行（# 问题式标题）');

  if (isOverviewSpec(lines)) return checkOverviewSpec(source, lines, problems);

  for (const f of REQUIRED) {
    if (fieldLine(lines, f.labels) === undefined) problems.push(`缺字段：${f.name}`);
  }
  const visible = fieldLine(lines, ['默认可见']);
  if (visible !== undefined && !(/\d/.test(visible) && visible.includes('阈值'))) {
    problems.push('「默认可见」没有写成实测数值加阈值（只写「同屏可见」「明显」不算）');
  }
  return [...problems, ...commonProblems(lines)];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2];
  if (specPath === undefined) {
    process.stderr.write('用法：node scripts/check-spec.ts <spec.md>\n');
    process.exit(2);
  }
  const problems = checkSpec(readFileSync(specPath, 'utf8'));
  if (problems.length === 0) {
    process.stdout.write(`通过：${specPath}\n`);
  } else {
    for (const p of problems) process.stdout.write(`✗ ${p}\n`);
    process.exit(1);
  }
}
