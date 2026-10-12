// kit HUD：分段按钮、数字卡、弹窗。样式在 kit.css。
import { $ } from './util.js';

// 分段按钮：items = [{ label, title? }]；返回 { set(i), buttons }
export function seg(el, items, onPick) {
  el.classList.add('kit-seg');
  el.innerHTML = '';
  const buttons = items.map((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = it.label;
    if (it.title) b.title = it.title;
    b.addEventListener('click', () => onPick(i));
    el.appendChild(b);
    return b;
  });
  return {
    buttons,
    set(i) { buttons.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-pressed', String(k === i)); }); },
  };
}

// 数字卡：cards = [{ key, label, tone }]；返回 set(key, value, sub)
export function statCards(el, cards) {
  el.classList.add('kit-stats');
  el.innerHTML = cards.map((c) => `<div class="kit-stat"><div class="k">${c.label}</div><div class="v tone-${c.tone || 'w'}" id="st-${c.key}"></div><div class="s" id="st-${c.key}-s"></div></div>`).join('');
  return (key, v, s) => {
    const a = $(`st-${key}`);
    const b = $(`st-${key}-s`);
    if (a.textContent !== v) {
      a.textContent = v;
      a.classList.remove('kit-flash');
      void a.offsetWidth;
      a.classList.add('kit-flash');
    }
    if (s !== undefined) b.textContent = s;
  };
}

// 弹窗：open(node, caption)；Esc / 点背景关闭
export function modal() {
  const wrap = document.createElement('div');
  wrap.className = 'kit-modal';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = '<div class="kit-modal-card"><button type="button" class="kit-modal-x" aria-label="关闭">×</button><div class="kit-modal-body"></div><div class="kit-modal-cap"></div></div>';
  document.body.appendChild(wrap);
  const close = () => wrap.classList.remove('open');
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  wrap.querySelector('.kit-modal-x').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  return {
    open(node, cap) {
      const body = wrap.querySelector('.kit-modal-body');
      body.innerHTML = '';
      body.appendChild(node);
      wrap.querySelector('.kit-modal-cap').innerHTML = cap || '';
      wrap.classList.add('open');
      wrap.querySelector('.kit-modal-x').focus();
    },
    close,
    get isOpen() { return wrap.classList.contains('open'); },
  };
}
