# Story 4.1: 从聊天消息派发到成员终端

Status: done

<!-- Note: Created after Story 3.6 completion to continue sprint order into Epic 4. -->

## Story

As a collaborator,
I want to send a chat task to a member terminal,
so that an assistant or shell-backed member can act on the workspace context.

## Acceptance Criteria

1. Given a chat message mentions or targets a member, when the user dispatches it, then the app creates a dispatch request linked to workspace, conversation, message and member ids.
2. Given a member has an associated runtime, when dispatch starts, then the app opens or reuses the member terminal session for that workspace.
3. Given dispatch cannot start, when an error occurs, then the message shows a failed dispatch state with a recoverable action where possible.

## Tasks / Subtasks

- [x] Task 1: Add orchestration dispatch contracts and persistence (AC: 1, 3)
  - [x] Add typed dispatch request/result/status DTOs with generated TypeScript bindings.
  - [x] Add a workspace SQLite migration/repository path for dispatch requests linked to workspace, conversation, message and member ids.
  - [x] Persist failed dispatch attempts with recoverable message/action details when startup cannot continue.

- [x] Task 2: Implement orchestration use case for dispatch start (AC: 1-3)
  - [x] Validate message, conversation and target member ids before creating the dispatch record.
  - [x] Require an explicitly targeted member id for Story 4.1; do not guess ambiguous targets.
  - [x] Open or reuse the member terminal session through the existing Rust-owned terminal runtime and return the linked terminal session id.
  - [x] Write the message body to the member terminal as the first dispatch payload after the session is ready.

- [x] Task 3: Add gateway and frontend API boundary (AC: 1-3)
  - [x] Expose dispatch through a Tauri command in `src-tauri/src/gateway` and register it in `src-tauri/src/lib.rs`.
  - [x] Add `src/shared/api/terminal-dispatch-api.ts` as the only frontend IPC wrapper for dispatch.
  - [x] Export generated orchestration contracts through the shared generated contract index.

- [x] Task 4: Surface dispatch action and failed state in chat UI (AC: 1, 3)
  - [x] Add per-message dispatch controls for messages with a single explicit mentioned member.
  - [x] Show dispatch progress/success/failure state tied to the message without moving terminal output into React state.
  - [x] On failure, show the recoverable action from backend error/dispatch result and keep the message visible.

- [x] Task 5: Add focused tests and contract fixtures (AC: 1-3)
  - [x] Add Rust tests for linked dispatch creation, member terminal reuse and recoverable failure recording.
  - [x] Add frontend tests for dispatch action, success state and failed recoverable message state.
  - [x] Add contract fixtures and TypeScript fixture checks for dispatch request/result/error DTOs.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test:frontend -- src/App.test.tsx`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 4.1 owns the first dispatch vertical slice only: explicit chat message to one targeted member terminal, linked dispatch persistence, open/reuse member terminal session, initial payload write and recoverable failed state. Do not implement Story 4.2 fallback/ambiguous target selection, Story 4.3 DND or busy queue, Story 4.4 dedupe/batching, Story 4.5 terminal output回写/chat stream, Epic 5 notifications or Epic 7 settings UI.

### Current Implementation State

- Story 3.6 is complete at commit `065b270 Complete story 3.6 terminal recovery`.
- Chat messages are persisted in SQLite through `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`; `ChatMessageProfile` currently has `sending`, `sent` and `failed` send status only.
- Mentions are normalized and stored in `message_mentions`; frontend keeps `mentionedMemberIds` and mention chips in `WorkspaceSelectionPage`.
- `TerminalRuntimeState` owns PTY sessions and already supports `open_or_create_session`, member runtime validation, command preflight, `write_input`, terminal snapshots and recoverable `AppError`s.
- `terminal_open` opens/focuses the terminal window and ensures a terminal tab, but the app-layer terminal runtime can be called directly by orchestration to avoid frontend raw IPC coupling.
- Frontend chat UI currently lives in `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`; there is no dedicated `pages/chat` directory yet.

### Technical Requirements

- Add an orchestration module rather than putting dispatch business logic into chat or gateway:
  - `src-tauri/src/contracts/orchestration.rs`
  - `src-tauri/src/domain/orchestration/mod.rs`
  - `src-tauri/src/app/orchestration/mod.rs`
  - `src-tauri/src/gateway/orchestration_commands.rs`
  - `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- Use the existing `TerminalRuntimeState` for open/reuse and `write_input`; terminal session state remains Rust-owned.
- Persist one dispatch request per explicit operation with at least workspace id, conversation id, message id, member id, status, terminal session id, created/updated timestamps and optional recoverable failure message/action/details.
- Dispatch payload should be deterministic and minimal for this story: the chat message body plus a trailing newline if missing.
- Failure should not delete or hide the chat message. It should return/persist a failed dispatch profile with `userAction` where possible.
- If the message has no target or multiple targets and the caller does not provide one explicit `memberId`, return a recoverable target-required error. Do not implement target resolution rules here.

### Architecture Compliance

