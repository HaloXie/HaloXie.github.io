---
title: "把集成测试放在主干之前：一种 Sprint Git Flow 的实践"
description: "一套在团队中取得良好实践效果的 Sprint Git 分支流程：设计思路、操作方式、主流模型对比与适用边界"
date: 2026-09-14 20:00:00 +0800
lang: zh-CN
lang-exclusive: [zh-CN]
page_id: sprint-git-flow
permalink: /posts/general/sprint-git-flow/
translation_status: pending
categories: [Tools]
tags: [git, workflow, code-review, ci]
image:
  path: /assets/img/sprint-git-flow/cover.webp
  alt: 开发分支汇入 Sprint 集成测试环境后再合并到主干的流程图
toc: true
---

> 这套 Git 协作流程是我在团队中实践和完善的，取得了良好的实践效果。本文分享它的设计思路、具体做法与适用边界，供面临类似协作问题的团队参考。

多人同时开发时，真正容易出问题的地方通常不是“有没有分支”，而是**几个改动第一次组合时，谁来验证它们能否一起工作**。每个人的分支单独看都通过了测试，合在一起却可能出现接口冲突、配置不兼容或数据库变更顺序错误。

我们的做法是：让一个短生命周期的 `develop` 承担 Sprint 集成测试，再让每个开发分支分别回到生产主干。

> **先说边界：这不是 Git 的标准流程，也不是行业统一规范。** 它只适合特定规模、发布节奏和测试条件的团队。采用前应结合仓库保护规则、CI 能力、测试环境和发布责任人验证；如果这些前提不成立，应选择其他模型。

## 它把什么问题放在了哪里

这套 Flow 把三个职责拆开：

- `master/main` 是生产主干，只包含已经审查、可以作为生产基线的代码。
- `develop` 是当前 Sprint 的临时集成沙箱，允许组合多个改动来暴露交叉影响。
- `feat/*`、`fix/*`、`upd/*` 保留单个改动的审查边界。

![开发分支进入 develop 组合测试，通过后仍由原分支发起主干 MR](/assets/img/sprint-git-flow/flow.webp)

这里有一个容易被误读的细节：`develop` 用来测试组合结果，但生产 MR 的 Source 仍然是原开发分支，而不是 `develop`。这样审查者看到的是“这次改动本身”，而不是一个混合了整个 Sprint 的大分支。

这套流程的核心规则是：开发分支从主干创建；包括紧急修复在内，先进入集成测试；最终通过 MR 回主干；发布标签只在主干上创建。不要直接在共享分支上开发功能，也不要用强推回退共享主干。`develop` 的计划重建是一个单独协调的生命周期操作，不是允许随意回退历史。

### 先识别它最重要的盲点

假设 A 修改查询接口，B 增加一个供 A 调用的新接口。在 `develop` 上测试的是 `main + A + B`，但 A 的 MR 可能只准备发布 `main + A`。组合测试通过，无法证明 A 可以独立发布。

**集成环境的验证结果，不能自动替代目标发布组合的验证结果。** 应在 MR 上验证当前目标主干与本次改动的合并结果；存在依赖时，先合并并验证依赖，或者明确组成同一发布批次。做不到这一步，就不能把“develop 测过”当作独立上线的充分条件。

## 与四种主流 Git 分支模型对比

选分支模型，先看代码从哪里出发、在哪里验证、最后由谁回到主干。同样叫 `develop`，在经典 GitFlow 中是长期开发线，在这套 Sprint Flow 中却是可重建的测试沙箱。

| 模型 | 开发分支起点 | 集成与验证位置 | 进入生产主干的路径 | 生命周期 |
|---|---|---|---|---|
| Trunk-Based | 主干，也可直接在主干小步开发 | 合并前检查与主干持续验证 | 小改动高频集成主干 | 开发分支短命，避免长期分叉 |
| GitHub Flow | 主干 | PR 检查、审查，可配预览环境 | 功能分支经 PR 合入主干 | 围绕一次改动创建与删除 |
| 经典 GitFlow | `develop` | 长期 develop 集成，release 稳定版本 | release / hotfix 进入生产主干，修复回补开发线 | 主干与 develop 长期保留 |
| AoneFlow | 主干 | 按需组合功能到 release，验证发布组合 | 正式发布后 release 合回主干 | 由发布组合和环境决定 |
| **这套 Sprint Flow** | **master/main** | **本 Sprint 功能进入共享 develop 测试** | **原功能分支分别 MR 回主干** | **develop 每个 Sprint 协调重建** |

**最容易混淆的是 AoneFlow：它把发布组合所在的 release 合回主干；这里的 develop 不整体合回主干。** 因此，这套流程需要额外确认“单个功能 + 当前主干”的发布组合，而不能只依赖共享环境的测试结果。

### Trunk-Based Development：尽快消除分支间的距离

