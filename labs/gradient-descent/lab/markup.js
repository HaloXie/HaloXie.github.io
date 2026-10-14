// 本课的面板骨架：main.js 启动时写进 #app。index.html 只是壳。
export const MARKUP = `
  <div id="stage" class="kit-stage"></div>
  <div id="loading" class="kit-loading">加载中…</div>

  <div class="kit-col left" data-dock="left" data-embed="hide">
  <div class="kit-title">
    <div class="l1">Gradient Descent · 损失地形模型</div>
    <div class="l2">梯度下降为什么会卡住？学习率怎么选？</div>
    <div class="l3">小球代表当前参数 (x, y)，地形高度是损失值。每一步按当前位置的负梯度更新参数，步长由学习率决定；它不是受重力滚动的实物，步子太大会跨过坑底。右上的深坑是全局最低点，左下的浅坑是局部极小值，小球未必找得到深的那个。</div>
  </div>

  <div class="kit-panel">
    <div class="kit-row"><div id="stats"></div></div>
    <div class="kit-row" id="narration" aria-live="polite"><span class="tag" id="narr-tag"></span><span id="narr-text"></span></div>
    <div class="kit-row">
      <h3><span>loss 曲线 · 每一步</span></h3>
      <svg id="curve" viewBox="0 0 248 72" role="img" aria-label="loss 随步数变化的曲线；绿虚线是全局最低，橙虚线是局部极小"></svg>
    </div>
    <div class="kit-row" id="predict">
      <h3><span>先预测，再运行</span></h3>
      <div class="q">按当前设置运行，小球最终会怎样？</div>
      <div class="opts">
        <button type="button" class="kit-btn opt" data-choice="global">会收敛到全局最低点</button>
        <button type="button" class="kit-btn opt" data-choice="local">会卡在某个局部极小值</button>
        <button type="button" class="kit-btn opt" data-choice="diverge">会发散 / 跳来跳去不收敛</button>
        <button type="button" class="kit-btn opt" data-choice="slow">方向对，但太慢，走不到坑底</button>
      </div>
      <div id="predict-result" aria-live="polite"></div>
    </div>
  </div>
  </div>

  <div class="kit-panel right" data-dock="right">
    <div class="kit-row"><h3><span>学习率</span><span class="rv" id="lr-read"></span></h3><div id="seg-lr" data-embed="hide"></div></div>
    <div class="kit-row"><h3><span>动量</span></h3><div id="seg-m"></div></div>
    <div class="kit-row btns">
      <button type="button" id="btn-step" class="kit-btn">单步</button>
      <button type="button" id="btn-play" class="kit-btn primary">播放</button>
      <button type="button" id="btn-reset" class="kit-btn">重置</button>
    </div>
    <div class="kit-row" data-embed="hide"><h3><span>起点</span><span class="rv" id="start-read"></span></h3><div id="seg-start"></div>
      <div class="note">也可以直接点地形顶面换起点（会自动重置）。</div>
    </div>
    <div class="kit-row"><h3><span>机位</span></h3><div id="seg-view"></div>
      <div class="note" data-embed="hide">台面上的旋钮调学习率，三个按钮依次是单步、播放、重置；拖动画面旋转，滚轮缩放。</div>
    </div>
    <div id="perf" data-embed="hide"></div>
  </div>
`;
