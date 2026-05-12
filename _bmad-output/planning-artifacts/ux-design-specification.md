---
stepsCompleted:
  - 1
  - 2
  - 10
  - 11
  - 12
  - 13
  - 14
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/research/technical-react-cross-platform-desktop-ai-cli-orchestration-architecture-research-2026-05-11.md
referenceProjects:
  - /Users/wdx/opc/golutra
workflowType: 'ux-design'
project_name: 'orchlet'
user_name: '王定旭'
date: '2026-05-11'
status: 'complete'
scope: 'screen_and_button_level_interaction_spec'
classification:
  projectType: desktop_app
  frontendRequirement: React
  frontendExclusion: Vue
  platformRequirement: Windows_macOS_Linux
  dataCompatibility: greenfield_new_schema_no_legacy_migration
---

# UX Design Specification orchlet

**Author:** 王定旭  
**Date:** 2026-05-11

---

## Executive Summary

### Project Vision

orchlet 是面向开发者和 AI 协作工作流的跨平台桌面应用。用户打开本地项目目录后，可以在同一工作区内完成聊天协作、成员/AI CLI 管理、终端会话、任务派发、技能链接、路线图、通知和诊断。

本 UX 规格补足 PRD 与 Epics 中缺少的页面级和按钮级细节。参考项目 `/Users/wdx/opc/golutra` 用作功能与交互形态参考，不继承旧 Vue/Pinia 实现，不读取旧 `.golutra` 数据；orchlet 新实现使用 React + TypeScript + Tauri 2 + Rust + SQLite/rusqlite + `.orchlet`。

### Reference Extraction

本规格从 golutra 下列页面/组件提取交互：

- `src/app/App.vue`: 窗口外壳、标题栏、主导航、窗口模式切换。
- `src/features/WorkspaceSelection.vue`: 打开文件夹、最近工作区、错误提示。
- `src/shared/components/SidebarNav.vue`: 主导航、账号状态菜单、未读徽标。
- `src/features/chat/ChatInterface.vue`: 聊天主工作台、成员侧栏、弹窗协调。
- `src/features/chat/components/*`: 会话列表、聊天头部、消息列表、输入框、成员行、邀请菜单。
- `src/features/chat/modals/*`: 邀请、成员管理、路线图、技能管理、会话重命名。
- `src/features/terminal/*`: 终端窗口、标签页、分屏、查找、右键菜单、会话恢复。
- `src/features/Settings.vue`: 设置页所有分区和操作按钮。
- `src/features/SkillStore.vue`: 技能商店/我的技能/本地技能文件夹。
- `src/features/notifications/NotificationPreview.vue`: 通知预览、忽略、查看、打开终端。

### Target Users

- 主要用户：高频使用 AI CLI、终端和本地项目目录的开发者。
- 次要用户：需要通过聊天分配任务、追踪 AI 输出和维护项目技能库的技术负责人。
- 用户熟练度：默认具备桌面软件、终端、CLI 路径、工作区目录和本地文件权限概念。

### UX Principles

- 启动后直接进入可操作的工作区体验，不做营销首页。
- 左侧/底部导航只放核心入口，主屏保持工作台密度。
- 聊天、成员、终端是一个闭环：聊天发起任务，终端执行，输出回写聊天。
- 所有按钮必须有明确可见反馈：禁用、加载、成功、失败、只读不可用。
- 所有 icon button 在 React 实现中使用 lucide icon，并提供 `aria-label`/tooltip。
- 不使用 Vue 组件名、Pinia store 或旧 `.golutra` 文件作为新实现边界。

## App Navigation Map

### Window Modes

| Window Mode | 用户看到什么 | 主要用途 | 入口 |
| --- | --- | --- | --- |
| Workspace Selection | 打开文件夹卡片、最近工作区、更多/搜索、错误提示 | 首次启动或切换工作区 | 首次启动、无当前工作区、导航工作区入口 |
| Main Window | 左侧/底部主导航 + 主内容区 | 聊天、好友、技能、插件、设置 | 打开工作区后 |
| Terminal Window | 终端标题、标签搜索、新建标签、标签栏、分屏 pane | 运行 shell/AI CLI/成员终端 | 成员头像、成员菜单、消息头像、通知、终端入口 |
| Notification Preview | 未读消息预览卡片、打开终端、忽略全部、查看全部 | 托盘/通知快速处理 | 系统托盘 hover/click 或通知事件 |

### Main Navigation