Trunk-Based Development（主干开发）强调小批量、高频率地把变更集成到共同主干。它可以使用短命开发分支和 PR，并不要求所有人直接推送主干，也不排斥测试环境。未完成但需要提前集成的功能可以用 Feature Flag 隔离，不过开关本身也需要管理和清理。

它把难点放在“如何持续保持主干可用”：快速自动化验证、可拆分的小改动，以及快速恢复机制。我们采用这套流程时仍较依赖人工验证，自动化安全网不足，因此选择先在共享沙箱中组合测试。这是当时的取舍，不代表 Trunk-Based 不允许手工测试；随着反馈能力改善，也应重新评估是否还需要该沙箱。

### GitHub Flow：围绕一次 PR 完成协作

GitHub Flow 的典型路径是创建分支、提交、发起 PR、讨论与检查、合并、删除分支。GitHub 官方文档明确包含合并前的自动检查；团队也可以给 PR 部署预览环境，或先部署验证再合并。**GitHub Flow 并不禁止独立测试环境，合并也不天然等于部署。**

所以，“需要测试”不足以解释为什么不用 GitHub Flow。本文额外引入 `develop`，是为了集中验证多个未合并功能的组合。这只有在共享组合验证确有价值时，才值得支付维护分支的成本。

### 经典 GitFlow：显式管理开发、发布准备和维护

Vincent Driessen 提出的经典 GitFlow 有长期的 `master` 和 `develop`：feature 从 `develop` 分出并回到 `develop`；准备发布时切出 release，稳定后合入 `master` 并把必要修复回补 `develop`；hotfix 从生产主干出发，完成后也需要回补开发线。

这里的 `develop` 是持久开发线，与本文会重建的测试沙箱同名却不同义。经典 GitFlow 适合需要明确版本发布与维护边界的情况，但增加了合并和回补成本。原作者在 2020 年补充说明：持续交付的 Web 应用可以选择更简单的工作流，不应把 GitFlow 当成通用教条。

### AoneFlow：按发布组合组织集成分支

AoneFlow 从主干创建功能分支，也从主干创建发布分支，再将选定功能合入发布分支进行验证。按阿里云效原始介绍，正式部署成功后，将发布分支合回主干并打标签。本文则是功能分支分别 MR 回主干，再打标签构建部署；临时 `develop` 不整体回主干。这才是两者关键的结构差别。

发布分支可以按迭代聚合全部功能，也可以按需挑选，因此“全量还是挑选”并非两者的绝对分界。AoneFlow 让发布分支承载一个明确的组合，代价是管理组合、环境和修复回补。本文只是借鉴了分离开发基线与集成环境的思路，并不是 AoneFlow 的完整实现。

在 AoneFlow 中，发布成功后合回主干的是发布分支：

![AoneFlow 将功能组合到发布分支，正式部署成功后由发布分支合回主干](/assets/img/sprint-git-flow/aoneflow-release.webp)

| 模型 | 集成方式 | 更适合什么条件 | 这份实践为何没有直接采用 |
|---|---|---|---|
| Trunk-Based | 小改动频繁集成主干，可用短命分支 | 快速反馈、可拆分改动、稳定 CI | 采用时人工验证较多，自动化安全网不足 |
| GitHub Flow | PR 审查、检查后合入主干，可有预览环境 | 单条主线、轻量协作 | 本文另设跨 PR 的共享组合测试沙箱 |
| GitFlow | `feature → develop → release → master`，修复需回补 | 明确的发布准备阶段和生产维护需求 | 没有采用长期 develop 与 release 层级 |
| AoneFlow | 功能组合到 release，发布成功后 release 回主干 | 需要管理明确的发布组合和环境 | 本文 develop 不回主干，功能分别 MR，需补验发布组合 |
| 本文 Flow | Sprint 内全量进入临时 `develop`，再分别回 `main` | 小团队、单迭代节奏、测试环境独立 | 这是场景化折中，不是通用替代品 |

这些模型的选择并不由人数单独决定。更直接的问题是：你要验证单个 PR、整个 Sprint，还是一个明确的发布组合？测试环境与发布组合越不一致，越需要额外的候选版本验证。

## 一次 Sprint 如何运行

### Sprint 开始：建立干净的集成点

`develop` 在 Sprint 开始时从最新 `main` 建立。它的生命周期跟 Sprint 绑定，结束后重建，而不是永久保留。

![Sprint 结束盘点并重建 develop，未完成分支保留并重新测试](/assets/img/sprint-git-flow/sprint-cycle.webp)

