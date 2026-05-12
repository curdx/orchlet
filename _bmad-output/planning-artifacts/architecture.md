---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/research/technical-react-cross-platform-desktop-ai-cli-orchestration-architecture-research-2026-05-11.md
  - docs/index.md
  - docs/rebuild/project-overview.md
  - docs/rebuild/feature-inventory.md
  - docs/rebuild/current-architecture.md
  - docs/rebuild/ipc-events-and-contracts.md
  - docs/rebuild/data-and-storage.md
  - docs/rebuild/source-tree-analysis.md
  - docs/rebuild/modernization-blueprint.md
  - docs/rebuild/parity-checklist.md
  - docs/rebuild/project-scan-report.json
  - /Users/wdx/opc/golutra/README.md
  - /Users/wdx/opc/golutra/startup_processmd.md
  - /Users/wdx/opc/golutra/SECURITY.md
  - /Users/wdx/opc/golutra/package.json
  - /Users/wdx/opc/golutra/src-tauri/Cargo.toml
  - /Users/wdx/opc/golutra/src-tauri/tauri.conf.json
  - /Users/wdx/opc/golutra/metadata.json
  - /Users/wdx/opc/golutra/tsconfig.json
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-05-11'
project_name: 'orchlet'
user_name: '王定旭'
date: '2026-05-11'
documentCounts:
  productBriefs: 0
  prd: 1
  uxDesign: 0
  research: 1
  projectDocs: 15
  projectContext: 0
  referenceProjectDocs: 10
classification:
  projectType: desktop_app
  domain: developer_productivity_ai_orchestration
  projectContext: brownfield_rebuild
  frontendRequirement: React
  frontendExclusion: Vue
  platformRequirement: Windows_macOS_Linux
  optimizationGoal: latest_stable_high_performance_architecture
  dataCompatibility: greenfield_new_schema_no_legacy_migration
---

# Architecture Decision Document - orchlet

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

PRD 定义了 79 条功能需求，覆盖 8 个主要能力域。架构上需要把这些能力拆成可独立实现、可测试、可追踪的本地模块，而不是把旧版 Vue/Pinia 的 store 与组件逻辑原样迁移到 React。

- 工作区与应用壳：打开任意本地目录、维护 `.orchlet` 元数据、最近工作区、workspace registry、只读 fallback、多窗口去重、文件管理器打开、主窗口/工作区选择/终端/通知预览四类窗口。
- 成员、联系人与邀请：owner 自动补齐、assistant/member 邀请、内置 AI CLI、自定义 CLI、shell、联系人、实例数量、权限标记、成员状态和成员操作。
- 会话与消息：默认频道、私聊、群聊、会话列表、消息发送/分页/状态、pin/mute/rename/clear/delete、未读、emoji、mention、附件、终端输出回写。
- 终端工作区：独立终端窗口、tab、pane、搜索、pin、拖拽、xterm 渲染、PTY create/attach/write/resize/close、CLI path 解析、snapshot、ACK 流控、异常退出恢复。
- Agent 编排与通知：聊天到终端派发、mention 目标解析、DND 跳过、working queue、去重、批量合并、终端/消息状态同步、未读聚合、托盘预览和通知跳转。
- 技能、插件与路线图：本地技能库导入/删除/打开、workspace 技能 link/unlink、Skill Store/Plugin Marketplace 占位边界、roadmap task/objective/progress。
- 设置与个性化：账户、头像、主题、语言、通知、快捷键、终端路径、自定义成员、自定义终端、默认终端、chat streamOutput、数据修复和清空。
- 数据、schema、诊断与发布：全局设置、联系人、recent workspaces、registry、头像、workspace project data、聊天数据、技能库、新 schema、数据完整性报告、诊断导出和三平台发布。

**Non-Functional Requirements:**

PRD 定义了 44 条非功能需求，对架构有直接约束：

- 性能：已有工作区进入主界面 P95 <= 3s；终端 create/reuse P95 <= 2s；聊天消息写入并入派发队列 P95 <= 300ms；终端高频输出不能阻塞聊天、窗口、通知和终端输入。
- 可靠性与数据完整性：写入失败必须可见或进入 fallback；schema 变更必须支持验证、备份/等价安全机制、报告和失败定位；schema 变更必须有版本与演进路径。
- 安全与隐私：默认不上传源码、终端输出、聊天、路径、头像、技能或诊断；AI CLI 输出不可信；插件/技能必须受权限边界约束；诊断导出必须脱敏或提示。
- 跨平台：Windows、macOS、Linux 均需通过启动、打开工作区、启动 shell、发送消息、终端输出、通知跳转、关闭重开恢复 smoke；平台差异必须封装在 adapter 层。
- 集成与兼容：外部 CLI 必须支持路径配置、存在性检测、启动失败诊断和 custom CLI；IPC command/event/window mode/payload 必须集中契约化并有契约测试；新版数据 schema 和 storage manifest 必须覆盖现有能力清单。
- 可维护与可测试：不得延续旧版过重 store 和大型组件；核心能力必须追溯到 FR/NFR、契约、测试或 capability checklist；关键端到端路径必须自动化覆盖。
- 可观察性：workspace、conversation、message、member、terminal session、window、diagnostics run 必须可关联；终端快照、聊天一致性、派发状态、数据完整性检查结果必须可查询。
- 发布：发布前必须完成三平台 smoke 和 MVP capability checklist；发布说明必须区分功能、数据/schema、破坏、安全和已知问题。

**Scale & Complexity:**

- Primary domain: 跨平台本地桌面开发者工具 / AI CLI 多智能体编排 / 本地优先协作系统。
- Complexity level: 高复杂度。复杂度来自本地系统集成、PTY、跨窗口事件、新数据 schema、终端流控、通知托盘、能力验收和三平台发布，而不是来自云服务规模。
- Estimated architectural components: 14 个左右，包括 app shell/window、workspace、member/contact、chat、terminal、orchestration/outbox、notification/tray、settings/profile、skills/plugins、roadmap、storage/schema、diagnostics、contracts/IPC、platform/release。

### Technical Constraints & Dependencies

- React 是硬性前端方向，Vue 明确排除。旧版 Vue/Pinia 只能作为行为参考，不作为目标结构。
- 产品必须是 Windows/macOS/Linux 跨平台桌面应用，并以本地优先为默认运行模式。
- `golutra` 是功能参考和产品行为样本；新版可以重做内部架构和数据结构，但不能遗漏已列入 capability checklist 的核心能力，除非明确记录放弃原因。
- 桌面系统能力必须包括多窗口、托盘、通知预览、文件系统、剪贴板、系统文件管理器、PTY、shell/CLI path、安装包和可选更新。
- 旧数据兼容不是 MVP 约束：新版默认创建 `.orchlet` 工作区元数据和全新的 SQLite schema，不读取旧 redb、旧 app data 或旧 `.golutra` 作为发布前提。
- IPC command、channel、event、window mode、payload、storage schema 必须集中定义并可测试；功能代码不能散落硬编码系统调用。
- 终端 session 必须是单一事实源，支持 output seq、ACK、snapshot attach、dispatch queue、DND、working 状态、异常退出和资源限制提示。
- 技术研究建议后续决策重点评估 Tauri/Rust、React/TypeScript、Vite、Tailwind、xterm、portable-pty、SQLite、typed IPC 生成、Vitest/Playwright/Rust/app smoke；本步骤只确认这些是待决策输入，不在这里封板。

