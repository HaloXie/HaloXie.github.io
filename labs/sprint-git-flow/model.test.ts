import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SCENARIOS, stateAt } from './model.ts';
import { translate } from './locale.ts';

for (const name of ['model', 'locale', 'app']) {
  const source = readFileSync(new URL(`./${name}.ts`, import.meta.url), 'utf8');
  const expected = stripTypeScriptTypes(source).replaceAll(/'\.\/(model|locale)\.ts'/g, "'./$1.mjs'").replace(/^[\t ]+$/gm, '');
  const published = readFileSync(new URL(`./${name}.mjs`, import.meta.url), 'utf8');
  assert.equal(published.slice(published.indexOf('\n') + 1), expected, 'Rebuild browser modules after editing TypeScript');
}

for (const scenario of SCENARIOS) {
  const tags = new Map();
  for (const [index] of scenario.steps.entries()) {
    const state = stateAt(scenario, index);
    if (state.candidate) {
      const identity = JSON.stringify([state.candidate.artifact, state.candidate.contents]);
      if (tags.has(state.candidate.tag)) assert.equal(tags.get(state.candidate.tag), identity, 'A tag cannot move');
      tags.set(state.candidate.tag, identity);
      assert.ok(state.candidate.contents.every(change => state.main.includes(change)));
    }
    if (index === 0) continue;
    const before = stateAt(scenario, index - 1);
    if (state.production.artifact === before.production.artifact || state.production.artifact === 'build-1') continue;
    assert.equal(before.candidate?.verified, true, 'Validate in gray before deployment');
    assert.deepEqual(state.production, before.candidate, 'Deploy the same artifact');
  }
  assert.throws(() => stateAt(scenario, -1), RangeError);
  assert.throws(() => stateAt(scenario, scenario.steps.length), RangeError);
}
const normal = SCENARIOS[0];
assert.deepEqual(stateAt(normal, normal.steps.length - 1).production.contents, ['基线', 'A']);
assert.ok(stateAt(normal, normal.steps.length - 1).develop.includes('B'));
const urgent = SCENARIOS[2];
assert.deepEqual(stateAt(urgent, urgent.steps.length - 1).production.contents, ['基线', 'H']);
const rebuild = SCENARIOS[4];
assert.deepEqual(stateAt(rebuild, 2).develop, ['基线', 'A']);
assert.deepEqual(stateAt(rebuild, 2).branches, stateAt(rebuild, 0).branches);
const recovery = SCENARIOS[3];
assert.equal(stateAt(recovery, 5).production.artifact, 'build-1');
assert.deepEqual(stateAt(recovery, 5).main, ['基线', 'A', 'F']);
console.log('5 scenarios: immutable tags, candidate validation, selective release, rebuild and recovery passed');

// Every visible model string must have an English equivalent, without changing state.
function checkTranslation(value: unknown): void {
  if (typeof value === 'string') {
    assert.equal(translate(value, false), value);
    assert.doesNotMatch(translate(value, true), /\p{Script=Han}/u);
  } else if (Array.isArray(value)) value.forEach(checkTranslation);
  else if (value && typeof value === 'object') Object.values(value).forEach(checkTranslation);
}
checkTranslation(SCENARIOS);
for (const scenario of SCENARIOS) for (const [index] of scenario.steps.entries()) checkTranslation(stateAt(scenario, index));
const appSource = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
for (const match of appSource.matchAll(/'([^'\n]*\p{Script=Han}[^'\n]*)'/gu)) checkTranslation(match[1]);
const htmlSource = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
for (const match of htmlSource.matchAll(/>([^<>]*\p{Script=Han}[^<>]*)</gu)) checkTranslation(match[1]);
for (const match of htmlSource.matchAll(/(?:aria-label|alt)="([^"]*\p{Script=Han}[^"]*)"/gu)) checkTranslation(match[1]);
assert.throws(() => translate('未翻译', true), /Missing English translation/);
console.log('English coverage: all scenarios, state labels, controls, static text and accessible labels passed');
