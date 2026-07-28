---
title: "用 chezmoi 安全同步开发环境：从零搭建可审计的 dotfiles"
description: "以 chezmoi、GitHub Private Repo、age 和 Gitleaks 搭建跨设备配置同步，重点防止 SSH、数据库和 AI 工具凭证被明文提交"
date: 2026-07-28 12:00:00 +0800
categories: [Tools]
tags: [chezmoi, dotfiles, macos, github, age, gitleaks, security]
image:
  path: /assets/img/chezmoi-secure-dotfiles/cover.webp
toc: true
---

如果你用 Mac 做开发，大概经历过这种时刻：新电脑已经到手，常用软件半小时就装完了，接下来却要花一整天回忆“我原来到底改过什么”。Cursor 的快捷键、Ghostty 的字体、几十行 `.zshrc`、SSH host、Hammerspoon 脚本，还有 Codex、Claude Code 各自的 rules，全散落在不同角落。

我也考虑过最直接的办法：把配置统统塞进一个 Private Repo。但真正动手时，最让人不安的不是“能不能同步”，而是“会不会哪次手滑，把数据库密码或 SSH 私钥以明文交给 Git”。Private 只是权限设置，不是防呆系统。

所以这套方案不是简单的 `$HOME` 备份，而是一条有检查点的流水线：

```text
本机真实配置
    ↓ 逐文件纳管
chezmoi source state
    ↓ age 加密 + 本地泄漏扫描
GitHub Private Repo
    ↓ 新设备拉取
chezmoi 预览差异并恢复
```

我们会用 chezmoi 管配置、age 管密文、Gitleaks 看守 commit。整个过程从一个低风险文件开始，等你确认每一层都在工作，再逐批搬 IDE、Agent、SSH 和数据库配置。

这篇教程最关心的不是“怎样把文件传上去”，而是：**怎样让秘密在第一次 commit 之前就被拦下来。**

> 本文以 macOS 为主，写于 2026-07-28。命令中的 `YOUR_GITHUB_USERNAME` 和仓库名需要替换成自己的值。

## 一、先把最担心的事说透：Private 不等于安全

### 1. Private Repo 不是保险箱

GitHub Private Repo 解决的是访问控制，不是秘密管理。明文秘密一旦进入 Git，至少会留下这些风险：

- Git 对象和历史提交会长期保存内容，删除工作区文件不等于删除历史；
- 本机 clone、备份、GitHub App、协作者账号都可能持有副本；
- 仓库权限、可见性或账号安全配置未来可能发生变化；
- 即使 GitHub 能检测出 Token，普通密码、代理订阅和自定义连接串也可能无法识别。

截至本文写作时，GitHub 官方文档明确说明：公开仓库可以免费使用 Secret Scanning；组织私有仓库需要相应的 GitHub Secret Protection 能力；个人账号的普通私有仓库不能假设自动拥有完整扫描保护。面向个人账号的 Push Protection 默认主要阻止秘密被推送到**公开仓库**。

因此，我们的目标不是“泄漏后等待 GitHub 报警”，而是：

```text
秘密不得以明文进入第一次 commit
```

### 2. 真正有用的是五层防线

私有仓库仍然值得用，但它应该站在最后一层。前面需要五道能在本地停下来的检查：

[![明文进入 Git 前的五层防线](/assets/img/chezmoi-secure-dotfiles/security-layers.svg)](/assets/img/chezmoi-secure-dotfiles/security-layers.svg)

> 文中的信息图都可以点击查看清晰原图；图负责给你一眼能扫完的全貌，具体边界仍以正文为准。

| 防线 | 解决的问题 | 局限 |
|---|---|---|
| 显式逐文件纳管 | 避免把整个配置目录、缓存和会话一起加入 | 依赖人的分类判断 |
| age 入库前加密 | Git 中只保存密文 | 私钥必须独立备份 |
| chezmoi add secret gate | 添加普通文件时发现秘密便直接失败 | 只覆盖 chezmoi 的 add 入口 |
| Gitleaks 本地扫描 | 阻止常见 Token、私钥和密码模式提交 | 无法发现所有自定义秘密 |
| staged diff 人工复核 | 检查工具识别不到的 host、路径和业务信息 | 不能被自动化完全替代 |

`.gitignore`、`.chezmoiignore` 和 Private Repo 都是辅助防线，不能替代这五层门禁。

## 二、先分行李：不是每个配置都该上车

