# Story 7.8: 聊天数据修复与清空维护

Status: done

<!-- Note: Created after Story 7.7 completion so the developer can reuse the existing Settings modal data section, chat SQLite repository, data-integrity validation patterns and conversation clear/delete safety rules. -->

## Story

As a workspace owner,
I want to repair or clear current workspace chat data intentionally,
so that damaged or unwanted local chat state can be handled without silent data loss.

## Acceptance Criteria

1. Given the user triggers chat data repair, when repair runs, then the app reports repaired items, failed items and any follow-up action.
2. Given the user clears current workspace chat data, when they confirm the destructive action, then chat data for that workspace is cleared according to policy and the app records a visible result.
3. Given repair or clear fails, when the operation ends, then the app reports the failure, affected scope and next available action without pretending the data changed.

## Tasks / Subtasks

- [x] Task 1: Add typed chat maintenance contracts and IPC commands (AC: 1-3)
  - [x] Add chat-domain DTOs for `RepairWorkspaceChatDataRequest`, `RepairWorkspaceChatDataResult`, `ClearWorkspaceChatDataRequest`, `ClearWorkspaceChatDataResult` and small result item/status types for repaired, failed and skipped maintenance items.
  - [x] Include `workspaceId`, affected scope, repaired/failed/skipped counts, cleared row counts, refreshed `ConversationProfile[]`, `followUpAction` and `completedAtMs` in result DTOs.
  - [x] Add explicit Tauri commands such as `chat_data_repair` and `chat_data_clear`; keep command handlers in `src-tauri/src/gateway/chat_commands.rs` and app use cases in `src-tauri/src/app/chat/mod.rs`.
  - [x] Export DTOs through `ts-rs` into `src/contracts/generated/chat.ts` and `src-tauri/bindings/chat.ts`; do not hand-edit generated bindings.
  - [x] Extend `src/shared/api/chat-api.ts` with typed `repairWorkspaceData` and `clearWorkspaceData` methods; feature/page code must not call raw Tauri APIs.
  - [x] Add contract fixtures for success and error cases and update `fixtures/contracts/contract-fixtures.manifest.json`, `scripts/validate-contract-fixtures.mjs`, Rust fixture tests and TypeScript fixture types.

- [x] Task 2: Implement conservative repair policy in the existing SQLite chat repository (AC: 1, 3)
  - [x] Add repair logic under `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs` or a small chat maintenance helper in the same SQLite boundary; do not create a parallel chat store.
  - [x] Run current workspace migrations before repair, then repair only well-understood local chat inconsistencies in a transaction.
  - [x] Required MVP repair targets: ensure the default channel exists when the conversation table is available; remove orphan `message_mentions`; remove read-position rows whose conversation or message is missing; recalculate conversation `unread_count`, `last_message_preview` and `last_activity_at_ms` from current messages/read positions for non-deleted conversations.
  - [x] If `dispatch_requests` exists, remove or safely neutralize dispatch rows whose `message_id` or `source_message_ids_json` references missing messages so queued dispatch cannot resume deleted chat work.
  - [x] Treat unreadable/corrupt rows as failed items unless they match an explicitly implemented repair rule; do not drop or recreate the whole SQLite database.
  - [x] Return itemized counts and follow-up action text when repair cannot handle an issue, for example “运行数据验证并备份工作区数据库后重试”.

- [x] Task 3: Implement current-workspace chat clear policy (AC: 2, 3)
  - [x] Clear only the active/current workspace identified by `workspaceId`; validate the workspace id before touching storage.
  - [x] Clear policy: delete local `messages`, `message_mentions` and `conversation_read_positions` for the workspace; reset all non-deleted conversations to `unread_count = 0`, `last_message_preview = NULL`, and current timestamp metadata; preserve conversation records, group membership, members, contacts, settings, skills, roadmap data, terminal tabs and terminal runtime state.
  - [x] If `dispatch_requests` exists, delete rows for the workspace that reference cleared messages, or mark them non-resumable with a structured result count. Do not leave queued dispatches pointing at deleted messages.
  - [x] Keep the default channel present after clear; if no active conversation remains, list responses must still initialize or return the default channel through the existing `ensure_default_channel` path.
  - [x] Execute clear in a transaction and return zero-count success when there is nothing to clear.
  - [x] On any failure, return a recoverable `AppError` with workspace id, affected table/scope where known, and user action; do not update UI caches on failure.