### Cross-Cutting Concerns Identified

- Contract-first：所有命令、事件、窗口模式、DTO、storage schema、data integrity report 都需要先形成契约，再实现 UI。
- Local-first safety：默认离线可用，不默认上传数据；远程更新、插件市场、模板下载或遥测必须显式分层和显式开关。
- Terminal reliability：PTY 生命周期、流控、快照、输出顺序、WebView/xterm 渲染、IME、窗口 attach 和异常恢复会横跨前后端。
- Schema governance：新版数据不兼容旧数据，但 schema 变更仍需要版本、验证、报告、备份/恢复、fixtures 和 release gate。
- Platform adapters：窗口、托盘、文件系统、shell、PTY、路径、剪贴板、通知、更新和签名必须封装平台差异。
- Observability and diagnostics：诊断必须贯穿 workspace、conversation、message、member、session、window、job；同时需要脱敏策略。
- Security boundaries：React 前端不能拥有任意 shell 权限；终端输出、插件文件、路径、链接和 AI 生成内容都按非可信输入处理。
- Capability governance：每个 MVP 功能都必须映射到 PRD FR/NFR 和 capability checklist，状态只能是通过、替代通过或明确放弃。

## Starter Template Evaluation

### Primary Technology Domain

`orchlet` 的主技术域是跨平台桌面应用，不是普通 Web 应用、移动应用、SaaS 后端或纯 CLI 工具。Starter 选择必须满足：

- React + TypeScript 是前端硬约束。
- Windows、macOS、Linux 是目标平台。
- 本地后端需要拥有 PTY、文件系统、托盘、窗口、通知、数据库 schema 演进和诊断能力。
- Starter 只应提供可信基础骨架，不应替代后续架构决策。

### Version Verification Snapshot

2026-05-11 重新联网与 registry 核对结果：

- `create-tauri-app@4.6.2`
- `@tauri-apps/cli@2.11.1`
- Rust crate `tauri@2.11.1`
- `react@19.2.6`
- `vite@8.0.11`
- `@vitejs/plugin-react@6.0.1`
- `tailwindcss@4.3.0`
- `@xterm/xterm@6.0.0`
- `vitest@4.1.5`
- `playwright@1.59.1`
- Rust crate `portable-pty@0.9.0`
- Rust crate `rusqlite@0.39.0`
- Rust crate `tauri-specta@2.0.0-rc.25`
- Rust crate `rspc@1.0.0-rc.5`

Sources checked include official Tauri project creation docs, Electron Forge docs, Wails docs, npm registry and crates.io search output.

### Starter Options Considered

**Option 1: Official `create-tauri-app` with `react-ts`**

- Provides official Tauri 2 desktop skeleton, Rust backend, React + TypeScript frontend, Vite dev/build pipeline and Tauri configuration.
- Aligns with current `golutra` reference project's desktop/system capability model while replacing Vue with React.
- Keeps package/runtime overhead lower than Electron and preserves Rust ownership of PTY, storage, filesystem, tray, diagnostics and platform adapters.
- Leaves architecture decisions open enough for our required modular monolith, typed IPC, storage manifest, schema strategy and domain boundaries.

**Option 2: `create-vite` React + TypeScript, then manually add Tauri**

- Provides a clean React/Vite frontend, but requires manual Tauri setup.
- Offers no meaningful advantage over the official Tauri starter for this product because desktop capabilities are not optional.
- Useful only if implementation needs a custom repository layout before adding Tauri.

**Option 3: Electron Forge `vite-typescript`**

- Official Electron path with Vite + TypeScript templates.
- Good fallback if Tauri WebView consistency blocks terminal-heavy UI requirements.
- Not selected as default because it bundles Chromium/Node, increases package/runtime footprint and broadens the security surface for a local shell/PTY product.

**Option 4: Wails React templates**

- Viable cross-platform desktop option with Go backend and React templates.
- Not selected because the reference system is already Rust/Tauri, the technical research favors Rust for PTY/storage/platform work, and Wails React/Tailwind templates are partly community-maintained.

**Not selected:** Next.js/T3/Remix-style web starters. SSR, SaaS routing, server deployment and web auth assumptions do not match this local-first desktop application.

### Selected Starter: Official `create-tauri-app` React TypeScript

**Rationale for Selection:**

Use the official Tauri 2 React TypeScript starter as the first implementation foundation. This gives the project a maintained desktop skeleton without importing a community boilerplate's hidden architectural assumptions. It also fits the product constraints: React required, Vue excluded, high-performance local backend needed, cross-platform desktop required, and MVP must preserve old Tauri/Rust system capabilities.

This is not a complete application architecture. It is only the bootstrap layer. The first implementation stories must immediately add the architecture decisions from this document: module layout, typed IPC facade, contracts, storage manifest, schema fixtures, testing matrix, Tauri capabilities and terminal spike.

**Initialization Command:**

```bash
pnpm create tauri-app orchlet --template react-ts --manager pnpm --identifier com.orchlet.app --tauri-version 2
```

The bundle identifier is a provisional reverse-DNS identifier and should be confirmed before the first signed release.

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**

- Frontend: React + TypeScript.
- Desktop/backend: Tauri 2 + Rust.
- Package manager: pnpm.
- Runtime shape: system WebView UI with privileged Rust core process.

**Styling Solution:**

- Starter does not fully define product styling.
- Add Tailwind CSS v4 and a restrained desktop UI component layer in the foundation story.
- Do not import marketing-page UI assumptions or Vue-era styling patterns.

**Build Tooling:**

- Vite React build pipeline.
- Tauri CLI for dev/build/package lifecycle.
- Cargo for Rust backend build.
- Later foundation work must add production build scripts, lint/typecheck, CI and release artifact targets.

**Testing Framework:**

- Starter does not provide enough testing for this product.
- Add Vitest for frontend/domain view-model tests.
- Add Rust unit/integration tests for domain, storage, terminal and schema/data logic.
- Add Playwright or equivalent browser/WebView smoke for frontend behavior.
- Add Tauri/app smoke for real desktop flows on Windows/macOS/Linux.

**Code Organization:**

- Starter's default layout must be replaced with project architecture boundaries:

```text
src/
├── app/
├── pages/
├── widgets/
├── features/
├── entities/
├── shared/
│   ├── api/
│   ├── ui/
│   ├── config/
│   └── lib/
└── contracts/

src-tauri/src/
├── gateway/
├── app/
├── domain/
├── infrastructure/
├── contracts/
└── workers/
```

**Development Experience:**