- `src/shared/api` remains the only frontend Tauri boundary. Components must not import `invoke`, `listen`, `Channel`, Tauri window APIs or plugin APIs directly.
- `src-tauri/src/gateway` exposes commands and maps app state; it must not contain dispatch business logic.
- `src-tauri/src/app/orchestration` coordinates chat repository, dispatch repository and terminal runtime.
- `src-tauri/src/domain/orchestration` owns validation, status labels and payload normalization.
- SQLite access stays inside infrastructure repository modules.
- Terminal hot-path output must remain renderer-adapter based; dispatch UI must not store terminal output chunks in React state.

### UX Requirements

- Per-message dispatch controls should be compact and only appear where Story 4.1 can act: a message with exactly one explicit mentioned member, or a message with one selected explicit dispatch target if added locally.
- Use an icon+text button for dispatch, with disabled/progress state while dispatch is starting.
- Success state should show that the dispatch was sent to the member terminal and expose the terminal session id or short id.
- Failed state should show clear text and the recoverable action returned by the backend. Keep the failed message visible in the message history.
- Do not add a marketing surface, settings page or notification preview behavior.

### Previous Story Intelligence

- Story 3.6 added terminal environment diagnostics, command preflight and recoverable launch errors. Reuse those `AppError` details instead of inventing new frontend error parsing.
- Story 3.6 confirms failed terminal launch attempts should not leak runtime sessions.
- Story 3.6 kept terminal output out of React state; the same constraint applies when dispatch writes the initial payload.
- Story 3.3/3.6 established contract fixture coverage for every new IPC request/result/error shape.
- Recent commits use focused app-layer Rust tests plus `App.test.tsx` frontend tests for workspace/chat integration.

### Relevant Files To Read Before Coding

- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/gateway/chat_commands.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/terminal_tab_repository.rs`
- `src/shared/api/chat-api.ts`
- `src/shared/api/terminal-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `src-tauri/tests/contract_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `fixtures/contracts/contract-fixtures.manifest.json`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 4.1 acceptance criteria and Epic 4 sequence.
- `_bmad-output/planning-artifacts/prd.md` - FR45, FR51, NFR2, NFR3, NFR4, NFR11 and NFR12.
- `_bmad-output/planning-artifacts/architecture.md` - orchestration service ownership, IPC boundaries and message-to-terminal data flow.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - chat input, member terminal, error state and terminal output state guidance.
- `_bmad-output/implementation-artifacts/3-6-cli-environment-resolution-error-recovery-session-snapshot.md` - terminal recovery behavior and verification baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: Story 4.1 created from Epic 4 spec and current code context.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml app::orchestration -- --nocapture` - pass.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` - pass and regenerated frontend orchestration TypeScript contracts.
- 2026-05-12: `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` - pass and regenerated Tauri-side orchestration bindings.
- 2026-05-12: `pnpm test:frontend -- src/App.test.tsx` - pass.
- 2026-05-12: `pnpm test:contracts` - pass.
- 2026-05-12: `pnpm test:data-integrity` - pass.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml --check` - pass.
- 2026-05-12: `cargo check --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `pnpm build` - pass; Vite reported existing chunk-size warning.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `pnpm test` - pass.
- 2026-05-12: IPC boundary scan - reviewed expected shared API/test mocks plus Rust `ConversationKind::Channel` enum usage only.
- 2026-05-12: `pnpm tauri build` - pass; Tauri reported existing bundle identifier warning and Vite reported existing chunk-size warning.

### Completion Notes List

- Added typed orchestration dispatch contracts, generated bindings, fixtures and a workspace SQLite dispatch request repository.
- Implemented the app-layer dispatch use case for explicit single-member chat dispatch, including workspace/conversation/message/member validation, pending/dispatched/failed persistence and terminal session open/reuse through `TerminalRuntimeState`.
- Added gateway command registration and the shared frontend `terminal-dispatch-api` wrapper so the UI does not import raw Tauri APIs.
- Surfaced per-message dispatch controls and dispatching/dispatched/failed states in the chat UI while keeping terminal output out of React state.
- Added focused Rust, frontend and contract fixture coverage for successful dispatch, terminal reuse and recoverable failure behavior.

### File List

- `_bmad-output/implementation-artifacts/4-1-dispatch-chat-message-to-member-terminal.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/orchestration/dispatch-chat-message.error.json`
- `fixtures/contracts/orchestration/dispatch-chat-message.request.json`
- `fixtures/contracts/orchestration/dispatch-chat-message.result.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/orchestration.ts`
- `src-tauri/migrations/workspace/202605122000__dispatch_requests.sql`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/app/orchestration/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/orchestration.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/domain/orchestration/mod.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/gateway/orchestration_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/mod.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/orchestration.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/index.ts`
- `src/shared/api/terminal-dispatch-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 4.1 context for explicit chat message dispatch to member terminal.
- 2026-05-12: Implemented explicit chat-to-member-terminal dispatch contracts, persistence, orchestration use case, gateway/API wiring, chat UI states and verification coverage.
