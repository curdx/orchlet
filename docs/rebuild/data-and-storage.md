# 数据与存储模型

## 存储位置总览

| 位置 | 路径/文件 | 内容 |
| --- | --- | --- |
| app data | `global-settings.json` | 账户、通知、快捷键、聊天、主题、成员终端配置 |
| app data | `global-data.json` | 全局 UI/应用数据 |
| app data | `contacts.json` | 全局联系人/管理员邀请结果 |
| app data | `recent-workspaces.json` | 最近打开工作区 |
| app data | `workspace-registry.json` + lock | workspace project id 与路径映射 |
| app data | `avatar-library.json` + `avatars/` | 上传头像索引与文件 |
| app data | `<workspaceId>/project.json` | 工作区项目数据 fallback |
| app data | `<workspaceId>/chat.redb` | 聊天 redb 主库 |
| app data | `skills/` | 本地技能库文件夹 |
| app cache | `<workspaceId>/session.json` | 当前 active conversation 等缓存 |
| workspace | `.golutra/workspace.json` | 项目成员、路线图、技能、终端最近关闭 tab |
| workspace | `.golutra/local.json` | 本机 local machine id 与最后打开时间 |
| workspace | `.golutra/skills` | 指向 app data 技能库的 symlink |
| browser localStorage | `golutra-theme`、`golutra-locale`、`terminal-last-size`、emoji recents、terminal snapshot cache | 首屏体验和 UI 缓存 |

## 工作区数据

`message_service/project_data.rs` 定义 canonical workspace data path：

```text
.golutra/workspace.json
```

前端 `projectStore.ts` 规范化为：

```ts
type ProjectData = {
  projectId: string;
  version: number;
  members: Member[];
  memberSequence?: Record<string, number>;
  terminal: {
    recentClosedTabs: Array<{ memberId: string; closedAt: number }>;
  };
  roadmap: {
    objective: string;
    tasks: RoadmapTask[];
  };
  skills: {
    current: ProjectSkill[];
  };
};
```

读写策略：

- 优先读 workspace `.golutra/workspace.json`。
- workspace 不可读时读 app data `<workspaceId>/project.json`。
- workspace 只读或写入失败时写 app data fallback。
- 成员邀请会补齐默认 owner，并维护 `memberSequence` 以生成稳定名称后缀。

## 聊天数据库

聊天主库使用 redb，每个 workspace 一个库：

```text
<app_data>/<workspaceId>/chat.redb
```

表定义在 `message_service/chat_db/store.rs`：

| 表 | Key | Value | 作用 |
| --- | --- | --- | --- |
| `users` | `UserId` | bincode `UserProfile` | 用户资料 |
| `conversations` | `ConvId` | bincode `ConversationMeta` | 会话元数据 |
| `user_convs` | `(UserId, ConvId)` | bincode `UserConversationSettings` | pin/mute/read/active |
| `timeline_index` | `(UserId, TsRev, ConvId)` | `()` | 用户会话时间线 |
| `messages` | `(ConvId, MsgId)` | bincode `ChatMessage` | 消息 |
| `attachments_index` | `(ConvId, kind, TsRev, MsgId)` | bincode metadata | 附件索引 |
| `members` | `(ConvId, UserId)` | bincode `MemberEntry` | 会话成员 |
| `terminal_session_map` | `member_id` | bincode `TerminalSessionMapEntry` | 成员到 terminal session |
| `terminal_session_index` | `session_id` | bincode `TerminalSessionIndexEntry` | terminal session 到成员 |
| `chat_outbox_tasks` | `MsgId` | bincode `ChatOutboxTask` | 待派发/重试任务 |
| `chat_outbox_schedule` | `(nextAttemptAt, MsgId)` | `()` | outbox 调度索引 |

ID 策略：

- 前后端对外统一使用 ULID 字符串。
- DB 内部使用 ULID 的 `u128`。
- `TsRev = u64::MAX - timestamp`，用于最新优先扫描。

风险：

- Value 使用 bincode，无独立 schema version。
- redb 升级到新主版本前要设计导出/导入或迁移工具。
- message content 和 attachment 已有 `Db` 版本类型，是迁移层的入口，但还不完整。

## 终端状态

终端 session 主要是后端内存状态，由 `TerminalManager` 管理；持久化只保留映射和 UI 辅助状态。

重要运行时数据：

- PTY child/reader/writer。
- session id、member id、workspace id、terminal type。
- status：online、working、offline、pending/connecting 等前端映射。
- output seq、scrollback、snapshot、cursor、rows/cols。
- dispatch queue、inflight message id、recent duplicate window。
- flow control 未 ACK 字节计数。

前端保留：

- `terminalStore`：tabs、activeId、layoutMode、paneAssignments、pinned、activity。
- `terminalMemberStore`：memberId -> terminalId session 映射快照。
- localStorage `terminal-last-size`。
- workspace project data `terminal.recentClosedTabs`。

## 设置数据

`global-settings.json` 由 `settingsStore.ts` 规范化，关键结构：

```ts
type SettingsState = {
  appearance: { theme: 'dark' | 'light' | 'system' };
  locale: 'en-US' | 'zh-CN';
  account: {
    displayName: string;
    email: string;
    title: string;
    avatar: string;
    timezone: TimeZoneId;
    status: 'online' | 'working' | 'dnd' | 'offline';
    statusMessage: string;
  };
  notifications: {
    desktop: boolean;
    sound: boolean;
    mentionsOnly: boolean;
    previews: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  keybinds: { enabled: boolean; showHints: boolean; profile: KeybindProfile };
  chat: { streamOutput: boolean };
  members: {
    defaultMemberIndex: MemberSelectionIndex;
    customMembers: CustomMember[];
    customTerminals: CustomTerminal[];
    terminalPaths: Partial<Record<TerminalType, string>>;
    defaultTerminalName: string;
    defaultTerminalPath: string;
  };
};
```

## 技能数据

有两层：

- 本地技能库：app data `skills/`，通过 `skills_import_folder` 导入。
- 项目技能：workspace `.golutra/skills`，通过 symlink 指向本地技能库。

当前 `skillLibrary.ts` 中种子数组为空，表示“技能库展示数据”并未内置真实市场数据。重建时不要把 Skill Store 当作完整远程市场来复刻，除非另行定义产品需求。

## 迁移建议

1. 为每类存储建立 `StorageManifest`：路径、owner、schema version、读写方、是否可迁移。
2. redb 表结构升级前先实现 `export_workspace_data` 和 `import_workspace_data`。
3. 工作区 `.golutra/workspace.json` 增加 `schemaVersion` 和 migration history。
4. 把 browser localStorage 只用于 UI 缓存，不放业务事实。
5. 所有文件路径通过 Rust storage service 解析，前端不拼接真实磁盘路径。

