---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
releaseMode: phased
classification:
  projectType: desktop_app
  domain: developer_productivity_ai_orchestration
  complexity: high
  projectContext: brownfield
  technicalDirection:
    frontendPreference: React
    frontendExclusion: Vue
    platformRequirement: cross_platform_desktop
    stackFlexibility: languages_and_frameworks_can_change
    optimizationGoal: latest_stable_high_performance_architecture
    dataCompatibility: greenfield_new_schema_no_legacy_migration
inputDocuments:
  - docs/index.md
  - docs/rebuild/project-overview.md
  - docs/rebuild/feature-inventory.md
  - docs/rebuild/current-architecture.md
  - docs/rebuild/ipc-events-and-contracts.md
  - docs/rebuild/data-and-storage.md
  - docs/rebuild/source-tree-analysis.md
  - docs/rebuild/modernization-blueprint.md
  - docs/rebuild/parity-checklist.md
  - /Users/wdx/opc/golutra/README.md
  - /Users/wdx/opc/golutra/startup_processmd.md
  - /Users/wdx/opc/golutra/SECURITY.md
documentCounts:
  productBriefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 9
  referenceProjectDocs: 3
workflowType: 'prd'
---

# Product Requirements Document - orchlet

**Author:** 王定旭
**Date:** 2026-05-11

## Executive Summary

本 PRD 定义 `orchlet` 的新版产品需求：以现有 `golutra` 作为用户可见产品母版，重建一个现代化、高性能、跨平台的本地优先 AI CLI 多智能体协作工作区。新版必须保留并复刻旧版的核心用户价值、页面形态、窗口模式、视觉系统、交互流程和关键行为，包括本地工作区管理、多 AI CLI 成员邀请、聊天到终端派发、终端输出回写聊天、多窗口终端、托盘通知、技能管理、设置、诊断和数据持久化；但不要求兼容旧版数据、旧 redb 数据库或旧 `.golutra` 工作区结构。新版允许重做内部架构、模块边界、前后端技术栈和数据层，以获得更好的性能、可维护性、可测试性和长期演进能力；这些内部变化不得改变用户看到和使用到的 Golutra 产品形态，除非先获得明确批准并记录为 parity exception。

产品目标用户是重度使用 Claude Code、Codex、Gemini CLI、OpenCode、Qwen、自定义 shell 或其他 AI CLI 的本地开发者和小团队。用户不希望迁移项目目录、不希望重学命令、不希望被单一 AI 工具绑定；他们需要一个能够把多个 CLI 智能体组织成可观察、可调度、可长期运行的协作系统的桌面工具。新版必须使用 React 方向替代 Vue；其他语言、框架、构建工具、数据库和桌面运行时可以在后续技术研究与架构设计中重新选择，但必须满足跨平台、性能优先、本地优先、功能不遗漏和新架构可演进的约束。

本 PRD 不直接锁定最终技术架构。后续必须执行技术研究和架构设计：使用最新官方资料评估 React、Tauri、Rust、Vite、Tailwind、xterm、SQLite 或替代方案，并在 `[CA] bmad-create-architecture` 中确定新版架构、模块边界、IPC/事件契约、新数据 schema、性能目标和测试策略。

### What Makes This Special

`orchlet` 的差异点不是“聊天 + 终端”的组合，而是把用户已经信任的 AI CLI 变成可协作、可派发、可追踪、可恢复的本地智能体工作系统。用户继续使用熟悉的 CLI 和项目目录，系统负责成员管理、消息路由、终端会话、状态同步、通知、技能链接、诊断和长期工作流组织。

核心洞察是：AI 编程工具正在从单次对话转向多角色、长任务、并行执行和持续交付。传统 IDE、普通终端、多开 CLI 或单一 Agent UI 都无法稳定解决“多个 AI CLI 同时工作、上下文可传递、输出可汇总、任务可观察、异常可恢复”的问题。`orchlet` 要成为这个协作层，而不是替代底层 CLI。

新版的产品成功取决于三个要求同时成立：第一，旧版 `golutra` 中已验证有价值的能力必须通过 capability checklist 被逐项保留、替换或明确放弃；第二，用户可见 UI、文案语义、窗口模式、主流程、交互状态和功能边界必须与 `/Users/wdx/opc/golutra` 保持 parity；第三，新架构必须避免继续复制旧版中 store 过重、IPC 契约分散、终端状态多事实源、持久化缺少 schema 管理、UI 与副作用耦合等老化点。

## Project Classification

- **Project Type:** 跨平台桌面应用，兼具开发者工具属性。
- **Domain:** 开发者生产力 / AI CLI 多智能体编排 / 本地优先协作系统。
- **Complexity:** 高。复杂度来自跨平台桌面能力、PTY 终端、聊天数据库、IPC/event 契约、多窗口、托盘通知、流式消息、新数据 schema、能力验收和长期架构演进，而不是来自行业监管。
- **Project Context:** Product rebuild。现有 `golutra` 是用户可见 UI、流程和功能行为母版，`orchlet` 是 React/现代架构版重建；旧数据和旧内部实现不作为兼容约束。

## Success Criteria

### User Success

用户可以在不迁移项目、不重学 CLI、不绑定单一 AI 工具的前提下，把本地目录打开为工作区，并在同一个桌面应用中完成 AI CLI 成员邀请、聊天派发、终端观察、输出回写和通知处理。首次有效体验应在 5 分钟内完成：打开工作区、邀请至少一个 AI CLI 成员、发送一条消息到终端、看到终端输出回写到聊天或终端视图。

重度用户的成功标准是能把多个 AI CLI 当作可并行工作的成员管理，而不是手动切换多个终端窗口。用户应能清楚看到每个成员的在线、工作中、免打扰或离线状态；能把消息派发到指定成员；能从聊天、通知或成员头像快速回到对应终端；能在任务中断、窗口关闭或工作区重开后恢复足够上下文。

开发者体验必须优先于视觉炫技。核心路径包括打开工作区、邀请成员、发送消息、查看终端、搜索终端、切换会话、处理未读、修改设置和恢复会话/状态，这些路径必须稳定、直接、低延迟，并能在 Windows、macOS、Linux 上保持一致语义。