看到一个配置目录时，人很容易产生“整个复制最省事”的冲动。先忍住。判断一个文件是否该同步，不看它叫什么，而看两件事：新设备是否真的需要它，以及它能否安全地被仓库读取者看到。

[![配置同步的三条车道](/assets/img/chezmoi-secure-dotfiles/classification.svg)](/assets/img/chezmoi-secure-dotfiles/classification.svg)

| 类型 | 示例 | 处理方式 |
|---|---|---|
| 普通文本配置 | `.zshrc`、Ghostty、Hammerspoon、Finicky、Git ignore | Git 明文管理 |
| 应用设置 | Cursor、VS Code、Codex、Claude Code、pi | 只纳管显式配置、rules、skills、hooks |
| 声明式状态 | Brew、pnpm 全局包、Node 版本、Conda 环境 | 保存 manifest，目标机重建 |
| 半敏感配置 | SSH host、数据库地址、Nginx 域名 | 模板化或加密 |
| 凭证 | SSH 私钥、Token、密码、证书、Clash 订阅 | 优先不进仓库；确需同步则 age 加密 |
| 运行数据 | IDE workspaceStorage、聊天记录、日志、缓存、Conda packages | 不同步 |

几个容易犯错的例子：

- 同步 `Brewfile`，不要复制 `/opt/homebrew/Cellar`；
- 同步 `.nvmrc` 和默认 Node 版本，不要复制 `~/.nvm/versions`；
- 同步手工维护的 `environment.yml`，不要复制整个 Miniconda 环境；
- 同步 `~/.ssh/config`，不要默认同步 SSH 私钥；
- 同步 Codex/Claude 的规则和显式设置，不要同步 `auth`、sessions、history、logs；
- 同步 ClashX 无敏感模板，订阅 URL、节点密码和证书必须加密。

## 三、先把四件工具装好

本文使用四个工具：

- `chezmoi`：计算和应用 dotfiles 的目标状态；
- `age`：对确实需要进入仓库的敏感文件加密；
- `gitleaks`：提交前扫描常见秘密；
- `gh`：登录 GitHub 并访问私有仓库。

```bash
brew install chezmoi age gitleaks gh
```

检查安装结果：

```bash
chezmoi --version
age --version
gitleaks version
gh --version
```

这些工具都是开源工具。Git 本身不会判断“某段文本是否像 Token”；chezmoi 能在 `add` 时检查一次，Gitleaks 则继续覆盖 staged changes 和完整 Git 历史。两种扫描互相补位，但都只是模式检测器，不是不会漏报的安全证明。

## 四、先藏好钥匙，再碰敏感文件

这里不要抢跑。**先创建和备份 age identity，再让 chezmoi 碰任何敏感文件。** 如果顺序反过来，明文可能已经进入 source state，后面再加密只是亡羊补牢。

### 1. 生成独立的 age identity

```bash
mkdir -p "$HOME/.config/chezmoi"
chmod 700 "$HOME/.config/chezmoi"
chezmoi age-keygen --output="$HOME/.config/chezmoi/key.txt"
chmod 600 "$HOME/.config/chezmoi/key.txt"
```

命令会打印一个以 `age1` 开头的 public recipient。它可以公开；`key.txt` 中的 identity 不可以公开。

立即做两件事：

1. 把 `key.txt` 备份到密码管理器、加密移动介质或离线恢复介质；
2. 确认恢复副本可读取，再继续后面的步骤。

禁止这样做：

```text
把 age identity 放进同一个 dotfiles 仓库
```

那相当于把保险箱和钥匙放在一起。

### 2. 配置 chezmoi 使用 age

创建 `~/.config/chezmoi/chezmoi.toml`：

```toml
encryption = "age"

[age]
    identity = "~/.config/chezmoi/key.txt"
    recipient = "age1替换成刚才输出的public-recipient"

[add]
    secrets = "error"
```

注意 `encryption = "age"` 必须位于 TOML 顶层。`recipient` 是公钥，`identity` 指向只存在于本机的私钥文件。`add.secrets = "error"` 会把 chezmoi 添加未加密文件时的秘密检测从默认 warning 提升为直接失败；显式使用 `--encrypt` 的文件不会被这个门禁误拦截。

## 五、只从一个文件开始

```bash
chezmoi init
chezmoi source-path
```

chezmoi 默认把期望状态保存在：

```text
~/.local/share/chezmoi
```

