# Story 2.6: 会话管理操作

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a chat user,
I want to pin, mute, rename, clear and delete conversations,
so that I can keep my workspace communication organized.

## Acceptance Criteria

1. Given a conversation exists, when the user pins, mutes or renames it, then the conversation list and detail header reflect the updated state.
2. Given the user chooses to clear a conversation, when they confirm the action, then local messages are cleared according to the current workspace policy and the action is not silent.
3. Given the user chooses to delete a conversation, when deletion completes, then the conversation no longer appears in active lists and related unread state is removed.

## Tasks / Subtasks

- [x] Task 1: Extend chat contracts and typed frontend API for conversation management (AC: 1-3)
  - [x] Extend `ConversationProfile` with `isMuted`; keep `isPinned` existing and do not expose deleted conversations in normal list responses.
  - [x] Add request/result DTOs for updating conversation settings, clearing conversation messages and deleting conversations.
  - [x] Add explicit commands: `chat_conversation_settings_update`, `chat_conversation_clear`, and `chat_conversation_delete`.
  - [x] Regenerate TypeScript with `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` and `TS_RS_EXPORT_DIR=bindings cargo test`; do not hand-edit generated bindings.
  - [x] Extend `src/shared/api/chat-api.ts` with `updateConversationSettings`, `clearConversation`, and `deleteConversation`.
  - [x] Add/update contract fixtures and validators for the new commands.

- [x] Task 2: Add SQLite support for muted/deleted state and safe management actions (AC: 1-3)
  - [x] Add a new workspace migration, e.g. `202605121600__conversation_management.sql`, adding `is_muted` and `deleted_at_ms` to `conversations`.
  - [x] Keep previous migrations immutable and preserve private/group/channel data created by Stories 2.3-2.5.
  - [x] Normal conversation list queries must filter deleted conversations.
  - [x] Clear must remove local messages and read-position data for that conversation, reset unread count and preview, and return a clear count.
  - [x] Delete must remove or deactivate related messages, read positions and group memberships, remove unread state, and make the conversation disappear from active list responses.
  - [x] Default channel must not be deletable; return a structured recoverable error instead.

- [x] Task 3: Implement domain/use-case behavior and tests (AC: 1-3)
  - [x] Settings update validates workspace/conversation ids; title updates use existing conversation title normalization and optional fields only change what was requested.
  - [x] Pin/mute/rename updates return the refreshed conversation and refreshed list with deterministic ordering.
  - [x] Clear returns `clearedMessageCount`, refreshed conversation and refreshed list, even when zero messages were removed.
  - [x] Delete returns `deletedConversationId` and refreshed list; deleting missing/default conversations returns structured errors.
  - [x] Add Rust tests for pin/mute/rename, clear message cleanup/read-position cleanup, delete cleanup/list filtering and default-channel delete rejection.

- [x] Task 4: Add management controls to the existing workspace conversation panel (AC: 1-3)
  - [x] Extend `WorkspaceSelectionPage.tsx`; do not add a new route/page.
  - [x] Add controls in the current conversation detail area for pin, mute and rename; header/list rows must reflect updated title and muted/pinned state.
  - [x] Add clear and delete actions with `window.confirm` confirmations; show toast outcome including cleared count or deleted conversation id.
  - [x] After delete, select the next available conversation and clear message panel state for the deleted conversation.
  - [x] Preserve existing group membership, private conversation, message send/history, read-position, member/contact and data-integrity flows.

