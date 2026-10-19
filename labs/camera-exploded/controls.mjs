import '../exploded/examples/camera/lab/main.js';
import { mountButton } from '../shared/antd-controls.mjs';

// The shared example owns simulation commands. Hidden originals are its local API;
// each visible Ant button owns one click that dispatches exactly one original click.
const wired = new WeakSet                   ();
function connect() {
  for (const original of document.querySelectorAll                   ('#app button:not(.ant-btn), .kit-modal button:not(.ant-btn)')) {
    if (wired.has(original) || original.closest('.lab-control')) continue;
    wired.add(original);
    const visible = original.cloneNode(true)                     ;
    wired.add(visible);
    visible.removeAttribute('id');
    visible.removeAttribute('hidden');
    const container = original.closest('.kit-seg');
    if (container) { container.classList.remove('kit-seg'); container.classList.add('lab-seg'); }
    original.before(visible);
    const control = mountButton(visible, () => original.click());
    const host = original.previousElementSibling               ;
    original.hidden = true;
    original.dataset.rendererCommand = 'true';
    original.tabIndex = -1;
    original.setAttribute('aria-hidden', 'true');
    // Shared modal.open focuses its own close button; send that focus to the visible control.
    original.focus = options => (host.matches('button') ? host : host.querySelector('button'))?.focus(options);
    const sync = () => control.update({ label: original.textContent ?? '', disabled: original.disabled,
      pressed: original.hasAttribute('aria-pressed') ? original.getAttribute('aria-pressed') === 'true' : undefined });
    new MutationObserver(sync).observe(original, { attributes: true, attributeFilter: ['disabled', 'aria-pressed'], childList: true, characterData: true, subtree: true });
    sync();
  }
}
connect();
new MutationObserver(connect).observe(document.body, { childList: true, subtree: true });
