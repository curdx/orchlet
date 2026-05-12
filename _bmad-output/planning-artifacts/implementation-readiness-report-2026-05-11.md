---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
workflowType: 'implementation-readiness'
project_name: 'orchlet'
user_name: '王定旭'
date: '2026-05-11'
status: 'complete'
includedDocuments:
  prd:
    - _bmad-output/planning-artifacts/prd.md
  architecture:
    - _bmad-output/planning-artifacts/architecture.md
  ux:
    - _bmad-output/planning-artifacts/ux-design-specification.md
  epics:
    - _bmad-output/planning-artifacts/epics.md
  research:
    - _bmad-output/planning-artifacts/research/technical-react-cross-platform-desktop-ai-cli-orchestration-architecture-research-2026-05-11.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-05-11
**Project:** orchlet

## Document Discovery

### PRD Files Found

**Whole Documents:**
- `_bmad-output/planning-artifacts/prd.md` (48038 bytes, modified 2026-05-11 12:44:08)

**Sharded Documents:**
- None found.

### Architecture Files Found

**Whole Documents:**
- `_bmad-output/planning-artifacts/architecture.md` (63043 bytes, modified 2026-05-11 12:49:20)

**Sharded Documents:**
- None found.

### Epics & Stories Files Found

**Whole Documents:**
- `_bmad-output/planning-artifacts/epics.md` (63494 bytes, modified 2026-05-11 13:39:11)

**Sharded Documents:**
- None found.

### UX Design Files Found

**Whole Documents:**
- `_bmad-output/planning-artifacts/ux-design-specification.md` (31283 bytes, modified 2026-05-11 13:38:50)

**Sharded Documents:**
- None found.

### Supporting Research Files Found

- `_bmad-output/planning-artifacts/research/technical-react-cross-platform-desktop-ai-cli-orchestration-architecture-research-2026-05-11.md`

### Discovery Issues

- No duplicate whole/sharded document conflicts found.
- No required planning document is missing.

## PRD Analysis

### Functional Requirements

- FR1: 用户可以打开任意本地目录作为工作区。
- FR2: 系统可以为工作区创建、读取和更新项目元数据。
- FR3: 系统可以在工作区不可写时进入只读模式并使用本地应用数据保存必要状态。
- FR4: 用户可以查看、搜索和重新打开最近工作区。
- FR5: 系统可以检测同一工作区或同一项目标识被多个路径打开的冲突，并让用户选择移动或复制语义。
- FR6: 系统可以阻止同一工作区在多个主窗口中重复打开。
- FR7: 用户可以从应用中打开工作区所在的系统文件管理器。
- FR8: 用户可以在主窗口、工作区选择窗口、终端窗口和通知预览窗口之间完成对应任务。
- FR9: 系统可以在多个窗口之间同步工作区上下文、主题、语言和必要导航事件。
- FR10: 系统可以为每个工作区自动补齐默认 owner 成员。
- FR11: 用户可以邀请 assistant 或 member 类型成员加入当前工作区。
- FR12: 用户可以为邀请的成员选择内置 AI CLI、自定义 CLI 或 shell 类型。
- FR13: 用户可以一次邀请多个成员实例，并保留实例数量、权限和隔离标记。
- FR14: 用户可以创建、查看、管理和删除全局联系人。
- FR15: 用户可以从成员或联系人发起私聊。
- FR16: 用户可以查看和修改成员名称、状态和基础资料。
- FR17: 用户可以从成员入口提及成员、打开成员终端或移除成员。
- FR18: 系统可以区分项目成员邀请和管理员/联系人邀请。
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
- FR55: 用户可以导入本地技能文件夹到应用技能库。
- FR56: 用户可以删除和打开本地技能文件夹。
- FR57: 用户可以把应用技能库中的技能链接到当前工作区。
- FR58: 用户可以取消工作区技能链接。
- FR59: 系统可以列出当前工作区已链接技能。
- FR60: 系统可以明确区分本地技能能力、技能商店占位能力和未来远程插件能力。
- FR61: 用户可以创建、编辑、删除和查看路线图任务。
- FR62: 用户可以设置路线图目标、任务状态和完成进度。
- FR63: 用户可以配置显示名称、时区、状态、状态消息和头像。
- FR64: 用户可以上传、删除、重置或选择预设头像。
- FR65: 用户可以选择主题和语言。
- FR66: 用户可以配置桌面通知、声音、仅提及、预览和免打扰时间。
- FR67: 用户可以启用、禁用和查看快捷键配置。
- FR68: 用户可以配置内置 CLI 路径、自定义成员、自定义终端和默认终端。
- FR69: 用户可以配置聊天终端输出流展示偏好。
- FR70: 用户可以触发聊天数据修复。
- FR71: 用户可以清空当前工作区聊天数据。
- FR72: 系统可以持久化全局设置、全局数据、联系人、最近工作区、工作区 registry、头像库、工作区项目数据、聊天数据、技能库和会话缓存。
- FR73: 系统可以创建和维护新版 `.orchlet` 工作区数据、SQLite 聊天数据、设置数据、头像库、联系人、技能链接和最近工作区。
- FR74: 系统可以执行 schema validation 并生成数据完整性报告。
- FR75: 系统可以为关键数据类型记录 schema version 或等价版本信息。
- FR76: 系统可以记录前端事件、后端事件、终端 session、会话、成员、窗口和诊断 run。
- FR77: 系统可以记录终端快照一致性和聊天一致性诊断。
- FR78: 用户可以查看或导出用于问题排查的诊断信息。
- FR79: 系统可以区分已实现功能、替代实现、占位功能和明确放弃功能。

**Total FRs:** 79

### Non-Functional Requirements

