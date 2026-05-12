# Story 2.5: 消息发送、历史分页与已读位置

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a chat user,
I want messages to send quickly and history to load predictably,
so that local collaboration feels responsive even with large conversations.

## Acceptance Criteria

1. Given the user enters a text message, when they send it, then the message is stored locally and shows a sending, sent or failed status.
2. Given a conversation has older messages, when the user scrolls or requests more history, then older messages load in pages without blocking chat input.
3. Given the user reads a conversation, when the read position changes, then unread count and read position are updated for that conversation.

## Tasks / Subtasks

- [x] Task 1: Extend chat contracts and typed frontend API for messages and read position (AC: 1-3)
  - [x] Add Rust DTOs/enums in `src-tauri/src/contracts/chat.rs` for message status (`sending`, `sent`, `failed`), message profile, message page/cursor, send request/result, page request/result, read-position profile and read-position update request/result.
  - [x] Add explicit commands: `chat_message_send`, `chat_messages_page`, and `chat_read_position_update`.
  - [x] Keep all IPC payload fields camelCase and all errors as structured `AppError`; no raw `invoke` outside `src/shared/api`.
  - [x] Regenerate TypeScript with `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`; do not hand-edit generated bindings.
  - [x] Extend `src/shared/api/chat-api.ts` with `sendMessage`, `listMessages`, and `updateReadPosition`.
  - [x] Add/update contract fixtures under `fixtures/contracts/chat/`, update `fixtures/contracts/contract-fixtures.manifest.json`, `scripts/validate-contract-fixtures.mjs`, `tests/contract/contract-fixture-types.ts`, and `src-tauri/tests/contract_fixtures.rs`.

- [x] Task 2: Add workspace SQLite storage for messages and read positions (AC: 1-3)
  - [x] Add a new workspace migration, e.g. `202605121430__messages_read_positions.sql`, without editing previous applied migrations.
  - [x] Add a `messages` table with ULID `id`, `workspace_id`, `conversation_id`, local author/member reference, text body, `send_status`, `created_at_ms`, `updated_at_ms`, and indexes for conversation history paging.
  - [x] Add a `conversation_read_positions` table keyed by `workspace_id + conversation_id`, storing `last_read_message_id`, `last_read_at_ms`, and `updated_at_ms`.
  - [x] Preserve Story 2.4 tables and uniqueness constraints for default channel, private conversations and group memberships.
  - [x] Update storage manifest entries/categories for message records and conversation read positions only.
  - [x] Extend data-integrity validation, schema manifest and schema fixtures so message/read-position failures are reported independently from member/contact/conversation failures.

- [x] Task 3: Implement message send, history paging and read-position use cases (AC: 1-3)
  - [x] Sending must validate workspace id, conversation id, conversation ownership, and non-empty trimmed text; cap message body length reasonably, e.g. 4000 characters.
  - [x] Sending must persist the message in the workspace DB, return the persisted message, update conversation `last_message_preview`, `last_activity_at_ms`, `updated_at_ms`, and leave local conversation unread at 0 when the local owner sends in the active conversation.
  - [x] History paging must support deterministic pages with a bounded limit, stable ordering, `hasMore`, and a cursor such as `beforeMessageId`; return messages in chronological display order.
  - [x] Read-position updates must validate the message belongs to the conversation, upsert the read-position row, and recalculate/update the conversation unread count based on messages newer than the read position.
  - [x] Keep repository/use-case boundaries: React and gateway handlers do not write durable storage directly.
  - [x] Add Rust unit/integration tests for send validation, preview/activity updates, bounded pagination, invalid cursor/message ownership, read-position upsert and unread recalculation.

- [x] Task 4: Add message history and composer UI on the existing workspace surface (AC: 1-3)
  - [x] Extend `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`; do not add a new router/page.
  - [x] When a conversation is selected, load the newest message page via `chatApi.listMessages` and render a lightweight message list in the conversation detail area.
  - [x] Add an explicit "load older" history control or scroll-triggered load that does not disable the composer/input while history is loading.
  - [x] Add a text composer with Enter-to-send and Shift+Enter-for-new-line behavior per UX spec; empty/whitespace-only sends must be rejected before IPC.
  - [x] Show optimistic `sending`, success `sent`, and local failure `failed` states in the message list; a failed send may be a non-persisted UI item when storage fails.
  - [x] After loading/selecting messages, update read position for the newest visible message and refresh affected conversation unread count/list data.
  - [x] Preserve existing workspace open, member/contact, private chat entry, group create/update, data-integrity and recent-workspace flows.