### Business Success

MVP 成功标准是新版能够替代旧版 `golutra` 的核心日常使用场景，并证明 React 方向的新架构不会降低关键体验。第一阶段不以功能扩张为胜利，而以核心能力重建、性能提升、新数据模型稳定和架构可维护为胜利。

发布后 3 个月的业务目标是形成可信的开发者工具基础版本：核心功能通过 capability checklist；安装包、启动、工作区打开、终端会话、聊天派发和新数据持久化在主流三平台完成 smoke 验证；早期用户能完成真实项目中的多 AI CLI 协作，不需要回退到旧版。

发布后 12 个月的业务目标是从“多 CLI 协作工作区”扩展到“长期运行 AI 工作系统”：支持更完整的工作流模板、技能/插件生态、远程/移动监控、长期任务可观察性和更高层级的调度能力。路线图功能只有在 MVP 稳定、数据安全和核心协作闭环可靠后进入。

### Technical Success

新版必须以 React 替代 Vue，并在架构阶段基于最新官方资料选择跨平台桌面方案、构建工具、后端语言、IPC 契约方案、数据库和终端渲染方案。默认方向是保留高性能本地后端和系统能力边界，但最终选择必须由 `[TR] bmad-technical-research` 与 `[CA] bmad-create-architecture` 确认。

技术成功必须可验证：

- 启动、窗口创建、工作区打开、终端 attach、聊天发送和通知跳转都有可测延迟目标。
- IPC command、event、window mode 和 payload 必须有集中契约，不允许前端功能模块散落硬编码 `invoke` 字符串。
- 工作区数据、全局设置、聊天数据库、头像库、技能链接、最近工作区和 registry 必须有 schema version、schema 演进策略和失败报告。
- 终端 session 必须有单一事实源和明确状态机，支持 output seq、ACK 流控、snapshot attach、DND 跳过、working queue、去重和批量合并。
- 所有核心能力必须通过 capability checklist 标记为“通过、替换或明确放弃”，不得靠记忆补功能。
- 跨平台行为必须覆盖 Windows、macOS、Linux，尤其是无边框窗口、托盘、文件管理器打开、PTY、路径解析、权限和安装包。

### Measurable Outcomes

- 首次打开已有本地项目并进入主界面：目标 P95 不超过 3 秒，不包含用户选择目录时间。
- 创建或复用终端会话：目标 P95 不超过 2 秒；CLI 缺失时必须给出可操作错误。
- 聊天消息写入本地数据库并进入派发队列：目标 P95 不超过 300ms。
- 终端增量输出到 UI 渲染：在高输出场景下保持不乱序、不丢关键字节、不阻塞主交互线程。
- 新数据 schema 变更必须有自动化验证，列出成功、失败和需要人工处理的项。
- Capability checklist 中 MVP 范围内项目必须 100% 处理：通过、替代方案通过，或经产品决策明确放弃。
- Golutra parity gate 中所有参考屏幕、窗口模式、核心交互和用户可见功能必须 100% 处理：通过、经批准的 parity exception，或明确放弃并记录原因。
- 每个核心模块至少有单元测试或契约测试；关键端到端路径至少覆盖打开工作区、邀请成员、发送消息到终端、终端输出回写、通知跳转和数据重启恢复。

### Visual And Behavioral Parity Release Gate

MVP 发布前必须完成 Golutra parity gate。`/Users/wdx/opc/golutra` 是用户可见产品母版；React 替代 Vue 是内部实现选择，不是重新设计许可。所有参考屏幕和核心流程必须通过截图对照、交互 smoke、功能库存对照和人工验收。自动截图允许仅因平台字体抗锯齿或 WebView 渲染产生的微小差异；不得存在未经批准的 layout、color、flow、copy 或 feature deviation。

Parity gate 覆盖以下用户可见范围：

- Global shell：`window-frame`、titlebar、window controls、resize handles、主题/语言同步、ToastStack、ContextMenuHost。
- Main navigation：SidebarNav、账号状态菜单、未读徽标、桌面左 rail 和窄屏底部栏。
- Workspace Selection：打开文件夹 hero card、最近工作区 grid、more/search dropdown、空状态、错误提示和背景光效。
- Chat：ChatSidebar、ChatHeader、MessagesList、ChatInput、MembersSidebar、会话菜单、emoji、mention、quick prompts、附件、所有聊天弹窗。
- Friends/Members/Invite：FriendsView、成员分组、状态菜单、联系人、邀请和成员管理流程。
- Terminal：TerminalWorkspace、TerminalPane、tab search、recent closed、drag/pin/activity、pane layouts、find overlay、xterm 区域和上下文菜单。
- Settings：设置侧栏、account/avatar、theme、language、members/terminal、notifications、keybinds、data maintenance。
- Skill Store/Plugin Marketplace：旧版 UI 壳、本地技能库能力和占位边界。
- Notification Preview：透明圆角悬浮预览窗、未读 item、打开终端、打开全部、忽略、查看全部。

## Product Scope

### MVP - Minimum Viable Product

MVP 是“能替代旧版核心日常工作”的现代化重建版。必须包含：本地工作区打开与最近工作区、工作区 registry 与只读 fallback、主窗口和工作区选择窗口、React 主界面 shell、聊天会话与消息、项目成员邀请、内置/自定义 CLI 终端会话、多窗口终端、基础 tab/pane、聊天到终端派发、终端输出回写、未读与通知、设置持久化、头像、技能本地库和项目链接、诊断基础能力、新数据 schema 与持久化、三平台 smoke。

MVP 还必须完成 Golutra UI and behavior parity。功能域可由新架构实现，但用户看到的窗口壳、页面结构、视觉系统、导航、弹窗、文案语义、状态反馈和占位边界必须按 `/Users/wdx/opc/golutra` 对齐。当前以功能域完成为准的 sprint 状态不能作为产品验收依据；产品发布必须等 parity gate 通过。

MVP 明确不以远程市场、完整 CEO Agent、移动端控制、无限智能体网络、自进化 Agent 为交付承诺。这些可以保留为愿景或后续增长方向，但不能挤占核心能力重建和架构稳定性。

