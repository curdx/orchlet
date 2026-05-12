---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/research/technical-react-cross-platform-desktop-ai-cli-orchestration-architecture-research-2026-05-11.md
workflowType: 'epics-and-stories'
project_name: 'orchlet'
user_name: '王定旭'
date: '2026-05-11'
status: 'complete'
classification:
  projectType: desktop_app
  domain: developer_productivity_ai_orchestration
  frontendRequirement: React
  frontendExclusion: Vue
  platformRequirement: Windows_macOS_Linux
  dataCompatibility: greenfield_new_schema_no_legacy_migration
---

# orchlet - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for orchlet, decomposing the requirements from the PRD and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: 用户可以打开任意本地目录作为工作区。
FR2: 系统可以为工作区创建、读取和更新项目元数据。
FR3: 系统可以在工作区不可写时进入只读模式并使用本地应用数据保存必要状态。
FR4: 用户可以查看、搜索和重新打开最近工作区。
FR5: 系统可以检测同一工作区或同一项目标识被多个路径打开的冲突，并让用户选择移动或复制语义。
FR6: 系统可以阻止同一工作区在多个主窗口中重复打开。
FR7: 用户可以从应用中打开工作区所在的系统文件管理器。
FR8: 用户可以在主窗口、工作区选择窗口、终端窗口和通知预览窗口之间完成对应任务。
FR9: 系统可以在多个窗口之间同步工作区上下文、主题、语言和必要导航事件。
FR10: 系统可以为每个工作区自动补齐默认 owner 成员。
FR11: 用户可以邀请 assistant 或 member 类型成员加入当前工作区。
FR12: 用户可以为邀请的成员选择内置 AI CLI、自定义 CLI 或 shell 类型。
FR13: 用户可以一次邀请多个成员实例，并保留实例数量、权限和隔离标记。
FR14: 用户可以创建、查看、管理和删除全局联系人。
FR15: 用户可以从成员或联系人发起私聊。
FR16: 用户可以查看和修改成员名称、状态和基础资料。
FR17: 用户可以从成员入口提及成员、打开成员终端或移除成员。
FR18: 系统可以区分项目成员邀请和管理员/联系人邀请。
FR19: 用户可以在每个工作区使用默认频道。
FR20: 用户可以创建群聊并管理群聊成员。
FR21: 用户可以创建或复用与成员的私聊会话。
FR22: 用户可以查看会话列表，并根据置顶、时间线和未读状态区分会话。
FR23: 用户可以发送文本消息并查看消息发送状态。
FR24: 用户可以分页加载历史消息。
FR25: 用户可以对会话进行置顶、静音、重命名、清空和删除。
FR26: 系统可以维护会话未读计数和已读位置。
FR27: 用户可以在消息中提及指定成员。
FR28: 系统可以对 `@all` 行为提供明确实现或明确的产品放弃记录。
FR29: 用户可以使用 emoji 搜索和最近使用记录。
FR30: 用户可以查看图片附件和 roadmap 附件入口。
FR31: 用户可以使用快捷提示生成或插入常用协作消息。
FR32: 系统可以把终端输出作为聊天消息或聊天流显示。
FR33: 用户可以为工作区打开或复用独立终端窗口。
FR34: 用户可以创建、关闭、恢复和搜索终端 tab。
FR35: 用户可以固定、排序和移动终端 tab。
FR36: 用户可以在单 pane、左右分屏、上下分屏和 2x2 布局中组织终端。
FR37: 用户可以把终端 tab 分配到不同 pane。
FR38: 用户可以在终端中输入、选择、复制、清除和查找文本。
FR39: 用户可以设置终端查找选项。
FR40: 系统可以创建、附加、写入、调整大小和关闭终端会话。
FR41: 系统可以列出可用终端环境并解析用户配置的 CLI 路径。
FR42: 系统可以为终端会话维护状态、快照和退出原因。
FR43: 系统可以在窗口重开或 tab attach 时恢复终端可观察状态。
FR44: 系统可以在终端资源受限或启动失败时给出可恢复提示。
FR45: 用户可以从聊天消息向指定成员终端派发任务。
FR46: 系统可以根据 mention、成员状态和会话上下文确定派发目标。
FR47: 系统可以在成员免打扰时跳过派发并保留用户可见状态。
FR48: 系统可以在成员忙碌时排队派发，并在可用后继续处理。
FR49: 系统可以识别重复消息并避免重复派发。
FR50: 系统可以合并同上下文的连续派发。
FR51: 系统可以将终端输出、终端状态和消息状态同步回聊天与成员视图。
FR52: 系统可以聚合当前窗口和工作区未读状态。
FR53: 用户可以从通知预览打开全部未读、指定会话或指定成员终端。
FR54: 用户可以忽略全部未读通知。
FR55: 用户可以导入本地技能文件夹到应用技能库。
FR56: 用户可以删除和打开本地技能文件夹。
FR57: 用户可以把应用技能库中的技能链接到当前工作区。
FR58: 用户可以取消工作区技能链接。
FR59: 系统可以列出当前工作区已链接技能。
FR60: 系统可以明确区分本地技能能力、技能商店占位能力和未来远程插件能力。
FR61: 用户可以创建、编辑、删除和查看路线图任务。
FR62: 用户可以设置路线图目标、任务状态和完成进度。
FR63: 用户可以配置显示名称、时区、状态、状态消息和头像。
FR64: 用户可以上传、删除、重置或选择预设头像。
FR65: 用户可以选择主题和语言。
FR66: 用户可以配置桌面通知、声音、仅提及、预览和免打扰时间。
FR67: 用户可以启用、禁用和查看快捷键配置。
FR68: 用户可以配置内置 CLI 路径、自定义成员、自定义终端和默认终端。
FR69: 用户可以配置聊天终端输出流展示偏好。
FR70: 用户可以触发聊天数据修复。
FR71: 用户可以清空当前工作区聊天数据。
FR72: 系统可以持久化全局设置、全局数据、联系人、最近工作区、工作区 registry、头像库、工作区项目数据、聊天数据、技能库和会话缓存。
FR73: 系统可以创建和维护新版 `.orchlet` 工作区数据、SQLite 聊天数据、设置数据、头像库、联系人、技能链接和最近工作区。
FR74: 系统可以执行 schema validation 并生成数据完整性报告。
FR75: 系统可以为关键数据类型记录 schema version 或等价版本信息。
FR76: 系统可以记录前端事件、后端事件、终端 session、会话、成员、窗口和诊断 run。
FR77: 系统可以记录终端快照一致性和聊天一致性诊断。
FR78: 用户可以查看或导出用于问题排查的诊断信息。
FR79: 系统可以区分已实现功能、替代实现、占位功能和明确放弃功能。

### NonFunctional Requirements

