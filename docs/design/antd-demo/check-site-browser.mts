// SITE_URL=http://127.0.0.1:4178 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node check-site-browser.mts
import assert from 'node:assert/strict';
assert.ok(process.env.PLAYWRIGHT_MODULE, 'Set PLAYWRIGHT_MODULE');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const base = process.env.SITE_URL || 'http://127.0.0.1:4178';
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  const page = await browser.newPage({locale:'zh-CN'});
  const errors: string[] = [];
  page.on('pageerror',(error: Error) => errors.push(error.message));
  for (const [path, count] of [
    ['/',2], ['/en/',2],
    ['/learn/agent-zero-to-one/agent-patterns-with-pi/',2],
    ['/en/learn/agent-zero-to-one/agent-patterns-with-pi/',2],
    ['/learn/agent-zero-to-one/llm-call-anatomy/',1]
  ] as const) {
    await page.goto(base + path);
    const trigger = page.locator('[data-ui="antd"] button');
    await trigger.waitFor();
    for (const width of [360,768,1200]) {
      await page.setViewportSize({width,height:900});
      await trigger.click();
      await page.getByRole('menu').waitFor();
      assert.equal(await page.getByRole('menuitem').count(),count, `${path}: language count`);
      assert.equal(await page.getByRole('menu').locator('[aria-current="page"]').count(),1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false, `${path}/${width}: overflow`);
      await page.keyboard.press('Escape');
      await page.getByRole('menu').waitFor({state:'hidden'});
    }
  }
  // Exercise the actual Chirpy preference controls while this migration slice shares its theme.
  await page.locator('#mode-toggle').click();
  await page.locator('button[data-theme-mode="dark"]').click();
  await page.locator('[data-ui="antd"] button').click();
  await page.getByRole('menu').waitFor();
  await page.screenshot({path:'/tmp/site-antd-pending-dark.png',animations:'disabled'});
  assert.equal(await page.locator('html').getAttribute('data-bs-theme'),'dark');
  await page.keyboard.press('Escape');
  await page.route('https://cdn.jsdelivr.net/npm/antd@6.5.0/dist/antd.min.js',(route: any) => route.abort());
  await page.reload();
  assert.equal(await page.locator('[data-ui="antd"]').count(),0);
  assert.equal(await page.locator('.language-switcher a.language-link').count(),1);
  await page.locator('.language-trigger').click();
  await page.locator('.language-menu.show').waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: home/paired/pending zh/en, 360/768/1200, Escape, dark theme, CDN fallback; no page errors.');
} finally { await browser.close(); }