### Growth Features (Post-MVP)

增长阶段可以强化差异化能力：工作流模板导入导出、真实插件/技能市场、`@all` 的明确并发派发策略、跨 CLI 任务编排视图、更强的任务状态与结果归档、终端语义解析、长期任务时间线、可视化调度、自动测试/构建结果聚合、团队共享配置和更细粒度权限。

增长阶段也应继续完善开发者生态：公开 typed IPC/CLI 协议、插件 API、技能包规范、模板仓库、数据维护工具和诊断导出包。

### Vision (Future)

长期愿景是把 `orchlet` 从多 AI CLI 工作区推进为长期运行的本地 AI 协作系统。系统可以持续管理多个智能体，按目标创建角色，协调任务、记忆、终端、文件和结果，并支持跨设备监控或迁移。这个愿景必须建立在可验证的本地可靠性、数据安全、终端稳定性和用户可控性之上，不能牺牲用户对本地项目和 CLI 的掌控权。

## User Journeys

### Journey 1: 独立开发者把一个需求拆给多个 AI CLI 并行执行

林越是一名独立开发者，正在维护一个复杂本地项目。他已经熟悉 Codex、Claude Code 和 Gemini CLI，但每天都要在多个终端之间复制上下文、查看输出、手动整理结果。打开 `orchlet` 后，他选择项目目录，系统识别或创建 `.orchlet` 工作区元数据，进入主界面并展示最近工作区、默认频道、成员和终端入口。

他邀请三个 AI CLI 成员：一个负责代码修改，一个负责测试，一个负责审查。系统创建项目成员，解析各 CLI 路径，启动或复用终端 session，并在聊天成员列表中展示状态。林越在群聊里提及其中两个成员，消息被写入本地聊天数据库并进入派发队列；目标终端收到派发文本，状态从 online 变为 working。

关键价值发生在他不再切换终端时：聊天里能看到消息状态，终端窗口里能看到实时输出，终端输出可以回写为聊天流，未读和通知能把他带回对应会话或终端。任务结束后，他从聊天历史、终端快照和状态记录中复盘结果。

该旅程揭示的能力：工作区打开、成员邀请、终端 session、聊天派发、mention 解析、消息状态、终端输出回写、未读通知、终端窗口复用、状态同步。

### Journey 2: 用户遇到 CLI 缺失、工作区只读或终端异常时完成恢复

周然在一台新机器上打开同一个项目。她希望快速进入工作区，但这台机器没有安装某个 CLI，项目目录也可能来自只读同步盘。系统打开工作区时发现 `.orchlet/workspace.json` 不可写，于是进入只读 fallback，并清晰提示哪些数据会写入 app data。她邀请成员时，系统发现 Claude Code 路径不存在，没有静默失败，而是给出可操作错误：缺失的命令、当前搜索路径、设置入口和重试动作。

稍后，某个终端 session 异常退出。周然从聊天成员头像打开对应终端，看到 session 已退出、退出原因和可恢复动作。她可以重启 session、保留聊天历史、重新派发失败消息，或进入诊断视图导出日志。

该旅程揭示的能力：只读工作区策略、app data fallback、CLI path 检测、错误提示、终端退出处理、重试派发、诊断日志、用户可恢复路径。

### Journey 3: 高强度用户管理多个工作区、通知和终端窗口

陈澈同时维护三个项目，并让不同 AI CLI 在后台运行。旧流程中，他经常漏看终端输出或找不到哪个工作区有新消息。使用 `orchlet` 后，每个工作区有独立 registry 和最近打开记录，同一个工作区不会被多个主窗口重复打开；终端窗口按 workspace 复用，tab 可以搜索、pin、拖拽并分配到不同 pane。

当后台成员输出新结果时，系统汇总未读并更新托盘状态。陈澈从托盘预览看到最多 6 条关键未读，可以打开全部未读、指定会话或指定成员终端。进入工作区后，主题、语言、快捷键、终端布局和最近关闭 tab 能保持稳定。

该旅程揭示的能力：workspace registry、多窗口去重、终端窗口复用、tab/pane 管理、托盘未读聚合、通知预览、跨窗口事件、设置持久化、最近关闭恢复。

### Journey 4: 维护者验证新架构能力清单和数据可靠性

苏敏负责新版发布。她不能只看新 UI 是否能跑，而要证明新版的工作区、聊天、成员、终端、通知、设置、技能、诊断和发布链路都能在新架构中稳定工作。系统不需要读取旧版 app data、旧 redb 或旧 `.golutra` 数据，但必须从第一版开始建立清晰的新 schema、存储清单、测试 fixtures 和失败报告。

发布前，她按 capability checklist 逐项验证：工作区、聊天、成员、终端、通知、设置、技能、新数据 schema、平台行为和发布脚本。每一项必须标记为通过、替代方案通过或明确放弃，并保留原因。发现旧版 `@all` 只是 TODO 时，她把它作为产品决策项，而不是误认为已实现。

该旅程揭示的能力：schema version、存储清单、数据完整性测试、capability checklist、明确放弃机制、发布前验收流程。

### Journey 5: 技能/插件作者接入本地自动化能力

孟岩希望把自己的提示词、脚本和工作流模板接入 `orchlet`。MVP 阶段，他先使用本地技能库导入文件夹，并把技能链接到当前 workspace 的 `.orchlet/skills`。系统通过 symlink 或平台等价机制把项目技能和全局技能库关联起来，并允许删除、打开和取消链接。

在增长阶段，孟岩希望通过公开契约接入更完整的插件能力：读取 workspace 上下文、声明命令、触发终端派发、接收诊断事件，但不能绕过权限和本地安全边界。系统需要提供清晰的 API/IPC 合约、权限模型、版本策略和调试工具。

该旅程揭示的能力：本地技能库、项目技能链接、插件/技能占位边界、未来扩展 API、权限与版本管理。

### Journey Requirements Summary

这些旅程共同要求 `orchlet` 具备以下能力集合：