- NFR1: 已有本地工作区进入主界面的目标 P95 不超过 3 秒，不包含用户选择目录时间。
- NFR2: 创建或复用终端会话的目标 P95 不超过 2 秒；外部 CLI 缺失或失败时不计入成功延迟，但必须返回可操作错误。
- NFR3: 聊天消息写入本地存储并进入派发队列的目标 P95 不超过 300ms。
- NFR4: 终端高频输出不得阻塞聊天输入、窗口切换、通知交互和终端输入。
- NFR5: 终端输出在高负载下必须保持有序可观察；允许批处理渲染，但不允许丢失关键输出或破坏 attach 后快照一致性。
- NFR6: 通知预览、未读聚合和托盘状态更新不得显著影响终端输出渲染或聊天输入。
- NFR7: schema validation、诊断导出和历史消息分页必须可中断或分批执行，避免长时间冻结主界面。
- NFR8: 工作区、聊天、设置、头像、技能和 registry 数据写入失败时必须返回错误或进入可恢复 fallback，不得静默丢失。
- NFR9: schema 变更必须支持验证、备份或等价安全机制、结果报告和失败项定位。
- NFR10: 任何 schema 变更必须有版本标识和迁移路径。
- NFR11: 终端 session 退出、窗口关闭、应用重启和派发失败必须进入可解释状态。
- NFR12: DND、working queue、重复消息、批量合并和异常退出不得造成消息无限重复派发。
- NFR13: 最近工作区和 workspace registry 冲突处理必须保持 project id 与路径关系可解释。
- NFR14: 默认不上传用户源码、终端输出、聊天记录、工作区路径、头像、技能内容或诊断日志。
- NFR15: 需要网络的能力必须有明确用户意图、配置入口或外部 CLI 自身行为说明。
- NFR16: 系统不得把 AI CLI 输出当作可信指令自动执行，除非用户显式触发对应动作。
- NFR17: 插件和技能能力必须受来源、权限和工作区边界约束。
- NFR18: 诊断导出必须避免无提示泄露敏感路径、token、环境变量或私有源码片段；若无法自动脱敏，必须提示用户。
- NFR19: 桌面 capabilities 或等价权限配置必须按最小权限原则维护。
- NFR20: Windows、macOS、Linux 必须均通过核心 smoke：启动、打开工作区、启动 shell、发送消息、终端输出、通知跳转、关闭重开恢复。
- NFR21: 平台差异必须封装在平台 adapter 或等价边界内，业务能力不得依赖散落的平台判断。
- NFR22: 无边框窗口、托盘、文件管理器打开、PTY、shell 路径、剪贴板和系统主题必须有平台行为说明。
- NFR23: 平台不支持某能力时必须提供降级行为或明确不可用提示。
- NFR24: 外部 CLI 集成必须允许路径配置、存在性检测、启动失败诊断和 custom CLI 扩展。
- NFR25: 系统不得依赖某个 AI CLI 的私有输出格式才能完成核心工作区、聊天和终端能力。
- NFR26: IPC command、event、window mode 和 payload 必须有集中契约和契约测试。
- NFR27: 新版数据 schema 和 storage manifest 必须覆盖 app data、workspace data、chat 数据、头像库、skills 和 registry。
- NFR28: 技能 link/unlink 必须处理 symlink 不可用或权限不足的平台差异。
- NFR29: 核心交互必须可键盘操作，包括聊天输入、会话切换、终端查找、设置保存和通知处理。
- NFR30: 主题和语言切换必须在主窗口和子窗口中保持一致。
- NFR31: 错误提示必须说明发生了什么、影响范围和下一步可执行动作。
- NFR32: 终端和聊天中的文本不得因布局变化而遮挡核心操作。
- NFR33: 应用必须避免营销式落地页作为主入口；打开后优先进入可用工作区体验。
- NFR34: 新版不得原样迁移旧版过重 store 和大型组件结构；业务副作用、领域状态、IPC、持久化和 UI 状态必须有明确边界。
- NFR35: 每个核心能力域必须能追溯到 FR、契约、测试或 capability checklist 项。
- NFR36: 核心 IPC payload、storage schema 和 schema fixtures 必须可被自动化测试使用。
- NFR37: 关键端到端路径至少覆盖打开工作区、邀请成员、发送消息到终端、终端输出回写、通知跳转和重启恢复。
- NFR38: 代码结构必须支持后续 `[CA] bmad-create-architecture` 输出的模块边界和责任划分。
- NFR39: 系统必须能关联 workspace、conversation、message、member、terminal session、window 和 diagnostics run。
- NFR40: 终端快照一致性、聊天一致性、派发状态和数据完整性检查结果必须有可查询诊断记录。
- NFR41: 调试日志必须可按调试开关启用，默认不产生高噪声或高敏感输出。
- NFR42: 用户可导出的诊断包必须足以支持问题定位，同时遵守隐私和脱敏要求。
- NFR43: 发布前必须完成三平台 smoke 和 MVP capability checklist。
- NFR44: 发布说明必须区分功能变化、数据/schema 变化、破坏性变化、安全变化和已知问题。
**Total NFRs:** 44

### Additional Requirements

- 新版 `orchlet` 是 product rebuild：`golutra` 作为功能与 UX 参考，不作为技术实现、旧 redb 数据或旧 `.golutra` schema 的兼容约束。
- 前端方向明确为 React，不使用 Vue；其他语言、桌面容器、数据库、构建链和后端方案以最新稳定高性能架构为准。
- 产品必须是跨平台桌面应用，覆盖 Windows、macOS、Linux，且优先本地能力、PTY、文件系统、多窗口、托盘、通知和系统菜单。
- Phase 0 已被 PRD 定义为先执行技术研究和架构设计，再进入 MVP 实现；当前 planning artifacts 中已包含 technical research 和 architecture 文档。
- MVP 不包含完整 CEO Agent、移动端控制、远程市场、无限智能体网络或自进化 Agent；这些属于后续增长或愿景。
- Capability checklist 是发布门：每个 MVP 范围能力必须标记为通过、替代方案通过或明确放弃。
- AI CLI 输出视为非可信输入，插件/技能能力必须受来源、权限、工作区边界和用户授权约束。
- 核心数据从第一版起必须有 storage manifest、schema version、验证报告、诊断记录和失败恢复路径。

