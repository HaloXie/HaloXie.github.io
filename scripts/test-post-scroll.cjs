const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const prefix of ['', '/en']) {
      const context = await browser.newContext({ locale: 'zh-CN' });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4173${prefix}/`);
      const initial = await page.locator('#post-list > article').count();
      if (await page.locator('#post-pagination button').count()) {
        await page.locator('#post-pagination').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('#post-pagination button').hidden);
        const links = await page.locator('#post-list .post-preview').evaluateAll((nodes) => nodes.map((node) => node.pathname));
        assert(links.length > initial, 'scroll appends the next page');
        assert.equal(new Set(links).size, links.length, 'no duplicate articles');
        assert(links.every((link) => link.startsWith('/en/') === Boolean(prefix)), 'language stays consistent');
        for (const width of [360, 768, 1200]) {
          await page.setViewportSize({ width, height: 900 });
          for (const mode of ['light', 'dark']) {
            await page.evaluate((value) => document.documentElement.setAttribute('data-bs-theme', value), mode);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${prefix} ${width} ${mode}: no horizontal overflow`);
          }
        }
        console.log(`${prefix || '/'}: ${initial} -> ${links.length} unique articles; responsive checks passed`);
      } else {
        assert(initial > 0, 'single-page language has articles');
        console.log(`${prefix}: ${initial} articles, no unnecessary loader`);
      }
      await context.close();
    }

    const context = await browser.newContext({ locale: 'zh-CN' });
    const page = await context.newPage();
    let requests = 0;
    await page.route(/\/page2\/?$/, async (route) => {
      requests += 1;
      if (requests === 1) await route.fulfill({ status: 503, body: 'Unavailable' });
      else await route.continue();
    });
    await page.goto('http://127.0.0.1:4173/');
    const initial = await page.locator('#post-list > article').count();
    await page.locator('#post-pagination').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: '加载失败，点击重试' }).waitFor();
    assert.equal(await page.locator('#post-list > article').count(), initial, 'failed request preserves cards');
    assert.equal(requests, 1, 'failure does not automatically retry');
    await page.getByRole('button', { name: '加载失败，点击重试' }).click();
    await page.waitForFunction(() => document.querySelector('#post-pagination button').hidden);
    assert.equal(requests, 2, 'manual retry succeeds once');
    await context.close();

    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noScript.newPage();
    await fallback.goto('http://127.0.0.1:4173/');
    await fallback.locator('#post-pagination [rel="next"]').click();
    assert(fallback.url().endsWith('/page2/'), 'no-script next page works');
    assert(await fallback.locator('#post-list > article').count() > 0);
    await noScript.close();
    console.log('Network failure, manual retry, and no-script navigation passed');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