NFR1: 已有本地工作区进入主界面的目标 P95 不超过 3 秒，不包含用户选择目录时间。
NFR2: 创建或复用终端会话的目标 P95 不超过 2 秒；外部 CLI 缺失或失败时不计入成功延迟，但必须返回可操作错误。
NFR3: 聊天消息写入本地存储并进入派发队列的目标 P95 不超过 300ms。
NFR4: 终端高频输出不得阻塞聊天输入、窗口切换、通知交互和终端输入。
NFR5: 终端输出在高负载下必须保持有序可观察；允许批处理渲染，但不允许丢失关键输出或破坏 attach 后快照一致性。
NFR6: 通知预览、未读聚合和托盘状态更新不得显著影响终端输出渲染或聊天输入。
NFR7: schema validation、诊断导出和历史消息分页必须可中断或分批执行，避免长时间冻结主界面。
NFR8: 工作区、聊天、设置、头像、技能和 registry 数据写入失败时必须返回错误或进入可恢复 fallback，不得静默丢失。
NFR9: schema 变更必须支持验证、备份或等价安全机制、结果报告和失败项定位。
NFR10: 任何 schema 变更必须有版本标识和迁移路径。
NFR11: 终端 session 退出、窗口关闭、应用重启和派发失败必须进入可解释状态。
NFR12: DND、working queue、重复消息、批量合并和异常退出不得造成消息无限重复派发。
NFR13: 最近工作区和 workspace registry 冲突处理必须保持 project id 与路径关系可解释。
NFR14: 默认不上传用户源码、终端输出、聊天记录、工作区路径、头像、技能内容或诊断日志。
NFR15: 需要网络的能力必须有明确用户意图、配置入口或外部 CLI 自身行为说明。
NFR16: 系统不得把 AI CLI 输出当作可信指令自动执行，除非用户显式触发对应动作。
NFR17: 插件和技能能力必须受来源、权限和工作区边界约束。
NFR18: 诊断导出必须避免无提示泄露敏感路径、token、环境变量或私有源码片段；若无法自动脱敏，必须提示用户。
NFR19: 桌面 capabilities 或等价权限配置必须按最小权限原则维护。
NFR20: Windows、macOS、Linux 必须均通过核心 smoke：启动、打开工作区、启动 shell、发送消息、终端输出、通知跳转、关闭重开恢复。
NFR21: 平台差异必须封装在平台 adapter 或等价边界内，业务能力不得依赖散落的平台判断。
NFR22: 无边框窗口、托盘、文件管理器打开、PTY、shell 路径、剪贴板和系统主题必须有平台行为说明。
NFR23: 平台不支持某能力时必须提供降级行为或明确不可用提示。
NFR24: 外部 CLI 集成必须允许路径配置、存在性检测、启动失败诊断和 custom CLI 扩展。
NFR25: 系统不得依赖某个 AI CLI 的私有输出格式才能完成核心工作区、聊天和终端能力。
NFR26: IPC command、event、window mode 和 payload 必须有集中契约和契约测试。
NFR27: 新版数据 schema 和 storage manifest 必须覆盖 app data、workspace data、chat 数据、头像库、skills 和 registry。
NFR28: 技能 link/unlink 必须处理 symlink 不可用或权限不足的平台差异。
NFR29: 核心交互必须可键盘操作，包括聊天输入、会话切换、终端查找、设置保存和通知处理。
NFR30: 主题和语言切换必须在主窗口和子窗口中保持一致。
NFR31: 错误提示必须说明发生了什么、影响范围和下一步可执行动作。
NFR32: 终端和聊天中的文本不得因布局变化而遮挡核心操作。
NFR33: 应用必须避免营销式落地页作为主入口；打开后优先进入可用工作区体验。
NFR34: 新版不得原样迁移旧版过重 store 和大型组件结构；业务副作用、领域状态、IPC、持久化和 UI 状态必须有明确边界。
NFR35: 每个核心能力域必须能追溯到 FR、契约、测试或 capability checklist 项。
NFR36: 核心 IPC payload、storage schema 和 schema fixtures 必须可被自动化测试使用。
NFR37: 关键端到端路径至少覆盖打开工作区、邀请成员、发送消息到终端、终端输出回写、通知跳转和重启恢复。
NFR38: 代码结构必须支持后续 `[CA] bmad-create-architecture` 输出的模块边界和责任划分。
NFR39: 系统必须能关联 workspace、conversation、message、member、terminal session、window 和 diagnostics run。
NFR40: 终端快照一致性、聊天一致性、派发状态和数据完整性检查结果必须有可查询诊断记录。
NFR41: 调试日志必须可按调试开关启用，默认不产生高噪声或高敏感输出。
NFR42: 用户可导出的诊断包必须足以支持问题定位，同时遵守隐私和脱敏要求。
NFR43: 发布前必须完成三平台 smoke 和 MVP capability checklist。
NFR44: 发布说明必须区分功能变化、数据/schema 变化、破坏性变化、安全变化和已知问题。

### Additional Requirements

- Epic 1 Story 1 must initialize the project using the official Tauri React TypeScript starter:

```bash
pnpm create tauri-app orchlet --template react-ts --manager pnpm --identifier com.orchlet.app --tauri-version 2
```

- Use React + TypeScript + Vite + Tailwind CSS v4 for UI implementation; Vue is excluded.
- Use `lucide-react` for app icons; icon-only buttons must have `aria-label` and tooltip.
- Use Tauri 2 + Rust as the desktop/runtime foundation unless a terminal-heavy WebView smoke test proves it unfit.
- Use SQLite/rusqlite as the only MVP structured durable data path; do not add redb or old-data compatibility.
- Use `.orchlet/workspace.json` and a new SQLite schema; old `.golutra` and old app data are external historical data and not read by default.
- Implement `src/shared/api` as the only frontend layer that can call Tauri; feature code must not call raw `invoke`.
- Implement Rust DTOs in `src-tauri/src/contracts`, export TypeScript types through `ts-rs`, and keep contract fixtures.
- Split Tauri command gateway, app use cases, domain services, infrastructure adapters, contracts and workers as defined in Architecture.
- Implement Tauri capabilities by window mode: main, terminal, workspace-selection and notification-preview.
- Terminal sessions must be Rust-owned using portable-pty or validated equivalent; xterm.js only renders UI.
- Terminal stream payloads must include schema version, session id, sequence, chunk kind and emitted timestamp.
- Terminal output must bypass React state and write through renderer adapters with batching/backpressure.
- Use TanStack Query for IPC-backed async query/mutation state and Zustand only for ephemeral UI state.
- Implement storage manifest entries for all persisted data.
- Implement schema validation/data integrity reports and fixtures for `.orchlet` and SQLite.
- CI/test scaffolding must include frontend tests, Rust tests, contract tests, schema/data fixtures and desktop smoke structure.

### UX Design Requirements

Button-level UX requirements are now specified in `_bmad-output/planning-artifacts/ux-design-specification.md`, created from the PRD, Architecture, Epics and the `/Users/wdx/opc/golutra` reference project. Earlier derived requirements remain valid; implementation stories must follow the detailed screen/button behavior in the UX specification.

UX-DR1: The app must open directly into a usable desktop work surface, not a marketing landing page.
UX-DR2: Core interactions must be keyboard-operable, including chat input, conversation switching, terminal find, settings save and notification handling.
UX-DR3: Main, terminal, workspace-selection and notification-preview window modes must have coherent navigation and theme/language consistency.
UX-DR4: Terminal and chat text must not be clipped or obscured by layout changes, tabs, panes or loading states.
UX-DR5: Error messages must state what happened, impact scope and next available action.
UX-DR6: The UI must distinguish implemented capabilities, placeholder/store entries and explicitly deferred functionality.

### FR Coverage Map