### PRD Completeness Assessment

PRD 已完整覆盖产品目标、用户旅程、桌面项目类型、技术约束、MVP 范围、后续增长、79 条功能需求和 44 条非功能需求。需求粒度足以支撑 epic/story 覆盖校验，且明确了 React、不使用 Vue、跨平台、本地优先、高性能、新 schema、无旧数据兼容负担等关键约束。

主要复杂点不是 PRD 缺失，而是实现范围较大：工作区、聊天、终端、编排、通知、技能、设置、诊断和发布验收都进入 MVP 或发布门。后续校验重点应放在 epics/stories 是否完整承接这些需求，尤其是终端状态机、IPC 契约、storage manifest、UX 按钮级行为、三平台 smoke 和 capability checklist 是否都有可执行故事。

## Epic Coverage Validation

### Epic FR Coverage Extracted

The epics document contains an explicit `FR Coverage Map` covering FR1-FR79, plus story-level `Requirements` references. Unique FR identifiers found in the epics document: 79.

### Coverage Matrix

| FR Number | PRD Requirement | Epic Coverage | Status |
| --- | --- | --- | --- |
| FR1 | 用户可以打开任意本地目录作为工作区。 | Epic 1 - 打开任意本地目录作为工作区。 | Covered |
| FR2 | 系统可以为工作区创建、读取和更新项目元数据。 | Epic 1 - 创建、读取和更新新版工作区元数据。 | Covered |
| FR3 | 系统可以在工作区不可写时进入只读模式并使用本地应用数据保存必要状态。 | Epic 1 - 工作区不可写时进入只读模式并使用应用数据 fallback。 | Covered |
| FR4 | 用户可以查看、搜索和重新打开最近工作区。 | Epic 1 - 查看、搜索和重新打开最近工作区。 | Covered |
| FR5 | 系统可以检测同一工作区或同一项目标识被多个路径打开的冲突，并让用户选择移动或复制语义。 | Epic 1 - 检测 workspace registry 中的路径/项目标识冲突并让用户选择语义。 | Covered |
| FR6 | 系统可以阻止同一工作区在多个主窗口中重复打开。 | Epic 1 - 阻止同一工作区在多个主窗口重复打开。 | Covered |
| FR7 | 用户可以从应用中打开工作区所在的系统文件管理器。 | Epic 1 - 从应用打开工作区所在的系统文件管理器。 | Covered |
| FR8 | 用户可以在主窗口、工作区选择窗口、终端窗口和通知预览窗口之间完成对应任务。 | Epic 1 - 支持主窗口、工作区选择、终端窗口和通知预览窗口的任务入口。 | Covered |
| FR9 | 系统可以在多个窗口之间同步工作区上下文、主题、语言和必要导航事件。 | Epic 1 - 在多窗口间同步工作区上下文、主题、语言和必要导航事件。 | Covered |
| FR10 | 系统可以为每个工作区自动补齐默认 owner 成员。 | Epic 2 - 为每个工作区自动补齐默认 owner 成员。 | Covered |
| FR11 | 用户可以邀请 assistant 或 member 类型成员加入当前工作区。 | Epic 2 - 邀请 assistant 或 member 类型成员加入工作区。 | Covered |
| FR12 | 用户可以为邀请的成员选择内置 AI CLI、自定义 CLI 或 shell 类型。 | Epic 2 - 为成员选择内置 AI CLI、自定义 CLI 或 shell 类型。 | Covered |
| FR13 | 用户可以一次邀请多个成员实例，并保留实例数量、权限和隔离标记。 | Epic 2 - 一次邀请多个成员实例并保留数量、权限和隔离标记。 | Covered |
| FR14 | 用户可以创建、查看、管理和删除全局联系人。 | Epic 2 - 创建、查看、管理和删除全局联系人。 | Covered |
| FR15 | 用户可以从成员或联系人发起私聊。 | Epic 2 - 从成员或联系人发起私聊。 | Covered |
| FR16 | 用户可以查看和修改成员名称、状态和基础资料。 | Epic 2 - 查看和修改成员名称、状态和基础资料。 | Covered |
| FR17 | 用户可以从成员入口提及成员、打开成员终端或移除成员。 | Epic 3 - 从成员入口打开成员终端；成员提及和移除入口在 Epic 2 中提供。 | Covered |
| FR18 | 系统可以区分项目成员邀请和管理员/联系人邀请。 | Epic 2 - 区分项目成员邀请和管理员/联系人邀请。 | Covered |
| FR19 | 用户可以在每个工作区使用默认频道。 | Epic 2 - 在每个工作区使用默认频道。 | Covered |
| FR20 | 用户可以创建群聊并管理群聊成员。 | Epic 2 - 创建群聊并管理群聊成员。 | Covered |
| FR21 | 用户可以创建或复用与成员的私聊会话。 | Epic 2 - 创建或复用与成员的私聊会话。 | Covered |
| FR22 | 用户可以查看会话列表，并根据置顶、时间线和未读状态区分会话。 | Epic 2 - 查看会话列表并区分置顶、时间线和未读状态。 | Covered |
| FR23 | 用户可以发送文本消息并查看消息发送状态。 | Epic 2 - 发送文本消息并查看发送状态。 | Covered |
| FR24 | 用户可以分页加载历史消息。 | Epic 2 - 分页加载历史消息。 | Covered |
| FR25 | 用户可以对会话进行置顶、静音、重命名、清空和删除。 | Epic 2 - 对会话置顶、静音、重命名、清空和删除。 | Covered |
| FR26 | 系统可以维护会话未读计数和已读位置。 | Epic 2 - 维护会话未读计数和已读位置。 | Covered |
| FR27 | 用户可以在消息中提及指定成员。 | Epic 2 - 在消息中提及指定成员。 | Covered |
| FR28 | 系统可以对 `@all` 行为提供明确实现或明确的产品放弃记录。 | Epic 2 - 明确实现或明确放弃 `@all` 行为。 | Covered |
| FR29 | 用户可以使用 emoji 搜索和最近使用记录。 | Epic 2 - 支持 emoji 搜索和最近使用记录。 | Covered |
| FR30 | 用户可以查看图片附件和 roadmap 附件入口。 | Epic 2 - 查看图片附件和 roadmap 附件入口。 | Covered |
| FR31 | 用户可以使用快捷提示生成或插入常用协作消息。 | Epic 2 - 使用快捷提示生成或插入常用协作消息。 | Covered |
| FR32 | 系统可以把终端输出作为聊天消息或聊天流显示。 | Epic 4 - 将终端输出作为聊天消息或聊天流显示。 | Covered |
| FR33 | 用户可以为工作区打开或复用独立终端窗口。 | Epic 3 - 为工作区打开或复用独立终端窗口。 | Covered |
| FR34 | 用户可以创建、关闭、恢复和搜索终端 tab。 | Epic 3 - 创建、关闭、恢复和搜索终端 tab。 | Covered |
| FR35 | 用户可以固定、排序和移动终端 tab。 | Epic 3 - 固定、排序和移动终端 tab。 | Covered |
| FR36 | 用户可以在单 pane、左右分屏、上下分屏和 2x2 布局中组织终端。 | Epic 3 - 使用单 pane、左右分屏、上下分屏和 2x2 布局组织终端。 | Covered |
| FR37 | 用户可以把终端 tab 分配到不同 pane。 | Epic 3 - 将终端 tab 分配到不同 pane。 | Covered |
| FR38 | 用户可以在终端中输入、选择、复制、清除和查找文本。 | Epic 3 - 在终端中输入、选择、复制、清除和查找文本。 | Covered |
| FR39 | 用户可以设置终端查找选项。 | Epic 3 - 设置终端查找选项。 | Covered |
| FR40 | 系统可以创建、附加、写入、调整大小和关闭终端会话。 | Epic 3 - 创建、附加、写入、调整大小和关闭终端会话。 | Covered |
| FR41 | 系统可以列出可用终端环境并解析用户配置的 CLI 路径。 | Epic 3 - 列出可用终端环境并解析用户配置的 CLI 路径。 | Covered |
| FR42 | 系统可以为终端会话维护状态、快照和退出原因。 | Epic 3 - 维护终端会话状态、快照和退出原因。 | Covered |
| FR43 | 系统可以在窗口重开或 tab attach 时恢复终端可观察状态。 | Epic 3 - 在窗口重开或 tab attach 时恢复终端可观察状态。 | Covered |
| FR44 | 系统可以在终端资源受限或启动失败时给出可恢复提示。 | Epic 3 - 在终端资源受限或启动失败时给出可恢复提示。 | Covered |
| FR45 | 用户可以从聊天消息向指定成员终端派发任务。 | Epic 4 - 从聊天消息向指定成员终端派发任务。 | Covered |
| FR46 | 系统可以根据 mention、成员状态和会话上下文确定派发目标。 | Epic 4 - 根据 mention、成员状态和会话上下文确定派发目标。 | Covered |
| FR47 | 系统可以在成员免打扰时跳过派发并保留用户可见状态。 | Epic 4 - 成员免打扰时跳过派发并保留用户可见状态。 | Covered |
| FR48 | 系统可以在成员忙碌时排队派发，并在可用后继续处理。 | Epic 4 - 成员忙碌时排队派发并在可用后继续处理。 | Covered |
| FR49 | 系统可以识别重复消息并避免重复派发。 | Epic 4 - 识别重复消息并避免重复派发。 | Covered |
| FR50 | 系统可以合并同上下文的连续派发。 | Epic 4 - 合并同上下文的连续派发。 | Covered |
| FR51 | 系统可以将终端输出、终端状态和消息状态同步回聊天与成员视图。 | Epic 4 - 将终端输出、终端状态和消息状态同步回聊天与成员视图。 | Covered |
| FR52 | 系统可以聚合当前窗口和工作区未读状态。 | Epic 5 - 聚合当前窗口和工作区未读状态。 | Covered |
| FR53 | 用户可以从通知预览打开全部未读、指定会话或指定成员终端。 | Epic 5 - 从通知预览打开全部未读、指定会话或指定成员终端。 | Covered |
| FR54 | 用户可以忽略全部未读通知。 | Epic 5 - 忽略全部未读通知。 | Covered |
| FR55 | 用户可以导入本地技能文件夹到应用技能库。 | Epic 6 - 导入本地技能文件夹到应用技能库。 | Covered |
| FR56 | 用户可以删除和打开本地技能文件夹。 | Epic 6 - 删除和打开本地技能文件夹。 | Covered |
| FR57 | 用户可以把应用技能库中的技能链接到当前工作区。 | Epic 6 - 将应用技能库中的技能链接到当前工作区。 | Covered |
| FR58 | 用户可以取消工作区技能链接。 | Epic 6 - 取消工作区技能链接。 | Covered |
| FR59 | 系统可以列出当前工作区已链接技能。 | Epic 6 - 列出当前工作区已链接技能。 | Covered |
| FR60 | 系统可以明确区分本地技能能力、技能商店占位能力和未来远程插件能力。 | Epic 6 - 区分本地技能能力、技能商店占位能力和未来远程插件能力。 | Covered |
| FR61 | 用户可以创建、编辑、删除和查看路线图任务。 | Epic 6 - 创建、编辑、删除和查看路线图任务。 | Covered |
| FR62 | 用户可以设置路线图目标、任务状态和完成进度。 | Epic 6 - 设置路线图目标、任务状态和完成进度。 | Covered |
| FR63 | 用户可以配置显示名称、时区、状态、状态消息和头像。 | Epic 7 - 配置显示名称、时区、状态、状态消息和头像。 | Covered |
| FR64 | 用户可以上传、删除、重置或选择预设头像。 | Epic 7 - 上传、删除、重置或选择预设头像。 | Covered |
| FR65 | 用户可以选择主题和语言。 | Epic 7 - 选择主题和语言。 | Covered |
| FR66 | 用户可以配置桌面通知、声音、仅提及、预览和免打扰时间。 | Epic 7 - 配置桌面通知、声音、仅提及、预览和免打扰时间。 | Covered |
| FR67 | 用户可以启用、禁用和查看快捷键配置。 | Epic 7 - 启用、禁用和查看快捷键配置。 | Covered |
| FR68 | 用户可以配置内置 CLI 路径、自定义成员、自定义终端和默认终端。 | Epic 7 - 配置内置 CLI 路径、自定义成员、自定义终端和默认终端。 | Covered |
| FR69 | 用户可以配置聊天终端输出流展示偏好。 | Epic 7 - 配置聊天终端输出流展示偏好。 | Covered |
| FR70 | 用户可以触发聊天数据修复。 | Epic 7 - 触发聊天数据修复。 | Covered |
| FR71 | 用户可以清空当前工作区聊天数据。 | Epic 7 - 清空当前工作区聊天数据。 | Covered |
| FR72 | 系统可以持久化全局设置、全局数据、联系人、最近工作区、工作区 registry、头像库、工作区项目数据、聊天数据、技能库和会话缓存。 | Epic 1 - 持久化全局设置、全局数据、联系人、最近工作区、registry、头像库、工作区项目数据、聊天数据、技能库和会话缓存的 storage manifest。 | Covered |
| FR73 | 系统可以创建和维护新版 `.orchlet` 工作区数据、SQLite 聊天数据、设置数据、头像库、联系人、技能链接和最近工作区。 | Epic 1 - 创建和维护新版 `.orchlet` 工作区数据、SQLite 聊天数据、设置数据、头像库、联系人、技能链接和最近工作区。 | Covered |
| FR74 | 系统可以执行 schema validation 并生成数据完整性报告。 | Epic 1 - 执行 schema validation 并生成数据完整性报告。 | Covered |
| FR75 | 系统可以为关键数据类型记录 schema version 或等价版本信息。 | Epic 1 - 为关键数据类型记录 schema version 或等价版本信息。 | Covered |
| FR76 | 系统可以记录前端事件、后端事件、终端 session、会话、成员、窗口和诊断 run。 | Epic 8 - 记录前端事件、后端事件、终端 session、会话、成员、窗口和诊断 run。 | Covered |
| FR77 | 系统可以记录终端快照一致性和聊天一致性诊断。 | Epic 8 - 记录终端快照一致性和聊天一致性诊断。 | Covered |
| FR78 | 用户可以查看或导出用于问题排查的诊断信息。 | Epic 8 - 查看或导出用于问题排查的诊断信息。 | Covered |
| FR79 | 系统可以区分已实现功能、替代实现、占位功能和明确放弃功能。 | Epic 8 - 区分已实现功能、替代实现、占位功能和明确放弃功能。 | Covered |