这不是 `$HOME` 的镜像，而是将来要进入 Git 的 source state。一个简单但很有用的心法是：**每次打开它，都假设旁边坐着一个能读完整仓库的人。** 你愿意让他看到的内容，才可以留在这里。

本机的 `~/.config/chezmoi/chezmoi.toml` 不会自动成为仓库的一部分。为了让新设备在 `chezmoi init` 时自动得到相同的非秘密配置，在 source state 根目录创建 `.chezmoi.toml.tmpl`：

```toml
encryption = "age"

[age]
    identity = "{{ .chezmoi.homeDir }}/.config/chezmoi/key.txt"
    recipient = "age1替换成你的public-recipient"

[add]
    secrets = "error"
```

这个模板只包含 public recipient 和 identity 路径，不包含 age identity 本身，可以进入 Git。新设备必须先从独立安全位置恢复 `key.txt`，再执行 `chezmoi init`。

chezmoi 的基本工作流是：

```text
chezmoi add     将目标文件纳入 source state
chezmoi edit    编辑 source state
chezmoi diff    预览 apply 会造成的变化（可能解密并显示敏感内容）
chezmoi apply   将期望状态应用到 $HOME
chezmoi update  拉取远端并应用
```

第一次只挑一个不敏感文件，例如 `.zshrc`。目的不是赶进度，而是先走通 add、diff、apply 这条最短路径：

```bash
chezmoi add "$HOME/.zshrc"
chezmoi diff "$HOME/.zshrc"
chezmoi managed
```

`chezmoi diff` 会计算模板并解密 `encrypted_` 文件，完整 diff 可能把密码显示到 terminal、pager、录屏或 Agent 日志中。日常只对已经确认不敏感的目标单独 diff；不要对整棵目标树运行 verbose diff，也不得把可能含秘密的输出重定向、粘贴到聊天或保存为日志。加密文件只检查 source path 是否为 age 密文，并在可信的本地终端单独验证目标文件。

不要一上来执行：

```bash
chezmoi add "$HOME/.ssh"
chezmoi add "$HOME/.config"
```

大目录中通常混有 Token、缓存、数据库、下载内容和应用内部状态，逐文件添加才是安全默认。

## 六、给第一次 commit 装上安全带

现在所有内容还只在本机，是安装防线的最佳时机。等 push 以后再扫描，发现得再快也已经晚了一步。

### 1. 创建仓库内共享的 hook

进入 source state：

```bash
chezmoi cd
mkdir -p .githooks
```

创建 `.githooks/pre-commit`：

```bash
#!/bin/sh
set -eu

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks 未安装，拒绝提交。请先执行：brew install gitleaks" >&2
  exit 1
fi

exec gitleaks git --staged --redact
```

启用它：

