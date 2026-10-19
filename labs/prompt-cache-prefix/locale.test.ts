import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translate, localizedDescription } from './locale.ts';
import { CONFIG, model, describe } from './model.mjs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const main = html.match(/<main>([\s\S]*?)<\/main>/)[1];
const texts = [...main.matchAll(/>([^<>]+)</g)].map(match => match[1]);
const attributes = [...main.matchAll(/(?:aria-label|title)="([^"]+)"/g)].map(match => match[1]);
for (const text of [...texts, ...attributes]) {
  assert.equal(translate(text, false), text, 'Chinese must remain unchanged');
  if (text === describe(model(CONFIG.initialChange))) continue; // Runtime commit writes the localized live reading.
  assert.doesNotMatch(translate(text, true), /[\u3400-\u9fff]/u, `Untranslated text: ${text}`);
}
for (const change of [null, 0, 1, 2, 3]) {
  const state = model(change);
  assert.equal(localizedDescription(state, false), describe(state));
  assert.match(localizedDescription(state, true), new RegExp(`Relative input cost ${Math.round(state.relativeCost * 100)}%`));
  assert.doesNotMatch(localizedDescription(state, true), /[\u3400-\u9fff]/u);
}
assert.equal(translate('播放自动演示', true), 'Play tour');
assert.equal(translate('减少动态效果：自动演示已关闭', true), 'Reduced motion: tour disabled');
console.log('locale assertions passed: visible text, accessibility labels, default Chinese, all cost states');