FR1: Epic 1 - 打开任意本地目录作为工作区。
FR2: Epic 1 - 创建、读取和更新新版工作区元数据。
FR3: Epic 1 - 工作区不可写时进入只读模式并使用应用数据 fallback。
FR4: Epic 1 - 查看、搜索和重新打开最近工作区。
FR5: Epic 1 - 检测 workspace registry 中的路径/项目标识冲突并让用户选择语义。
FR6: Epic 1 - 阻止同一工作区在多个主窗口重复打开。
FR7: Epic 1 - 从应用打开工作区所在的系统文件管理器。
FR8: Epic 1 - 支持主窗口、工作区选择、终端窗口和通知预览窗口的任务入口。
FR9: Epic 1 - 在多窗口间同步工作区上下文、主题、语言和必要导航事件。
FR10: Epic 2 - 为每个工作区自动补齐默认 owner 成员。
FR11: Epic 2 - 邀请 assistant 或 member 类型成员加入工作区。
FR12: Epic 2 - 为成员选择内置 AI CLI、自定义 CLI 或 shell 类型。
FR13: Epic 2 - 一次邀请多个成员实例并保留数量、权限和隔离标记。
FR14: Epic 2 - 创建、查看、管理和删除全局联系人。
FR15: Epic 2 - 从成员或联系人发起私聊。
FR16: Epic 2 - 查看和修改成员名称、状态和基础资料。
FR17: Epic 3 - 从成员入口打开成员终端；成员提及和移除入口在 Epic 2 中提供。
FR18: Epic 2 - 区分项目成员邀请和管理员/联系人邀请。
FR19: Epic 2 - 在每个工作区使用默认频道。
FR20: Epic 2 - 创建群聊并管理群聊成员。
FR21: Epic 2 - 创建或复用与成员的私聊会话。
FR22: Epic 2 - 查看会话列表并区分置顶、时间线和未读状态。
FR23: Epic 2 - 发送文本消息并查看发送状态。
FR24: Epic 2 - 分页加载历史消息。
FR25: Epic 2 - 对会话置顶、静音、重命名、清空和删除。
FR26: Epic 2 - 维护会话未读计数和已读位置。
FR27: Epic 2 - 在消息中提及指定成员。
FR28: Epic 2 - 明确实现或明确放弃 `@all` 行为。
FR29: Epic 2 - 支持 emoji 搜索和最近使用记录。
FR30: Epic 2 - 查看图片附件和 roadmap 附件入口。
FR31: Epic 2 - 使用快捷提示生成或插入常用协作消息。
FR32: Epic 4 - 将终端输出作为聊天消息或聊天流显示。
FR33: Epic 3 - 为工作区打开或复用独立终端窗口。
FR34: Epic 3 - 创建、关闭、恢复和搜索终端 tab。
FR35: Epic 3 - 固定、排序和移动终端 tab。
FR36: Epic 3 - 使用单 pane、左右分屏、上下分屏和 2x2 布局组织终端。
FR37: Epic 3 - 将终端 tab 分配到不同 pane。
FR38: Epic 3 - 在终端中输入、选择、复制、清除和查找文本。
FR39: Epic 3 - 设置终端查找选项。
FR40: Epic 3 - 创建、附加、写入、调整大小和关闭终端会话。
FR41: Epic 3 - 列出可用终端环境并解析用户配置的 CLI 路径。
FR42: Epic 3 - 维护终端会话状态、快照和退出原因。
FR43: Epic 3 - 在窗口重开或 tab attach 时恢复终端可观察状态。
FR44: Epic 3 - 在终端资源受限或启动失败时给出可恢复提示。
FR45: Epic 4 - 从聊天消息向指定成员终端派发任务。
FR46: Epic 4 - 根据 mention、成员状态和会话上下文确定派发目标。
FR47: Epic 4 - 成员免打扰时跳过派发并保留用户可见状态。
FR48: Epic 4 - 成员忙碌时排队派发并在可用后继续处理。
FR49: Epic 4 - 识别重复消息并避免重复派发。
FR50: Epic 4 - 合并同上下文的连续派发。
FR51: Epic 4 - 将终端输出、终端状态和消息状态同步回聊天与成员视图。
FR52: Epic 5 - 聚合当前窗口和工作区未读状态。
FR53: Epic 5 - 从通知预览打开全部未读、指定会话或指定成员终端。
FR54: Epic 5 - 忽略全部未读通知。
FR55: Epic 6 - 导入本地技能文件夹到应用技能库。
FR56: Epic 6 - 删除和打开本地技能文件夹。
FR57: Epic 6 - 将应用技能库中的技能链接到当前工作区。
FR58: Epic 6 - 取消工作区技能链接。
FR59: Epic 6 - 列出当前工作区已链接技能。
FR60: Epic 6 - 区分本地技能能力、技能商店占位能力和未来远程插件能力。
FR61: Epic 6 - 创建、编辑、删除和查看路线图任务。
FR62: Epic 6 - 设置路线图目标、任务状态和完成进度。
FR63: Epic 7 - 配置显示名称、时区、状态、状态消息和头像。
FR64: Epic 7 - 上传、删除、重置或选择预设头像。
FR65: Epic 7 - 选择主题和语言。
FR66: Epic 7 - 配置桌面通知、声音、仅提及、预览和免打扰时间。
FR67: Epic 7 - 启用、禁用和查看快捷键配置。
FR68: Epic 7 - 配置内置 CLI 路径、自定义成员、自定义终端和默认终端。
FR69: Epic 7 - 配置聊天终端输出流展示偏好。
FR70: Epic 7 - 触发聊天数据修复。
FR71: Epic 7 - 清空当前工作区聊天数据。
FR72: Epic 1 - 持久化全局设置、全局数据、联系人、最近工作区、registry、头像库、工作区项目数据、聊天数据、技能库和会话缓存的 storage manifest。
FR73: Epic 1 - 创建和维护新版 `.orchlet` 工作区数据、SQLite 聊天数据、设置数据、头像库、联系人、技能链接和最近工作区。
FR74: Epic 1 - 执行 schema validation 并生成数据完整性报告。
FR75: Epic 1 - 为关键数据类型记录 schema version 或等价版本信息。
FR76: Epic 8 - 记录前端事件、后端事件、终端 session、会话、成员、窗口和诊断 run。
FR77: Epic 8 - 记录终端快照一致性和聊天一致性诊断。
FR78: Epic 8 - 查看或导出用于问题排查的诊断信息。
FR79: Epic 8 - 区分已实现功能、替代实现、占位功能和明确放弃功能。

## Epic List

### Epic 1: 工作区启动、新数据底座与多窗口外壳
用户可以直接打开本地目录进入可用的跨平台桌面工作区，应用会创建新版 `.orchlet` 元数据、维护最近工作区和 registry、处理只读 fallback 与路径冲突，并建立后续功能共享的 storage manifest、schema version、schema validation 和多窗口上下文同步基础。

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR72, FR73, FR74, FR75.

**Implementation notes:** Epic 1 Story 1 必须使用官方 Tauri React TypeScript starter 初始化项目；MVP 使用 React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Tauri 2 + Rust + SQLite/rusqlite，不引入 Vue、redb 或旧数据兼容。

### Epic 2: 成员、联系人与协作聊天
用户可以在工作区中管理 owner、assistant、member 和联系人，创建默认频道、群聊和私聊，发送文本消息，维护会话列表、未读状态、历史分页、提及、emoji、附件入口和快捷提示，形成 AI 协作的基础交流面。

**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31.

**Implementation notes:** 聊天与成员数据通过 SQLite 和集中 IPC 契约持久化；feature code 只能通过 `src/shared/api` 调用 Tauri，不直接使用 raw `invoke`。

