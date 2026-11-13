export const snapshots = Object.freeze({r0: 0, r1: 50, r2: 100});
export const scenes = Object.freeze({
  release: {title:'发布指针改了，B 就全量了吗？', goal:'让 B 全量运行', target:100, previous:'r1', desired:'r2', success:false, opening:'测试和审批已经通过。发布命令成功后，新请求会使用哪套配置？'},
  rollback: {title:'想停用 B，该恢复哪份快照？', goal:'让新请求不再走 B', target:0, previous:'r2', desired:'r1', success:true, opening:'最近的旧版本是否符合恢复目标？先查候选内容，再预测加载结果。'},
  transfer: {title:'目标换了，你还选同一份吗？', goal:'恢复 A、B 各一半的实验', target:50, previous:'r0', desired:'r1', success:true, opening:'当前运行 A 全量。如果目标改成恢复实验，应选择哪份快照？'}
});
export function evaluate({previous, desired, success, target, prediction}) {
  if (![previous, desired].every(k => Object.hasOwn(snapshots,k)) || typeof success !== 'boolean' || ![0,50,100].includes(target) || ![0,50,100].includes(prediction)) throw new TypeError('无效的演示条件');
  const loaded = success ? desired : previous;
  const b = snapshots[loaded];
  return {desired, loaded, b, a:100-b, goalMet:b===target, predictionMet:b===prediction, retained:!success};
}
