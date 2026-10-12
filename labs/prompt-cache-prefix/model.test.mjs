import assert from 'node:assert/strict';
import { CONFIG, model } from './model.mjs';

for (const change of [null, ...CONFIG.labels.map((_, index) => index)]) {
  const state = model(change);
  assert.equal(state.hitTokens + state.recomputeTokens, state.totalTokens);
  assert.equal(state.segments.filter(segment => segment.hit).length, state.matchedSegments);
  assert.equal(state.relativeCost, (state.hitTokens * CONFIG.readMultiplier + state.recomputeTokens) / state.totalTokens);
  if (change !== null) assert(state.segments.slice(change).every(segment => !segment.hit));
}
assert.deepEqual([model(2).hitTokens, model(2).recomputeTokens, model(2).relativeCost], [2048, 2048, 0.55]);
assert.equal(model(0).relativeCost, 1);
assert.equal(model(null).relativeCost, CONFIG.readMultiplier);
assert.throws(() => model(-1), RangeError);
assert.throws(() => model(4), RangeError);
assert.throws(() => model(0.5), RangeError);
console.log('model assertions passed: prefix boundary, cost, totals, invalid inputs');