- 工作区生命周期：打开目录、创建/读取 `.orchlet`、只读 fallback、最近工作区、路径移动/复制冲突、多窗口去重。
- AI 成员与聊天：成员邀请、联系人、群聊/私聊、mention、消息状态、未读、分页、emoji、附件、roadmap。
- 终端系统：CLI path 解析、PTY session、attach/write/resize/close、tab/pane/search/pin/drag、snapshot、ACK 流控、异常恢复。
- 编排闭环：聊天到终端派发、DND 跳过、working queue、去重、批量合并、终端输出回写聊天。
- 通知与导航：托盘未读聚合、预览窗口、打开会话、打开成员终端、忽略全部。
- 设置与个性化：账号、头像、主题、语言、通知、快捷键、终端路径、自定义 CLI、默认终端。
- 数据与持久化：SQLite、JSON app data、workspace data、头像库、skills symlink、schema version、schema 演进验证和数据完整性报告。
- 诊断与发布：前后端日志、snapshot audit、chat consistency、三平台 smoke、capabilities、构建/测试/发布脚本。
- 扩展边界：技能库和插件市场必须区分 MVP 本地能力、占位行为和未来远程生态。

## Domain-Specific Requirements

### Security & Privacy

`orchlet` 不属于医疗、金融或政府监管软件，但它处理本地源码、终端输入输出、AI CLI 交互和插件/技能文件，因此必须满足开发者工具领域的安全和隐私约束。

- 默认本地优先：源码路径、终端输出、聊天记录、设置、头像、技能和工作区元数据不得默认上传到远端服务。
- 用户数据归属清晰：用户通过 `orchlet` 调用 CLI 生成的代码和交付物归用户所有，PRD 和后续文档不得引入相反假设。
- 第三方 CLI 责任边界清晰：`orchlet` 是编排层，不承诺替代 Claude Code、Codex、Gemini CLI、OpenCode、Qwen 等工具自身的账号、计费或模型行为。
- 插件/技能生态必须有来源、权限和版本边界，不能让本地技能或插件绕过用户授权读取/修改项目。

### Technical Constraints

- 跨平台桌面必须覆盖 Windows、macOS、Linux，且平台差异要被封装在桌面 adapter 层：托盘、窗口装饰、路径、文件管理器打开、PTY、shell、权限、安装包和自动更新不能泄漏到业务层。
- 终端能力必须以稳定 PTY 生命周期为核心：create、attach、write、resize、close、exit、snapshot、ACK、flow control、scrollback、post-ready plan 和 shim ready 都要有明确状态机。
- IPC/event 契约必须集中定义并可测试，前端 React 功能模块不得直接散落调用 Tauri `invoke` 字符串。
- 本地持久化必须有 schema version 和 storage manifest：SQLite、JSON、头像文件、skills symlink、workspace registry 和 app cache 都要有 owner、路径、版本、schema 演进与回滚策略。
- 性能关键路径必须避免主线程阻塞：终端高频输出、聊天流式回写、通知头像渲染、搜索、历史分页和诊断日志都要有背压或批处理策略。
- AI CLI 输出必须被当作非可信输入处理：终端文本、文件路径、链接、ANSI 序列、插件命令和自动化脚本不得绕过 UI/系统权限边界。

### Integration Requirements

- CLI 集成：支持 Claude Code、Codex、Gemini CLI、OpenCode、Qwen、自定义 shell/custom CLI；CLI 缺失、路径错误、权限不足或启动失败必须给出可恢复错误。
- 工作区集成：对任意本地目录可打开、可写入 `.orchlet` 时使用 workspace-local 状态，不可写时使用 app data fallback。
- 终端/聊天集成：聊天消息、terminal session、conversation、member 和 outbox 必须通过稳定 ID 和映射表关联，避免聊天、终端、通知各自维护冲突状态。
- 技能集成：MVP 保留本地技能库导入、删除、打开和 workspace link/unlink；远程市场和插件安装必须作为后续明确设计，不得伪装成已完成能力。
- 诊断集成：前端事件、后端 session、chat consistency、snapshot triplet、terminal audit 和数据完整性报告必须能关联到 workspace、conversation、member、terminal session。

### Risk Mitigations

- **功能遗漏风险：** 用 capability checklist 作为发布门，不允许“重构完成但核心能力漏掉”。
- **架构误选风险：** PRD 只定义产品和验收，最终架构必须由联网技术研究与 `[CA] bmad-create-architecture` 基于最新主源资料确定。
- **性能退化风险：** 对启动、工作区打开、终端 attach、消息派发、输出渲染、历史分页和诊断导出设置可测目标，并在架构中指定性能测试方式。
- **数据损坏风险：** 新 schema 变更必须有版本、测试、报告和可恢复失败，不允许静默破坏本地数据。
- **终端不可控风险：** 明确 session 状态机、队列上限、DND 行为、重复消息去重、异常退出和资源限制提示。
- **插件/技能安全风险：** MVP 限制为本地文件能力；增长阶段引入插件 API 前必须先定义权限、来源验证、能力声明和撤销机制。

## Innovation & Novel Patterns

### Detected Innovation Areas

`orchlet` 的创新不在于单独发明聊天、终端或 AI coding agent，而在于把多个既有 AI CLI 组织成一个本地优先、跨平台、可观察、可恢复的协作层。它挑战的默认假设是：开发者必须在单个 Agent UI、单个 IDE、单个终端或多个手动终端之间选择。新版目标是保留每个 CLI 的原生能力，同时在其上建立统一的成员、聊天、派发、终端、通知、技能和诊断系统。

主要创新区域：

- **多 CLI 成员化：** 把 Claude Code、Codex、Gemini CLI、OpenCode、Qwen 和自定义 CLI 表示为可管理成员，而不是孤立进程。
- **聊天到终端的可追踪派发：** 用户从聊天表达意图，系统把消息路由到目标终端，并保留 conversation、sender、message、member、terminal session 的关联。
- **终端输出回写协作流：** 终端不只是显示器，也是聊天和通知系统的数据源。
- **本地优先的 Agent 编排：** 关键数据、终端会话和工作区元数据默认留在用户机器，远程能力必须显式设计。
- **能力清单驱动重建方法：** 用 capability checklist、IPC 契约、storage manifest 和数据完整性报告降低重建漏功能风险。

### Market Context & Competitive Landscape

