# 功能库存

本清单按“重建时必须考虑的用户可见功能”和“背后的隐性系统能力”整理。

## 工作区

- 打开本地目录作为工作区。
- 读取最近工作区，展示主列表和更多搜索。
- 处理 workspace project id：
  - 写 `.golutra/workspace.json`。
  - 不可写时使用路径 hash 并标记只读。
  - 检测同 project id 路径变化，询问“移动了”或“复制副本”。
- 写 `.golutra/local.json` 记录本机 localMachineId 和 lastOpenedAt。
- 阻止同一 workspace 在多个窗口重复打开。
- 独立工作区选择窗口。
- 通过侧边栏打开工作区目录。

## 应用窗口

- 无边框窗口、标题栏拖动、最小化、最大化/还原、关闭。
- Windows 关闭主窗口时隐藏到托盘。
- Windows 圆角裁剪和 shadow 规避。
- macOS titlebar overlay。
- 多窗口模式：
  - 主窗口。
  - 工作区选择窗口。
  - 终端窗口。
  - 通知预览窗口。
- 跨窗口同步主题和语言。

## 导航与主界面

- 左侧导航：聊天、好友、技能商店、插件、设置、工作区。
- 工作区未打开时自动显示工作区选择。
- 主视图内包含 ToastStack 和 ContextMenuHost。
- 全局上下文菜单：复制、剪切、粘贴、全选。
- 快捷键系统：
  - 注册规则、组合键解析、profile。
  - 聊天内 jump-to-latest、toggle-mute。

## 聊天

- 默认频道随 workspace 名称展示。
- 频道和私聊列表。
- 群聊创建、私聊 ensure direct。
- 会话 pin/mute/rename/clear/delete。
- 会话成员更新。
- 消息分页加载更早历史。
- 消息发送，最大长度 1200。
- 消息状态：sending、sent、failed。
- 未读计数与 read-through。
- 消息日期分组、跳到最新、打字机效果。
- 文本消息、系统消息。
- 附件展示：
  - 图片附件 display。
  - roadmap 附件入口。
- emoji 面板：
  - 分组、搜索、最近使用 localStorage。
- mention：
  - `@member`。
  - `@all` 解析存在，但当前 `@all` 终端派发被 TODO 处理，不触发真实 terminal dispatch。
- quick prompts：
  - 总结最新讨论。
  - 生成礼貌回复。
  - 提取行动项。
- 终端输出流式回写到聊天。
- 终端头像点击可打开对应成员终端。

## 成员、好友与邀请

- 成员角色：owner、admin、assistant、member、aiAssistant。
- 成员状态：online、working、dnd、offline。
- 成员菜单：
  - 发送私信。
  - 提及。
  - 改名。
  - 设置状态。
  - 打开终端。
  - 移除。
- 好友页：
  - 项目好友与全局好友。
  - 添加/管理/删除联系人。
  - 从好友开启私聊。
  - 好友终端启动/停止。
- 邀请菜单：
  - 管理员邀请：创建全局联系人，不写 workspace 成员。
  - assistant/member 邀请：写入项目成员并可创建终端 session。
  - 支持实例数量、unlimitedAccess、sandboxed 标记。
  - 支持内置 CLI：Gemini、Codex、Claude、OpenCode、Qwen、Shell/Custom CLI。

## 终端

- 独立终端窗口，可按 workspace 复用。
- 自动 tab、窗口 ready 握手、pending tab 队列。
- 新建终端 tab。
- 终端 tab 搜索。
- 最近关闭成员 tab 恢复/忽略。
- tab 拖拽排序、pin 到前面。
- pane 布局：
  - 单窗口。
  - 左右分屏。
  - 上下分屏。
  - 2x2。
- tab 拖到 pane。
- xterm 渲染：
  - canvas、webgl、fit、search。
  - WebGL fallback。
  - IME textarea 特殊 CSS。
  - resize observer、visibility/focus/activation refit。
- 终端上下文菜单：
  - 清除。
  - 查找。
  - 查找选项：大小写、全字、正则。
- 后端 PTY：
  - shell/CLI path 解析。
  - Windows CMD/路径兼容。
  - shim 就绪信号。
  - post-ready plan。
  - output seq、ACK 流控。
  - scrollback 2000 行。
  - snapshot attach。
  - output 批量节流到约 60fps。
  - resource limit toast。
- dispatch：
  - DND 时跳过派发。
  - online 才派发，working 时排队。
  - 同上下文连续消息合并。
  - message id 去重。
  - 队列上限 32。

## 技能与插件

- Skill Management 弹窗：
  - 当前技能。
  - 我的技能。
  - 项目技能 link/unlink。
- 本地技能库：
  - 导入文件夹。
  - 删除文件夹。
  - 打开文件夹。
- workspace `.golutra/skills` 使用 symlink 关联 app data 技能库。
- `SkillStore.vue` 和 `PluginMarketplace.vue` 提供 UI 入口，但真实市场/远程数据未在当前代码中完成。

## 路线图

- Roadmap modal。
- objective 编辑。
- task 新增/编辑/删除。
- 状态：done、in progress、pending。
- 完成百分比。
- 数据存入 project data `roadmap`。

## 设置

- 账户：
  - display name。
  - email 只读。
  - timezone。
  - avatar preset。
  - avatar 上传/删除/重置。
- 外观：
  - dark、light、system。
  - DOM data-theme 和 Tailwind dark class 同步。
- 语言：
  - en-US。
  - zh-CN。
- 成员与终端：
  - 默认成员索引。
  - 自定义成员。
  - 自定义终端。
  - 各 terminal type 路径。
  - 默认终端。
- 通知：
  - desktop、sound、mentionsOnly、previews。
  - quiet hours。
- 快捷键：
  - 启用/禁用。
  - show hints。
  - profile。
- 数据：
  - repair chat DB。
  - clear all chat messages。

## 通知与托盘

- 按窗口聚合未读数。
- 托盘图标切换与闪烁。
- 使用最新未读发送者头像生成托盘图标。
- 托盘 hover 显示通知预览窗口。
- 预览最多 6 条未读。
- 从预览打开：
  - 全部未读。
  - 指定 conversation。
  - 指定 member terminal。
- 忽略全部未读。

## 监控与诊断

- 前端诊断 logger。
- backend diagnostics state。
- frontend batch logging。
- snapshot triplet 诊断。
- chat consistency 诊断。
- terminal snapshot audit modal。
- debug 环境变量：
  - `GOLUTRA_Front_DEBUG`。
  - `GOLUTRA_Backend_DEBUG`。

## 法务与仓库流程

- BSL 1.1 当前许可，未来 GPL-2.0-or-later。
- ICLA/CCLA 文档。
- corporate authorizations JSON。
- GitHub Actions：
  - CLA。
  - legal metadata。
  - PR compliance。

## 部分实现/占位项

这些功能在 UI 或文案中存在，但当前实现不完整，重建时必须重新决策：

- Skill Store 远程市场数据。
- Plugin Marketplace 真实插件安装/管理链路。
- Admin invite 只写联系人，不写 workspace 成员。
- `@all` 派发目前 TODO，不会真正向全部终端成员派发。
- README 提到“模板导入导出、CEO Agent、长期无人托管”等更多是路线图，不在当前代码实现内。