- [x] Task 5: Extend fixtures, schema/data validation and frontend tests (AC: 1-3)
  - [x] Update `fixtures/schema/sqlite-workspace-v1/schema-manifest.json` and add focused message/read-position schema fixtures.
  - [x] Update `fixtures/data-integrity/reports/*.json`, `scripts/validate-data-fixtures.mjs`, `tests/data-integrity`, and `src-tauri/tests/schema_data_fixtures.rs`.
  - [x] Add/extend `src/App.test.tsx` coverage for loading messages, sending with visible status transition, failed send UI state, loading older history without blocking input, and read-position/unread refresh.
  - [x] Keep fixture claims honest: no dispatch queue, notifications, terminal output backfill, attachments, emoji, mentions, or conversation management actions in this story.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test:frontend`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 2.5 starts local message storage and read-state behavior only. It must not become dispatch/orchestration or a full chat workbench.

Do not implement:

- terminal dispatch, outbox, working queue, DND, deduplication, stream output, terminal output backfill or terminal session mapping;
- notifications, tray unread aggregation, notification preview or cross-window unread badges;
- pin, mute, rename, clear or delete conversation actions;
- mentions, `@all`, emoji search/recent emoji, image/roadmap attachments or shortcut prompts;
- remote sync, accounts, invite links, server message delivery, cloud storage or old `.golutra` compatibility.

### Current Implementation State

- Story 2.4 added conversation list foundations:
  - `chat_conversations_list`, `chat_group_conversation_create`, `chat_group_conversation_members_update`, and expanded `chat_private_conversation_start`.
  - `ConversationProfile` currently includes `kind`, `title`, `isDefault`, `isPinned`, `unreadCount`, `lastMessagePreview`, participants, members and timestamps.
  - Workspace migrations currently include `202605121210__private_conversations.sql` and `202605121300__conversation_list_groups.sql`.
  - `conversations` stores channel/group/private list metadata; `conversation_members` stores group membership.
  - `list_conversations` initializes exactly one pinned default channel per workspace.
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs` owns all current conversation persistence. Extend it or split a small message repository only if the module becomes materially clearer; do not create a parallel chat store.
- `WorkspaceSelectionPage` is the current active workspace shell. It already loads members, contacts and conversation list, supports group create/update, and uses toast patterns for recoverable errors.
- No message table, history command, read-position table, message composer, dispatch state or notification state exists yet.

### Technical Requirements

- Use ULID strings for message ids and keep timestamps as integer milliseconds.
- Use existing owner member as the local sender identity. `initialize_member_store` guarantees one owner and should remain the path that initializes member/workspace DB prerequisites.
- Message text must be trimmed for validation but preserve intended internal newlines. Reject empty messages and cap length with a domain-level error.
- Store only plain text message bodies in this story. No markdown renderer, unsafe HTML, file paths, attachments or link execution.
- `sending` may be an optimistic frontend state while `chat_message_send` is in flight. A successful local write returns `sent`; a command error should leave a visible failed UI item without claiming it was persisted.
- History pagination should be repository-driven, not React-only. Recommended behavior: newest page first; older pages requested with `beforeMessageId`; SQL orders by `created_at_ms DESC, id DESC`, fetches `limit + 1`, then returns display order ascending.
- Sending must update conversation preview/activity in the same durable flow as the message insert, so the conversation list remains truthful after refetch.
- Read-position update must upsert a dedicated read-position row and update `conversations.unread_count`; tests may seed unread/newer messages to prove recalculation because incoming messages are not implemented yet.
- Keep read-position semantics local-user only for now. Do not introduce multi-user read receipts or per-member read state in this story.
- Validation errors should use stable codes such as `message.body.empty`, `message.body.tooLong`, `message.conversation.notFound`, `message.cursor.notFound`, and `readPosition.message.notFound`.

