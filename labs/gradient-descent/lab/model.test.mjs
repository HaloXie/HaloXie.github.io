// 模型对照手算值与三种结局。运行：node --test labs/gradient-descent/lab/model.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.js';

test('loss 对照手算：f(0,0) = −1.2e^−3.25 − 0.8e^−3.69', () => {
  assert.ok(Math.abs(M.loss(0, 0) - (-1.2 * Math.exp(-3.25) - 0.8 * Math.exp(-3.69))) < 1e-12);
  assert.ok(Math.abs(M.loss(0, 0) - -0.066507) < 1e-6);
});

test('解析梯度与数值差分一致', () => {
  const h = 1e-6;
  for (const [x, y] of [[0, 0], [2.5, 2.5], [-1.2, 0.7], [1.5, 1]]) {
    const [gx, gy] = M.grad(x, y);
    assert.ok(Math.abs(gx - (M.loss(x + h, y) - M.loss(x - h, y)) / (2 * h)) < 1e-6);
    assert.ok(Math.abs(gy - (M.loss(x, y + h) - M.loss(x, y - h)) / (2 * h)) < 1e-6);
  }
});

test('两个坑：右上深（全局），左下浅（局部）', () => {
  assert.ok(M.GLOBAL_MIN.x > 1 && M.GLOBAL_MIN.y > 0.5);
  assert.ok(M.LOCAL_MIN.x < -1 && M.LOCAL_MIN.y < -0.8);
  assert.ok(M.GLOBAL_MIN.loss < M.LOCAL_MIN.loss);
});

test('一步更新 = 位置 − 学习率 × 梯度', () => {
  const s = M.step(M.start(2.5, 2.5), 0.1, false);
  const [gx, gy] = M.grad(2.5, 2.5);
  assert.ok(Math.abs(s.x - (2.5 - 0.1 * gx)) < 1e-12 && Math.abs(s.y - (2.5 - 0.1 * gy)) < 1e-12);
  assert.equal(s.step, 1);
});

test('四种结局都能复现', () => {
  assert.equal(M.run(M.start(2.5, 2.5), 0.1, false).outcome, 'global');
  assert.equal(M.run(M.start(-2.5, -2.5), 0.1, false).outcome, 'local');
  assert.equal(M.run(M.start(2.5, 2.5), 1.2, false).outcome, 'diverge');
  assert.equal(M.run(M.start(2.5, 2.5), 0.01, false).outcome, 'slow');
  assert.equal(M.run(M.start(-2.5, -2.5), 0.2, true).outcome, 'global'); // 动量冲出浅坑
});