### Missing Requirements

No missing FR coverage found. The epics document claims coverage for every PRD FR from FR1 through FR79.

No FR identifiers appear in epics that are outside the PRD FR range.

### Coverage Statistics

- Total PRD FRs: 79
- FRs covered in epics: 79
- FRs missing from epics: 0
- FR identifiers in epics but not PRD: 0
- Coverage percentage: 100%

### Coverage Notes

- FR17 spans two interaction surfaces: member mention/remove entry is described in Epic 2 acceptance criteria, while opening the member terminal is assigned to Epic 3. This is acceptable for epic-level coverage, but later story-quality validation should ensure FR17 remains traceable at story level instead of only in prose.
- FR28 is covered as an explicit implementation-or-abandonment decision for `@all`; readiness depends on implementation preserving that decision path rather than treating `@all` as silently unsupported.

## UX Alignment Assessment

### UX Document Status

Found: `_bmad-output/planning-artifacts/ux-design-specification.md`

Status: complete, screen-and-button-level interaction specification. The document covers first launch, workspace selection, main shell, chat workbench, members, invitation and management modals, friends, terminal window, roadmap, skill management, skill store, plugin marketplace placeholder, settings, notification preview, responsive/accessibility rules, and empty/loading/error states.

### UX To PRD Alignment