- Use the starter's hot reload and Tauri dev loop for early vertical slices.
- First vertical slices should be terminal/PTY stream, typed IPC, SQLite/storage schema and workspace open, not visual shell polish.
- Project initialization with this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Already Decided:**

- Frontend framework: React, not Vue.
- Language baseline: TypeScript for UI, Rust for local desktop/backend core.
- Desktop runtime: Tauri 2 as default runtime from the official `create-tauri-app` `react-ts` starter.
- Platform target: Windows, macOS and Linux.
- Product mode: local-first desktop application, not cloud-first SaaS.
- Project context: product rebuild using `golutra` as behavior reference only, not as a data compatibility target.

**Critical Decisions (Block Implementation):**

- Data architecture: SQLite-first structured local persistence, JSON for small human-readable metadata, no redb/legacy compatibility layer in MVP.
- IPC architecture: Tauri commands/channels/events behind a typed frontend API facade; Rust DTOs generate TypeScript types through `ts-rs`, with contract fixtures as the fallback source of truth.
- Terminal architecture: Rust-owned PTY/session lifecycle using `portable-pty`; xterm.js renders only UI; output stream uses sequence, ACK/backpressure and snapshot attach.
- Security boundary: Tauri capabilities split by window mode; frontend cannot execute arbitrary shell commands.
- Frontend state architecture: TanStack Query for async IPC-backed query/mutation state, Zustand for narrow ephemeral UI state, terminal hot path outside React state.

**Important Decisions (Shape Architecture):**

- Module structure: local modular monolith with ports/adapters.
- Error handling: typed error envelope with recoverability and user-action metadata.
- Schema strategy: versioned migrations for future schema changes, validation report, backup/restore path, then apply.
- Testing strategy: contract tests + Rust tests + Vitest + Playwright/app smoke + schema/storage fixtures.
- Release strategy: signed artifacts and smoke matrix before public release; updater deferred until schema-upgrade safety is proven.

**Deferred Decisions (Post-MVP or Spike-Gated):**

- Electron fallback: only if Tauri WebView behavior fails terminal-heavy cross-platform smoke.
- `tauri-specta`/`specta`/`rspc`: deferred because current registry check shows release-candidate versions; may replace manual facade later if stability is proven.
- Full remote plugin marketplace, mobile remote control, CEO Agent and long-running autonomous coordinator: post-MVP.
- Secrets storage with Stronghold/keychain: only required if `orchlet` stores provider/API secrets itself; MVP should avoid storing third-party tokens.
- Automatic updater: architecture reserves it, but enabling is gated on signed release flow and schema-upgrade failure safety.

### Data Architecture

**Decision:** Use SQLite/rusqlite as the primary structured durable store for app data, with JSON metadata for workspace-local simple files. Do not include redb import/read compatibility in MVP.

**Verified versions:** `rusqlite@0.39.0`.

**Rationale:**

- Chat, conversations, members, unread state, outbox, diagnostics and data integrity reports need structured queries, indexes, migrations and repair tooling.
- SQLite is better suited than opaque bincode/redb records for long-lived application files, queryability, schema evolution and repair tooling.
- Because old data compatibility is explicitly out of scope, redb should not be included in the target architecture unless a future product decision reintroduces import from old `golutra`.

**Storage layout decision:**

- Global app data lives under the new `orchlet` app data namespace.
- Workspace-local metadata uses `.orchlet/workspace.json` for the new product. Old `.golutra/workspace.json` is treated as external historical data and is not read by default.
- App data uses per-workspace storage under a stable workspace id.
- Terminal runtime state remains in memory; only durable mappings, snapshots needed for attach/recovery, and diagnostics are persisted.

**Database approach:**

- Use `rusqlite` behind a repository/worker boundary. Do not perform blocking DB work on UI or async hot paths.
- Enable WAL where the platform/filesystem supports it and document checkpoint/backup behavior.
- Use explicit schema migration files and a `schema_migrations` table for future schema changes.
- Every storage item has a storage manifest entry: owner, path, format, schema version, readers/writers, schema evolution, backup, privacy class and fixtures.

**Caching strategy:**

- Browser/localStorage is UI cache only: theme, locale, terminal size, emoji recents and similar non-authoritative preferences.
- React query cache is view cache only; durable truth remains in Rust repositories.
- Terminal scrollback/snapshot cache is owned by terminal domain logic, not global frontend state.

### Authentication & Security

**Decision:** No product authentication in MVP. Use a local profile model only. All real security is local capability control, file/process boundary control, and data privacy.

**Authorization pattern:**

- Split Tauri capabilities by window mode:
  - main window: workspace/chat/settings/member operations;
  - terminal window: terminal attach/write/resize/search and limited workspace context;
  - workspace selection window: directory selection and recent workspace read;
  - notification preview window: read notification state and open target actions only.
- Domain use cases still validate workspace id, window id, session id and operation ownership; capabilities are necessary but not sufficient.

**Shell/process security:**

- React code never receives a generic "run shell command" primitive.
- CLI launch is handled by backend adapters from known terminal type, user-configured path or explicit custom CLI configuration.
- AI CLI output, ANSI text, paths, URLs, plugin metadata and generated text are untrusted.

**Data protection:**

- Default: no upload of source, terminal output, chat, paths, avatars, skills or diagnostics.
- Diagnostics export must redact environment variables, obvious tokens, private paths where possible and warn before including raw snippets.
- Do not store provider API keys in JSON. If future features require secrets, use OS keychain or Tauri Stronghold after a dedicated security decision.

### API & Communication Patterns

**Decision:** Use Tauri command/channel/event semantics behind a typed frontend facade.

**Verified versions:** `@tauri-apps/cli@2.11.1`, Rust crate `tauri@2.11.1`, `ts-rs@12.0.1`, `tauri-specta@2.0.0-rc.25`, `rspc@1.0.0-rc.5`.

**Communication split:**

- Commands: request/response operations such as `workspace.open`, `chat.sendMessage`, `terminal.create`, `settings.save`, `skills.link`.
- Channels: terminal output, schema/data validation progress, diagnostics export progress and other high-volume/long-running streams.
- Events: lifecycle/state changes such as terminal status, unread sync, message created, notification preview updated and window ready.
- Durable outbox: message creation + target resolution + terminal dispatch + retry/status update.

**Typed contract strategy:**

- Rust `contracts` module owns serde DTOs and error envelopes.
- `ts-rs` exports TypeScript types into `src/contracts/generated`.
- Frontend code imports only typed functions from `src/shared/api`; features cannot call raw `invoke`.
- Contract tests use JSON fixtures: TypeScript payload fixture -> Rust serde deserialize -> handler mock -> response fixture.
- Runtime validation is used at untrusted boundaries such as plugin metadata, data maintenance imports and diagnostics bundles. Avoid validating every terminal stream chunk on the hot path.

**Error handling standard:**

Use a shared envelope:

```text
{ code, message, severity, recoverable, userAction, details, correlationId }
```

