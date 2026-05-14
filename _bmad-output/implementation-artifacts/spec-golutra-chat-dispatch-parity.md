---
title: 'Golutra chat dispatch parity'
type: 'bugfix'
created: '2026-05-14'
status: 'done'
baseline_commit: 'f6f2c2482b8a95ebee7ef36311d748229b37f254'
context:
  - '{project-root}/_bmad-output/planning-artifacts/prd.md'
  - '{project-root}/_bmad-output/implementation-artifacts/4-1-dispatch-chat-message-to-member-terminal.md'
  - '{project-root}/_bmad-output/implementation-artifacts/4-2-dispatch-target-resolution-context-selection.md'
  - '{project-root}/_bmad-output/implementation-artifacts/4-4-deduplicate-dispatches-merge-consecutive-dispatches.md'
  - '{project-root}/_bmad-output/implementation-artifacts/4-5-terminal-output-chat-stream-status-sync.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** orchlet 当前聊天发送链路偏离 Golutra：`发送` 只持久化消息，终端派发依赖另一次前端动作或补丁式自动调用，缺少 Golutra 的“发送即进入后端派发管线”语义，因此真实使用时会表现为“对话后 AI 不回复”。

**Approach:** 对照 `/Users/wdx/opc/golutra` 的聊天派发链路，把 orchlet 的发送路径改成后端拥有的 send-and-dispatch 入口，并让前端只调用一个语义 API。先恢复 Golutra 等价核心：私聊成员自动派发给对方，频道/群聊按结构化 mention 或 `@all` 派发；错误必须可见且不吞消息。

## Boundaries & Constraints

**Always:** 以 Golutra 源码语义为准：`chatStore.sendMessage` 调用 `chat_send_message_and_dispatch`，后端写消息并 enqueue/dispatch；DM 目标是除发送者外的会话成员；频道/群聊目标来自 mention ids 或 mentionAll；同一成员派发必须避免命令交错；终端输出继续通过现有 terminal event/chat stream 显示。

**Ask First:** 如果需要改变用户可见目标规则（例如无 mention 的频道消息也自动发给唯一成员）、重做完整后台 worker/outbox 重试机制、或改变 Story 4.2 已验收的默认目标 fallback 规则，先停下确认。

**Never:** 不把 Golutra 旧 Vue store 直接搬进 React；不在页面组件里引入 raw Tauri `invoke`；不把“消息已保存”当成“任务已派发”；不静默吞掉 CLI 缺失、终端启动失败、目标缺失或多目标冲突。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| DM send | 私聊对象是有 CLI/runtime 的成员，用户点击发送 | 消息持久化后后端自动派发到该成员终端，UI 显示 dispatched/terminal session | 终端失败时消息保留，派发状态 failed，显示 recoverable action |
| Mention send | 频道/群聊消息含一个或多个结构化 mention | 每个可派发 mention 目标收到终端 payload；重复目标去重 | 某目标不可派发时该目标失败可见，不影响消息可见 |
| All mention | 消息文本包含 `@all` | 与 Golutra 一样 fan-out 到会话内可派发成员 | 无可派发成员时显示 target-required/skip 诊断 |
| Plain channel text | 频道/群聊消息没有 mention | 只保存聊天消息，不自动派发给默认/唯一成员 | 不显示“已派发”假状态 |
| Transient failure | 终端窗口/会话暂不可用 | 后端记录失败/待重试语义，UI 不丢消息 | 达到不可恢复条件后标记 failed |

</frozen-after-approval>

## Code Map