- [x] Task 5: Extend fixtures, schema/data validation and frontend tests (AC: 1-3)
  - [x] Update schema manifest/fixtures for `is_muted` and `deleted_at_ms`.
  - [x] Update data-integrity validators/fixtures if schema coverage needs new checks.
  - [x] Add frontend tests for pin/mute/rename state reflection, clear confirmation/count, delete removal and default-channel delete rejection or disabled behavior.
  - [x] Keep fixture claims honest: no archive/restore, notifications, remote sync, dispatch, mentions, emoji, attachments or terminal output behavior.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test:frontend`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=bindings cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 2.6 owns local conversation management actions only. Do not implement archive/restore, notification preferences, remote sync, conversation search, message export, dispatch cleanup, terminal output cleanup, mentions, emoji or attachments.

### Current Implementation State

- Story 2.5 completed local message storage/history/read-position behavior with `messages` and `conversation_read_positions`.
- `ConversationProfile` currently has `isPinned` but no `isMuted`.
- `conversation_repository.rs` owns conversation/message/read-position persistence and applies current workspace migrations.
- `WorkspaceSelectionPage` already renders conversation list, current conversation detail, group membership controls, message history and composer.

### Technical Requirements

- Use optional settings update fields so pin/mute/rename can be changed independently.
- Use existing `normalize_conversation_title`; keep the 80 character cap.
- Clear policy for this story is local hard-delete of messages for the conversation plus read-position removal and conversation metadata reset. The action must return a count and show a toast.
- Delete policy for this story is local hard-delete of the conversation plus its messages, read position and group membership. Default channel delete is rejected.
- Conversation list APIs should return only non-deleted conversations.
- All write paths stay behind Rust app/repository boundaries; React uses only `chatApi`.

### Previous Story Intelligence

- 2.5 added `lastMessagePreview`, unread and read-position updates; clear/delete must reset those consistently.
- 2.4 default channel is initialized by `chat_conversations_list`; deleting it would break workspace chat entry, so reject deletion.
- 1.6/1.7 fixture honesty still applies for every schema and contract claim.
- Current commit baseline after Story 2.5: `43b3a1a Complete story 2.5 message history read state`.

### Relevant UPDATE Files To Read Before Coding

- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/domain/chat/mod.rs`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/gateway/chat_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src/shared/api/chat-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 2.6 ACs and Epic 2 conversation management scope.
- `_bmad-output/planning-artifacts/prd.md` - FR25 conversation management.
- `_bmad-output/planning-artifacts/architecture.md` - typed IPC, local-first SQLite, storage manifest and boundary rules.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - conversation list accessibility and destructive action confirmation rules.
- `_bmad-output/implementation-artifacts/2-5-message-send-history-pagination-read-position.md` - current message/read-position implementation.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm test:frontend` - passed: 2 frontend test files, 23 tests.
- `pnpm test:contracts` - passed: 19 contract fixture groups and Rust contract fixture tests.
- `pnpm test:data-integrity` - passed: schema/data fixture validation and Rust schema fixture tests.
- `cargo fmt` - applied Rust formatting.
- `cargo fmt --check` - passed.
- `cargo check` - passed.
- `cargo test` - passed: 135 lib tests, 5 contract fixture tests, 10 schema fixture tests, 1 smoke test.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` - passed and regenerated frontend TypeScript contracts.
- `TS_RS_EXPORT_DIR=bindings cargo test` - passed and regenerated Tauri-side TypeScript bindings.
- `pnpm build` - passed.
- `pnpm test` - passed full frontend/contracts/data-integrity/smoke suite.
- `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src` - passed with raw IPC usage limited to shared API/window-context boundary and tests; `Channel` matches are enum/string references.
- `pnpm tauri build` - passed; existing warning remains that bundle identifier `com.orchlet.app` ends with `.app`.

### Completion Notes List

- Added local conversation management contracts, generated TypeScript, typed frontend API methods and IPC commands for settings update, clear and delete.
- Added workspace migration `202605121600__conversation_management.sql` with `is_muted` and `deleted_at_ms`; normal list/get queries filter deleted conversations.
- Implemented pin/mute/rename, local message/read-position clear, hard delete for non-default conversations, group membership cleanup and default channel delete rejection.
- Extended the existing workspace conversation panel with pin, mute, rename, clear and delete controls, destructive confirmations, visible toast outcomes and next-conversation selection after delete.
- Updated contract/schema fixtures, validators, generated bindings and tests while keeping archive/restore, notifications, sync, dispatch, mentions, emoji, attachments and terminal output out of scope.

### File List

- `_bmad-output/implementation-artifacts/2-6-conversation-management-actions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/chat/chat-conversation-clear.error.json`
- `fixtures/contracts/chat/chat-conversation-clear.request.json`
- `fixtures/contracts/chat/chat-conversation-clear.result.json`
- `fixtures/contracts/chat/chat-conversation-delete.error.json`
- `fixtures/contracts/chat/chat-conversation-delete.request.json`
- `fixtures/contracts/chat/chat-conversation-delete.result.json`
- `fixtures/contracts/chat/chat-conversation-settings-update.error.json`
- `fixtures/contracts/chat/chat-conversation-settings-update.request.json`
- `fixtures/contracts/chat/chat-conversation-settings-update.result.json`
- `fixtures/contracts/chat/chat-conversations-list.result.json`
- `fixtures/contracts/chat/chat-group-conversation-create.result.json`
- `fixtures/contracts/chat/chat-group-conversation-members-update.result.json`
- `fixtures/contracts/chat/chat-message-send.result.json`
- `fixtures/contracts/chat/chat-messages-page.result.json`
- `fixtures/contracts/chat/chat-private-conversation-start.result.json`
- `fixtures/contracts/chat/chat-read-position-update.result.json`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/schema/conversations-v1/conversation-list.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src/App.test.tsx`
- `src/contracts/generated/chat.ts`
- `src/contracts/generated/index.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/chat-api.ts`
- `src-tauri/bindings/chat.ts`
- `src-tauri/migrations/workspace/202605121600__conversation_management.sql`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/gateway/chat_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 2.6 context and started development.
- 2026-05-12: Implemented local conversation management actions, UI controls, persistence, fixtures and verification; story marked done.