市场正在从“AI 聊天辅助编程”转向“Agentic Development Environment”和“多 Agent/后台 Agent”。主源资料显示：

- OpenAI Codex CLI 是运行在本机终端的 coding agent，并提供 CLI、IDE 和 app 形态入口：<https://github.com/openai/codex>
- Claude Code 支持 subagents、独立上下文、工具权限和 agent teams 概念：<https://code.claude.com/docs/en/subagents>
- Cursor 文档提供 Background Agents 入口，说明 IDE 内后台 agent 已成为重要方向：<https://docs.cursor.com/background-agents>
- Warp 将 terminal 扩展为 Agentic Development Environment，并支持第三方 CLI agents：<https://docs.warp.dev/agent-platform/local-agents/overview/>

这些产品证明方向成立，但也留下 `orchlet` 的空间：它不要求用户迁移到某一个 IDE、某一个终端或某一个模型供应商，而是作为本地跨 CLI 协作和调度层存在。竞争重点不是“谁有一个 Agent”，而是“谁能可靠管理多个异构 Agent 的长期工作状态、终端会话、输出归档和用户控制权”。

### Validation Approach

创新假设必须通过可运行闭环验证：

1. 单工作区中同时启动至少三个不同 CLI 类型或 shell/custom CLI 成员。
2. 群聊 mention 派发到指定成员，非目标成员不接收。
3. 终端输出能以实时终端渲染和聊天回写两种方式被观察。
4. 用户可以从通知预览回到对应会话或终端。
5. 关闭/重开窗口后，工作区、聊天、成员、终端映射和最近状态不出现冲突。
6. CLI 缺失、DND、working queue、终端退出和只读工作区都有明确恢复路径。

如果这些闭环失败，产品差异化就不成立；如果这些闭环成立，再推进模板、插件、CEO Agent、长期无人托管等更高层能力。

### Risk Mitigation

- **创新过度风险：** MVP 只承诺多 CLI 本地协作闭环，不承诺全自动 CEO Agent。
- **同质化风险：** 不与 Cursor/Warp/Claude Code/Codex 在单点 Agent 能力上正面重复，聚焦跨 CLI 编排、工作区状态和本地数据控制。
- **可靠性风险：** 任何 agentic 能力必须有用户可见状态、可取消路径、诊断日志和恢复策略。
- **供应商变化风险：** 不依赖某个 CLI 的私有实现；通过 configurable terminal type、custom CLI 和 adapter 层吸收外部工具变化。
- **隐私信任风险：** 默认本地优先，远程能力和 LLM provider 数据流必须显式说明、显式开关。

## Desktop App Specific Requirements

### Project-Type Overview

`orchlet` 是跨平台桌面应用，同时具备开发者工具和本地自动化系统属性。产品必须以桌面原生能力为核心，而不是把 Web SaaS 包进壳里：它需要访问本地目录、启动和管理 PTY 进程、复用系统终端能力、处理托盘和多窗口、持久化本地数据、响应系统主题/语言、打开文件管理器并在三平台保持一致行为。

前端方向明确为 React，不使用 Vue。后端语言、桌面容器、数据库、IPC 生成方案和构建工具可以在后续技术研究与架构设计中重新选择；PRD 层面的硬约束是跨平台、高性能、本地优先、可测试、核心能力不遗漏。

### Technical Architecture Considerations

- 桌面壳必须支持 Windows、macOS、Linux，且能稳定提供多窗口、托盘、通知预览、文件系统访问、shell/PTY、窗口生命周期和系统菜单/上下文菜单能力。
- React 前端必须按 feature/entity/shared 或等价分层组织，业务 feature 不得直接依赖桌面 IPC 字符串；所有系统调用通过 typed API client 进入。
- 后端必须承载本地系统能力和高频 I/O，不应把终端流控、数据库 schema 演进、文件系统权限和诊断日志压到前端主线程。
- IPC、event、window mode、storage schema 必须先契约化，再实现 UI；契约是新架构一致性的核心。
- 终端输出、聊天流、通知、诊断和历史分页需要背压、批处理或 worker 隔离，避免 UI 卡顿。
- 架构阶段必须评估候选技术栈的实际约束，包括 Tauri/Rust、React 构建链、xterm 渲染、SQLite 或替代存储、类型生成、测试框架、自动更新和安装包。

### Platform Support

- **Windows:** 支持无边框窗口、圆角/阴影规避、托盘、PTY/shell 路径差异、PowerShell/CMD/custom CLI、安装包和路径编码。
- **macOS:** 支持 titlebar overlay、系统主题、权限提示、app bundle、文件访问、shell 环境加载和签名/公证后续要求。
- **Linux:** 支持常见桌面环境窗口行为、托盘兼容性、xdg-open、shell/PTY、AppImage/deb/rpm 或架构阶段确定的发布格式。
- 三平台必须有最小 smoke：启动应用、打开工作区、创建成员、启动 shell、发送消息、终端输出、通知跳转、关闭重开恢复。

### System Integration

- 工作区目录选择与最近工作区必须使用桌面安全边界封装，前端不拼接任意真实路径执行系统操作。
- 文件管理器打开、剪贴板、托盘、通知、窗口控制、主题语言同步和系统菜单必须通过平台 adapter 暴露。
- 终端环境探测必须能识别内置 CLI、用户配置路径和 custom CLI，并在失败时说明缺失项和修复入口。
- 多窗口模式至少包括主窗口、工作区选择窗口、终端窗口、通知预览窗口；跨窗口事件必须有命名契约和 payload 类型。
- 快捷键、上下文菜单和 IME 行为必须不破坏终端输入和聊天输入。

### Update Strategy

MVP 可以先不启用自动更新，但必须在架构中预留版本检查、schema 兼容和发布渠道策略。若启用自动更新，必须满足：

- 更新前能识别当前数据 schema version，并在需要 schema 升级时先执行验证或备份。
- 更新失败不能损坏工作区和聊天数据。
- 三平台发布包、签名、公证、权限和 capabilities 要纳入发布清单。
- 版本说明必须区分功能变化、数据/schema 变化、安全变化和破坏性变化。

### Offline Capabilities

