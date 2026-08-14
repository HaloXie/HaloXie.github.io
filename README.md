# halo.xin

个人技术博客，基于 [Jekyll](https://jekyllrb.com/) + [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 主题，通过 GitHub Actions 自动构建部署。

## 本地开发

本项目不要求本地安装 Ruby，构建全部走 GitHub Actions。如需本地预览：

```bash
bundle install
bundle exec jekyll serve
```

## URL 与 SEO 约定

URL 是公开内容身份的一部分，发布后必须保持稳定。文章文件名负责 Git 中的日期与 slug，真正的公开地址以 front matter 的 `permalink` 为单一事实源。

### 路径结构

```text
普通博客默认：/posts/general/<page-id>/
学习路线：  /learn/<series-id>/
路线课程：  /learn/<series-id>/<page-id>/
英文版本：  /en + 对应中文基础路径
```

当前 Agent 入门路线示例：

```text
/learn/agent-zero-to-one/
/learn/agent-zero-to-one/agent-architecture-map/
/en/learn/agent-zero-to-one/agent-patterns-with-pi/
```

约束：

- 阶段号、课程号属于展示顺序，不进入 URL；调整课程顺序不能改变公开地址。
- `page_id` 使用稳定的英文 kebab-case，同时作为翻译配对与课程身份键。
- 已发布的 `page_id` 和 `permalink` 都属于兼容性契约；标题可以修改，但不得为了文案变化同步改 slug。
- 中英文文章声明相同的基础 `permalink`；`jekyll-polyglot` 负责给英文输出增加 `/en`，front matter 不手写语言前缀。
- 未进入专栏或其他稳定内容类型的普通博客默认进入 `/posts/general/`；未来可以并列增加 `/posts/guides/`、`/posts/research/` 等稳定命名空间。
- 内容一旦发布，不得仅因后来重新分类而更换 URL；需要调整导航与聚合时优先改分类、标签和索引页，避免把内容分类变化变成公开地址变化。
- 只有正式学习路线课程进入对应 `/learn/<series-id>/` 命名空间。
- 学习路线课程仍保存在 `_posts/<lang>/`，以保留首页、归档、分类、标签、Feed 和相关文章等 Post 能力。

### 已发布 URL 迁移

已经公开的 URL 不允许直接删除。修改 `permalink` 时，必须同时声明旧路径：

```yaml
permalink: /learn/agent-zero-to-one/agent-architecture-map/
redirect_from:
  - /posts/agent-architecture-map/
```

旧地址由仓库内的 `_plugins/localized_redirects.rb` 读取 `redirect_from` 后生成双语 HTML 重定向页。GitHub Pages 无法在仓库内配置服务端 HTTP 301，因此这里使用带 canonical、`noindex` 和即时跳转的静态重定向作为兼容层。该实现保留与官方 [`jekyll-redirect-from`](https://github.com/jekyll/jekyll-redirect-from) 相同的 front matter 字段，但显式处理 Polyglot 的语言前缀，避免英文路径重复生成 `/en/en/`。

已经发布的 `redirect_from` 默认长期保留。只有在确认搜索索引、外部链接、RSS、书签和站内引用均不再使用旧地址后，才能单独评估删除；不能因为迁移完成或构建通过就清理。

所有已公开迁移还必须登记到 `scripts/content-route-history.yml`。该文件是只增不减的历史 URL 台账，门禁会同时核对台账、文章 `redirect_from` 与最终生成页面，避免误删 front matter 后检查器也跟着“忘记”旧地址。

每次新增或迁移内容，生产门禁必须验证：

- canonical、Open Graph URL 与 JSON-LD 指向当前 `permalink`；
- 中英文 `hreflang` 和语言切换保持同一 `page_id`；
- Sitemap、Atom Feed 与 Pagefind 只收录当前正式地址；
- `redirect_from` 声明的旧地址真实生成，并指向当前正式地址；
- 系列页、正文内链、分类、标签、归档及上一篇/下一篇不再链接旧地址。

参考：[Jekyll Permalinks](https://jekyllrb.com/docs/permalinks/) · [Jekyll Collections](https://jekyllrb.com/docs/collections/) · [Chirpy 默认配置](https://github.com/cotes2020/jekyll-theme-chirpy/blob/master/_config.yml)

## 许可

文章内容版权归作者所有。博客框架遵循 MIT 许可。