| UX Area | PRD Support | Assessment |
| --- | --- | --- |
| Workspace selection, recent workspaces, conflict modal, read-only banner | FR1-FR7, FR72-FR75, NFR8-NFR13 | Aligned. UX adds button-level details for open folder, recent search, conflict choices and read-only feedback. |
| Main shell, titlebar, window modes and navigation | FR8-FR9, NFR20-NFR23, NFR30, NFR33 | Aligned. UX directly maps main, workspace-selection, terminal and notification-preview windows. |
| Chat sidebar, messages, input, mentions, emoji, attachments and quick prompts | FR19-FR32, NFR29-NFR33 | Aligned. UX provides implementation-level behavior for send, loading history, `@mention`, `@all`, emoji, attachment and message state. |
| Members, contacts, invite flows and member action menu | FR10-FR18 | Mostly aligned. Project member, assistant/member invite, contacts, private chat, status and terminal entry match PRD. Admin invite details require scoping, noted below. |
| Terminal window, tabs, panes, find overlay and status overlays | FR33-FR44, NFR1-NFR7, NFR20-NFR24, NFR32 | Aligned. UX supports terminal-heavy workflows and explicitly avoids clipping/overlap. |
| Dispatch and terminal output loop | FR32, FR45-FR51, NFR11-NFR12, NFR24-NFR26 | Aligned through chat input, member terminal actions, stop generation and terminal output display preferences. |
| Notifications and tray preview | FR52-FR54, NFR6, NFR30-NFR31 | Aligned. UX specifies row click, open terminal, open all terminals, ignore all and view all behavior. |
| Skills, skill store and plugin marketplace | FR55-FR60, FR79 | Aligned only if store/plugin remote capabilities remain visibly placeholder in MVP. UX states this, implementation must preserve it. |
| Roadmap modal | FR61-FR62 | Aligned. UX defines objective, task CRUD, status and progress interactions. |
| Settings and personalization | FR63-FR71 | Mostly aligned. Profile, avatar, theme, language, notifications, shortcuts, CLI paths and data repair/clear are aligned. Account/team controls require placeholder/defer handling. |
| Accessibility, keyboard and empty/loading/error states | NFR29-NFR33 | Aligned. UX adds detailed keyboard and aria requirements beyond PRD wording. |

