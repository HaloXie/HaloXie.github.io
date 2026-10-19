# 全站 React / Ant Design 迁移记录

状态：2026-10-19，本轮页面与控件迁移、本地构建及内置浏览器验收已完成，尚未部署。实际覆盖、失败路径与未验证边界见 [站点验收记录](2026-10-19-site-verification.md)。本地验收不等于线上发布完成。

## 已实现的职责边界

Jekyll 保留静态内容生成：文章正文、元数据、语言配对、历史重定向、目录与导航链接在构建时产生。React 管理交互控件，Ant Design 提供控件实现。数学、光学、缓存与 WebGL 模型继续作为计算和绘图模块；空间旋钮与实体按钮保留在对应 3D 渲染器中。

| 范围 | 当前实现与源文件 |
| --- | --- |
| 页面骨架 | 仓库内 `_layouts/default.html`、`home.html`、`page.html`、`archives.html`、`category.html`、`tag.html`、`tags.html` 与既有文章、学习路线、系列和实验布局共同提供静态页面；sidebar、topbar 和分页 include 已接入新 UI |
| 共享控件 | `docs/design/antd-demo/site.tsx` 实现语言菜单、主题菜单、重点高亮和移动导航；`search.tsx` / `search-controller.ts` 管理搜索，`post-pagination.tsx` 管理连续加载、重试与末页 |
| 内容服务 | `docs/design/antd-demo/content.ts` 保留主题服务及内容增强的独立职责；`_includes/js-selector.html` 仅加载所需内容资源，不再加载 Chirpy UI bundle |
| 动态实验 | Sprint Git Flow、Prompt cache、景深、梯度下降、EXIF 猜谜的网页操作控件已接入 React / Ant Design；EXIF 使用 Ant Select，文件选择和拖放仍在本地读取，不上传照片 |
| 相机页 | 博客侧 `labs/camera-exploded/controls.ts` 接入共享示例，不改共享 skill / kit；六组网页参数、拍摄、声音、放大及动态弹窗关闭使用新控件 |

原 `assets/js/post-scroll.js` 已由新分页控制器替代。高亮算法保留，由 `ReadingHighlights.takeControl()` 将控件事件所有权交给 React。搜索、分页和菜单不同时绑定两套操作监听。

相机页是共享示例的受限接入：原按钮隐藏、移出键盘顺序，仅作为渲染器指令入口；每个可见 React 按钮只转发一次原按钮操作，原模块继续拥有仿真状态。文案、选中与禁用状态同步到可见控件，弹窗焦点转到可见按钮。此边界避免复制整套 kit，也不形成两套可见 UI。

Sprint Git Flow 的现有中文文章与实验已由明昊明确移交，本轮完成英文文章、精确图本地化及实验中英文支持。

## 设计和主题来源

- `docs/design/blog-base-style-demo.html` 和 `docs/design/blog-antd-demo.html` 都保留；前者保留基础视觉对照，后者为已确认的控件方向。
- `_sass/custom/_base.scss` 继续是生产字体、颜色、排版、圆角与动效 token 的唯一来源。
- 站点 ConfigProvider 和 `labs/shared/antd-controls.ts` 从 Base 读取主题，不另存一套全局颜色。
- `labs/shared/theme-bridge.js` / `.scss` 保持 iframe 与父页明暗同步，独立页读取系统主题及已保存偏好。
- Prompt cache 的扫描架与重算卡在实验自己的 selector 中映射已有零件色，保证图例中的扫描头和卡片状态可见，不修改全局 Base。

## CDN 与构建入口

第三方运行库只使用固定版本官方 npm 分发文件的 jsDelivr 地址，不从本站托管副本：

| 运行库 | 版本 | 分发路径 |
| --- | --- | --- |
| React | 18.3.1 | `https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js` |
| ReactDOM | 18.3.1 | `https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js` |
| Day.js | 1.11.13 | `https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js` |
| Ant Design | 6.5.0 | `https://cdn.jsdelivr.net/npm/antd@6.5.0/dist/antd.min.js` |

`_includes/antd-runtime.html` 是站点加载入口；实验壳引用相同固定版本。本站分发自己的编译代码，第三方库保持 external。CDN 失败时静态正文和基础链接仍可访问，实验控件采用单一原生回退路径；不恢复 Chirpy 的旧 UI bundle。

| 源码 | 生成入口 | 发布文件 |
| --- | --- | --- |
| `docs/design/antd-demo/app.tsx` | `build.mts` | `docs/design/blog-antd-demo.html` |
| `site.tsx`、搜索与分页模块 | `build-site.mts` | `assets/js/ui/site.js` |
| `docs/design/antd-demo/content.ts` | `build-content.mts` | `assets/js/ui/content.js` |
| Sprint 源码与共享控件 | `node labs/sprint-git-flow/build.ts` | Sprint 的 `.mjs` 与 `labs/shared/antd-controls.mjs` |
| Prompt cache 实验 | `node labs/prompt-cache-prefix/build.mjs --html-only` | 实验 `index.html` |
| 相机接入模块 | `node labs/camera-exploded/build.ts` | `controls.mjs` |

## 验收与恢复边界

模型与控件测试用于验证计算规律、事件所有权、状态同步、取消与回退；它们不替代真实浏览器检查。完整门禁包括生产 Jekyll 构建、Pagefind、内容／翻译／系列／引用／图片检查、渲染检查和站内链接检查。具体结果只记录在 [站点验收记录](2026-10-19-site-verification.md)。

本轮新增与替换图片的路径、尺寸、字节数、真实来源见 [图片清单](2026-10-19-image-inventory.md)。确定性精确图与 image-2 概念封面分别注明，不能混称模型生成。

尚未部署。若本地验收发现问题，修正源文件并重新生成；发布后如需恢复，应恢复上一份已验证站点构建，并继续验证真实线上版本。不能把本地 build、推送或页面缓存当作部署成功。

## 后续每次改动的 E2E 范围

每次修改 CSS、JS、TS、TSX、Rust 或实验运行时，都根据影响范围执行内置浏览器 E2E：

| 改动范围 | 最小检查范围 |
| --- | --- |
| 单个组件或局部 CSS | 受影响页面 Light/Dark、360/768/1200px、键盘焦点与状态切换 |
| 共享主题、运行时、topbar、sidebar、语言 | 中英首页与配对文章、语言菜单、Escape、深色、CDN 回退、无横向溢出；存在待译文章时增加待译入口 |
| 搜索、高亮、连续加载 | 共享范围，以及搜索结果、空结果、错误／重试、焦点恢复、旧请求取消和末页 |
| 动态实验或 Rust/WASM | 受影响实验默认和边界参数、重置、失败资源、嵌入／独立打开；共享控件修改须覆盖全部消费者 |
| 模板、URL、翻译或数据结构 | 共享范围，以及 canonical/hreflang、历史地址、Pagefind、相关门禁和站内链接 |

内置浏览器是最终 UI E2E 通道。脚本可辅助重复检查，但不能替代浏览器验收。当前本轮 E2E 仍在进行，实际页面、视口、状态与未覆盖项统一写入证据记录。
