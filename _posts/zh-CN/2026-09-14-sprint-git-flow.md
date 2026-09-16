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

假设你和同事正在修改同一个后台系统：你增加“导出报表”，同事调整“查询接口”。两个人各自在自己的分支上开发，单独测试都没问题。一放到一起，导出功能却因为查询接口返回格式变了而报错。

这时你需要一个地方，先把大家的代码放到一起试一试。但同事的功能还没做完，你也不想为了发布导出功能，就把测试环境里的所有代码都带到线上。

**怎样提前发现一起运行时的问题，又能单独审查和发布每项改动？** 这是这套分支流程要解决的问题。

我在团队中实践和完善了这套做法，取得了良好的实践效果。我们增加一个临时的 `develop` 分支，把本轮开发的功能放到一起测试；测试通过后，每个功能仍通过自己的开发分支申请合并到主干。

> 这是一套适合小团队、按迭代集中测试的实践，**不是 Git 标准流程，也不是经典 GitFlow 的另一种写法**。它需要独立测试环境和明确的测试负责人。你只需了解 commit、branch 和 merge；下面先用导出报表的例子走完开发与发布，再比较其他模型。

想先选方案，可以直接看[四种主流模型对比](#workflow-comparison)；想知道自己该怎么做，就从下面的报表示例开始。

## 先看一个功能经过哪三个地方

一次 **Sprint** 就是一轮约定好时间与目标的迭代。我们在这轮迭代里，让三个分支各做一件事：

| 分支 | 负责什么 | 放到报表例子里 |
|---|---|---|
| `master/main` | 生产主干，保存经过审查的代码，作为开发与发布的基线 | 当前已被团队接受的报表功能 |
| `feat/export-report` | 只开发一项改动 | 你新写的导出功能 |
| `develop` | 把本轮多项改动合在一起测试 | 导出功能和同事的查询改动一起运行 |

这里的“集成测试”就是最后一行：检查几项改动组合起来是否正常。`develop` 是代码分支，测试环境是运行这份代码的地方；团队的 CI 流水线负责在推送后自动构建、部署，二者并不是同一个东西。

![开发分支进入 develop 组合测试，通过后仍由原分支发起主干 MR](/assets/img/sprint-git-flow/flow.webp)

把图读成两次合并，就容易理解了：

1. **先去测试**：从主干创建 `feat/export-report`，写完导出功能后，把它合入 `develop`，与同事的代码一起验证。
2. **再申请进入主干**：测试通过后，用 `feat/export-report` 向主干发起 MR，交给同事审查。不要把整个 `develop` 合回主干。

**MR（Merge Request）就是合并请求；GitHub 中叫 PR（Pull Request）。** Source 是提供改动的分支，Target 是接收改动的分支。这里 Source 是你的功能分支，Target 是主干，所以审查者看到的是导出功能，而不是本轮所有人的代码。

### 为什么还要检查“能否单独发布”

接着看导出报表的例子。如果你修复兼容性问题后，导出功能既能配合现有查询接口，也能配合同事的新接口，它就有机会先发布。如果它必须调用同事尚未发布的新接口，测试环境通过也没用：线上还没有这个接口。

测试环境运行的是“主干 + 导出 + 新查询”，单独发布导出时运行的却是“主干 + 导出”。**一起能跑，不代表拆开也能跑。**

**集成环境的验证结果，不能自动替代目标发布组合的验证结果。** 应在 MR 上验证当前目标主干与本次改动的合并结果；存在依赖时，先合并并验证依赖，或者明确组成同一发布批次。做不到这一步，就不能把“develop 测过”当作独立上线的充分条件。

## 用导出报表走完一次开发与发布

下面的命令是一条功能分支的操作示例，不是整段粘贴执行的脚本。运行前先确认 `git status`，保存未提交工作；团队已建好 `develop` 并配置了测试部署。示例中的文件名和提交标识需要换成实际值。

### Sprint 开始：建立干净的集成点

`develop` 在 Sprint 开始时从最新 `main` 建立。它的生命周期跟 Sprint 绑定，结束后重建，而不是永久保留。

例如上一轮导出功能已经进入主干，查询改动却延期了。如果一直沿用旧 `develop`，新一轮测试仍会默认带上未发布的查询改动。从主干重建后，导出功能自然还在，查询分支则按本轮需要重新纳入，测试环境里有哪些改动就重新变得清楚。

![Sprint 结束盘点并重建 develop，未完成分支保留并重新测试](/assets/img/sprint-git-flow/sprint-cycle.webp)

### 开发：所有分支从 main 出发

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/export-report
```

命名只表达改动类型和主题，例如 `feat/checkout-summary`、`fix/race-condition`。分支名不携带个人姓名，也不使用无法表达意图的 `wip`、`test` 等模糊前缀。

`feat/` 表示新功能，`fix/` 表示缺陷修复，`upd/` 表示非缺陷的增强或调整。这是我们的命名约定，Git 本身不要求这些前缀。

开发过程中正常提交和推送：

```bash
git add <files>
git commit -m "feat: add export preview"
git push -u origin feat/export-report
```

提交信息可参考 [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) 的 `type: description` 结构，常用类型包括 `feat`、`fix`、`refactor`、`docs`、`chore`。标题写清改动；涉及原因、兼容性或破坏性变化时，正文和 footer 仍有价值，不必拘泥于只写标题。

### 集成：把改动合到 develop 验证组合结果

```bash
git switch develop
git pull --ff-only origin develop
git merge feat/export-report
git push origin develop
```

在这套流程中，推送 `develop` 会触发 CI 部署到测试环境。这是仓库流水线的配置，不是创建一个名为 `develop` 的分支就自然具备的能力。

测试包括自身功能和与其他分支的交叉影响。合入 `develop` 时可以解决集成冲突，但这个解决结果只存在于集成分支，不会自动进入开发分支。

如果发现导出功能本身有问题，先切回 `feat/export-report` 修复、提交并推送，再重复上面的 `develop` 集成步骤。不要因为当前停在 `develop`，就直接在那里继续写功能。

要区分两种情况：如果暴露的是功能自身缺陷，应在开发分支修复后重新集成；如果只是未发布分支之间的冲突，应在集成合并中处理并记录。**不要为了带回冲突解决结果，把整个 `develop` 合回开发分支**，否则会把其他未验证改动一起带入生产 MR。面对 `main` 的冲突，应以最新 `main` 为基线单独解决并重新测试。

### 合并：测试通过后由开发分支发起 MR

```text
feat/export-report ── MR ──> main
          │
          └── 已在 develop 完成集成验证
```

创建 MR 时，Source 选择 `feat/export-report`，Target 选择 `main`。合并前要完成三件事：共享环境的集成测试、代码审查，以及实际发布组合的验证。

第三项可以这样落地：由 MR 流水线临时组合“最新主干 + 导出分支”，先运行自动化测试，再把这个候选产物部署到独立的预览环境，由测试负责人检查导出功能。这里只包含准备发布的代码，不混入同事尚未发布的查询改动。目标主干或导出代码发生变化后，要重新验证。

如果团队只有一个共享测试环境，也可以协调一个验证窗口，部署同样的候选产物，验证完成后再恢复共享版本。**如果只能测试混合了其他功能的 `develop`，就还没有证明导出功能能独立上线。** 这时应补齐验证条件，或先完成依赖的合并与验证，不能只勾选“测试通过”。这些候选验证能力需要团队配置，Git 和 MR 页面不会自动替你建立环境。

三项都通过后再合并，随后清理开发分支。

删除前确认远端 MR 已合并且本地没有未交付修改。普通合并可使用 `git branch -d`；Squash Merge 或 Rebase Merge 后，Git 未必能通过提交祖先关系识别“已合并”，此时应核对 MR 和内容，不要遇到拒绝就盲目强删。

### 发布：标签、构建产物和运行环境不是同一件事

我们采用“主干打标签 → CI 构建 → 人工部署”的发布方式，让版本标识、构建产物和部署动作各有明确职责。

![主干标签经 CI 构建后部署验证，异常时评估兼容性并恢复正常产物](/assets/img/sprint-git-flow/release-recovery.webp)

例如以 `v1.2.3` 表示一次发布，但具体版本由仓库约定，不能原样照抄。若采用 [Semantic Versioning](https://semver.org/)，PATCH 对应兼容的缺陷修复，MINOR 对应向后兼容的功能增加，MAJOR 对应不兼容的公共 API 变化；“改动很大”不自动等于 MAJOR。

回滚时恢复的是已知正常的构建产物，而不是猜测“时间最新的上一条 tag”。数据库迁移、消息格式或外部副作用未必能随应用镜像一起回退，需要先检查兼容性。恢复运行环境以后，仍要通过修复或 revert MR 让主干与后续发布恢复一致。

## 别的团队怎么做：与四种主流模型对比
{: #workflow-comparison }

选分支模型，先看代码从哪里出发、在哪里验证、最后由谁回到主干。同样叫 `develop`，在经典 GitFlow 中是长期开发线，在这套 Sprint Flow 中却是可重建的测试沙箱。

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

### 放在一起看，关键差别是什么

| 模型 | 开发分支起点 | 集成与验证位置 | 进入生产主干的路径 | 生命周期 |
|---|---|---|---|---|
| Trunk-Based | 主干，也可直接在主干小步开发 | 合并前检查与主干持续验证 | 小改动高频集成主干 | 开发分支短命，避免长期分叉 |
| GitHub Flow | 主干 | PR 检查、审查，可配预览环境 | 功能分支经 PR 合入主干 | 围绕一次改动创建与删除 |
| 经典 GitFlow | `develop` | 长期 develop 集成，release 稳定版本 | release / hotfix 进入生产主干，修复回补开发线 | 主干与 develop 长期保留 |
| AoneFlow | 主干 | 按需组合功能到 release，验证发布组合 | 正式发布后 release 合回主干 | 由发布组合和环境决定 |
| **这套 Sprint Flow** | **master/main** | **本 Sprint 功能进入共享 develop 测试** | **原功能分支分别 MR 回主干** | **develop 每个 Sprint 协调重建** |

**最容易混淆的是 AoneFlow：它把发布组合所在的 release 合回主干；这里的 develop 不整体合回主干。** 因此，这套流程需要额外确认“单个功能 + 当前主干”的发布组合，而不能只依赖共享环境的测试结果。

这些模型的选择并不由人数单独决定。更直接的问题是：你要验证单个 PR、整个 Sprint，还是一个明确的发布组合？测试环境与发布组合越不一致，越需要额外的候选版本验证。

## 什么时候值得多维护一个 develop

它并非只增加了一条分支这么简单：

1. 每个改动至少需要一次合入 `develop` 和一次回 `main` 的操作。
2. 多个改动共享测试沙箱，测试顺序和环境占用需要协调。
3. 重建 `develop` 前必须通知仍在测试中的分支，并安排重新合入。
4. 如果自动化测试不足，`develop` 可能变成“大家都以为有人测过”的灰区。

因此，评估是否采用时，应该观察集成冲突率、测试等待时间和重建频率，而不是只看分支数量。

## 遇到问题时，按发生的位置处理

正常流程理解之后，再看下面这些情况。它们是按需查阅的处理方式，不是每次开发都要执行的步骤。

### 主干更新了：同步，而不是复制 develop

开发分支只需要同步 `main` 的最新提交：

```bash
git fetch origin
git switch feat/export-report
git rebase origin/main
git push origin feat/export-report --force-with-lease
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
git switch -c feat/export-report-clean
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

### 紧急修复：加快处理，但仍要测试

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

## 最后：记住两次合并的不同目的

第一次合入 `develop`，是让大家的改动一起接受测试；第二次由功能分支 MR 回主干，是决定这项改动是否可以进入发布基线。分清这两次合并，才能理解为什么开发分支要从主干创建、为什么不能把整个测试分支直接上线。

这套做法在我们的团队中有效，但多一个分支也意味着多一份维护成本。尝试时可以观察一轮迭代：冲突是否更早暴露、测试是否排队、功能能否独立发布。如果共享测试分支并没有带来这些收益，就没有必要为了遵循流程而保留它。

## 参考资料与进一步阅读

- [GitHub Flow 官方说明](https://docs.github.com/en/get-started/using-github/github-flow)：围绕分支、PR、审查、自动检查和合并组织协作，支持合并前检查。
- [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)：经典 GitFlow 的原始说明，包含发布分支、hotfix 回补和作者 2020 年对适用范围的反思。
- [Trunk Based Development](https://trunkbaseddevelopment.com/)：介绍主干开发、短命分支和高频集成的关系，避免把它简化成“人人直推”。
- [在阿里，我们如何管理代码分支？](https://developer.aliyun.com/article/573549)：云效团队对 AoneFlow 的原始介绍，包括功能组合、发布分支与正式发布后的主干合并。