| 导航按钮 | 图标建议 | 点击结果 | 徽标/状态 |
| --- | --- | --- | --- |
| 聊天 | `MessageCircle` | 显示 Chat Workbench | 有未读时显示 `1..99+` |
| 好友 | `Users` | 显示 Friends 页面 | 无 |
| 工作区 | `FolderOpen` | Tauri 中打开当前工作区文件夹；无工作区或失败时进入 Workspace Selection | 无 |
| 技能商店 | `Store` | 显示 Skill Store 页面 | 无 |
| 插件 | `Puzzle` | 显示 Plugin Marketplace，占位功能必须标明 placeholder | 无 |
| 设置 | `Settings` | 显示 Settings 页面 | 无 |
| 账号头像 | avatar + status dot | 打开状态菜单 | 在线/工作中/请勿打扰/离线 |

## Global Window Shell

### 标题栏

用户在 Windows/Linux 看到自绘标题栏；macOS 使用系统窗口控制。

| 控件 | 显示 | 点击行为 |
| --- | --- | --- |
| 标题文本 | `当前上下文 - orchlet`，例如 `Workspaces - orchlet`、`Terminal - orchlet`、`项目名 - orchlet` | 不可点击；支持拖拽窗口 |
| 最小化 | icon button | 调用 Tauri window minimize |
| 最大化/还原 | icon button | 未最大化时最大化，已最大化时还原 |
| 关闭 | icon button | 关闭当前窗口；主窗口关闭遵循 Tauri 应用生命周期策略 |
| 标题栏双击 | 整个拖拽区域 | 切换最大化/还原 |
| 窗口边缘 resize handle | 不可见热区 | 支持八方向 resize |

### 全局上下文菜单

| 触发位置 | 菜单项 | 行为 |
| --- | --- | --- |
| 输入框/textarea/contenteditable | 复制、剪切、粘贴、全选 | 使用浏览器/系统剪贴板；不可用项禁用 |
| 终端 tab | 关闭当前、关闭其它、关闭右侧、置顶/取消置顶、单窗口、左右分屏、上下分屏、四分屏 | 调整终端标签和布局 |

### Toast 与错误反馈

每个后台失败必须转成可见反馈。提示内容格式固定为：

- 发生了什么：一句短标题。
- 影响范围：当前操作失败/数据未保存/终端未启动。
- 下一步动作：重试、检查路径、打开设置、切换工作区。

## Workspace Selection

### 第一屏布局

用户打开 app 后，如果没有当前工作区，显示工作区选择页：

- 居中大卡片：`打开文件夹`。
- 副标题：`选择一个文件夹开始或恢复工作区`。
- 最近工作区区块：`最近的工作区`。
- 最近工作区为空时显示历史 icon、`暂无最近工作区`、`打开文件夹以创建你的第一个工作区。`
- 最近工作区有记录时显示最多 3 个主卡片，更多记录放到 `更多` 下拉。

### 按钮与交互

| 控件 | 显示 | 点击/输入行为 | 状态 |
| --- | --- | --- | --- |
| 打开文件夹卡片 | 大号 `FolderOpen` icon + 标题 + 副标题 | 打开系统目录选择器；确认后创建/读取 `.orchlet/workspace.json` 并进入主窗口 | 选择取消时保持当前页 |
| 最近工作区卡片 | 文件夹 icon、工作区名、路径、最近打开时间、`打开` | 打开该路径；成功后进入主窗口 | 路径不存在或不可读时显示错误 toast |
| 更多 | `更多` + chevron | 打开更多最近工作区 popover | 无更多记录时隐藏 |
| 更多搜索框 | 搜索 icon + `搜索文件夹...` | 按工作区名和路径过滤更多列表 | 无结果显示 `未找到匹配的工作区` |
| 错误提示关闭 | `X` | 清除错误提示 | 错误提示 5 秒自动消退 |

### Workspace Registry 冲突弹窗

当检测同一 project id 被不同路径打开时弹窗：

| 内容 | 规格 |
| --- | --- |
| 标题 | `工作区位置变化` |
| 正文 | 展示旧路径、当前路径，说明检测到项目位置变化 |
| 按钮：移动了 | 保留 project id，把 registry 路径更新为新路径 |
| 按钮：复制副本 | 生成新的 project id，作为新工作区写入 `.orchlet` |
| 按钮：取消 | 不打开工作区，回到选择页 |

### 只读工作区

如果目录不可写，仍允许打开但进入只读模式：

- 主聊天页顶部显示红色只读横幅。
- 所有会写入 `.orchlet` 的按钮禁用或转为应用数据 fallback。
- 横幅文案说明不可写原因和影响。