### 开发：所有分支从 main 出发

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/short-description
```

命名只表达改动类型和主题，例如 `feat/checkout-summary`、`fix/race-condition`。分支名不携带个人姓名，也不使用无法表达意图的 `wip`、`test` 等模糊前缀。

`feat/` 表示新功能，`fix/` 表示缺陷修复，`upd/` 表示非缺陷的增强或调整。这是我们的命名约定，Git 本身不要求这些前缀。

开发过程中正常提交和推送：

```bash
git add <files>
git commit -m "feat: add export preview"
git push -u origin feat/short-description
```

提交信息可参考 [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) 的 `type: description` 结构，常用类型包括 `feat`、`fix`、`refactor`、`docs`、`chore`。标题写清改动；涉及原因、兼容性或破坏性变化时，正文和 footer 仍有价值，不必拘泥于只写标题。

### 集成：把改动合到 develop 验证组合结果

```bash
git switch develop
git pull --ff-only origin develop
git merge feat/short-description
git push origin develop
```

在这套流程中，推送 `develop` 会触发 CI 部署到测试环境。这是仓库流水线的配置，不是创建一个名为 `develop` 的分支就自然具备的能力。

测试包括自身功能和与其他分支的交叉影响。合入 `develop` 时可以解决集成冲突，但这个解决结果只存在于集成分支，不会自动进入开发分支。

要区分两种情况：如果暴露的是功能自身缺陷，应在开发分支修复后重新集成；如果只是未发布分支之间的冲突，应在集成合并中处理并记录。**不要为了带回冲突解决结果，把整个 `develop` 合回开发分支**，否则会把其他未验证改动一起带入生产 MR。面对 `main` 的冲突，应以最新 `main` 为基线单独解决并重新测试。

### 合并：测试通过后由开发分支发起 MR

```text
feat/short-description ── MR ──> main
          │
          └── 已在 develop 完成集成验证