### Epic 3: 可恢复的终端工作区
用户可以在独立终端窗口中创建、组织、搜索、恢复和操作多个终端 tab 与 pane，系统负责 Rust-owned PTY 会话生命周期、CLI 路径解析、状态快照、退出原因和可恢复错误提示。

**FRs covered:** FR17, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44.

**Implementation notes:** 终端 session 由 Rust backend 拥有，优先使用 portable-pty；xterm.js 只负责渲染。终端高频输出必须绕过 React state，通过 renderer adapter 批处理和背压控制。

### Epic 4: 聊天到终端的任务派发闭环
用户可以从聊天消息把任务派发给指定成员终端，系统根据 mention、成员状态和会话上下文确定目标，处理免打扰、忙碌队列、重复消息、连续派发合并，并把终端输出、终端状态和消息状态同步回聊天与成员视图。

**FRs covered:** FR32, FR45, FR46, FR47, FR48, FR49, FR50, FR51.

**Implementation notes:** 终端 stream payload 必须包含 schema version、session id、sequence、chunk kind 和 emitted timestamp；派发状态必须可诊断，避免重复派发或无限重试。

### Epic 5: 通知预览与跨窗口回到上下文
用户可以通过通知预览和托盘状态了解当前窗口与工作区未读情况，并从通知直接跳回全部未读、指定会话或指定成员终端，也可以一次忽略全部未读。

**FRs covered:** FR52, FR53, FR54.

**Implementation notes:** 通知能力必须按 Tauri window mode 配置最小 capability，并与主题、语言、工作区上下文同步；通知状态更新不得阻塞终端输出和聊天输入。

### Epic 6: 本地技能库与路线图协作
用户可以把本地技能文件夹纳入应用技能库，链接或取消链接到当前工作区，查看已链接技能，并在同一工作流中管理路线图任务、目标、状态和进度，同时清晰区分本地技能、技能商店占位和未来远程插件能力。

**FRs covered:** FR55, FR56, FR57, FR58, FR59, FR60, FR61, FR62.

**Implementation notes:** 技能 link/unlink 必须处理 symlink 不可用和权限不足的平台差异；技能与路线图数据写入新版 `.orchlet`/SQLite schema，不读取旧 `.golutra` 数据。

### Epic 7: 个人设置、通知偏好与 CLI 配置
用户可以维护个人身份、头像、主题、语言、通知、快捷键、CLI 路径、自定义成员、终端默认值、聊天终端输出展示偏好，并能触发聊天数据修复或清空当前工作区聊天数据。

**FRs covered:** FR63, FR64, FR65, FR66, FR67, FR68, FR69, FR70, FR71.

**Implementation notes:** 设置状态通过 TanStack Query 管理 IPC-backed async state，通过 Zustand 管理临时 UI state；主题和语言必须同步到主窗口、终端窗口、工作区选择和通知预览窗口。

### Epic 8: 诊断、能力标记与发布验收
用户和维护者可以查看或导出脱敏诊断信息，系统可以记录事件、终端快照一致性、聊天一致性、数据完整性和诊断 run，并明确区分已实现、替代实现、占位和放弃功能。

**FRs covered:** FR76, FR77, FR78, FR79.

**Implementation notes:** 发布前必须完成三平台 smoke、MVP capability checklist、契约测试、schema/data fixtures 和安全/隐私检查；诊断导出必须默认避免泄露敏感路径、token、环境变量或私有源码片段。

## Epic 1: 工作区启动、新数据底座与多窗口外壳

Epic goal: 用户可以直接打开本地目录进入可用的跨平台桌面工作区，系统建立新版 `.orchlet` 数据底座、多窗口外壳、最近工作区和 schema validation 基础。

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR72, FR73, FR74, FR75.

### Story 1.1: Set up initial project from starter template

As a desktop user,
I want to launch orchlet as a React/Tauri desktop app,
So that I can start from a performant cross-platform shell instead of a browser-only prototype.

**Requirements:** Additional starter requirement, FR1, FR8, UX-DR1.

**Acceptance Criteria:**

**Given** a clean implementation workspace
**When** the project is initialized
**Then** it uses `pnpm create tauri-app orchlet --template react-ts --manager pnpm --identifier com.orchlet.app --tauri-version 2`
**And** the application runs on the React + TypeScript + Vite + Tailwind CSS v4 + Tauri 2 + Rust baseline.

**Given** the app is started in development mode
**When** the main window opens
**Then** the user sees a usable workspace entry surface, not a marketing landing page.

**Given** reusable UI primitives are added
**When** icon-only buttons are implemented
**Then** they use `lucide-react` icons with `aria-label` and tooltip text.

**Given** frontend code needs backend data
**When** it calls desktop capabilities
**Then** feature code uses `src/shared/api` instead of direct raw `invoke`
**And** Rust DTOs live under `src-tauri/src/contracts` with TypeScript types exported through `ts-rs`.

### Story 1.2: 打开目录并创建新版工作区元数据

As a workspace user,
I want to open any local directory as an orchlet workspace,
So that each project can have its own durable collaboration state.

**Requirements:** FR1, FR2, FR73, FR75.

**Acceptance Criteria:**

**Given** the user selects a writable local directory
**When** they open it as a workspace
**Then** the app creates or updates `.orchlet/workspace.json`
**And** the metadata includes project id, schema version, created/updated timestamps and basic workspace identity.

**Given** the selected directory already contains valid `.orchlet/workspace.json`
**When** the user opens it again
**Then** the app reads the existing metadata and enters the workspace without recreating project identity.

**Given** an invalid or partially written `.orchlet/workspace.json`
**When** the workspace is opened
**Then** the app reports what is invalid, the impact scope and the available recovery action.

### Story 1.3: 管理最近工作区和 workspace registry 冲突

As a returning user,
I want to find and reopen recent workspaces safely,
So that I do not accidentally open duplicated or ambiguous project copies.

**Requirements:** FR4, FR5, FR6.

**Acceptance Criteria:**

**Given** the user has opened one or more workspaces
**When** they view the workspace selector
**Then** recent workspaces are searchable and sorted by recent activity.

**Given** two paths point to the same project id
**When** the user attempts to open the second path
**Then** the app detects the conflict and asks the user to choose move or copy semantics.

**Given** a workspace is already open in a main window
**When** the user attempts to open the same workspace again
**Then** the existing window is focused or surfaced
**And** a duplicate main window is not created.

### Story 1.4: 只读工作区 fallback 与系统文件管理器入口

As a user working with restricted directories,
I want orchlet to handle unwritable workspaces predictably,
So that I can still inspect the project without losing app state.

**Requirements:** FR3, FR7.

**Acceptance Criteria:**

**Given** a selected workspace directory is not writable
**When** the user opens it
**Then** the app enters read-only mode for workspace-local data
**And** stores necessary fallback state under local application data.

**Given** the app enters read-only mode
**When** the UI displays workspace status
**Then** the user can see what is read-only, which actions are limited and what they can do next.

**Given** any opened workspace
**When** the user chooses open in file manager
**Then** the operating system file manager opens the workspace path on Windows, macOS and Linux or shows a platform-specific unavailable message.

### Story 1.5: 多窗口模式与上下文同步

As a desktop user,
I want main, workspace-selection, terminal and notification-preview windows to stay in the same context,
So that moving between windows does not lose my workspace, theme or language.

**Requirements:** FR8, FR9, UX-DR3.

**Acceptance Criteria:**

**Given** the user opens multiple orchlet window modes
**When** workspace context changes
**Then** main, terminal, workspace-selection and notification-preview windows receive the updated workspace context.

