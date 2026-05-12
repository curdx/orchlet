# Story 2.4: 默认频道、群聊与会话列表

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a collaborator,
I want default channels, group chats and clear conversation ordering,
so that I can move between active discussions efficiently.

## Acceptance Criteria

1. Given a workspace has no conversations, when chat data is initialized, then the workspace has a default channel.
2. Given the user creates a group chat, when they add or remove group members, then membership changes are persisted and reflected in the conversation header.
3. Given the user views the conversation list, when conversations have pinned status, unread state and different activity times, then the list ordering and visual states make those differences clear.

## Tasks / Subtasks

- [x] Task 1: Extend conversation contracts and typed frontend API (AC: 1-3)
  - [x] Extend Rust chat DTOs under `src-tauri/src/contracts/chat.rs` for `ConversationKind` values `channel`, `group`, and `private`, plus list item/header data needed by the UI: `conversationId`, `workspaceId`, `kind`, `title`, `isDefault`, `isPinned`, `unreadCount`, optional `lastMessagePreview`, `createdAtMs`, `updatedAtMs`, `lastActivityAtMs`, and member/participant summaries where applicable.
  - [x] Add explicit commands unless a conflict is discovered: `chat_conversations_list`, `chat_group_conversation_create`, and `chat_group_conversation_members_update`.
  - [x] Keep `chat_private_conversation_start` compatible while returning the expanded conversation shape after contract regeneration.
  - [x] Regenerate TypeScript through `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`; do not hand-edit generated files.
  - [x] Add/update typed frontend facade methods in `src/shared/api/chat-api.ts`: `listConversations`, `createGroupConversation`, `updateGroupConversationMembers`, and existing `startPrivateConversation`.
  - [x] Add command fixtures under `fixtures/contracts/chat/`, update `fixtures/contracts/contract-fixtures.manifest.json`, `scripts/validate-contract-fixtures.mjs`, `tests/contract/contract-fixture-types.ts`, and `src-tauri/tests/contract_fixtures.rs`.
  - [x] Use `camelCase` IPC fields and structured `AppError`; no raw `invoke` outside `src/shared/api`.

- [x] Task 2: Evolve workspace SQLite for channels, groups, list metadata and membership (AC: 1-3)
  - [x] Add a workspace migration such as `202605121300__conversation_list_groups.sql` that evolves `conversations` without destroying Story 2.3 private conversations.
  - [x] Add conversation metadata columns needed now: `is_default`, `is_pinned`, `unread_count`, optional `last_message_preview`, and any nullable fields required to support `channel`/`group` records while preserving private records.
  - [x] Add a `conversation_members` table for group membership with `conversation_id`, `workspace_id`, `member_id`, `created_at_ms`, and appropriate unique/index constraints.
  - [x] Create exactly one default channel per workspace using a deterministic unique constraint, e.g. one `kind='channel' AND is_default=1` conversation per `workspace_id`.
  - [x] Keep one private conversation per `workspace_id + participant_kind + participant_id` from Story 2.3.
  - [x] Do not add chat messages, read positions, message status, outbox, terminal dispatch, notifications, attachments, emoji tables, or conversation management action state beyond fields required for AC3 visual sorting.

- [x] Task 3: Implement chat use cases and repositories (AC: 1-3)
  - [x] `chat_conversations_list` must initialize and return the default channel for a valid workspace id.
  - [x] `chat_group_conversation_create` must validate the workspace id, trim/reject empty titles, validate all member ids exist in the workspace, deduplicate member ids, persist the group conversation, and persist membership.
  - [x] `chat_group_conversation_members_update` must reject default channel/private conversation ids, validate the group exists in the workspace, validate all member ids, deduplicate ids, replace persisted membership, and return the refreshed conversation/list.
  - [x] Conversation list ordering must be deterministic: pinned conversations first, then unread conversations, then `lastActivityAtMs` descending, then `updatedAtMs` descending, then title/id as a stable tie-breaker.
  - [x] Conversation header data for groups must include current member display labels after create/update; deleting/removing members from the member domain must not be cascaded in this story unless explicitly implemented and tested.
  - [x] Private conversation start/reuse must keep validating member/contact existence and must include private conversations in the list results.