`orchlet` 必须默认离线可用。打开工作区、读取历史聊天、查看终端快照、管理本地技能、修改设置、运行本地 shell/custom CLI 和查看诊断日志不应依赖网络。

需要网络的能力必须显式分层：第三方 AI CLI 自身联网、远程模型调用、未来插件市场、模板下载、更新检查或遥测都不能成为核心本地闭环的前置条件。若未来引入云能力，必须提供开关、数据流说明和失败降级路径。

### Implementation Considerations

- 先实现 contract fixtures 和 smoke，再实现 UI 大模块。
- 桌面 shell 和终端引擎是最高风险模块，应优先验证。
- 旧版 Vue store 逻辑不得原样搬迁到 React；需要拆出 use case/service/repository。
- MVP 不做移动端，不做 Web SEO，不做营销站式页面。
- 所有外部 CLI 集成都要以 adapter/config 方式进入，避免供应商特定逻辑散落在 UI。

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** 核心能力现代化重建 MVP。目标不是推出更炫的新功能，而是用 React 和新版架构稳定替代旧版核心使用场景，同时建立可继续扩展的契约、数据和终端基础。

**Resource Requirements:** MVP 至少需要覆盖以下能力的工程角色或等价能力：React 前端与桌面 UI、Rust/系统后端或最终架构选定的本地后端、PTY/终端工程、本地数据库和 schema 治理、跨平台桌面发布、自动化测试与诊断。若团队规模较小，应优先减少 UI 重画范围，而不是削减工作区、聊天、终端、持久化和通知闭环。

本 PRD 使用 phased delivery，因为现有重建文档已经给出 Phase 0 到 Phase 6 的现代化蓝图，且 README 中的 CEO Agent、无限 Agent 网络、移动远控等能力被明确描述为后续发展，而不是当前代码已实现功能。旧版已验证有价值或文档列入 capability checklist 的核心能力默认属于 MVP，除非在后续产品决策中明确放弃并记录原因。

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- 打开本地工作区，创建或读取 `.orchlet`，进入主界面。
- 邀请 AI CLI 成员，启动或复用终端 session。
- 在聊天中发送消息，按 mention 派发到目标终端。
- 观察终端实时输出，并将终端结果回写到聊天或聊天流。
- 通过通知、成员头像或会话回到对应终端。
- 在 CLI 缺失、只读工作区、终端退出、窗口重开和数据写入失败场景中恢复。
- 使用本地技能库和项目技能链接。
- 在三平台完成核心 smoke 和 capability checklist 验收。

**Must-Have Capabilities:**

- React 应用 shell：主窗口、工作区选择窗口、终端窗口、通知预览窗口。
- 工作区：打开目录、recent list、workspace registry、只读 fallback、路径移动/复制冲突、文件管理器打开。
- 聊天：会话列表、默认频道、私聊/群聊、消息发送、分页、状态、pin/mute/rename/clear/delete、未读、emoji、mention、附件展示基础。
- 成员：owner 自动补齐、assistant/member 邀请、联系人基础、成员状态、改名、提及、私信、打开终端。
- 终端：PTY create/attach/write/resize/close、terminal type/path 解析、自定义 CLI、tab、search、pin、基础 pane、xterm 渲染、snapshot、ACK 流控、异常退出处理。
- 编排：`chat_send_message_and_dispatch` 等价能力、mentions 到目标终端解析、DND 跳过、working queue、message id 去重、终端输出回写。
- 通知：未读聚合、托盘图标/预览、打开全部未读、打开指定会话、打开发送者终端、忽略全部。
- 设置：账户、头像、主题、语言、通知、快捷键、终端路径、自定义终端、默认终端、chat streamOutput、数据修复和清空。
- 技能：本地技能库导入/删除/打开、workspace `.orchlet/skills` link/unlink。
- 数据基础：`.orchlet/workspace.json`、SQLite 聊天库、global settings、recent workspaces、workspace registry、头像库、contacts、storage manifest 和 schema validation report。
- 平台与发布：Windows/macOS/Linux smoke、最小 Tauri capabilities 或最终平台权限模型、build/test/lint/preview 脚本。

### Development Sequence

**Phase 0 (Before MVP Implementation): Technical Research & Architecture**

- 执行 `[TR] bmad-technical-research`，联网确认 React、Tauri/Rust 或替代方案、构建工具、Tailwind、xterm、数据库、类型生成、测试和发布栈。
- 执行 `[CA] bmad-create-architecture`，定新版架构、目录结构、IPC/event 契约、storage manifest、schema 策略、性能测试策略和模块边界。
- 生成 contract fixtures、数据样例和 smoke 测试计划。

**Phase 2 (Post-MVP Growth)**

- 完整工作流模板导入导出。
- 真实技能/插件市场和插件 API。
- 明确实现或明确放弃 `@all` 多终端派发。
- 跨 CLI 任务编排视图、任务时间线、结果归档。
- 更完整的终端语义解析和自动测试/构建输出聚合。
- 团队共享配置、更细粒度权限和诊断导出包。

**Phase 3 (Vision Expansion)**

- CEO Agent 顶层调度。
- 长期无人托管任务运行。
- 动态子 Agent 创建和角色分工。
- 跨设备/跨环境迁移。
- 移动端远程监控和干预。
- 统一 Agent 接口和更完整的自组织智能体网络。

### Risk Mitigation Strategy

**Technical Risks:** 最大风险是终端引擎、聊天派发、跨窗口事件、本地数据一致性和跨平台发布互相耦合。缓解方式是先冻结契约和数据 fixtures，再实现 UI；高频 I/O 和系统能力放入后端/worker；所有核心路径有 smoke 和契约测试。

**Market Risks:** 市场已有 Codex CLI、Claude Code、Cursor Background Agents、Warp Agents 等产品。`orchlet` 的验证重点是跨 CLI 编排和本地工作区控制，而不是单点 Agent 能力。MVP 必须证明用户愿意用它管理多个已有 CLI。

**Resource Risks:** 如果资源不足，不削减工作区、聊天、终端、派发、通知、本地持久化这些核心闭环；优先削减视觉重设计、远程市场、插件生态、复杂模板、CEO Agent、移动端和长期无人托管。