**Given** the user changes theme or language
**When** any supported window is open
**Then** all windows apply the same theme and language without requiring restart.

**Given** a window mode requests a Tauri capability
**When** capabilities are evaluated
**Then** only the minimum permissions required for that window mode are available.

### Story 1.6: Storage manifest、schema version 与 validation 报告

As a maintainer and power user,
I want orchlet data locations and schema health to be explicit,
So that data problems can be found without silent corruption.

**Requirements:** FR72, FR74, FR75.

**Acceptance Criteria:**

**Given** workspace storage foundation is initialized
**When** the app creates or reads app settings, recent workspaces, workspace registry and `.orchlet/workspace.json`
**Then** each implemented storage category has a manifest entry, owner, path policy and schema/version marker.

**Given** a later story introduces a new persisted domain such as contacts, chat, avatar library, skills, roadmap, terminal snapshots or diagnostics
**When** that story is implemented
**Then** it must add its own manifest entry, migration or file schema marker, fixture and validation check instead of relying on upfront placeholder tables.

**Given** the user or system runs schema validation
**When** validation completes
**Then** the app produces a data integrity report for currently implemented storage categories with passed checks, failed checks and affected data paths.

**Given** validation is long-running
**When** the user navigates or cancels
**Then** validation is interruptible or batched and does not freeze the main interface.

### Story 1.7: 建立测试、契约 fixture 与桌面 smoke 脚手架

As a maintainer,
I want automated test and smoke scaffolding in place before broad feature work,
So that implementation agents have guardrails for contracts, storage, terminal streams and desktop flows.

**Requirements:** Additional CI/test scaffolding requirement, NFR20, NFR35, NFR36, NFR37, NFR43.

**Acceptance Criteria:**

**Given** the initial project shell exists
**When** test scaffolding is added
**Then** package and Cargo commands exist for frontend tests, Rust tests, contract tests, schema/data fixture tests and smoke-test entry points.

**Given** typed IPC contracts are defined
**When** contract tests run
**Then** JSON fixtures verify TypeScript payload compatibility with Rust serde DTOs and response envelopes.

**Given** storage and terminal foundations are introduced
**When** fixture tests run
**Then** sample `.orchlet` workspace data, SQLite/schema fixtures and terminal stream fixtures cover ordering, snapshot and validation paths.

**Given** release readiness is evaluated
**When** desktop smoke scaffolding runs or is listed for a platform
**Then** launch, open workspace, start shell, send message, terminal output, notification jump and restart recovery are represented for Windows, macOS and Linux with pass/fail/manual status.

## Epic 2: 成员、联系人与协作聊天

Epic goal: 用户可以在工作区中管理成员与联系人，创建默认频道、群聊和私聊，并完成可靠的本地聊天协作。

**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31.

### Story 2.1: 默认 owner 与成员邀请

As a workspace owner,
I want each workspace to have a default owner and inviteable members,
So that AI and human collaborators can be represented consistently.

**Requirements:** FR10, FR11, FR12.

**Acceptance Criteria:**

**Given** a workspace is opened for the first time
**When** member data is initialized
**Then** a default owner member is created or backfilled exactly once.

**Given** the owner invites collaborators
**When** they choose assistant or member type
**Then** the invite flow stores member type, display name and baseline status.

**Given** the owner selects a runtime for an invited member
**When** they choose built-in AI CLI, custom CLI or shell
**Then** the member profile stores the selected runtime without starting a terminal until explicitly requested.

### Story 2.2: 多实例邀请、权限与成员操作入口

As a workspace owner,
I want to invite multiple member instances with permissions and isolation flags,
So that I can model several assistants or collaborators in one workspace.

**Requirements:** FR13, FR16, FR17.

**Acceptance Criteria:**

**Given** the owner chooses to invite multiple member instances
**When** they submit the invite
**Then** the requested number of member instances is created with distinct ids and visible labels.

**Given** permissions or isolation flags are set during invite
**When** the members are saved
**Then** those attributes are persisted and visible in member details.

**Given** a member is shown in the UI
**When** the user opens the member action menu
**Then** they can mention the member or remove the member according to available permissions.

### Story 2.3: 全局联系人与私聊入口

As a user,
I want to manage global contacts and start private conversations,
So that recurring collaborators are available across workspaces.

**Requirements:** FR14, FR15, FR18.

**Acceptance Criteria:**

**Given** the user opens the contacts area
**When** they create, edit or delete a contact
**Then** the contact list persists the change in global application data.

**Given** a member or contact exists
**When** the user starts a private chat from that entry
**Then** the app creates or reuses the private conversation for that participant.

**Given** an invite flow is shown
**When** the user chooses project member invite versus administrator/contact invite
**Then** the UI labels and stored records distinguish the two invitation types.

### Story 2.4: 默认频道、群聊与会话列表

As a collaborator,
I want default channels, group chats and clear conversation ordering,
So that I can move between active discussions efficiently.

**Requirements:** FR19, FR20, FR21, FR22.

**Acceptance Criteria:**

**Given** a workspace has no conversations
**When** chat data is initialized
**Then** the workspace has a default channel.

**Given** the user creates a group chat
**When** they add or remove group members
**Then** membership changes are persisted and reflected in the conversation header.

**Given** the user views the conversation list
**When** conversations have pinned status, unread state and different activity times
**Then** the list ordering and visual states make those differences clear.

### Story 2.5: 消息发送、历史分页与已读位置

As a chat user,
I want messages to send quickly and history to load predictably,
So that local collaboration feels responsive even with large conversations.

**Requirements:** FR23, FR24, FR26.

**Acceptance Criteria:**

**Given** the user enters a text message
**When** they send it
**Then** the message is stored locally and shows a sending, sent or failed status.

**Given** a conversation has older messages
**When** the user scrolls or requests more history
**Then** older messages load in pages without blocking chat input.

**Given** the user reads a conversation
**When** the read position changes
**Then** unread count and read position are updated for that conversation.

### Story 2.6: 会话管理操作

As a chat user,
I want to pin, mute, rename, clear and delete conversations,
So that I can keep my workspace communication organized.

**Requirements:** FR25.

**Acceptance Criteria:**

**Given** a conversation exists
**When** the user pins, mutes or renames it
**Then** the conversation list and detail header reflect the updated state.

**Given** the user chooses to clear a conversation
**When** they confirm the action
**Then** local messages are cleared according to the current workspace policy and the action is not silent.

**Given** the user chooses to delete a conversation
**When** deletion completes
**Then** the conversation no longer appears in active lists and related unread state is removed.

### Story 2.7: 提及、emoji、附件入口与快捷提示

As a chat user,
I want composition helpers for mentions, emoji, attachments and common prompts,
So that routine collaboration is faster and less error-prone.

**Requirements:** FR27, FR28, FR29, FR30, FR31.

**Acceptance Criteria:**

**Given** the user types `@`
**When** matching members exist
**Then** the app offers member mention suggestions and inserts a structured mention.

**Given** the product decision for `@all` is configured
**When** the user enters `@all`
**Then** the app either performs the explicit implementation or shows the documented product abandonment behavior.

**Given** the user opens emoji or helper menus
**When** they search emoji, select recent emoji, open image attachment entry or use a shortcut prompt
**Then** the selected helper inserts or opens the intended chat composition state.

## Epic 3: 可恢复的终端工作区

