// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node check-browser.mts
import assert from 'node:assert/strict';
const modulePath = process.env.PLAYWRIGHT_MODULE;
assert.ok(modulePath, 'Set PLAYWRIGHT_MODULE to the installed Playwright module');
const { chromium } = await import(modulePath);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  const page = await browser.newPage({ viewport:{width:1200,height:900} });
  const errors: string[] = [];
  page.on('pageerror', (error: Error) => errors.push(error.message));
  await page.goto(new URL('../blog-antd-demo.html', import.meta.url).href);
  await page.locator('.material-nav').first().waitFor();
  const reader = page.locator('#reader-specimen');
  const search = reader.getByRole('button', {name:'搜索',exact:true});
  await search.click();
  const input = reader.getByLabel('搜索示例', {exact:true});
  assert.equal(await input.evaluate((el: Element) => el === document.activeElement), true);
  await input.fill('no-such-post');
  await reader.getByText('没有匹配的示例', {exact:true}).waitFor();
  await input.fill('阅读工具');
  assert.equal(await reader.getByRole('link',{name:'阅读工具',exact:true}).getAttribute('href'), '#reader-specimen');
  await input.press('Escape');
  assert.equal(await search.getAttribute('aria-expanded'), 'false');
  assert.equal(await search.evaluate((el: Element) => el === document.activeElement), true);
  await reader.getByRole('button', {name:/语言/}).click();
  await page.getByRole('menuitem',{name:'English'}).click();
  assert.equal(await reader.locator('.reader-copy').getAttribute('lang'),'en');
  await reader.getByRole('checkbox',{name:'模拟待译文章'}).check();
  assert.equal(await reader.locator('.reader-copy').getAttribute('lang'),'zh-CN');
  await reader.getByRole('button', {name:/语言/}).click();
  assert.equal(await page.getByRole('menuitem',{name:'English'}).count(),0);
  await page.keyboard.press('Escape');

  const loading = page.locator('#loading-specimen');
  await loading.getByText('失败',{exact:true}).click();
  await loading.getByRole('button',{name:'加载更多文章',exact:true}).click();
  await loading.getByText('加载失败，已有文章仍可阅读。',{exact:true}).waitFor();
  assert.equal(await loading.locator('li').count(),1);
  await loading.getByText('成功',{exact:true}).click();
  await loading.getByRole('button',{name:'重试加载',exact:true}).click();
  await loading.getByText('已显示全部 3 篇示例文章',{exact:true}).waitFor();
  assert.equal(await loading.locator('li').count(),3);
  await loading.getByRole('button',{name:'重置样例',exact:true}).click();
  await loading.getByRole('button',{name:'加载更多文章',exact:true}).click();
  await loading.getByRole('button',{name:'重置样例',exact:true}).click();
  // Wait beyond the specified 600ms delay to prove cancelled work stays cancelled.
  await page.waitForTimeout(800);
  assert.equal(await loading.locator('li').count(),1);

  const board = page.locator('#whiteboard-specimen');
  const longText = 'https://example.com/' + 'long-segment'.repeat(30);
  await board.getByRole('textbox',{name:'白板追问'}).fill(longText);
  await board.getByRole('button',{name:'记录追问',exact:true}).click();
  assert.equal(await board.locator('li').innerText(),longText);
  const lesson = page.locator('#lesson-specimen');
  assert.equal(await lesson.locator('output').count(),0);
  await lesson.getByRole('radio',{name:'保持不变',exact:true}).check();
  await lesson.getByRole('button',{name:'锁定预测，查看观察',exact:true}).click();
  assert.equal(await lesson.getByRole('radio',{name:'保持不变',exact:true}).isDisabled(),true);
  assert.equal(await lesson.locator('output').innerText(),'60 分钟');
  const slider = lesson.getByRole('slider');
  await slider.focus();
  await slider.press('Home');
  assert.equal(await lesson.locator('output').innerText(),'360 分钟');
  await lesson.locator('#explanation').fill('路程不变，速度越快，需要的时间越短。');
  await lesson.getByRole('button',{name:'对照解释',exact:true}).click();
  await lesson.getByText(/此处不自动评价你的解释/).waitFor();
  await lesson.getByRole('button',{name:'重新预测',exact:true}).click();
  assert.equal(await lesson.locator('output').count(),0);

  for (const dark of [false,true]) {
    if (dark) await page.getByRole('switch',{name:'深色模式'}).click();
    for (const width of [360,768,1200]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false, `page overflow ${width}/${dark}`);
      assert.equal(await board.locator('.board-paper').evaluate((el: HTMLElement) => el.scrollWidth > el.clientWidth),false);
      const clippedTitles = await page.locator('#antd-demo .ant-card-head-title').evaluateAll((els: HTMLElement[]) => els.filter(el => el.scrollWidth > el.clientWidth).length);
      assert.equal(clippedTitles,0,`clipped card titles ${width}/${dark}`);
      await page.waitForFunction((expected: string) => getComputedStyle(document.querySelector('.material-nav[aria-pressed="true"]')!).backgroundColor === expected, dark ? 'rgb(58, 43, 39)' : 'rgb(242, 231, 225)');
      await board.screenshot({animations:'disabled',path:`/tmp/antd-audit-${width}-${dark ? 'dark' : 'light'}.png`});
    }
  }
  await page.getByRole('checkbox',{name:'窄屏预览',exact:true}).check();
  assert.equal(await board.locator('.board').evaluate((el: HTMLElement) => el.scrollWidth > el.clientWidth),false);
  assert.deepEqual(errors,[]);
  await page.route('https://cdn.jsdelivr.net/npm/antd@6.5.0/dist/antd.min.js', (route: any) => route.abort());
  await page.reload();
  await page.getByText('组件库未能从 CDN 加载，请检查网络后刷新。',{exact:true}).waitFor();
  console.log('PASS: search focus/Escape/link, language/pending, load/retry/cancel, long notes, prediction/reset/slider, Light/Dark 360/768/1200, narrow preview, CDN failure.');
} finally {
  await browser.close();
}
