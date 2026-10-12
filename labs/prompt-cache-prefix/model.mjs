// Equal segments are a teaching assumption, not provider cache blocks.
export const CONFIG = Object.freeze({
  labels: ['工具定义', '系统指令', '参考资料', '当前问题'],
  segmentTokens: 1024,
  readMultiplier: 0.1,
  initialChange: 2,
  source: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching',
  checkedOn: '2026-10-12',
});

// null means identical input; otherwise change the first token of that segment.
export function model(changedSegment, config = CONFIG) {
  if (changedSegment !== null && (!Number.isInteger(changedSegment) || changedSegment < 0 || changedSegment >= config.labels.length)) {
    throw new RangeError('changedSegment must identify an existing segment, or be null');
  }
  const matchedSegments = changedSegment === null ? config.labels.length : changedSegment;
  const totalTokens = config.labels.length * config.segmentTokens;
  const hitTokens = matchedSegments * config.segmentTokens;
  const recomputeTokens = totalTokens - hitTokens;
  return {
    changedSegment, matchedSegments, totalTokens, hitTokens, recomputeTokens,
    relativeCost: (hitTokens * config.readMultiplier + recomputeTokens) / totalTokens,
    segments: config.labels.map((label, index) => ({ label, index, hit: index < matchedSegments, changed: index === changedSegment })),
  };
}

export function describe(state) {
  return `命中 ${state.hitTokens.toLocaleString('en-US')} token · 重算 ${state.recomputeTokens.toLocaleString('en-US')} token · 相对输入成本 ${Math.round(state.relativeCost * 100)}%`;
}
