---
layout: null
lang-exclusive: [zh-CN]
---

(() => {
  const list = document.getElementById('post-list');
  const navigation = document.getElementById('post-pagination');
  if (!list || !navigation || !window.IntersectionObserver) return;

  const chinese = document.documentElement.lang.startsWith('zh');
  const labels = chinese
    ? { more: '加载更多文章', loading: '正在加载…', retry: '加载失败，点击重试', end: '已显示全部文章' }
    : { more: 'Load more posts', loading: 'Loading…', retry: 'Loading failed. Retry', end: 'All posts loaded' };
  let nextUrl = navigation.querySelector('[rel="next"]')?.href;
  if (!nextUrl) return;
  let loading = false;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-outline-secondary';
  button.textContent = labels.more;
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  navigation.replaceChildren(button, status);

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) loadMore();
  }, { rootMargin: '600px' });

  function finish() {
    button.hidden = true;
    status.textContent = labels.end;
    observer.disconnect();
  }

  async function loadMore() {
    if (loading || !nextUrl) return;
    loading = true;
    button.disabled = true;
    status.textContent = labels.loading;
    observer.unobserve(navigation);
    try {
      const response = await fetch(nextUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Post page returned ${response.status}`);
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      const cards = page.querySelectorAll('#post-list > article');
      if (!cards.length) throw new Error('Post page contains no cards');
      const nextPath = page.querySelector('#post-pagination [rel="next"]')?.getAttribute('href');
      const followingUrl = nextPath ? new URL(nextPath, response.url).href : null;
      const existing = new Set(Array.from(list.querySelectorAll('.post-preview'), (link) => link.getAttribute('href')));
      for (const card of cards) {
        const href = card.querySelector('.post-preview')?.getAttribute('href');
        if (!href || existing.has(href)) continue;
        list.append(document.importNode(card, true));
        existing.add(href);
      }
      nextUrl = followingUrl;
      status.textContent = '';
      button.textContent = labels.more;
      if (nextUrl) observer.observe(navigation);
      else finish();
    } catch (error) {
      console.error('Could not load more posts', error);
      status.textContent = labels.retry;
      button.textContent = labels.retry;
    } finally {
      loading = false;
      button.disabled = false;
    }
  }

  button.addEventListener('click', loadMore);
  observer.observe(navigation);
})();