### Architecture Compliance

- Rust command handlers live in `src-tauri/src/gateway`; use cases live in `src-tauri/src/app`; validation/domain rules live in `src-tauri/src/domain`; SQLite adapters live under `src-tauri/src/infrastructure/persistence/sqlite`.
- Frontend code calls only `src/shared/api` facades for IPC.
- Generated contract files live in `src/contracts/generated` and `src-tauri/bindings`; regenerate with `ts-rs`, do not hand-edit generated outputs.
- SQLite tables use plural `snake_case`; migration files use `YYYYMMDDHHMM__short_description.sql`; indexes use `idx_...` or `uq_...`.
- Contract fixtures live under `fixtures/contracts/<domain>/`; schema/data fixtures live under `fixtures/schema/<case-name>/` and `fixtures/data-integrity/<case-name>/`.
- Every newly persisted store must be represented in the storage manifest, schema fixture and data-integrity validation.

### UX Requirements

- Follow UX Chat Workbench guidance only as far as this existing page supports: conversation list plus detail area with message history and composer.
- Message empty state should be lightweight. History loading should show the load control state, not a blocking page overlay.
- Text input must remain usable while older pages are loading.
- Keyboard behavior: Enter sends, Shift+Enter inserts a newline.
- Icon-only controls need `aria-label` and tooltip support if icon-only. Prefer text buttons for clear chat commands where space allows.
- Use quiet operational styling consistent with the current workspace page. Cards stay at 8px radius or less; no marketing hero or decorative layout.
- Long message text, member labels and conversation titles must wrap/truncate without overlapping controls on mobile or desktop widths.

### Previous Story Intelligence

- Story 2.4 intentionally left message sending, message history and read positions out. This story now owns those gaps and should remove `messages` and `read_positions` from future/excluded fixture lists where they become implemented.
- Story 2.4 established deterministic conversation ordering in the repository. Message send/read-position updates must keep the list metadata correct so existing UI ordering remains reliable after refetch.
- Story 1.6 requires each newly persisted table/domain to update storage manifest, schema marker, fixture and validation checks.
- Story 1.7 requires contract/schema fixture honesty. Do not mark dispatch, notification, attachment, emoji, mention or terminal output behavior as implemented.
- Current commit baseline after Story 2.4: `9d1abd7 Complete story 2.4 conversation list foundations`.

### Relevant UPDATE Files To Read Before Coding