## Main Shell

### 桌面布局

- 左侧固定 nav rail，宽约 88px。
- 主内容区填满剩余空间。
- Chat 页面内部为三栏：会话侧栏、消息区、成员侧栏。
- 移动/窄窗口时主导航变成底部栏，成员侧栏变为 drawer。

### 账号状态菜单

| 控件 | 显示 | 点击行为 |
| --- | --- | --- |
| 头像按钮 | 当前头像 + 状态 dot | 打开状态菜单 |
| 在线 | green dot + `在线` | 设置用户状态为 online，并同步 owner/member 展示 |
| 工作中 | amber dot + `工作中` | 设置用户状态为 working |
| 请勿打扰 | red dot + `请勿打扰` | 设置状态为 dnd，并影响通知/派发策略 |
| 离线 | grey dot + `离线` | 设置状态为 offline |

## Chat Workbench

### 页面布局

打开工作区后的默认主页面是 Chat Workbench：

- 左侧 Chat Sidebar：工作区名、频道列表、私信列表。
- 中间 Chat Main：只读横幅、聊天头部、消息列表、输入框。
- 右侧 Members Sidebar：owner/admin/assistant/member 分组。

### Chat Sidebar

| 控件 | 显示 | 点击行为 |
| --- | --- | --- |
| 工作区标题 | `layers` icon + 工作区名 | 不可点击 |
| 频道标题 | `频道` | 区块标题 |
| 频道添加按钮 | `Plus`，hover 显示 | MVP: 打开创建群聊/频道弹窗；如果暂不实现，必须标明 placeholder |
| 频道行 | `#` 或成员组合头像、标题、最后消息、pin/mute icon、未读数 | 点击切换会话并加载消息 |
| 频道更多 | `MoreVertical` | 打开会话操作菜单 |
| 私信标题 | `私信` | 区块标题 |
| 私信添加按钮 | `Plus`，hover 显示 | 打开好友选择弹窗并创建/复用私聊 |
| 私信行 | 头像、状态点、标题、最后消息、pin/mute icon、未读数 | 点击切换私聊 |
| 私信更多 | `MoreVertical` | 打开私聊操作菜单 |

### 会话操作菜单

| 菜单项 | 可见条件 | 行为 |
| --- | --- | --- |
| 置顶 | 未置顶 | 会话移到置顶区或置顶排序 |
| 取消置顶 | 已置顶 | 取消置顶 |
| 修改群聊名称 | 非默认频道且频道/群聊 | 打开 Rename Conversation Modal |
| 消息免打扰 | 未静音 | 会话不产生普通通知 |
| 取消免打扰 | 已静音 | 恢复通知 |
| 清空聊天记录 | 所有会话 | 清空当前会话消息，保留会话 |
| 删除群聊 | 非默认频道 | 删除会话并移除未读 |
| 删除对话 | 私聊 | 删除私聊会话并移除未读 |

### Chat Header

| 控件 | 显示 | 点击行为 |
| --- | --- | --- |
| 路线图按钮 | `Checklist` icon | 打开 Roadmap Modal |
| 会话标题 | 当前频道名、群聊名或私聊成员名 | 不可点击 |
| 会话描述 | 私聊显示 `与 {name} 的私信`；频道显示描述或空 | 不可点击 |
| 成员按钮 | 移动端显示 `Members` + count | 打开 Members Drawer |
| 技能按钮 | `Backpack` icon | 打开 Skill Management Modal |

### Messages List

| 控件/区域 | 显示 | 行为 |
| --- | --- | --- |
| 加载历史按钮 | `加载更早消息` / `正在加载历史...` | 请求上一页消息；加载中禁用 |
| 日期分隔线 | 日期 label | 自动按天分组 |
| 自己的消息 | 右侧白底气泡 | 显示发送中/发送失败状态 |
| 他人/AI 消息 | 左侧作者、时间、正文 | mention 高亮 |
| 头像 | 成员头像 | 如果成员有终端配置，点击打开成员终端 |
| 图片附件 | 缩略图、文件名、大小 | 点击打开/预览；hover 显示下载 icon |
| Roadmap 附件 | map icon、标题、`点击查看路线图` | 点击打开 Roadmap Modal |
| Typing 状态 | 头像/机器人 icon + 三点 + `{name} 正在输入...` | 仅展示 |
| 跳到最新 | sticky `south` icon + `跳到最新消息` | 滚动到底部 |

### Chat Input

