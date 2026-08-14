# Task：继续完成《Agent 工程从 0 到 1》

## 背景

这套课程的主线，是把 [Datawhale《Hello Agents》](https://github.com/datawhalechina/Hello-Agents) 从头到尾完整学一遍，覆盖书里的 Agent 基础、LLM、工具、记忆、经典模式、多 Agent、协议、安全、评估和完整项目。

我们不直接翻译原书，而是重新整理成 28 篇适合碎片化阅读的中文短课：

- 用自己的话讲，简单、大白话、直接；
- 首次出现的名词先解释，再讨论架构；
- 代码示例统一改用 [Pi](https://github.com/earendil-works/pi)；
- 原书、论文、图书和官方文档只引用必要观点，并给出可跳转来源；
- 中文课程全部写完并在线确认定稿后，再统一进行英文改写；
- 每个大阶段完成后，让一个不了解上下文的“小白 Agent”连续阅读，检查是否真的看得懂。

课程目录和发布状态以 `_data/series.yml` 为准。当前已经完成第 01–04 课，下一篇从第 05 课开始。

## 已完成

- 01 Chat、Workflow 还是 Agent？
- 02 Agent 不只一种：用 Pi 跑起最小 Agent
- 03 Agent 架构全景图
- 04 一次 LLM 调用究竟发生了什么

## 剩余课程

### 阶段 02：理解 LLM Runtime

- **05 Message、Role、Token 和 Context Window**：解释 Agent 每一轮究竟向模型提交了哪些消息，system、user、assistant、tool 分别有什么作用，token 和 context window 又会怎样限制长任务。
- **06 用 Pi 实现最小 Agent Loop**：从一次模型调用升级到真正的循环，串起流式输出、状态保存、结构化结果、下一步判断和停止条件。

### 阶段 03：给 Agent 安上手脚

- **07 Tool Calling 不是 Agent**：说明模型会调用一次函数，不等于系统已经拥有 Agent；关键差别是工具结果回来后，谁负责观察并决定下一步。
- **08 一个好 Tool 的 Schema 应该怎么写**：讲清工具名称、描述、参数、返回值和边界怎样设计，才能减少模型猜测和误用。
- **09 Tool 的错误、重试、超时和结果语义**：把网络失败、参数错误、业务失败和超时变成模型与程序都能理解的结果，而不是简单抛出一段异常文字。
- **10 副作用、幂等、审批、并行和取消**：处理发消息、改文件、付款等真实动作，解释哪些操作必须审批、怎样避免重复执行，以及何时可以并行或取消。

### 阶段 04：管理 Context 与 Memory

- **11 Prompt Engineering 与 Context Engineering**：区分长期规则和当前任务资料，说明为什么很多 Agent 问题并不是 Prompt 写得不够长，而是 Context 放错了东西。
- **12 Session、历史消息和 Context Compaction**：讲清会话、消息历史、摘要压缩和恢复点，让长任务不必无限累积全部聊天记录。
- **13 RAG 应该是 Tool，还是自动注入 Context**：比较主动检索和系统自动塞资料两种方式，根据时机、成本、可见性和可追踪性选择。
- **14 Working、Episodic、Semantic 与 Procedural Memory**：用“记什么、什么时候写、怎样找、何时忘”解释工作记忆、经历记忆、事实记忆和流程记忆。

### 阶段 05：掌握 Agent Patterns

- **15 ReAct：边观察边行动**：用 Pi 实现“思考—行动—观察”的循环，强调每次拿到真实工具结果后都要重新判断。
- **16 Plan-and-Execute：先规划再执行**：把任务拆解与实际执行分开，同时说明计划不能变成不可修改的剧本，必须允许证据纠正它。
- **17 Reflection 与 Evaluator-Optimizer**：比较自我反思和独立评估，判断什么时候多一次模型调用能提高质量，什么时候只是在重复润色。
- **18 Router、Parallel 与 Blackboard**：解释按类型路由、并行处理和共享黑板三种组织方式，以及它们分别适合什么任务。
- **19 Supervisor、Handoff 与 Multi-Agent**：讲清主管 Agent、任务交接和多 Agent 协作；只有上下文隔离或真实并行有收益时，才值得增加 Agent 数量。

### 阶段 06：从 Demo 到可靠系统

- **20 MCP：把外部能力接进 Agent**：解释 MCP 的 Tool、Resource、Prompt 和传输层分别做什么，并用 Pi 接入一个最小 MCP 服务。
- **21 Prompt Injection 与 Tool Injection**：说明网页、文件和工具返回值为什么只是数据，不能自动获得指令权；建立不可信输入的基本模型。
- **22 Sandbox、权限、预算和 Human-in-the-loop**：把安全从“Prompt 里提醒小心”升级为系统边界，包括文件范围、命令权限、费用预算和人工确认。
- **23 Trace、Observability 与 Agent Evaluation**：记录每次模型调用、工具调用和状态变化，再从最终答案反查过程，建立可以反复运行的评估集。

### 阶段 07：完成完整 Agent 项目

- **24 项目 Spec、架构与验收标准**：先定义“研究完成”意味着什么，再确定证据优先研究 Agent 的模块、数据流和验收条件。
- **25 搜索、网页读取、资料标准化与引用工具**：实现搜索和网页读取，把不同来源整理成统一结构，让关键结论都能跳回原始证据。
- **26 Planner、Researcher 与任务恢复**：把研究问题拆成可执行子问题，保存计划、进度和证据，让中断后的任务可以继续。
- **27 Citation、Evaluator、Context 与持久化**：独立检查引用覆盖、结论与来源是否一致，同时控制 context budget 并持久化研究状态。
- **28 CLI、HTTP/SSE API、评估集与发布门禁**：把前面的模块组装成完整项目，提供命令行与流式 API，补齐测试、评估、演示和发布检查。

## 最终结果

完成第 28 课时，我们应该同时得到两样东西：

1. 一套从基础概念到可靠工程的完整中文 Agent 入门课程，已经把《Hello Agents》的主要内容从头到尾过完；
2. 一个使用 Pi 构建的“证据优先技术研究 Agent”，能够规划、检索、读取资料、核验引用、恢复任务，并通过 CLI 或 HTTP/SSE API 输出结果。

新 session 继续时，先读本文件和 `_data/series.yml`，再从第一个状态为 `planned` 的中文课程开始。