```

测试环境通过、Code Review 完成后，MR 的 Target 是 `main`。合并后删除开发分支，减少误操作入口。

删除前确认远端 MR 已合并且本地没有未交付修改。普通合并可使用 `git branch -d`；Squash Merge 或 Rebase Merge 后，Git 未必能通过提交祖先关系识别“已合并”，此时应核对 MR 和内容，不要遇到拒绝就盲目强删。

### 发布：标签、构建产物和运行环境不是同一件事

我们采用“主干打标签 → CI 构建 → 人工部署”的发布方式，让版本标识、构建产物和部署动作各有明确职责。

![主干标签经 CI 构建后部署验证，异常时评估兼容性并恢复正常产物](/assets/img/sprint-git-flow/release-recovery.webp)

例如以 `v1.2.3` 表示一次发布，但具体版本由仓库约定，不能原样照抄。若采用 [Semantic Versioning](https://semver.org/)，PATCH 对应兼容的缺陷修复，MINOR 对应向后兼容的功能增加，MAJOR 对应不兼容的公共 API 变化；“改动很大”不自动等于 MAJOR。

回滚时恢复的是已知正常的构建产物，而不是猜测“时间最新的上一条 tag”。数据库迁移、消息格式或外部副作用未必能随应用镜像一起回退，需要先检查兼容性。恢复运行环境以后，仍要通过修复或 revert MR 让主干与后续发布恢复一致。

## 这个 Flow 的代价

它并非只增加了一条分支这么简单：

1. 每个改动至少需要一次合入 `develop` 和一次回 `main` 的操作。
2. 多个改动共享测试沙箱，测试顺序和环境占用需要协调。
3. 重建 `develop` 前必须通知仍在测试中的分支，并安排重新合入。
4. 如果自动化测试不足，`develop` 可能变成“大家都以为有人测过”的灰区。

因此，评估是否采用时，应该观察集成冲突率、测试等待时间和重建频率，而不是只看分支数量。

## 偏差如何收口

### 主干更新了：同步，而不是复制 develop

开发分支只需要同步 `main` 的最新提交：

```bash
git fetch origin
git switch feat/short-description
git rebase origin/main
git push origin feat/short-description --force-with-lease
```

仅对自己独占、允许改写历史的开发分支使用 rebase；多人共享分支可选择 `git merge origin/main`。rebase 冲突解决后执行 `git add <files>` 和 `git rebase --continue`，无法确认时用 `git rebase --abort` 恢复。

`--force-with-lease` 检查远端引用是否仍等于本地预期值，并不理解“谁的代码”。后台 fetch 可能更新该预期，不能把它当作绝对防覆盖保证。同步主干、改写提交或解决冲突后，都要重新验证候选结果；旧测试记录不能自动沿用。

### 误从 develop 创建了分支：只迁移自己的提交

不要把整个 `develop` 当成新分支的基线。先确认自己的提交，再从 `main` 创建干净分支并 `cherry-pick`：

```bash
git fetch origin
git log origin/main..wrong-branch --oneline
git switch main
git pull origin main
git switch -c feat/short-description-clean
git cherry-pick <your-commit>
```

这个日志范围会同时列出其他未进入主干的提交，不是“我的提交”过滤器。逐项核对内容、依赖和原开发起点，只挑选本次改动，验证新分支后再处理旧分支。未提交改动可以先保存为 stash（必要时包含未跟踪文件），在干净分支上 apply 并确认完整后再清理；stash 不会搬走已经提交的错误历史。

### 错误合并到 main：用新提交撤销

共享主干不应通过 `reset` 或强制推送改写历史。应先按项目应急制度恢复运行版本，再通过修复分支和 MR 执行 `revert`：

```bash
git switch main
git pull origin main
git switch -c fix/revert-wrong-merge
git revert -m 1 <merge-commit-hash>
git push origin fix/revert-wrong-merge
```

回滚时机、生产操作权限和标签命名，应由团队的发布与应急制度明确。

上面的 `-m 1` 只适用于已确认第一父提交是目标主干的 merge commit。Squash Merge 产生普通提交，应使用普通 `git revert <commit>`；Rebase Merge 可能要撤销多个提交。revert 也不会抹掉原合并的祖先关系，后续修复不能指望“把原分支再 merge 一次”就恢复所有内容。

异常处理按发生位置分流：

![按开发基线错误、集成冲突和主干误合并分别处理，并重新验证](/assets/img/sprint-git-flow/incident-routing.webp)

### 紧急修复：优先级可以变，证据链不能消失

在这套流程中，紧急修复同样先进入 `develop` 测试，再 MR 到主干；变化的是优先级和响应速度，不省略测试。若共享测试环境混有未发布功能，仍要检查修复在实际生产基线上是否成立。不能及时获得可靠验证环境时，说明这套 Flow 的前提不满足，需要团队另行制定应急流程，不能临时把跳过验证当成常规做法。

### develop 重建：清理测试组合，不是丢掉开发工作

常规重建放在 Sprint 收尾；集成冲突难以处理或测试环境异常时，也可以协调提前重建，但重建本身不是定位根因的替代品。

重建前先通知相关开发者，盘点在测、尚未 MR 的分支，并确认仅存在于 `develop` 的必要修复已保存到可追踪位置。由维护者在约定窗口按仓库保护规则重建；重建之后，其他人的本地旧 `develop` 不应直接 pull 后推回，否则可能重新引入上一轮历史。应保存本地工作，再按团队约定重新检出新的远端分支。

尚未合并的开发分支可以保留，但需要重新进入沙箱、重新部署和测试。跨 Sprint 未完成的功能不能被当作“已经发布”，也不能为了重建强行合入主干。

## 几个命令为什么不能混用

| 操作 | 改变什么 | 本文中的用途与限制 |
|---|---|---|
| `merge` | 合并历史；可快进，不保证生成 merge commit | 组合测试分支；不能把整个 develop 带回功能分支 |
| `rebase` | 重新应用提交，产生新的提交身份 | 同步独占开发分支；共享分支先协调 |
| `cherry-pick` | 复制选定提交的变更 | 从错误基线挽救改动；仍须检查隐含依赖 |
| `revert` | 新增反向撤销提交 | 修复共享历史；按实际合并方式选参数 |
| `stash` | 保存未提交工作 | 临时转移工作区；默认不包含未跟踪文件 |

## 什么时候不该用它

以下情况不建议直接套用：

- 团队已经能稳定地用 Trunk-Based + 自动化测试持续交付；
- 需要同时维护多个生产版本，且每次发布都要精确挑选功能；
- 没有独立测试环境，`develop` 只能增加一个名字而不能增加验证能力；
- 没有人对集成测试结果、主干保护和发布负责。

如果这些条件长期存在，问题不在命令写得不够详细，而在分支模型与团队运行方式不匹配。

## 结语：把它当作一个可验证的假设

这套 Flow 的核心不是“必须有 `develop`”，而是把集成风险提前暴露，并保留单个改动的审查边界。它可以作为小团队在特定阶段的实践假设，但不能被包装成标准答案。

采用后，至少用一个 Sprint 观察三件事：集成冲突是否更早暴露、测试等待是否可接受、主干回滚是否减少。数据不能支持假设时，就应调整模型，而不是继续增加规则。

## 参考资料与进一步阅读

- [GitHub Flow 官方说明](https://docs.github.com/en/get-started/using-github/github-flow)：围绕分支、PR、审查、自动检查和合并组织协作，支持合并前检查。
- [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)：经典 GitFlow 的原始说明，包含发布分支、hotfix 回补和作者 2020 年对适用范围的反思。
- [Trunk Based Development](https://trunkbaseddevelopment.com/)：介绍主干开发、短命分支和高频集成的关系，避免把它简化成“人人直推”。
- [在阿里，我们如何管理代码分支？](https://developer.aliyun.com/article/573549)：云效团队对 AoneFlow 的原始介绍，包括功能组合、发布分支与正式发布后的主干合并。