| 控件 | 显示 | 点击/键盘行为 |
| --- | --- | --- |
| 快捷提示 chip | `总结最新讨论`、`生成礼貌回复`、`提取行动项` | 插入到输入框；已有文本时换行追加 |
| mention chips | `提及` label + `@name` chip | 点击 chip 上 `X` 移除对应 mention |
| 附件按钮 | `PlusCircle` | 打开附件菜单：图片、路线图引用、本地文件；MVP 若未支持文件上传则只显示可用入口 |
| 输入框 | placeholder: `发送到 #channel` 或 `发送给 @name` | Enter 发送，Shift+Enter 换行，IME 组合输入不误发 |
| @mention suggestions | 成员头像、`@name`、角色 | 输入 `@` 后弹出；↑/↓ 选择，Enter/Tab 插入 |
| @all | 输入 `@all` | 如果 MVP 不实现群体派发，必须显示明确提示并记录为放弃/占位能力 |
| emoji 按钮 | `Smile` | 打开 emoji panel |
| emoji 搜索 | `搜索表情...` | 按 label/tags 过滤 |
| emoji group 按钮 | 最近、表情、人物、动物、食物、旅行、活动、物品、符号 | 切换 emoji 分组 |
| emoji item | emoji grid | 点击插入并记录最近使用 |
| 停止生成 | 生成中显示 `StopCircle` + `停止生成` | 请求停止当前生成/流式输出 |
| 发送 | `发送` | 文本为空禁用；非空时发送消息并清空输入 |
| 字数计数 | `current/max` | 超长前提示，达到 max 后阻止继续输入 |

## Members Sidebar

### 分组

成员按 role 分组显示：

- 群主
- 管理员
- 助手
- 普通成员

### 顶部邀请按钮

| 场景 | 控件 | 行为 |
| --- | --- | --- |
| 默认频道 | `person_add` + `添加` | 打开 Invite Menu |
| 非默认会话 | `group_add` icon | 打开 Invite Friends Modal |

### Invite Menu

| 菜单项 | 行为 |
| --- | --- |
| 以管理员身份邀请 | 打开 Invite Admin Modal |
| 以助手身份邀请 | 打开 Invite Assistant Modal，role=assistant |
| 普通成员 | 打开 Invite Assistant Modal，role=member |

### Member Row

| 控件 | 显示 | 点击行为 |
| --- | --- | --- |
| 头像 | avatar + 手动状态 dot + 终端状态 dot | 如果有终端配置，打开成员终端；否则无动作 |
| 成员名 | owner/admin 有 badge | 不直接编辑 |
| 更多按钮 | `MoreVertical` | 打开成员操作菜单 |

### 成员操作菜单

| 菜单项 | 可见条件 | 行为 |
| --- | --- | --- |
| 发送消息 | 非当前用户 | 创建/复用私聊并切到该会话 |
| @成员 | 非当前用户 | 在输入框插入 mention |
| 更改名称 | 非当前用户 | 打开 Manage Member Modal |
| 状态：在线 | 所有成员 | 设置状态；终端成员 online 会确保 session |
| 状态：工作中 | 非终端成员 | 设置 working |
| 状态：请勿打扰 | 所有成员 | 设置 dnd，派发时跳过 |
| 状态：离线 | 所有成员 | 终端成员停止 session，普通成员设 offline |
| 移出群组 | 非当前用户 | 停止相关终端、删除成员相关会话、移除成员 |

## Invite And Management Modals

### Invite Assistant / Member Modal

| 区域 | 控件 | 行为 |
| --- | --- | --- |
| 顶部 | 标题、说明、关闭按钮 | 关闭返回原页面 |
| 模型列表 | Gemini CLI、Codex、Claude Code、opencode、Qwen Code、自定义 CLI、终端成员 | 点击选择；选中显示 check |
| 实例数量 | 减号、数字输入、加号 | 范围 1-20；超过显示限制提示 |
| 无限制模式 | toggle | 保存 unlimitedAccess |
| 沙盒环境 | toggle | 保存 sandboxed |
| 发送邀请 | primary button | 创建指定数量 member/assistant 实例 |

### Invite Admin Modal

| 控件 | 行为 |
| --- | --- |
| 关闭 | 关闭弹窗 |
| MVP 范围提示 | 显示 `管理员邀请是本地工作区角色，不包含服务器、账单或账号权限。` |
| 联系人/成员选择 | 选择已有联系人或输入本地显示名 |
| 角色说明 | 只读展示 admin 在当前工作区内的可见权限 |
| 添加管理员 | 创建本地 admin/member 记录；不生成远程邀请链接 |
| 未来账号/团队能力提示 | disabled placeholder；说明需要后续账号/团队架构 |

