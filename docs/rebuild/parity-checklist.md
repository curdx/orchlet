# 同功能验收清单

使用方法：每完成一个模块，在“状态”列填 `通过/放弃/阻塞`。`通过` 必须有截图、测试、fixture、源码对照或人工 smoke 证据；`放弃` 必须有批准原因；`阻塞` 必须写清阻塞项。

## 工作区

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 可打开任意本地目录作为工作区 | 通过 | Stories 1.2、9.3；`workspace-open` contract；`9-3-workspace-selection-comparison.png`。 |
| 首次打开写入 `.golutra/workspace.json` | 通过 | Story 9.12 mirrors active workspace metadata into `.golutra/workspace.json` while keeping `.orchlet/workspace.json` authoritative for the React rebuild。 |
| 不可写目录进入只读模式 | 通过 | Stories 1.4、9.3；read-only fallback tests and workbench banner coverage。 |
| 路径移动/复制冲突提示 | 通过 | Story 1.3；Story 9.3 记录 React compatibility modal，因为 Golutra 无对应 reference state。 |
| 最近工作区列表和搜索 | 通过 | Stories 1.3、9.3；workspace selection screenshots。 |
| 同 workspace 多窗口去重 | 通过 | Story 1.5；window context fixtures/tests。 |
| 独立工作区选择窗口 | 通过 | Stories 1.5、9.3；window mode contract。 |
| 文件管理器打开工作区 | 通过 | Story 1.4；App tests cover file-manager success/failure toasts。 |

## 聊天

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 默认频道随 workspace 名称显示 | 通过 | Stories 2.4、9.4；chat interface screenshots。 |
| 会话列表 pinned/timeline 排序 | 通过 | Story 9.4; conversation sidebar parity and tests。 |
| 私聊 ensure direct | 通过 | Story 2.4/2.5; Story 9.4 notification/friends routing tests。 |
| 群聊创建与成员更新 | 通过 | Stories 2.4、2.6、9.4。 |
| 消息发送、分页、状态 | 通过 | Story 2.5; App tests and chat fixtures。 |
| 会话 pin/mute/rename/clear/delete | 通过 | Story 2.6; Story 9.4 menu screenshots。 |
| 未读同步和标记已读 | 通过 | Stories 5.1、9.4; notification unread tests。 |
| emoji 搜索与最近使用 | 通过 | Story 9.4; full Golutra emoji data and `9-4-chat-emoji-comparison.png`。 |
| mention member | 通过 | Story 9.4; mention insertion and member menu tests。 |
| `@all` 行为明确实现或明确放弃 | 放弃 | Golutra 当前不实际派发；MVP release notes 保留为不实现/不声明能力。 |
| 图片/roadmap 附件展示 | 通过 | Stories 2.7、6.4、9.4; attachment fixtures and preview screenshots。 |
| 终端输出流式回写聊天 | 通过 | Stories 4.5、7.7; terminal output fixtures and tests。 |

## 成员与邀请

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 默认 owner 自动补齐 | 通过 | Story 2.1; member fixtures。 |
| assistant/member 邀请创建项目成员 | 通过 | Stories 2.2、9.5; invite modal comparisons。 |
| 管理员邀请创建全局联系人 | 通过 | Stories 2.3、9.5; admin invite comparison。 |
| 实例数量、unlimitedAccess、sandboxed 标记 | 通过 | Story 2.2; Story 9.5 runtime/default-access alignment。 |
| 成员状态 online/working/dnd/offline | 通过 | Stories 2.2、9.5; status menu tests/screenshots。 |
| 成员改名、提及、私信、打开终端 | 通过 | Stories 2.2、9.5; member action menu evidence。 |
| 好友页联系人管理 | 通过 | Stories 2.3、9.5; global friends screenshots/tests。 |

## 终端

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 独立终端窗口按 workspace 复用 | 通过 | Stories 3.1、9.6; terminal window mode tests。 |
| 新建/关闭/恢复 tab | 通过 | Stories 3.3、9.6。 |
| tab 搜索、拖拽、pin | 通过 | Story 9.6; terminal context/drag parity notes。 |
| 单 pane、左右、上下、2x2 | 通过 | Stories 3.4、9.6; terminal workspace screenshot。 |
| xterm canvas/webgl/fit/search | 通过 | Stories 3.5、9.6; find overlay screenshot/tests。 |
| 终端上下文菜单 clear/find | 通过 | Story 9.6; `9-6-terminal-context-menu-comparison.png`。 |
| create/attach/write/resize/close commands | 通过 | Stories 3.2、3.5; terminal contract tests。 |
| output seq 与 ACK 流控 | 通过 | Story 3.2; terminal stream fixtures。 |
| snapshot lines/text | 通过 | Stories 3.2、8.2; snapshot diagnostics tests。 |
| shell/CLI path 解析 | 通过 | Story 3.6; settings terminal config fixtures。 |
| shim ready 和 post-ready plan | 通过 | Story 3.6; terminal lifecycle tests。 |
| DND 跳过派发 | 通过 | Story 4.3; dispatch queue tests。 |
| working queue、去重、batch merge | 通过 | Stories 4.3、4.4。 |
| session 退出和窗口销毁清理 | 通过 | Stories 3.2、3.6; terminal tests。 |

