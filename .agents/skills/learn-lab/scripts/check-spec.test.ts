// 行为测试：两个夹具取自真实运行。第一版过拟合课的 spec 缺「默认可见」「叙述分支」、预测题不锁，必须被拦下；
// 改 skill 后第二版的 spec 必须通过。
// 运行：node --test scripts/check-spec.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSpec } from './check-spec.ts';

const firstRun = [
  '# 次数越高，模型越好吗？',
  '- 学完能预测：多项式次数继续升高时，训练 loss 通常下降，但测试 loss 可能先降后升。',
  '- 现象：滑杆从低次数移到高次数，曲线更贴训练点；测试 loss 在高次数段反而变大。',
  '- 主变量：多项式次数；次变量：固定训练/测试数据与坐标范围。',
  '- 联动：拟合曲线、训练 loss、测试 loss、解释文字同步变化。',
  '- 默认参数：次数 9；训练 loss 与测试 loss 同时可见，曲线明显追逐训练点。',
  '- 先预测题：把次数从 2 调到 12，训练和测试 loss 怎样变化？选 A、B、C；揭晓时写出两个 loss 的数字。',
  '- 公式或模型：最小二乘多项式拟合。',
].join('\n');

const secondRun = [
  '# 训练集拟合得更好，为什么测试误差反而变大？',
  '- 学完能预测：提高多项式次数可继续降低训练 MSE，却可能提高未见数据 MSE。',
  '- 现象：高阶曲线贴紧带噪训练点，在点与点之间偏离真实趋势。',
  '- 主变量：多项式次数 1–10；无次变量。',
  '- 联动：拟合曲线、训练/测试 MSE、与最佳测试 MSE 的倍数、结论文字。',
  '- 默认参数：10 次；按「运行实验」后显示计算结果。',
  '- 默认可见：测试 MSE / 最佳测试 MSE = **471.87**（阈值 ≥ 3），三位小数显示为 0.184 对 0.000。',
  '- 先预测题：「测试误差一定也下降吗？」三选一：一定下降 / 可能上升 / 一定不变。选择后锁定；运行后并列显示「你的预测」和实际测试 MSE。',
  '- 叙述分支：`testMSE > 3 * minTestMSE` 显示「明显过拟合」。均用计算结果，不用次数阈值。',
  '- 模型：真实趋势 `0.5 + 0.28 sin(πx)`，最小二乘拟合次数 1–10。',
].join('\n');

void test('拦下第一版 spec：缺默认可见、缺叙述分支、预测题没列选项且不锁', () => {
  assert.deepEqual(checkSpec(firstRun), [
    '缺字段：默认可见',
    '缺字段：叙述分支',
    '「先预测题」没列出选项',
    '「先预测题」没写明学习者选定后锁住',
  ]);
});

void test('只写了「锁」字的空壳预测题拦下（回归：第二轮审计指出只匹配「锁」字会放行空选项）', () => {
  const hollow = secondRun.replace(/- 先预测题：.*$/m, '- 先预测题：选完锁住。');
  assert.deepEqual(checkSpec(hollow), ['「先预测题」没列出选项', '「先预测题」没写揭晓时显示什么']);
});

void test('第二版 spec 通过', () => {
  assert.deepEqual(checkSpec(secondRun), []);
});

void test('「默认可见」只写定性描述时拦下', () => {
  const vague = secondRun.replace(/- 默认可见：.*$/m, '- 默认可见：两项 loss 同屏可见，差距明显。');
  assert.deepEqual(checkSpec(vague), [
    '「默认可见」没有写成实测数值加阈值（只写「同屏可见」「明显」不算）',
  ]);
});

// ---- 总览课模板（## 标题格式）----

const overviewSpec = `# 台式 PC 主机由哪些部分组成，每个部分做什么？

## 学完能预测
拆掉或替换任一部件后，整体功能如何变化

## 展示方式
拆解视图（爆炸图），每个部件可点击，点击显示：部件名称、作用一句话、如果没有它会发生什么

## 先预测题
给一台「低配版」（办公入门配置），问「把以下哪个配件换成高配版，对游戏流畅度改善最明显？」
选项 3 个：显卡、CPU、内存
选定锁住后，展示三种升级方案的模拟结果对比（帧率提升幅度）

## 主体配件列表
- CPU：处理指令、计算
- 显卡：渲染图像、游戏性能

## 默认参数
- CPU: 4 核 3.2GHz（性能指数 100）
- 显卡: 集显（性能指数 20）

## 升级/降级效果
### 显卡
- 升级：集显 → 独显，游戏帧率 5fps → 45fps
- 降级：独显 → 集显，帧率降回 5fps
`;

void test('总览课 spec 通过 check-spec', () => {
  assert.deepEqual(checkSpec(overviewSpec), []);
});

void test('总览课 spec 缺「升级/降级效果」时拦下', () => {
  const missing = overviewSpec.replace(/^## 升级\/降级效果[\s\S]*$/m, '');
  const errs = checkSpec(missing);
  assert.ok(
    errs.includes('缺字段：升级/降级效果'),
    `expected 缺字段：升级/降级效果, got: ${JSON.stringify(errs)}`,
  );
});

void test('总览课 spec 缺「展示方式」时走标准课路径并被拦下', () => {
  const missing = overviewSpec.replace(/^## 展示方式[\s\S]*?(?=\n## )/m, '');
  const errs = checkSpec(missing);
  // 没有展示方式 → isOverviewSpec 为 false → 走标准课路径 → 缺标准字段
  assert.ok(
    errs.some((errorMessage) => errorMessage.includes('缺字段')),
    `expected 缺字段 errors, got: ${JSON.stringify(errs)}`,
  );
});
