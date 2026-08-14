# Reading Highlights

零依赖的文章重点高亮插件。它不理解或推断文章语义，只消费作者已经写进 Markdown 的结构信号：以 `strong` 为主的结论段，以及紧凑的顶层 `blockquote`。

## 集成

文章页先用同步 bootstrap 从偏好设置根节点状态，再加载 `reading-highlights.css` 和 `reading-highlights.js`，避免首屏状态闪烁。页面提供带 `data-reading-highlights-toggle` 的原生 `button`；按钮在 runtime 同步 ARIA 并添加 `data-reading-highlights-ready` 前保持隐藏。脚本在 DOM 就绪后自动初始化，也可手动调用：

```js
ReadingHighlights.init(document, localStorage);
```

CommonJS 测试环境可直接导入纯函数：

```js
const { scoreCandidate, selectCandidates } = require('./reading-highlights.js');
```

## 选择规则

- 只检查 `article[data-toc] > .content` 的顶层 `p` / `blockquote`。
- 排除包含表格、代码、图片、导航、标题或列表的块，以及 prompt / callout / alert。
- 普通段落必须由足够长的 `strong` 文本主导；`定位：`、`Role:` 一类短标签不会入选。
- 每节最多一个；全文最多 8 个，且不超过可检查 prose blocks 的约 15%。
- 只添加 `.reading-highlight` class 和根节点状态，不包裹或改写 TextNode，因此复制、链接和 Pagefind 文本保持不变。

## 偏好与公开契约

- localStorage key：`halo:reading-highlights`
- 默认：开启
- 仅 `disabled` / `off` / `false` / `0` 表示关闭
- 根节点状态：`data-reading-highlights="on|off"`
- toggle：`aria-pressed`、`aria-label`、`title` 会随状态同步

localStorage 被浏览器禁用时会静默回退为当前页面可用、默认开启，不阻断阅读。

## 限制

选择是确定性的版式启发式，不是重要性分类器。作者没有使用 `strong` 或结构化 `blockquote` 时，插件不会自行补充重点；复杂 callout、列表总结和嵌套内容有意不处理。