Do not use string-prefix errors like `workspace_registry_mismatch:` as long-term API contracts. If a future import adapter is added, it must translate any legacy shape into `AppError`.

### Frontend Architecture

**Decision:** Feature-Sliced React architecture with strict system boundary imports.

**Verified versions:** `react@19.2.6`, `vite@8.0.11`, `@vitejs/plugin-react@6.0.1`, `tailwindcss@4.3.0`, `zustand@5.0.13`, `@tanstack/react-query@5.100.9`, `zod@4.4.3`.

**State management:**

- TanStack Query handles async query/mutation state over typed IPC for conversations, messages, settings, workspace data and skills.
- Zustand handles local ephemeral UI state such as active view, pane layout, selected tab, modal state and per-window preferences.
- Terminal output does not go through React component state. xterm receives batched stream writes through a terminal renderer adapter.
- Domain facts live in Rust/storage or typed repositories, not duplicated across multiple stores.
- App icons use `lucide-react`; icon-only controls must be implemented through shared UI primitives that provide `aria-label` and tooltip support.

**Component and module structure:**

```text
src/
├── app/                  # bootstrap, providers, window mode, global styles
├── pages/                # workspace, chat, terminal, settings
├── widgets/              # sidebar, titlebar, member panel, conversation list
├── features/             # send-message, invite-member, open-terminal, manage-skills
├── entities/             # workspace, member, conversation, message, terminal-session
├── shared/
│   ├── api/              # typed Tauri facade
│   ├── ui/               # reusable desktop UI primitives
│   ├── config/
│   └── lib/
└── contracts/            # generated and hand-reviewed TS contracts
```

**Routing/window strategy:**

- Use typed window mode and in-app navigation state rather than web SSR routing.
- Window modes are first-class architecture concepts: main, terminal, workspace-selection and notification-preview.
- Cross-window messages go through typed events and APIs, not ad hoc browser globals except for the Tauri initialization shim.

**UI performance:**

- Virtualize long lists such as conversations, messages, logs and data integrity reports.
- Batch terminal and stream updates.
- Keep notification icon/avatar generation outside React render loops.
- Use React Compiler only after compatibility checks; do not make it an MVP dependency.

### Infrastructure & Deployment

**Decision:** Local desktop release infrastructure, not cloud runtime infrastructure.

**Tooling baseline:**

- pnpm for frontend package management.
- Cargo for Rust backend.
- Vite/Tauri dev loop from starter.
- ESLint, Prettier, TypeScript strict mode and Cargo formatting/clippy in CI.

**Testing baseline:**

- Vitest for frontend logic and component-level tests.
- Rust unit/integration tests for domain services, repositories, terminal state machine, dispatch queue and schema/storage logic.
- Contract tests for command/event DTOs and error envelopes.
- Playwright/browser tests for UI behavior where WebView equivalence is acceptable.
- Tauri/app smoke tests for actual desktop behavior, especially terminal, window, tray and file integration.
- Schema/storage fixture tests using new `.orchlet` and SQLite sample data.

**Release strategy:**

- Build signed artifacts for Windows/macOS/Linux.
- Run smoke matrix before public release.
- Release notes must separate feature changes, data/schema changes, breaking changes, security changes and known issues.
- Updater remains optional until schema validation/apply/rollback behavior is proven.

**Monitoring/logging:**

- Use structured local diagnostics with correlation ids across workspace, conversation, message, member, terminal session, window and diagnostics run.
- Default logs stay low-noise and privacy-conscious.
- Debug flags can enable high-detail frontend/backend/terminal traces.

### Decision Impact Analysis

**Implementation Sequence:**

1. Initialize project with official Tauri React TypeScript starter.
2. Add foundation tooling: Tailwind v4, lint/format/typecheck/test scripts, strict TS, CI skeleton.
3. Create `contracts` foundation with Rust DTOs, `ts-rs` export, typed frontend API facade and contract fixtures.
4. Implement storage manifest, SQLite repository layer and schema validation fixtures.
5. Build terminal spike: Tauri channel stream, `portable-pty`, xterm renderer, seq/ACK/snapshot attach.
6. Implement workspace open/read-only/registry behavior for the new `.orchlet` model.
7. Implement chat/member/outbox dispatch vertical slice.
8. Add notifications, settings, skills, diagnostics and data integrity reports.
9. Run capability checklist and three-platform smoke before release.

**Cross-Component Dependencies:**

- Data architecture affects chat, diagnostics, notification unread state, schema safety and release safety.
- IPC contracts affect every frontend feature; no feature should bypass `shared/api`.
- Terminal stream architecture affects chat output回写、notification unread、diagnostics、performance budgets and window attach behavior.
- Capability split affects window creation, notifications, terminal operations, workspace selection and plugin/skill future design.
- Frontend state architecture affects performance: terminal hot path must stay outside React state, while query/mutation state stays traceable.
- Release strategy depends on schema safety; updater cannot be enabled before schema-upgrade failure behavior is proven.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 24 areas where different AI agents could otherwise make incompatible choices: database names, schema migration names, DTO field casing, IDs, timestamps, command names, event topics, error shapes, loading state, retries, logging, test locations, fixture names, frontend file names, Rust module names, storage paths, cache ownership, route/window modes, terminal stream envelopes, diagnostics records, validation timing, feature boundaries, repository boundaries and config placement.

### Naming Patterns

**Database Naming Conventions:**

- SQLite table names: plural `snake_case`, e.g. `conversations`, `chat_messages`, `terminal_sessions`, `outbox_tasks`.
- Column names: `snake_case`, e.g. `workspace_id`, `conversation_id`, `created_at_ms`.
- Primary key column: `id` unless the table is a pure join table.
- Foreign keys: `<entity>_id`, e.g. `member_id`, `message_id`.
- Index names: `idx_<table>__<columns>`, e.g. `idx_chat_messages__conversation_id_created_at_ms`.
- Unique index names: `uq_<table>__<columns>`.
- Schema migration files: `YYYYMMDDHHMM__short_description.sql`.

**API/IPC Naming Conventions:**

- Rust command handler names use `snake_case`, e.g. `workspace_open`, `chat_send_message`.
- Frontend API facade groups commands by domain and exposes `camelCase` methods, e.g. `api.workspace.open()`, `api.chat.sendMessage()`.
- IPC JSON fields use `camelCase`, generated from Rust DTOs with `serde(rename_all = "camelCase")`.
- Event topics use kebab-case with a domain prefix, e.g. `terminal-output`, `terminal-status-change`, `chat-message-created`, `notification-preview-updated`.
- Event payloads carry `schemaVersion` and `correlationId` when they cross module/window boundaries.

**Code Naming Conventions:**

- React components: `PascalCase.tsx`, e.g. `ConversationList.tsx`.
- React hooks: `useThing.ts`, e.g. `useTerminalRenderer.ts`.
- Non-component TypeScript modules: `kebab-case.ts`, e.g. `workspace-api.ts`.
- TypeScript types/interfaces: `PascalCase`.
- TypeScript functions/variables: `camelCase`.
- Rust modules/files: `snake_case.rs`.
- Rust types/enums/traits: `PascalCase`.
- Rust functions/variables: `snake_case`.
- IDs in TypeScript: `workspaceId`, `conversationId`, `messageId`, `memberId`, `terminalSessionId`.

