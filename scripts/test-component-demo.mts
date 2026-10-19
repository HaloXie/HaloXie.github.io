// Run with Node 24: node scripts/test-component-demo.mts
// Exercises the actual inline handlers without a browser or external packages.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../docs/design/blog-base-style-demo.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
new vm.Script(script);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), `Missing anchor ${id}`);
for (const id of ['lesson-observation', 'explanation-reference', 'reader-search']) {
  assert.match(html, new RegExp(`id="${id}" hidden`), `${id} must start hidden`);
}

type NodeStub = {
  textContent: string; value: string; disabled: boolean; hidden: boolean; checked: boolean;
  children: NodeStub[]; attributes: Record<string, string>;
  setAttribute: (key: string, value: string) => void;
  append: (child: NodeStub) => void;
  replaceChildren: (...children: NodeStub[]) => void;
  focus: () => void;
};
function element(): NodeStub {
  return {
    textContent: '', value: '', disabled: false, hidden: false, checked: false, children: [], attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    append(child) { this.children.push(child); },
    replaceChildren(...children) { this.children = children; },
    focus() {}
  };
}
const nodes = new Map<string, NodeStub>();
const byId = (id: string) => {
  if (!nodes.has(id)) nodes.set(id, element());
  return nodes.get(id)!;
};
let pending: (() => void) | undefined;
const context = vm.createContext({
  byId, document: { createElement: element },
  setTimeout(callback: () => void) { pending = callback; return 1; }
});
const loadStart = script.indexOf("byId('load-more').addEventListener('click', () => {");
const loadEnd = script.indexOf('      function travelMinutes', loadStart);
const loadHandler = script.slice(loadStart, loadEnd)
  .replace("byId('load-more').addEventListener('click', () => {", 'function load() {')
  .replace(/\}\);\s*$/, '}');
vm.runInContext(`let loadTimer; ${loadHandler}`, context);
byId('loaded-posts').children.push(element());
byId('load-error').checked = true;
vm.runInContext('load()', context);
assert.equal(byId('load-more').disabled, true, 'Loading disables repeated requests');
assert.equal(byId('loaded-posts').attributes['aria-busy'], 'true');
pending!();
assert.equal(byId('loaded-posts').children.length, 1, 'Failure preserves content');
assert.equal(byId('load-more').disabled, false, 'Failure permits retry');
assert.equal(byId('load-more').textContent, '重试加载');
byId('load-error').checked = false;
vm.runInContext('load()', context);
pending!();
assert.equal(byId('loaded-posts').children.length, 3, 'Retry appends exactly two posts');
assert.equal(byId('load-more').disabled, true, 'Completed list cannot duplicate posts');
assert.equal(byId('loaded-posts').attributes['aria-busy'], 'false');

vm.runInContext(script.match(/function travelMinutes\(speed\) \{[^}]+\}/)![0], context);
assert.equal(vm.runInContext('travelMinutes(3)', context), 120);
assert.equal(vm.runInContext('travelMinutes(6)', context), 60);
assert.equal(vm.runInContext('travelMinutes(1)', context), 360);

const results = ['一次小实验', 'Agent 的最小循环', '阅读工具'].map(text => Object.assign(element(), { textContent: text }));
context.document.querySelectorAll = () => results;
const filterStart = script.indexOf('function filterExamples()');
const filterEnd = script.indexOf("      byId('article-query').addEventListener", filterStart);
vm.runInContext(script.slice(filterStart, filterEnd), context);
byId('article-query').value = '  AGENT ';
vm.runInContext('filterExamples()', context);
assert.deepEqual(results.map(node => node.hidden), [true, false, true]);
byId('article-query').value = '<img onerror=alert(1)>';
vm.runInContext('filterExamples()', context);
assert.ok(results.every(node => node.hidden), 'Query is text, not HTML');
assert.match(byId('search-status').textContent, /没有匹配/);
byId('article-query').value = '';
vm.runInContext('filterExamples()', context);
assert.ok(results.every(node => !node.hidden));

const english = element();
let readerLanguage = 'en';
context.setReaderLanguage = (language: string) => { readerLanguage = language; };
context.document.querySelector = () => english;
context.event = { target: { checked: true } };
const pendingStart = script.indexOf('        const pending = event.target.checked;');
const pendingEnd = script.indexOf('      });', pendingStart);
vm.runInContext(`{ ${script.slice(pendingStart, pendingEnd)} }`, context);
assert.equal(english.hidden, true, 'Pending translation removes English');
assert.equal(readerLanguage, 'zh-CN', 'Pending translation returns the reader to Chinese');
context.event.target.checked = false;
vm.runInContext(`{ ${script.slice(pendingStart, pendingEnd)} }`, context);
assert.equal(english.hidden, false);
assert.equal(byId('pending-note').hidden, true);

const controls = [element(), element(), element(), element()];
const steps = [element(), element(), element()];
let focused = false;
byId('travel-speed').value = '6';
byId('travel-speed').focus = () => { focused = true; };
context.document.querySelector = () => ({ removeAttribute() {} });
context.document.querySelectorAll = () => steps;
context.FormData = class { get() { return 'same'; } };
context.updateObservation = () => {};
context.event = { preventDefault() {}, currentTarget: { querySelectorAll: () => controls } };
const predictionStart = script.indexOf("      byId('prediction-form').addEventListener('submit', event => {");
const predictionEnd = script.indexOf("      byId('teach-back').addEventListener", predictionStart);
const predictionHandler = script.slice(predictionStart, predictionEnd)
  .replace("byId('prediction-form').addEventListener('submit', event => {", 'function submitPrediction(event) {')
  .replace(/\}\);\s*$/, '}');
vm.runInContext(`${predictionHandler}\nsubmitPrediction(event);`, context);
assert.ok(controls.every(control => control.disabled), 'Prediction is locked before exploration');
assert.equal(byId('lesson-observation').hidden, false);
assert.match(byId('prediction-feedback').textContent, /预测与观察不同/);
assert.equal(steps[1].attributes['aria-current'], 'step');
assert.equal(focused, true, 'Observation receives focus after reveal');

// Execute the actual loading reset branch while a request is pending.
let cancelled = false;
context.clearTimeout = () => { cancelled = true; pending = undefined; };
context.Object = Object;
vm.runInContext('load()', context);
const resetStart = script.indexOf('          clearTimeout(loadTimer);');
const resetEnd = script.indexOf('        } else if (button.dataset.reset === \'workspace\')', resetStart);
vm.runInContext(script.slice(resetStart, resetEnd), context);
assert.equal(cancelled, true, 'Reset cancels the pending completion');
assert.equal(pending, undefined);
assert.equal(byId('loaded-posts').children.length, 1);
assert.equal(byId('load-more').disabled, false);
assert.equal(byId('load-error').checked, false);
assert.equal(byId('load-success').checked, true);
console.log('Component demo: syntax, anchors, disclosure, pending translation, prediction lock, loading/retry/reset, search and calculation passed.');
