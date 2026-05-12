# 源码树分析

## 顶层结构

```text
golutra/
├── src/                    # Vue 前端应用
├── src-tauri/              # Rust/Tauri 后端与桌面配置
├── assets/readme/          # README 图片与 CLI 图标
├── docs/legal/             # BSL/CLA/授权相关文档
├── scripts/                # Windows CLI 启动脚本
├── package.json            # 前端依赖与脚本
├── vite.config.ts          # Vite/Vitest/Tauri dev URL 配置
├── tailwind.config.cjs     # Tailwind 3 配置
├── tsconfig.json           # TypeScript 配置
└── README.md               # 产品定位、功能承诺、许可证说明
```

## 前端结构

```text
src/
├── main.ts                         # 创建 Pinia、加载设置、初始化监控、挂载 Vue
├── app/
│   ├── App.vue                     # 根窗口壳，分发主视图/终端/工作区/通知预览
│   ├── useWorkspaceBootstrap.ts    # 工作区启动加载
│   └── useAppKeybinds.ts           # 应用级快捷键注册
├── features/
│   ├── chat/                       # 聊天、好友、成员、邀请、路线图、技能弹窗
│   ├── terminal/                   # 终端窗口、xterm pane、标签页、成员会话
│   ├── workspace/                  # 工作区选择、项目数据状态
│   ├── global/                     # 设置、主题、全局数据
│   ├── skills/                     # 技能库与项目技能桥接
│   ├── notifications/              # 通知预览 UI
│   ├── Settings.vue                # 大型设置页
│   ├── SkillStore.vue              # 技能商店入口
│   └── PluginMarketplace.vue       # 插件市场入口
├── stores/
│   ├── navigationStore.ts          # 左侧导航 tab
│   ├── notificationOrchestratorStore.ts
│   ├── terminalOrchestratorStore.ts
│   ├── terminalSnapshotAuditStore.ts
│   └── toastStore.ts
├── shared/
│   ├── tauri/                      # 前端 Tauri API 封装
│   ├── keyboard/                   # 快捷键注册/解析/配置
│   ├── context-menu/               # 上下文菜单注册/宿主
│   ├── monitoring/                 # 前端诊断与被动监控
│   ├── constants/                  # 头像、终端目录、时区等常量
│   ├── components/                 # AvatarBadge、SidebarNav、ToastStack
│   ├── types/                      # 跨功能共享类型
│   └── utils/                      # 头像、终端、成员展示工具
├── i18n/                           # en-US 与 zh-CN 文案
├── styles/                         # 全局样式、动画、字体声明
└── tests/                          # Vitest 单元测试，当前只有 chat-utils.spec.ts
```

## 后端结构

```text
src-tauri/
├── tauri.conf.json                 # Tauri v2 应用、窗口、bundle 配置
├── capabilities/default.json       # Tauri 权限白名单
├── Cargo.toml                      # Rust 依赖、bin、crate 配置
└── src/
    ├── lib.rs                      # Tauri Builder、插件、state、后台 worker、命令注册
    ├── main.rs                     # 桌面入口
    ├── bin/
    │   ├── shim.rs                 # 子进程 shim
    │   └── golutra-cli.rs          # CLI IPC 客户端
    ├── ui_gateway/                 # 对前端暴露的 Tauri command 层
    ├── application/                # 应用用例封装，转调领域服务
    ├── message_service/            # 聊天 DB、项目数据、成员、派发 pipeline
    ├── terminal_engine/            # PTY、会话、语义输出、过滤、默认成员
    ├── orchestration/              # 聊天 outbox、dispatch batcher、邀请流程
    ├── runtime/                    # storage、pty、settings、command IPC、AppState
    ├── platform/                   # path、updater、activation、diagnostics
    ├── ports/                      # 终端事件、消息服务、设置等接口
    └── contracts/                  # chat_dispatch、terminal_message 契约
```

## 值得重构的热点文件

| 文件 | 问题 | 建议 |
| --- | --- | --- |
| `src-tauri/src/ui_gateway/app.rs` | 同时处理窗口、工作区、存储、头像、通知打开等命令 | 按 `window_gateway`、`workspace_gateway`、`storage_gateway`、`avatar_gateway` 拆分 |
| `src-tauri/src/terminal_engine/session/mod.rs` | PTY、状态机、dispatch、快照、语义、流控常量集中 | 拆为 `session_lifecycle`、`io_loop`、`dispatch_queue`、`snapshot`、`status_machine` |
| `src/features/terminal/TerminalPane.vue` | xterm 渲染、fit、快照审计、上下文菜单、事件监听混合 | 抽 composables：`useXtermRenderer`、`useTerminalFit`、`useTerminalSnapshot` |
| `src/features/Settings.vue` | 多个设置分区、头像上传、数据修复、终端路径配置都在单文件 | 拆成独立设置 section 与 settings domain service |
| `src/features/chat/chatStore.ts` | 会话、消息、未读、stream、终端回写、分页、缓存混合 | 拆成 `conversationStore`、`messageStore`、`chatEffects`、`chatRepository` |
| `src/features/workspace/projectStore.ts` | 成员/路线图/技能/终端最近关闭 tab 共存 | 建议按 workspace aggregate 拆分并保留兼容 facade |

## 架构边界建议

新项目建议采用以下目录思路：

```text
src/
├── app/                  # 应用启动、router/window mode、providers
├── pages/                # workspace、chat、terminal、settings 等页面
├── features/             # 用户可感知的功能切片
├── entities/             # Workspace、Member、Conversation、Message、TerminalSession
├── shared/
│   ├── api/              # typed IPC client
│   ├── ui/               # 基础 UI 组件
│   ├── config/
│   └── lib/
└── contracts/            # 与 Rust 共用/生成的 TS 类型

src-tauri/src/
├── main.rs / lib.rs
├── gateway/              # Tauri command/event 边界
├── app/                  # use cases
├── domain/               # 领域模型与服务
├── infrastructure/       # redb、PTY、filesystem、Tauri adapters
├── contracts/            # serde DTO，最好生成 TS
└── workers/              # outbox、poller、snapshot、diagnostics
```