### Structure Patterns

**Project Organization:**

- Frontend feature code lives in `src/features/<feature-name>`.
- Stable domain models live in `src/entities/<entity-name>`.
- Cross-feature UI primitives live in `src/shared/ui`.
- IPC access lives only in `src/shared/api`.
- Generated contract files live in `src/contracts/generated` and should not be hand-edited.
- Rust Tauri command handlers live in `src-tauri/src/gateway`.
- Rust use cases live in `src-tauri/src/app`.
- Rust domain logic lives in `src-tauri/src/domain`.
- Rust adapters live in `src-tauri/src/infrastructure`.
- Long-running background workers live in `src-tauri/src/workers`.

**File Structure Patterns:**

- Unit tests are co-located as `*.test.ts` / `*.test.tsx` for frontend and `#[cfg(test)]` modules for Rust.
- Cross-module integration tests live in `tests/`.
- Contract fixtures live in `fixtures/contracts/<domain>/`.
- Schema/data fixtures live in `fixtures/schema/<case-name>/` and `fixtures/data-integrity/<case-name>/`.
- Static UI assets live in `src/shared/assets` unless they belong to a single feature.
- App configuration constants live in `src/shared/config` or `src-tauri/src/config`; feature modules do not invent parallel config files.
- Environment examples live in `.env.example`; secrets are never committed.

### Format Patterns

**API Response Formats:**

- Frontend typed API methods should return domain-specific results or throw typed `AppError`; components do not inspect raw Tauri response envelopes.
- Rust command boundaries use a shared result shape internally:

```text
Result<T, AppError>
```

- `AppError` fields are consistent:

```text
{ code, message, severity, recoverable, userAction, details, correlationId }
```

- User-facing copy is mapped at UI boundaries. Domain errors should not contain long UI paragraphs.

**Data Exchange Formats:**

- Public IDs are ULID strings across IPC and persisted records.
- Database timestamps use integer milliseconds: `created_at_ms`, `updated_at_ms`.
- IPC timestamps use `createdAtMs` / `updatedAtMs` numbers for sorting and correlation.
- Human-readable reports may include ISO 8601 strings in addition to millisecond values.
- JSON booleans are real booleans, not `0/1`.
- Optional fields are omitted when absent unless `null` has explicit domain meaning.
- Terminal stream chunks use an envelope:

```text
{ schemaVersion, sessionId, seq, chunk, kind, emittedAtMs }
```

### Communication Patterns

**Event System Patterns:**

- Events are for state/lifecycle notification, not request/response operations.
- Every event topic has one owning domain.
- Event payloads include enough identifiers to correlate: `workspaceId`, `conversationId`, `messageId`, `memberId`, `terminalSessionId`, `windowId` where relevant.
- Events that can be re-fired must be idempotent by `eventId` or by domain id + sequence.
- Terminal output ordering is by `seq`, not by event arrival time.
- Cross-window readiness events use explicit request/response names, e.g. `terminal-window-ready-request` and `terminal-window-ready`.

**State Management Patterns:**

- TanStack Query owns async query/mutation state over IPC.
- Zustand owns ephemeral per-window UI state only.
- No feature creates a second source of truth for workspace, conversation, member or terminal session facts.
- Terminal output is written to xterm through renderer adapters, not React state arrays.
- State transitions that affect domain behavior are expressed as commands/use cases, not direct store mutation.

### Process Patterns

**Error Handling Patterns:**

- Recoverable errors include a user action, e.g. "configure CLI path", "retry schema validation", "open diagnostics".
- Non-recoverable errors include a correlation id and diagnostic pointer.
- Retry is owned by workers/use cases, not by arbitrary UI components.
- Destructive actions require explicit user confirmation at the UI boundary and a domain command that records intent.
- Legacy string-prefix errors should not be introduced in new code; any future import adapter must convert them into `AppError`.

**Loading State Patterns:**

- Use TanStack Query `pending/error/success` state for data queries and mutations.
- Long-running jobs use job records or channel progress, not a single boolean.
- Local UI-only loading uses discriminated unions:

```ts
type LoadState = 'idle' | 'pending' | 'success' | 'error';
```

- Terminal connection states are domain states, e.g. `connecting`, `online`, `working`, `dnd`, `exited`, `failed`.
- Loading indicators must not resize fixed terminal/tool layouts.

### Enforcement Guidelines

**All AI Agents MUST:**

- Use `src/shared/api` for IPC; never call raw Tauri `invoke` from feature code.
- Add or update contract fixtures when command/event DTOs change.
- Add storage manifest entries for every new persisted file/table.
- Use existing ID, timestamp, error and event envelopes.
- Keep terminal hot-path output outside React state.
- Update capability checklist references when implementing or dropping behavior.
- Keep platform-specific code behind platform adapters.
- Include schema validation and rollback considerations for schema changes.

**Pattern Enforcement:**

- TypeScript strict mode, ESLint and import boundary rules enforce frontend structure.
- Rust `cargo fmt`, clippy and module visibility enforce backend structure.
- Contract tests fail when Rust DTOs and TypeScript fixtures drift.
- Schema tests fail when schema changes lack migration files or fixtures.
- PR/story review must mention affected FR/NFR and capability checklist items.
- Pattern changes must be documented in this architecture file before broad implementation.

### Pattern Examples

**Good Examples:**

```ts
// Feature code calls typed API facade.
await api.chat.sendMessage({ workspaceId, conversationId, body, mentionedMemberIds });
```

```rust
#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageRequest {
    pub workspace_id: WorkspaceId,
    pub conversation_id: ConversationId,
    pub body: String,
    pub mentioned_member_ids: Vec<MemberId>,
}
```

```text
idx_chat_messages__conversation_id_created_at_ms
```

**Anti-Patterns:**

