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
  alt: 多项改动共享测试空间，同时保留各自的交付边界
toc: true
---

**从主干拆分改动，一起测试，准备好的分别上线。** 这套 Flow 在我们的团队中取得了良好实践效果，适合共享测试、分批发布的小团队，不是 Git 标准流程。下文把仓库的主干统一称为 `main`；有些仓库仍叫 `master`，两者在本文中指同一个角色。

## Case 1：功能没做完，bug 要先修

先看一个假设场景：你开发导出报表，同事调整查询接口。两个人各自在自己的分支上开发，单独测试都没问题；合到一起后，导出功能却因为查询接口返回格式变了而报错。排查发现还有一个必须先修的历史 bug，但 `develop` 里已经混入其他同事尚未验收的功能。

修复分支从 `main` 创建，合入当前 `develop`，和现有组合一起测试。通过后由同一个修复分支单独发起 MR 回 `main`，再用新 tag 生成候选版本，在 gray 验证后发布。`develop` 里的其他功能继续测试，不会因为这次修复一起上线；如果组合测试改了修复代码，必须把相同修复提交回原分支，并以最终 MR 的提交重新验证。

## Case 2：AI 并行做，按验收顺序上线

再假设三个 Agent 分别做导出、查询、筛选预设。前两个还在调试，后启动的筛选预设在 `develop` 的组合测试中先通过，且确认不依赖仍在调试的导出和查询，它就可以由自己的分支单独发起 MR、打新 tag 并先上线。

**代码完成不等于允许发布。人和 AI 都按验证结果与依赖放行，不按任务启动顺序排队。** 工作目录可以独立，共享测试环境仍要协调占用，验证结果绑定具体版本。

## 主路径总图

分支组织代码，环境运行明确版本。`main` 是生产候选基线；`feat` / `fix` / `upd` 是单项改动；`develop` 是随 Sprint 重建的共享测试组合；gray 是候选 tag 的发布前验证环境，通常不对应长期分支；生产运行通过 gray 验证的同一构建产物。MR 是合并请求（GitHub 称 PR）；tag 是固定版本的标记。图中的测试通过，只允许原开发分支申请回主干，不是把整个测试分支合回去。

![从主干创建开发分支，合入 develop 测试；失败返回修改，通过后由原分支 MR 回主干，再打 tag 发布](/assets/img/sprint-git-flow/flow.webp)

| 步骤 | 代码怎么走 | 环境与放行条件 |
|---|---|---|
| ① 开发 | 从 `main` 创建 feat / fix / upd | 只包含本次改动；日常不直接推送 `main` |
| ② 集成 | 开发分支合入 `develop` | CI 部署共享测试环境；`develop` 只承载当前测试组合 |
| ③ 测试 | 不通过就回原开发分支修改 | 从 `develop` 移除失败组合或按 Sprint 重建，再重新合入测试；结果绑定具体版本 |
| ④ 合并 | 原开发分支 MR 回 `main` | 测试、依赖检查与 Code Review 通过；冲突修复必须回到原分支并重新验证 |
| ⑤ 发布 | `main` 上的候选提交打 tag，CI 构建 | tag 先过 gray，再以同一产物进入生产并检查运行结果 |

我们当前用 **主干 + tag** 管发布，不要求额外的长期 gray 分支。gray 是发布前验证环境，验证的必须是本次候选版本；tag 不会自动排除已经合入主干的其他功能。

### 四条边界，避免用错

- **依赖没就绪，不能单独上线。** develop 上一起能跑，不代表只发布其中一项也能跑。
- **共享分支不直接改历史。** 日常改动通过开发分支和 MR 进入 `main`；`develop` 只有合并冲突处理可以临时修正，修复结果仍要提交到对应开发分支并重新验证。误合并用修复分支上的 revert 加 MR 处理，不强推回退共享历史。
- 多个 Agent 不各自覆盖测试环境。协调部署窗口，环境版本变化后重新确认验证结果。
- Sprint 收尾先盘点未完成分支与必要修复，再从主干重建 develop；未完成分支保留，重新合入后重测。

