# Story 2.7: 提及、emoji、附件入口与快捷提示

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a chat user,
I want composition helpers for mentions, emoji, attachments and common prompts,
so that routine collaboration is faster and less error-prone.

## Acceptance Criteria

1. Given the user types `@`, when matching members exist, then the app offers member mention suggestions and inserts a structured mention.
2. Given the product decision for `@all` is configured, when the user enters `@all`, then the app either performs the explicit implementation or shows the documented product abandonment behavior.
3. Given the user opens emoji or helper menus, when they search emoji, select recent emoji, open image attachment entry or use a shortcut prompt, then the selected helper inserts or opens the intended chat composition state.

## Tasks / Subtasks

- [x] Task 1: Extend message contracts and typed API for structured mentions (AC: 1)
  - [x] Add `mentionedMemberIds` to `SendMessageRequest` and `ChatMessageProfile`.
  - [x] Keep payloads camelCase and keep `src/shared/api` as the only frontend IPC boundary.
  - [x] Regenerate TypeScript with `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` and `TS_RS_EXPORT_DIR=bindings cargo test`; do not hand-edit generated bindings.
  - [x] Update contract fixtures and validators for message send/history/read-position outputs that contain message profiles.

- [x] Task 2: Persist and validate message mentions locally (AC: 1-2)
  - [x] Add a workspace migration for `message_mentions`, preserving prior conversation/message/read-position migrations.
  - [x] Validate mentioned member ids against the workspace member store and deduplicate ids.
  - [x] Store mention rows atomically with message send and hydrate them when messages are returned.
  - [x] Explicitly reject or surface `@all` as unsupported for MVP; do not silently dispatch or pretend group fan-out exists.
  - [x] Update storage manifest, schema fixtures and data-integrity checks for mention records.

- [x] Task 3: Implement composer mention suggestions and chips (AC: 1-2)
  - [x] Extend `WorkspaceSelectionPage.tsx`; do not add a new route/page.
  - [x] When the user types `@`, show matching mention suggestions from current workspace members.
  - [x] Insert selected mention text into the composer and track selected member ids as structured composition state.
  - [x] Render removable mention chips and pass structured `mentionedMemberIds` on send.
  - [x] When `@all` is typed or attempted, show the documented MVP abandonment behavior and keep dispatch out of scope.

- [x] Task 4: Add emoji search/recent and helper menu composition state (AC: 3)
  - [x] Add an emoji panel with search and recent selections; Esc closes the panel without sending.
  - [x] Insert selected emoji into the message draft and record recent emoji in UI-local cache only.
  - [x] Add quick prompt chips that append common prompts into the composer without replacing existing text.
  - [x] Add attachment entry controls for image and roadmap references that open visible composition state; do not implement file upload, roadmap CRUD or attachment persistence.

- [x] Task 5: Extend tests and fixtures honestly (AC: 1-3)
  - [x] Add Rust tests for mention dedupe/validation, message mention persistence/hydration and `@all` rejection behavior.
  - [x] Add frontend tests for mention suggestions/chips/send payload, `@all` abandonment, emoji search/recent insertion, quick prompt insertion and attachment entry state.
  - [x] Keep fixture claims honest: no dispatch fan-out, notifications, terminal routing, file upload, roadmap CRUD, remote sync or attachment persistence.

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

Story 2.7 owns local composition helpers and structured mention metadata only. Do not implement dispatch fan-out, terminal routing, notifications, file upload, roadmap CRUD, remote sync, markdown rendering, attachment persistence, message export, accounts or old `.golutra` compatibility.

### Current Implementation State

