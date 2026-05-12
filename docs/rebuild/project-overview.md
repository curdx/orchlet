# 项目总览

## 项目定位

`golutra` 是一个面向本地开发者的多智能体桌面工作区。核心价值不是替代某个 CLI，而是把 Claude Code、Gemini CLI、Codex、OpenCode、Qwen、自定义 shell 等已有命令行工具包成可视化成员，统一管理工作区、聊天、终端、任务路线图、技能目录、通知和状态。

README 中明确的产品承诺包括：

- 不迁移项目、不重学命令、不绑定单一 CLI。
- 支持多智能体并行执行和自动编排。
- 支持长期运行的 AI 协作系统和工作流模板。
- 支持 Windows、macOS、Linux 桌面运行。

## 项目分类

- 仓库类型：单仓库桌面应用。
- 前端部分：`src/`，Vue 单页应用，多窗口通过 Tauri 初始化脚本和 query/view 状态区分。
- 后端部分：`src-tauri/src/`，Rust/Tauri 主进程，负责系统能力、本地存储、PTY 终端、聊天数据库、通知和窗口。
- 运行形态：Tauri 桌面应用 + 两个 Rust bin（`shim`、`golutra-cli`）。
- 数据形态：本地 app data、workspace `.golutra/` 目录、redb 本地数据库、浏览器 localStorage/cache。

## 当前技术栈

| 类别 | 依赖 | package.json 范围 | lock 实际安装值 | 2026-05-11 registry 检查结果 | 说明 |
| --- | --- | ---: | ---: | ---: | --- |
| 桌面框架 | `tauri` Rust crate | 2.9.5 | 无 `Cargo.lock` | 2.11.1 | 主进程和窗口/托盘/命令能力 |
| 前端 Tauri API | `@tauri-apps/api` | ^2.0.0 | 2.9.1 | 2.11.0 | 前端 IPC、窗口、事件 |
| 前端框架 | `vue` | ^3.5.12 | 3.5.26 | 3.5.34 | Composition API |
| 状态管理 | `pinia` | ^3.0.4 | 3.0.4 | 3.0.4 | 当前已是最新检查值 |
| 构建工具 | `vite` | ^6.2.0 | 6.4.1 | 8.0.11 | 可作为现代化升级重点 |
| Vue 插件 | `@vitejs/plugin-vue` | ^5.2.4 | 5.2.4 | 6.0.6 | 跟随 Vite 主版本升级 |
| i18n | `vue-i18n` | ^11.2.8 | 11.2.8 | 11.4.2 | 中英文语言包 |
| CSS | `tailwindcss` | ^3.4.17 | 3.4.17 | 4.3.0 | 可迁移到 v4 配置方式 |
| TypeScript | `typescript` | ~5.8.2 | 5.8.3 | 6.0.3 | 升级前需确认生态兼容 |
| 终端渲染 | `@xterm/xterm` | ^6.0.0 | 6.0.0 | 6.0.0 | xterm + canvas/search/webgl/fit |
| Rust DB | `redb` | 2.x | 无 `Cargo.lock` | 4.1.0 | redb 升级需要迁移策略 |
| Rust PTY | `portable-pty` | 0.9.0 | 无 `Cargo.lock` | 0.9.0 | 当前已是最新检查值 |

版本检查使用 `pnpm list`、`npm view` 与 `cargo search`，不等同于迁移承诺。实际开工前仍应用官方升级指南确认破坏性变更。

## 功能域

| 功能域 | 入口 | 后端能力 | 持久化 |
| --- | --- | --- | --- |
| 工作区 | `WorkspaceSelection.vue`、`workspaceStore.ts` | `workspace_open`、`workspace_recent_list`、窗口注册表 | app data `recent-workspaces.json`、`workspace-registry.json`，workspace `.golutra/workspace.json`、`.golutra/local.json` |
| 主界面 | `App.vue`、`SidebarNav.vue` | Tauri 窗口控制、托盘、窗口复用 | 设置与窗口状态 |
| 聊天 | `ChatInterface.vue`、`chatStore.ts` | `chat_*` commands、redb、outbox | app data `<workspaceId>/chat.redb` |
| 终端 | `TerminalWorkspace.vue`、`TerminalPane.vue`、`terminalBridge.ts` | `terminal_*` commands、PTY、快照、流控 | Rust 内存会话 + localStorage 尺寸/快照缓存 |
| 成员/邀请 | `useFriendInvites.ts`、`terminalMemberStore.ts` | `project_members_invite`、`terminal_create` | `.golutra/workspace.json` 或 app fallback |
| 技能 | `SkillManagementModal.vue`、`skillsBridge.ts` | 技能库导入、项目技能 symlink | app data `skills/`，workspace `.golutra/skills` |
| 通知 | `notificationOrchestratorStore.ts`、`NotificationPreview.vue` | 托盘图标、预览窗、未读聚合 | 后端状态 + chat redb |
| 设置 | `Settings.vue`、`settingsStore.ts` | app storage、头像存储、数据修复 | `global-settings.json`、`avatar-library.json`、`avatars/` |
| 监控诊断 | `shared/monitoring`、`terminalSnapshotAuditStore.ts` | diagnostics commands、日志 | log dir `create_chat.log` 等 |

## 主要风险

- IPC 契约散在前端 bridge 和 Rust gateway 中，没有独立 schema。
- `app.rs`、`TerminalPane.vue`、`Settings.vue`、`chatStore.ts`、`terminal_engine/session/mod.rs` 等文件承担过多职责。
- 聊天、终端、通知、成员状态之间存在多处重复状态，需要在新架构中定义单一事实源。
- redb 表结构和 bincode 编码没有独立迁移版本层，升级 redb 或调整结构前必须设计迁移。
- `SkillStore` 种子数据为空，插件市场/技能商店部分更像 UI 壳，重建时要区分真实功能和占位功能。

## 外部来源

官方升级资料建议以这些入口为准：

- Tauri v2 文档：https://v2.tauri.app/
- Vue 文档：https://vuejs.org/
- Vite 文档：https://vite.dev/
- Pinia 文档：https://pinia.vuejs.org/
- Tailwind CSS 升级指南：https://tailwindcss.com/docs/upgrade-guide