与经典 GitFlow 的主要差别是：常规功能也从主干拆分，`develop` 只作测试组合，不整体回主干；已验收的原开发分支可以分别回 `main`，再按候选 tag 发布。经典 GitFlow 本身同样支持 hotfix；GitHub Flow 更强调单项改动直接经 PR 回主干，AoneFlow 则更适合把选定功能聚合成发布批次。

主线到这里已经给出从改动、组合测试到候选发布的闭环。下面的对比和操作内容按需查阅。

## 别的团队怎么做：与四种主流模型对比
{: #workflow-comparison }

<details markdown="1">
<summary>展开五点定位图与主流模型对比表</summary>

选型先看工作方式：**横轴是迭代组织方式，从单项改动独立推进，到多功能按 Sprint／批次协同；纵轴是发布节奏，从集中窗口发布，到准备好后及时发布。**

![以迭代协同和发布节奏定位五种 Flow：本篇位于集中协同且允许准备好的改动及时上线的一侧](/assets/img/sprint-git-flow/workflow-map.webp)

五个点表示典型实践，中心是取向分界，不是能力零分。我们的目标位置在右上：多人按迭代一起测试，但修复不必等待整个迭代结束。AoneFlow 按选定组合推进，经典 GitFlow 更常配合版本窗口；Trunk-Based 与 GitHub Flow 常用于小步交付，也可以按周期发布。实际及时性取决于测试、依赖与部署能力，分支模型不保证发布速度。

| 模型 | 主要代码路径 | 优先考虑的场景 | 主要代价 |
|---|---|---|---|
| Trunk-Based | 小改动高频进入主干，可用短命分支 | 能拆小改动、自动化反馈快 | 持续保持主干可用，管理未完成功能 |
| GitHub Flow | 主干 → 功能分支 → PR 检查与审查 → 主干 | 围绕单个改动轻量协作 | 多个未合并功能的组合验证需另行安排 |
| 经典 GitFlow | develop → feature → develop → release → 生产主干；修复回补 develop | 明确的版本准备阶段与生产维护需求 | 长期开发线、发布线与修复回补 |
| AoneFlow | 主干 → 功能分支；所选功能组合到 release，正式发布后 release 回主干 | 按批次组合功能并管理验证环境 | 维护功能组合、发布分支及修复回补 |
| **这套 Sprint Flow** | **主干 → 开发分支 → develop 测试；原分支分别 MR 回主干 → tag → gray → 生产** | **共享测试环境，修复与功能需要分批上线** | **测试组合与发布组合可能不同，须验证最终候选版本** |

**我们的定位是：用共享分支尽早发现组合问题，同时保留从主干拆分、分批上线的能力。它减少了发布捆绑，但没有消除依赖检查和候选版本验证。**

经典 GitFlow 也有主干 hotfix 路径；AoneFlow 也能按 Sprint 聚合全部功能。选择的关键不是团队人数或模型名字，而是哪一种验证和发布单位更符合实际工作。各模型的一手说明见文末参考资料。

</details>

## 适用范围

适合多人集中测试、功能与修复需要分批上线的团队，前提是 CI 能按分支部署共享测试环境，有人协调环境占用，能从主干候选 tag 构建并部署 gray，并能记录候选版本与验证结果。代价是多一次集成、共享环境协调和周期性重建；已有稳定持续交付、需要复杂多版本维护，或缺少这些基础条件时，不宜直接套用。

## 操作参考：需要执行时再展开

<details markdown="1">
<summary>发布与回滚：tag、gray、同一产物与生产检查</summary>


对一条主线、一次推进一个发布批次的小团队，先采用这条路径即可：

1. 开发分支在 `develop` 对应的测试环境验证，通过审查后 MR 回 `main`。
2. 发布负责人核对候选提交、功能清单和依赖，在该 `main` 提交上创建唯一 tag，触发 CI 构建。
3. 把这个 tag 对应的产物部署到 gray，验证本次真正要上线的组合。
4. gray 通过后，将**同一构建产物**部署到生产，再检查实际运行结果。

![主干 tag 触发 CI 构建，经 gray 进入生产后检查运行结果；正常则记录完成，异常则评估并恢复已知正常产物](/assets/img/sprint-git-flow/release-recovery.webp)

**主干继续开发，已选定的发布版本保持不变。gray 验证通过后，生产应部署同一构建产物，而不是重新构建最新主干。**

环境配置分别注入，gray 和生产的依赖、数据差异仍要检查；不能因为代码相同就认为两个环境完全等价。发布检查时建议记录 tag、commit、产物摘要和每个环境的部署记录，让“验证过的版本”和“上线的版本”可以对应起来。

例如 `v1.2.3` 是这次候选版本的标签，并不表示它一打出来就已经上线。若 gray 发现缺陷，从主干创建修复分支，经过测试和 MR 后，选择新提交、创建新 tag，重新构建并验证。不要移动旧 tag，也不要让生产重新构建最新主干来代替已验证产物。

### 版本与回滚

例如以 `v1.2.3` 表示一次发布，但具体版本由仓库约定，不能原样照抄。若采用 [Semantic Versioning](https://semver.org/)，PATCH 对应兼容的缺陷修复，MINOR 对应向后兼容的功能增加，MAJOR 对应不兼容的公共 API 变化；“改动很大”不自动等于 MAJOR。

回滚时恢复的是已知正常的构建产物，而不是猜测“时间最新的上一条 tag”。数据库迁移、消息格式或外部副作用未必能随应用镜像一起回退，需要先检查兼容性。恢复运行环境以后，仍要通过修复或 revert MR 让主干与后续发布恢复一致。

</details>

<details markdown="1">
<summary>可选：确实需要独立 gray 分支时怎么做？</summary>

如果某个批次需要较长时间验证，而主干还要接收下一批改动，可以从选定的主干提交创建 `gray/<batch>`，并将它绑定 gray 环境。它只稳定该批次，不作为日常开发起点，也不从 `develop` 整体导入功能。一个共享 gray 环境同一时间要明确由哪个批次占用。

| 阶段 | 分支操作 | 环境与验证 |
|---|---|---|
| 建立批次 | 从选定的主干提交切出 `gray/<batch>` | CI 部署 gray，记录提交和批次内容 |
| 发现缺陷 | 从该批次创建修复分支，经审查合回 gray | 修复仍须进入测试验证；主干也要回补该修复 |
| 准备发布 | 将 gray 的稳定结果通过 MR 纳入主干 | 确认最后主干候选内容与测试版本一致 |
| 正式发布 | 在最终主干提交打新 tag 并构建 | 最终产物先过 gray，再晋级生产 |

**gray 分支稳定的是一个批次，不能自动排除主干后来加入的功能。最终主干组合变化后，必须重新经过 gray 验证。**

这也是优先选择主干 + tag 的原因：少一条长期分支，少一份回补与组合管理。确需多个生产版本并行维护时，再设计独立 release 维护线，不强套这套简化流程。

</details>

<details markdown="1">
<summary>展开操作示例：创建分支、测试、MR 与迭代清理</summary>

历史 bug 已经单独修复上线后，我们回到导出功能。它仍然走同样的路径：从主干开发，进入测试，准备好后回主干，再按批次发布。

下面的命令是一条功能分支的操作示例，不是整段粘贴执行的脚本。运行前先确认 `git status`，保存未提交工作；团队已建好 `develop` 并配置了测试部署。示例中的文件名和提交标识需要换成实际值。

### Sprint 开始：建立干净的集成点

![从主干建立 develop，Sprint 收尾盘点工作后协调重建](/assets/img/sprint-git-flow/sprint-cycle.webp)

`develop` 在 Sprint 开始时从最新 `main` 建立。它的生命周期跟 Sprint 绑定，结束后重建，而不是永久保留。

例如上一轮导出功能已经进入主干，查询改动却延期了。如果一直沿用旧 `develop`，新一轮测试仍会默认带上未发布的查询改动。从主干重建后，导出功能自然还在，查询分支则按本轮需要重新纳入，测试环境里有哪些改动就重新变得清楚。重建由维护者在约定窗口执行：先通知并盘点未完成分支，再从最新 `main` 建立新的 `develop`，通知相关开发者重新合入和部署；旧的本地 `develop` 不直接推回远端。

### 开发：所有分支从 main 出发

下面从创建分支开始完整演示。如果你已经创建了导出分支，应切回原分支并同步最新主干，跳过创建步骤；同步方法见后面的“主干更新了”。

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

测试既看自身功能，也看交叉影响。发现问题后，先判断修在哪里：

| 问题 | 修复位置 | 下一步 |
|---|---|---|
| 导出功能自身缺陷 | 切回功能分支修复、提交、推送 | 重新合入 develop 并测试 |
| 未发布功能之间的集成冲突 | 由相关功能分支分别修复；必要时由维护者移除失败组合或重建 `develop` | 将修复提交回对应分支，重新合入并测试；不把整个 `develop` 合回功能分支 |
| 面向主干的合并冲突 | 功能分支同步最新主干后解决 | 重新验证，不能沿用旧结果 |

### 合并：测试通过后由开发分支发起 MR

```text
feat/export-report ── MR ──> main
          │
          └── 已在 develop 完成集成验证
```

创建 MR 时，Source 选择 `feat/export-report`，Target 选择 `main`。共享测试通过、依赖关系确认且代码审查完成后，合入主干，随后清理开发分支。

合并后只是进入发布基线，还没有上线；接下来固定候选版本，经过 gray，再部署生产。

删除前确认远端 MR 已合并且本地没有未交付修改。普通合并可使用 `git branch -d`；Squash Merge 或 Rebase Merge 后，Git 未必能通过提交祖先关系识别“已合并”，此时应核对 MR 和内容，不要遇到拒绝就盲目强删。

### 发布：先确定版本，再选择环境

我们当前采用最小化的 **master/main + tag** 做法：不额外维护长期 gray 分支，主干接收准备发布的改动，tag 标识具体发布版本。加入 gray 阶段也不需要改变这一分支结构。

这里的 gray 是发布前验证环境，不是把真实生产流量逐步放进来的“灰度放量”。

</details>

<details markdown="1">
<summary>展开异常处理与 Git 命令速查</summary>

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

### 几个命令为什么不能混用

| 操作 | 改变什么 | 本文中的用途与限制 |
|---|---|---|
| `merge` | 合并历史；可快进，不保证生成 merge commit | 组合测试分支；不能把整个 develop 带回功能分支 |
| `rebase` | 重新应用提交，产生新的提交身份 | 同步独占开发分支；共享分支先协调 |
| `cherry-pick` | 复制选定提交的变更 | 从错误基线挽救改动；仍须检查隐含依赖 |
| `revert` | 新增反向撤销提交 | 修复共享历史；按实际合并方式选参数 |
| `stash` | 保存未提交工作 | 临时转移工作区；默认不包含未跟踪文件 |

</details>

## 参考资料与进一步阅读

- [GitHub Flow 官方说明](https://docs.github.com/en/get-started/using-github/github-flow)：围绕分支、PR、审查、自动检查和合并组织协作，支持合并前检查。
- [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)：经典 GitFlow 的原始说明，包含发布分支、hotfix 回补和作者 2020 年对适用范围的反思。
- [Trunk Based Development](https://trunkbaseddevelopment.com/)：介绍主干开发、短命分支和高频集成的关系，避免把它简化成“人人直推”。
- [在阿里，我们如何管理代码分支？](https://developer.aliyun.com/article/573549)：云效团队对 AoneFlow 的原始介绍，包括功能组合、发布分支与正式发布后的主干合并。