### Invite Friends Modal

| 控件 | 行为 |
| --- | --- |
| 搜索好友 | 按名称过滤 |
| 好友行 | 点击切换选中 checkbox |
| 关闭 | 关闭弹窗不保存 |
| 邀请 / 创建群聊 | 选中为 0 时禁用；提交 ids |

### Manage Member Modal

| 控件 | 行为 |
| --- | --- |
| 关闭 | 关闭弹窗 |
| 显示名称输入 | 修改成员名称 |
| 保存修改 | 保存并关闭 |
| 移出群组 | 可选显示；移除成员 |

### Rename Conversation Modal

| 控件 | 行为 |
| --- | --- |
| 名称输入 | 输入群聊名称 |
| 取消 | 关闭不保存 |
| 保存修改 | 保存名称并关闭 |

## Friends Page

### 页面布局

- 顶部：`好友` 标题 + 好友总数 + `添加`按钮。
- 内容：项目好友、全局好友两个区块。
- 空状态：`暂无好友`。

### 好友卡片按钮

| 控件 | 行为 |
| --- | --- |
| 添加 | 打开 Invite Menu |
| 头像 | 项目好友且有终端配置时打开终端 |
| 名称 | 打开 Manage Member Modal 修改名称 |
| 发送消息 | 创建/复用私聊，保存当前会话缓存，切到聊天页 |
| 更多 | 打开状态菜单 |
| 状态菜单项 | 设置在线/工作中/请勿打扰/离线；终端成员 online/offline 会启动/停止 session |
| 删除 | 项目好友：停止终端、删除相关会话、移出项目；全局好友：删除联系人 |

## Terminal Window

### 页面布局

- 顶部标题：`终端`，副标题 `在一个工作区内运行多个终端会话。`
- 右侧：标签搜索、新建标签按钮。
- 第二行：最近关闭标签按钮、标签栏。
- 主体：单窗口、左右分屏、上下分屏、四分屏 grid。

### Header Controls

| 控件 | 显示 | 行为 |
| --- | --- | --- |
| 标签搜索输入 | `搜索标签...` | focus 后打开搜索 popover |
| 清空搜索 | `X` | 清空查询并关闭 popover |
| 搜索结果：新建标签 | `Plus` + `新建标签` | 创建新 terminal tab |
| 搜索结果：已有 tab | tab title | 聚焦该 tab；如果在 pane 中则聚焦 pane |
| 搜索结果：成员 | `User` + member name | 打开该成员终端 |
| 新建标签 | `Plus` + `新建标签` | 创建 shell tab；资源不足时 toast |

### Tab Bar

| 控件 | 行为 |
| --- | --- |
| 最近关闭标签页 | 打开最近关闭的成员终端 |
| 最近关闭关闭按钮 | 隐藏最近关闭提示 |
| Tab 点击 | 设置 active tab；如果在 pane 布局中分配到 focused pane |
| Tab 拖动 | 调整顺序；拖到 pane 时分配到 pane |
| Tab 关闭 | 关闭 tab，untrack session，记录最近关闭 |
| Activity dot | 后台 tab 有输出时显示 |
| Pin icon | tab 被置顶时显示 |

### Tab 右键菜单

| 菜单项 | 行为 |
| --- | --- |
| 关闭当前 | 关闭当前 tab |
| 关闭其它 | 关闭除当前 tab 外的未置顶 tab |
| 关闭右侧 | 关闭右侧未置顶 tab |
| 置顶 / 取消置顶 | 切换 tab pinned 状态 |
| 单窗口 | 切换到 single layout |
| 左右分屏 | 切换到 split-vertical |
| 上下分屏 | 切换到 split-horizontal |
| 四分屏 | 切换到 grid-2x2 |

### Pane 区域

| 状态/控件 | 行为 |
| --- | --- |
| 空 pane | 显示 `拖动标签到这里，或新建一个终端。` |
| 空 pane 新建标签 | 在该 pane 创建 tab |
| pane 点击 | 聚焦 pane；同步 active tab |
| pane 内 tab close | 关闭对应 session |
| pane 中 xterm | 输入、选择、复制、粘贴、resize |

### Terminal Find Overlay

| 控件 | 行为 |
| --- | --- |
| 查找输入 | 输入后实时查找 |
| Aa | 切换区分大小写 |
| ab | 切换全字匹配 |
| .* | 切换正则；非法正则显示无结果/错误状态 |
| 结果计数 | `index/total` 或 `无结果` |
| 上一个/下一个 | 跳转匹配项 |
| 关闭 | 关闭 find overlay |