### UX To Architecture Alignment

| UX Need | Architecture Support | Assessment |
| --- | --- | --- |
| React implementation, no Vue carry-over | React + TypeScript, feature-sliced `pages/widgets/features/entities/shared`, no old Vue/Pinia copying | Supported. |
| Multiple window modes | Typed window mode, Tauri capabilities for main/terminal/workspace-selection/notification-preview | Supported. |
| Button-level IPC actions | `src/shared/api` typed facade, Rust `gateway`, `contracts`, `ts-rs` generated types | Supported. |
| Terminal UI performance | Rust-owned PTY, xterm renderer adapter, seq/ACK/snapshot, terminal hot path outside React state | Supported. |
| Chat/message/settings/skills async state | TanStack Query for IPC-backed async state, Zustand for ephemeral UI state | Supported. |
| Toast/error feedback | Shared `AppError` envelope with `message`, `severity`, `recoverable`, `userAction`, `correlationId` | Supported. |
| Clipboard, file manager, tray, notification, dialogs | Desktop/platform adapters and window-specific capabilities | Supported. |
| Long lists and high-frequency updates | Virtualization, batching, channels/progress for long-running jobs | Supported. |
| Placeholder and capability status labels | Capability governance and FR79 supported by Epic 8 | Supported, but implementation must apply it consistently to UI. |

### Alignment Issues

1. Admin invitation modal has server/account/billing implications.
   - UX includes `重新生成邀请链接`, `复制链接`, `完全服务器权限`, `账单权限`, `成员管理`.
   - PRD only requires distinguishing project member invite and administrator/contact invite (FR18), while architecture explicitly says MVP has no product authentication and uses local profile only.
   - Impact: if implemented literally, it introduces unplanned account/server/billing scope.
   - Recommendation: In MVP, treat Admin invite as local/contact/project-role placeholder or remove server/billing permissions from implementation stories until authentication/team architecture exists.

2. Settings includes account/team controls beyond MVP architecture.
   - UX includes `更改邮箱`, `退出账号`, `新建团队`, `退出团队`.
   - Architecture says no product authentication in MVP; PRD does not require team/account management.
   - Impact: these controls could mislead users or force unplanned backend/account work.
   - Recommendation: mark as placeholder/unavailable in MVP, or hide until a future account/team architecture decision is made.

3. Skill Store and Plugin Marketplace must remain explicit placeholders where remote functionality is not implemented.
   - UX correctly says plugin marketplace is future/placeholder and store data is empty/placeholder, but also lists remote-looking actions such as sync URL, install and import plugin.
   - Architecture supports local skills and future plugin boundaries, not a complete remote plugin marketplace.
   - Impact: accidental implementation could expand scope and security surface.
   - Recommendation: bind these controls to FR60/FR79 capability labels; disable or placeholder any remote install/sync/import behavior in MVP.

4. Icon library requirement is in UX but not explicitly named in architecture.
   - UX requires lucide icons and aria-label/tooltips for icon-only buttons.
   - Architecture has `shared/ui` primitives but does not explicitly call out lucide.
   - Impact: low; implementation consistency risk.
   - Recommendation: add lucide-react to frontend dependency/story checklist during project initialization or first UI primitive story.

### Warnings

- The UX spec frontmatter shows `stepsCompleted` as `[1, 2, 10, 11, 12, 13, 14]` while status is `complete`. Content is sufficiently detailed for readiness, but metadata is not a clean sequential workflow record.
- UX contains dense button-level scope. Implementation should avoid turning every placeholder from the reference project into MVP functionality; use FR60/FR79 labels to keep future/placeholder features honest.

### UX Alignment Summary

UX is present and materially improves implementation readiness. It is aligned with PRD and Architecture for core MVP workflows: workspace open, chat, members, terminal, dispatch, notifications, settings, skills, roadmap, accessibility and error states.

No critical UX blocker found. The readiness risk is scope hygiene: account/team/admin/server-like controls, skill store remote controls and plugin marketplace actions must be explicitly placeholder/deferred unless new PRD and architecture decisions add those systems.

## Epic Quality Review

### Review Scope

- Epics reviewed: 8
- Stories reviewed: 44
- Story format check: all 44 stories include user-story framing (`As a`, `I want`, `So that`), a `Requirements` line, an `Acceptance Criteria` section, and BDD-style Given/When/Then criteria.
- FR traceability check: all stories reference PRD FRs or explicit UX/additional requirements.

### Epic Structure Validation

