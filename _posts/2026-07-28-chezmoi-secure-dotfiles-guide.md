---
title: "用 chezmoi 安全同步开发环境：从零搭建可审计的 dotfiles"
description: "以 chezmoi、GitHub Private Repo、age 和 Gitleaks 搭建跨设备配置同步，重点防止 SSH、数据库和 AI 工具凭证被明文提交"
date: 2026-07-28 12:00:00 +0800
categories: [Tools]
tags: [chezmoi, dotfiles, macos, github, age, gitleaks, security]
toc: true
---

换一台 Mac，真正麻烦的通常不是安装软件，而是恢复散落在各处的配置：Cursor、VS Code、Codex、Claude Code、Ghostty、Zsh、Git、SSH、Homebrew、pnpm、NVM、Conda、Nginx、Hammerspoon、Finicky、ClashX……每个工具都有自己的目录、格式和隐含状态。

把整个 `$HOME` 上传到 GitHub 显然不安全；只用 VS Code 或 Cursor 自带的 Settings Sync，又覆盖不了其他工具。本文采用一套更可控的方案：

```text
本机真实配置
    ↓ 逐文件纳管
chezmoi source state
    ↓ age 加密 + 本地泄漏扫描
GitHub Private Repo
    ↓ 新设备拉取
chezmoi 预览差异并恢复
```

这篇教程最关心的不是“怎样把文件上传”，而是另一个更重要的问题：**怎样保证秘密不会以明文进入 Git 历史。**

> 本文以 macOS 为主，写于 2026-07-28。命令中的 `YOUR_GITHUB_USERNAME` 和仓库名需要替换成自己的值。

## 一、先建立正确的安全模型

### 1. Private Repo 不是 Secret Manager

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

### 2. 五层防线

本文使用以下五层门禁，它们缺一不可：

| 防线 | 解决的问题 | 局限 |
|---|---|---|
| 显式逐文件纳管 | 避免把整个配置目录、缓存和会话一起加入 | 依赖人的分类判断 |
| age 入库前加密 | Git 中只保存密文 | 私钥必须独立备份 |
| chezmoi add secret gate | 添加普通文件时发现秘密便直接失败 | 只覆盖 chezmoi 的 add 入口 |
| Gitleaks 本地扫描 | 阻止常见 Token、私钥和密码模式提交 | 无法发现所有自定义秘密 |
| staged diff 人工复核 | 检查工具识别不到的 host、路径和业务信息 | 不能被自动化完全替代 |

`.gitignore`、`.chezmoiignore` 和 Private Repo 都是辅助防线，不能替代这五层门禁。

## 二、什么该同步，什么不该同步

配置同步前先分类。不要从“这个目录看起来有用”出发，而要从“新设备是否能通过声明重新得到正确状态”出发。

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

## 三、安装工具

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

这些工具都是开源工具。这里引入 Gitleaks 是因为 Git 和 chezmoi 本身不会识别“某段文本是否像 Token”；但 Gitleaks 只是模式检测器，不是不会漏报的安全证明。

## 四、先配置 age，再添加任何敏感文件

顺序非常重要：**先创建和备份 age identity，再让 chezmoi 纳管敏感文件。**

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

## 五、初始化本地 source state

```bash
chezmoi init
chezmoi source-path
```

chezmoi 默认把期望状态保存在：

```text
~/.local/share/chezmoi
```

这不是 `$HOME` 的备份目录，而是将来要进入 Git 的 source state。后续每次提交前，都必须把它当成“即将公开给所有仓库读取者的内容”来审查。

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

第一次只添加一个不敏感文件：

```bash
chezmoi add "$HOME/.zshrc"
chezmoi diff --exclude=encrypted
chezmoi managed
```

`chezmoi diff` 会在计算目标状态时解密 `encrypted_` 文件，完整 diff 可能把密码显示到 terminal、pager、录屏或 Agent 日志中。日常审查默认加 `--exclude=encrypted`；不得把包含敏感文件的 diff 重定向、粘贴到聊天或保存为日志。加密文件只检查 source path 是否为 age 密文，并在可信的本地终端单独验证目标文件。

不要一上来执行：

```bash
chezmoi add "$HOME/.ssh"
chezmoi add "$HOME/.config"
```

大目录中通常混有 Token、缓存、数据库、下载内容和应用内部状态，逐文件添加才是安全默认。

## 六、在第一次 commit 前安装本地泄漏门禁

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
  → chezmoi diff --exclude=encrypted
  → gitleaks dir
  → 精确 git add
  → git diff --cached
  → pre-commit 自动扫描
  → commit
```

## 七、正确添加普通配置与敏感配置

### 1. 普通配置：明文纳管

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

### 2. 半敏感配置：优先模板化

以 SSH config 为例，结构可以公开，但公司域名、用户名和跳板机地址未必适合明文出现。此时可以把变量写入本机 chezmoi data，由模板生成目标文件。

```text
Host work-bastion
  HostName {{ .workBastionHost }}
  User {{ .workSshUser }}
  IdentityFile ~/.ssh/work_ed25519
```

模板适合“结构相同、每台机器值不同”的配置。若变量本身是密码，仍应从密码管理器读取或加密保存，不能只是从一个明文文件搬到另一个明文文件。

### 3. 必须同步的敏感文件：直接加密添加

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

## 八、按类别迁移现有开发环境

不要在一天内迁完所有配置。每一批都应该能独立验证和回滚。

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

## 九、创建 GitHub Private Repo 并首次推送

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

## 十、在第二台 Mac 上恢复

新设备需要先完成两项身份引导：

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
chezmoi diff --exclude=encrypted
chezmoi apply --dry-run --verbose
```

确认路径、模板变量和删除操作都正确后：

```bash
chezmoi apply --verbose
```

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
chezmoi update --dry-run --verbose
chezmoi update --verbose
```

先 dry-run，再 apply。涉及脚本、删除或服务配置时尤其如此。

## 十一、如果已经误提交明文怎么办

第一原则：**先轮换凭证，再清理历史。**

```text
停止继续 push
  → 立即吊销或轮换 Token/密码/密钥
  → 判断哪些 clone、协作者和应用可能拿到副本
  → 从当前版本删除明文并改成模板/密文
  → 使用 git-filter-repo 等工具重写历史
  → 强制更新远端并通知所有 clone 重新同步
  → 再次扫描所有历史
```

仅仅执行一次普通 commit 删除文件是不够的，旧内容仍在历史中。即使完成历史重写，也必须认为原凭证已经泄漏并永久作废；历史清理不能让已经被读取的秘密“重新安全”。

历史重写会改变 commit ID，并影响所有 clone。不要在不了解仓库消费者的情况下直接执行强制推送。个人 dotfiles 仓库通常消费者较少，但仍应先确认设备和自动化清单。

## 十二、最终目录不是目标，可恢复性才是目标

一个成熟的 dotfiles 仓库大致会包含这些逻辑分区：

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