- Calling `invoke("chat_send_message")` directly inside a React component.
- Storing terminal output chunks in a React array state for rendering.
- Adding a new SQLite table without a migration and storage manifest entry.
- Returning unstructured string errors from Rust commands.
- Using `Date` objects or locale-formatted strings in persisted JSON.
- Creating platform-specific `if windows` logic inside frontend feature code.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
orchlet/
├── README.md
├── LICENSE
├── SECURITY.md
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── eslint.config.js
├── prettier.config.js
├── postcss.config.mjs
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers/
│   │   │   ├── AppProviders.tsx
│   │   │   ├── QueryProvider.tsx
│   │   │   └── ThemeProvider.tsx
│   │   ├── window-mode/
│   │   │   ├── detect-window-mode.ts
│   │   │   ├── window-mode.types.ts
│   │   │   └── window-mode-store.ts
│   │   ├── navigation/
│   │   │   ├── navigation-store.ts
│   │   │   └── navigation.types.ts
│   │   └── styles/
│   │       └── global.css
│   ├── pages/
│   │   ├── chat/
│   │   │   └── ChatPage.tsx
│   │   ├── friends/
│   │   │   └── FriendsPage.tsx
│   │   ├── settings/
│   │   │   └── SettingsPage.tsx
│   │   ├── skills/
│   │   │   └── SkillsPage.tsx
│   │   ├── terminal/
│   │   │   └── TerminalWindowPage.tsx
│   │   ├── workspace-selection/
│   │   │   └── WorkspaceSelectionPage.tsx
│   │   └── notification-preview/
│   │       └── NotificationPreviewPage.tsx
│   ├── widgets/
│   │   ├── app-shell/
│   │   ├── titlebar/
│   │   ├── sidebar/
│   │   ├── conversation-list/
│   │   ├── member-panel/
│   │   ├── terminal-tabs/
│   │   ├── terminal-layout/
│   │   ├── notification-preview/
│   │   └── toast-stack/
│   ├── features/
│   │   ├── open-workspace/
│   │   ├── manage-recent-workspaces/
│   │   ├── invite-member/
│   │   ├── manage-contact/
│   │   ├── send-message/
│   │   ├── manage-conversation/
│   │   ├── mention-member/
│   │   ├── terminal-session/
│   │   ├── terminal-search/
│   │   ├── terminal-dispatch/
│   │   ├── notification-actions/
│   │   ├── manage-skills/
│   │   ├── manage-roadmap/
│   │   ├── edit-settings/
│   │   ├── avatar-library/
│   │   ├── diagnostics-export/
│   │   └── data-integrity-report/
│   ├── entities/
│   │   ├── workspace/
│   │   ├── member/
│   │   ├── contact/
│   │   ├── conversation/
│   │   ├── message/
│   │   ├── terminal-session/
│   │   ├── notification/
│   │   ├── skill/
│   │   ├── roadmap/
│   │   └── diagnostics/
│   ├── shared/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── workspace-api.ts
│   │   │   ├── chat-api.ts
│   │   │   ├── member-api.ts
│   │   │   ├── terminal-api.ts
│   │   │   ├── notification-api.ts
│   │   │   ├── settings-api.ts
│   │   │   ├── skills-api.ts
│   │   │   ├── diagnostics-api.ts
│   │   │   └── data-integrity-api.ts
│   │   ├── ui/
│   │   ├── lib/
│   │   ├── config/
│   │   ├── assets/
│   │   └── monitoring/
│   └── contracts/
│       ├── generated/
│       ├── events.ts
│       └── contract-fixtures.ts
├── src-tauri/
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   ├── main.json
│   │   ├── terminal.json
│   │   ├── workspace-selection.json
│   │   └── notification-preview.json
│   ├── migrations/
│   │   ├── global/
│   │   └── workspace/
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── gateway/
│       │   ├── mod.rs
│       │   ├── workspace_commands.rs
│       │   ├── chat_commands.rs
│       │   ├── member_commands.rs
│       │   ├── terminal_commands.rs
│       │   ├── notification_commands.rs
│       │   ├── settings_commands.rs
│       │   ├── skills_commands.rs
│       │   ├── diagnostics_commands.rs
│       │   └── data_integrity_commands.rs
│       ├── app/
│       │   ├── mod.rs
│       │   ├── workspace/
│       │   ├── chat/
│       │   ├── members/
│       │   ├── terminal/
│       │   ├── orchestration/
│       │   ├── notifications/
│       │   ├── settings/
│       │   ├── skills/
│       │   ├── roadmap/
│       │   ├── diagnostics/
│       │   └── data_integrity/
│       ├── domain/
│       │   ├── mod.rs
│       │   ├── common/
│       │   ├── workspace/
│       │   ├── chat/
│       │   ├── member/
│       │   ├── terminal/
│       │   ├── orchestration/
│       │   ├── notification/
│       │   ├── settings/
│       │   ├── skill/
│       │   ├── roadmap/
│       │   ├── diagnostics/
│       │   └── data_integrity/
│       ├── infrastructure/
│       │   ├── mod.rs
│       │   ├── persistence/
│       │   │   ├── sqlite/
│       │   │   ├── json_store/
│       │   │   └── storage_manifest.rs
│       │   ├── terminal/
│       │   │   ├── pty_adapter.rs
│       │   │   ├── cli_resolver.rs
│       │   │   ├── snapshot.rs
│       │   │   └── stream_channel.rs
│       │   ├── desktop/
│       │   │   ├── window_adapter.rs
│       │   │   ├── tray_adapter.rs
│       │   │   ├── dialog_adapter.rs
│       │   │   └── shell_adapter.rs
│       │   ├── filesystem/
│       │   ├── skills_fs/
│       │   ├── diagnostics_sink/
│       │   └── update/
│       ├── contracts/
│       │   ├── mod.rs
│       │   ├── common.rs
│       │   ├── workspace.rs
│       │   ├── chat.rs
│       │   ├── member.rs
│       │   ├── terminal.rs
│       │   ├── notification.rs
│       │   ├── settings.rs
│       │   ├── skills.rs
│       │   ├── diagnostics.rs
│       │   └── data_integrity.rs
│       └── workers/
│           ├── mod.rs
│           ├── chat_outbox_worker.rs
│           ├── terminal_event_pump.rs
│           ├── terminal_snapshot_worker.rs
│           ├── diagnostics_worker.rs
│           └── data_integrity_worker.rs
├── fixtures/
│   ├── contracts/
│   ├── schema/
│   ├── sample-workspaces/
│   └── terminal-streams/
├── tests/
│   ├── contract/
│   ├── data-integrity/
│   ├── smoke/
│   └── e2e/
├── docs/
│   ├── architecture/
│   └── user/
└── .github/
    └── workflows/
        ├── ci.yml
        ├── desktop-smoke.yml
        └── release.yml