## Functional Requirements

### Workspace & App Shell

- FR1: 用户可以打开任意本地目录作为工作区。
- FR2: 系统可以为工作区创建、读取和更新项目元数据。
- FR3: 系统可以在工作区不可写时进入只读模式并使用本地应用数据保存必要状态。
- FR4: 用户可以查看、搜索和重新打开最近工作区。
- FR5: 系统可以检测同一工作区或同一项目标识被多个路径打开的冲突，并让用户选择移动或复制语义。
- FR6: 系统可以阻止同一工作区在多个主窗口中重复打开。
- FR7: 用户可以从应用中打开工作区所在的系统文件管理器。
- FR8: 用户可以在主窗口、工作区选择窗口、终端窗口和通知预览窗口之间完成对应任务。
- FR9: 系统可以在多个窗口之间同步工作区上下文、主题、语言和必要导航事件。

### Members, Contacts & Invitations

- FR10: 系统可以为每个工作区自动补齐默认 owner 成员。
- FR11: 用户可以邀请 assistant 或 member 类型成员加入当前工作区。
- FR12: 用户可以为邀请的成员选择内置 AI CLI、自定义 CLI 或 shell 类型。
- FR13: 用户可以一次邀请多个成员实例，并保留实例数量、权限和隔离标记。
- FR14: 用户可以创建、查看、管理和删除全局联系人。
- FR15: 用户可以从成员或联系人发起私聊。
- FR16: 用户可以查看和修改成员名称、状态和基础资料。
- FR17: 用户可以从成员入口提及成员、打开成员终端或移除成员。
- FR18: 系统可以区分项目成员邀请和管理员/联系人邀请。

### Conversations & Messaging

- FR19: 用户可以在每个工作区使用默认频道。
- FR20: 用户可以创建群聊并管理群聊成员。
- FR21: 用户可以创建或复用与成员的私聊会话。
- FR22: 用户可以查看会话列表，并根据置顶、时间线和未读状态区分会话。
- FR23: 用户可以发送文本消息并查看消息发送状态。
- FR24: 用户可以分页加载历史消息。
- FR25: 用户可以对会话进行置顶、静音、重命名、清空和删除。
- FR26: 系统可以维护会话未读计数和已读位置。
- FR27: 用户可以在消息中提及指定成员。
- FR28: 系统可以对 `@all` 行为提供明确实现或明确的产品放弃记录。
- FR29: 用户可以使用 emoji 搜索和最近使用记录。
- FR30: 用户可以查看图片附件和 roadmap 附件入口。
- FR31: 用户可以使用快捷提示生成或插入常用协作消息。
- FR32: 系统可以把终端输出作为聊天消息或聊天流显示。

### Terminal Workspace

- FR33: 用户可以为工作区打开或复用独立终端窗口。
- FR34: 用户可以创建、关闭、恢复和搜索终端 tab。
- FR35: 用户可以固定、排序和移动终端 tab。
- FR36: 用户可以在单 pane、左右分屏、上下分屏和 2x2 布局中组织终端。
- FR37: 用户可以把终端 tab 分配到不同 pane。
- FR38: 用户可以在终端中输入、选择、复制、清除和查找文本。
- FR39: 用户可以设置终端查找选项。
- FR40: 系统可以创建、附加、写入、调整大小和关闭终端会话。
- FR41: 系统可以列出可用终端环境并解析用户配置的 CLI 路径。
- FR42: 系统可以为终端会话维护状态、快照和退出原因。
- FR43: 系统可以在窗口重开或 tab attach 时恢复终端可观察状态。
- FR44: 系统可以在终端资源受限或启动失败时给出可恢复提示。

### Agent Orchestration & Notifications

- FR45: 用户可以从聊天消息向指定成员终端派发任务。
- FR46: 系统可以根据 mention、成员状态和会话上下文确定派发目标。
- FR47: 系统可以在成员免打扰时跳过派发并保留用户可见状态。
- FR48: 系统可以在成员忙碌时排队派发，并在可用后继续处理。
- FR49: 系统可以识别重复消息并避免重复派发。
- FR50: 系统可以合并同上下文的连续派发。
- FR51: 系统可以将终端输出、终端状态和消息状态同步回聊天与成员视图。
- FR52: 系统可以聚合当前窗口和工作区未读状态。
- FR53: 用户可以从通知预览打开全部未读、指定会话或指定成员终端。
- FR54: 用户可以忽略全部未读通知。

### Skills, Plugins & Roadmap

- FR55: 用户可以导入本地技能文件夹到应用技能库。
- FR56: 用户可以删除和打开本地技能文件夹。
- FR57: 用户可以把应用技能库中的技能链接到当前工作区。
- FR58: 用户可以取消工作区技能链接。
- FR59: 系统可以列出当前工作区已链接技能。
- FR60: 系统可以明确区分本地技能能力、技能商店占位能力和未来远程插件能力。
- FR61: 用户可以创建、编辑、删除和查看路线图任务。
- FR62: 用户可以设置路线图目标、任务状态和完成进度。

### Settings & Personalization

- FR63: 用户可以配置显示名称、时区、状态、状态消息和头像。
- FR64: 用户可以上传、删除、重置或选择预设头像。
- FR65: 用户可以选择主题和语言。
- FR66: 用户可以配置桌面通知、声音、仅提及、预览和免打扰时间。
- FR67: 用户可以启用、禁用和查看快捷键配置。
- FR68: 用户可以配置内置 CLI 路径、自定义成员、自定义终端和默认终端。
- FR69: 用户可以配置聊天终端输出流展示偏好。
- FR70: 用户可以触发聊天数据修复。
- FR71: 用户可以清空当前工作区聊天数据。

### Data, Schema, Diagnostics & Release Support