- [x] Task 4: Add conversation list and group entry UI without building full messaging (AC: 1-3)
  - [x] Extend the existing active workspace surface in `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` with a compact conversation list panel; do not introduce a separate router/page unless the existing app already has one.
  - [x] Load conversations through `chatApi.listConversations` only after a workspace is active.
  - [x] Show default channel, group conversations, and private conversations with kind icon/label, pinned marker, unread badge, and last-activity ordering. Use stable dimensions so badges/icons do not shift rows.
  - [x] Add a small create-group flow using current workspace members; allow selecting members, creating a group, and updating group membership so the header reflects membership changes.
  - [x] Existing member/contact `发送消息` actions must refetch the conversation list after private conversation create/reuse.
  - [x] Use `lucide-react` icons; icon-only controls need `aria-label` and tooltip support if icon-only.
  - [x] Do not add message composer, send behavior, message history, unread mutation/read-position behavior, rename/delete/pin/mute actions, terminal dispatch, or notifications in this story.

- [x] Task 5: Extend storage manifest, schema/data fixtures and validation (AC: 1-3)
  - [x] Update storage manifest entries/categories for implemented conversation records and group membership only.
  - [x] Extend data-integrity validation for the evolved conversations schema and membership table; checks must remain independent so contact/member/conversation failures do not hide each other.
  - [x] Update `fixtures/schema/sqlite-workspace-v1/schema-manifest.json` and add any focused conversation fixture needed to prove default channel, group membership, pinned/unread/list metadata, and private conversation compatibility.
  - [x] Update `fixtures/data-integrity/reports/*.json`, `scripts/validate-data-fixtures.mjs`, `tests/data-integrity`, and `src-tauri/tests/schema_data_fixtures.rs`.
  - [x] Preserve Story 1.6 rule: do not add placeholder storage entries/tables for future message, read-position, notification, terminal, skill, roadmap, avatar, diagnostics, emoji, or attachment domains.

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

Story 2.4 creates the conversation list foundation: default channel, group conversations, group membership, and list ordering/visual metadata. It must not become message sending or full conversation management.

Do not implement:

- message send, message history, pagination, sending/sent/failed status, read positions or read receipts;
- pin/mute/rename/delete/clear actions, even though `isPinned` and unread display fields may be stored/read for AC3;
- terminal opening, terminal session lifecycle, terminal dispatch, outbox, notifications, tray updates or diagnostics export;
- emoji, attachments, quick prompts, `@all`, mention insertion into composer, or message composer UI;
- remote accounts, invite links, team membership, billing/server permissions or authentication;
- old `.golutra`, old chat stores, old redb or old app-data compatibility.

### Current Implementation State

- Story 2.3 added chat/contact foundations:
  - `chat_private_conversation_start` command.
  - `src-tauri/src/contracts/chat.rs` with `ConversationKind::Private`, `ConversationParticipantKind::{Member, Contact}`, `ConversationProfile`, and `StartPrivateConversation*` DTOs.
  - `src/shared/api/chat-api.ts` with `startPrivateConversation`.
  - Workspace SQLite `conversations` table from `src-tauri/migrations/workspace/202605121210__private_conversations.sql`.
  - Unique private reuse index: one private conversation per `workspace_id + participant_kind + participant_id`.
  - `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs` owns private conversation creation/reuse and currently assumes only private conversations.
- Story 2.3 review fixed administrator contact invite: `contact_create` accepts optional `workspaceId`, returns optional `adminMember`, and creates a local `MemberRole::Admin` member for administrator contact creation.
- `WorkspaceSelectionPage` is still the active workspace surface. It shows opened workspace details, data integrity, members, contacts, private chat entry toasts, and recent workspaces.
- There is no conversation list command, no default channel initializer, no group conversation command, no group membership table, no message table, no unread mutation logic, no conversation operation menu and no chat workbench route yet.

### Technical Requirements

- Use ULID strings for all new conversation ids. Keep timestamps as integer milliseconds.
- Use `rusqlite` behind repository/use-case boundaries. React and gateway handlers must not perform durable writes directly.
- `chat_conversations_list` should be the safe initializer for default channel; opening a workspace and loading the list should materialize exactly one default channel if missing.
- Conversation rows must support three current kinds:
  - `channel`: default workspace channel for this story.
  - `group`: user-created group chat with `conversation_members`.
  - `private`: existing Story 2.3 member/contact private conversations.
