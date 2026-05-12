# 现代化重建蓝图

## 重建目标

目标不是逐行迁移，而是做一个“功能一模一样、架构更新”的版本。推荐原则：

1. 先冻结功能契约，再重写内部结构。
2. 先实现数据/IPC/事件兼容层，再换 UI 与领域结构。
3. 每一步都能运行，不做长时间大爆炸重写。
4. 所有旧功能通过 parity checklist 验收，不靠记忆。

## 推荐目标架构

### 前端

建议采用 Feature-Sliced Design 风格：

```text
src/
├── app/                  # 启动、providers、window mode、全局样式
├── pages/                # ChatPage、TerminalPage、WorkspacePage、SettingsPage
├── widgets/              # Sidebar、Titlebar、MembersPanel、ConversationList
├── features/             # send-message、invite-member、open-terminal、manage-skills
├── entities/             # workspace、member、conversation、message、terminal-session
└── shared/
    ├── api/              # typed Tauri IPC client
    ├── ui/               # 基础 UI 组件
    ├── config/
    ├── lib/
    └── contracts/        # 由 Rust DTO 生成或集中维护
```

关键约束：

- feature 不直接 `invoke`，只能调用 `shared/api`。
- store 不直接承担复杂副作用；副作用进入 use case/composable service。
- 每个实体有明确 model、repository、adapter。
- 窗口模式、主题、语言、快捷键是 app/shared 层能力。

### 后端

建议采用 Clean Architecture + adapter：

```text
src-tauri/src/
├── lib.rs
├── gateway/              # Tauri commands/events，只做 DTO 转换和调用 use case
├── app/                  # use cases
├── domain/               # Workspace、Chat、Terminal、Notification 聚合
├── infrastructure/
│   ├── persistence/      # redb、json files、migrations
│   ├── terminal/         # portable-pty、shim、xterm snapshots
│   ├── desktop/          # Tauri window/tray/dialog/shell
│   └── diagnostics/
├── contracts/            # serde DTO + TS generation source
└── workers/              # poller、outbox、snapshot dumper、command ipc
```

关键约束：

- `gateway` 不放业务逻辑。
- `domain` 不依赖 Tauri。
- 所有 app data/workspace path 经过 `StorageService`。
- redb schema、JSON schema、event schema 都要有版本号。
- outbox、terminal dispatch、notification 都按独立 worker 管理生命周期。

## 现代化依赖方向

2026-05-11 本地 registry 检查显示：Vite/Tailwind/TypeScript/Tauri/redb 都有更新空间。建议迁移顺序：

1. 先保持 Tauri 2，不要跨 major 桌面框架。
2. 前端升级优先级：Vite -> Vue plugin -> Tailwind 4 -> TypeScript。
3. 后端升级优先级：Tauri patch/minor -> tauri plugins -> redb。
4. redb 升级必须在导出/导入和 schema version 之后。
5. xterm 当前版本无需作为第一优先级升级。

官方资料入口：

- Tauri v2：https://v2.tauri.app/
- Vite：https://vite.dev/
- Vue：https://vuejs.org/
- Pinia：https://pinia.vuejs.org/
- Tailwind upgrade guide：https://tailwindcss.com/docs/upgrade-guide

## 分阶段重建计划

### Phase 0：冻结契约

产物：

- IPC command schema。
- event schema。
- storage manifest。
- feature parity checklist。
- 当前数据样例 fixtures。

工作：

1. 把 `ipc-events-and-contracts.md` 转成机器可读 `contracts.yaml`。
2. 从现有 `.golutra/workspace.json`、`global-settings.json`、`chat.redb` 导出样例。
3. 写 smoke tests：打开工作区、创建成员、发送消息、创建终端、通知未读。
4. 明确哪些功能是占位，不纳入第一版。

### Phase 1：建立新骨架

产物：

- 新 Tauri/Vue 项目骨架。
- typed IPC client。
- 基础 UI shell。
- workspace open/read-only/registry 流程。

工作：