- [x] Task 4: Add Settings Data maintenance UI in `WorkspaceSelectionPage` (AC: 1-3)
  - [x] Extend the existing profile/settings modal data area from Story 7.7; add repair/clear controls near `ChatTerminalOutputPreferencesSection` instead of creating a new route or standalone Settings page.
  - [x] Add a compact `ChatDataMaintenanceSection` with “修复消息” and “清空所有消息” actions, loading/disabled states, last result summary and error/result text that does not rely on color only.
  - [x] Disable both actions when no active workspace is open; copy must state the current workspace scope when a workspace is active.
  - [x] Require confirmation before repair because it may delete invalid rows. Require stronger confirmation before clear all, for example a second native prompt requiring the workspace name/project id or exact phrase.
  - [x] On success, show a toast and inline visible result with repaired/failed/skipped or cleared counts and any follow-up action.
  - [x] On failure, use `normalizeAppError`, show the affected scope and next action, preserve existing messages/conversation state, and leave the inline result marked as failed.

- [x] Task 5: Refresh chat UI state safely after maintenance (AC: 1-3)
  - [x] After repair success, refresh conversation list and current message query through TanStack Query; do not mutate persisted chat history directly in React state.
  - [x] After clear success, update `conversationQueryKey`, selected conversation, `messageQueryKey`, `messages`, `nextBeforeMessageId`, `hasOlderMessages`, unread state and notification-summary side effects consistently with the existing single-conversation clear/delete patterns.
  - [x] Ensure already rendered transient terminal output streams (`terminalChatStreams`) are not treated as persisted chat messages and are not cleared unless the user refreshes or the terminal session exits normally.
  - [x] Preserve existing conversation settings such as pinned, muted, title, group membership and selected conversation where possible.

- [x] Task 6: Add focused validation coverage (AC: 1-3)
  - [x] Add Rust tests for healthy repair returning zero repairs, orphan mention/read-position repair, conversation metadata recalculation, dispatch row cleanup or neutralization, workspace-wide clear preserving conversations/default channel, and failure without partial mutation.
  - [x] Add frontend tests for repair confirmation/result, repair failure result, clear strong confirmation, clear success cache reset/message removal, cancelled clear preserving state, and clear failure preserving state.
  - [x] Add contract fixture tests for both new commands and update generated TypeScript/Rust bindings.
  - [x] Update schema/data-integrity fixture documentation only if the implemented policy adds or claims new durable storage. Do not add fake attachment or diagnostics fixtures.

- [x] Task 7: Verification and completion evidence (AC: 1-3)
  - [x] Run focused frontend tests for chat data maintenance and existing conversation clear/delete behavior.
  - [x] Run focused Rust chat maintenance tests.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::chat::export_bindings --lib` and `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::chat::export_bindings --lib` if chat DTOs change.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml` and `cargo test --manifest-path src-tauri/Cargo.toml`.
  - [x] Run `pnpm test`, `pnpm build` and the IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.

## Dev Notes

### Scope Boundary

Story 7.8 owns local chat data maintenance for the current workspace only. It does not implement old `golutra` import/compatibility, cloud sync, diagnostics history/export, terminal snapshot repair, semantic AI output parsing, account/team data, attachment storage that does not yet exist, or a new Settings route.

### Product Policy

- Repair and clear are intentional user actions. They must never run silently as a side effect of opening a workspace, running validation, loading settings or changing the terminal output preference.
- Clear all is destructive and local. It must be scoped to the current workspace app-data SQLite database, not global contacts/settings and not workspace-local `.orchlet` metadata.
- Repair is conservative. If a condition cannot be repaired deterministically, report it as failed or skipped with a follow-up action instead of guessing.
- No old-data compatibility is in scope. Do not read old `.golutra` metadata, old redb data or old app-data locations.

### Current Implementation State

- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs` owns current chat SQLite persistence and already applies workspace migrations before normal chat operations.
- Existing chat tables include `conversations`, `conversation_members`, `messages`, `message_mentions` and `conversation_read_positions`.
- Existing conversation management already supports per-conversation clear/delete:
  - `clear_conversation` deletes message mentions, messages and read positions for one conversation, then resets unread/preview metadata.
  - `delete_conversation` hard-deletes non-default conversations and rejects default channel deletion.
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs` persists `dispatch_requests` in the same workspace SQLite database and can contain queued work tied to chat message ids. Clearing messages must not leave queued dispatch rows that can resume against deleted messages.
- `src-tauri/src/app/data_integrity/mod.rs` already validates chat-related stores by reading the workspace id from active/requested workspace context. Data integrity validation reports issues; it does not currently repair them.
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` already has:
  - `handleClearConversation` and `handleDeleteConversation` cache-update patterns for local destructive chat actions.
  - `handleValidateDataIntegrity` and `DataIntegrityPanel` for report-only validation.
  - `ProfileSettingsModal` with Story 7.7 `ChatTerminalOutputPreferencesSection`, which is the correct area to extend for Settings Data maintenance actions.

### Required Maintenance Semantics

- Repair success must include itemized result rows. At minimum, the result should distinguish repaired, failed and skipped items and provide counts for each.
- Repair should refresh list/message state after success because repaired metadata or removed orphan rows can change unread and preview fields.
- Clear success must remove persisted messages for all active conversations in the current workspace and reset conversation metadata while preserving conversations themselves.
- Clear must return refreshed conversation profiles so the frontend can update the conversation list without guessing.
- If no workspace is active, frontend controls should be disabled; backend commands should still reject missing/invalid `workspaceId` with a recoverable error.
- If the database file is missing, repair may initialize the normal schema/default channel path and report no repaired damage; clear should return zero cleared rows plus refreshed conversations.

### Architecture Compliance

- All Tauri calls remain behind `src/shared/api/*`; pages/components must not import raw `invoke`/`listen`.
- New commands belong under the existing chat command/use-case/repository boundary:
  - contracts: `src-tauri/src/contracts/chat.rs`
  - gateway: `src-tauri/src/gateway/chat_commands.rs`
  - app use cases: `src-tauri/src/app/chat/mod.rs`
  - persistence: `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs` and, if needed, `dispatch_repository.rs`
  - frontend API: `src/shared/api/chat-api.ts`
- IPC fields use camelCase through serde/ts-rs and generated TypeScript bindings.
- Use existing React 19, TanStack Query 5, Tauri 2, rusqlite 0.39, Vitest and Testing Library patterns. Do not add npm or crate dependencies.
- SQLite work must be transactional for write operations. Do not do blocking or repeated database calls from React; one command should complete one maintenance operation.
- Generated files and fixture validators must stay in sync. Do not hand-edit `src/contracts/generated/*` or `src-tauri/bindings/*`.

### Project Structure Notes

- The UX specification describes a full Settings page with a Data section, but the current app implements Epic 7 settings inside `ProfileSettingsModal`. Follow the existing implementation and add a compact data maintenance section there.
- `DataIntegrityPanel` on the workspace page is report-only. Do not hide repair/clear behind that panel unless the Settings modal also exposes the explicit actions.
- Existing single-conversation clear uses `window.confirm`. Workspace-wide clear needs stronger confirmation because it affects every conversation in the current workspace.

### Previous Story Intelligence

- Story 7.7 established the current Settings Data adjacency by adding `ChatTerminalOutputPreferencesSection` to the profile/settings modal. Reuse that local state/query/toast pattern and keep result text visible in the modal.
- Story 7.7 review found final-only buffered output must remain bounded and stale terminal status snapshots must not overwrite newer output. Do not route maintenance operations through terminal stream state or clear transient terminal output as if it were persisted chat data.
- Story 2.6 established the policy for local conversation clear/delete: reset unread/preview and return refreshed conversations. Workspace-wide clear should reuse that policy across all conversations, not invent a separate UI-only reset.
- Story 1.6/1.7 fixture honesty still applies: only claim implemented stores/tables/fixtures. Do not add attachment, diagnostics export or repair-history fixtures unless those capabilities are actually implemented.
- Story 7.6/7.7 are still in the current dirty working tree. Preserve those changes and build on them; do not revert or reshape the settings architecture.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/2-6-conversation-management-actions.md`
- `_bmad-output/implementation-artifacts/7-7-chat-terminal-output-display-preferences.md`
- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/gateway/chat_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/workspace_database.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src/shared/api/chat-api.ts`
- `src/shared/api/data-integrity-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

### Testing Requirements

- Rust maintenance tests should operate on temp app-data directories and verify actual SQLite rows, not only DTO shapes.
- Frontend tests should inject `chatApi` mocks through `renderWorkspaceSelection`; do not mock raw Tauri APIs for page behavior.
- Tests must cover cancellation paths for both repair and clear confirmations.
- Failure tests must assert UI/cache state is preserved and the toast/error contains the returned `AppError.userAction` when present.
- Existing Story 2.6 tests for per-conversation clear/delete and Story 7.7 tests for chat terminal output preferences must continue passing.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 7.8 acceptance criteria and FR70/FR71.
- `_bmad-output/planning-artifacts/prd.md` - FR70 and FR71 under Settings & Personalization.
- `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite, typed IPC boundary, data validation flow and storage manifest requirements.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Settings Data repair/clear controls, destructive confirmation and keyboard requirements.
- `_bmad-output/implementation-artifacts/2-6-conversation-management-actions.md` - existing conversation clear/delete policy and cache update requirements.
- `_bmad-output/implementation-artifacts/7-7-chat-terminal-output-display-preferences.md` - existing Settings Data section and current dirty working-tree context.
- `package.json` and `src-tauri/Cargo.toml` - current React, TanStack Query, Tauri, Vitest and rusqlite versions; no new dependency is required.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cargo test --manifest-path src-tauri/Cargo.toml app::chat -- --nocapture` - passed 21 chat tests.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::chat::export_bindings --lib` - passed 33 export tests and regenerated frontend chat bindings.
- `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::chat::export_bindings --lib` - passed 33 export tests and regenerated Tauri chat bindings.
- `pnpm vitest run src/App.test.tsx` - passed 88 tests.
- `pnpm test:contracts` - passed, validated 72 contract fixture groups and 11 Rust fixture tests.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` - passed.
- `cargo check --manifest-path src-tauri/Cargo.toml` - passed.
- `pnpm test:frontend` - passed 4 files / 113 tests.
- `pnpm test:data-integrity` - passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` - passed 387 lib tests, 11 contract fixture tests, 21 schema fixture tests and smoke scaffold.
- `pnpm build` - passed; Vite emitted the existing large chunk warning.
- IPC boundary scan completed; raw Tauri imports remain in shared API modules/tests, with broad `Channel` string matches in chat names.
- `pnpm test` - passed full aggregate suite.

### Completion Notes List

- Added typed chat data maintenance contracts, Tauri commands, app use cases and shared frontend API methods for `chat_data_repair` and `chat_data_clear`.
- Implemented conservative SQLite repair in the existing chat repository: default-channel recovery, orphan mention/read-position cleanup, conversation metadata recalculation, invalid dispatch reference cleanup and failed item reporting for unreadable dispatch source JSON.
- Implemented current-workspace chat clear in a transaction, preserving conversations/members/settings and deleting workspace messages, mentions, read positions and dispatch rows.
- Added Settings modal `ChatDataMaintenanceSection` with repair/clear actions, confirmation prompts, visible result/failure state, toast reporting and TanStack Query cache refresh/reset behavior.
- Added Rust, frontend and contract fixture coverage for repair/clear success, failure and cancellation paths.
- Review follow-up fixed no-message conversation metadata repair so stale preview/unread rows also reset `last_activity_at_ms` from current persisted chat state, and aligned the repair error fixture severity with backend `AppError` behavior.
- Preserved pre-existing dirty Story 7.6/7.7 worktree changes; File List below contains files touched for Story 7.8.

### File List

- `_bmad-output/implementation-artifacts/7-8-chat-data-repair-clear-maintenance.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/chat/chat-data-clear.error.json`
- `fixtures/contracts/chat/chat-data-clear.request.json`
- `fixtures/contracts/chat/chat-data-clear.result.json`
- `fixtures/contracts/chat/chat-data-repair.error.json`
- `fixtures/contracts/chat/chat-data-repair.request.json`
- `fixtures/contracts/chat/chat-data-repair.result.json`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/chat.ts`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/gateway/chat_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/chat.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/chat-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 7.8 context for current-workspace chat data repair and clear maintenance.
- 2026-05-13: Implemented chat data repair/clear contracts, backend maintenance policy, Settings UI, fixtures and validation coverage.
- 2026-05-13: Completed review follow-up for no-message metadata repair and error fixture consistency; marked story done.

## Senior Developer Review (AI)

Review Date: 2026-05-13

Outcome: Approve

Findings: 1 patch finding fixed.

Review Notes:

- Fixed repair metadata recalculation for conversations with no persisted messages: stale unread/preview state now resets `last_activity_at_ms` to the conversation creation timestamp instead of preserving deleted-message activity.
- Added Rust coverage for the no-message stale metadata case.
- Aligned `chat-data-repair.error.json` severity with the backend `recoverable_error` path.
- Settings UI remains behind `src/shared/api/chat-api.ts`; IPC scan shows raw Tauri usage only in shared API modules/tests plus broad `Channel` string matches.
- Validation after review passed: `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml app::chat -- --nocapture`, `pnpm test:contracts`, `pnpm vitest run src/App.test.tsx`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build`, and the IPC boundary scan.
