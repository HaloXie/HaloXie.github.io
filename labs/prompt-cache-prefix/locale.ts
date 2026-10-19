import { CONFIG, model, describe } from './model.mjs';

// Exact text entries keep the generated Chinese page and its English UI together.
export const ENGLISH = {
  '前缀校验机 · Prompt caching': 'Prefix machine · Prompt caching',
  '← 返回文章': '← Back to article',
  '交互解释图 · Prompt caching': 'Interactive explainer · Prompt caching',
  '改动一个 token，缓存停在哪里？': 'Change one token. Where does reuse stop?',
  '从左到右沿用同一段前缀。改变一张卡片的开头，校验头就停在它前面；后面的文字即使没变，也要重新计算。': 'Reuse follows one continuous prefix. Change the start of a card and the scanner stops before it. Later text needs recomputation even when unchanged.',
  '图 1': 'Figure 1',
  '前缀校验机': 'Prefix machine',
  '校验头停在可复用前缀的边界': 'The scanner stops at the reusable prefix boundary',
  '纸带校验机：橙色校验头停在第一个改动之前。边界前的连续前缀可复用，边界后的卡片需要重新计算。': 'Prefix machine: the orange scanner stops before the first edit. The continuous prefix before it is reusable; cards after it need recomputation.',
  '橙色校验头：前缀命中边界': 'Orange scanner: cache-hit boundary',
  '深色卡片：从改动处开始重算': 'Dark cards: recompute from the edit',
  '工具定义': 'Tools',
  '系统指令': 'Instructions',
  '参考资料': 'Reference',
  '当前问题': 'Question',
  '命中': 'Cached',
  '改动起点 · 重算': 'Edited · recompute',
  '未改动 · 仍重算': 'Unchanged · recompute',
  '改变提示内容': 'Change prompt content',
  '选择一段，改动它的首个 token：': 'Choose a segment to change its first token:',
  '完全不改': 'No changes',
  '暂停自动演示': 'Pause tour',
  '播放自动演示': 'Play tour',
  '减少动态效果：自动演示已关闭': 'Reduced motion: tour disabled',
  '校验头定位中…': 'Moving scanner…',
  '这台机器假设了什么': 'What this machine assumes',
  '每个段末的前缀都已经缓存、仍然有效，本次也能查询这些边界。卡片只是教学分段，不代表厂商真实 block 大小或断点规则。一次只修改所选段的首个 token，输入总长度不变。': 'A valid cache already exists at every segment end, and this request can query those boundaries. Cards are teaching segments, not provider block sizes or breakpoint rules. Each edit changes only the selected segment’s first token; total input length stays constant.',
  'Anthropic Claude Sonnet 4.6 的缓存读取价 / 普通输入价': 'Anthropic Claude Sonnet 4.6 cache-read price / ordinary input price',
  '来源：确定性 SVG（anatomy skill）。所有 token 与成本读数由同一个模型函数生成。': 'Source: deterministic SVG (anatomy skill). One model function computes all token and cost readings.',
};

export function translate(text, english) {
  if (!english) return text;
  const value = text.trim();
  if (ENGLISH[value]) return text.replace(value, ENGLISH[value]);
  for (const [index, label] of CONFIG.labels.entries()) {
    if (value === `${index + 1} · ${label}`) return `${index + 1} · ${ENGLISH[label]}`;
    if (value === `改第 ${index + 1} 段：${label}`) return `Edit ${index + 1}: ${ENGLISH[label]}`;
  }
  if (value === `教学模型：${CONFIG.labels.length} 段等长输入，每段 ${CONFIG.segmentTokens.toLocaleString('en-US')} token。改动所选段的首个 token；未改动的后缀也不能单独接回原缓存。`) return `Teaching model: ${CONFIG.labels.length} equal segments of ${CONFIG.segmentTokens.toLocaleString('en-US')} tokens. Edit the first token of a segment; the unchanged suffix cannot rejoin the old cache independently.`;
  if (value.startsWith('相对成本只比较本次输入的「缓存读取 + 普通重算」')) return `Relative cost covers cache reads and ordinary recomputation for this input only, with fully uncached input as ${Math.round(model(0).relativeCost * 100)}%. The read multiplier is ${CONFIG.readMultiplier}, based on `;
  if (value === `（查证：${CONFIG.checkedOn}）。不含首次缓存写入、写入溢价及输出费用，不是完整请求账单。`) return ` (checked ${CONFIG.checkedOn}). Initial cache writes, write premiums, and output charges are excluded; this is not a complete request bill.`;
  return text;
}

export function localizedDescription(state, english) {
  return english ? `Cached ${state.hitTokens.toLocaleString('en-US')} tokens · Recompute ${state.recomputeTokens.toLocaleString('en-US')} tokens · Relative input cost ${Math.round(state.relativeCost * 100)}%` : describe(state);
}
