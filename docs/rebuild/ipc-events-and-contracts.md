# IPC、事件与窗口契约

本文件是重建时最重要的防漏清单。新架构可以改内部实现，但这些 command、event、window mode 和 payload 语义必须逐项确认是否保留、替换或废弃。

## Tauri commands

命令统一从 `src-tauri/src/ui_gateway/commands.rs` 导出。

### 窗口与工作区

| Command | 前端调用 | 作用 |
| --- | --- | --- |
| `terminal_open_window` | `openTerminalWindow.ts` | 打开或复用终端窗口，可带 workspace 上下文和 autoTab |
| `workspace_selection_open_window` | `shared/tauri/windows.ts` | 打开独立工作区选择窗口 |
| `workspace_recent_list` | `workspaceStore.ts` | 读取最近工作区 |
| `workspace_open_folder` | `SidebarNav.vue` | 系统文件管理器打开工作区目录 |
| `workspace_open` | `workspaceStore.ts` | 打开工作区、处理 project id、只读、路径冲突 |
| `workspace_clear_window` | `workspaceStore.ts` | 窗口关闭/切换时清除 workspace-window 映射 |

### 通用存储

| Command | 作用 |
| --- | --- |
| `storage_read_app` / `storage_write_app` | app data JSON 读写 |
| `storage_read_cache` / `storage_write_cache` | app cache JSON 读写 |
| `storage_write_cache_text` | 写文本缓存并返回绝对路径 |
| `storage_read_workspace` / `storage_write_workspace` | 限定在 workspace 根目录内读写 JSON |

### 头像

| Command | 作用 |
| --- | --- |
| `avatar_list` | 列出头像库并清理缺失文件 |
| `avatar_store` | 写入头像 bytes，限制 2MB |
| `avatar_delete` | 删除头像元数据和文件 |
| `avatar_resolve_path` | 根据头像 id 返回本地文件路径 |
| `avatar_read` | 读取头像 bytes 和 MIME |

### 终端

| Command | 作用 |
| --- | --- |
| `terminal_create` | 创建 PTY session，支持 member、workspace、terminal type、command、post-ready、邀请元数据 |
| `terminal_list_environments` | 列出可用终端环境 |
| `terminal_attach` | 将窗口/pane 绑定到既有 session，返回快照 |
| `terminal_write` | 写入用户输入 |
| `terminal_ack` | 前端确认已消费输出字节，用于后端流控 |
| `terminal_set_active` | 标记 UI 是否激活 session |
| `terminal_emit_status` | 主动发送当前 session 状态 |
| `terminal_set_member_status` | 同步成员 DND 等状态到后端 |
| `terminal_dispatch` | 从聊天派发文本到终端，并携带 conversation/sender/message 上下文 |
| `terminal_resize` | 调整 PTY 尺寸 |
| `terminal_close` | 关闭或保留 session，可删除 terminal session map |
| `terminal_list_statuses` | 获取 workspace 内 session 状态 |
| `terminal_snapshot_lines` | 获取终端行快照 |
| `terminal_snapshot_text` | 获取终端文本快照 |
| `terminal_dump_snapshot_lines` | 调试态写快照日志 |

### 聊天

| Command | 作用 |
| --- | --- |
| `chat_ulid_new` | 生成 ULID |
| `chat_repair_messages` | 修复聊天数据 |
| `chat_clear_all_messages` | 清空工作区全部聊天与附件索引 |
| `chat_list_conversations` | 首页会话列表，含 pinned、timeline、default channel、未读 |
| `chat_get_messages` | 分页读取消息 |
| `chat_mark_conversation_read_latest` | 标记会话已读 |
| `chat_send_message` | 写入普通消息 |
| `chat_send_message_and_dispatch` | 写入消息并创建终端派发任务 |
| `chat_create_group` | 创建群聊 |
| `chat_ensure_direct` | 创建或复用私聊 |
| `chat_set_conversation_settings` | pin/mute |
| `chat_rename_conversation` | 重命名群聊 |
| `chat_clear_conversation` | 清空会话消息 |
| `chat_delete_conversation` | 删除会话 |
| `chat_set_conversation_members` | 更新会话成员 |

### 项目数据、成员、技能

| Command | 作用 |
| --- | --- |
| `project_data_read` / `project_data_write` | 读取/写入 `.golutra/workspace.json`，只读时 fallback 到 app data |
| `project_members_invite` | 创建 assistant/member 类型项目成员 |
| `project_members_purge_terminal` | 清理终端成员 |
| `project_skills_list` | 列出 workspace `.golutra/skills` symlink |
| `project_skills_link` | 从 app data 技能库链接到 workspace |
| `project_skills_unlink` | 移除 workspace 技能 symlink |
| `skills_import_folder` | 导入技能文件夹到 app data 技能库 |
| `skills_remove_folder` | 从 app data 技能库删除文件夹 |
| `skills_open_folder` | 系统文件管理器打开技能文件夹 |