Epic goal: 用户可以在独立终端窗口中创建、组织、查找和恢复多个终端 session，系统用 Rust-owned PTY 保障终端状态可观察且可恢复。

**FRs covered:** FR17, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44.

### Story 3.1: 打开或复用工作区终端窗口

As a developer,
I want to open or reuse a terminal window for the current workspace,
So that command execution stays attached to the project context.

**Requirements:** FR17, FR33, FR40, UX-DR4.

**Acceptance Criteria:**

**Given** a workspace is open
**When** the user opens terminal
**Then** the app opens or focuses the workspace terminal window instead of creating unnecessary duplicates.

**Given** a member with a terminal-capable runtime is visible
**When** the user chooses open member terminal from the member entry
**Then** the app opens or focuses that member's terminal session in the workspace terminal window.

**Given** the terminal window opens
**When** the first terminal session is requested
**Then** Rust creates the PTY session and xterm.js renders it without owning session lifecycle.

**Given** the terminal backend emits data
**When** the renderer receives it
**Then** terminal output bypasses React state and is written through a renderer adapter with batching.

### Story 3.2: 终端 session 生命周期 IPC

As a terminal user,
I want terminal sessions to support attach, input, resize and close,
So that terminal behavior matches desktop terminal expectations.

**Requirements:** FR40, FR42.

**Acceptance Criteria:**

**Given** a terminal session exists
**When** the frontend attaches to it
**Then** the backend returns session metadata and starts streaming output events with schema version, session id, sequence, chunk kind and emitted timestamp.

**Given** the user types in the terminal
**When** input is sent
**Then** Rust writes the input to the PTY for the correct session.

**Given** the terminal viewport changes size or the user closes the session
**When** resize or close is requested
**Then** Rust resizes or closes the PTY and emits an updated session state.

### Story 3.3: Terminal tabs 的创建、恢复、搜索和排序

As a terminal-heavy user,
I want to manage terminal tabs,
So that multiple command contexts remain findable and organized.

**Requirements:** FR34, FR35.

**Acceptance Criteria:**

**Given** the terminal window is open
**When** the user creates, closes or restores a terminal tab
**Then** tab state and attached session state update consistently.

**Given** multiple tabs exist
**When** the user pins, sorts or moves a tab
**Then** the tab order and pin state persist for the workspace.

**Given** many tabs exist
**When** the user searches tabs
**Then** matching tabs are findable by label, shell or relevant session metadata.

### Story 3.4: Terminal pane layouts 与 tab 分配

As a developer comparing command output,
I want to arrange terminal tabs into panes,
So that I can watch related processes side by side.

**Requirements:** FR36, FR37, UX-DR4.

**Acceptance Criteria:**

**Given** one or more terminal tabs exist
**When** the user selects single pane, left/right split, top/bottom split or 2x2 layout
**Then** the terminal window applies the selected layout without clipping terminal text.

**Given** multiple panes are visible
**When** the user assigns a terminal tab to a pane
**Then** that tab renders in the chosen pane and remains attached to the same backend session.

**Given** a layout change occurs
**When** terminal dimensions change
**Then** backend resize events are sent for affected sessions.

### Story 3.5: Terminal 文本操作和查找选项

As a terminal user,
I want standard input, selection, copy, clear and find behavior,
So that terminal interaction feels native and efficient.

**Requirements:** FR38, FR39, UX-DR2.

**Acceptance Criteria:**

**Given** a terminal is focused
**When** the user types, selects, copies or clears terminal text
**Then** the terminal performs the expected operation without breaking session output.

**Given** the user opens terminal find
**When** they search text
**Then** matches are highlighted and navigation between matches is keyboard-operable.

**Given** find options are set
**When** the user toggles case sensitivity, whole word or regex mode
**Then** search results update according to the selected options.

### Story 3.6: CLI 环境解析、错误恢复与 session 快照

As a user launching shells and AI CLIs,
I want launch failures and session recovery to be understandable,
So that I can fix configuration problems without losing terminal context.

**Requirements:** FR41, FR42, FR43, FR44, UX-DR5.

**Acceptance Criteria:**

**Given** terminal environments are requested
**When** the app lists available shells and configured CLI paths
**Then** it shows available, missing and invalid entries with actionable diagnostics.

**Given** terminal launch fails or resources are limited
**When** the failure is detected
**Then** the UI explains what happened, the impact scope and the next action.

**Given** a terminal session exits or the terminal window is reopened
**When** the user restores or attaches to the tab
**Then** the app shows the last observable snapshot, current state and exit reason.

## Epic 4: 聊天到终端的任务派发闭环

Epic goal: 用户可以从聊天把任务派发到成员终端，系统处理目标选择、免打扰、忙碌队列、去重、合并和输出回写，形成可追踪的 AI 协作闭环。

**FRs covered:** FR32, FR45, FR46, FR47, FR48, FR49, FR50, FR51.

### Story 4.1: 从聊天消息派发到成员终端

As a collaborator,
I want to send a chat task to a member terminal,
So that an assistant or shell-backed member can act on the workspace context.

**Requirements:** FR45, FR51.

**Acceptance Criteria:**

**Given** a chat message mentions or targets a member
**When** the user dispatches it
**Then** the app creates a dispatch request linked to workspace, conversation, message and member ids.

**Given** a member has an associated runtime
**When** dispatch starts
**Then** the app opens or reuses the member terminal session for that workspace.

**Given** dispatch cannot start
**When** an error occurs
**Then** the message shows a failed dispatch state with a recoverable action where possible.

### Story 4.2: 派发目标解析与上下文选择

As a chat user,
I want the app to choose the correct dispatch target,
So that tasks do not go to the wrong assistant or shell.

**Requirements:** FR46.

**Acceptance Criteria:**

**Given** a message contains one or more member mentions
**When** dispatch target resolution runs
**Then** the app chooses explicit mentions before fallback context.

**Given** no explicit mention exists
**When** conversation context identifies a private member or default target
**Then** the app selects that target and records the reason.

**Given** target resolution is ambiguous
**When** the user dispatches
**Then** the UI asks for target selection instead of guessing silently.

### Story 4.3: 免打扰、忙碌队列与用户可见状态

As a user coordinating multiple members,
I want DND and busy members handled safely,
So that tasks are not lost or spammed.

**Requirements:** FR47, FR48.

**Acceptance Criteria:**

**Given** a target member is in do-not-disturb mode
**When** a task is dispatched
**Then** dispatch is skipped and the message shows a visible skipped state.

**Given** a target member is busy
**When** a task is dispatched
**Then** the task is queued and the user can see its queued status.

**Given** a busy member becomes available
**When** queued work resumes
**Then** the next queued dispatch runs once and the message state updates.

### Story 4.4: 重复派发识别与连续派发合并

As a user sending several related instructions,
I want orchlet to avoid duplicate or fragmented dispatches,
So that member terminals receive coherent work.

**Requirements:** FR49, FR50.

**Acceptance Criteria:**

**Given** the same message is submitted for dispatch more than once
**When** deduplication runs
**Then** the app avoids creating duplicate active dispatches and reports the existing dispatch state.

**Given** several consecutive dispatchable messages share the same conversation, target and context window
**When** batching rules apply
**Then** the app merges them into a single dispatch payload with traceable source message ids.

**Given** a merge would cross a target or context boundary
**When** batching rules evaluate it
**Then** the app keeps dispatches separate.

### Story 4.5: 终端输出回写聊天流与状态同步