### Terminal 状态覆盖层

| 状态 | 显示 |
| --- | --- |
| attaching | `Connecting...` |
| reconnecting | `Reconnecting...` |
| fatal error | `Terminal crashed. Please reopen.` |
| resource limit | toast: 系统资源不足，请关闭部分后台任务 |

## Roadmap Modal

| 区域/控件 | 行为 |
| --- | --- |
| 关闭 | 关闭弹窗 |
| 目标输入 | blur 时保存 objective；空值回退到已有目标 |
| 添加任务 | 新增 pending 任务并进入编辑 |
| 任务标题输入 | Enter/blur 保存；空标题保存为 `新任务` |
| 任务状态 pill | 显示待处理、进行中、已完成 |
| 任务更多 | 打开任务菜单 |
| 编辑任务 | 进入标题编辑 |
| 调整顺序 | MVP 可作为 placeholder；若未实现需标明 |
| 标记为优先 | MVP 可作为 placeholder；若未实现需标明 |
| 删除 | 删除任务并保存 |
| Footer | 显示任务数量和完成百分比 |

## Skill Management Modal

### 当前技能 Tab

| 控件 | 行为 |
| --- | --- |
| 关闭 | 关闭弹窗 |
| 当前技能 tab | 显示当前工作区已启用技能和项目技能 |
| 我的技能 tab | 显示技能库 |
| 全部同步 | 刷新/同步项目技能链接状态 |
| 项目技能打开文件夹 | 打开本地技能路径 |
| 项目技能删除 | 取消当前工作区技能链接；只读时禁用 |
| 技能设置 | 打开 Skill Detail Modal |
| 技能启用 toggle | 启用/禁用技能；MVP 若只是展示必须标明 |
| 导入我的技能 | 打开 Project Skill Picker |

### 我的技能 Tab

| 控件 | 行为 |
| --- | --- |
| 搜索技能库 | 按名称/路径过滤 |
| 刷新 | 重新加载技能库 |
| 删除技能 | 从库中移除技能 |
| 打开文件夹 | 打开本地技能路径 |
| 导入技能 | 打开目录选择器并导入本地技能 |
| 浏览技能商店 | 切到 Skill Store 主页面 |

### Project Skill Picker

| 控件 | 行为 |
| --- | --- |
| 关闭 | 关闭 picker |
| 搜索 | 过滤可关联技能 |
| 关联 | 将库中技能 link 到当前 `.orchlet` 工作区 |
| 空库 | 显示 `我的技能库里暂无可用技能` |
| 搜索空 | 显示 `没有匹配的技能` |

## Skill Detail Modal

| 控件 | 行为 |
| --- | --- |
| 返回 | 回到 Skill Management |
| 关闭 | 关闭所有技能弹窗 |
| 来源 tab：GitHub 仓库 | 显示 repo URL 输入 |
| 来源 tab：命令来源 | 显示 command 配置；MVP placeholder 需标明 |
| 来源 tab：本地路径 | 显示本地路径配置 |
| 粘贴 | 从剪贴板填入 repo |
| 自动同步 toggle | 开关自动同步 |
| 更新频率 select | 每 15 分钟/每小时/每日/仅手动 |
| 目标分支 select | main/develop/release 等 |
| 删除技能 | 删除当前技能 |
| 取消 | 返回技能管理不保存 |
| 保存修改 | 保存配置并返回 |

## Skill Store Page

### 页面布局

- 标题：`技能商店`。
- 搜索框：`搜索技能文件夹、模板和工具包...`，右侧 `CMD+K` hint。
- 分段 tab：`商店`、`我的技能`。
- filter chips：全部技能、工程、设计、管理、营销、财务。

### 商店 Tab

| 控件 | 行为 |
| --- | --- |
| 搜索 | 过滤可安装技能；当前 golutra 数据源为空，orchlet MVP 必须显示 empty/placeholder |
| Filter chip | 过滤技能分类 |
| 同步 URL 输入 | MVP disabled placeholder；远程同步属于后续能力 |
| 立即同步 | MVP disabled placeholder；显示未来能力说明 |
| 安装文件夹 | MVP 仅允许从本地文件夹导入到技能库；远程安装 disabled |
| 已安装 | 已安装技能的 disabled 状态 |

### 我的技能 Tab

| 控件 | 行为 |
| --- | --- |
| 删除已安装技能 | 从应用库移除 |
| 本地技能打开文件夹 | 打开本地路径 |
| 本地技能删除 | 二次确认后从应用技能库移除，不删除用户源目录 |
| 导入技能 | 选择本地文件夹并导入 |