- Story 2.5 added `messages` and `conversation_read_positions`; messages are currently plain text only.
- Story 2.6 added pin/mute/rename/clear/delete and `deleted_at_ms`; conversation list/get queries now filter deleted conversations.
- `WorkspaceSelectionPage` already renders the conversation list, current conversation header, message history, load older, composer, group membership controls, contacts and members.
- `MemberProfile.permissions.canMention` already exists and is rendered in member metadata; mention suggestions should use current workspace members and respect `canMention`.
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs` owns message send/list/read-position and workspace chat migrations.

### Technical Requirements

- Use ULID strings and millisecond timestamps consistently with existing messages.
- Store mentions in a separate `message_mentions` table keyed by workspace, conversation, message and member id; do not overload message body as the only mention source.
- `SendMessageRequest.mentionedMemberIds` must be optional from a user-flow standpoint but explicit in the generated DTO as an array; default existing test fixtures to `[]`.
- Validate each mentioned member id with existing member validation and the initialized member store; reject missing members with a structured recoverable error.
- Deduplicate mention ids before persistence and response hydration.
- `@all` product decision for MVP is explicit abandonment: show a user-visible message and reject backend sends containing `@all` token with a stable error code. Do not implement group broadcast or dispatch.
- Emoji recent state is UI-local cache only per architecture; it must not create durable SQLite schema.
- Attachment entries are composition-state chips only. Image and roadmap entry actions should be visible and non-silent, but must not claim upload, preview, roadmap CRUD or persisted attachment records.

### Architecture Compliance

- Rust command handlers remain in `src-tauri/src/gateway`; use cases in `src-tauri/src/app`; validation/domain rules in `src-tauri/src/domain`; SQLite adapters under `src-tauri/src/infrastructure/persistence/sqlite`.
- Frontend feature code calls only `src/shared/api` facades for IPC.
- Generated contract files live in `src/contracts/generated` and `src-tauri/bindings`; regenerate with `ts-rs`.
- SQLite tables use plural `snake_case`; migration files use `YYYYMMDDHHMM__short_description.sql`; indexes use `idx_...` or `uq_...`.
- Contract fixtures live under `fixtures/contracts/chat/`; schema/data fixtures live under `fixtures/schema/` and `fixtures/data-integrity/`.

### UX Requirements

- Mention dropdown appears after `@`, supports keyboard focus path, and selected mentions render as removable chips.
- `@all` must show explicit unsupported/MVP abandonment behavior instead of silently doing nothing.
- Emoji panel supports search, recent emoji, insertion and Esc close without sending.
- Quick prompt chips append to the composer; existing text is preserved by adding a newline.
- Attachment controls use icon+text buttons and visible chips for selected entry state.
- Preserve Enter-to-send and Shift+Enter-for-new-line behavior; do not break IME composition handling.
- Keep the existing quiet operational style, 8px-or-less radii, no marketing layout, and no nested cards.

### Previous Story Intelligence

- 2.6 changed the same `WorkspaceSelectionPage.tsx` composer area and must not regress conversation management controls.
- 2.5 message send trims body and caps text at 4000 characters; helper insertion must still pass that validation.
- 2.4/2.6 default channel and deleted conversation rules remain authoritative; mention/message commands must not revive deleted conversations.
- 1.6/1.7 fixture honesty applies: only add storage manifest/schema fixture claims for implemented mention records, not future attachment/emoji storage.
- Current commit baseline after Story 2.6: `6a2105d Complete story 2.6 conversation management actions`.

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

- `_bmad-output/planning-artifacts/epics.md` - Story 2.7 ACs and Epic 2 composition helper scope.
- `_bmad-output/planning-artifacts/prd.md` - FR27, FR28, FR29, FR30, FR31.
- `_bmad-output/planning-artifacts/architecture.md` - typed IPC, local-first SQLite, localStorage as UI cache for emoji recents and boundary rules.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - mention dropdown, `@all`, emoji panel, quick prompt and attachment entry behavior.
- `_bmad-output/implementation-artifacts/2-5-message-send-history-pagination-read-position.md` - current message send/history/read-position implementation.
- `_bmad-output/implementation-artifacts/2-6-conversation-management-actions.md` - current conversation management implementation and exclusions.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: `cargo check`
- 2026-05-12: `cargo test app::chat::tests::message_send --lib`
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`
- 2026-05-12: `TS_RS_EXPORT_DIR=bindings cargo test`
- 2026-05-12: `pnpm test:frontend`
- 2026-05-12: `pnpm test:contracts`
- 2026-05-12: `pnpm test:data-integrity`
- 2026-05-12: `cargo fmt`
- 2026-05-12: `cargo fmt --check && cargo check`
- 2026-05-12: `cargo test`
- 2026-05-12: `pnpm build`
- 2026-05-12: `pnpm test`
- 2026-05-12: IPC boundary scan completed; direct Tauri API usage remains limited to shared API modules/tests.
- 2026-05-12: `pnpm tauri build` completed; emitted macOS `.app` and `.dmg` bundles. Existing bundle identifier warning noted.

### Completion Notes List

- Added structured `mentionedMemberIds` to chat send/message contracts and regenerated both TypeScript binding locations.
- Persisted message mentions in `message_mentions`, validated/deduped member ids against workspace members, enforced `canMention`, hydrated message history, and rejected `@all` with `message.mention.allUnsupported`.
- Added a distinct `messageMentions` storage category, manifest entry, schema/data fixtures and validators for implemented mention records only.
- Extended the workspace composer with mention suggestions/chips, explicit `@all` MVP abandonment feedback, emoji search/recent UI cache, quick prompt insertion, and visible image/roadmap composition chips without persistence or upload claims.
- Added Rust and frontend tests covering mention persistence/validation, `@all`, emoji recents, quick prompts and attachment composition state.

### File List

- `_bmad-output/implementation-artifacts/2-7-mentions-emoji-attachments-quick-prompts.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/chat/chat-message-send.request.json`
- `fixtures/contracts/chat/chat-message-send.result.json`
- `fixtures/contracts/chat/chat-messages-page.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/schema/messages-v1/message-history.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `scripts/validate-data-fixtures.mjs`
- `src/App.test.tsx`
- `src/contracts/generated/chat.ts`
- `src/contracts/generated/data_integrity.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src-tauri/bindings/chat.ts`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/migrations/workspace/202605121700__message_mentions.sql`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/domain/chat/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 2.7 context and started development.
- 2026-05-12: Completed structured mentions, composer helpers, fixtures and verification for Story 2.7.
