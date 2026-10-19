import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../shared/antd-controls.ts', import.meta.url), 'utf8');
const published = readFileSync(new URL('../shared/antd-controls.mjs', import.meta.url), 'utf8');
assert.equal(published, stripTypeScriptTypes(source).replace(/^[\t ]+$/gm, ''), 'Rebuild the shared controls');
for (const available of [true, false]) {
  let clicks = 0;
  let replaced = false;
  let tree: any;
  const listeners: (() => void)[] = [];
  const attrs = new Map<string, string>([['aria-pressed', 'false']]);
  const button = {
    textContent: 'Next', id: 'next', className: '', disabled: false,
    attributes: [{ name: 'data-change', value: '2' }],
    hasAttribute: (key: string) => attrs.has(key), getAttribute: (key: string) => attrs.get(key),
    setAttribute: (key: string, value: string) => attrs.set(key, value),
    replaceWith: () => { replaced = true; }, addEventListener: (_: string, fn: () => void) => listeners.push(fn),
  };
  const scope: any = {
    document: { documentElement: { dataset: { bsTheme: 'light' } }, createElement: () => ({}) },
    MutationObserver: class { observe() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    getComputedStyle: () => ({ fontSize: '16px', getPropertyValue: (name: string) => name === '--radius-md' ? '.5rem' : name }),
  };
  if (available) Object.assign(scope, {
    React: { createElement: (type: any, props: any, child: any) => ({type, props, child}) },
    ReactDOM: { createRoot: () => ({ render: (value: any) => { tree = value; } }) },
    antd: { ConfigProvider: 'provider', Button: 'button', theme: { defaultAlgorithm: 'light', darkAlgorithm: 'dark' } },
  });
  runInNewContext(published.replaceAll('export function ', 'function ') + '\nthis.mount = mountButton; this.select = mountSelect;', scope);
  const control = scope.mount(button, () => { clicks += 1; });
  control.update({ label: 'Pause', pressed: true, disabled: true });
  assert.equal(replaced, available);
  if (available) {
    assert.equal(listeners.length, 0, 'React must be the only click owner');
    assert.equal(tree.child.type, 'button');
    assert.equal(tree.child.props['data-change'], '2');
    assert.equal(tree.child.props['aria-pressed'], true);
    assert.equal(tree.child.props.disabled, true);
    assert.equal(tree.child.child, 'Pause');
    assert.equal(tree.props.theme.token.colorPrimary, '--accent');
    tree.child.props.onClick();
  } else {
    assert.equal(listeners.length, 1, 'CDN failure leaves exactly one native listener');
    assert.equal(button.textContent, 'Pause');
    assert.equal(button.disabled, true);
    assert.equal(attrs.get('aria-pressed'), 'true');
    listeners[0]();
  }
  assert.equal(clicks, 1);
  const selectListeners: (() => void)[] = [];
  let changes = 0;
  const originalSelect = { id: 'ap-select', value: '1', options: [{ value: '0', textContent: 'f/1.4' }, { value: '1', textContent: 'f/4' }],
    closest: () => ({ querySelector: () => ({ textContent: 'Aperture' }) }), replaceWith() {},
    addEventListener: (_: string, listener: () => void) => selectListeners.push(listener) };
  const selection = scope.select(originalSelect, () => { changes += 1; });
  assert.equal(selection.value, '1');
  if (available) {
    assert.equal(tree.child.props['aria-label'], 'Aperture');
    assert.equal(selectListeners.length, 0);
    tree.child.props.onChange('0');
  } else {
    assert.equal(selectListeners.length, 1);
    originalSelect.value = '0'; selectListeners[0]();
  }
  assert.equal(selection.value, '0');
  assert.equal(changes, 1);
}
console.log('Control ownership, prop updates, Base tokens, and CDN fallback passed');