- FR72: 系统可以持久化全局设置、全局数据、联系人、最近工作区、工作区 registry、头像库、工作区项目数据、聊天数据、技能库和会话缓存。
- FR73: 系统可以创建和维护新版 `.orchlet` 工作区数据、SQLite 聊天数据、设置数据、头像库、联系人、技能链接和最近工作区。
- FR74: 系统可以执行 schema validation 并生成数据完整性报告。
- FR75: 系统可以为关键数据类型记录 schema version 或等价版本信息。
- FR76: 系统可以记录前端事件、后端事件、终端 session、会话、成员、窗口和诊断 run。
- FR77: 系统可以记录终端快照一致性和聊天一致性诊断。
- FR78: 用户可以查看或导出用于问题排查的诊断信息。
- FR79: 系统可以区分已实现功能、替代实现、占位功能和明确放弃功能。
- FR80: 系统必须维护 Golutra UI and behavior parity gate，记录每个参考屏幕、窗口模式、核心交互和用户可见功能的通过、批准例外或明确放弃状态。

## Non-Functional Requirements

### Performance

- NFR1: 已有本地工作区进入主界面的目标 P95 不超过 3 秒，不包含用户选择目录时间。
- NFR2: 创建或复用终端会话的目标 P95 不超过 2 秒；外部 CLI 缺失或失败时不计入成功延迟，但必须返回可操作错误。
- NFR3: 聊天消息写入本地存储并进入派发队列的目标 P95 不超过 300ms。
- NFR4: 终端高频输出不得阻塞聊天输入、窗口切换、通知交互和终端输入。
- NFR5: 终端输出在高负载下必须保持有序可观察；允许批处理渲染，但不允许丢失关键输出或破坏 attach 后快照一致性。
- NFR6: 通知预览、未读聚合和托盘状态更新不得显著影响终端输出渲染或聊天输入。
- NFR7: schema validation、诊断导出和历史消息分页必须可中断或分批执行，避免长时间冻结主界面。

### Reliability & Data Integrity

- NFR8: 工作区、聊天、设置、头像、技能和 registry 数据写入失败时必须返回错误或进入可恢复 fallback，不得静默丢失。
- NFR9: schema 变更必须支持验证、备份或等价安全机制、结果报告和失败项定位。
- NFR10: 任何 schema 变更必须有版本标识和迁移路径。
- NFR11: 终端 session 退出、窗口关闭、应用重启和派发失败必须进入可解释状态。
- NFR12: DND、working queue、重复消息、批量合并和异常退出不得造成消息无限重复派发。
- NFR13: 最近工作区和 workspace registry 冲突处理必须保持 project id 与路径关系可解释。

### Security & Privacy

- NFR14: 默认不上传用户源码、终端输出、聊天记录、工作区路径、头像、技能内容或诊断日志。
- NFR15: 需要网络的能力必须有明确用户意图、配置入口或外部 CLI 自身行为说明。
- NFR16: 系统不得把 AI CLI 输出当作可信指令自动执行，除非用户显式触发对应动作。
- NFR17: 插件和技能能力必须受来源、权限和工作区边界约束。
- NFR18: 诊断导出必须避免无提示泄露敏感路径、token、环境变量或私有源码片段；若无法自动脱敏，必须提示用户。
- NFR19: 桌面 capabilities 或等价权限配置必须按最小权限原则维护。

### Cross-Platform Compatibility

- NFR20: Windows、macOS、Linux 必须均通过核心 smoke：启动、打开工作区、启动 shell、发送消息、终端输出、通知跳转、关闭重开恢复。
- NFR21: 平台差异必须封装在平台 adapter 或等价边界内，业务能力不得依赖散落的平台判断。
- NFR22: 无边框窗口、托盘、文件管理器打开、PTY、shell 路径、剪贴板和系统主题必须有平台行为说明。
- NFR23: 平台不支持某能力时必须提供降级行为或明确不可用提示。

### Integration & Compatibility

- NFR24: 外部 CLI 集成必须允许路径配置、存在性检测、启动失败诊断和 custom CLI 扩展。
- NFR25: 系统不得依赖某个 AI CLI 的私有输出格式才能完成核心工作区、聊天和终端能力。
- NFR26: IPC command、event、window mode 和 payload 必须有集中契约和契约测试。
- NFR27: 新版数据 schema 和 storage manifest 必须覆盖 app data、workspace data、chat 数据、头像库、skills 和 registry。
- NFR28: 技能 link/unlink 必须处理 symlink 不可用或权限不足的平台差异。

### Accessibility & Usability

- NFR29: 核心交互必须可键盘操作，包括聊天输入、会话切换、终端查找、设置保存和通知处理。
- NFR30: 主题和语言切换必须在主窗口和子窗口中保持一致。
- NFR31: 错误提示必须说明发生了什么、影响范围和下一步可执行动作。
- NFR32: 终端和聊天中的文本不得因布局变化而遮挡核心操作。
- NFR33: 应用必须避免营销式落地页作为主入口；打开后优先进入可用工作区体验。

### Maintainability & Testability

- NFR34: 新版不得原样迁移旧版过重 store 和大型组件结构；业务副作用、领域状态、IPC、持久化和 UI 状态必须有明确边界。
- NFR35: 每个核心能力域必须能追溯到 FR、契约、测试或 capability checklist 项。
- NFR36: 核心 IPC payload、storage schema 和 schema fixtures 必须可被自动化测试使用。
- NFR37: 关键端到端路径至少覆盖打开工作区、邀请成员、发送消息到终端、终端输出回写、通知跳转和重启恢复。
- NFR38: 代码结构必须支持后续 `[CA] bmad-create-architecture` 输出的模块边界和责任划分。

### Observability & Diagnostics

- NFR39: 系统必须能关联 workspace、conversation、message、member、terminal session、window 和 diagnostics run。
- NFR40: 终端快照一致性、聊天一致性、派发状态和数据完整性检查结果必须有可查询诊断记录。
- NFR41: 调试日志必须可按调试开关启用，默认不产生高噪声或高敏感输出。
- NFR42: 用户可导出的诊断包必须足以支持问题定位，同时遵守隐私和脱敏要求。

### Release

- NFR43: 发布前必须完成三平台 smoke 和 MVP capability checklist。
- NFR44: 发布说明必须区分功能变化、数据/schema 变化、破坏性变化、安全变化和已知问题。
- NFR45: 发布前必须完成 Golutra parity screenshot baseline、React current screenshot、交互 smoke 和人工验收记录；未经批准的视觉、流程、文案或功能偏差均为 release blocker。