```

### Architectural Boundaries

**API Boundaries:**

- `src/shared/api` is the only frontend layer allowed to call Tauri.
- `src-tauri/src/gateway` is the only Rust layer allowed to expose Tauri commands/events directly.
- `gateway` converts DTOs and calls `app` use cases; it does not contain business logic.
- `app` use cases coordinate domain services, repositories and workers.
- `domain` owns state machines, validation rules and invariants; it does not depend on Tauri.
- `infrastructure` owns SQLite, JSON stores, filesystem, PTY, window/tray/dialog/shell adapters and updater.

**Component Boundaries:**

- `pages` compose widgets and features for one window/view.
- `widgets` compose multiple features/entities into reusable UI regions.
- `features` implement user actions and workflows.
- `entities` expose models, display helpers and lightweight selectors for domain objects.
- `shared/ui` contains design primitives only; it cannot import features/entities.

**Service Boundaries:**

- Workspace service owns workspace id, path, registry and read-only fallback.
- Chat service owns conversations, messages, unread and message status.
- Terminal service owns PTY sessions, status, seq, ACK, snapshot and attach.
- Orchestration service owns chat-to-terminal dispatch, outbox, DND, working queue and dedupe.
- Notification service owns unread aggregation, tray state and preview actions.
- Data integrity service owns schema validation, report, backup/apply and failure recovery for future schema changes.

**Data Boundaries:**

- SQLite repositories are accessed only through Rust repository traits.
- JSON workspace/app files are accessed only through storage adapters.
- No redb compatibility module exists in MVP; old `golutra` data is not read by default.
- Frontend caches are not authoritative.
- Terminal runtime state is authoritative in Rust terminal domain; frontend sees snapshots and stream envelopes.

### Requirements to Structure Mapping

**Feature/FR Mapping:**

- FR1-FR9 Workspace & App Shell -> `features/open-workspace`, `features/manage-recent-workspaces`, `src-tauri/src/app/workspace`, `domain/workspace`, `infrastructure/desktop`.
- FR10-FR18 Members, Contacts & Invitations -> `features/invite-member`, `features/manage-contact`, `entities/member`, `entities/contact`, `src-tauri/src/app/members`, `domain/member`.
- FR19-FR32 Conversations & Messaging -> `pages/chat`, `widgets/conversation-list`, `features/send-message`, `features/manage-conversation`, `entities/conversation`, `entities/message`, `src-tauri/src/app/chat`, `domain/chat`.
- FR33-FR44 Terminal Workspace -> `pages/terminal`, `widgets/terminal-tabs`, `widgets/terminal-layout`, `features/terminal-session`, `features/terminal-search`, `entities/terminal-session`, `src-tauri/src/app/terminal`, `domain/terminal`, `infrastructure/terminal`.
- FR45-FR54 Agent Orchestration & Notifications -> `features/terminal-dispatch`, `features/notification-actions`, `src-tauri/src/app/orchestration`, `domain/orchestration`, `workers/chat_outbox_worker.rs`, `app/notifications`.
- FR55-FR62 Skills, Plugins & Roadmap -> `features/manage-skills`, `features/manage-roadmap`, `entities/skill`, `entities/roadmap`, `src-tauri/src/app/skills`, `domain/skill`, `domain/roadmap`.
- FR63-FR71 Settings & Personalization -> `pages/settings`, `features/edit-settings`, `features/avatar-library`, `src-tauri/src/app/settings`, `domain/settings`.
- FR72-FR79 Data, Schema, Diagnostics & Release -> `features/data-integrity-report`, `features/diagnostics-export`, `src-tauri/src/app/data_integrity`, `domain/data_integrity`, `domain/diagnostics`, `fixtures/data-integrity`, `.github/workflows`.

**Cross-Cutting Concerns:**

- IPC contracts -> `src-tauri/src/contracts`, `src/contracts/generated`, `fixtures/contracts`.
- Storage manifest -> `src-tauri/src/infrastructure/persistence/storage_manifest.rs`.
- Tauri capabilities -> `src-tauri/capabilities/*.json`.
- Platform adapters -> `src-tauri/src/infrastructure/desktop`, `filesystem`, `terminal`.
- Diagnostics correlation -> `domain/diagnostics`, `infrastructure/diagnostics_sink`, frontend `shared/monitoring`.

### Integration Points

**Internal Communication:**

```text
React feature
  -> src/shared/api typed method
  -> Tauri command/channel/event
  -> Rust gateway
  -> app use case
  -> domain service
  -> infrastructure adapter/repository
  -> event/channel/command result
  -> typed frontend subscriber/query
```

**External Integrations:**

- External AI CLIs: Claude Code, Codex, Gemini CLI, OpenCode, Qwen, OpenClaw, custom CLI and shell.
- OS services: filesystem, file manager open, tray, notifications, clipboard, window management and shell process launch.
- Local data engines: SQLite for structured data and JSON for simple workspace metadata.
- xterm.js frontend renderer fed by Rust terminal stream envelopes.
- Future update metadata/plugin marketplace/template download remain optional remote integrations.

**Data Flow:**

- Workspace open: UI command -> workspace use case -> filesystem/storage adapters -> registry update -> workspace state event.
- Message send: UI command -> chat use case -> SQLite transaction -> outbox task -> event -> outbox worker -> terminal dispatch.
- Terminal output: PTY reader -> terminal event pump -> stream envelope with seq -> xterm renderer -> semantic/chat pipeline -> chat event/storage as needed.
- Data validation: validation command -> data integrity worker -> schema/storage checks -> report channel -> user confirmation for repair/apply -> report persisted.

### File Organization Patterns

**Configuration Files:**

- Root: frontend/package/dev configuration.
- `src/shared/config`: frontend runtime constants and feature flags.
- `src-tauri/src/config`: backend runtime constants and environment parsing.
- `src-tauri/capabilities`: window permission boundaries.
- `.github/workflows`: CI, smoke and release automation.

**Source Organization:**

- Frontend source follows app/pages/widgets/features/entities/shared/contracts.
- Backend source follows gateway/app/domain/infrastructure/contracts/workers.
- Generated files are isolated and never hand-edited.
- Future import/compatibility code, if ever approved, must be isolated under explicit `import_*` directories and stay outside MVP core paths.

**Test Organization:**

- Co-located unit tests for small frontend/Rust modules.
- `tests/contract` for DTO and IPC fixture compatibility.
- `tests/data-integrity` for schema/storage validation fixtures.
- `tests/e2e` for browser-style UI flows.
- `tests/smoke` for packaged/app runtime checks.
- `fixtures/terminal-streams` for terminal flood, ordering and snapshot tests.

**Asset Organization:**

- General UI assets in `src/shared/assets`.
- Product icons and bundle icons in `src-tauri/icons`.
- Avatar presets in a dedicated avatar asset folder and copied to app data when needed.
- User-uploaded avatars and skills are never committed assets; they live in app data/workspace data.

### Development Workflow Integration

**Development Server Structure:**

- `pnpm dev` runs Vite.
- `pnpm tauri dev` or equivalent runs the Tauri desktop app.
- Rust workers and adapters are compiled with Cargo through Tauri.
- Contract generation runs before typecheck when DTOs change.

**Build Process Structure:**

- Frontend build emits `dist/`.
- Tauri package step embeds `dist/` and Rust binary.
- CI runs format, lint, typecheck, frontend tests, Rust tests, contract tests and schema/data fixtures before packaging.
- Desktop smoke runs against built app artifacts where feasible.

**Deployment Structure:**

- Release artifacts are produced per platform.
- Release checklist consumes capability checklist, data integrity report fixtures and smoke results.
- Updater metadata is produced only when signed update and schema safety gates pass.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

The architecture is internally coherent. Tauri 2 + Rust provides the privileged local backend required for PTY, filesystem, tray, windows, notifications and packaging. React + TypeScript + Vite fits the selected official starter and replaces Vue as required. SQLite/rusqlite, typed IPC, xterm.js, portable-pty, TanStack Query and Zustand each have a clear responsibility and do not overlap in ways that create conflicting sources of truth.

**Pattern Consistency:**

Implementation patterns support the decisions:

- DB naming uses SQL/Rust conventions while IPC fields use frontend-friendly camelCase through serde/type generation.
- Raw Tauri access is isolated to `shared/api` and `gateway`.
- Event/channel/command semantics match the terminal, chat, data validation and notification requirements.
- Error, ID, timestamp and stream envelope patterns are consistent across frontend and backend.

**Structure Alignment:**

The project tree supports all architectural boundaries. Frontend feature slices map to user workflows; Rust modules separate gateway, use cases, domain logic, adapters, contracts and workers; fixtures and tests have dedicated locations for contract, schema/data, terminal and smoke validation.

### Requirements Coverage Validation ✅

**Feature Coverage:**

All PRD feature categories are represented in the structure and decisions:

- Workspace/app shell -> workspace modules, window mode, desktop adapters.
- Members/contacts/invitations -> member/contact entities and Rust member domain.
- Chat/messaging -> chat use cases, message entities, SQLite repositories and outbox.
- Terminal -> terminal page/widgets, Rust terminal domain, PTY adapter, stream channel and snapshot worker.
- Orchestration/notifications -> outbox worker, dispatch domain, notification domain and tray/preview adapters.
- Skills/roadmap -> skills filesystem adapter and roadmap domain.
- Settings/personalization -> settings page/features, settings domain and avatar library.
- Data/schema/diagnostics/release -> data integrity workers, SQLite/storage schema fixtures, diagnostics sink and CI/release workflow structure.

**Functional Requirements Coverage:**

FR1-FR79 are architecturally supported by the feature mapping in Step 6. No functional requirement lacks a target module or integration path. Items known as old-version partial/placeholder behavior, such as Skill Store/Plugin Marketplace and `@all`, are handled by explicit boundary/decision rules rather than being silently treated as complete MVP features.

**Non-Functional Requirements Coverage:**

- Performance: terminal hot path bypasses React state; output stream has seq/ACK/snapshot; SQLite work is behind repository/worker boundaries; long-running jobs use channels/progress.
- Reliability/data integrity: storage manifest, schema migrations, validation reports, fixtures and backup/apply flow are defined.
- Security/privacy: Tauri capabilities split by window; no arbitrary shell primitive in frontend; diagnostics redaction and local-first defaults are documented.
- Cross-platform: platform adapters and smoke matrix are defined for Windows/macOS/Linux.
- Integration/compatibility: external CLI adapters, custom CLI, new `.orchlet` workspace metadata and SQLite schema are represented.
- Maintainability/testability: module boundaries, contract fixtures, tests and capability governance are documented.
- Observability: correlation ids and diagnostics domain are required.
- Release: release workflows and smoke/release gates are included.

### Implementation Readiness Validation ✅

**Decision Completeness:**

Critical decisions are documented with current verified versions where technology versions matter. Deferred decisions are explicit and do not block MVP implementation.

**Structure Completeness:**

The structure is specific enough for AI agents to create files consistently. It defines root config, frontend layers, backend layers, contracts, workers, schema migrations, fixtures, tests, docs and CI/release workflow locations.

**Pattern Completeness:**

Major conflict points are covered: naming, data format, command/event/channel patterns, error envelopes, loading states, tests, storage, logging, platform adapters and capability updates.

### Gap Analysis Results

**Critical Gaps:** None.

**Important Non-Blocking Gaps:**

- Final app bundle identifier is provisional (`com.orchlet.app`) and should be confirmed before signed release.
- Representative new `.orchlet` and SQLite sample data should be created for schema/data fixtures.
- `tauri-specta`/`specta`/`rspc` should be revisited after initial manual/`ts-rs` contract layer proves the command surface.
- Tauri WebView terminal behavior still needs early smoke on at least one non-macOS platform before broad UI implementation.

**Nice-to-Have Gaps:**

- Add architecture decision records (ADRs) for desktop runtime, storage, typed IPC, terminal stream, updater and security capability model.
- Add import-boundary linting after the initial directory structure exists.
- Add a generated storage manifest report for documentation and release review.

### Validation Issues Addressed

- Potential conflict between new `orchlet` branding and old `.golutra` workspace metadata was resolved by choosing a clean `.orchlet` workspace model and explicitly dropping old-data compatibility from MVP.
- Risk from release-candidate typed IPC libraries was resolved by selecting `ts-rs` + manual facade as the initial stable path.
- Risk from terminal output overloading React was resolved by requiring xterm renderer adapters and Rust-owned stream/backpressure.
- Risk from old Vue store logic being copied was resolved by explicit frontend state boundaries and use-case/repository separation.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High for MVP architecture direction. Medium only for the exact future typed IPC automation library and updater timing, both of which are explicitly deferred and non-blocking.

**Key Strengths:**

- Strong alignment with user constraints: React, no Vue, cross-platform, performance-first and local-first.
- Clear capability strategy using PRD, docs and capability checklist.
- Terminal, IPC, schema governance and diagnostics are treated as architecture foundations instead of afterthoughts.
- AI-agent consistency rules are concrete enough to guide implementation stories.

**Areas for Future Enhancement:**

- Formal ADR files for each major decision.
- More detailed database schema after epics/stories are split.
- Platform-specific release/signing guide after packaging strategy is finalized.
- Plugin API and permission model after MVP local skills are stable.

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently across all components.
- Respect project structure and boundaries.
- Do not introduce raw Tauri calls outside `src/shared/api`.
- Do not introduce new persisted data without storage manifest and schema validation coverage.
- Do not implement terminal stream handling through React state.
- Refer to this document before making any architectural choice not already covered.

**First Implementation Priority:**

Initialize the official Tauri React TypeScript project:

```bash
pnpm create tauri-app orchlet --template react-ts --manager pnpm --identifier com.orchlet.app --tauri-version 2
```

Then immediately add foundation stories for contracts, storage manifest, terminal spike, schema/data fixtures and CI/test scaffolding before broad UI implementation.

## Architecture Completion & Handoff

This architecture is complete and validated for implementation planning. It establishes the technical source of truth for `orchlet`:

- React replaces Vue.
- Tauri 2 + Rust remains the default cross-platform desktop/runtime foundation.
- SQLite-first persistence is the only MVP structured data path; redb is not included unless a future import feature is explicitly approved.
- Tauri commands/channels/events are wrapped by typed contracts and a frontend API facade.
- Terminal/PTY is Rust-owned, xterm renders UI, and the stream path uses seq/ACK/snapshot patterns.
- Frontend implementation uses feature boundaries, TanStack Query for async IPC state, Zustand for local UI state and no React state for terminal output.
- Project structure, naming conventions, tests, fixtures, schema governance, capabilities and release gates are defined for consistent AI-agent implementation.

The first implementation phase should start with project initialization, then foundation stories for contracts, storage manifest, terminal spike, schema/data fixtures and CI/test scaffolding before feature UI expansion.
