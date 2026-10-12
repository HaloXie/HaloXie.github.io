// 本课的页面骨架：main.js 启动时写进 #app。index.html 只是壳。
export const MARKUP = `
  <header class="ex-head">
    <h1>猜参数 — 摄影 EXIF 猜谜</h1>
    <div class="ex-privacy">
      <b>隐私说明：</b>照片和 EXIF 只在你的浏览器本地读取和处理，没有任何网络上传；GPS 等位置字段本页从不读取、不显示、不存储；只解析光圈、快门、ISO、焦距这 4 项，其余 EXIF 字段也不读取。
    </div>
  </header>

  <section class="ex-panel">
    <h2>上传照片</h2>
    <div id="dropzone" role="button" tabindex="0">
      <div class="big">拖入一张或多张 JPEG 照片，或点击选择</div>
      <div class="small">HEIC 暂不支持解析，请先导出为 JPEG 再上传</div>
      <input type="file" id="file-input" accept="image/jpeg" multiple hidden>
    </div>
    <div class="ex-note">首次打开会自动载入一张本地示例照片；也可以换成自己的 JPEG。示例素材：<a href="https://commons.wikimedia.org/wiki/File:Merops_apiaster_04.jpg" target="_blank" rel="noreferrer">Wikimedia Commons</a>。</div>
    <div id="queue-status" aria-live="polite"></div>
  </section>

  <div id="skip-note" hidden></div>

  <div class="ex-layout">
    <section id="photo-col" class="ex-panel" hidden>
      <h2>照片</h2>
      <div id="photo-frame"><img id="photo-img" alt="待猜参数的照片"></div>
      <div id="photo-caption"><span id="photo-name"></span><span id="photo-progress"></span></div>
    </section>

    <section id="quiz-col" class="ex-panel" hidden>
      <h2>你猜这张照片是怎么拍的</h2>
      <label class="ctrl-group"><span class="ctrl-label"><span>光圈 (f/)</span><span class="val" id="ap-val"></span></span><select id="ap-select"></select></label>
      <label class="ctrl-group"><span class="ctrl-label"><span>快门速度</span><span class="val" id="sh-val"></span></span><select id="sh-select"></select></label>
      <label class="ctrl-group"><span class="ctrl-label"><span>ISO</span><span class="val" id="iso-val"></span></span><select id="iso-select"></select></label>
      <label class="ctrl-group"><span class="ctrl-label"><span>焦距 (mm)</span><span class="val" id="fl-val"></span></span><select id="fl-select"></select></label>
      <button type="button" class="kit-btn primary wide" id="btn-reveal">揭晓答案</button>
    </section>
  </div>

  <section class="ex-panel" id="result-panel" hidden>
    <h2>结果</h2>
    <div id="overall-score">
      <div class="big" id="overall-big">—</div>
      <div class="sub">平均误差（挡）</div>
    </div>
    <div class="score-row" id="score-row"></div>
    <div id="explain-block"></div>
    <button type="button" class="kit-btn wide" id="btn-next">下一张 / 重新上传</button>
  </section>

  <section class="ex-panel" id="history-panel">
    <h2>最近 10 轮趋势</h2>
    <div id="no-history">还没有历史记录，猜完一轮就会出现在这里。</div>
    <canvas id="trend-chart" width="600" height="120" hidden></canvas>
    <div id="history-summary" hidden>
      <span>最近 <b id="hist-count">0</b> 轮</span>
      <span>平均误差 <b id="hist-avg">—</b> 挡</span>
      <span>较早 5 轮 → 较近 5 轮：<b id="hist-trend">—</b></span>
    </div>
  </section>

  <footer class="ex-foot">解析全部在本机完成，不引入任何第三方库；EXIF 解析器代码见 exif-parser.mjs。</footer>
`;
