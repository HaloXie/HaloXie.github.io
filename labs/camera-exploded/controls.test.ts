import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./controls.ts', import.meta.url), 'utf8');
const published = readFileSync(new URL('./controls.mjs', import.meta.url), 'utf8');
assert.equal(published, stripTypeScriptTypes(source));
for (const react of [true, false]) {
  let clicks = 0, mounts = 0;
  let props: any;
  let handler: () => void;
  const observers: (() => void)[] = [];
  const visible: any = { removeAttribute() {}, closest: () => react ? {} : null };
  const original: any = {
    textContent: 'Take photo', disabled: false, dataset: {}, previousElementSibling: visible,
    closest: () => null, cloneNode: () => visible, before() {},
    setAttribute() {}, hasAttribute: () => true, getAttribute: () => 'false', click: () => { clicks += 1; },
  };
  const scope = {
    document: { body: {}, querySelectorAll: () => mounts ? [original, visible] : [original] },
    MutationObserver: class { constructor(fn: () => void) { observers.push(fn); } observe() {} },
    mountButton: (_: unknown, callback: () => void) => { mounts++; handler = callback; return { update: (value: any) => { props = value; } }; },
  };
  runInNewContext(published.replace(/^import .*;\n/gm, ''), scope);
  assert.equal(mounts, 1);
  assert.equal(original.hidden, true);
  assert.equal(original.tabIndex, -1);
  handler!(); assert.equal(clicks, 1, 'One visible click dispatches one command');
  original.disabled = true; original.textContent = 'Busy'; observers[0]();
  assert.equal(props.disabled, true); assert.equal(props.label, 'Busy');
  observers.at(-1)!();
  assert.equal(mounts, 1, 'DOM updates must not remount React or native fallback controls');
}
console.log('Camera controls: one command owner, state synchronization, no duplicate fallback mounting');