- `/Users/wdx/opc/golutra/src/features/chat/chatStore.ts` -- 参考发送入口；构造 `ChatDispatchRequest` 并调用 send-and-dispatch。
- `/Users/wdx/opc/golutra/src-tauri/src/application/chat.rs` -- 参考后端入口；消息写入后 enqueue outbox。
- `/Users/wdx/opc/golutra/src-tauri/src/orchestration/chat_outbox.rs` -- 参考 outbox worker、重试、状态更新。
- `/Users/wdx/opc/golutra/src-tauri/src/orchestration/dispatch.rs` -- 参考 DM/mention/@all 目标解析与终端会话确保。
- `/Users/wdx/opc/golutra/src-tauri/src/orchestration/chat_dispatch_batcher.rs` -- 参考同终端队列、合并、回车确认。
- `src-tauri/src/app/chat/mod.rs` -- 当前只保存消息并记录诊断，不拥有派发。
- `src-tauri/src/app/orchestration/mod.rs` -- 当前派发用例、目标解析、队列、去重和合并。
- `src-tauri/src/domain/orchestration/mod.rs` -- 当前目标解析含 private/default fallback，但不支持 fan-out。
- `src-tauri/src/gateway/chat_commands.rs` -- 需要新增或改造 send-and-dispatch Tauri command。
- `src/shared/api/chat-api.ts` / `src/shared/api/terminal-dispatch-api.ts` -- 当前前端把发送和派发拆成两个 API。
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` -- 当前发送、mention、dispatch state 和 terminal stream UI。
- `src/App.test.tsx` -- 覆盖聊天发送、派发、私聊、mention、终端 stream。

## Tasks & Acceptance

**Execution:**
- [x] `src-tauri/src/contracts/chat.rs` / generated TS -- add a send-and-dispatch result shape that returns `SendMessageResult` data plus dispatch outcomes without breaking existing `chat_message_send`.
- [x] `src-tauri/src/app/chat/mod.rs` and/or `src-tauri/src/app/orchestration/mod.rs` -- implement backend-owned send-and-dispatch coordination using existing message persistence, target resolution, dispatch persistence and terminal runtime.
- [x] `src-tauri/src/domain/orchestration/mod.rs` -- add Golutra-compatible fan-out target planning for DM, explicit mentions and `@all`, while keeping existing single-dispatch resolver available for manual dispatch.
- [x] `src-tauri/src/gateway/chat_commands.rs` / `src-tauri/src/lib.rs` -- expose the new command through the normal gateway boundary.
- [x] `src/shared/api/chat-api.ts` and `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` -- make the send button call one semantic send-and-dispatch API; remove page-level ad hoc auto-dispatch fallback that over-dispatches plain channel text.
- [x] `src/App.test.tsx` and Rust orchestration/chat tests -- cover DM auto-dispatch, multi-mention fan-out, `@all`, plain channel no-dispatch, and terminal launch failure visibility.

**Acceptance Criteria:**
- Given a private conversation with a terminal-capable member, when the user sends a message, then the backend writes the message and dispatches it to that member without a second click.
- Given a channel/group message with mentions or `@all`, when the user sends it, then dispatch targets match Golutra fan-out semantics and duplicate member targets are not sent twice.
- Given a channel/group message without mentions, when the user sends it, then no terminal dispatch is created unless the user explicitly performs a manual dispatch.
- Given any dispatch fails, when the send operation completes, then the chat message remains visible and the dispatch failure/action is visible to the user.
- Given the implementation is complete, when tests run, then focused frontend, Rust orchestration/chat, contract and build checks pass.

## Spec Change Log

- 2026-05-14 review patch: backend now derives `@all` from message body, old `chat_message_send` rejects `@all`, non-terminal mention targets return visible failed dispatches, and send-specific merge logic excludes plain channel history.

## Design Notes

Golutra has two separate send commands, but normal user chat uses the combined one:

```ts
sendConversationMessageAndDispatch({
  workspaceId, workspacePath, conversationId, conversationType,
  text, senderId, senderName, mentions, messageId, clientTraceId, timestamp
});
```

orchlet can preserve its stronger typed dispatch repository while matching that semantic: frontend sends once; backend owns persistence, target planning and terminal dispatch; UI renders returned dispatch states and later terminal output events.

## Verification

**Commands:**
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` -- passed.
- `pnpm exec tsc --noEmit` -- passed.
- `pnpm vitest run src/App.test.tsx` -- 104 tests passed.
- `pnpm test:contracts` -- 81 fixture groups validated; 12 Rust fixture tests passed.
- `cargo check --manifest-path src-tauri/Cargo.toml` -- passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` -- 488 lib tests, 12 contract fixture tests, 21 schema fixture tests and smoke scaffold passed.
- `pnpm tauri build` -- passed; produced macOS app and DMG bundles.

## Suggested Review Order

**Backend Send Semantics**

- Main send-and-dispatch coordinator owns persistence, fan-out, and visible failures.
  [`chat/mod.rs:92`](../../src-tauri/src/app/chat/mod.rs#L92)

- Send path uses dispatch target resolution without manual fallback semantics.
  [`orchestration/mod.rs:107`](../../src-tauri/src/app/orchestration/mod.rs#L107)

- Send-specific merge prevents plain channel history from entering terminal payloads.
  [`orchestration/mod.rs:357`](../../src-tauri/src/app/orchestration/mod.rs#L357)

**Target Planning**

- Fan-out planner covers DM, explicit mentions, `@all`, and non-terminal failures.
  [`orchestration/mod.rs:139`](../../src-tauri/src/domain/orchestration/mod.rs#L139)

- Failed dispatch creation preserves saved messages when target dispatch fails.
  [`dispatch_repository.rs:149`](../../src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs#L149)

**Gateway And Contracts**

- New command enters through the normal Tauri gateway boundary.
  [`chat_commands.rs:58`](../../src-tauri/src/gateway/chat_commands.rs#L58)

- Result contract returns message data plus per-target dispatch outcomes.
  [`chat.rs:243`](../../src-tauri/src/contracts/chat.rs#L243)

**Frontend Binding**

- Composer sends once through the semantic send-and-dispatch API.
  [`WorkspaceSelectionPage.tsx:2881`](../../src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx#L2881)

- Returned dispatch outcomes drive visible message-level status.
  [`WorkspaceSelectionPage.tsx:2931`](../../src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx#L2931)

- Multi-target result aggregation handles partial skipped and failed states.
  [`WorkspaceSelectionPage.tsx:13860`](../../src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx#L13860)

**Tests And Fixtures**

- Rust tests cover DM, fan-out, failure visibility, and send-specific merge.
  [`orchestration/mod.rs:806`](../../src-tauri/src/app/orchestration/mod.rs#L806)

- Frontend tests assert the new one-call send path and `@all` request shape.
  [`App.test.tsx:6154`](../../src/App.test.tsx#L6154)

- Contract fixture typing includes the new send-and-dispatch command.
  [`contract-fixture-types.ts:1205`](../../tests/contract/contract-fixture-types.ts#L1205)