### 通知

| Command | 作用 |
| --- | --- |
| `notification_update_state` | 前端发布当前窗口未读状态、预览条目、头像 |
| `notification_get_state` | 通知预览窗口读取当前状态 |
| `notification_preview_hover` | 鼠标进入/离开预览区 |
| `notification_preview_hide` | 手动隐藏预览 |
| `notification_request_ignore_all` | 托盘/预览触发全部忽略 |
| `notification_set_active_window` | 标记当前活跃窗口 |
| `notification_open_terminal` | 从通知打开指定发送者终端 |
| `notification_open_all_unread` | 打开所有未读所在工作区 |
| `notification_open_unread_conversation` | 打开指定未读会话 |

### 监控诊断

| Command | 作用 |
| --- | --- |
| `diagnostics_start_run` / `diagnostics_end_run` | 诊断 run 生命周期 |
| `diagnostics_register_member` | 注册成员 |
| `diagnostics_register_session` | 注册终端 session |
| `diagnostics_register_conversation` | 注册会话 |
| `diagnostics_register_window` | 注册窗口 |
| `diagnostics_log_frontend_event` | 单条前端事件 |
| `diagnostics_log_frontend_batch` | 批量前端事件 |
| `diagnostics_log_snapshot_triplet` | 终端三段快照一致性 |
| `diagnostics_log_chat_consistency` | 聊天/终端一致性 |

### 平台状态

| Command | 作用 |
| --- | --- |
| `platform_get_updater_status` | 获取 updater 状态 |
| `platform_get_activation_status` | 获取 activation 状态 |

## Tauri events

### 后端到前端

| Event | 来源 | 用途 |
| --- | --- | --- |
| `terminal-output` | terminal event port | xterm 渲染增量输出 |
| `terminal-exit` | terminal event port | session 退出 |
| `terminal-status-change` | terminal event port | session/member 状态变化 |
| `terminal-error` | terminal event port | session 错误 |
| `terminal-chat-output` | terminal semantic/chat pipeline | 终端输出作为聊天消息 |
| `terminal-message-stream` | message pipeline | 流式终端消息 |
| `chat-message-created` | chat DB write | 新消息创建 |
| `chat-message-status` | chat DB write/outbox | 消息状态更新 |
| `chat-unread-sync` | chat DB write | 未读数同步 |
| `app-open-workspace-selection` | single-instance plugin | 已有实例被再次打开时唤起工作区选择 |
| `notification-open-conversation` | notification app command | 通知跳转会话 |
| `notification-open-terminal` | notification app command | 通知跳转终端 |
| `notification-preview-updated` | notification state | 更新通知预览窗口 |
| `notification-ignore-all` | notification open all | 当前窗口忽略全部未读 |

### 前端跨窗口/本地事件

| Event | 用途 |
| --- | --- |
| `terminal-open-tab` | 主窗口请求终端窗口打开 tab |
| `terminal-window-ready` | 终端窗口初始化完成 |
| `terminal-window-ready-request` | 主窗口主动请求终端窗口报告 ready |
| `terminal-tab-opened` | 终端窗口确认 tab 已创建 |
| `terminal-snapshot-request` / `terminal-snapshot-response` | 前端快照诊断 |
| `app-theme-changed` | 跨窗口同步主题 |
| `app-locale-changed` | 跨窗口同步语言 |

## Window modes

`App.vue` 通过 query 参数和初始化脚本识别视图：

| mode | 来源 | 作用 |
| --- | --- | --- |
| 默认主窗口 | 无 `view` | 主应用 shell |
| `terminal` | `window.__GOLUTRA_VIEW__ = 'terminal'` | 独立终端窗口 |
| `workspace-selection` | `window.__GOLUTRA_VIEW__ = 'workspace-selection'` | 独立工作区选择窗口 |
| `notification-preview` | `view=notification-preview` 或初始化值 | 托盘悬浮预览窗口 |

## 新架构建议

1. 用 `contracts/commands.ts` 和 Rust `contracts/*.rs` 管理所有命令 DTO。
2. 为每个 event 定义 topic、direction、payload、delivery semantics。
3. 使用生成工具把 Rust serde DTO 输出成 TypeScript 类型，避免手写两份。
4. IPC client 只能在 `shared/api` 调用 Tauri，feature 不直接 `invoke`。
5. 对 command 做端到端 contract tests：前端 payload fixture -> Rust serde deserialize -> handler mock。

