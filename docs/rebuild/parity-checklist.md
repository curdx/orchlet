# 同功能验收清单

使用方法：每完成一个模块，在“状态”列填 `未开始/进行中/通过/放弃`，放弃必须写原因。

## 工作区

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 可打开任意本地目录作为工作区 | 未开始 |  |
| 首次打开写入 `.golutra/workspace.json` | 未开始 |  |
| 不可写目录进入只读模式 | 未开始 |  |
| 路径移动/复制冲突提示 | 未开始 |  |
| 最近工作区列表和搜索 | 未开始 |  |
| 同 workspace 多窗口去重 | 未开始 |  |
| 独立工作区选择窗口 | 未开始 |  |
| 文件管理器打开工作区 | 未开始 |  |

## 聊天

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 默认频道随 workspace 名称显示 | 未开始 |  |
| 会话列表 pinned/timeline 排序 | 未开始 |  |
| 私聊 ensure direct | 未开始 |  |
| 群聊创建与成员更新 | 未开始 |  |
| 消息发送、分页、状态 | 未开始 |  |
| 会话 pin/mute/rename/clear/delete | 未开始 |  |
| 未读同步和标记已读 | 未开始 |  |
| emoji 搜索与最近使用 | 未开始 |  |
| mention member | 未开始 |  |
| `@all` 行为明确实现或明确放弃 | 未开始 | 当前旧版不实际派发 |
| 图片/roadmap 附件展示 | 未开始 |  |
| 终端输出流式回写聊天 | 未开始 |  |

## 成员与邀请

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 默认 owner 自动补齐 | 未开始 |  |
| assistant/member 邀请创建项目成员 | 未开始 |  |
| 管理员邀请创建全局联系人 | 未开始 |  |
| 实例数量、unlimitedAccess、sandboxed 标记 | 未开始 |  |
| 成员状态 online/working/dnd/offline | 未开始 |  |
| 成员改名、提及、私信、打开终端 | 未开始 |  |
| 好友页联系人管理 | 未开始 |  |

## 终端

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 独立终端窗口按 workspace 复用 | 未开始 |  |
| 新建/关闭/恢复 tab | 未开始 |  |
| tab 搜索、拖拽、pin | 未开始 |  |
| 单 pane、左右、上下、2x2 | 未开始 |  |
| xterm canvas/webgl/fit/search | 未开始 |  |
| 终端上下文菜单 clear/find | 未开始 |  |
| create/attach/write/resize/close commands | 未开始 |  |
| output seq 与 ACK 流控 | 未开始 |  |
| snapshot lines/text | 未开始 |  |
| shell/CLI path 解析 | 未开始 |  |
| shim ready 和 post-ready plan | 未开始 |  |
| DND 跳过派发 | 未开始 |  |
| working queue、去重、batch merge | 未开始 |  |
| session 退出和窗口销毁清理 | 未开始 |  |

## 通知

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 托盘未读聚合 | 未开始 |  |
| 托盘图标切换/闪烁 | 未开始 |  |
| 发送者头像渲染为托盘图标 | 未开始 |  |
| hover 预览窗口 | 未开始 |  |
| 打开全部未读 | 未开始 |  |
| 打开指定会话 | 未开始 |  |
| 打开发送者终端 | 未开始 |  |
| 忽略全部未读 | 未开始 |  |

## 设置

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 全局设置 hydrate/persist/normalize | 未开始 |  |
| 主题 dark/light/system | 未开始 |  |
| 中英文语言包 | 未开始 |  |
| 账号 displayName/email/timezone/status | 未开始 |  |
| 头像 preset/upload/delete/reset | 未开始 |  |
| 通知设置和 quiet hours | 未开始 |  |
| 快捷键 profile 和启用开关 | 未开始 |  |
| 终端路径、自定义 CLI、默认终端 | 未开始 |  |
| chat streamOutput 开关 | 未开始 |  |
| repair chat DB | 未开始 |  |
| clear all chat messages | 未开始 |  |

## 技能与插件

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 本地技能库导入文件夹 | 未开始 |  |
| 本地技能库删除/打开 | 未开始 |  |
| workspace `.golutra/skills` symlink | 未开始 |  |
| 项目技能 list/link/unlink | 未开始 |  |
| Skill Store 占位行为明确 | 未开始 |  |
| Plugin Marketplace 占位行为明确 | 未开始 |  |

## 数据兼容

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 可读取旧 `.golutra/workspace.json` | 未开始 |  |
| 可读取旧 `global-settings.json` | 未开始 |  |
| 可读取或迁移旧 `chat.redb` | 未开始 |  |
| 可保留 `recent-workspaces.json` | 未开始 |  |
| 可保留 `workspace-registry.json` | 未开始 |  |
| 可保留头像库 | 未开始 |  |
| 可保留 contacts | 未开始 |  |
| schema version 和 migration report | 未开始 |  |

## 平台与发布

| 项 | 状态 | 备注 |
| --- | --- | --- |
| Windows 无边框/圆角/托盘行为 | 未开始 |  |
| macOS titlebar overlay | 未开始 |  |
| Linux xdg-open 与窗口行为 | 未开始 |  |
| Tauri capabilities 最小权限 | 未开始 |  |
| debug log 仅调试态 | 未开始 |  |
| build、preview、test、lint 脚本 | 未开始 |  |
| CLA/法律文档保留 | 未开始 |  |

