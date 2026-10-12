// 行为测试：用最小夹具证明抽取器抓到了核验要的文字，且没把注释、正则、URL、类名混进来。
// 运行：node --test scripts/extract-visible-text.test.ts
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extract } from './extract-visible-text.ts';

function fixture(): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'learn-lab-'));
  mkdirSync(path.join(directory, 'js'));
  writeFileSync(
    path.join(directory, 'index.html'),
    [
      '<html><head><style>.a{content:"不该出现"}</style></head><body>',
      '<!-- 注释里的中文不该出现 -->',
      '<h1>光圈开大，背景为什么会糊？</h1>',
      '<button title="按下快门看结果">拍</button><img alt=\'光圈叶片收拢示意\' src="a.png">',
      '<script>const s = "内联脚本里的叙述";</script>',
      '</body></html>',
    ].join('\n'),
  );
  writeFileSync(
    path.join(directory, 'js', 'ui.js'),
    [
      '// 注释：光圈会弯折光线（不该出现）',
      "const re = /[一-龥]+/g; const url = 'https://example.com/说明';",
      'const cls = "ctrl-label";',
      'const msg = `当前 ${f} 时，${fast ? "两帘之间只留一道缝" : "前帘先全部让开"}。`;',
      "const en = 'The aperture does not bend light';",
    ].join('\n'),
  );
  writeFileSync(
    path.join(directory, 'js', 'check-optics.mjs'),
    'console.log("核验脚本里的中文不该出现");',
  );
  return directory;
}

void test('抽到 HTML 文本、提示属性、内联脚本、模板字符串及其分支，并带正确行号', () => {
  const directory = fixture();
  try {
    const hits = extract(directory);
    const texts = new Set(hits.map((h) => h.text));
    assert.ok(texts.has('光圈开大，背景为什么会糊？'));
    assert.ok(texts.has('按下快门看结果'));
    assert.ok(texts.has('光圈叶片收拢示意'), '单引号属性要抽到');
    assert.ok(texts.has('内联脚本里的叙述'));
    assert.ok(texts.has('当前 {…} 时，{…}。'));
    assert.ok(texts.has('两帘之间只留一道缝'));
    assert.ok(texts.has('前帘先全部让开'));
    assert.ok(texts.has('The aperture does not bend light'));
    assert.equal(hits.find((h) => h.text === '两帘之间只留一道缝')?.line, 4);
    assert.equal(hits.find((h) => h.text === '光圈开大，背景为什么会糊？')?.line, 3);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

void test('HTML 初始标记里写死的数值单独列出（回归：相机 v1 滑杆标签写死 1/250s，state 是 1/500）', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'learn-lab-'));
  try {
    writeFileSync(
      path.join(directory, 'index.html'),
      [
        '<div>快门速度</div>',
        '<span id="shutter-val">1/250s</span>',
        '<div id="stat">—</div>',
        '<p>先预测：把次数从 2 一直调到 12，训练 loss 会怎样变化？</p>',
        '<label>光圈 f/N（50mm 镜头）</label><output id="d">9</output>',
      ].join('\n'),
    );
    const numbers = extract(directory).filter((h) => h.kind === 'html-number');
    // 句子与带单位的标签不算；写死的状态值要抓到（回归：Codex 做的过拟合课把 12 条长句误报成数值）
    assert.deepEqual(
      numbers.map((h) => [h.text, h.line]),
      [
        ['1/250s', 2],
        ['9', 5],
      ],
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

void test('不抽注释、样式、正则、URL、类名和核验脚本', () => {
  const directory = fixture();
  try {
    const joined = extract(directory)
      .map((h) => h.text)
      .join('\n');
    for (const bad of ['不该出现', '光圈会弯折光线', '一-龥', 'example.com', 'ctrl-label']) {
      assert.ok(!joined.includes(bad), `误抽：${bad}`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