| Epic | User Value Focus | Independence | Assessment |
| --- | --- | --- | --- |
| Epic 1: 工作区启动、新数据底座与多窗口外壳 | Strong but partly foundational | Stands alone | Acceptable. It gives users workspace open/recent/read-only/window shell value. Storage/schema foundation is justified but must not create all future data tables upfront. |
| Epic 2: 成员、联系人与协作聊天 | Strong | Depends only on Epic 1 | Acceptable. Delivers usable collaboration chat without needing future epics. |
| Epic 3: 可恢复的终端工作区 | Strong | Depends on Epic 1 and benefits from Epic 2 member data | Acceptable. Terminal window and shell tabs are useful on their own; member terminal entry uses prior member work. |
| Epic 4: 聊天到终端的任务派发闭环 | Strong | Depends on Epic 2 chat and Epic 3 terminal | Acceptable. No forward dependency; it composes already-built chat and terminal. |
| Epic 5: 通知预览与跨窗口回到上下文 | Strong | Depends on prior chat/terminal/unread state | Acceptable. No forward dependency. |
| Epic 6: 本地技能库与路线图协作 | Strong | Depends only on workspace/storage baseline | Acceptable. Local skills and roadmap deliver independent workspace value. |
| Epic 7: 个人设置、通知偏好与 CLI 配置 | Strong | Depends on workspace/profile/settings storage | Acceptable. Settings are user-facing and support prior features. |
| Epic 8: 诊断、能力标记与发布验收 | Maintainer/product-owner value | Depends on prior capabilities for full validation | Borderline but acceptable. It is not purely technical because diagnostics, export and capability state are explicit PRD requirements. Story 8.4 is too broad and should be split. |

### Dependency Analysis

No forward dependencies were found. Later epics depend only on earlier capabilities:

- Epic 2 uses Epic 1 workspace/data foundation.
- Epic 3 can use Epic 1 workspace and Epic 2 member data for member terminal entry.
- Epic 4 uses Epic 2 chat and Epic 3 terminal.
- Epic 5 uses chat/terminal/unread state from Epics 2-4.
- Epic 6 and Epic 7 use workspace/settings/data foundations.
- Epic 8 validates and reports across capabilities already introduced.

Within-epic dependencies are generally sequential and backward-looking. No story explicitly requires a later story to be complete.

### Starter Template And Greenfield Checks

- Starter template requirement: satisfied by Story 1.1. It explicitly requires `pnpm create tauri-app orchlet --template react-ts --manager pnpm --identifier com.orchlet.app --tauri-version 2` and the React + TypeScript + Vite + Tailwind CSS v4 + Tauri 2 + Rust baseline.
- Greenfield/new-schema setup: partially satisfied. Story 1.1 initializes the project and Story 1.6 starts storage/schema governance.
- CI/test scaffolding early: not sufficiently represented as an early story. Architecture says the first phase should add contract fixtures, schema/data fixtures, terminal spike and CI/test scaffolding before broad UI implementation, but epics currently place release/smoke validation mostly in Epic 8 and only list CI/test scaffolding as an additional requirement.

### Critical Violations

None found.

No epic is a pure technical milestone such as “build API” or “set up database” with no user or maintainer value. No forward dependency was found.

### Major Issues

1. Early CI/test scaffolding is missing as an implementable foundation story.
   - Evidence: Epics include an additional requirement for frontend tests, Rust tests, contract tests, schema/data fixtures and desktop smoke structure, but there is no early Story 1.x dedicated to setting this up.
   - Impact: implementation may start broad UI work before contract/schema/terminal/smoke guardrails exist, increasing regression and AI-agent inconsistency risk.
   - Recommendation: add a Story 1.7 or expand Story 1.1 into a separate foundation story covering Vitest, Rust test harness, contract fixture test, schema/data fixture test, Playwright/Tauri smoke structure and CI workflow skeleton.

2. Story 1.6 risks violating incremental database/entity creation.
   - Evidence: Story 1.6 says every persisted data category has a storage manifest entry and schema/version marker, including contacts, chat data, skills and session cache before those features are introduced.
   - Impact: this can become an upfront “create all storage/tables” milestone, which conflicts with the recommended pattern that each story creates only the data structures it needs when first used.
   - Recommendation: narrow Story 1.6 to storage manifest framework plus workspace/recent/registry/schema validation foundation. Add acceptance criteria to later domain stories requiring them to add their own SQLite tables, manifest entries, migrations and fixtures when first introduced.

3. Story 8.4 is too broad for a single story.
   - Evidence: it combines feature status labels, MVP capability checklist verification, desktop smoke coverage and release known-issue tracking.
   - Impact: story may be hard to estimate, hard to complete independently and easy to mark done without fully validating release readiness.
   - Recommendation: split into at least two stories: capability state labeling/reporting, and release readiness checklist/smoke result recording.

4. Story 7.7 mixes unrelated implementation concerns.
   - Evidence: the same story covers chat terminal output display preference, chat data repair and destructive chat data clearing.
   - Impact: combines low-risk preference UI with higher-risk data maintenance/destructive operations, making testing and rollback less clear.
   - Recommendation: split into one story for stream output display preference and one story for chat repair/clear data maintenance.

### Minor Concerns

1. FR17 story-level traceability is split and slightly inconsistent.
   - Evidence: FR17 includes mention member, open member terminal and remove member. Story 3.1 lists FR17 for opening member terminal; Story 2.2 acceptance criteria includes mention/remove but its `Requirements` line lists only FR13 and FR16.
   - Recommendation: add FR17 to Story 2.2 requirements or split member action menu behavior into an explicit story that references FR17.

2. Story 2.7 is large but cohesive.
   - Evidence: it covers mentions, `@all`, emoji, image/roadmap attachment entry and shortcut prompts.
   - Recommendation: acceptable as a composition-helper story, but implementation planning should split tasks internally if UI primitives or tests become too large.

3. Epic 8 is maintainer-facing rather than end-user-facing.
   - Evidence: diagnostics and release validation primarily serve maintainers/product owners.
   - Recommendation: acceptable because FR76-FR79 explicitly require these capabilities; keep acceptance criteria tied to user-visible diagnostics/export and release gates.

### Database And Entity Timing Assessment

The current epics mostly allow per-story data creation, but Story 1.6 needs tightening to avoid front-loading all tables and schema entries. The safer pattern is:

