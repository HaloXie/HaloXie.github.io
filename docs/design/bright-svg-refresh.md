# 明快风格：精确信息图更新

2026-10-19。来源：确定性 SVG，经 Sharp 导出 WebP；不是 gpt-image-2。按已确认 bright 方向更新 57 张发布图，全部 1200 × 675、quality 90、单张小于 100,000 bytes。

## 范围与处理

- 从当前 _posts 中的 WebP 引用选择存在同名 SVG 的图；排除 Agent/LLM 两个已换模型封面的旧 SVG，以及 prompt-cache-prefix 交互回退。
- 背景统一 #fff9e9；去除噪声纸纹叠层，保留精确节点、箭头、全部文字与数值；蓝 #79cef2、橙 #ffb366、黄 #ffdc67、绿 #ade6bd。警示文本保留深红，避免改变语义。
- chezmoi 原深色图改浅色；原 1440×700/720/760 画布扩为 1440×810，等比输出，不拉伸、不裁切。中英文同时处理。
- Harness Codex 图原异单位同轴柱图改为独立指标卡；数值依据中英文正文：3→7 人、5个月、约100万行、约1500 PR、3.5 PR/工程师/天、0行手写。图不新增收益结论。Harness 完成率保留零基线与52.8%、66.5%，新增中文 SVG 真值。
- 7 张分组图已逐张目视；问题图单独打开最终 WebP 复核。修复旧英文长句适配与深色残留，原文不删减。少量细注释仍需点击大图阅读；本轮不改变图的信息层次。

## 清单

每行 SVG 同名 WebP 为发布文件，尺寸均为 1200×675。

| SVG source | WebP bytes |
|---|---:|
| assets/img/agent-patterns-with-pi/agent-decision-spectrum-en.svg | 48594 |
| assets/img/agent-patterns-with-pi/agent-decision-spectrum.svg | 44764 |
| assets/img/agent-patterns-with-pi/pi-minimal-loop-en.svg | 48930 |
| assets/img/agent-patterns-with-pi/pi-minimal-loop.svg | 52886 |
| assets/img/agent-patterns-with-pi/routing-layers-en.svg | 49208 |
| assets/img/agent-patterns-with-pi/routing-layers.svg | 44298 |
| assets/img/chat-workflow-agent-guide/decision-spectrum-en.svg | 59542 |
| assets/img/chat-workflow-agent-guide/decision-spectrum.svg | 58620 |
| assets/img/chat-workflow-agent-guide/selection-map-en.svg | 38374 |
| assets/img/chat-workflow-agent-guide/selection-map.svg | 35470 |
| assets/img/chat-workflow-agent-guide/three-control-models-en.svg | 50608 |
| assets/img/chat-workflow-agent-guide/three-control-models.svg | 46188 |
| assets/img/chezmoi-secure-dotfiles/classification-en.svg | 50664 |
| assets/img/chezmoi-secure-dotfiles/classification.svg | 49024 |
| assets/img/chezmoi-secure-dotfiles/incident-response-en.svg | 43046 |
| assets/img/chezmoi-secure-dotfiles/incident-response.svg | 42310 |
| assets/img/chezmoi-secure-dotfiles/migration-roadmap-en.svg | 37172 |
| assets/img/chezmoi-secure-dotfiles/migration-roadmap.svg | 37064 |
| assets/img/chezmoi-secure-dotfiles/recovery-en.svg | 41654 |
| assets/img/chezmoi-secure-dotfiles/recovery.svg | 40340 |
| assets/img/chezmoi-secure-dotfiles/security-layers-en.svg | 40078 |
| assets/img/chezmoi-secure-dotfiles/security-layers.svg | 40108 |
| assets/img/from-skills-to-abilities/acp-contract-en.svg | 66706 |
| assets/img/from-skills-to-abilities/acp-contract.svg | 64106 |
| assets/img/from-skills-to-abilities/cognitive-closure-en.svg | 67496 |
| assets/img/from-skills-to-abilities/cognitive-closure.svg | 62354 |
| assets/img/from-skills-to-abilities/evolution-en.svg | 64182 |
| assets/img/from-skills-to-abilities/evolution.svg | 59514 |
| assets/img/harness-engineering/chart_codex-en.svg | 50612 |
| assets/img/harness-engineering/chart_harness-en.svg | 23558 |
| assets/img/harness-engineering/codex-case-en.svg | 39698 |
| assets/img/harness-engineering/compare-en.svg | 32676 |
| assets/img/harness-engineering/cover-en.svg | 38140 |
| assets/img/harness-engineering/six-components-v2-en.svg | 46764 |
| assets/img/harness-engineering/strategy-en.svg | 43816 |
| assets/img/language-choose/blockchain-language-winners-zh-CN.svg | 33270 |
| assets/img/language-choose/blockchain-language-winners.svg | 49712 |
| assets/img/openclaw-guide/how-it-works-en.svg | 50804 |
| assets/img/openclaw-guide/how-it-works.svg | 49260 |
| assets/img/openclaw-guide/role-roadmap-en.svg | 69562 |
| assets/img/openclaw-guide/role-roadmap.svg | 62348 |
| assets/img/openclaw-guide/skill-security-en.svg | 57672 |
| assets/img/openclaw-guide/skill-security.svg | 54878 |
| assets/img/sprint-git-flow/flow-en.svg | 57616 |
| assets/img/sprint-git-flow/flow.svg | 62002 |
| assets/img/sprint-git-flow/incident-routing-en.svg | 68714 |
| assets/img/sprint-git-flow/incident-routing.svg | 53230 |
| assets/img/sprint-git-flow/release-recovery-en.svg | 49996 |
| assets/img/sprint-git-flow/release-recovery.svg | 58154 |
| assets/img/sprint-git-flow/sprint-cycle-en.svg | 58880 |
| assets/img/sprint-git-flow/sprint-cycle.svg | 57164 |
| assets/img/sprint-git-flow/workflow-map-en.svg | 43624 |
| assets/img/sprint-git-flow/workflow-map.svg | 41266 |
| assets/img/thinking-on-by-default/preserved-thinking-en.svg | 65084 |
| assets/img/thinking-on-by-default/preserved-thinking.svg | 61326 |
| assets/img/harness-engineering/chart_codex.svg | 41944 |
| assets/img/harness-engineering/chart_harness.svg | 19686 |

未构建站点；最终文章移动端与 Light/Dark 由主代理统一 E2E。
