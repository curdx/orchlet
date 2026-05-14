# Story 9.18: Legacy Golutra chat.redb compatibility

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a current Golutra user,
I want the React/Tauri rebuild to understand my existing per-workspace `chat.redb`,
So that previously stored conversations and messages can appear in the rebuilt chat surface instead of starting from an empty current SQLite chat store.

## Acceptance Criteria

1. Given no current `workspaces/<workspaceId>/orchlet.sqlite` chat conversation records exist and legacy app data contains `<workspaceId>/chat.redb`, when chat conversations load, then legacy conversations and text messages import into the current SQLite chat schema.
2. Given a current SQLite chat store already has conversation records, when legacy `chat.redb` also exists, then the current SQLite store remains authoritative and no legacy import overwrites current data.
3. Given legacy `chat.redb` contains unsafe, missing, unsupported, or partially unreadable legacy chat records, when chat conversations load, then the app either skips unsupported records safely or returns a recoverable diagnostic error without corrupting current SQLite data.
4. Given the story is ready for review, when validation runs, then targeted chat/data-integrity tests, `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness validation and `git diff --check` pass structurally. Release readiness may remain blocked for packaged Windows/macOS/Linux smoke and packaged OS tray smoke evidence.

## Tasks / Subtasks

- [x] Task 1: Add legacy `chat.redb` reader/importer (AC: 1, 3)
  - [x] Read legacy redb tables from app-data `<workspaceId>/chat.redb`.
  - [x] Map legacy channel/DM conversations into current SQLite conversations.
  - [x] Map legacy text/system messages into current SQLite messages with stable ULID ids.
  - [x] Skip unsupported legacy attachment payloads safely.

- [x] Task 2: Preserve current SQLite precedence (AC: 2)
  - [x] Only import when current conversation records for the workspace are absent.
  - [x] Keep current SQLite data authoritative after initialization.

- [x] Task 3: Add tests and release evidence (AC: 1, 2, 3, 4)
  - [x] Add Rust tests that create a legacy redb fixture and verify conversation/message import.
  - [x] Add Rust tests for current SQLite precedence.
  - [x] Add data-integrity coverage for imported legacy chat data.
  - [x] Update release gate/checklists/capability registry to say `chat.redb` compatibility is resolved while remaining packaged smoke blockers stay honest.

## Dev Notes

- Golutra reference:
  - `/Users/wdx/opc/golutra/src-tauri/src/message_service/chat_db/store.rs`
  - `/Users/wdx/opc/golutra/src-tauri/src/message_service/chat_db/read.rs`
  - `/Users/wdx/opc/golutra/src-tauri/src/message_service/chat_db/write.rs`
  - `/Users/wdx/opc/golutra/src-tauri/src/message_service/chat_db/types.rs`
- Legacy Golutra stores chat data under app data `<workspaceId>/chat.redb` using redb tables and bincode payloads.
- This story intentionally does not claim packaged OS smoke, restart recovery smoke or tray smoke evidence.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cargo test --manifest-path src-tauri/Cargo.toml app::chat`
- `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity`
- `pnpm test:contracts`
- `pnpm test:data-integrity`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `node scripts/validate-release-readiness.mjs`
- `node scripts/validate-capability-status.mjs`
- `git diff --check`

### Completion Notes List

- Added a legacy Golutra `chat.redb` importer that reads redb/bincode conversation, user-conversation settings, member and message tables before the default channel is created.
- Imported legacy channel/DM conversations and text/system messages into the current SQLite chat schema only when no current conversation records exist for the workspace.
- Kept current SQLite chat authoritative after initialization and added corrupt redb handling that returns a recoverable `chat.legacyRedb.openFailed` error without importing corrupted conversation data.
- Updated release/capability evidence to mark `chat.redb` compatibility resolved while leaving release readiness `blocked` for packaged Windows/macOS/Linux smoke, restart recovery and packaged OS tray smoke evidence.

### File List

- `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`
- `_bmad-output/implementation-artifacts/9-18-legacy-golutra-chat-redb-compatibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/rebuild/feature-inventory.md`
- `docs/rebuild/parity-checklist.md`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/capabilities/mvp-capability-status.json`
- `fixtures/release/mvp-release-readiness.json`
- `src-tauri/Cargo.lock`
- `src-tauri/Cargo.toml`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/legacy_chat_redb_import.rs`

## Change Log

- 2026-05-14: Created Story 9.18 from remaining Story 9.10 legacy `chat.redb` blocker.
- 2026-05-14: Implemented legacy `chat.redb` import, current SQLite precedence, recoverable corrupt-redb handling, data-integrity coverage and honest release evidence updates.
