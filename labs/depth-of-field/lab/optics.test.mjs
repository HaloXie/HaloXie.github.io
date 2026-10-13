// 景深模型对照手算值。运行：node --test labs/depth-of-field/lab/optics.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derive, hyperfocal, nearLimit, farLimit, blurMm, fmtDof } from './optics.js';

const close = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('85mm f/1.4 对焦 1.5m：H≈172.1m，清晰范围 1.488–1.512m，5m 处弥散圆 2.55mm', () => {
  close(hyperfocal(85, 1.4), 172108.8, 0.1);
  close(nearLimit(85, 1.4, 1500), 1487.75, 0.05);
  close(farLimit(85, 1.4, 1500), 1512.43, 0.05);
  close(blurMm(85, 1.4, 1500, 5000), 2.553, 0.001);
  assert.equal(fmtDof(derive({ f: 0, focal: 3, focus: 2 }).dof), '2.5 cm');
});

test('收到 f/16：景深从 2.5cm 拉宽到约 28.5cm', () => {
  close(derive({ f: 7, focal: 3, focus: 2 }).dof, 284.5, 0.2);
});

test('24mm f/16 对焦 2m 已超过超焦距（1.224m）：远点为无穷远', () => {
  const d = derive({ f: 7, focal: 0, focus: 3 });
  close(d.H, 1224, 0.1);
  assert.equal(d.far, Infinity);
  assert.equal(fmtDof(d.dof), '到无穷远');
});

test('对焦处的人偶清晰，弥散圆为 0', () => {
  const d = derive({ f: 0, focal: 3, focus: 2 });
  const mid = d.subjects.find((o) => o.key === 'mid');
  assert.equal(mid.blur, 0);
  assert.ok(mid.sharp);
  assert.ok(!d.subjects.find((o) => o.key === 'far').sharp);
});