- `src-tauri/src/contracts/chat.rs`: add message/read-position DTOs and status enum.
- `src-tauri/src/domain/chat/mod.rs`: add message body/page-size validation and reuse conversation-id validation.
- `src-tauri/src/app/chat/mod.rs`: add use-case functions that call repository APIs.
- `src-tauri/src/gateway/chat_commands.rs`, `src-tauri/src/gateway/mod.rs`, `src-tauri/src/lib.rs`: add command handlers and registration.
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`: current conversation/list persistence; extend message/read-position storage without breaking existing private/group/channel behavior.
- `src-tauri/migrations/workspace/202605121210__private_conversations.sql`, `src-tauri/migrations/workspace/202605121300__conversation_list_groups.sql`: prior schema context only; create a new migration for this story.
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`, `src-tauri/src/app/data_integrity/mod.rs`: add message/read-position manifest entries and independent validation checks.
- `src/shared/api/chat-api.ts`: extend the typed frontend API boundary.
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`: add message history/composer while preserving current workspace, members, contacts and conversations behavior.
- `src/App.test.tsx`: add focused frontend coverage for message workflows.
- `scripts/validate-contract-fixtures.mjs`, `tests/contract/contract-fixture-types.ts`, `src-tauri/tests/contract_fixtures.rs`: update contract fixture enforcement.
- `scripts/validate-data-fixtures.mjs`, `tests/data-integrity/data-integrity-fixture-types.ts`, `src-tauri/tests/schema_data_fixtures.rs`: update schema/data fixture enforcement.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 2.5 ACs and Epic 2 messaging scope.
- `_bmad-output/planning-artifacts/prd.md` - FR23, FR24, FR26; performance/data-integrity requirements for message write and history pagination.
- `_bmad-output/planning-artifacts/architecture.md` - typed IPC, local-first SQLite, storage manifest, performance and contract-first boundaries.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Chat input keyboard behavior and Messages empty/loading/error states.
- `_bmad-output/implementation-artifacts/1-6-storage-manifest-schema-validation-report.md` - persisted domains require manifest/schema/fixture validation.
- `_bmad-output/implementation-artifacts/1-7-test-contract-fixture-desktop-smoke-scaffolding.md` - contract/schema fixture and smoke scaffold expectations.
- `_bmad-output/implementation-artifacts/2-4-default-channel-group-chat-conversation-list.md` - current conversation/list implementation and explicit message/read-position exclusions.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm test:frontend` - passed: 2 frontend test files, 21 tests.
- `pnpm test:contracts` - passed: 16 contract fixture groups and Rust contract fixture tests.
- `pnpm test:data-integrity` - passed: schema/data fixture validation and Rust schema fixture tests.
- `cargo fmt` - applied Rust formatting.
- `cargo fmt --check` - passed.
- `cargo check` - passed.
- `cargo test` - passed: 125 lib tests, 5 contract fixture tests, 10 schema fixture tests, 1 smoke test.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` - passed and regenerated frontend TypeScript contracts.
- `TS_RS_EXPORT_DIR=bindings cargo test` - passed and regenerated Tauri-side TypeScript bindings.
- `pnpm build` - passed.
- `pnpm test` - passed full frontend/contracts/data-integrity/smoke suite.
- `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src` - passed with raw IPC usage limited to shared API/window-context boundary and tests; `Channel` matches are enum/string references.
- `pnpm tauri build` - passed; existing warning remains that bundle identifier `com.orchlet.app` ends with `.app`.
- Local review - no blocking findings after verifying ACs against contracts, repository logic, UI behavior, fixture coverage and scope exclusions.

### Completion Notes List

- Added message and read-position chat contracts, typed API methods and IPC commands for send, page and read-position update.
- Added workspace SQLite `messages` and `conversation_read_positions` storage with migration, manifest entries, data-integrity checks and schema fixtures.
- Implemented local text send with owner sender identity, body validation, persisted `sent` status, preview/activity updates and local read-position upsert.
- Implemented bounded deterministic message paging with `beforeMessageId`, chronological display order, `hasMore` and `nextBeforeMessageId`.
- Implemented read-position updates that validate message ownership and recalculate conversation unread count.
- Extended the existing workspace conversation panel with message history, load-older control, Enter/Shift+Enter composer behavior, optimistic `sending`, persisted `sent` and visible `failed` UI states.
- Preserved scope boundaries: no terminal dispatch, notifications, conversation management actions, mentions, emoji, attachments, remote sync or old data compatibility.

### File List

- `_bmad-output/implementation-artifacts/2-5-message-send-history-pagination-read-position.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/chat/chat-message-send.error.json`
- `fixtures/contracts/chat/chat-message-send.request.json`
- `fixtures/contracts/chat/chat-message-send.result.json`
- `fixtures/contracts/chat/chat-messages-page.error.json`
- `fixtures/contracts/chat/chat-messages-page.request.json`
- `fixtures/contracts/chat/chat-messages-page.result.json`
- `fixtures/contracts/chat/chat-read-position-update.error.json`
- `fixtures/contracts/chat/chat-read-position-update.request.json`
- `fixtures/contracts/chat/chat-read-position-update.result.json`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/schema/conversations-v1/conversation-list.json`
- `fixtures/schema/messages-v1/message-history.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src/App.test.tsx`
- `src/contracts/generated/chat.ts`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/chat-api.ts`
- `src-tauri/bindings/chat.ts`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/migrations/workspace/202605121430__messages_read_positions.sql`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/domain/chat/mod.rs`
- `src-tauri/src/gateway/chat_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 2.5 context and marked ready for development.
- 2026-05-12: Implemented local message send, paged history, read-position/unread updates, UI composer/history states, fixtures, validation and local review; story marked done.