As a collaborator,
I want terminal output and task state to return to chat,
So that I can follow assistant work without staying in the terminal.

**Requirements:** FR32, FR51.

**Acceptance Criteria:**

**Given** a dispatched terminal emits output
**When** output events arrive
**Then** the app renders them as configured chat messages or chat stream entries in sequence order.

**Given** terminal status changes
**When** a session starts, exits or fails
**Then** chat message status and member status update consistently.

**Given** terminal output volume is high
**When** the UI receives stream events
**Then** output remains observable without blocking chat input, window switching or terminal input.

## Epic 5: 通知预览与跨窗口回到上下文

Epic goal: 用户可以通过通知预览和托盘状态掌握未读，并从通知直接回到相关会话或成员终端。

**FRs covered:** FR52, FR53, FR54.

### Story 5.1: 聚合窗口与工作区未读状态

As a busy desktop user,
I want unread state aggregated across windows and workspaces,
So that I know where attention is needed.

**Requirements:** FR52.

**Acceptance Criteria:**

**Given** messages become unread in the current workspace
**When** unread aggregation runs
**Then** main window, notification preview and tray state reflect the updated count.

**Given** the user reads a conversation
**When** read state changes
**Then** unread aggregation updates without requiring a window refresh.

**Given** terminal output is streaming
**When** unread state changes
**Then** notification aggregation does not block terminal rendering.

### Story 5.2: 通知预览跳转

As a user receiving notifications,
I want notification preview actions to take me to the relevant context,
So that I can respond quickly.

**Requirements:** FR53.

**Acceptance Criteria:**

**Given** there are unread conversations
**When** the user opens all unread from notification preview
**Then** the main window opens the unread view for the active workspace.

**Given** a notification references a specific conversation
**When** the user activates it
**Then** the main window opens that conversation.

**Given** a notification references a member terminal
**When** the user activates it
**Then** the terminal window opens or focuses the corresponding member terminal.

### Story 5.3: 忽略全部未读通知

As a user managing attention,
I want to dismiss all unread notifications,
So that I can clear notification pressure without changing stored message history.

**Requirements:** FR54.

**Acceptance Criteria:**

**Given** unread notifications are visible
**When** the user chooses ignore all
**Then** notification preview and tray indicators clear for the ignored notification set.

**Given** notifications are ignored
**When** the user later opens the conversation
**Then** message history remains available and read state follows the product policy.

**Given** ignore all fails to persist
**When** the error occurs
**Then** the app shows a recoverable error instead of silently clearing UI state.

## Epic 6: 本地技能库与路线图协作

Epic goal: 用户可以管理本地技能库、把技能链接到工作区，并维护路线图任务、目标、状态和进度。

**FRs covered:** FR55, FR56, FR57, FR58, FR59, FR60, FR61, FR62.

### Story 6.1: 导入本地技能文件夹

As a power user,
I want to import local skill folders into the app skill library,
So that reusable local capabilities can be managed from orchlet.

**Requirements:** FR55.

**Acceptance Criteria:**

**Given** the user selects a local skill folder
**When** import runs
**Then** the app validates the folder, stores a skill library record and shows the imported skill.

**Given** the selected folder is missing, unreadable or invalid
**When** import runs
**Then** the app explains the validation failure and does not create a broken skill record.

**Given** the same folder is imported again
**When** duplicate detection runs
**Then** the app updates or reports the existing skill record according to product policy.

### Story 6.2: 管理技能库与工作区链接

As a workspace owner,
I want to link and unlink skills for the current workspace,
So that only relevant local capabilities are available in each project.

**Requirements:** FR57, FR58, FR59.

**Acceptance Criteria:**

**Given** skills exist in the app library
**When** the user links a skill to the current workspace
**Then** the workspace shows the linked skill in its skill list.

**Given** a linked skill exists
**When** the user unlinks it
**Then** the workspace no longer lists it and the app library record remains intact.

**Given** the platform cannot create symlinks or lacks permission
**When** link or unlink runs
**Then** the app uses the defined fallback or shows a clear unavailable state.

### Story 6.3: 删除、打开与能力分类

As a user managing skills,
I want to delete, open and understand skill capabilities,
So that local skills, store placeholders and future plugins are not confused.

**Requirements:** FR56, FR60, UX-DR6.

**Acceptance Criteria:**

**Given** a skill exists in the app library
**When** the user opens the skill folder
**Then** the system file manager opens the stored folder path or shows an unavailable message.

**Given** a skill is deleted from the app library
**When** deletion completes
**Then** app library and workspace link state are updated without deleting user source folders unless explicitly supported and confirmed.

**Given** skills and placeholders are listed
**When** the user views the skill area
**Then** local skills, skill store placeholders and future remote plugin placeholders are visually and semantically distinct.

### Story 6.4: 路线图任务 CRUD

As a workspace user,
I want to create and manage roadmap tasks,
So that project direction can be tracked near chat and terminal work.

**Requirements:** FR61.

**Acceptance Criteria:**

**Given** the user opens roadmap
**When** they create a task
**Then** the task is persisted with title, description or equivalent detail, status and ordering metadata.

**Given** a roadmap task exists
**When** the user edits, deletes or views it
**Then** the UI and persisted data reflect the change.

**Given** a roadmap task is referenced from chat attachment entry
**When** the user opens the reference
**Then** the app navigates to or previews the relevant roadmap task.

### Story 6.5: 路线图目标、状态与进度

As a workspace owner,
I want roadmap goals and progress to be visible,
So that collaborators can understand execution state.

**Requirements:** FR62.

**Acceptance Criteria:**

**Given** roadmap goals are configured
**When** the user views roadmap
**Then** goals are shown with related tasks and progress.

**Given** a task status changes
**When** progress is recalculated
**Then** completion progress updates consistently.

**Given** roadmap data write fails
**When** the user saves a change
**Then** the app reports the failure and preserves unsaved input where possible.

## Epic 7: 个人设置、通知偏好与 CLI 配置

Epic goal: 用户可以配置个人资料、头像、主题、语言、通知、快捷键、CLI/终端偏好和聊天数据维护操作。

**FRs covered:** FR63, FR64, FR65, FR66, FR67, FR68, FR69, FR70, FR71.

### Story 7.1: 个人资料与状态设置

As a user,
I want to configure my display identity and status,
So that collaborators see accurate presence information.

**Requirements:** FR63.

**Acceptance Criteria:**

**Given** the user opens profile settings
**When** they update display name, timezone, status or status message
**Then** the settings are saved and reflected in relevant member/profile surfaces.

**Given** invalid profile input is entered
**When** the user saves
**Then** the app identifies the invalid field and preserves editable input.

**Given** profile settings are saved
**When** the app restarts
**Then** the saved profile values are restored.

### Story 7.2: 头像上传、删除、重置与预设

As a user,
I want to manage my avatar,
So that my identity is recognizable without relying on external services.

**Requirements:** FR64.

**Acceptance Criteria:**

**Given** the user uploads an avatar image
**When** the upload is accepted
**Then** the avatar is stored in the avatar library and shown in profile surfaces.

**Given** the user deletes or resets an avatar
**When** the action completes
**Then** the profile falls back to the selected default or generated placeholder.

**Given** preset avatars are available
**When** the user selects one
**Then** the selected preset is saved without copying unrelated files into the workspace.

### Story 7.3: 主题与语言切换

As a desktop user,
I want theme and language preferences to apply everywhere,
So that the app feels coherent across windows.