- Group titles should be trimmed, non-empty and capped reasonably, e.g. 80 characters to match member/contact display-name constraints unless a narrower domain reason is added.
- Group member ids must be existing member ids for the same workspace. Deduplicate ids before storing. It is valid to allow an empty group only if the UI and domain explicitly treat it as a group shell; otherwise reject empty selection.
- Conversation list ordering must be implemented in the domain/repository, not just in React. UI may trust backend ordering and still keep stable keys.
- `isPinned`/`unreadCount` are display/list metadata in this story. Mutating them belongs to later stories unless a fixture/test inserts seeded rows to prove ordering.
- Default channel should not be deletable or membership-managed in this story.
- Contact deletion must continue not to silently delete private conversation records.

### Architecture Compliance

- Rust command handlers live in `src-tauri/src/gateway`; use cases live in `src-tauri/src/app`; validation/domain rules live in `src-tauri/src/domain`; SQLite adapters live under `src-tauri/src/infrastructure/persistence/sqlite`.
- Generated contract files live in `src/contracts/generated` and `src-tauri/bindings`; regenerate with `ts-rs`, do not hand-edit generated outputs.
- Frontend code calls only `src/shared/api` facades for IPC.
- SQLite tables use plural `snake_case`; migration files use `YYYYMMDDHHMM__short_description.sql`; indexes use `idx_...` or `uq_...`.
- IPC JSON fields use `camelCase`; Rust commands use `snake_case`.
- Contract fixtures live under `fixtures/contracts/<domain>/`; schema/data fixtures live under `fixtures/schema/<case-name>/` and `fixtures/data-integrity/<case-name>/`.
- Add/update storage manifest entries for every persisted conversation/member table introduced now.

### UX Requirements

- Follow UX Chat Workbench guidance where applicable: left conversation/sidebar list, conversation header, and right members sidebar. In this story, implement only the list/header shell needed for ACs on the existing workspace surface.
- Conversation list rows should show:
  - default channel with a channel/hash icon or label;
  - group chats with a group icon/label and member count/labels;
  - private conversations with private/member/contact label;
  - pinned marker when `isPinned`;
  - unread badge when `unreadCount > 0`;
  - last activity/preview when available.
- Group create/update UI should use current workspace member data already loaded for the members panel.
- Loading and error copy should use the existing toast pattern: state what happened, impact scope and next action.
- Keep cards at 8px radius or less and preserve current quiet operational styling.
- Text must not overflow row controls on mobile/desktop; use truncation for long titles/member labels.

### Previous Story Intelligence

- Story 2.3 already owns private conversation creation/reuse. Extend `conversation_repository.rs` instead of creating a parallel chat store.
- Story 2.3 deliberately excluded default channels, group chats, unread state, read positions, message tables and management actions. 2.4 should add only default channel/group/list foundations and still leave message/read/operation behavior to later stories.
- Story 2.3's review finding was caused by a UI label/store mismatch for administrator invite. For 2.4, ensure every UI-visible conversation capability has a matching persisted record and contract fixture.
- Story 1.6 requires each newly persisted domain/table to update storage manifest, schema marker, fixture and validation check when introduced.
- Story 1.7 requires contract/schema fixture honesty. Do not mark message, read-position, notification, terminal dispatch or full management flows as supported.
- Current commit baseline after Story 2.3: `fe5b0f4 Initial orchlet implementation through story 2.3`.

### Relevant UPDATE Files To Read Before Coding

