// 本课的面板骨架：main.js 启动时写进 #app。index.html 只是壳。
export const MARKUP = `
  <div id="stage" class="kit-stage"></div>
  <div id="loading" class="kit-loading">加载中…</div>

  <div class="kit-col left" data-dock="left" data-embed="hide">
    <div class="kit-title">
      <div class="l1">Depth of Field · 景深导轨</div>
      <div class="l2">光圈开大，背景为什么会糊？</div>
      <div class="l3">给定光圈、焦距、对焦距离，清晰范围会怎么变？青色板就是清晰范围，从近点到远点。拧台面上的旋钮试试。</div>
    </div>
    <div class="kit-panel">
      <div class="kit-row"><div id="stats"></div></div>
      <div class="kit-row" id="narration" aria-live="polite"><span class="tag" id="narr-tag"></span><span id="narr-text"></span></div>
      <div class="kit-row"><h3><span>调哪些参数</span></h3><div id="seg-mode"></div><div class="note" id="mode-hint"></div></div>
      <div class="kit-row" id="quiz">
        <h3><span>先预测，再运行</span></h3>
        <div class="q">把光圈从 f/1.4 调到 f/16（焦距、对焦距离不变），清晰范围会怎么变？</div>
        <div class="opts">
          <button type="button" class="opt" data-choice="wider">变宽（景深变大）</button>
          <button type="button" class="opt" data-choice="narrower">变窄（景深变小）</button>
          <button type="button" class="opt" data-choice="same">基本不变</button>
        </div>
        <button type="button" id="btn-run" class="kit-btn primary" disabled>运行：把光圈调到 f/16 看结果</button>
        <div class="note">也可以按台面上的红色按钮运行。</div>
        <div id="quiz-result" aria-live="polite"></div>
      </div>
    </div>
  </div>

  <div class="kit-panel right" id="right" data-dock="right">
    <div class="kit-row">
      <h3><span>模拟照片 · 这台相机拍到的</span><button type="button" id="photo-zoom" class="mini" aria-label="放大模拟照片">放大</button></h3>
      <div id="photo-box" role="img" aria-label="模拟照片：人物和背景灯串按弥散圆大小模糊"></div>
      <div id="photo-read" class="read"></div>
      <div id="dof-read" class="read"></div>
    </div>
    <div class="kit-row" data-embed="hide"><h3><span>光圈 f/</span></h3><div id="seg-f"></div></div>
    <div class="kit-row" data-embed="hide"><h3><span>焦距 mm</span></h3><div id="seg-focal"></div></div>
    <div class="kit-row" data-embed="hide"><h3><span>对焦距离 m</span></h3><div id="seg-focus"></div></div>
    <div class="kit-row"><h3><span>机位</span></h3><div id="seg-view"></div></div>
    <div class="kit-row note" data-embed="hide">导轨上的距离按比例；人偶、灯串和相机为了看清放大了，高度不按比例。照片由镜头处的副相机实拍台面，每样东西糊多少按同一个景深模型算。弥散圆容许值 c = 0.03mm（全画幅）：落在传感器上的光斑不超过它，就算清晰。</div>
    <div id="perf" data-embed="hide"></div>
  </div>
`;