1. 搭建 Tauri 2 + Vue + Vite + Pinia + Tailwind。
2. 实现 app/window mode：main、terminal、workspace-selection、notification-preview。
3. 移植主题、语言、标题栏、Toast、ContextMenu、Sidebar。
4. 实现 StorageService 与 workspace registry。
5. 用旧 fixtures 做兼容读取。

验收：

- 能打开真实目录。
- 能复用最近工作区。
- 能处理移动/复制冲突。
- 能进入主 shell。

### Phase 2：聊天与成员

产物：

- Conversation/Message/Member entities。
- redb chat repository。
- chat UI 基础流。
- project data migration。

工作：

1. 迁移 `.golutra/workspace.json` schema。
2. 实现 owner、assistant、member、admin contact。
3. 实现会话列表、默认频道、私聊、群聊。
4. 实现消息发送、分页、pin/mute/rename/clear/delete。
5. 实现 emoji、mention、附件展示、roadmap modal。
6. 实现未读同步和 read-through。

验收：

- 所有聊天操作写入 redb。
- 刷新/重开后消息、会话、成员一致。
- 当前旧数据能读取或迁移。

### Phase 3：终端引擎

产物：

- TerminalSession domain。
- PTY adapter。
- xterm renderer composables。
- 终端窗口与 tab/pane 系统。

工作：

1. 重写 session lifecycle：create、attach、write、resize、close。
2. 实现 output seq、ACK、flow control、snapshot。
3. 实现 terminal type resolution 与 shell/CLI path 解析。
4. 实现 tab、pin、拖拽、split layouts、search、context menu。
5. 移植 post-ready plan 与 shim ready。
6. 实现 member terminal status 同步。

验收：

- 本地 shell、Codex/Gemini/Claude/Qwen/OpenCode/custom CLI 均可启动或正确报错。
- 输出不丢、不乱序、可 attach。
- 关闭窗口后 session 清理符合旧行为。

### Phase 4：聊天到终端编排

产物：

- dispatch use cases。
- outbox worker。
- terminal semantic/message pipeline。

工作：

1. 实现 `chat_send_message_and_dispatch`。
2. 实现 mentions -> target terminal 解析。
3. 实现 DND、working queue、duplicate message id、batch merge。
4. 实现 terminal output -> chat stream/final。
5. 实现 message status 更新。

验收：

- DM 直接派发到目标终端。
- 群聊只派发给 mention 到的终端成员。
- working 时排队，online 后继续。
- 终端回复能回写聊天并触发未读。

### Phase 5：通知、技能、设置、诊断

产物：

- tray/preview notification。
- skill library/project skill link。
- 完整 settings。
- diagnostics。

工作：

1. 移植托盘、未读聚合、预览窗口、点击跳转。
2. 移植头像上传、账号、语言、主题、通知、快捷键、终端路径设置。
3. 移植技能库导入、删除、打开、workspace symlink。
4. 移植 chat repair/clear all。
5. 移植 terminal snapshot audit。

验收：

- 通知预览能打开工作区/会话/终端。
- 技能 symlink 在 workspace 中正确创建/删除。
- 所有设置重启后保留。
- 诊断日志能产出。

### Phase 6：兼容、发布、收口

产物：

- 数据迁移工具。
- E2E 测试矩阵。
- 发布配置。
- 用户迁移说明。

工作：

1. 旧数据迁移 dry-run。
2. Windows/macOS/Linux smoke。
3. terminal CLI 环境探测。
4. 权限和 capabilities 最小化。
5. README、Security、Contributing、license 文档同步。

验收：

- 旧版本用户工作区可打开。
- 不丢聊天、成员、设置、技能链接。
- 所有 parity checklist 通过或有明确放弃记录。

## 不建议的做法

- 不要先重画 UI 再补业务，容易漏终端/通知/数据边界。
- 不要一开始升级 redb major 后再迁移功能。
- 不要让前端直接复刻所有 `invoke` 字符串。
- 不要把当前 store 原样搬到新项目。
- 不要把 README 路线图功能当作当前已实现功能。