- `src-tauri/src/contracts/chat.rs`: extend DTOs/enums from private-only to channel/group/private list shapes.
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`: existing private conversation storage/reuse; must be evolved without breaking private uniqueness.
- `src-tauri/migrations/workspace/202605121210__private_conversations.sql`: baseline conversation schema; add a new migration rather than editing this migration for existing installs.
- `src-tauri/src/app/chat/mod.rs`, `src-tauri/src/gateway/chat_commands.rs`, `src-tauri/src/gateway/mod.rs`, `src-tauri/src/lib.rs`: add list/group commands and registration.
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`: reuse member validation/listing patterns for group member validation.
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`, `src-tauri/src/app/data_integrity/mod.rs`: extend manifest and validation for conversations/memberships.
- `src/shared/api/chat-api.ts`, `src/shared/api/client.ts`, `src/shared/api/index.ts`: extend typed frontend API boundary only here.
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`: add conversation list/group UI while preserving workspace open, members, contacts, data integrity and recent workspace behavior.
- `src/App.test.tsx`: extend focused UI tests for default channel, group creation/update and private conversation list refresh.
- `scripts/validate-contract-fixtures.mjs`, `tests/contract/contract-fixture-types.ts`, `src-tauri/tests/contract_fixtures.rs`: update contract fixture enforcement.
- `scripts/validate-data-fixtures.mjs`, `tests/data-integrity/data-integrity-fixture-types.ts`, `src-tauri/tests/schema_data_fixtures.rs`: update schema/data fixture enforcement.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 2.4 ACs and Epic 2 conversation scope.
- `_bmad-output/planning-artifacts/prd.md` - FR19, FR20, FR21, FR22; NFR19, NFR20, NFR21, NFR22, NFR39.
- `_bmad-output/planning-artifacts/architecture.md` - SQLite/rusqlite data architecture, typed IPC contracts, storage manifest rule, conversation/message feature boundaries and naming patterns.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Chat Workbench, Chat Sidebar, conversation rows, Invite Friends Modal, Members Sidebar and empty/loading/error states.
- `_bmad-output/implementation-artifacts/1-6-storage-manifest-schema-validation-report.md` - future persisted domains must add their own manifest/schema/fixture checks.
- `_bmad-output/implementation-artifacts/1-7-test-contract-fixture-desktop-smoke-scaffolding.md` - contract/schema fixture and smoke scaffold expectations.
- `_bmad-output/implementation-artifacts/2-2-multi-instance-invite-permissions-member-actions.md` - member foundations, permissions and action-menu patterns.
- `_bmad-output/implementation-artifacts/2-3-global-contacts-private-chat-entry.md` - current contact/private conversation implementation and review correction.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm test:frontend` - passed: 2 frontend test files, 19 tests.
- `pnpm test:contracts` - passed: 13 contract fixture groups and Rust contract fixture tests.
- `pnpm test:data-integrity` - passed: schema/data fixture validation and Rust schema fixture tests.
- `cargo fmt` - applied Rust formatting.
- `cargo fmt --check` - passed.
- `cargo check` - passed.
- `cargo test` - passed: 113 lib tests, 5 contract fixture tests, 9 schema fixture tests, 1 smoke test.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` - passed and regenerated TypeScript contracts.
- `pnpm build` - passed.
- `pnpm test` - passed full frontend/contracts/data-integrity/smoke suite.
- `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src` - passed with raw IPC usage limited to shared API/window-context boundary and tests; `Channel` matches are enum/string references.
- `pnpm tauri build` - passed; existing warning remains that bundle identifier `com.orchlet.app` ends with `.app`.
- Local review - no blocking findings after verifying ACs against the implemented contract, repository, UI, fixtures, and scope exclusions.

### Completion Notes List

- Implemented default channel initialization via `chat_conversations_list`; loading chat data materializes exactly one pinned default channel for a workspace.
- Extended conversation contracts, IPC commands, TypeScript API facade, and fixtures for channel/group/private conversation list shapes, group creation, group member replacement, and expanded private conversation results.
- Added workspace SQLite migration for list metadata and `conversation_members` while preserving the Story 2.3 private conversation uniqueness model.
- Implemented repository/use-case validation for group title, member existence, member deduplication, invalid conversation kinds, deterministic list ordering, and refreshed group header/list returns.
- Added a compact conversation list and group create/update shell to the existing workspace page without message composer/history, pin/mute/rename/delete actions, read positions, terminal dispatch, notifications, emoji, or attachment behavior.
- Extended storage manifest, data integrity checks, schema/data fixtures, and contract validators for conversation records and group membership only.
- Completed local review with no blocking findings.

### File List

- `_bmad-output/implementation-artifacts/2-4-default-channel-group-chat-conversation-list.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/chat/chat-conversations-list.error.json`
- `fixtures/contracts/chat/chat-conversations-list.request.json`
- `fixtures/contracts/chat/chat-conversations-list.result.json`
- `fixtures/contracts/chat/chat-group-conversation-create.error.json`
- `fixtures/contracts/chat/chat-group-conversation-create.request.json`
- `fixtures/contracts/chat/chat-group-conversation-create.result.json`
- `fixtures/contracts/chat/chat-group-conversation-members-update.error.json`
- `fixtures/contracts/chat/chat-group-conversation-members-update.request.json`
- `fixtures/contracts/chat/chat-group-conversation-members-update.result.json`
- `fixtures/contracts/chat/chat-private-conversation-start.result.json`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/schema/conversations-v1/conversation-list.json`
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
- `src-tauri/migrations/workspace/202605121300__conversation_list_groups.sql`
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

- 2026-05-12: Created Story 2.4 context and marked ready for development.
- 2026-05-12: Implemented default channel, group conversations, conversation list ordering/visual metadata, group membership persistence, fixtures, validation, and completion verification; local review found no blocking issues and story marked done.