## 通知

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 托盘未读聚合 | 通过 | Stories 5.1、9.9; unread summary tests。 |
| 托盘图标切换/闪烁 | 通过/待平台 smoke | Story 9.11 adds native tray icon switching and transparent-icon blink lifecycle; Rust intent tests pass。 |
| 发送者头像渲染为托盘图标 | 通过/待平台 smoke | Story 9.11 extends unread payloads with avatar PNG bytes and uses avatar icon intent before falling back to Golutra unread icon。 |
| hover 预览窗口 | 通过/待平台 smoke | Story 9.11 adds tray enter/move/leave handling, preview hover IPC and hide-before-action tests。 |
| 打开全部未读 | 通过 | Stories 5.2、9.9; notification preview tests。 |
| 打开指定会话 | 通过 | Stories 5.2、9.9。 |
| 打开发送者终端 | 通过 | Stories 5.2、9.9; `terminalMemberId` handler tests。 |
| 忽略全部未读 | 通过 | Story 5.3; Story 9.9 tests。 |

## 设置

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 全局设置 hydrate/persist/normalize | 通过 | Stories 7.3、9.7; settings tests。 |
| 主题 dark/light/system | 通过 | Stories 7.3、9.7; theme card screenshots。 |
| 中英文语言包 | 通过 | Stories 7.3、9.7。 |
| 账号 displayName/email/timezone/status | 通过 | Stories 7.1、9.7。 |
| 头像 preset/upload/delete/reset | 通过 | Stories 7.2、9.7; avatar menu comparison。 |
| 通知设置和 quiet hours | 通过 | Stories 7.4、9.7。 |
| 快捷键 profile 和启用开关 | 通过 | Stories 7.5、9.7。 |
| 终端路径、自定义 CLI、默认终端 | 通过 | Stories 7.6、9.7。 |
| chat streamOutput 开关 | 通过 | Story 7.7; settings parity tests。 |
| repair chat DB | 通过 | Story 7.8; diagnostics/data tests。 |
| clear all chat messages | 通过 | Story 7.8。 |

## 技能与插件

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 本地技能库导入文件夹 | 通过 | Stories 6.1、9.8; App tests。 |
| 本地技能库删除/打开 | 通过 | Stories 6.3、9.8。 |
| workspace `.golutra/skills` symlink | 通过 | Story 9.15 reads legacy Golutra workspace skill symlinks when current `.orchlet/skills/skill-links.json` is absent and keeps current schema authoritative。 |
| 项目技能 list/link/unlink | 通过 | Story 6.2; Story 9.8 tests。 |
| Skill Store 占位行为明确 | 通过 | Story 9.8; Golutra `skills` array is TODO empty。 |
| Plugin Marketplace 占位行为明确 | 通过 | Story 9.8; Golutra `plugins` array is TODO empty。 |

## 数据兼容

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 可读取旧 `.golutra/workspace.json` | 通过 | Story 9.12 reads legacy Golutra workspace metadata before creating `.orchlet/workspace.json`, preserves legacy SHA-256 project ids and mirrors unknown legacy fields。 |
| 可刷新旧 `.golutra/local.json` | 通过 | Story 9.12 preserves `localMachineId` and refreshes `lastOpenedAt` on writable opens。 |
| 可读取旧 `global-settings.json` | 通过 | Story 9.13 maps legacy theme/language/profile/notification/keybind/chat-output/terminal settings when current `settings/*.json` files are absent, with current stores taking precedence。 |
| 可读取或迁移旧 `chat.redb` | 通过 | Story 9.18 imports legacy per-workspace `chat.redb` channel/DM conversations and text/system messages into current SQLite when current chat is empty; current SQLite remains authoritative and corrupt legacy redb returns a recoverable error without importing corrupted data。 |
| 可保留 `recent-workspaces.json` | 通过 | Story 9.14 maps legacy recent workspace arrays into current registry/recent entries when current schema is absent。 |
| 可保留 `workspace-registry.json` | 通过 | Story 9.14 maps Golutra project-id registry maps into current schema and keeps current schema authoritative when present。 |
| 可保留头像库 | 通过 | Story 9.17 reads Golutra `account.avatar = local:<id>` through root-level `avatar-library.json` and `avatars/<filename>` when current `settings/profile.json` is absent; current profile remains authoritative。 |
| 可保留 contacts | 通过 | Story 9.16 imports root-level Golutra `contacts.json` when the current SQLite contacts table is absent and keeps current contact data authoritative once initialized。 |
| schema version 和 migration report | 通过 | New schema validation and reports exist; legacy compatibility boundaries are tracked separately from packaged smoke release blockers。 |

## 平台与发布

| 项 | 状态 | 备注 |
| --- | --- | --- |
| Windows 无边框/圆角/托盘行为 | 阻塞 | Packaged Windows smoke is not recorded; native tray lifecycle has code/test evidence from Story 9.11 but no packaged OS smoke。 |
| macOS titlebar overlay | 阻塞 | Packaged macOS smoke is not recorded。 |
| Linux xdg-open 与窗口行为 | 阻塞 | Packaged Linux smoke is not recorded。 |
| Tauri capabilities 最小权限 | 通过 | Capability status validator passes。 |
| debug log 仅调试态 | 通过 | Diagnostics/capability stories and validators cover debug/capability labeling。 |
| build、preview、test、lint 脚本 | 通过 | `pnpm test`, `pnpm build`, release readiness validator and `git diff --check` pass structurally。 |
| CLA/法律文档保留 | 通过 | `docs/legal/*` and `docs/index.md` retained。 |
