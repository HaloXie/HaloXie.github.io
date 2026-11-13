import {scenes,snapshots,evaluate} from './model.mjs';
const $ = id => document.getElementById(id);
const key = new URLSearchParams(location.search).get('scene');
const scene = scenes[key] ?? scenes.release;
const distribution = b => `A ${100-b}% / B ${b}%`;
$('title').textContent = scene.title;
$('opening').textContent = scene.opening;
$('premise').textContent = `当前实例运行 ${scene.previous}（${distribution(snapshots[scene.previous])}）。你的目标：${scene.goal}。`;
$('desired').value = scene.desired;
$('load').value = scene.success ? 'yes' : 'no';
$('choice').hidden = false;
let answer;
function draw(loaded, pending) {
  const b = snapshots[loaded];
  $('pointer').textContent = answer.desired;
  $('runtime').textContent = loaded;
  $('flow-a').setAttribute('width',560*(100-b)/100);
  $('flow-b').setAttribute('x',20+560*(100-b)/100);
  $('flow-b').setAttribute('width',560*b/100);
  $('traffic').textContent = distribution(b);
  $('load-path').classList.toggle('pending',pending || !answer.success);
  $('load-label').textContent = pending ? '待加载' : answer.success ? '已加载' : '未接管';
  $('diagram-desc').textContent = `期望指针 ${answer.desired}，实际加载 ${loaded}，新请求配置 ${distribution(b)}。`;
}
$('choice').addEventListener('submit', event => {
  event.preventDefault();
  answer = {previous:scene.previous, desired:$('desired').value, success:$('load').value==='yes', target:scene.target, prediction:Number(new FormData(event.currentTarget).get('prediction')), reason:$('reason').value};
  $('inputs').disabled = true;
  $('experiment').hidden = false;
  $('phase').textContent = '第一步：指针已更新，加载尚未执行。图上仍显示当前实例状态；下一步才揭晓预测结果。';
  draw(scene.previous,true);
  $('experiment-title').focus();
});
$('reveal').addEventListener('click', () => {
  const result = evaluate(answer);
  draw(result.loaded,false);
  $('phase').textContent = result.retained ? '第二步：加载失败，继续使用上一份成功加载的快照。' : '第二步：实例加载完成，已核对获批的完整 hash。';
  const why = answer.reason==='recent' ? '最近的版本能帮我们缩小候选范围，但不能证明它满足目标。请对照记录：这份快照里 B 究竟占多少？' : answer.reason==='pointer' ? '指针只记录期望。你刚才在两步之间看到了什么？先查加载结果，再核对实例版本与完整 hash；指针相同本身不能证明本次加载成功。' : answer.reason==='unsure' ? '先看实例实际版本，再查这份快照的比例，最后与目标对照。可以换一次加载条件，看看哪一步变了。' : '你选择对照内容和加载条件。现在用图中的实际版本与比例检验这条依据，而不只看预测是否碰巧猜中。';
  const diagnosis = result.retained ? `本次加载未成功；实例继续使用原来的 ${result.loaded}。` : `已加载 ${result.loaded}，它记录的是 ${distribution(result.b)}。`;
  const paragraphs = [
    `你的预测：${distribution(answer.prediction)}；实际结果：${distribution(result.b)}。${result.predictionMet?'预测一致。':'预测与结果不同。'}`,
    `结果解释：${diagnosis}${result.goalMet?'配置比例符合这次目标；真实操作还需从新请求核对实际版本。':'这还没有达到目标。先检查候选内容；若加载失败，再排查加载原因。'}`,
    `判断依据：${why}目标是${scene.goal}，因此要检查 B 是否为 ${scene.target}%。版本更旧或命令成功，都不能替代这项检查。`,
    scene === scenes.transfer ? '换个角度解释：同样选 r1，恢复目标和加载结果分别会怎样改变判断？' : '再试一次：只改变加载条件，结果会怎样？'
  ];
  $('feedback').replaceChildren(...paragraphs.map(text => {const p=document.createElement('p');p.textContent=text;return p;}));
  $('feedback').hidden=false;
  $('reveal').hidden=true;
});
$('reset').addEventListener('click', () => {
  $('inputs').disabled=false;
  $('experiment').hidden=true;
  $('feedback').hidden=true;
  $('reveal').hidden=false;
  document.querySelectorAll('[name=prediction]').forEach(input => input.checked=false);
  $('reason').value='';
  $('desired').focus();
});
const host = window.frameElement;
if(host){const resize=()=>host.style.height=`${Math.ceil(document.querySelector('main').getBoundingClientRect().height)}px`;new ResizeObserver(resize).observe(document.querySelector('main'));resize();document.fonts.ready.then(resize);}