```bash
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

`core.hooksPath` 是当前 clone 的本地 Git 配置，新设备 clone 后需要重新执行一次。hook 特意在找不到 Gitleaks 时失败，而不是静默放行。

### 2. 添加 source state 自身的忽略规则

`.chezmoiignore` 匹配的是目标路径，不是 source path。它可以降低误纳管风险，但不能阻止你手工把明文复制进 Git 仓库。

一个保守的起点：

```gitignore
# 仓库自身文件，不应用到 $HOME
README.md
.githooks/**

# 永远不由 chezmoi 管理的运行数据
.codex/sessions/**
.codex/log/**
.claude/history/**
.claude/logs/**

# 默认不纳管 SSH 私钥
.ssh/id_*
!.ssh/*.pub
```

再添加 `.gitignore`，阻止最常见的明文临时文件进入 source repo：

```gitignore
.env
.env.*
*.pem
*.key
*.decrypted
gitleaks-report*.json
```

这仍不是完整秘密列表。比如一个普通的 `config.json` 完全可能含 Token，因此 Gitleaks 和人工复核仍然必需。

### 3. 第一次安全提交

第一次迁移不要使用 `git add .`。逐项检查并逐项暂存：

```bash
git status --short
gitleaks dir . --redact
git add -- dot_zshrc .chezmoi.toml.tmpl .chezmoiignore .gitignore .githooks/pre-commit
git diff --cached --no-ext-diff --text
git commit -m "bootstrap secure chezmoi repository"
```

每次提交都保持同一条路径：

```text
chezmoi add/edit
  → chezmoi status
  → 对已确认不敏感的目标单独 diff
  → gitleaks dir
  → 精确 git add
  → git diff --cached
  → pre-commit 自动扫描
  → commit
```

## 七、三种配置，三种处理方式

### 1. 普通配置：确认后明文纳管

下面这些通常适合明文管理，但添加前仍要打开检查：

```bash
chezmoi add "$HOME/.zshrc"
chezmoi add "$HOME/.finicky.js"
chezmoi add "$HOME/.hammerspoon/init.lua"
chezmoi add "$HOME/.config/ghostty/config"
chezmoi add "$HOME/.config/git/ignore"
```

IDE 配置在 macOS 上通常位于：

```bash
chezmoi add "$HOME/Library/Application Support/Code/User/settings.json"
chezmoi add "$HOME/Library/Application Support/Code/User/keybindings.json"
chezmoi add "$HOME/Library/Application Support/Cursor/User/settings.json"
chezmoi add "$HOME/Library/Application Support/Cursor/User/keybindings.json"
```

添加前搜索 `token`、`password`、`secret`、`apiKey`。一些扩展会把连接信息混进 `settings.json`，不能因为文件名叫 settings 就默认安全。

如果 IDE 会频繁自动改写文件，不要急着把整个 User 目录做成 symlink。先只纳管稳定文件，观察一段时间，再决定使用 chezmoi template、modify script 或 source symlink。

### 2. 半敏感配置：把结构和具体值拆开

以 SSH config 为例，结构可以公开，但公司域名、用户名和跳板机地址未必适合明文出现。此时可以把变量写入本机 chezmoi data，由模板生成目标文件。

```text
Host work-bastion
  HostName {{ .workBastionHost }}
  User {{ .workSshUser }}
  IdentityFile ~/.ssh/work_ed25519
```

模板适合“结构相同、每台机器值不同”的配置。若变量本身是密码，仍应从密码管理器读取或加密保存，不能只是从一个明文文件搬到另一个明文文件。

### 3. 必须同步的敏感文件：第一次 add 就加密

chezmoi 官方提供 `--encrypt`，敏感文件必须通过这个入口第一次进入 source state：

```bash
chezmoi add --encrypt "$HOME/.pgpass"
```

在 source state 中，它会以 `encrypted_` 属性和 age 密文保存；apply、diff 和 edit 时由 chezmoi 按需解密。

验证 source 中没有出现原文：

```bash
encrypted_source="$(chezmoi source-path "$HOME/.pgpass")"
grep -q '^-----BEGIN AGE ENCRYPTED FILE-----$' "$encrypted_source" \
  && echo "OK: source state stores age ciphertext"
```

命令只确认 age armor header，不打印文件正文，避免验证失败时反而把数据库密码显示到终端或日志。

即便支持加密，也不代表所有秘密都值得进仓库。推荐优先级是：

```text
按设备重新生成 / 密码管理器动态读取
  > age 加密后入库
  > 明文入 Private Repo（禁止）
```

SSH 私钥尤其建议按设备生成，或交给 SSH Agent / 密码管理器；不要因为 age 可用，就把所有身份凭证集中进一个仓库。

## 八、别一天搬完：分四批迁移

到这里，安全带已经装好，才轮到真正搬家。不要试图一天迁完所有配置：批次越大，出错后越难判断是哪一个文件、哪一种同步方式出了问题。

[![分四批迁移开发环境](/assets/img/chezmoi-secure-dotfiles/migration-roadmap.svg)](/assets/img/chezmoi-secure-dotfiles/migration-roadmap.svg)

### 第一批：低风险基础配置

```text
.zshrc / .zprofile
Git config 与全局 ignore
Ghostty
Hammerspoon
Finicky
```

验收：打开新 shell；检查 Git identity 条件规则；重启相关应用。

### 第二批：声明式工具状态

Homebrew 使用 Brewfile：

```bash
brew bundle dump --file="$HOME/Brewfile" --force
chezmoi add "$HOME/Brewfile"
```

恢复时使用：

```bash
brew bundle --file="$HOME/Brewfile"
```

pnpm、NVM 和 Conda 不要复制安装目录：

```text
pnpm   → 保存需要的全局包清单，项目版本由 packageManager/Corepack 固定
NVM    → 保存默认 Node 版本和项目 .nvmrc
Conda  → 保存人工审查后的 environment.yml
```

Conda 的完整 export 往往含平台相关构建号和本机路径，不应未经检查直接当成跨设备规范。

### 第三批：IDE 与 AI 工具

```text
Cursor / VS Code  → settings、keybindings、snippets、扩展清单
Codex             → 配置、AGENTS.md、skills、rules；排除 auth/session/log
Claude Code       → CLAUDE.md、settings、skills、hooks；排除凭证和历史
Claude App        → 只同步公开且稳定的显式配置，不复制整个 Application Support
pi                → 同样按显式配置 / rules / credentials 分类
```

跨工具规则建议维护一个权威源，再投射到各工具：

```text
agents/shared/AGENTS.md
    ├─ 项目 AGENTS.md
    ├─ Cursor .cursor/rules/*.mdc
    ├─ VS Code instructions
    ├─ Codex AGENTS.md
    └─ Claude CLAUDE.md / rules
```

不要一边用 chezmoi 改同一份 settings，一边让 IDE 原生 Sync 自动覆盖它。对已经由 dotfiles 管理的文件，关闭对应的原生同步类别；原生 Sync 可以继续负责 UI State、Profile 或应用内部状态。

### 第四批：SSH、数据库、ClashX 与 Nginx

这是高风险批次，逐个处理：

| 配置 | 推荐方式 | 验收 |
|---|---|---|
| SSH config | 模板或加密 | `ssh -G <host>` 检查展开结果 |
| SSH 私钥 | 按设备生成 / SSH Agent | 权限为 `0600`，实测目标连接 |
| 数据库配置 | 普通参数模板化，密码动态读取或加密 | 只执行只读连接测试 |
| ClashX | 无敏感骨架明文，订阅和节点整体加密 | 检查 source state 不含 URL/密码 |
| Nginx | 模板化配置 | `nginx -t` 通过后才 reload |

不要把数据库数据目录、Nginx runtime 文件、Clash 缓存或日志当成配置同步。

## 九、本地都过关了，再创建 Private Repo

前面的检查全部在本地完成。现在才轮到 GitHub，这个顺序意味着即使远端没有 Secret Scanning，我们也不是毫无防护地把希望寄托在它身上。

先登录 GitHub：

```bash
gh auth login
gh auth setup-git
```

创建个人私有仓库：

```bash
gh repo create dotfiles --private --source="$(chezmoi source-path)" --remote=origin
```

确认可见性，不能凭网页印象判断：

```bash
gh repo view YOUR_GITHUB_USERNAME/dotfiles --json visibility --jq .visibility
```

预期输出：

```text
PRIVATE
```

推送前再做一次完整门禁：

```bash
chezmoi cd
git branch -M main
git status --short
gitleaks git --redact
git log --stat --oneline
git remote -v
git push -u origin main
```

注意：GitHub Actions 中运行 Gitleaks 只能在 push 后发现问题，不能替代本地 pre-commit。对秘密来说，“远端很快报警”仍然意味着秘密已经到达远端。

## 十、换台 Mac：先演习，再真正落文件

真正检验 dotfiles 的不是“第一台机器 push 成功”，而是第二台机器能否安全恢复。新设备需要先拿到两种身份：GitHub 身份负责读仓库，age identity 负责打开密文。二者必须来自不同的安全路径。

[![新设备安全恢复流程](/assets/img/chezmoi-secure-dotfiles/recovery.svg)](/assets/img/chezmoi-secure-dotfiles/recovery.svg)

1. GitHub 登录，用于读取 Private Repo；
2. 从独立安全位置恢复 age identity。

安装工具并登录：

如果是刚初始化的全新 Mac，先完成 Xcode Command Line Tools 和 Homebrew 的官方安装。本教程从 Homebrew 已可用开始，不把 Homebrew 自身的 bootstrap 混入 dotfiles 恢复链。

```bash
brew install chezmoi age gitleaks gh
gh auth login
gh auth setup-git
```

先创建 identity 目录：

```bash
mkdir -p "$HOME/.config/chezmoi"
chmod 700 "$HOME/.config/chezmoi"
```

然后从独立安全位置恢复 age identity 到相同路径：

```text
~/.config/chezmoi/key.txt
```

最后设置文件权限：

```bash
chmod 600 "$HOME/.config/chezmoi/key.txt"
```

第一次不要直接 `--apply`。先拉取、检查再应用：

```bash
chezmoi init https://github.com/YOUR_GITHUB_USERNAME/dotfiles.git
chezmoi status
chezmoi diff "$HOME/.zshrc"
chezmoi apply --dry-run
```

`--verbose` 会打印文件 diff，模板或加密目标可能因此把秘密暴露在终端和日志中，所以不要在整库恢复时使用它。先通过 `status` 看变化范围，再只对确认不敏感的目标单独 diff。

确认路径和变化范围都正确后，应用普通配置时也不打印正文：

```bash
chezmoi apply
```

包含秘密的模板或加密目标，在可信的本地终端中按目标单独 apply 和验收，全程不要加 `--verbose`。

重新启用本地 hook：

```bash
chezmoi cd
git config core.hooksPath .githooks
gitleaks git --redact
```

最后逐项验收，而不是用“命令没报错”代替结果检查：

```text
新 shell 正常启动
Git identity 与 ignore 生效
Ghostty / Hammerspoon / Finicky 配置生效
IDE settings、快捷键和 snippets 正确
AI rules 能被对应工具发现
SSH 只读连接测试通过
数据库只读连接测试通过
nginx -t 通过
source state 中没有秘密明文
```

日常更新使用：

```bash
git -C "$(chezmoi source-path)" pull --ff-only
chezmoi status
chezmoi apply
```

先看 source repo 的变更和 `chezmoi status`，再 apply。涉及脚本、删除或服务配置时尤其如此；需要看具体内容时，仍然只 diff 已确认不敏感的目标。

## 十一、真泄漏了：先让旧凭证失效

这段最好永远用不上，但真出事时顺序比速度更重要。第一原则只有一句：**先轮换凭证，再清理历史。** 删除文件看起来最直观，却不能阻止别人继续使用已经看到的旧 Token。

[![秘密误提交后的正确处理顺序](/assets/img/chezmoi-secure-dotfiles/incident-response.svg)](/assets/img/chezmoi-secure-dotfiles/incident-response.svg)

凭证失效后，再确认哪些 clone、GitHub App、协作者和自动化可能拿到过副本。然后把当前版本改成模板或密文，使用 `git-filter-repo` 等工具清理历史，通知所有设备重新同步，最后扫描全部历史确认没有第二处。

仅仅执行一次普通 commit 删除文件是不够的，旧内容仍在历史中。即使完成历史重写，也必须认为原凭证已经泄漏并永久作废；历史清理不能让已经被读取的秘密“重新安全”。

历史重写会改变 commit ID，并影响所有 clone。不要在不了解仓库消费者的情况下直接执行强制推送。个人 dotfiles 仓库通常消费者较少，但仍应先确认设备和自动化清单。

## 十二、别用文件数量衡量完成度

仓库刚建好时只有几个文件很正常。dotfiles 的价值不在于目录看起来多完整，而在于你真的敢在一台新机器上预演、应用，并且知道秘密从未以明文进过历史。随着配置逐批稳定，仓库自然会长成下面这样的逻辑分区：

```text
dotfiles/
├── shell/
├── editors/
│   ├── common/
│   ├── vscode/
│   └── cursor/
├── agents/
│   ├── shared/
│   ├── codex/
│   ├── claude/
│   └── pi/
├── git/
├── ssh/
├── database/
├── ghostty/
├── hammerspoon/
├── finicky/
├── clashx/
├── nginx/
├── manifests/
│   ├── Brewfile
│   ├── pnpm-global.txt
│   ├── node-versions
│   └── conda/
└── encrypted secrets
```

chezmoi 实际 source state 会使用 `dot_`、`private_`、`encrypted_` 和 `.tmpl` 等属性编码，没必要一开始就追求漂亮目录。正确的演进顺序是：

```text
一个低风险文件
  → 一批可验证配置
  → 声明式软件清单
  → IDE 与 AI 工具
  → 最后处理敏感配置
```

真正的完成标准也不是“仓库里已经有很多文件”，而是：

> 在完成基础工具 bootstrap 的干净设备上，只依赖 GitHub 身份和独立保存的 age identity，能够预览并重建需要的配置；仓库任意历史版本都不包含秘密明文。

## 参考资料

- [chezmoi Quick start](https://www.chezmoi.io/quick-start/)
- [chezmoi 使用 age 加密](https://www.chezmoi.io/user-guide/encryption/age/)
- [chezmoi 管理不同类型的文件](https://www.chezmoi.io/user-guide/manage-different-types-of-file/)
- [chezmoi `.chezmoiignore`](https://www.chezmoi.io/reference/special-files/chezmoiignore/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning)
- [GitHub Push Protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [age](https://github.com/FiloSottile/age)
