# golutra 项目重建文档索引

生成时间：2026-05-11  
扫描范围：`/Users/wdx/opc/golutra` 本仓库源码、配置、已有文档与本地依赖清单。  
目标：在不漏功能的前提下，把现有项目拆解成可按步骤重建的文档基础。

## 结论速读

`golutra` 是一个 Tauri 2 桌面应用，前端使用 Vue 3、Pinia、Vite、Tailwind CSS 与 xterm，后端使用 Rust、Tauri commands、portable-pty、redb 与本地文件存储。项目定位是多 AI CLI/终端协作工作区：打开本地项目目录后，用户可以邀请 AI CLI 成员、打开/复用终端窗口、把聊天消息派发进终端、把终端输出回写到聊天流，并通过托盘/通知/未读状态管理多工作区协作。

当前架构能支撑功能，但重建时建议把“UI、状态、IPC、领域服务、持久化、终端引擎”重新分层，并先冻结契约，避免在重构中漏掉隐性功能。

## 推荐阅读顺序

1. [项目总览](./rebuild/project-overview.md)
2. [功能库存](./rebuild/feature-inventory.md)
3. [当前架构分析](./rebuild/current-architecture.md)
4. [IPC、事件与窗口契约](./rebuild/ipc-events-and-contracts.md)
5. [数据与存储模型](./rebuild/data-and-storage.md)
6. [源码树分析](./rebuild/source-tree-analysis.md)
7. [现代化重建蓝图](./rebuild/modernization-blueprint.md)
8. [同功能验收清单](./rebuild/parity-checklist.md)

## 已有文档

- [README](../README.md)
- [贡献指南](../CONTRIBUTING.md)
- [安全策略](../SECURITY.md)
- [法律文件目录](./legal/)

## BMad 下一步

当前已完成 `[DP] Document Project`（`bmad-document-project`）式的项目扫描和重建文档产出。后续建议在新上下文窗口按顺序执行：

1. 可选：`[TR] Technical Research`，`bmad-technical-research`，确认要采用的最新 Tauri/Vue/Vite/Tailwind/测试栈版本和升级约束。
2. 必需：`[CP] Create PRD`，`bmad-create-prd`，把“重建一个同功能现代架构版 golutra”写成 PRD。
3. 必需：`[CA] Create Architecture`，`bmad-create-architecture`，基于本文档输出目标架构。
4. 必需：`[CE] Create Epics and Stories`，`bmad-create-epics-and-stories`，拆成可执行 story。
5. 必需：`[SP] Sprint Planning`，`bmad-sprint-planning`，进入实现节奏。

建议把本索引作为后续 brownfield 输入：`/Users/wdx/opc/golutra/docs/index.md`。