## Plugin Marketplace Page

插件市场是未来扩展能力，MVP 必须明确标注为 placeholder，不得让用户误以为已完整可用。

| 控件 | 行为 |
| --- | --- |
| 搜索插件 | 过滤插件；无数据时显示 placeholder empty |
| 浏览商店 / 我的插件 | 切换 tab |
| 分类 chip | 过滤类别 |
| 安装 | 安装插件；MVP 禁用并说明未来能力 |
| 已安装 | placeholder 展示；无真实插件安装状态时禁用 |
| 删除 | MVP 禁用；仅未来插件状态可删除 |
| 导入插件 | MVP disabled placeholder；从 URL 或本地文件导入属于未来插件能力 |

## Settings Page

### 页面结构

左侧设置导航：

- 我的账号
- 外观
- 语言
- 成员
- 通知
- 快捷键
- 数据

点击设置导航时右侧内容滚动到对应 section，并高亮当前 section。

### 我的账号

| 控件 | 行为 |
| --- | --- |
| 头像按钮 | 打开头像菜单 |
| 预设头像 | 选择后保存并关闭菜单 |
| 上传图片 | 打开文件选择器；仅 PNG/JPG/WEBP/GIF；最大 2MB |
| 删除上传头像 | 删除头像资产 |
| 恢复样式 | 从上传头像回到预设头像 |
| 显示名称 | 默认是按钮；点击进入 input 编辑 |
| 显示名称 Enter/blur | 非空保存；空值回退 |
| 显示名称 Esc | 取消编辑 |
| 邮箱/账号区域 | MVP 不显示；当前版本无账号体系 |
| 时区 select | 选择时区并保存 |
| 账号/团队操作 | MVP 不显示；未来账号/团队能力需单独 PRD/架构决策 |

### 外观

| 控件 | 行为 |
| --- | --- |
| 深色 | 设置 theme=dark |
| 浅色 | 设置 theme=light |
| 系统 | 跟随系统 theme |
| 选中 check | 显示当前主题 |

### 语言

| 控件 | 行为 |
| --- | --- |
| 英文（美国） | 设置 locale=en-US |
| 中文（简体） | 设置 locale=zh-CN |
| 选中 check | 显示当前语言 |
| 重启后生效提示 | 如果实时切换已支持，应改为“立即生效” |

### 成员/CLI 配置

| 控件 | 行为 |
| --- | --- |
| 刷新成员列表 | 重新检测可用 AI CLI/自定义 CLI |
| 成员卡片 | 选择默认成员 runtime |
| 成员更多：测试终端 | 尝试启动对应 CLI，失败显示具体路径/错误 |
| 成员更多：更改 | 编辑自定义成员 |
| 成员更多：删除 | 删除自定义成员 |
| 自定义 CLI 卡片 | 展开新增表单 |
| 自定义 CLI 名称 | 输入 label |
| 自定义 CLI 命令 | 输入启动命令，例如 `gemini` |
| 取消 | 收起表单并清空 |
| 确认 | 保存自定义 CLI |
| 刷新终端列表 | 重新检测系统终端 |
| 终端卡片 | 选择默认终端 |
| 终端更多：测试 | 尝试启动终端路径 |
| 终端更多：更改 | 编辑自定义终端 |
| 终端更多：删除 | 删除自定义终端 |
| 自定义终端 | 展开新增终端表单 |
| 选择文件 | 打开文件选择器选择可执行文件 |
| 取消/确认 | 取消或保存自定义终端 |

### 通知

| 控件 | 行为 |
| --- | --- |
| 桌面通知 toggle | 开关系统通知 |
| 声音提醒 toggle | 开关声音 |
| 仅提醒提及 toggle | 只在 mention 时通知 |
| 消息预览 toggle | 控制通知中是否显示正文 |
| 静默时段 toggle | 开启后显示开始/结束时间输入 |
| 开始时间/结束时间 | 设置 DND 时间段 |

### 快捷键

| 控件 | 行为 |
| --- | --- |
| 键位方案 select | 默认/VS Code/Slack |
| 启用快捷键 toggle | 全局开关 |
| 显示快捷键提示 toggle | 控制 UI 中是否显示快捷提示 |
| 恢复默认 | 恢复当前 profile 默认绑定 |
| 快捷键列表 | 只读展示 action 与 keys |

### 数据

