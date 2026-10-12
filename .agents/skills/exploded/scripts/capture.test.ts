// 浏览器审计的行为测试：坏页面必须报错，合规页面必须放行。需要本机 Chrome（或环境变量 CHROME）。
// 运行：node --test scripts/capture.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { capture } from './capture.ts';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const run = (name: string, theme?: 'light' | 'dark') =>
  capture({ page: join(dir, name), root: dir, theme, width: 800, height: 600, wait: 500, maxCalls: 200 });

test('合规页面放行，并按 --theme 切明暗', async () => {
  assert.deepEqual((await run('ok.html', 'dark')).problems, []);
  assert.deepEqual((await run('ok.html', 'light')).problems, []);
});
test('console.error 报错', async () => {
  assert.ok((await run('console-error.html')).problems.some((p) => p.includes('console.error')));
});
test('draw call 超预算报错', async () => {
  assert.ok((await run('over-budget.html')).problems.some((p) => p.includes('超出预算')));
});
test('没走 kit 的页面报错', async () => {
  assert.ok((await run('no-kit.html')).problems.some((p) => p.includes('__exploded')));
});
test('明暗与期望不符报错', async () => {
  assert.ok((await run('over-budget.html', 'dark')).problems.some((p) => p.includes('明暗不对')));
});
