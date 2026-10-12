// 静态审计的行为测试：每条规则都有「坏输入必须报错」与「合规输入必须放行」。
// 运行：node --test scripts/check-static.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findColorLiterals, checkHtml, audit } from './check-static.ts';

test('JS 里的十六进制数字、字符串颜色都报错', () => {
  const bad = "const a = paint(g, 0x2c3037);\nctx.fillStyle = '#e8edf5';\nctx.strokeStyle = 'rgba(255,255,255,0.5)';\n";
  assert.equal(findColorLiterals('lab/camera.js', bad).length, 3);
});

test('JS 里的 8 位随机种子、注释里的颜色不算', () => {
  const ok = "a = (a + 0x6d2b79f5) >>> 0; // 原来是 #ff8a2a\nconst c = BODY.grip;\n";
  assert.deepEqual(findColorLiterals('lab/camera.js', ok), []);
});

test('CSS 声明值里的 hex / rgba / 颜色名报错，#id 选择器不算', () => {
  const bad = '#vf-box { background: #000; }\n.a { color: rgba(0,0,0,.3); border-color: white; }\n';
  assert.deepEqual(findColorLiterals('lab/lab.css', bad).map((f) => f.text), ['#000', 'rgba(', 'white']);
  const ok = '#chart .ch-bg { fill: var(--exploded-well); }\n.b { background: color-mix(in srgb, var(--exploded-cyan) 20%, transparent); }\n';
  assert.deepEqual(findColorLiterals('lab/lab.css', ok), []);
});

test('theme.css 与 palette.js 允许写颜色', () => {
  assert.deepEqual(findColorLiterals('kit/theme.css', ':root { --exploded-bg: #0f1628; }'), []);
  assert.deepEqual(findColorLiterals('lab/palette.js', 'export const A = 0x2c3037;'), []);
});

test('HTML：<style>、style= 报错；缺 kit.css / scheme.js 引用报错', () => {
  const bad = '<html><head><style>body{}</style></head><body><div id="app"></div><p style="color:red"></p></body></html>';
  const rules = checkHtml('index.html', bad).map((f) => f.rule);
  assert.equal(rules.length, 5);
  const ok = '<head><script src="../../kit/scheme.js"></script><link rel="stylesheet" href="../../kit/kit.css"></head><body><div id="app"></div></body>';
  assert.deepEqual(checkHtml('index.html', ok), []);
});

test('HTML：<body> 里写了面板骨架报错', () => {
  const bad = '<head><script src="kit/scheme.js"></script><link rel="stylesheet" href="kit/kit.css"></head><body><div id="app"><div class="kit-panel"></div></div></body>';
  assert.ok(checkHtml('index.html', bad).some((f) => f.rule.includes('只许一个空的')));
});

test('lab 里拷了一份 kit 文件、超体积预算都报错', () => {
  const root = mkdtempSync(join(tmpdir(), 'exploded-static-'));
  const kit = join(root, 'kit');
  const lab = join(root, 'lab');
  mkdirSync(kit);
  mkdirSync(join(lab, 'kit'), { recursive: true });
  writeFileSync(join(kit, 'stage.js'), 'export const stage = 1;\n');
  writeFileSync(join(lab, 'kit', 'stage.js'), 'export const stage = 1;\n');
  writeFileSync(join(lab, 'main.js'), `// ${'x'.repeat(3000)}\n`);
  const { findings } = audit(lab, kit, 1);
  assert.ok(findings.some((f) => f.rule.includes('副本')));
  assert.ok(findings.some((f) => f.rule.includes('超出')));
});