| 控件 | 行为 |
| --- | --- |
| 修复消息 | 二次确认后扫描当前工作区聊天库，移除不可读消息，显示结果 |
| 清空所有消息 | 强确认后删除当前工作区消息和附件，显示删除数量 |
| 聊天流式输出 toggle | 控制终端输出实时流式显示或仅最终结果 |
| 删除终端好友 | 删除当前项目终端成员并重置命名序号 |
| 结果消息 | 成功/失败后显示简短结果 |

## Notification Preview

### 页面布局

通知预览是一个小窗口卡片：

- Header：标题和总未读数。
- Body：未读 item 列表。
- Footer：打开全部终端、忽略全部、查看全部。

### 按钮与行点击

| 控件 | 行为 |
| --- | --- |
| 消息正文区域 | 如果有 workspaceId + conversationId，打开主窗口并跳到会话 |
| 打开终端 | 如果 sender 可打开终端，打开对应成员终端 |
| 打开全部终端 | 按消息时间顺序打开所有可打开终端的发送者 |
| 忽略全部 | 清除当前用户未读通知预览 |
| 查看全部 | 打开主窗口未读视图或默认聊天页 |
| hover preview | 通知窗口保持显示；离开后允许隐藏 |

## Responsive And Accessibility

### Desktop

- 主导航为左 rail。
- Chat 为三栏布局。
- Members Sidebar 固定显示。
- Terminal 支持多 pane。

### Narrow Width

- 主导航改为底部栏。
- Chat Sidebar 可保持窄 icon 模式。
- Members Sidebar 变为右侧 drawer。
- 终端 pane 不应在过窄宽度强制四分屏；小于阈值时提示切回单 pane。

### Keyboard Requirements

| 场景 | 键盘行为 |
| --- | --- |
| Chat input | Enter 发送，Shift+Enter 换行，Esc 关闭 emoji panel |
| Mention dropdown | ↑/↓ 切换，Enter/Tab 插入 |
| Emoji search | Esc 关闭，Enter 不提交消息 |
| Conversation list | 可用 Tab 聚焦会话和更多菜单 |
| Terminal find | Esc 关闭，Enter 下一个，Shift+Enter 上一个 |
| Settings save | 表单可通过键盘编辑和保存 |
| Notification preview | Tab 可聚焦查看全部/忽略/打开终端 |

### Accessibility Rules

- 所有 icon-only button 必须有 `aria-label` 和 tooltip。
- Menu button 必须设置 `aria-expanded`。
- Modal 打开后 focus trap；Esc 关闭；关闭后 focus 返回触发按钮。
- 删除/清空类 destructive action 必须二次确认。
- 颜色状态必须配合文字/icon，不只依赖颜色。
- 终端输出区域不把高频输出放入 React state；但用户可选中文本、复制、查找。

## Empty, Loading, Error State Matrix

| 页面/区域 | Empty | Loading | Error |
| --- | --- | --- | --- |
| Workspace Selection | 暂无最近工作区 | 打开目录中显示 spinner/toast | 无法打开工作区 toast |
| Chat Sidebar | 无频道/私信时显示默认频道 | 加载会话 skeleton | 会话加载失败 toast |
| Messages | 无消息显示轻量空状态 | 加载历史按钮变 loading | 消息发送失败显示 failed |
| Members | 无成员时仍显示 owner | 邀请中按钮 loading | 邀请失败 toast |
| Terminal | 没有活动终端 | Connecting/Reconnecting overlay | Terminal crashed/resource limit |
| Skill Library | 我的技能库暂无可用技能 | 导入/刷新中禁用按钮 | 导入失败 toast |
| Settings Data | 无结果消息 | 修复/清空按钮 loading | 操作失败，请重试 |
| Notification Preview | 无未读则不显示窗口或显示空状态 | 加载通知状态 | 加载失败记录诊断并隐藏 |

## Implementation Handoff Checklist

- [ ] React 组件按页面拆分，不照搬 Vue 文件结构。
- [ ] 所有 Tauri 调用只通过 `src/shared/api`。
- [ ] 每个按钮都有 loading/disabled/error 语义。
- [ ] 所有 placeholder 功能在 UI 上明确标注，不伪装成已实现。
- [ ] 工作区数据只读写 `.orchlet` 和 SQLite，不读取旧 `.golutra`。
- [ ] 聊天、成员、终端、通知的 id 关系可追踪。
- [ ] 终端输出绕过 React state，消息回写走批处理。
- [ ] 设置里的 destructive action 都有确认。
- [ ] 三平台 smoke 覆盖打开工作区、发消息、打开终端、通知跳转、重启恢复。