- Story 1.2/1.3/1.4 create workspace metadata, recent workspace and registry storage.
- Story 2.x creates member/contact/chat/conversation/message tables when those domains first appear.
- Story 3.x creates terminal session metadata/snapshot structures when terminal first appears.
- Story 4.x creates outbox/dispatch records when dispatch first appears.
- Story 6.x creates skill/roadmap structures when those domains first appear.
- Story 8.x creates diagnostics/capability checklist records when diagnostics and release gates first appear.

### Best Practices Compliance Checklist

| Check | Status |
| --- | --- |
| Epics deliver user or maintainer value | Pass |
| No pure technical epics | Pass |
| No forward dependencies | Pass |
| Story user-story framing present | Pass |
| Acceptance criteria use testable BDD structure | Pass |
| FR traceability maintained | Pass with minor FR17 cleanup |
| Story sizing appropriate | Needs revision for Story 8.4 and Story 7.7 |
| Database/schema created when needed | Needs revision for Story 1.6 |
| Starter template story present | Pass |
| Early CI/test scaffolding story present | Needs revision |

### Epic Quality Summary

The epic set is structurally strong and largely implementation-ready, but it should not be considered clean until the four major issues are addressed or explicitly accepted:

- add early CI/test/fixture/smoke scaffolding story;
- narrow Story 1.6 to avoid upfront all-domain storage creation;
- split Story 8.4;
- split or scope Story 7.7.

## Summary and Recommendations

### Overall Readiness Status

**NEEDS WORK**

The planning set is close, but not clean enough for disciplined implementation handoff. PRD, UX, Architecture and Epics all exist; FR coverage is 100%; architecture is coherent and matches the requested React/no-Vue/cross-platform/local-first direction. The blocker is not product vision or architecture. The blocker is story-level implementation hygiene: a few stories are too broad or place foundation work too late/too early.

Proceeding directly to implementation is possible, but it would create avoidable risk in the first sprint. The correct next action is a focused epics/story cleanup pass, not another architecture rewrite.

### Key Positive Findings

- Required planning documents are present: PRD, Architecture, UX specification, Epics/Stories and technical research.
- PRD is complete enough for implementation planning: 79 FRs and 44 NFRs extracted.
- Epic FR coverage is complete: 79/79 PRD FRs covered, 100% coverage.
- UX is detailed at screen/button level and aligned with the core PRD/Architecture flows.
- Architecture is aligned with the user's stated constraints: React, no Vue, Windows/macOS/Linux, Tauri 2 + Rust, SQLite/rusqlite, typed IPC, Rust-owned PTY, xterm rendering, TanStack Query and Zustand boundaries.
- No critical epic-quality violation was found: no pure technical epics and no forward dependencies.

### Critical Issues Requiring Immediate Action

No critical issues were found.

### Issues Requiring Attention

**Significant issues:** 8

1. Admin invitation UX implies server/account/billing concepts that are not in MVP architecture.
2. Settings UX includes account/team controls beyond local-profile MVP.
3. Skill Store and Plugin Marketplace controls must stay disabled/placeholder unless new architecture is added.
4. UX requires lucide icons, but architecture/stories do not explicitly add the dependency.
5. Early CI/test/fixture/smoke scaffolding is missing as an implementable Story 1.x.
6. Story 1.6 may front-load all future storage/schema categories instead of adding schema per domain story.
7. Story 8.4 is too broad and should be split.
8. Story 7.7 mixes stream display preference with risky chat repair/clear operations.

**Minor issues/warnings:** 5

1. FR17 is traceable at epic level, but story-level traceability should add FR17 to Story 2.2 or split member action behavior.
2. Story 2.7 is large but cohesive; split internally during tasking if needed.
3. Epic 8 is maintainer/product-owner-facing, acceptable because PRD explicitly requires diagnostics and release gates.
4. UX workflow frontmatter is not sequential even though content is complete.
5. Placeholder-heavy UX areas must be guarded by FR60/FR79 labels during implementation.

### Recommended Next Steps

1. Edit `_bmad-output/planning-artifacts/epics.md` before sprint implementation:
   - add early Story 1.7 for CI/test/contract/schema/terminal smoke scaffolding;
   - narrow Story 1.6 to storage manifest framework plus workspace/recent/registry/schema foundation;
   - split Story 8.4 into capability state labeling and release readiness/smoke recording;
   - split Story 7.7 into terminal output preference and chat data repair/clear maintenance;
   - add FR17 to Story 2.2 or create a dedicated member action menu story.

2. Tighten UX scope before implementation:
   - mark Admin invite server/billing/link controls as placeholder or remove them from MVP UI;
   - mark `更改邮箱`, `退出账号`, `新建团队`, `退出团队` as placeholder/unavailable or hide them;
   - keep Skill Store remote sync/install and Plugin Marketplace install/import disabled with explicit placeholder labels.

3. Add one frontend foundation decision to the implementation checklist:
   - include `lucide-react` or an equivalent explicit icon dependency in the initial frontend/UI primitive story;
   - require `aria-label` and tooltip on all icon-only buttons.

4. Preserve the selected architecture:
   - do not re-open the stack decision unless the early terminal/WebView smoke fails;
   - keep React/Tauri/Rust/SQLite/typed IPC as the implementation baseline;
   - run terminal-heavy smoke early on at least one non-macOS platform before broad terminal UI work.

5. Re-run implementation readiness after the epics cleanup pass.

### Final Note

This assessment identified 13 issues across UX scope, epic/story quality and workflow metadata. There are 0 critical blockers, 8 significant issues and 5 minor issues/warnings.

The project is **not blocked by architecture**. The selected architecture is strong and matches the user's “latest, high-performance, React, cross-platform, no legacy compatibility” direction. The project is blocked only by a small set of story hygiene fixes that should be handled before handing work to implementation agents.

**Assessor:** Codex using `bmad-check-implementation-readiness`  
**Assessment Date:** 2026-05-11