**Requirements:** FR65, UX-DR3.

**Acceptance Criteria:**

**Given** the user changes theme
**When** main, terminal, workspace-selection or notification-preview windows are open
**Then** all windows apply the selected theme.

**Given** the user changes language
**When** supported windows are open
**Then** visible labels and supported messages switch language consistently.

**Given** preferences are persisted
**When** the app restarts
**Then** theme and language restore before the user begins core work.

### Story 7.4: 通知、声音、预览与免打扰偏好

As a user managing interruptions,
I want detailed notification preferences,
So that orchlet only interrupts me in the ways I choose.

**Requirements:** FR66.

**Acceptance Criteria:**

**Given** notification settings are open
**When** the user configures desktop notifications, sound, mentions-only, preview or DND windows
**Then** the preferences are saved and applied to notification behavior.

**Given** DND time is active
**When** new notifications occur
**Then** notification behavior follows the configured DND policy.

**Given** notification permissions are unavailable on a platform
**When** the user views settings
**Then** the app shows the unavailable state and next action.

### Story 7.5: 快捷键配置

As a keyboard-focused user,
I want to view and control shortcuts,
So that core workflows are efficient without a mouse.

**Requirements:** FR67, UX-DR2.

**Acceptance Criteria:**

**Given** shortcut settings are open
**When** the user views shortcuts
**Then** enabled, disabled and unavailable shortcuts are clearly shown.

**Given** the user enables or disables a shortcut
**When** the setting is saved
**Then** the shortcut behavior updates without requiring restart where technically possible.

**Given** a core workflow exists
**When** tested by keyboard
**Then** chat input, conversation switching, terminal find, settings save and notification handling are keyboard-operable.

### Story 7.6: CLI、自定义成员与默认终端配置

As a developer,
I want to configure CLI and terminal paths,
So that orchlet can launch the tools I actually use.

**Requirements:** FR68.

**Acceptance Criteria:**

**Given** CLI settings are open
**When** the user configures built-in CLI paths, custom members, custom terminal or default terminal
**Then** values are validated and saved.

**Given** a configured CLI path is missing
**When** validation runs
**Then** the app reports the missing path with an actionable correction.

**Given** a custom CLI is configured
**When** a member runtime uses it
**Then** the runtime launches through the configured path without depending on a private AI CLI output format.

### Story 7.7: 聊天终端输出展示偏好

As a workspace owner,
I want to control how terminal output appears in chat,
So that terminal streams are readable without forcing one display style on every workspace.

**Requirements:** FR69.

**Acceptance Criteria:**

**Given** chat terminal output settings are open
**When** the user selects display preference
**Then** terminal output is shown according to that preference in future chat streams.

**Given** terminal output display preference changes
**When** an existing conversation is reopened
**Then** newly received terminal output follows the updated preference without rewriting historical messages.

**Given** the preference fails to save
**When** the user changes the setting
**Then** the app reports the failure and preserves the previous active preference.

### Story 7.8: 聊天数据修复与清空维护

As a workspace owner,
I want to repair or clear current workspace chat data intentionally,
So that damaged or unwanted local chat state can be handled without silent data loss.

**Requirements:** FR70, FR71.

**Acceptance Criteria:**

**Given** the user triggers chat data repair
**When** repair runs
**Then** the app reports repaired items, failed items and any follow-up action.

**Given** the user clears current workspace chat data
**When** they confirm the destructive action
**Then** chat data for that workspace is cleared according to policy and the app records a visible result.

**Given** repair or clear fails
**When** the operation ends
**Then** the app reports the failure, affected scope and next available action without pretending the data changed.

## Epic 8: 诊断、能力标记与发布验收

Epic goal: 用户和维护者可以查看或导出脱敏诊断信息，系统明确功能状态，为三平台发布验收提供依据。

**FRs covered:** FR76, FR77, FR78, FR79.

### Story 8.1: 诊断 run 与核心事件记录

As a maintainer,
I want diagnostic runs to correlate frontend, backend, terminal, chat, member and window events,
So that issues can be investigated from a single timeline.

**Requirements:** FR76.

**Acceptance Criteria:**

**Given** diagnostics are enabled for a run
**When** frontend events, backend events, terminal sessions, conversations, members or window events occur
**Then** records include a diagnostic run id and enough correlation ids to trace the workflow.

**Given** diagnostic logging is disabled by default
**When** normal usage occurs
**Then** the app avoids high-noise or high-sensitive diagnostic output.

**Given** a diagnostic record is written
**When** persistence fails
**Then** the app reports or degrades without breaking the user workflow.

### Story 8.2: 终端快照与聊天一致性诊断

As a maintainer,
I want consistency checks for terminal snapshots and chat state,
So that recovery bugs can be found before release.

**Requirements:** FR77.

**Acceptance Criteria:**

**Given** terminal sessions have snapshots and stream sequences
**When** terminal consistency diagnostics run
**Then** the report identifies missing sequences, stale snapshots or mismatched exit state.

**Given** chat conversations have messages, dispatches and read state
**When** chat consistency diagnostics run
**Then** the report identifies orphaned records, invalid status transitions and unread inconsistencies.

**Given** diagnostics find issues
**When** the user views results
**Then** each issue includes affected entity ids, severity and recommended next action where possible.

### Story 8.3: 查看和导出脱敏诊断信息

As a support-facing user,
I want to view and export diagnostic information safely,
So that problems can be shared without leaking private project data.

**Requirements:** FR78.

**Acceptance Criteria:**

**Given** diagnostic information exists
**When** the user opens diagnostics
**Then** they can view runs, key events, validation reports and consistency summaries.

**Given** the user exports diagnostics
**When** the package is generated
**Then** sensitive paths, tokens, environment variables and private source snippets are removed or the user is warned before export.

**Given** export is long-running
**When** the user cancels or navigates
**Then** the export is interruptible or batched and does not freeze the app.

### Story 8.4: 功能状态标记

As a product owner,
I want implemented, alternative, placeholder and abandoned capabilities to be explicit,
So that MVP scope is not ambiguous for users, maintainers or implementation agents.

**Requirements:** FR79, UX-DR6.

**Acceptance Criteria:**

**Given** a feature is shown in the UI or docs
**When** it is implemented, replaced by an alternative, only a placeholder or explicitly abandoned
**Then** its state is labeled consistently for users and maintainers.

**Given** a placeholder capability is visible
**When** the user attempts to activate it
**Then** the app shows a clear unavailable or future-capability state instead of silently failing or pretending it is complete.

**Given** capability status is reviewed before release
**When** status labels are generated
**Then** every MVP capability is marked implemented, alternative, placeholder or abandoned with a traceable reason.

### Story 8.5: 发布验收清单与三平台 smoke 结果

As a product owner,
I want release readiness and smoke results recorded separately from feature labels,
So that MVP release quality can be checked without overloading the capability-label story.

**Requirements:** FR79, NFR20, NFR35, NFR37, NFR43, NFR44.

**Acceptance Criteria:**

**Given** release readiness is checked
**When** the MVP capability checklist runs
**Then** it verifies workspace open, member invite, message-to-terminal dispatch, terminal output回写, notification jump and restart recovery.

**Given** desktop smoke tests are prepared
**When** release validation runs
**Then** Windows, macOS and Linux smoke coverage is recorded with known issues and blocking failures.

**Given** release notes are prepared
**When** release validation completes
**Then** release notes distinguish feature changes, data/schema changes, breaking changes, security changes and known issues.
