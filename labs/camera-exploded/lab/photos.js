// 照片条：按快门冲洗出的照片滑进底部，最多留 6 张横向对比，点开看大图。
import { modal } from '../kit/hud.js';

export const MAX_PHOTOS = 6;

export function createPhotoStrip(el) {
  const dlg = modal();
  const slots = [];
  for (let i = 0; i < MAX_PHOTOS; i++) {
    const s = document.createElement('div');
    s.className = 'ph-slot';
    el.appendChild(s);
    slots.push(s);
  }
  const hint = document.createElement('div');
  hint.className = 'ph-hint';
  hint.textContent = '按快门，照片会冲洗到这里（最多 6 张）';
  el.appendChild(hint);
  const photos = [];

  function render() {
    slots.forEach((s, i) => {
      const p = photos[i];
      s.replaceChildren();
      s.classList.toggle('full', !!p);
      if (!p) return;
      s.appendChild(p.card);
    });
    hint.style.display = photos.length ? 'none' : '';
  }

  return {
    // canvas = 冲洗好的照片；meta = { title, lines: [] }；from = 起飞点（屏幕坐标）
    add(canvas, meta, from) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ph-card developing';
      card.setAttribute('aria-label', `查看照片：${meta.title}`);
      const img = document.createElement('canvas');
      img.width = canvas.width;
      img.height = canvas.height;
      img.getContext('2d').drawImage(canvas, 0, 0);
      card.appendChild(img);
      const cap = document.createElement('div');
      cap.className = 'ph-cap';
      cap.innerHTML = meta.title;
      card.appendChild(cap);
      card.addEventListener('click', () => {
        const big = document.createElement('canvas');
        big.width = canvas.width;
        big.height = canvas.height;
        big.getContext('2d').drawImage(canvas, 0, 0);
        dlg.open(big, `${meta.title}<br>${meta.lines.join('<br>')}`);
      });
      photos.unshift({ card, meta });
      if (photos.length > MAX_PHOTOS) photos.pop();
      render();
      // 从相机位置飞进照片条第一格
      if (from) {
        const r = slots[0].getBoundingClientRect();
        const dx = from.x - (r.left + r.width / 2);
        const dy = from.y - (r.top + r.height / 2);
        card.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(0.35) rotate(-8deg)`, opacity: 0.2 },
          { transform: `translate(${dx * 0.3}px, ${dy * 0.25 - 40}px) scale(1.25) rotate(4deg)`, opacity: 1, offset: 0.55 },
          { transform: 'none', opacity: 1 },
        ], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      // 冲洗：从发白到显影
      setTimeout(() => card.classList.remove('developing'), 60);
    },
    get count() { return photos.length; },
  };
}
